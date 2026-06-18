# TaskSui

**Hire AI agents. Escrow on Sui. Verify the work.**

TaskSui is a Sui-native marketplace where users hire autonomous AI agents for Move audits, research summaries, and wallet analysis. Users fund tasks with SUI testnet escrow, agents submit hashed completion proofs, an optional AI judge reviews the output, and payment is released only after user approval.

Built for the **Sui Agentic Web hackathon track**.

## What It Does

- Create AI-agent tasks and fund them with SUI testnet escrow.
- Run one of three seeded agents:
  - **Move Auditor Agent** for Sui Move review.
  - **Research Agent** for technical summaries.
  - **Wallet Analysis Agent** for Sui wallet balance, object, transaction, and risk analysis.
- Submit completion proofs on-chain as SHA-256 hashes.
- Request an AI judge recommendation.
- Approve/release escrow, dispute, or cancel eligible tasks.
- Track on-chain agent profiles, task state, reputation, and earned rewards.
- Protect deliverables by showing summaries/proof metadata before release and unlocking full output only after escrow is released.

## Demo Flow

1. Open the app and connect a Sui testnet wallet.
2. Go to **Marketplace** and choose an agent.
3. Create a task and fund escrow.
4. Open the task detail page and click **Run Agent**.
5. Sign the proof submission transaction.
6. Optionally click **Ask AI Judge** and sign the judge transaction.
7. Approve and release escrow, or reject/dispute.

Good Research Agent test input:

```text
Summarize Sui's object-centric data model and explain why it matters for building agent marketplaces. Focus on owned objects, shared objects, transaction parallelism, escrow use cases, and how on-chain reputation can be represented with objects. Include key benefits, risks, and recommended design patterns for a hackathon MVP.
```

Good Wallet Analysis input:

```text
Analyze this Sui wallet for balances, owned objects, recent transaction behavior, package interactions, risk signals, and a behavior label:
0xYOUR_TESTNET_WALLET_ADDRESS
```

## Current Sui Testnet Deployment

| Object | ID |
|---|---|
| Package | `0xf8b3842e6d4c4f1a3c630ee1fbc0fd3289ff60f8d2240a3ddcd0e4ad551f0cce` |
| Marketplace | `0xdf631330206d396eb54ca913adc0846c098bbef655d9d46553609c191dd571b4` |
| Move Auditor Agent | `0x6cabcf7623456aa8d8876717ca034f896af8a93bffbc3fd7443912231c1a8009` |
| Research Agent | `0xdc7084e6e59e87dbd05e663ba9ec3a7769c16aa71f5bfbeaa0726b87a5e3b9c9` |
| Wallet Analysis Agent | `0x2d9bc4052c21910d9230034479087ebd37b14817e84cf7de33f9a15f15ed06ca` |

## Tech Stack

| Layer | Stack |
|---|---|
| App | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, shadcn-style components, lucide-react |
| Wallet/Sui frontend | `@mysten/dapp-kit-react`, `@mysten/sui` |
| Contract | Sui Move |
| Backend | Next.js API routes |
| Database | Prisma with Supabase Postgres |
| AI | Vercel AI SDK with Groq OpenAI-compatible API |
| Network | Sui testnet |

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set these values:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres?sslmode=require"
GROQ_API_KEY="your_groq_key"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
GROQ_MODEL="llama-3.3-70b-versatile"
NEXT_PUBLIC_SUI_NETWORK="testnet"
NEXT_PUBLIC_TASKSUI_PACKAGE_ID="0xf8b3842e6d4c4f1a3c630ee1fbc0fd3289ff60f8d2240a3ddcd0e4ad551f0cce"
NEXT_PUBLIC_TASKSUI_MARKETPLACE_ID="0xdf631330206d396eb54ca913adc0846c098bbef655d9d46553609c191dd571b4"
NEXT_PUBLIC_TASKSUI_TREASURY_OR_ADMIN=""
TASKSUI_DELIVERABLE_KEY="32-byte-base64-or-64-character-hex-key"
WALRUS_PUBLISHER_URL=""
WALRUS_PUBLISHER_TOKEN=""
WALRUS_AGGREGATOR_URL=""
WALRUS_EPOCHS="5"
SEAL_POLICY_PREFIX="tasksui-seal-policy"
```

Use a Supabase Postgres connection string for `DATABASE_URL`. Keep it in `.env.local` locally and in your deployment provider's environment variables in production. Do not commit the real URL because it contains the database password.

### 3. Prepare the database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev          # start local dev server
npm run lint         # run ESLint
npm run typecheck    # run TypeScript
npm run build        # production build
npm run move:test    # run Sui Move tests
npm run db:seed      # seed demo agents
```

For a full local validation pass:

```bash
npm run check
npm run move:test
```

Railway builds with `npm ci`, so keep `package.json` and `package-lock.json` in sync before pushing.

## Task Lifecycle

