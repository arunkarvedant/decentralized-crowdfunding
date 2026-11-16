"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Campaign, CampaignStatus, Contributor, CampaignUpdate } from "@/types/crowdfunding";
import deployedContracts from "@/contracts/deployedContracts.json";
import { ethers } from "ethers";

// Default test accounts for instant zero-friction developer & user evaluation
export const DEMO_ACCOUNTS = [
  {
    role: "Contributor / Backer",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    name: "Alex (Backer)",
    balance: "25.50",
  },
  {
    role: "Creator (Project Owner)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    name: "Sarah (Creator)",
    balance: "12.40",
  },
  {
    role: "Platform Admin / Multisig",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    name: "Admin Multisig",
    balance: "100.00",
  },
];

const BASE_TIMESTAMP = 1762250000;

// Rich seed data demonstrating all states: Active, Successful, Failed, Cancelled
const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    title: "ZeroGas: Decentralized L2 Account Abstraction Toolkit",
    summary: "Open-source developer SDK enabling gasless social-login transactions on Ethereum rollups.",
    description: `### Overview
ZeroGas is an open-source public good for Ethereum developers. It bridges ERC-4337 smart contract accounts with session keys and paymasters, removing gas friction for Web3 onboarding.

### Why Crowdfunding?
We want to keep this protocol completely decentralized and community-funded without VC token governance overhead. Funds will sponsor:
1. Formal audit by OpenZeppelin or Trail of Bits.
2. Full open-source TypeScript & Rust client libraries.
3. Testnet faucet & relayer infrastructure for 1 year.

### Funding Model
All-or-nothing: If we don't reach our 15 ETH goal before the deadline, every backer can withdraw their contribution instantly.`,
    category: "Open Source",
    coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
    metadataCID: "ipfs://bafybeicg23aon3j3y5k6r6w4bldemg4",
    goal: "15.0",
    totalRaised: "11.2",
    deadline: BASE_TIMESTAMP + 86400 * 12, // 12 days left
    feeBps: 200,
    status: "Active",
    withdrawn: false,
    cancelled: false,
    contributorsCount: 18,
    contributors: [
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        amount: "2.5",
        timestamp: (BASE_TIMESTAMP - 86400 * 2) * 1000,
        txHash: "0x7f83b1a23c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      },
      {
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        amount: "5.0",
        timestamp: (BASE_TIMESTAMP - 86400 * 4) * 1000,
        txHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      },
      {
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        amount: "3.7",
        timestamp: (BASE_TIMESTAMP - 86400 * 1) * 1000,
        txHash: "0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
      },
    ],
    updates: [
      {
        cid: "ipfs://bafyupdate1",
        title: "Architecture Spec v1.0 Finalized",
        content: "We have finalized the paymaster bundling spec and verified compatibility with Base and Arbitrum.",
        timestamp: (BASE_TIMESTAMP - 86400 * 3) * 1000,
      },
    ],
    createdAt: (BASE_TIMESTAMP - 86400 * 5) * 1000,
  },
  {
    id: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    title: "AuraOS: Privacy-First Local AI Terminal",
    summary: "Hardware-accelerated edge AI operating system running 100% locally on personal devices.",
    description: `### Pure Private Intelligence
AuraOS eliminates cloud telemetry from AI workflows. By orchestrating quantized open-weight models locally, your confidential documents, code, and thoughts never leave your silicon.

### Campaign Milestones
- **Funded (100% reached!)**: The target 8.0 ETH was successfully met ahead of deadline!
- Creator can withdraw (total minus 2% platform fee) once deadline lock completes.`,
    category: "Technology",
    coverImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
    metadataCID: "ipfs://bafybeiauraosmetadata789",
    goal: "8.0",
    totalRaised: "9.5",
    deadline: BASE_TIMESTAMP - 3600 * 4, // Deadline passed!
    feeBps: 200,
    status: "Successful",
    withdrawn: false,
    cancelled: false,
    contributorsCount: 14,
    contributors: [
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        amount: "3.5",
        timestamp: (BASE_TIMESTAMP - 86400 * 8) * 1000,
      },
      {
        address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
        amount: "6.0",
        timestamp: (BASE_TIMESTAMP - 86400 * 9) * 1000,
      },
    ],
    updates: [
      {
        cid: "ipfs://bafyupdate2",
        title: "Goal reached! Preparing hardware delivery specs",
        content: "Huge thanks to all backers! The 8 ETH goal has been surpassed. Next step is on-chain withdrawal and component orders.",
        timestamp: (BASE_TIMESTAMP - 3600 * 20) * 1000,
      },
    ],
    createdAt: (BASE_TIMESTAMP - 86400 * 15) * 1000,
  },
  {
    id: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    creator: "0x976EA74026E72CD1133715742add44270b308F6c",
    title: "SolarGrid: Community Micro-Solar Mesh",
    summary: "Distributed peer-to-peer solar energy trading microgrids for suburban neighborhoods.",
    description: `### Project Failed to Reach Goal
This campaign required 20.0 ETH but only collected 4.5 ETH before the deadline expired.
Per the all-or-nothing smart contract guarantee, this campaign is in **Failed** state.
Every contributor is entitled to a **100% full refund** with zero deductions or fees.`,
    category: "Community",
    coverImage: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
    metadataCID: "ipfs://bafybeisolargridfail456",
    goal: "20.0",
    totalRaised: "4.5",
    deadline: BASE_TIMESTAMP - 86400 * 2, // Expired 2 days ago
    feeBps: 200,
    status: "Failed",
    withdrawn: false,
    cancelled: false,
    contributorsCount: 3,
    contributors: [
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        amount: "2.0",
        timestamp: (BASE_TIMESTAMP - 86400 * 5) * 1000,
      },
      {
        address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
        amount: "2.5",
        timestamp: (BASE_TIMESTAMP - 86400 * 6) * 1000,
      },
    ],
    updates: [],
    createdAt: (BASE_TIMESTAMP - 86400 * 25) * 1000,
  },
  {
    id: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    title: "Neon Echoes: Cyberpunk Sci-Fi Short Film",
    summary: "Independent 25-minute live-action sci-fi film exploring synthetic consciousness and human memory.",
    description: `### Film Production
Shot on anamorphic lenses in Tokyo and Vancouver, Neon Echoes blends practical miniatures with synthetic worldbuilding. Backers receive digital premiere passes and executive producer credits on-chain.`,
    category: "Art & Film",
    coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
    metadataCID: "ipfs://bafybeineonechoesfilm123",
    goal: "12.0",
    totalRaised: "4.8",
    deadline: BASE_TIMESTAMP + 86400 * 18, // 18 days left
    feeBps: 200,
    status: "Active",
    withdrawn: false,
    cancelled: false,
    contributorsCount: 9,
    contributors: [],
    updates: [],
    createdAt: (BASE_TIMESTAMP - 86400 * 2) * 1000,
  },
];

