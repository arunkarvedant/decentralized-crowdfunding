export type CampaignStatus = "Active" | "Successful" | "Failed" | "Cancelled" | "Withdrawn";

export interface CampaignUpdate {
  cid: string;
  title: string;
  content: string;
  timestamp: number;
  txHash?: string;
}

export interface Contributor {
  address: string;
  amount: string; // in ETH
  timestamp: number;
  txHash?: string;
}

export interface Campaign {
  id: string; // clone address or uuid
  address: string;
  creator: string;
  title: string;
  summary: string;
  description: string;
  category: "Technology" | "Open Source" | "Art & Film" | "Community" | "Gaming" | "Other";
  coverImage: string;
  metadataCID: string;
  goal: string; // in ETH
  totalRaised: string; // in ETH
  deadline: number; // timestamp in seconds
  feeBps: number;
  status: CampaignStatus;
  withdrawn: boolean;
  cancelled: boolean;
  contributorsCount: number;
  contributors: Contributor[];
  updates: CampaignUpdate[];
  createdAt: number;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  isMetaMask: boolean;
}
