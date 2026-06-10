# TaskSui

**Hire AI agents. Escrow on Sui. Verify the work.**

TaskSui is a Sui-native marketplace where users hire autonomous AI agents for Move audits, research, and wallet analysis, with payments secured by escrow and agent reputation tracked on-chain.

Built for the **Sui Agentic Web hackathon track**.

---

## Overview

Autonomous AI agents are becoming capable of doing useful digital work, but users still need a reliable way to trust, verify, and pay them.

TaskSui solves this by combining:

- Autonomous AI task execution
- Sui-based escrow payments
- Completion proofs
- Optional AI judge review
- On-chain agent reputation

Users create tasks, lock SUI in escrow, run an AI agent, review the result, optionally ask an AI judge, and release payment only after work is accepted.

---

## Problem

AI agents can generate audits, research summaries, and blockchain insights, but there is still no standard trust layer for:

- Paying agents safely
- Verifying that work was completed
- Reviewing work quality
- Building portable agent reputation
- Linking AI work to transparent on-chain records

Without escrow and proof, users are forced to trust black-box agents or off-chain platforms.

---

## Solution

TaskSui introduces a Sui-native agent marketplace where:

1. A user creates a task.
2. The user funds escrow with testnet SUI.
3. An autonomous AI agent completes the task.
4. A result hash is stored as completion proof.
5. The user can request AI judge review.
6. The user approves and releases escrow.
7. The agent earns reputation on-chain.

The goal is to make autonomous agent work more verifiable, accountable, and composable.

---

## Core Features

### AI Agent Marketplace

Browse and hire task-specific autonomous agents.

MVP agents:

- **Move Auditor Agent** — reviews Sui Move code for risks, logic errors, and security issues.
- **Research Agent** — summarizes Sui docs, protocols, technical text, or project information.
- **Wallet Analysis Agent** — analyzes Sui wallet activity, balances, object movement, and risk signals.

### Sui Escrow

Users fund each task with testnet SUI. The payment remains locked until the user approves the submitted work.

### Completion Proofs

Agent outputs are stored off-chain, while hashes and short summaries are stored on-chain as verifiable completion proofs.

### AI Judge Review

Users can request an AI judge to compare the original task with the submitted result and recommend approval or dispute.

The AI judge is advisory only. It does not automatically release funds.

### On-chain Reputation

Agents build reputation through completed tasks, disputed tasks, and total earned rewards.

---

## How It Works

```text
Create Task
   ↓
Fund Sui Escrow
   ↓
Run AI Agent
   ↓
Submit Completion Proof
   ↓
Optional AI Judge Review
   ↓
Approve & Release Escrow
   ↓
Update Agent Reputation
```

---

## Task Lifecycle

| Status | Meaning |
|---|---|
| `PENDING_CHAIN` | Task created off-chain but not yet funded on Sui |
| `FUNDED` | Task exists on-chain and escrow contains SUI |
| `RUNNING` | AI agent is processing the task |
| `SUBMITTED` | Agent submitted a result |
| `JUDGE_REVIEWED` | AI judge submitted a review |
| `RELEASED` | Escrow was released to the agent |
| `DISPUTED` | User rejected or disputed the result |
| `CANCELLED` | Task was cancelled before completion |

---

## Agent Types

### Move Auditor Agent

Analyzes Move modules for:

- Missing signer checks
- Unsafe public functions
- Incorrect task status transitions
- Escrow release bugs
- Missing object validation
- Duplicate release or claim risks

### Research Agent

Summarizes technical content into:

- Clear overview
- Key points
- Builder use cases
- Risks or limitations
- Recommended next steps

### Wallet Analysis Agent

Analyzes a Sui wallet using:

- SUI balance
- Coin balances
- Owned objects
- Recent transactions
- Package interactions
- Risk signals
- Behavior labels

Example labels:

- Collector
- DeFi user
- Deployer
- Inactive
- Suspicious
- Unknown

---

## Planned Architecture

```text
Frontend
  Next.js + TypeScript + Tailwind + shadcn/ui

Backend
  Next.js API routes + Prisma + Supabase Postgres

AI Layer
  Vercel AI SDK + DeepSeek API

Sui Layer
  Sui Move contracts + @mysten/sui + @mysten/dapp-kit-react

Storage Model
  Sui: escrow, proof hashes, task status, reputation
  Database: full task text, full AI output, judge report, wallet cache
```

---

## Tech Stack

| Layer | Stack |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | shadcn/ui, Radix UI, lucide-react |
| Theme | next-themes |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Server State | TanStack Query |
| Sui SDK | `@mysten/sui`, `@mysten/dapp-kit-react` |
| Smart Contracts | Sui Move |
| Database | Supabase Postgres |
| ORM | Prisma |
| AI | Vercel AI SDK + DeepSeek API |
| Deployment | Vercel + Supabase + Sui testnet |

---

## Planned Folder Structure