interface Web3ContextType {
  account: string;
  accountName: string;
  balance: string;
  isRealWallet: boolean;
  platformFeeBps: number;
  isPaused: boolean;
  campaigns: Campaign[];
  connectDemoAccount: (index: number) => void;
  connectInjectedWallet: () => Promise<void>;
  createCampaign: (data: {
    title: string;
    summary: string;
    description: string;
    category: Campaign["category"];
    coverImage: string;
    goal: string;
    durationDays: number;
  }) => Promise<string>;
  contribute: (campaignAddress: string, amountEth: string) => Promise<void>;
  withdraw: (campaignAddress: string) => Promise<void>;
  claimRefund: (campaignAddress: string) => Promise<void>;
  cancelCampaign: (campaignAddress: string) => Promise<void>;
  postUpdate: (campaignAddress: string, title: string, content: string) => Promise<void>;
  flagCampaign: (campaignAddress: string, reason: string) => Promise<void>;
  updateFeeBps: (newFeeBps: number) => Promise<void>;
  togglePause: () => Promise<void>;
  contractAddresses: {
    factory: string;
    implementation: string;
    treasury: string;
  };
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string>(DEMO_ACCOUNTS[0].address);
  const [accountName, setAccountName] = useState<string>(DEMO_ACCOUNTS[0].name);
  const [balance, setBalance] = useState<string>(DEMO_ACCOUNTS[0].balance);
  const [isRealWallet, setIsRealWallet] = useState<boolean>(false);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(200); // 2%
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);

  // Load state from localStorage on client
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedCampaigns = localStorage.getItem("crowdr_eth_campaigns");
        if (savedCampaigns) {
          setCampaigns(JSON.parse(savedCampaigns));
        }
        const savedFee = localStorage.getItem("crowdr_fee_bps");
        if (savedFee) {
          setPlatformFeeBps(Number(savedFee));
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save campaigns to localStorage
  const persistCampaigns = (newCampaigns: Campaign[]) => {
    setCampaigns(newCampaigns);
    try {
      localStorage.setItem("crowdr_eth_campaigns", JSON.stringify(newCampaigns));
    } catch {
      // ignore
    }
  };

  const connectDemoAccount = (index: number) => {
    const acc = DEMO_ACCOUNTS[index % DEMO_ACCOUNTS.length];
    setAccount(acc.address);
    setAccountName(acc.name);
    setBalance(acc.balance);
    setIsRealWallet(false);
  };

  const connectInjectedWallet = async () => {
    if (typeof window !== "undefined" && (window as unknown as { ethereum?: unknown }).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          const userAddress = accounts[0];
          setAccount(userAddress);
          setAccountName("Connected Wallet");
          const bal = await provider.getBalance(userAddress);
          setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
          setIsRealWallet(true);
        }
      } catch (err) {
        console.error("Failed to connect wallet:", err);
      }
    } else {
      alert("No Ethereum browser wallet (MetaMask, Rabby, etc.) detected. Using demo account mode.");
    }
  };

  const createCampaign = async (data: {
    title: string;
    summary: string;
    description: string;
    category: Campaign["category"];
    coverImage: string;
    goal: string;
    durationDays: number;
  }): Promise<string> => {
    if (isPaused) {
      throw new Error("Campaign creation is currently paused by admin.");
    }

    // Generate simulated deterministic address / CID
    const randomHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    const newAddress = `0x${randomHex}A1b2C3d4E5f6789012345678901234567890`.slice(0, 42);
    const metadataCID = `ipfs://bafy${randomHex}${Date.now()}`;
    const deadline = Math.floor(Date.now() / 1000) + data.durationDays * 86400;

    const newCampaign: Campaign = {
      id: newAddress,
      address: newAddress,
      creator: account,
      title: data.title,
      summary: data.summary,
      description: data.description,
      category: data.category,
      coverImage: data.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      metadataCID,
      goal: parseFloat(data.goal).toFixed(2),
      totalRaised: "0.0",
      deadline,
      feeBps: platformFeeBps,
      status: "Active",
      withdrawn: false,
      cancelled: false,
      contributorsCount: 0,
      contributors: [],
      updates: [],
      createdAt: Date.now(),
    };

    const updated = [newCampaign, ...campaigns];
    persistCampaigns(updated);
    return newAddress;
  };

  const contribute = async (campaignAddress: string, amountEth: string) => {
    const val = parseFloat(amountEth);
    if (isNaN(val) || val < 0.001) {
      throw new Error("Minimum contribution is 0.001 ETH.");
    }

    const target = campaigns.find((c) => c.address.toLowerCase() === campaignAddress.toLowerCase());
    if (!target) throw new Error("Campaign not found.");

    if (target.creator.toLowerCase() === account.toLowerCase()) {
      throw new Error("FR-9: Campaign creators cannot contribute to their own campaign.");
    }

    if (target.status !== "Active" || Math.floor(Date.now() / 1000) >= target.deadline) {
      throw new Error("Campaign is not currently accepting contributions.");
    }

    const currentTotal = parseFloat(target.totalRaised) + val;
    const newContributor: Contributor = {
      address: account,
      amount: val.toFixed(3),
      timestamp: Date.now(),
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    };

    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          totalRaised: currentTotal.toFixed(3),
          contributorsCount: c.contributorsCount + 1,
          contributors: [newContributor, ...c.contributors],
        };
      }
      return c;
    });

    persistCampaigns(updated);

    // Deduct from demo account balance
    const currentAccBal = parseFloat(balance);
    if (!isNaN(currentAccBal) && currentAccBal >= val) {
      setBalance((currentAccBal - val).toFixed(4));
    }
  };

  const withdraw = async (campaignAddress: string) => {
    const target = campaigns.find((c) => c.address.toLowerCase() === campaignAddress.toLowerCase());
    if (!target) throw new Error("Campaign not found.");

    if (target.creator.toLowerCase() !== account.toLowerCase()) {
      throw new Error("FR-18: Only the campaign creator can withdraw funds.");
    }

    const isGoalMet = parseFloat(target.totalRaised) >= parseFloat(target.goal);
    const isDeadlinePassed = Math.floor(Date.now() / 1000) >= target.deadline;

    if (!isGoalMet || !isDeadlinePassed) {
      throw new Error("FR-18: Funds can only be withdrawn once goal is met and deadline has passed.");
    }

    if (target.withdrawn) {
      throw new Error("FR-20: Funds have already been withdrawn.");
    }

    const raised = parseFloat(target.totalRaised);
    const fee = (raised * target.feeBps) / 10000;
    const creatorNet = raised - fee;

    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          status: "Withdrawn" as CampaignStatus,
          withdrawn: true,
        };
      }
      return c;
    });

    persistCampaigns(updated);

    // Credit creator balance
    const currentAccBal = parseFloat(balance);
    if (!isNaN(currentAccBal)) {
      setBalance((currentAccBal + creatorNet).toFixed(4));
    }
  };

  const claimRefund = async (campaignAddress: string) => {
    const target = campaigns.find((c) => c.address.toLowerCase() === campaignAddress.toLowerCase());
    if (!target) throw new Error("Campaign not found.");

    const isDeadlinePassed = Math.floor(Date.now() / 1000) >= target.deadline;
    const isGoalMissed = parseFloat(target.totalRaised) < parseFloat(target.goal);
    const isRefundable = (isDeadlinePassed && isGoalMissed) || target.cancelled || target.status === "Failed";

    if (!isRefundable) {
      throw new Error("FR-21: Refunds are only available on Failed or Cancelled campaigns.");
    }

    // Find all contributions made by this account
    const myContributions = target.contributors.filter(
      (ct) => ct.address.toLowerCase() === account.toLowerCase()
    );

    const totalRefund = myContributions.reduce((acc, ct) => acc + parseFloat(ct.amount), 0);
    if (totalRefund <= 0) {
      throw new Error("No active contribution found for this wallet.");
    }

    // Pull pattern: zero out contributions for this account
    const updatedContributors = target.contributors.filter(
      (ct) => ct.address.toLowerCase() !== account.toLowerCase()
    );

    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          contributors: updatedContributors,
          status: "Failed" as CampaignStatus,
        };
      }
      return c;
    });

    persistCampaigns(updated);

    // Credit contributor balance with 100% full refund
    const currentAccBal = parseFloat(balance);
    if (!isNaN(currentAccBal)) {
      setBalance((currentAccBal + totalRefund).toFixed(4));
    }
  };

  const cancelCampaign = async (campaignAddress: string) => {
    const target = campaigns.find((c) => c.address.toLowerCase() === campaignAddress.toLowerCase());
    if (!target) throw new Error("Campaign not found.");

    if (target.creator.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Only the creator can cancel this campaign.");
    }

    if (parseFloat(target.totalRaised) > 0) {
      throw new Error("Cannot cancel a campaign after receiving contributions.");
    }

    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          cancelled: true,
          status: "Cancelled" as CampaignStatus,
        };
      }
      return c;
    });

    persistCampaigns(updated);
  };

  const postUpdate = async (campaignAddress: string, title: string, content: string) => {
    const target = campaigns.find((c) => c.address.toLowerCase() === campaignAddress.toLowerCase());
    if (!target) throw new Error("Campaign not found.");

    if (target.creator.toLowerCase() !== account.toLowerCase()) {
      throw new Error("FR-27: Only the campaign creator can post updates.");
    }

    const newUpdate: CampaignUpdate = {
      cid: `ipfs://bafyupd${Date.now()}`,
      title,
      content,
      timestamp: Date.now(),
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    };

    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          updates: [newUpdate, ...c.updates],
        };
      }
      return c;
    });

    persistCampaigns(updated);
  };

  const flagCampaign = async (campaignAddress: string, reason: string) => {
    // Admin action
    const updated = campaigns.map((c) => {
      if (c.address.toLowerCase() === campaignAddress.toLowerCase()) {
        return {
          ...c,
          cancelled: true,
          status: "Cancelled" as CampaignStatus,
          summary: `[FLAGGED BY ADMIN: ${reason}] ${c.summary}`,
        };
      }
      return c;
    });

    persistCampaigns(updated);
  };

  const updateFeeBps = async (newFeeBps: number) => {
    if (newFeeBps > 500) {
      throw new Error("FR-30: Platform fee is capped at 500 bps (5%).");
    }
    setPlatformFeeBps(newFeeBps);
    localStorage.setItem("crowdr_fee_bps", newFeeBps.toString());
  };

  const togglePause = async () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        accountName,
        balance,
        isRealWallet,
        platformFeeBps,
        isPaused,
        campaigns,
        connectDemoAccount,
        connectInjectedWallet,
        createCampaign,
        contribute,
        withdraw,
        claimRefund,
        cancelCampaign,
        postUpdate,
        flagCampaign,
        updateFeeBps,
        togglePause,
        contractAddresses: {
          factory: deployedContracts.factoryAddress,
          implementation: deployedContracts.implementationAddress,
          treasury: deployedContracts.treasuryAddress,
        },
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
