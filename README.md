# Crowdr ETH: Decentralized Crowdfunding Platform

> **PRD Version 1.0 Implementation**  
> Trustless, non-custodial, all-or-nothing campaign crowdfunding powered by Ethereum smart contracts.

---

## 🌟 Architectural Overview

Crowdr ETH eliminates custodial risk, high fees, and delayed payouts found in traditional crowdfunding platforms by enforcing an **all-or-nothing** model directly in code:

1. **Smart Contracts (Solidity 0.8.20 + OpenZeppelin)**:
   - **`CampaignFactory.sol`**: Implements the **EIP-1167 Minimal Proxy Clone** standard. Deploys gas-efficient clones of the master campaign logic, tracks the campaign registry, manages platform fee governance (default 2%, capped at 5%), and emergency pause.
   - **`Campaign.sol`**: Cloneable crowdfunding campaign instance. Controls contribution escrow, real-time status transitions derived from block timestamp, creator withdrawal atomic fee splits, and pull-based 100% full refund claims.
   - **`ICampaign.sol` & `ICampaignFactory.sol`**: Clean interface boundaries.

2. **Full-Stack dApp (Next.js 16 + React 19 + Tailwind CSS + Ethers.js)**:
   - **Explore / Discovery View**: Real-time stats, category pills, keyword search, status filtering, and sorting.
   - **Campaign Detail View**: Real-time countdown timer, funding progress bar, all-or-nothing guarantee, contribution widget, milestone updates, public/anonymous contributor ledger, and verified contract addresses.
   - **Launch Campaign Wizard**: 3-step creation process with live card preview, parameter validation, and on-chain deployment.
   - **Creator Dashboard**: Created campaign analytics, 1-click creator payout withdrawal (98% creator / 2% treasury split), milestone update broadcasting, and cancellation.
   - **Contributor / Backer Dashboard**: My pledged campaigns, on-chain receipts, and 1-click **100% full refund claims** on failed/cancelled campaigns.
   - **Governance & Admin Panel**: Platform fee adjustment (capped at 5%), factory emergency pause/unpause, and policy violation delisting.
   - **Seamless Persona Switcher**: Instant switching between *Alex (Backer)*, *Sarah (Creator)*, and *Admin Multisig* for testing every PRD flow without needing testnet ETH or wallet extensions, plus support for direct MetaMask / Rabby / injected EVM browser wallets.

---

## 🧪 Smart Contract Verification & Invariants

All 29 automated test cases covering PRD Functional Requirements (FR-1 to FR-31) and key invariants are verified in [`contracts/test/Campaign.test.js`](file:///c:/Users/vedant/Downloads/mohit/contracts/test/Campaign.test.js):

- **Invariant 1**: Contract ETH balance equals the exact sum of unrefunded contributions while Active or Failed.
- **Invariant 2**: Withdrawal and refund are mutually exclusive by state.
- **Invariant 3**: A contributor can never withdraw more than their accumulated contributions.
- **Invariant 4**: Creator cannot contribute to their own campaign (`FR-9`).
- **Invariant 5**: Pull pattern with Checks-Effects-Interactions (CEI) and ReentrancyGuard prevents double-spending or reentrancy.
- **Invariant 6**: Factory emergency pause prevents new campaign creation only; existing withdrawals and refunds are never blocked (`FR-29`).

---

## 🚀 Getting Started

### 1. Smart Contracts & Tests

```bash
cd contracts

# Compile Solidity contracts
npx hardhat compile

# Run the 29-test verification suite
npx hardhat test

# Deploy contracts locally
npx hardhat run scripts/deploy.js
```

### 2. Frontend dApp

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Build production bundle
npm run build

# Start local Next.js development server
npm run dev
```

Visit `http://localhost:3001` in your browser.
