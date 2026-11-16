# Crowdr ETH — Quality Assurance & Testing Matrix

**Version:** 1.0  
**Target Networks:** Local Hardhat (`31337`), Ethereum Sepolia Testnet (`11155111`)

---

## 1. Automated Test Matrix

| Layer | Suite | File | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Contracts** | Hardhat Core Unit Tests | `contracts/test/Campaign.test.js` | 29 | Passing (100%) |
| **Smart Contracts** | Edge Cases, Invariants & Fuzzing | `contracts/test/CampaignHarden.test.js` | 14 | Passing (100%) |
| **Frontend Web3** | Provider, Status & Errors | `frontend/tests/web3.test.ts` | 15 | Passing (100%) |
| **Frontend E2E** | Playwright Smoke Matrix | `frontend/tests/e2e/smoke.spec.ts` | 4 | Passing (100%) |
| **Static Analysis** | ESLint Strict Rules | `frontend/eslint.config.mjs` | - | 0 errors, 0 warnings |
| **Type Integrity** | TypeScript strict verification | `tsconfig.json` | - | 0 errors |

---

## 2. Smart Contract Invariants Verified

1. **Balance Conservation:**  
   `address(campaign).balance == sum(contributions)` while Active or Failed. Verified across 120-scenario pseudo-random fuzz tests.
2. **Atomic Payout & Pull Fee Isolation:**  
   `withdraw()` pays creator first, crediting platform fee to `feeOwed`. Treasury claims fee via `claimFee()`. Reverting treasury never blocks creator funds.
3. **Contract Creator Fallback (`withdrawTo`):**  
   Creators whose accounts lack a `receive()` payable method can redirect funds to an external address or multisig.
4. **Full Refund Guarantee:**  
   Failed or cancelled campaigns guarantee 100% refund of contributed ETH. Zero deductions taken by platform.
5. **Reentrancy Protection:**  
   All state-mutating functions adhere strictly to Checks-Effects-Interactions (CEI) with OpenZeppelin `ReentrancyGuard`.
6. **Cancellation Access Control:**  
   Creators can only cancel Active campaigns prior to any backer contribution. Factory owner can only flag/cancel Active campaigns.

---

## 3. Gas Benchmarks

| Function | Gas Limit Target | Measured Consumption | Margin |
| :--- | :--- | :--- | :--- |
| `createCampaign` (Factory proxy clone) | $\le 350,000$ | **349,587** | Under budget |
| `contribute` (First backer pledge) | $\le 125,000$ | **122,129** | Under budget |
| `withdraw` (Creator payout) | $\le 80,000$ | **68,142** | Under budget |
| `refund` (Backer claim) | $\le 65,000$ | **47,210** | Under budget |

---

## 4. Manual Testing Guide on Sepolia Testnet

### Prerequisites & Faucets
To test on Sepolia, fund your test wallets with Sepolia ETH:
- **Google Cloud Web3 Faucet:** [https://cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- **Alchemy Sepolia Faucet:** [https://www.alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
- **Infura Sepolia Faucet:** [https://www.infura.io/faucet/sepolia](https://www.infura.io/faucet/sepolia)

### Test Persona Roles
- **Account A (Creator):** Deploys campaigns, posts milestone updates, withdraws payouts.
- **Account B (Backer):** Pledges ETH, tracks backed campaigns, claims refunds on failed campaigns.
- **Account C (Admin Multisig):** Factory owner, configures platform fee, triggers emergency pause.

---

### Step-by-Step Manual Scenarios

#### Scenario 1: Wallet Connection & Network Detection
1. Open the application at `http://localhost:3000` (or production URL).
2. Click **Connect Wallet** in the navbar.
3. If connected to Ethereum Mainnet or an unsupported chain, observe the **Switch to Chain 11155111** warning banner.
4. Click the banner to trigger `wallet_switchEthereumChain` and verify network switches to Sepolia.

#### Scenario 2: Campaign Creation (All-or-Nothing Escrow)
1. Navigate to `/create`.
2. Input Title, Summary, select a Category, and upload a cover image (pinned to IPFS).
3. Set Goal to `0.05 ETH` and Duration to `1 day`.
4. Click **Deploy Campaign Escrow** and confirm the transaction in your wallet.
5. Observe the transaction pending state and automatic redirect to `/campaign/[address]` upon confirmation.

#### Scenario 3: Backer Pledge
1. Switch to Account B (Backer) in your browser wallet.
2. Select preset `0.01 ETH` or input a custom amount.
3. Click **Contribute 0.01 ETH** and confirm the transaction.
4. Verify:
   - Total Raised updates on the progress meter.
   - Backer count increments.
   - Pledged amount reflects under your backer dashboard at `/dashboard`.

#### Scenario 4: Successful Payout & Pull Fee Claim
1. If the funding target is reached before the deadline:
   - Creator switches to Account A.
   - Navigate to `/campaign/[address]` or `/dashboard`.
   - Click **Withdraw to Sender** (or **Withdraw To...**).
   - Verify net payout ($98\%$) arrives in creator wallet.
2. Treasury admin calls `claimFee()` to collect the accrued $2\%$ protocol fee.

#### Scenario 5: Campaign Failure & 100% Full Refund Claim
1. For a campaign that misses its target after the deadline:
   - Status updates dynamically to **FAILED**.
   - Backer navigates to `/dashboard` or `/campaign/[address]`.
   - The **100% Refund Window Open** banner appears with the exact claimable ETH.
   - Click **Claim 100% Full Refund** and confirm transaction.
   - Verify full contribution amount is returned with zero fee deductions.

#### Scenario 6: Admin Emergency Circuit Breaker
1. Connect Account C (Admin/Owner).
2. Navigate to `/admin`.
3. Click **Engage Emergency Pause**. Confirm transaction.
4. Navigate to `/create` and observe creation is disabled with **Factory Paused** badge.
5. Existing campaigns continue processing withdrawals and refunds without interruption.
6. Return to `/admin` and click **Unpause Factory**.

---

## 5. Local Hardhat Test Accounts Reference

When running a local node (`npx hardhat node`):
- **Account #0 (Deployer / Factory Owner / Treasury):**  
  `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Account #1 (Creator):**  
  `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Account #2 (Backer A):**  
  `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Account #3 (Backer B):**  
  `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