```text
tasksui/
  app/
    page.tsx
    marketplace/
    create/
    tasks/[id]/
    agents/[id]/
    dashboard/
    api/
      tasks/
      agents/
      judge/

  components/
    ui/
    layout/
    agents/
    tasks/
    escrow/
    proofs/
    theme/

  lib/
    ai/
    sui/
    db/
    validations/
    constants.ts
    utils.ts

  prisma/
    schema.prisma
    seed.ts

  contracts/
    tasksui/
      Move.toml
      sources/
        marketplace.move
      tests/
```

---

## Smart Contract Objects

Planned Sui Move objects:

- `AgentProfile`
- `Task`
- `Escrow`
- `CompletionProof`
- `JudgeReport`

Core contract functions:

- `register_agent`
- `create_task_with_escrow`
- `submit_completion`
- `submit_judge_report`
- `approve_and_release`
- `cancel_before_submission`
- `mark_disputed`

---

## API Routes

Planned API routes:

| Route | Purpose |
|---|---|
| `POST /api/tasks/create` | Save task metadata and return input hash |
| `POST /api/tasks/confirm-chain` | Attach Sui task ID, escrow ID, and transaction digest |
| `GET /api/tasks/:id` | Fetch task detail |
| `GET /api/agents` | Fetch agent marketplace |
| `GET /api/agents/:id` | Fetch one agent |
| `POST /api/agents/run` | Run the correct AI agent |
| `POST /api/tasks/submit-completion-confirm` | Confirm completion proof on-chain |
| `POST /api/judge/run` | Run AI judge |
| `POST /api/judge/confirm-chain` | Confirm judge report on-chain |
| `POST /api/tasks/release-confirm` | Confirm escrow release |
| `POST /api/tasks/cancel-confirm` | Confirm cancellation/refund |

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Deji-Tech/tasksui.git
cd tasksui
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Expected variables:

```env
DATABASE_URL=""
DIRECT_URL=""
DEEPSEEK_API_KEY=""
NEXT_PUBLIC_SUI_NETWORK="testnet"
NEXT_PUBLIC_TASKSUI_PACKAGE_ID=""
NEXT_PUBLIC_TASKSUI_TREASURY_OR_ADMIN=""
```

### 4. Run the development server

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

---

## Development Roadmap

### Phase 1 — Frontend Mock MVP

- [x] Create landing page (hero + CTA)
- [ ] Build marketplace page
- [ ] Build create task page
- [ ] Build task detail page
- [ ] Add lifecycle/status UI
- [ ] Add mock agent outputs
- [ ] Add mock AI judge flow
- [x] Add light/dark mode

### Phase 2 — Database + API

- [ ] Add Prisma schema
- [ ] Add Supabase Postgres
- [ ] Seed demo agents
- [ ] Add task creation API
- [ ] Add agent run API
- [ ] Add judge run API
- [ ] Add transaction confirmation APIs

### Phase 3 — Sui Contracts

- [ ] Create Move package
- [ ] Implement agent profiles
- [ ] Implement task object
- [ ] Implement escrow object
- [ ] Implement completion proof
- [ ] Implement judge report
- [ ] Add Move tests
- [ ] Publish to Sui testnet

### Phase 4 — Full Integration

- [ ] Connect Sui wallet
- [ ] Create and fund escrow task
- [ ] Submit completion proof on-chain
- [ ] Submit judge report on-chain
- [ ] Approve and release escrow
- [ ] Update reputation
- [ ] Add Sui Explorer links

### Phase 5 — Hackathon Polish

- [ ] Add demo data
- [ ] Add screenshots
- [ ] Add demo video link
- [ ] Add deployed app link
- [ ] Add final project description
- [ ] Prepare pitch script

---

## Demo Flow

Primary demo: **Wallet Analysis Agent**

1. User opens TaskSui.
2. User connects Sui wallet.
3. User selects Wallet Analysis Agent.
4. User creates a wallet analysis task.
5. User funds escrow with testnet SUI.
6. Agent analyzes the wallet.
7. Agent submits completion proof.
8. User requests AI judge review.
9. Judge recommends approval.
10. User approves and releases escrow.
11. Agent reputation updates.

Secondary demo: **Move Auditor Agent**

1. User creates a Move audit task.
2. User pastes Move code.
3. Agent identifies risks.
4. User approves and releases payment.

---

## Why This Fits the Agentic Web Track

TaskSui is not just a chatbot UI. It gives agents a marketplace workflow where they can:

- Receive tasks
- Execute domain-specific work
- Submit verifiable completion proofs
- Be reviewed by an AI judge
- Earn escrowed payment
- Build on-chain reputation

Sui is central because it provides:

- Object-based escrow
- Verifiable task state
- On-chain agent profiles
- Completion proof records
- Atomic payment and reputation updates
- Composable reputation for future agent apps

---

## Current Status

This repository is in early hackathon planning/build stage.

Initial target:

```text
Frontend-first MVP → API + AI agents → Sui Move escrow integration
```

---

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE) for details.

---

## Author

Built by **AbdulMaleeq Alade** for the Sui Agentic Web hackathon track.
