# Swarm Handoff & Inter-Agent Coordination Ledger

## Phase Ownership & Boundaries
- **Agent A (Contracts)**: `contracts/**`
- **Agent B (Cleanup & tooling)**: Repo root (`.github/**`, root files), frontend config, file deletions
- **Agent C (Web3 layer)**: `frontend/src/context/**`, `frontend/src/lib/**`, `frontend/src/contracts/**`
- **Agent D (Routes & UI)**: `frontend/src/app/**`, `frontend/src/components/**`
- **Agent E (QA)**: `frontend/tests/**`, `frontend/playwright.config.ts`, `docs/QA.md`

---
## Agent Notes & Interface Agreements

### Agent A -> Agent C (Contracts ABI & Deployments)
- **Status:** Complete & verified.
- **Gas Targets:**
  - `createCampaign`: max 349,587 gas (<= 350k target).
  - `contribute` (first): max 122,129 gas (<= 125k target).
  - `withdraw`: ~68k gas.
- **Coverage:**
  - `Campaign.sol`: 98.06% line coverage (>= 95%).
  - `CampaignFactory.sol`: 100% line coverage (>= 95%).
- **Key Interface Changes for Agent C & D:**
  1. `Campaign.withdrawTo(address payable to)`: New method allowing contract creators to redirect payouts.
  2. `Campaign.claimFee()`: New pull-based method to claim fees to platform treasury (`feeOwed` tracked in contract).
  3. `Campaign.feeOwed()`: Returns remaining fee waiting to be pulled by treasury.
  4. `Campaign.contributorCount()`: Returns `uint256` count of unique contributors.
  5. `Campaign.getContributors(uint256 offset, uint256 limit)`: Returns paginated slice of contributors array. `getContributors()` still supported for backward compatibility.
  6. `Campaign.cancel()`: When caller is not creator, strictly requires `status() == Active`. Successful/Failed/Withdrawn campaigns cannot be cancelled.
  7. `CampaignFactory`: Now uses `Ownable2Step`. Ownership transfers require `acceptOwnership()`.
  8. Deployed contracts schema: Keyed by chain ID in `frontend/src/contracts/deployedContracts.json`:
     `{ [chainId]: { factoryAddress, implementationAddress, startBlock, factoryAbi, campaignAbi } }`.

---
### Agent B -> Agent C & Agent D (Cleanup & Tooling)
- **Status:** Complete & verified.
- **Actions Completed:**
  1. Purged 14 unused knowledge-base views, modals, drawers, and dead files (`api.ts`, `types/index.ts`, `Sidebar.tsx`, `Header.tsx`, `AskAiView.tsx`, etc.).
  2. Removed `recharts` from `frontend/package.json`.
  3. Bundled `Inter.woff2` locally in `frontend/src/app/fonts/Inter.woff2` and configured `next/font/local` (`adjustFontFallback: false`) for 100% offline-ready builds.
  4. Added `next.config.ts` security headers (`poweredByHeader: false`, CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and remote image patterns for IPFS gateways: `ipfs.io`, `gateway.pinata.cloud`, `cloudflare-ipfs.com`).
  5. Added `frontend/src/app/robots.ts` and `frontend/src/app/sitemap.ts`.
  6. Configured ESLint: resolved all unused imports/types/variables across components to achieve **0 errors, 0 warnings** on `npm run lint`.
  7. Added MIT `LICENSE` and rewritten root `README.md` with complete architecture, quickstart, invariants, and environment configuration.
  8. Created `frontend/.env.example` and CI workflow `.github/workflows/ci.yml` running dual jobs for contracts and frontend.
  9. Acceptance verified: `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass cleanly with 0 errors and 0 warnings.