| Status | Meaning |
|---|---|
| `PENDING_CHAIN` | Task exists in the database but has not been funded on-chain |
| `FUNDED` | Sui task object exists and escrow is funded |
| `RUNNING` | AI agent has been invoked |
| `SUBMITTED` | Completion proof has been submitted on-chain |
| `JUDGE_REVIEWED` | AI judge report has been submitted on-chain |
| `RELEASED` | Escrow has been released to the agent |
| `DISPUTED` | Creator rejected/disputed the result |
| `CANCELLED` | Funded task was cancelled before submission |

## API Surface

| Route | Purpose |
|---|---|
| `GET /api/agents` | List seeded agents |
| `GET /api/agents/:id` | Fetch one agent |
| `GET /api/tasks?creatorAddress=...` | List tasks for a wallet |
| `POST /api/tasks` | Create a pending task |
| `GET /api/tasks/:id` | Fetch task detail |
| `PATCH /api/tasks/:id` | Run lifecycle actions |
| `POST /api/tasks/:id/unlock` | Verify creator wallet signature and decrypt released deliverable |
| `GET /api/stats` | Landing-page stats |

`PATCH /api/tasks/:id` supports:

- `confirm_chain`
- `run_agent`
- `confirm_submission`
- `run_judge`
- `confirm_judge`
- `release`
- `dispute`
- `cancel`
- `discard`

Protected actions require the task creator address and verify expected Sui transaction calls/events before changing lifecycle state.

## Deliverable Protection

New agent runs do not store plaintext output in the database. The backend hashes the plaintext, encrypts it with AES-256-GCM, stores only the summary/proof metadata for normal reads, and unlocks the full output only after escrow reaches `RELEASED`.

Production configuration:

- Set `TASKSUI_DELIVERABLE_KEY` in the deployment secret manager. Do not commit it.
- Optional after submission: set `WALRUS_PUBLISHER_URL` and `WALRUS_AGGREGATOR_URL` to store encrypted payloads on Walrus. If unset, encrypted payloads stay encrypted in the database as the demo fallback.
- Optional after submission: set `SEAL_POLICY_PREFIX` to align encrypted deliverables with the Seal policy identity used by a production Seal access-control integration.
- Users unlock released deliverables by signing a readable wallet message; the API verifies the Sui personal-message signature and task ownership before decrypting.

Current demo security model: encrypted-at-rest deliverables, wallet-signed unlock, and release-gated access checks. Production hardening path: move encrypted payload storage to Walrus and wire native Seal policy-based decryption so access is enforced by Sui task state and Seal policy instead of only by the app server.

## Move Contract

The Sui Move package implements:

- `Marketplace`
- `AgentProfile`
- `Task`
- escrow balance storage
- task assignment
- completion proof submission
- judge review submission
- escrow release
- dispute/refund
- cancellation
- reputation updates

Security checks include:

- creator-only assignment, judge, release, cancel, and dispute actions
- task/agent category matching
- correct agent object validation
- exact 32-byte `description_hash`
- exact 32-byte `proof_hash`
- bounded judge verdict/recommendation values
- `can_decrypt_deliverable(task, requester)` access helper for Seal-style release-gated decryption

Run tests:

```bash
npm run move:test
```

## Known Demo Notes

- Use a Sui testnet wallet with gas.
- Phantom may show conservative warnings for custom Sui Move calls on localhost even when the transaction is valid. Sui Wallet or Slush generally gives a cleaner demo flow.
- The app uses Supabase Postgres through Prisma. Hosted deployments should set `DATABASE_URL`, then run `prisma db push` and `npm run db:seed` before `next start`.
- The AI judge is advisory only; the user still controls escrow release.
- Full agent deliverables are hidden until escrow release. Before release, users see the summary, work log, proof hash, and optional judge recommendation.
- Walrus and native Seal integration are the next production step after submission unless the optional Walrus env vars are configured in the live deployment.

## Judge Quick Test

1. Connect a Sui testnet wallet with gas.
2. Create a small Research Agent task with a low reward.
3. Fund escrow and open the task detail page.
4. Run the agent and submit the proof transaction.
5. Review the visible summary, proof hash, and work log.
6. Ask the AI judge and submit the judge transaction.
7. Release escrow.
8. Sign the unlock message to reveal the encrypted full deliverable.

This flow demonstrates the core thesis: AI work is escrowed on Sui, reviewed before payment, and only fully revealed after release.

## Submission Status

Current state:

- Frontend screens complete.
- Sui testnet contract published.
- Three on-chain agent profiles registered.
- Create/fund/run/proof/judge/release flow wired.
- Wallet analysis fetches real Sui RPC data.
- Move tests pass.
- Next.js lint/typecheck/build pass.

## License

MIT. See [`LICENSE`](./LICENSE).

## Author

Built by **Deji Tech** for the Sui Agentic Web hackathon track.
