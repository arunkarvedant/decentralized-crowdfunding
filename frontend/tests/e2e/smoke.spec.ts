import { test, expect } from "@playwright/test";

// Mock injected EIP-1193 wallet helper
const injectMockWalletScript = `
  const mockAccounts = ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"];
  const listeners = {};

  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params }) => {
      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        return mockAccounts;
      }
      if (method === "eth_chainId") {
        return "0x7a69"; // 31337
      }
      if (method === "eth_getBalance") {
        return "0x1b1ae4d6e2ef500000"; // 500 ETH
      }
      if (method === "wallet_switchEthereumChain") {
        return null;
      }
      return null;
    },
    on: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeListener: (event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    }
  };
`;

test.describe("Crowdr ETH E2E Smoke Tests", () => {
  test("Test 1: Visit /, see campaigns catalog and navigation elements", async ({ page }) => {
    await page.goto("/");

    // Verify main brand heading and nav elements
    await expect(page.locator("text=Decentralized Crowdfunding")).toBeVisible();
    await expect(page.locator("text=Browse Escrows")).toBeVisible();
    await expect(page.locator("text=Launch Escrow Campaign")).toBeVisible();

    // Verify all-or-nothing guarantee accordion
    await expect(page.locator("text=Trustless Security & Smart Contract Architecture")).toBeVisible();
  });

  test("Test 2: Create Campaign wizard input validation", async ({ page }) => {
    await page.goto("/create");

    await expect(page.locator("text=Launch Escrow Campaign")).toBeVisible();
    await expect(page.locator("text=Step 1: Campaign Basics & Category")).toBeVisible();

    // Attempting to proceed without required fields
    const nextBtn = page.locator("button:has-text('Next: Story & Goal')");
    await nextBtn.click();

    // Verify validation errors appear
    await expect(page.locator("text=Title must be at least 3 characters")).toBeVisible();
    await expect(page.locator("text=Summary must be at least 10 characters")).toBeVisible();
  });

  test("Test 3: Wallet connection flow and UI status", async ({ page }) => {
    await page.addInitScript(injectMockWalletScript);
    await page.goto("/");

    // Locate and click Connect Wallet button
    const connectBtn = page.locator("button:has-text('Connect Wallet')");
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
    }

    // Verify connected address or avatar displays
    await expect(page.locator("text=0x7099...79C8")).toBeVisible({ timeout: 5000 });
  });

  test("Test 4: Dashboard tabs and access control", async ({ page }) => {
    await page.addInitScript(injectMockWalletScript);
    await page.goto("/dashboard");

    // Verify creator and backer views are available
    await expect(page.locator("text=Creator View")).toBeVisible();
    await expect(page.locator("text=Backer View")).toBeVisible();
  });
});
