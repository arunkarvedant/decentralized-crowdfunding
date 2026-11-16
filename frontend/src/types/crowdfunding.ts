export enum CampaignStatus {
  Active = 0,
  Successful = 1,
  Failed = 2,
  Cancelled = 3,
  Withdrawn = 4,
}

export type CampaignCategory =
  | "Technology"
  | "Open Source"
  | "Art & Film"
  | "Community"
  | "Gaming"
  | "Other";

export interface Contributor {
  address: string;
  amount: bigint;
}

export interface CampaignUpdate {
  id: string;
  timestamp: bigint;
  title: string;
  content: string;
  txHash?: string;
}

export interface CampaignMetadata {
  title: string;
  summary?: string;
  description: string;
  category: CampaignCategory;
  coverImage: string;
}

export interface CampaignDetailsStruct {
  campaignAddress: string;
  creator: string;
  treasury: string;
  goal: bigint;
  deadline: bigint;
  metadataCID: string;
  feeBps: bigint;
  minContribution: bigint;
  totalRaised: bigint;
  contributorCount: bigint;
  status: CampaignStatus;
  withdrawn: boolean;
  cancelled: boolean;
}

export interface Campaign {
  address: string;
  creator: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  contributorCount: number;
  status: CampaignStatus;
  feeBps: number;
  feeOwed: bigint;
  withdrawn: boolean;
  cancelled: boolean;
  title: string;
  summary: string;
  description: string;
  coverImage: string;
  category: CampaignCategory;
  metadataCID: string;
  minContribution: bigint;
  treasury: string;
  contributors?: Contributor[];
  updates?: CampaignUpdate[];
}

export type TransactionStatus =
  | "idle"
  | "awaitingSignature"
  | "pending"
  | "confirmed"
  | "failed";

export interface TransactionState {
  status: TransactionStatus;
  txHash?: string;
  error?: string;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: bigint;
  isConnected: boolean;
  isConnecting: boolean;
  isMetaMask: boolean;
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
