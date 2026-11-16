"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ethers, Interface } from "ethers";
import {
  Campaign,
  CampaignStatus,
  Contributor,
  CampaignUpdate,
  CampaignMetadata,
  TransactionState,
  WalletState,
} from "@/types/crowdfunding";
import deployedContractsData from "@/contracts/deployedContracts.json";

const TARGET_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const TARGET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID || "31337"
);

function getDeployment(chainIdNumber: number) {
  const chainIdStr = chainIdNumber.toString();
  const raw = deployedContractsData as Record<string, unknown>;
  if (chainIdStr in raw) {
    return raw[chainIdStr] as {
      factoryAddress: string;
      implementationAddress?: string;
      factoryAbi: ethers.InterfaceAbi;
      campaignAbi: ethers.InterfaceAbi;
      treasuryAddress?: string;
      feeBps?: number;
    };
  }
  if (raw.chainId === chainIdStr || raw.factoryAddress) {
    return raw as unknown as {
      factoryAddress: string;
      implementationAddress?: string;
      factoryAbi: ethers.InterfaceAbi;
      campaignAbi: ethers.InterfaceAbi;
      treasuryAddress?: string;
      feeBps?: number;
    };
  }
  if ("31337" in raw) {
    return raw["31337"] as {
      factoryAddress: string;
      implementationAddress?: string;
      factoryAbi: ethers.InterfaceAbi;
      campaignAbi: ethers.InterfaceAbi;
      treasuryAddress?: string;
      feeBps?: number;
    };
  }
  return raw as unknown as {
    factoryAddress: string;
    implementationAddress?: string;
    factoryAbi: ethers.InterfaceAbi;
    campaignAbi: ethers.InterfaceAbi;
    treasuryAddress?: string;
    feeBps?: number;
  };
}

