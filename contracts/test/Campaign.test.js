import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Decentralized Crowdfunding Platform (ETH)", function () {
  let factory;
  let implementation;
  let owner, treasury, creator, backer1, backer2, backer3, maliciousUser;

  const DEFAULT_FEE_BPS = 200; // 2%
  const GOAL = ethers.parseEther("10"); // 10 ETH
  const ONE_DAY = 24 * 60 * 60;
  const DURATION = 30 * ONE_DAY; // 30 days
  const METADATA_CID = "ipfs://QmCampaignMetadataHash123456789";

  beforeEach(async function () {
    [owner, treasury, creator, backer1, backer2, backer3, maliciousUser] = await ethers.getSigners();

    // 1. Deploy Campaign master implementation
    const Campaign = await ethers.getContractFactory("Campaign");
    implementation = await Campaign.deploy();
    await implementation.waitForDeployment();

    // 2. Deploy CampaignFactory
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    factory = await CampaignFactory.deploy(
      await implementation.getAddress(),
      treasury.address,
      DEFAULT_FEE_BPS
    );
    await factory.waitForDeployment();
  });

  describe("Factory Deployment & Admin Controls", function () {
    it("should initialize factory with correct implementation, treasury, and fee", async function () {
      expect(await factory.campaignImplementation()).to.equal(await implementation.getAddress());
      expect(await factory.treasury()).to.equal(treasury.address);
      expect(await factory.feeBps()).to.equal(DEFAULT_FEE_BPS);
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("should allow owner to update fee up to 5% cap (500 bps)", async function () {
      await expect(factory.connect(owner).setFeeBps(300))
        .to.emit(factory, "FeeUpdated")
        .withArgs(200, 300);

      expect(await factory.feeBps()).to.equal(300);

      // Revert if exceeding 500 bps
      await expect(factory.connect(owner).setFeeBps(501)).to.be.revertedWith("Fee exceeds 5% cap");
    });

    it("should reject non-owner changing fee or treasury", async function () {
      await expect(
        factory.connect(maliciousUser).setFeeBps(100)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      await expect(
        factory.connect(maliciousUser).setTreasury(maliciousUser.address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("should pause and unpause campaign creation", async function () {
      await factory.connect(owner).pause();
      await expect(
        factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID)
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");

      await factory.connect(owner).unpause();
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      await expect(tx).to.emit(factory, "CampaignCreated");
    });
  });

  describe("Campaign Creation via Minimal Proxy Clone", function () {
    it("should deploy a clone and initialize properly", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();

      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");

      expect(campaignCreatedEvent).to.not.be.null;
      const campaignAddress = campaignCreatedEvent.args.campaignAddress;

      const campaign = await ethers.getContractAt("Campaign", campaignAddress);
      expect(await campaign.creator()).to.equal(creator.address);
      expect(await campaign.goal()).to.equal(GOAL);
      expect(await campaign.metadataCID()).to.equal(METADATA_CID);
      expect(await campaign.feeBps()).to.equal(DEFAULT_FEE_BPS);
      expect(await campaign.treasury()).to.equal(treasury.address);
      expect(await campaign.status()).to.equal(0); // CampaignStatus.Active

      // Verification in factory registry
      expect(await factory.isCampaign(campaignAddress)).to.be.true;
      expect(await factory.getCampaignsCount()).to.equal(1);
      const creatorCampaigns = await factory.getCreatorCampaigns(creator.address);
      expect(creatorCampaigns[0]).to.equal(campaignAddress);
    });

    it("should reject invalid campaign parameters (0 goal, duration < 1 day, empty CID)", async function () {
      await expect(
        factory.connect(creator).createCampaign(0, DURATION, METADATA_CID)
      ).to.be.revertedWith("Goal must be greater than 0");

      await expect(
        factory.connect(creator).createCampaign(GOAL, ONE_DAY - 1, METADATA_CID)
      ).to.be.revertedWith("Duration must be between 1 and 90 days");

      await expect(
        factory.connect(creator).createCampaign(GOAL, 91 * ONE_DAY, METADATA_CID)
      ).to.be.revertedWith("Duration must be between 1 and 90 days");

      await expect(
        factory.connect(creator).createCampaign(GOAL, DURATION, "")
      ).to.be.revertedWith("Metadata CID cannot be empty");
    });

    it("should prevent re-initializing an existing campaign clone", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);

      const latestTime = await time.latest();
      await expect(
        campaign.initialize(
          maliciousUser.address,
          GOAL,
          latestTime + DURATION,
          "ipfs://fake",
          100,
          maliciousUser.address,
          ethers.parseEther("0.001")
        )
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("Contributions Flow", function () {
    let campaign;

    beforeEach(async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);
    });

    it("should allow backers to contribute and accumulate balances", async function () {
      const c1 = ethers.parseEther("2");
      const c2 = ethers.parseEther("3");

      await expect(campaign.connect(backer1).contribute({ value: c1 }))
        .to.emit(campaign, "Contributed")
        .withArgs(backer1.address, c1, c1);

      expect(await campaign.contributionOf(backer1.address)).to.equal(c1);
      expect(await campaign.totalRaised()).to.equal(c1);
      expect(await campaign.contributorCount()).to.equal(1);

      // Repeat contribution from same backer accumulates
      await campaign.connect(backer1).contribute({ value: c2 });
      expect(await campaign.contributionOf(backer1.address)).to.equal(c1 + c2);
      expect(await campaign.totalRaised()).to.equal(c1 + c2);
      expect(await campaign.contributorCount()).to.equal(1); // Still 1 unique backer
    });

    it("should accept contributions via direct ETH transfer (receive function)", async function () {
      const amount = ethers.parseEther("1.5");
      await backer2.sendTransaction({
        to: await campaign.getAddress(),
        value: amount,
      });

      expect(await campaign.contributionOf(backer2.address)).to.equal(amount);
      expect(await campaign.totalRaised()).to.equal(amount);
    });

    it("should prevent creator from contributing to own campaign (FR-9)", async function () {
      await expect(
        campaign.connect(creator).contribute({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Creator cannot contribute to own campaign");
    });

    it("should enforce minimum contribution threshold (0.001 ETH)", async function () {
      const dust = ethers.parseEther("0.0005");
      await expect(
        campaign.connect(backer1).contribute({ value: dust })
      ).to.be.revertedWith("Contribution below minimum");
    });

    it("should allow over-funding before deadline (FR-12)", async function () {
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("8") });
      await campaign.connect(backer2).contribute({ value: ethers.parseEther("5") });

      expect(await campaign.totalRaised()).to.equal(ethers.parseEther("13"));
      expect(await campaign.status()).to.equal(0); // Still Active until deadline passes
    });
  });

  describe("Success & Withdrawal Path (FR-18, FR-19, FR-20)", function () {
    let campaign;

    beforeEach(async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);

      // Backers meet the 10 ETH goal
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("6") });
      await campaign.connect(backer2).contribute({ value: ethers.parseEther("4") });
    });

    it("should not allow withdrawal before deadline has passed", async function () {
      await expect(campaign.connect(creator).withdraw()).to.be.revertedWith(
        "Campaign not successful"
      );
    });

    it("should transition to Successful after deadline passes with goal met", async function () {
      await time.increase(DURATION + 1);
      expect(await campaign.status()).to.equal(1); // CampaignStatus.Successful
    });

    it("should atomically split payout: (totalRaised - 2% fee) to creator and 2% fee to treasury", async function () {
      await time.increase(DURATION + 1);

      const totalRaised = ethers.parseEther("10");
      const expectedFee = (totalRaised * 200n) / 10000n; // 0.2 ETH
      const expectedCreatorPayout = totalRaised - expectedFee; // 9.8 ETH

      const initialCreatorBal = await ethers.provider.getBalance(creator.address);
      const initialTreasuryBal = await ethers.provider.getBalance(treasury.address);

      const tx = await campaign.connect(creator).withdraw();
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalCreatorBal = await ethers.provider.getBalance(creator.address);
      const finalTreasuryBal = await ethers.provider.getBalance(treasury.address);

      expect(finalTreasuryBal - initialTreasuryBal).to.equal(expectedFee);
      expect(finalCreatorBal - initialCreatorBal + gasSpent).to.equal(expectedCreatorPayout);
      expect(await campaign.withdrawn()).to.be.true;
      expect(await campaign.status()).to.equal(4); // CampaignStatus.Withdrawn
    });

    it("should prevent double withdrawal (FR-20)", async function () {
      await time.increase(DURATION + 1);
      await campaign.connect(creator).withdraw();

      await expect(campaign.connect(creator).withdraw()).to.be.revertedWith(
        "Campaign not successful"
      );
    });

    it("should prevent non-creator from calling withdraw (FR-18)", async function () {
      await time.increase(DURATION + 1);
      await expect(campaign.connect(maliciousUser).withdraw()).to.be.revertedWith(
        "Only creator permitted"
      );
    });

    it("should not allow contributors to claim refunds on a successful campaign", async function () {
      await time.increase(DURATION + 1);
      await expect(campaign.connect(backer1).refund()).to.be.revertedWith(
        "Refund not available"
      );
    });
  });

  describe("Failure & Refund Path (FR-21, FR-22, FR-23)", function () {
    let campaign;
    const b1Contribution = ethers.parseEther("3");
    const b2Contribution = ethers.parseEther("2");

    beforeEach(async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);

      // Only 5 ETH raised, goal is 10 ETH
      await campaign.connect(backer1).contribute({ value: b1Contribution });
      await campaign.connect(backer2).contribute({ value: b2Contribution });
    });

    it("should transition to Failed status after deadline passes", async function () {
      await time.increase(DURATION + 1);
      expect(await campaign.status()).to.equal(2); // CampaignStatus.Failed
    });

    it("should prevent creator from withdrawing failed campaign funds", async function () {
      await time.increase(DURATION + 1);
      await expect(campaign.connect(creator).withdraw()).to.be.revertedWith(
        "Campaign not successful"
      );
    });

    it("should allow backers to pull 100% full refund with zero fees deducted (FR-21, FR-22)", async function () {
      await time.increase(DURATION + 1);

      const initialB1Bal = await ethers.provider.getBalance(backer1.address);
      const tx = await campaign.connect(backer1).refund();
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalB1Bal = await ethers.provider.getBalance(backer1.address);
      expect(finalB1Bal - initialB1Bal + gasSpent).to.equal(b1Contribution);

      // Check balance reset to zero (Checks-Effects-Interactions)
      expect(await campaign.contributionOf(backer1.address)).to.equal(0);
    });

    it("should revert if user attempts to refund twice", async function () {
      await time.increase(DURATION + 1);
      await campaign.connect(backer1).refund();

      await expect(campaign.connect(backer1).refund()).to.be.revertedWith(
        "No contribution to refund"
      );
    });

    it("should revert if non-contributor attempts to refund", async function () {
      await time.increase(DURATION + 1);
      await expect(campaign.connect(maliciousUser).refund()).to.be.revertedWith(
        "No contribution to refund"
      );
    });
  });

  describe("Cancellation & Emergency Flagging (FR-5, FR-31)", function () {
    let campaign;

    beforeEach(async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);
    });

    it("should allow creator to cancel before any contributions are made", async function () {
      await expect(campaign.connect(creator).cancel())
        .to.emit(campaign, "Cancelled")
        .withArgs(creator.address);

      expect(await campaign.cancelled()).to.be.true;
      expect(await campaign.status()).to.equal(3); // CampaignStatus.Cancelled
    });

    it("should reject creator cancelling once contributions exist", async function () {
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("1") });
      await expect(campaign.connect(creator).cancel()).to.be.revertedWith(
        "Cannot cancel after receiving contributions"
      );
    });

    it("should allow factory owner to flag & cancel violating campaign and allow refund", async function () {
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("2") });

      await expect(
        factory.connect(owner).flagCampaign(await campaign.getAddress(), "Policy violation: Scam report")
      )
        .to.emit(factory, "CampaignFlagged")
        .to.emit(campaign, "Cancelled");

      expect(await campaign.status()).to.equal(3); // Cancelled

      // Backer can immediately refund from cancelled campaign
      const initialBal = await ethers.provider.getBalance(backer1.address);
      const tx = await campaign.connect(backer1).refund();
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;
      const finalBal = await ethers.provider.getBalance(backer1.address);

      expect(finalBal - initialBal + gasSpent).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Updates & Reporting (FR-27)", function () {
    let campaign;

    beforeEach(async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);
    });

    it("should allow creator to post updates", async function () {
      const updateCID = "ipfs://QmUpdate123456789";
      await expect(campaign.connect(creator).postUpdate(updateCID))
        .to.emit(campaign, "UpdatePosted");

      const updates = await campaign.getUpdates();
      expect(updates.length).to.equal(1);
      expect(updates[0].cid).to.equal(updateCID);
    });

    it("should prevent non-creator from posting updates", async function () {
      await expect(
        campaign.connect(maliciousUser).postUpdate("ipfs://fakeUpdate")
      ).to.be.revertedWith("Only creator permitted");
    });
  });

  describe("Key Invariants Verification (PRD 8.3)", function () {
    it("Invariant: Contract ETH balance matches sum of active contributions", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", campaignCreatedEvent.args.campaignAddress);

      await campaign.connect(backer1).contribute({ value: ethers.parseEther("1.5") });
      await campaign.connect(backer2).contribute({ value: ethers.parseEther("2.5") });
      await campaign.connect(backer3).contribute({ value: ethers.parseEther("3.0") });

      const sumOfContributions =
        (await campaign.contributionOf(backer1.address)) +
        (await campaign.contributionOf(backer2.address)) +
        (await campaign.contributionOf(backer3.address));

      const contractBalance = await ethers.provider.getBalance(await campaign.getAddress());
      expect(contractBalance).to.equal(sumOfContributions);
      expect(contractBalance).to.equal(ethers.parseEther("7"));
    });
  });
});
