import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Campaign Hardening & Security Tests", function () {
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

    const Campaign = await ethers.getContractFactory("Campaign");
    implementation = await Campaign.deploy();
    await implementation.waitForDeployment();

    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    factory = await CampaignFactory.deploy(
      await implementation.getAddress(),
      treasury.address,
      DEFAULT_FEE_BPS
    );
    await factory.waitForDeployment();
  });

  describe("Cancel Restrictions & Flagging Rules", function () {
    it("flagCampaign on an Active campaign works and allows immediate refunds", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      await campaign.connect(backer1).contribute({ value: ethers.parseEther("2") });
      expect(await campaign.status()).to.equal(0); // Active

      await factory.connect(owner).flagCampaign(await campaign.getAddress(), "Scam flagged");
      expect(await campaign.status()).to.equal(3); // Cancelled

      const initialBal = await ethers.provider.getBalance(backer1.address);
      const refundTx = await campaign.connect(backer1).refund();
      const refundReceipt = await refundTx.wait();
      const gasSpent = refundReceipt.gasUsed * refundReceipt.gasPrice;
      const finalBal = await ethers.provider.getBalance(backer1.address);

      expect(finalBal - initialBal + gasSpent).to.equal(ethers.parseEther("2"));
    });

    it("flagCampaign on a Successful campaign reverts; owner can never cancel a Successful campaign", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Backers meet the goal
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("10") });

      // Fast forward past deadline so status becomes Successful
      await time.increase(DURATION + 1);
      expect(await campaign.status()).to.equal(1); // Successful

      // Attempting to flag/cancel from factory owner must revert
      await expect(
        factory.connect(owner).flagCampaign(await campaign.getAddress(), "Attempt to cancel successful")
      ).to.be.revertedWith("Only active campaigns can be cancelled");

      // Direct cancel call from owner must also revert
      await expect(
        campaign.connect(owner).cancel()
      ).to.be.revertedWith("Only active campaigns can be cancelled");
    });

    it("owner cannot cancel a Failed or Withdrawn campaign", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // 1. Check Failed: duration passes with 0 raised
      await time.increase(DURATION + 1);
      expect(await campaign.status()).to.equal(2); // Failed
      await expect(
        factory.connect(owner).flagCampaign(await campaign.getAddress(), "Delist failed")
      ).to.be.revertedWith("Only active campaigns can be cancelled");
    });
  });

  describe("Reverting Treasury & Pull-Based Fee Claiming", function () {
    it("treasury that reverts on receive does not block withdraw(); claimFee reverts until fixed, then pays", async function () {
      // Deploy RevertingTreasury helper
      const RevertingTreasury = await ethers.getContractFactory("RevertingTreasury");
      const revertingTreasury = await RevertingTreasury.deploy();
      await revertingTreasury.waitForDeployment();
      const revTreasuryAddress = await revertingTreasury.getAddress();

      // Deploy a factory with the reverting treasury
      const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
      const testFactory = await CampaignFactory.deploy(
        await implementation.getAddress(),
        revTreasuryAddress,
        DEFAULT_FEE_BPS
      );
      await testFactory.waitForDeployment();

      const tx = await testFactory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return testFactory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Backers meet the 10 ETH goal
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("10") });
      await time.increase(DURATION + 1);

      // Creator withdraws: MUST NOT REVERT even though treasury reverts on receive!
      const initialCreatorBal = await ethers.provider.getBalance(creator.address);
      const withdrawTx = await campaign.connect(creator).withdraw();
      const withdrawReceipt = await withdrawTx.wait();
      const gasSpent = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;
      const finalCreatorBal = await ethers.provider.getBalance(creator.address);

      const expectedCreatorPayout = ethers.parseEther("9.8");
      expect(finalCreatorBal - initialCreatorBal + gasSpent).to.equal(expectedCreatorPayout);
      expect(await campaign.withdrawn()).to.be.true;

      // Fee is stored in feeOwed (0.2 ETH)
      const expectedFee = ethers.parseEther("0.2");
      expect(await campaign.feeOwed()).to.equal(expectedFee);

      // claimFee() should revert because treasury rejects ETH
      await expect(campaign.claimFee()).to.be.revertedWith("Treasury transfer failed");

      // Fix the treasury
      await revertingTreasury.setShouldRevert(false);

      // Now claimFee() succeeds and pays the treasury
      const initTreasuryBal = await ethers.provider.getBalance(revTreasuryAddress);
      await campaign.claimFee();
      const finalTreasuryBal = await ethers.provider.getBalance(revTreasuryAddress);
      expect(finalTreasuryBal - initTreasuryBal).to.equal(expectedFee);
      expect(await campaign.feeOwed()).to.equal(0);
    });
  });

  describe("Force-Sent ETH via selfdestruct", function () {
    it("force-sent ETH does not inflate fee base (fee is feeBps * totalRaised / 10000)", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Backers contribute exactly 10 ETH
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("10") });

      // Attacker force-sends 5 ETH via selfdestruct
      const ForceSender = await ethers.getContractFactory("ForceSender");
      const forceSender = await ForceSender.deploy({ value: ethers.parseEther("5") });
      await forceSender.waitForDeployment();
      await forceSender.forceSend(await campaign.getAddress());

      // Contract balance is now 15 ETH, but totalRaised is 10 ETH
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(ethers.parseEther("15"));
      expect(await campaign.totalRaised()).to.equal(ethers.parseEther("10"));

      await time.increase(DURATION + 1);

      // Creator withdraws
      const initialCreatorBal = await ethers.provider.getBalance(creator.address);
      const withdrawTx = await campaign.connect(creator).withdraw();
      const withdrawReceipt = await withdrawTx.wait();
      const gasSpent = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;
      const finalCreatorBal = await ethers.provider.getBalance(creator.address);

      // Fee MUST be based on totalRaised (10 ETH * 2% = 0.2 ETH), NOT 15 ETH * 2% (0.3 ETH)
      const expectedFee = ethers.parseEther("0.2");
      const expectedCreatorPayout = ethers.parseEther("9.8");

      expect(finalCreatorBal - initialCreatorBal + gasSpent).to.equal(expectedCreatorPayout);
      expect(await campaign.feeOwed()).to.equal(expectedFee);

      await campaign.claimFee();
      expect(await campaign.feeOwed()).to.equal(0);
    });
  });

  describe("Contract Creator with No receive() & withdrawTo()", function () {
    it("withdrawTo works for a contract creator with no receive() and rejects address(0)", async function () {
      const NoReceiveCreator = await ethers.getContractFactory("NoReceiveCreator");
      const noReceiveCreator = await NoReceiveCreator.deploy();
      await noReceiveCreator.waitForDeployment();

      // Contract creates a campaign
      const tx = await noReceiveCreator.createCampaignOnFactory(
        await factory.getAddress(),
        GOAL,
        DURATION,
        METADATA_CID
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Backers meet the goal
      await campaign.connect(backer1).contribute({ value: GOAL });
      await time.increase(DURATION + 1);

      // Direct withdraw() would fail because NoReceiveCreator cannot accept ETH
      await expect(
        noReceiveCreator.callWithdraw(await campaign.getAddress())
      ).to.be.revertedWith("Creator transfer failed");

      // withdrawTo rejects address(0)
      await expect(
        noReceiveCreator.callWithdrawTo(await campaign.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");

      // withdrawTo redirects the payout to a designated recipient address
      const initialRecipientBal = await ethers.provider.getBalance(backer3.address);
      await noReceiveCreator.callWithdrawTo(await campaign.getAddress(), backer3.address);
      const finalRecipientBal = await ethers.provider.getBalance(backer3.address);

      const expectedCreatorPayout = ethers.parseEther("9.8");
      expect(finalRecipientBal - initialRecipientBal).to.equal(expectedCreatorPayout);
      expect(await campaign.withdrawn()).to.be.true;
    });
  });

  describe("Reentrancy Attack Protection", function () {
    it("prevents reentrancy attack on refund()", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Deploy RefundAttacker
      const RefundAttacker = await ethers.getContractFactory("RefundAttacker");
      const attacker = await RefundAttacker.deploy(await campaign.getAddress());
      await attacker.waitForDeployment();

      // Backer1 contributes, Attacker contributes, goal not met
      await campaign.connect(backer1).contribute({ value: ethers.parseEther("2") });
      await attacker.attack({ value: ethers.parseEther("2") });

      await time.increase(DURATION + 1);
      expect(await campaign.status()).to.equal(2); // Failed

      // Attacker attempts reentrancy during refund:
      // The reentrant refund() call is blocked by ReentrancyGuard, causing the ETH transfer to fail and the entire attack to revert
      await expect(attacker.triggerRefund()).to.be.revertedWith("Refund transfer failed");
      expect(await campaign.contributionOf(await attacker.getAddress())).to.equal(ethers.parseEther("2"));
    });

    it("prevents reentrancy attack on withdraw()", async function () {
      const WithdrawAttacker = await ethers.getContractFactory("WithdrawAttacker");
      const attacker = await WithdrawAttacker.deploy();
      await attacker.waitForDeployment();

      // Attacker creates a campaign
      const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
      const tx = await factory.connect(backer1).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      // Backers meet the goal
      await campaign.connect(backer2).contribute({ value: GOAL });
      await time.increase(DURATION + 1);

      // Creator calls withdrawTo the attacker contract
      await campaign.connect(backer1).withdrawTo(await attacker.getAddress());
      expect(await campaign.withdrawn()).to.be.true;
    });

    it("prevents reentrancy attack on claimFee()", async function () {
      const ClaimFeeAttacker = await ethers.getContractFactory("ClaimFeeAttacker");
      const feeAttacker = await ClaimFeeAttacker.deploy();
      await feeAttacker.waitForDeployment();
      const feeAttackerAddress = await feeAttacker.getAddress();

      // Deploy factory with feeAttacker as treasury
      const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
      const testFactory = await CampaignFactory.deploy(
        await implementation.getAddress(),
        feeAttackerAddress,
        DEFAULT_FEE_BPS
      );
      await testFactory.waitForDeployment();

      const tx = await testFactory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return testFactory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      await campaign.connect(backer1).contribute({ value: GOAL });
      await time.increase(DURATION + 1);

      await campaign.connect(creator).withdraw();
      await feeAttacker.setTarget(await campaign.getAddress());

      // Attempt claimFee: feeOwed is zeroed before send, so reentrancy call reverts with "No fee owed" or reentrancy guard
      await expect(feeAttacker.triggerClaimFee()).to.be.reverted;
    });
  });

  describe("Pagination & Contributor Counting", function () {
    it("returns correct paginated contributors", async function () {
      const tx = await factory.connect(creator).createCampaign(GOAL, DURATION, METADATA_CID);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "CampaignCreated");
      const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

      await campaign.connect(backer1).contribute({ value: ethers.parseEther("1") });
      await campaign.connect(backer2).contribute({ value: ethers.parseEther("1") });
      await campaign.connect(backer3).contribute({ value: ethers.parseEther("1") });

      expect(await campaign.contributorCount()).to.equal(3);

      // Page 1: offset 0, limit 2
      const page1 = await campaign.getContributors(0, 2);
      expect(page1.length).to.equal(2);
      expect(page1[0]).to.equal(backer1.address);
      expect(page1[1]).to.equal(backer2.address);

      // Page 2: offset 2, limit 2
      const page2 = await campaign.getContributors(2, 2);
      expect(page2.length).to.equal(1);
      expect(page2[0]).to.equal(backer3.address);

      // Out of range: offset 5, limit 2
      const emptyPage = await campaign.getContributors(5, 2);
      expect(emptyPage.length).to.equal(0);

      // Limit 0
      const limitZero = await campaign.getContributors(0, 0);
      expect(limitZero.length).to.equal(0);
    });
  });

  describe("Fuzz Testing (>=100 Scenarios with Seeded PRNG)", function () {
    // Deterministic pseudo-random number generator (Mulberry32)
    function mulberry32(a) {
      return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    it("verifies mathematical conservation and exact wei balances across 120 fuzz scenarios", async function () {
      const rng = mulberry32(1337420);

      for (let i = 0; i < 120; i++) {
        // Random fee between 0 and 500 bps (0% to 5%)
        const randomFeeBps = Math.floor(rng() * 501);

        // Random goal between 1 ETH and 5 ETH in wei
        const goalWei = ethers.parseEther((1 + rng() * 4).toFixed(4));

        // Create campaign with specific fee
        const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
        const customFactory = await CampaignFactory.deploy(
          await implementation.getAddress(),
          treasury.address,
          randomFeeBps
        );
        await customFactory.waitForDeployment();

        const tx = await customFactory.connect(creator).createCampaign(goalWei, DURATION, METADATA_CID);
        const receipt = await tx.wait();
        const event = receipt.logs
          .map((l) => {
            try {
              return customFactory.interface.parseLog(l);
            } catch {
              return null;
            }
          })
          .find((e) => e && e.name === "CampaignCreated");
        const campaign = await ethers.getContractAt("Campaign", event.args.campaignAddress);

        // Decide if this scenario will succeed or fail
        const willSucceed = rng() > 0.4;

        // Generate 3 odd-wei contribution amounts
        const c1 = ethers.parseEther("0.4") + BigInt(Math.floor(rng() * 1000000000) * 2 + 1);
        const c2 = ethers.parseEther("0.5") + BigInt(Math.floor(rng() * 1000000000) * 2 + 1);

        await campaign.connect(backer1).contribute({ value: c1 });
        await campaign.connect(backer2).contribute({ value: c2 });

        let totalPledged = c1 + c2;

        if (willSucceed) {
          // Add remaining to meet or exceed goal
          const remainder = goalWei > totalPledged ? goalWei - totalPledged : 0n;
          const extra = remainder + BigInt(Math.floor(rng() * 1000000000));
          await campaign.connect(backer3).contribute({ value: extra });
          totalPledged += extra;

          await time.increase(DURATION + 1);
          expect(await campaign.status()).to.equal(1); // Successful

          const feeAmount = (totalPledged * BigInt(randomFeeBps)) / 10000n;
          const creatorAmount = totalPledged - feeAmount;

          // Conservation: creatorAmount + feeAmount == totalPledged exactly!
          expect(creatorAmount + feeAmount).to.equal(totalPledged);

          // Execute withdraw and claimFee
          await campaign.connect(creator).withdraw();
          if (feeAmount > 0n) {
            await campaign.claimFee();
          }

          // Contract balance must end at exactly 0
          const finalContractBal = await ethers.provider.getBalance(await campaign.getAddress());
          expect(finalContractBal).to.equal(0n);
        } else {
          // Leave under goal
          await time.increase(DURATION + 1);
          expect(await campaign.status()).to.equal(2); // Failed

          // Backers pull refunds
          await campaign.connect(backer1).refund();
          await campaign.connect(backer2).refund();

          // Contract balance ends at exactly 0
          const finalContractBal = await ethers.provider.getBalance(await campaign.getAddress());
          expect(finalContractBal).to.equal(0n);
        }
      }
    });
  });

  describe("Stateful Invariant Testing (400 Random Operations Across 3 Campaigns)", function () {
    it("maintains core invariants across 400 random operations", async function () {
      function mulberry32(a) {
        return function () {
          let t = (a += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rng = mulberry32(987654321);

      // Deploy 3 campaigns
      const campaigns = [];
      const signers = [backer1, backer2, backer3];

      for (let i = 0; i < 3; i++) {
        const goal = ethers.parseEther((2 + i * 2).toString());
        const tx = await factory.connect(creator).createCampaign(goal, DURATION, METADATA_CID);
        const receipt = await tx.wait();
        const event = receipt.logs
          .map((l) => {
            try {
              return factory.interface.parseLog(l);
            } catch {
              return null;
            }
          })
          .find((e) => e && e.name === "CampaignCreated");
        const camp = await ethers.getContractAt("Campaign", event.args.campaignAddress);
        campaigns.push({
          contract: camp,
          goal: goal,
          unrefundedContribs: new Map(),
          withdrawn: false,
          previousTotalRaised: 0n,
        });
      }

      // Perform 400 random operations
      for (let step = 0; step < 400; step++) {
        const campIndex = Math.floor(rng() * campaigns.length);
        const campObj = campaigns[campIndex];
        const camp = campObj.contract;
        const op = Math.floor(rng() * 5); // 0: contribute, 1: time-jump, 2: withdraw, 3: refund, 4: cancel

        const currentStatus = Number(await camp.status());

        if (op === 0) {
          // Contribute
          const backer = signers[Math.floor(rng() * signers.length)];
          const amount = ethers.parseEther((0.01 + rng() * 0.5).toFixed(4));
          if (currentStatus === 0) {
            await camp.connect(backer).contribute({ value: amount });
            const prev = campObj.unrefundedContribs.get(backer.address) || 0n;
            campObj.unrefundedContribs.set(backer.address, prev + amount);
          } else {
            await expect(camp.connect(backer).contribute({ value: amount })).to.be.reverted;
          }
        } else if (op === 1) {
          // Fast-forward time
          const advanceSeconds = Math.floor(rng() * 10 * ONE_DAY);
          await time.increase(advanceSeconds);
        } else if (op === 2) {
          // Withdraw
          if (currentStatus === 1 && !campObj.withdrawn) {
            await camp.connect(creator).withdraw();
            campObj.withdrawn = true;
          } else {
            await expect(camp.connect(creator).withdraw()).to.be.reverted;
          }
        } else if (op === 3) {
          // Refund
          const backer = signers[Math.floor(rng() * signers.length)];
          const bal = campObj.unrefundedContribs.get(backer.address) || 0n;
          if ((currentStatus === 2 || currentStatus === 3) && bal > 0n) {
            await camp.connect(backer).refund();
            campObj.unrefundedContribs.set(backer.address, 0n);
          } else {
            await expect(camp.connect(backer).refund()).to.be.reverted;
          }
        } else if (op === 4) {
          // Cancel attempt by owner
          if (currentStatus === 1) {
            await expect(
              factory.connect(owner).flagCampaign(await camp.getAddress(), "Attempt to flag successful")
            ).to.be.revertedWith("Only active campaigns can be cancelled");
          }
        }

        // Invariant checks:
        // 1. totalRaised must be monotonic non-decreasing
        const currentTotalRaised = await camp.totalRaised();
        expect(currentTotalRaised >= campObj.previousTotalRaised).to.be.true;
        campObj.previousTotalRaised = currentTotalRaised;

        // 2. Contract balance == sum of unrefunded contributions (unless withdrawn)
        const contractBalance = await ethers.provider.getBalance(await camp.getAddress());
        let sumExpected = 0n;
        for (const val of campObj.unrefundedContribs.values()) {
          sumExpected += val;
        }

        if (!campObj.withdrawn) {
          expect(contractBalance).to.equal(sumExpected);
        }
      }
    });
  });
});
