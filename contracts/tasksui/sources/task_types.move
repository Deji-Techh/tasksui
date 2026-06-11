module tasksui::task_types {
    // ============================================================
    // Task status constants
    // ============================================================
    const STATUS_PENDING_CHAIN: u8 = 0;
    const STATUS_FUNDED: u8 = 1;
    const STATUS_RUNNING: u8 = 2;
    const STATUS_SUBMITTED: u8 = 3;
    const STATUS_JUDGE_REVIEWED: u8 = 4;
    const STATUS_RELEASED: u8 = 5;
    const STATUS_DISPUTED: u8 = 6;
    const STATUS_CANCELLED: u8 = 7;

    // ============================================================
    // Agent category constants
    // ============================================================
    const CATEGORY_MOVE_AUDIT: u8 = 0;
    const CATEGORY_RESEARCH_SUMMARY: u8 = 1;
    const CATEGORY_WALLET_ANALYSIS: u8 = 2;

    // ============================================================
    // Judge verdict constants
    // ============================================================
    const JUDGE_VERDICT_PASS: u8 = 0;
    const JUDGE_VERDICT_NEEDS_REVISION: u8 = 1;
    const JUDGE_VERDICT_FAIL: u8 = 2;

    // ============================================================
    // Judge recommendation constants
    // ============================================================
    const RECOMMEND_APPROVE: u8 = 0;
    const RECOMMEND_DISPUTE: u8 = 1;

    // ============================================================
    // Error codes
    // ============================================================
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_STATUS_TRANSITION: u64 = 2;
    const E_TASK_NOT_FOUND: u64 = 3;
    const E_AGENT_ALREADY_REGISTERED: u64 = 4;
    const E_AGENT_NOT_FOUND: u64 = 5;
    const E_TASK_ALREADY_FUNDED: u64 = 6;
    const E_INSUFFICIENT_REWARD: u64 = 7;
    const E_ALREADY_SUBMITTED: u64 = 8;
    const E_NO_OUTPUT_TO_JUDGE: u64 = 9;
    const E_NOT_READY_FOR_RELEASE: u64 = 10;
    const E_CANNOT_CANCEL: u64 = 11;
    const E_WRONG_AGENT_CATEGORY: u64 = 12;

    // ============================================================
    // Event types (emitted for off-chain indexing)
    // ============================================================
    public struct AgentRegistered has copy, drop {
        agent_id: address,
        owner: address,
        name: String,
        category: u8,
    }

    public struct TaskCreated has copy, drop {
        task_id: address,
        creator: address,
        reward: u64,
    }

    public struct TaskFunded has copy, drop {
        task_id: address,
        escrow_amount: u64,
    }

    public struct CompletionSubmitted has copy, drop {
        task_id: address,
        agent_id: address,
    }

    public struct JudgeReviewed has copy, drop {
        task_id: address,
        verdict: u8,
        recommendation: u8,
    }

    public struct EscrowReleased has copy, drop {
        task_id: address,
        agent_id: address,
        amount: u64,
    }

    public struct TaskDisputed has copy, drop {
        task_id: address,
    }

    public struct TaskCancelled has copy, drop {
        task_id: address,
    }

    // ============================================================
    // Status helpers (pure functions usable in specs or off-chain)
    // ============================================================
    public fun is_terminal(status: u8): bool {
        status == STATUS_RELEASED || status == STATUS_DISPUTED || status == STATUS_CANCELLED
    }

    public fun is_active(status: u8): bool {
        !is_terminal(status)
    }

    public fun can_transition(from: u8, to: u8): bool {
        if (from == STATUS_PENDING_CHAIN) {
            to == STATUS_FUNDED || to == STATUS_CANCELLED
        } else if (from == STATUS_FUNDED) {
            to == STATUS_RUNNING || to == STATUS_CANCELLED
        } else if (from == STATUS_RUNNING) {
            to == STATUS_SUBMITTED || to == STATUS_CANCELLED
        } else if (from == STATUS_SUBMITTED) {
            to == STATUS_JUDGE_REVIEWED || to == STATUS_RELEASED || to == STATUS_DISPUTED
        } else if (from == STATUS_JUDGE_REVIEWED) {
            to == STATUS_RELEASED || to == STATUS_DISPUTED
        } else {
            false
        }
    }
}
