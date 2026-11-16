# Crowdr ETH: Decentralized Crowdfunding Platform

Non-custodial, trustless, all-or-nothing crowdfunding on Ethereum. Funds are secured by audited smart contracts with guaranteed full refunds on failure.

---

## Architecture Overview

Crowdr ETH eliminates custodial risk, excessive platform fees, and delayed payouts found in traditional crowdfunding platforms by enforcing all-or-nothing campaign logic directly on-chain:

1. **Smart Contracts (`contracts/`)**:
   - **`CampaignFactory.sol`**: Deploys lightweight minimal proxy clones ([EIP-1167](https://eips.ethereum.org/EIPS/eip-1167)) of the campaign implementation contract. Manages platform fee configuration (capped at 5%), treasury recipient, and emergency pause controls using OpenZeppelin's `Ownable2Step`.
   - **`Campaign.sol`**: Storage-packed clone instance holding ETH in trustless escrow. Calculates funding states dynamically from block timestamp and goal metrics. Enforces atomic payout with pull-based fee distribution (`claimFee`), `withdrawTo` recipient redirection, and 100% full contributor refunds if the funding target is not met by the deadline.
   - **`ICampaign.sol` & `ICampaignFactory.sol`**: Standard interface definitions.

2. **Frontend Application (`frontend/`)**:
   - **Framework**: Next.js 16 (App Router), React 19, Tailwind CSS, and Ethers.js v6.
   - **Component Library**: Tailored Cubby UI components with accessible, high-contrast dark-mode primitives.
   - **Web3 Integration**: Contract-first architecture. All state, balances, contributor counts, and funding progress are read directly from on-chain RPC calls. Strict `bigint` precision for all wei calculations.

---

## Quickstart

### Prerequisites
- Node.js 20+
- npm 10+

### 1. Smart Contracts

```bash
cd contracts

# Install dependencies
npm ci

# Compile Solidity contracts
npm run compile

# Run the Hardhat test suite (43 unit, edge-case, and fuzzing tests)
npm test

# Generate gas report
REPORT_GAS=true npm test

# Run code coverage (>= 98% line coverage)
npm run coverage
```

### 2. Frontend Application

```bash
cd frontend

# Install dependencies
npm ci

# Run linter
npm run lint

# TypeScript verification
npx tsc --noEmit

# Production build (offline-ready)
npm run build

# Start local development server
npm run dev
```

The web application runs at `http://localhost:3000` (or `http://localhost:3001` if configured).

---

## Environment Variables

### Smart Contracts (`contracts/.env`)
Copy `contracts/.env.example` to `contracts/.env`:

```bash
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
DEPLOYER_PRIVATE_KEY="0xYOUR_HEX_PRIVATE_KEY"
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"
OWNER="0xYOUR_MULTISIG_OR_ADMIN_ADDRESS"
TREASURY="0xYOUR_TREASURY_ADDRESS"
REPORT_GAS="true"
```

### Frontend (`frontend/.env.local`)
Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
# JSON-RPC endpoint for contract reads
NEXT_PUBLIC_RPC_URL="http://127.0.0.1:8545"

# Target network chain ID (31337 for local Hardhat, 11155111 for Sepolia)
NEXT_PUBLIC_CHAIN_ID="31337"

# Optional: WalletConnect v2 Project ID
NEXT_PUBLIC_WC_PROJECT_ID=""

# Optional: Pinata JWT for IPFS metadata & cover image uploads
PINATA_JWT=""

# Optional: Site base URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## Deployment & Verification

### Local Deployment
```bash
# Terminal 1: Start local node
cd contracts
npx hardhat node

# Terminal 2: Deploy factory and mock campaigns
cd contracts
npm run deploy:local
```
This automatically updates `frontend/src/contracts/deployedContracts.json`.

### Sepolia Testnet Deployment
```bash
cd contracts
npm run deploy:sepolia
```

To verify the deployed implementation and factory contracts on Etherscan:
```bash
npx hardhat verify --network sepolia <DEPLOYED_FACTORY_ADDRESS> <FEE_BPS> <TREASURY_ADDRESS>
```

---

## Key Invariants

1. **Balance Conservation**: While Active or Failed, contract ETH balance strictly matches the sum of unrefunded contributions.
2. **Mutual Exclusion**: Creator payout (`withdraw` / `withdrawTo`) and backer `refund` are strictly mutually exclusive.
3. **Refund Integrity**: Contributors receive 100% of their contributed ETH on failed or cancelled campaigns; zero deductions or platform fees are taken from refunds.
4. **Pull-Based Fee Separation**: Creator withdrawal pays the campaign owner first; platform fees are credited to `feeOwed` and pulled by the treasury via `claimFee`. A reverting or unpayable treasury address can never block or trap creator funds.
5. **Reentrancy Protection**: All state modifications follow the Checks-Effects-Interactions (CEI) pattern with OpenZeppelin `ReentrancyGuard`.
6. **Creator Isolation**: Campaign creators cannot contribute to their own campaigns.

---

## License

[MIT](LICENSE)
