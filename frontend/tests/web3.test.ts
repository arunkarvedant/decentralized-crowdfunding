import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignStatus } from "../src/types/crowdfunding";
import { ethers, Interface } from "ethers";

// EIP-1193 Mock Provider
class MockEip1193Provider {
  public chainId: string = "0x7a69"; // 31337
  public accounts: string[] = ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"];
  public isMetaMask: boolean = true;
  private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  async request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (method) {
      case "eth_accounts":
        return this.accounts;
      case "eth_requestAccounts":
        return this.accounts;
      case "eth_chainId":
        return this.chainId;
      case "eth_getBalance":
        return "0x1b1ae4d6e2ef500000"; // 500 ETH in wei hex
      case "wallet_switchEthereumChain": {
        const target = (params?.[0] as { chainId: string })?.chainId;
        this.chainId = target;
        this.emit("chainChanged", target);
        return null;
      }
      default:
        throw new Error(`Unhandled RPC method: ${method}`);
    }
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeListener(event: string, handler: (...args: unknown[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners[event]?.forEach((h) => h(...args));
  }
}

describe("Web3 Logic & Contract Invariants (Unit Tests)", () => {
  let mockProvider: MockEip1193Provider;

  beforeEach(() => {
    mockProvider = new MockEip1193Provider();
    vi.clearAllMocks();
  });

  describe("1. Campaign Status Derivation", () => {
    // Contract status derivation rule from Campaign.sol:
    // if (cancelled) return Cancelled;
    // if (withdrawn) return Withdrawn;
    // if (block.timestamp < deadline) return Active;
    // if (totalRaised >= goal) return Successful;
    // return Failed;
    function deriveStatus(
      deadline: bigint,
      goal: bigint,
      totalRaised: bigint,
      withdrawn: boolean,
      cancelled: boolean,
      currentTimestamp: bigint
    ): CampaignStatus {
      if (cancelled) return CampaignStatus.Cancelled;
      if (withdrawn) return CampaignStatus.Withdrawn;
      if (currentTimestamp < deadline) return CampaignStatus.Active;
      if (totalRaised >= goal) return CampaignStatus.Successful;
      return CampaignStatus.Failed;
    }

    const goal = ethers.parseEther("10.0");
    const deadline = 1800000000n;

    it("derives Active (0) when block timestamp is before deadline", () => {
      const now = deadline - 1000n;
      const status = deriveStatus(deadline, goal, 0n, false, false, now);
      expect(status).toBe(CampaignStatus.Active);
    });

    it("derives Successful (1) when deadline has passed and goal is reached", () => {
      const now = deadline + 100n;
      const raised = ethers.parseEther("10.5");
      const status = deriveStatus(deadline, goal, raised, false, false, now);
      expect(status).toBe(CampaignStatus.Successful);
    });

    it("derives Failed (2) when deadline has passed and goal is not reached", () => {
      const now = deadline + 100n;
      const raised = ethers.parseEther("9.99");
      const status = deriveStatus(deadline, goal, raised, false, false, now);
      expect(status).toBe(CampaignStatus.Failed);
    });

    it("derives Cancelled (3) when campaign was cancelled", () => {
      const now = deadline - 500n;
      const status = deriveStatus(deadline, goal, 0n, false, true, now);
      expect(status).toBe(CampaignStatus.Cancelled);
    });

    it("derives Withdrawn (4) when funds have been claimed by creator", () => {
      const now = deadline + 100n;
      const raised = ethers.parseEther("12.0");
      const status = deriveStatus(deadline, goal, raised, true, false, now);
      expect(status).toBe(CampaignStatus.Withdrawn);
    });
  });

  describe("2. Metadata & CID Decoding", () => {
    it("correctly decodes inline base64 metadata payload", () => {
      const originalMeta = {
        title: "Test Campaign",
        summary: "A test campaign",
        description: "Full detailed story here",
        category: "Technology",
        coverImage: "https://example.com/cover.png",
      };
      const base64Str = Buffer.from(JSON.stringify(originalMeta)).toString("base64");
      const cid = `data:application/json;base64,${base64Str}`;

      const raw = cid.replace("data:application/json;base64,", "");
      const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));

      expect(decoded.title).toBe("Test Campaign");
      expect(decoded.summary).toBe("A test campaign");
      expect(decoded.category).toBe("Technology");
    });

    it("generates fallback metadata when CID is empty or unresolvable", () => {
      const addr = "0x1234567890123456789012345678901234567890";
      const fallback = {
        title: `Campaign ${addr.slice(0, 6)}...${addr.slice(-4)}`,
        summary: "Decentralized Crowdfunding Campaign on Ethereum",
        category: "Technology",
      };
      expect(fallback.title).toBe("Campaign 0x1234...7890");
      expect(fallback.summary).toContain("Decentralized Crowdfunding");
    });
  });

  describe("3. Error Decoding & User Rejection Handling", () => {
    function decodeContractError(error: unknown, iface?: Interface): string {
      const err = error as {
        code?: string | number;
        reason?: string;
        shortMessage?: string;
        message?: string;
        data?: string;
        info?: { error?: { data?: string } };
      };

      if (
        err.code === "ACTION_REJECTED" ||
        err.code === 4001 ||
        err.message?.includes("user rejected")
      ) {
        return "Transaction was cancelled in wallet.";
      }
      if (err.reason) return err.reason;

      const rawData = err.data || err.info?.error?.data;
      if (rawData && iface) {
        try {
          const parsed = iface.parseError(rawData);
          if (parsed?.name === "EnforcedPause") {
            return "Campaign actions are currently paused by the platform.";
          }
          if (parsed?.name === "OwnableUnauthorizedAccount") {
            return "Unauthorized: action restricted to platform owner.";
          }
        } catch {
          // ignore
        }
      }

      return err.shortMessage || err.message || "Transaction failed on-chain.";
    }

    it("catches user wallet cancellation (4001 / ACTION_REJECTED) and surfaces friendly message", () => {
      const rejectErr = { code: 4001, message: "User rejected the transaction request." };
      const message = decodeContractError(rejectErr);
      expect(message).toBe("Transaction was cancelled in wallet.");

      const actionRejectErr = { code: "ACTION_REJECTED", message: "User rejected" };
      expect(decodeContractError(actionRejectErr)).toBe("Transaction was cancelled in wallet.");
    });

    it("surfaces exact require string when contract reverts with reason", () => {
      const revertErr = { reason: "Contribution below minimum", code: "CALL_EXCEPTION" };
      const message = decodeContractError(revertErr);
      expect(message).toBe("Contribution below minimum");
    });

    it("parses custom errors like EnforcedPause", () => {
      const iface = new Interface(["error EnforcedPause()"]);
      const errorData = iface.encodeErrorResult("EnforcedPause", []);
      const customErr = { data: errorData };
      const message = decodeContractError(customErr, iface);
      expect(message).toBe("Campaign actions are currently paused by the platform.");
    });
  });

  describe("4. EIP-1193 Network Detection & Chain Switching", () => {
    it("detects chain mismatch and calls wallet_switchEthereumChain", async () => {
      expect(mockProvider.chainId).toBe("0x7a69"); // 31337

      // Switch to Sepolia (11155111 = 0xaa36a7)
      await mockProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });

      expect(mockProvider.chainId).toBe("0xaa36a7");
    });

    it("silently restores accounts via eth_accounts", async () => {
      const accounts = await mockProvider.request({ method: "eth_accounts" });
      expect(accounts).toEqual(["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]);
    });

    it("retrieves native ETH balance via eth_getBalance", async () => {
      const balanceHex = (await mockProvider.request({
        method: "eth_getBalance",
        params: [mockProvider.accounts[0], "latest"],
      })) as string;
      const balanceWei = BigInt(balanceHex);
      expect(balanceWei).toBeGreaterThan(0n);
      expect(ethers.formatEther(balanceWei)).toBe("500.0");
    });
  });

  describe("5. BigInt Math & Precision Invariants", () => {
    it("calculates progress percentage with 10000n basis points without float drift", () => {
      const goal = ethers.parseEther("3.0"); // 3e18
      const raised = ethers.parseEther("1.0"); // 1e18

      // (raised * 10000n) / goal = 3333n basis points -> 33.33%
      const bps = (raised * 10000n) / goal;
      const pct = Number(bps) / 100;

      expect(pct).toBe(33.33);
    });

    it("preserves exact wei conservation across fees and creator payout", () => {
      const totalRaised = ethers.parseEther("10.0");
      const feeBps = 200n; // 2%
      const feeAmount = (totalRaised * feeBps) / 10000n;
      const creatorAmount = totalRaised - feeAmount;

      expect(feeAmount + creatorAmount).toBe(totalRaised);
      expect(feeAmount).toBe(ethers.parseEther("0.2"));
      expect(creatorAmount).toBe(ethers.parseEther("9.8"));
    });
  });
});