interface Web3ContextType {
  wallet: WalletState;
  targetChainId: number;
  isWrongNetwork: boolean;
  campaigns: Campaign[];
  loadingCampaigns: boolean;
  txState: TransactionState;
  factoryOwner: string | null;
  factoryTreasury: string | null;
  factoryFeeBps: number;
  isPaused: boolean;
  isOwner: boolean;
  resetTxState: () => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId?: number) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  getCampaign: (address: string) => Campaign | undefined;
  getUserContribution: (campaignAddress: string, userAddress?: string) => Promise<bigint>;
  getPaginatedContributors: (campaignAddress: string, offset: number, limit: number) => Promise<Contributor[]>;
  createCampaign: (goalEth: string, durationDays: number, metadata: CampaignMetadata) => Promise<string>;
  contribute: (campaignAddress: string, amountEth: string) => Promise<ethers.ContractTransactionReceipt>;
  withdraw: (campaignAddress: string) => Promise<ethers.ContractTransactionReceipt>;
  withdrawTo: (campaignAddress: string, recipient: string) => Promise<ethers.ContractTransactionReceipt>;
  claimFee: (campaignAddress: string) => Promise<ethers.ContractTransactionReceipt>;
  refund: (campaignAddress: string) => Promise<ethers.ContractTransactionReceipt>;
  cancel: (campaignAddress: string) => Promise<ethers.ContractTransactionReceipt>;
  postUpdate: (campaignAddress: string, title: string, content: string) => Promise<ethers.ContractTransactionReceipt>;
  flagCampaign: (campaignAddress: string, reason: string) => Promise<ethers.ContractTransactionReceipt>;
  setFeeBps: (newFeeBps: number) => Promise<ethers.ContractTransactionReceipt>;
  pauseFactory: () => Promise<ethers.ContractTransactionReceipt>;
  unpauseFactory: () => Promise<ethers.ContractTransactionReceipt>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function decodeContractError(error: unknown, iface?: Interface): string {
  if (!error) return "Unknown error occurred";
  const err = error as {
    code?: string | number;
    reason?: string;
    shortMessage?: string;
    message?: string;
    data?: string;
    info?: { error?: { data?: string } };
  };

  // User rejection
  if (
    err.code === "ACTION_REJECTED" ||
    err.code === 4001 ||
    err.message?.includes("user rejected") ||
    err.message?.includes("User rejected the request")
  ) {
    return "Transaction was cancelled in wallet.";
  }

  // Contract revert with reason string
  if (err.reason) {
    return err.reason;
  }

  // Parse custom errors if data payload exists
  const rawData = err.data || err.info?.error?.data;
  if (rawData && iface) {
    try {
      const parsed = iface.parseError(rawData);
      if (parsed) {
        if (parsed.name === "EnforcedPause") return "Campaign actions are currently paused by the platform.";
        if (parsed.name === "OwnableUnauthorizedAccount") return "Unauthorized: action restricted to platform owner.";
        if (parsed.name === "ReentrancyGuardReentrantCall") return "Reentrancy detected: call aborted.";
        return `Contract error: ${parsed.name}`;
      }
    } catch {
      // ignore parse failure and proceed
    }
  }

  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return "Transaction failed on-chain.";
}

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: 0n,
    isConnected: false,
    isConnecting: false,
    isMetaMask: false,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });

  const [factoryOwner, setFactoryOwner] = useState<string | null>(null);
  const [factoryTreasury, setFactoryTreasury] = useState<string | null>(null);
  const [factoryFeeBps, setFactoryFeeBps] = useState<number>(200);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const isWrongNetwork =
    wallet.isConnected && wallet.chainId !== null && wallet.chainId !== TARGET_CHAIN_ID;

  const isOwner =
    !!wallet.address &&
    !!factoryOwner &&
    wallet.address.toLowerCase() === factoryOwner.toLowerCase();

  const resetTxState = useCallback(() => {
    setTxState({ status: "idle" });
  }, []);

  // Read-only JSON-RPC provider (never prompts wallet)
  const getReadProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(TARGET_RPC_URL);
  }, []);

  // Signer provider via connected window.ethereum
  const getBrowserSigner = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No EVM wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(`Wrong network. Please switch to chain ${TARGET_CHAIN_ID}.`);
    }
    return provider.getSigner();
  }, []);

  // Fetch all campaigns and metadata directly from on-chain RPC
  const refreshCampaigns = useCallback(async () => {
    await Promise.resolve();
    setLoadingCampaigns(true);
    try {
      const readProvider = getReadProvider();
      const deployment = getDeployment(TARGET_CHAIN_ID);
      if (!deployment?.factoryAddress) {
        console.warn("Factory address not configured in deployedContracts.json");
        setCampaigns([]);
        setLoadingCampaigns(false);
        return;
      }

      const factoryContract = new ethers.Contract(
        deployment.factoryAddress,
        deployment.factoryAbi,
        readProvider
      );

      // Read factory configs in parallel
      const [ownerAddr, treasuryAddr, fee, paused, campaignAddrs] = await Promise.all([
        factoryContract.owner().catch(() => null),
        factoryContract.treasury().catch(() => null),
        factoryContract.feeBps().catch(() => 200n),
        factoryContract.paused().catch(() => false),
        factoryContract.getAllCampaigns().catch(() => [] as string[]),
      ]);

      setFactoryOwner(ownerAddr);
      setFactoryTreasury(treasuryAddr);
      setFactoryFeeBps(Number(fee));
      setIsPaused(paused);

      if (!campaignAddrs || campaignAddrs.length === 0) {
        setCampaigns([]);
        setLoadingCampaigns(false);
        return;
      }

      // Read each campaign via getDetails()
      const campaignPromises = campaignAddrs.map(async (addr: string): Promise<Campaign | null> => {
        try {
          const campaignContract = new ethers.Contract(
            addr,
            deployment.campaignAbi,
            readProvider
          );

          const [details, feeOwed, rawUpdates] = await Promise.all([
            campaignContract.getDetails(),
            campaignContract.feeOwed().catch(() => 0n),
            campaignContract.getUpdates().catch(() => []),
          ]);

          let metadata: CampaignMetadata = {
            title: `Campaign ${addr.slice(0, 6)}...${addr.slice(-4)}`,
            summary: "Decentralized Crowdfunding Campaign on Ethereum",
            description: "No description provided for this campaign.",
            category: "Technology",
            coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          };

          const cid = details.metadataCID as string;
          if (cid) {
            if (cid.startsWith("data:application/json;base64,")) {
              try {
                const base64Data = cid.replace("data:application/json;base64,", "");
                const decoded = JSON.parse(
                  typeof window !== "undefined"
                    ? atob(base64Data)
                    : Buffer.from(base64Data, "base64").toString("utf-8")
                );
                metadata = { ...metadata, ...decoded };
              } catch {
                // Keep default metadata
              }
            } else if (cid.startsWith("ipfs://") || cid.startsWith("bafy") || cid.startsWith("Qm")) {
              const hash = cid.replace("ipfs://", "");
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                const res = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`, {
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (res.ok) {
                  const fetchedData = await res.json();
                  metadata = { ...metadata, ...fetchedData };
                }
              } catch {
                // Keep default metadata if IPFS gateway is slow or unreachable
              }
            }
          }

          const updates: CampaignUpdate[] = (rawUpdates || []).map(
            (u: { cid: string; timestamp: bigint }, idx: number) => ({
              id: `${addr}-update-${idx}`,
              timestamp: BigInt(u.timestamp),
              title: `Update #${idx + 1}`,
              content: u.cid,
            })
          );

          return {
            address: details.campaignAddress,
            creator: details.creator,
            treasury: details.treasury,
            goal: BigInt(details.goal),
            deadline: BigInt(details.deadline),
            totalRaised: BigInt(details.totalRaised),
            contributorCount: Number(details.contributorCount),
            status: Number(details.status) as CampaignStatus,
            feeBps: Number(details.feeBps),
            feeOwed: BigInt(feeOwed),
            minContribution: BigInt(details.minContribution),
            withdrawn: Boolean(details.withdrawn),
            cancelled: Boolean(details.cancelled),
            metadataCID: cid,
            title: metadata.title,
            summary: metadata.summary || metadata.title,
            description: metadata.description,
            category: metadata.category || "Technology",
            coverImage: metadata.coverImage || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
            updates,
          };
        } catch (err) {
          console.error(`Failed to load details for campaign ${addr}:`, err);
          return null;
        }
      });

      const loaded = (await Promise.all(campaignPromises)).filter(
        (c): c is Campaign => c !== null
      );
      setCampaigns(loaded);
    } catch (error) {
      console.error("Failed to refresh campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [getReadProvider]);

  // Load campaigns on initial mount
  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  // Wallet connection & state synchronization
  const updateWalletState = useCallback(async (account: string | null) => {
    if (!account || typeof window === "undefined" || !window.ethereum) {
      setWallet({
        address: null,
        chainId: null,
        balance: 0n,
        isConnected: false,
        isConnecting: false,
        isMetaMask: false,
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [network, balance] = await Promise.all([
        provider.getNetwork(),
        provider.getBalance(account),
      ]);

      setWallet({
        address: ethers.getAddress(account),
        chainId: Number(network.chainId),
        balance,
        isConnected: true,
        isConnecting: false,
        isMetaMask: Boolean(window.ethereum.isMetaMask),
      });
    } catch (err) {
      console.error("Failed to update wallet state:", err);
    }
  }, []);

  // Silent restore on mount (eth_accounts) & event listeners
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (!accs || accs.length === 0) {
        updateWalletState(null);
      } else {
        updateWalletState(accs[0]);
      }
    };

    const handleChainChanged = () => {
      // Reload or refresh on chain change
      window.location.reload();
    };

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          updateWalletState(accs[0]);
        }
      })
      .catch((err: unknown) => console.warn("eth_accounts silent restore failed:", err));

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [updateWalletState]);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("No EVM wallet found. Please install MetaMask, Rabby, or Coinbase Wallet.");
      return;
    }

    setWallet((prev) => ({ ...prev, isConnecting: true }));
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts && accounts.length > 0) {
        await updateWalletState(accounts[0]);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setWallet((prev) => ({ ...prev, isConnecting: false }));
    }
  }, [updateWalletState]);

  const disconnectWallet = useCallback(() => {
    setWallet({
      address: null,
      chainId: null,
      balance: 0n,
      isConnected: false,
      isConnecting: false,
      isMetaMask: false,
    });
  }, []);

  const switchNetwork = useCallback(async (desiredChainId = TARGET_CHAIN_ID) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const hexChainId = `0x${desiredChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: unknown) {
      const err = switchError as { code: number };
      if (err.code === 4902) {
        if (desiredChainId === 31337) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: "Hardhat Local",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [TARGET_RPC_URL],
              },
            ],
          });
        } else if (desiredChainId === 11155111) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  const getCampaign = useCallback(
    (address: string) => {
      return campaigns.find(
        (c) => c.address.toLowerCase() === address.toLowerCase()
      );
    },
    [campaigns]
  );

  const getUserContribution = useCallback(
    async (campaignAddress: string, userAddress?: string): Promise<bigint> => {
      const account = userAddress || wallet.address;
      if (!account) return 0n;
      try {
        const readProvider = getReadProvider();
        const deployment = getDeployment(TARGET_CHAIN_ID);
        const contract = new ethers.Contract(
          campaignAddress,
          deployment.campaignAbi,
          readProvider
        );
        const amount = await contract.contributions(account);
        return BigInt(amount);
      } catch (err) {
        console.error(`Failed to fetch user contribution for ${campaignAddress}:`, err);
        return 0n;
      }
    },
    [getReadProvider, wallet.address]
  );

  const getPaginatedContributors = useCallback(
    async (campaignAddress: string, offset: number, limit: number): Promise<Contributor[]> => {
      try {
        const readProvider = getReadProvider();
        const deployment = getDeployment(TARGET_CHAIN_ID);
        const contract = new ethers.Contract(
          campaignAddress,
          deployment.campaignAbi,
          readProvider
        );
        const addrs: string[] = await contract["getContributors(uint256,uint256)"](offset, limit);
        const results = await Promise.all(
          addrs.map(async (addr: string) => {
            const amount = await contract.contributions(addr);
            return {
              address: addr,
              amount: BigInt(amount),
            };
          })
        );
        return results;
      } catch (err) {
        console.error("Failed to get paginated contributors:", err);
        return [];
      }
    },
    [getReadProvider]
  );

  // General write executor with staticCall pre-simulation
  const executeContractWrite = useCallback(
    async (
      contractAddress: string,
      abi: ethers.InterfaceAbi,
      methodName: string,
      args: unknown[],
      value: bigint = 0n
    ): Promise<ethers.ContractTransactionReceipt> => {
      setTxState({ status: "awaitingSignature" });
      const iface = new Interface(abi);

      try {
        const signer = await getBrowserSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);

        // 1. Static call simulation to catch reverts before spending gas
        try {
          await contract[methodName].staticCall(...args, { value });
        } catch (simError) {
          const decodedMessage = decodeContractError(simError, iface);
          setTxState({ status: "failed", error: decodedMessage });
          throw new Error(decodedMessage);
        }

        // 2. Broadcast transaction
        const tx: ethers.ContractTransactionResponse = await contract[methodName](...args, {
          value,
        });

        setTxState({
          status: "pending",
          txHash: tx.hash,
        });

        // 3. Await receipt confirmation
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
          throw new Error("Transaction execution failed on-chain.");
        }

        setTxState({
          status: "confirmed",
          txHash: tx.hash,
        });

        // Refresh campaign states and wallet balance
        refreshCampaigns();
        if (wallet.address) updateWalletState(wallet.address);

        return receipt;
      } catch (error: unknown) {
        const decodedMessage = decodeContractError(error, iface);
        setTxState((prev) => ({
          status: "failed",
          txHash: prev.txHash,
          error: decodedMessage,
        }));
        throw new Error(decodedMessage);
      }
    },
    [getBrowserSigner, refreshCampaigns, updateWalletState, wallet.address]
  );

  // Campaign creation
  const createCampaign = useCallback(
    async (goalEth: string, durationDays: number, metadata: CampaignMetadata): Promise<string> => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      const goalWei = ethers.parseEther(goalEth);
      const durationSeconds = BigInt(durationDays * 86400);

      // Pin metadata via /api/pin route
      const pinRes = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!pinRes.ok) {
        const errJson = await pinRes.json();
        throw new Error(errJson.error || "Failed to pin campaign metadata.");
      }

      const { cid } = await pinRes.json();

      const receipt = await executeContractWrite(
        deployment.factoryAddress,
        deployment.factoryAbi,
        "createCampaign",
        [goalWei, durationSeconds, cid]
      );

      // Parse CampaignCreated event to retrieve campaign address
      const iface = new Interface(deployment.factoryAbi);
      let campaignAddress = "";
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed && parsed.name === "CampaignCreated") {
            campaignAddress = parsed.args[0];
            break;
          }
        } catch {
          // ignore logs from other contracts
        }
      }

      await refreshCampaigns();
      return campaignAddress;
    },
    [executeContractWrite, refreshCampaigns]
  );

  // Contribute ETH
  const contribute = useCallback(
    async (campaignAddress: string, amountEth: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      const amountWei = ethers.parseEther(amountEth);
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "contribute",
        [],
        amountWei
      );
    },
    [executeContractWrite]
  );

  // Creator withdraw to sender
  const withdraw = useCallback(
    async (campaignAddress: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "withdraw",
        []
      );
    },
    [executeContractWrite]
  );

  // Creator withdraw to alternative recipient
  const withdrawTo = useCallback(
    async (campaignAddress: string, recipient: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient Ethereum address.");
      }
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "withdrawTo",
        [recipient]
      );
    },
    [executeContractWrite]
  );

  // Treasury claim platform fee
  const claimFee = useCallback(
    async (campaignAddress: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "claimFee",
        []
      );
    },
    [executeContractWrite]
  );

  // Contributor 100% full refund
  const refund = useCallback(
    async (campaignAddress: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "refund",
        []
      );
    },
    [executeContractWrite]
  );

  // Creator cancel campaign
  const cancel = useCallback(
    async (campaignAddress: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "cancel",
        []
      );
    },
    [executeContractWrite]
  );

  // Post milestone update
  const postUpdate = useCallback(
    async (campaignAddress: string, title: string, content: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      const updateData = { title, content, timestamp: Date.now() };

      const pinRes = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!pinRes.ok) {
        throw new Error("Failed to pin milestone update to IPFS.");
      }

      const { cid } = await pinRes.json();

      return executeContractWrite(
        campaignAddress,
        deployment.campaignAbi,
        "postUpdate",
        [cid]
      );
    },
    [executeContractWrite]
  );

  // Admin flag campaign
  const flagCampaign = useCallback(
    async (campaignAddress: string, reason: string) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        deployment.factoryAddress,
        deployment.factoryAbi,
        "flagCampaign",
        [campaignAddress, reason]
      );
    },
    [executeContractWrite]
  );

  // Admin set fee
  const setFeeBps = useCallback(
    async (newFeeBps: number) => {
      const deployment = getDeployment(TARGET_CHAIN_ID);
      return executeContractWrite(
        deployment.factoryAddress,
        deployment.factoryAbi,
        "setFeeBps",
        [BigInt(newFeeBps)]
      );
    },
    [executeContractWrite]
  );

  // Admin emergency pause
  const pauseFactory = useCallback(async () => {
    const deployment = getDeployment(TARGET_CHAIN_ID);
    return executeContractWrite(
      deployment.factoryAddress,
      deployment.factoryAbi,
      "pause",
      []
    );
  }, [executeContractWrite]);

  // Admin emergency unpause
  const unpauseFactory = useCallback(async () => {
    const deployment = getDeployment(TARGET_CHAIN_ID);
    return executeContractWrite(
      deployment.factoryAddress,
      deployment.factoryAbi,
      "unpause",
      []
    );
  }, [executeContractWrite]);

  const value: Web3ContextType = {
    wallet,
    targetChainId: TARGET_CHAIN_ID,
    isWrongNetwork,
    campaigns,
    loadingCampaigns,
    txState,
    factoryOwner,
    factoryTreasury,
    factoryFeeBps,
    isPaused,
    isOwner,
    resetTxState,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshCampaigns,
    getCampaign,
    getUserContribution,
    getPaginatedContributors,
    createCampaign,
    contribute,
    withdraw,
    withdrawTo,
    claimFee,
    refund,
    cancel,
    postUpdate,
    flagCampaign,
    setFeeBps,
    pauseFactory,
    unpauseFactory,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
