module tasksui::marketplace {
    use std::string::String;
    use std::vector;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};

    // ============================================================
    // Events
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
    // Marketplace (singleton shared object)
    // ============================================================
    public struct Marketplace has key {
        id: UID,
        agent_count: u64,
        task_count: u64,
    }

    // ============================================================
    // AgentProfile (shared object, one per agent)
    // ============================================================
    public struct AgentProfile has key {
        id: UID,
        owner: address,
        name: String,
        category: u8,
        reputation_score: u64,
        completed_tasks: u64,
        disputed_tasks: u64,
        total_earned: u64,
    }

    // ============================================================
    // Task (shared object, holds escrowed SUI)
    // ============================================================
    public struct Task has key {
        id: UID,
        creator: address,
        description_hash: vector<u8>,
        agent_category: u8,
        reward: u64,
        status: u8,
        agent_id: address,
        balance: Balance<SUI>,
        proof_hash: vector<u8>,
        judge_verdict: u8,
        judge_recommendation: u8,
        created_at: u64,
    }

    // ============================================================
    // Initialization
    // ============================================================
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            agent_count: 0,
            task_count: 0,
        };
        transfer::share_object(marketplace);
    }

    // ============================================================
    // Agent registration
    // ============================================================
    public fun register_agent(
        _marketplace: &mut Marketplace,
        name: String,
        category: u8,
        ctx: &mut TxContext,
    ) {
        let agent = AgentProfile {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            name,
            category,
            reputation_score: 100,
            completed_tasks: 0,
            disputed_tasks: 0,
            total_earned: 0,
        };

        let agent_id = object::id(&agent).to_address();

        event::emit(AgentRegistered {
            agent_id,
            owner: tx_context::sender(ctx),
            name: agent.name,
            category,
        });

        transfer::share_object(agent);
    }

    // ============================================================
    // Update agent reputation (internal helper)
    // ============================================================
    fun update_reputation(agent: &mut AgentProfile, success: bool) {
        if (success) {
            agent.completed_tasks = agent.completed_tasks + 1;
            if (agent.reputation_score < 100) {
                agent.reputation_score = agent.reputation_score + 1;
            };
        } else {
            agent.disputed_tasks = agent.disputed_tasks + 1;
            if (agent.reputation_score > 0) {
                agent.reputation_score = agent.reputation_score - 5;
            };
        };
    }

    // ============================================================
    // Create task and fund escrow in a single transaction
    // ============================================================
    public fun create_task(
        _marketplace: &mut Marketplace,
        description_hash: vector<u8>,
        agent_category: u8,
        reward: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(reward > 0, tasksui::task_types::e_insufficient_reward());
        assert!(
            coin::value(&payment) >= reward,
            tasksui::task_types::e_insufficient_reward()
        );

        let mut balance = coin::into_balance(payment);
        let excess = balance::value(&balance) - reward;
        let change = balance::split(&mut balance, excess);

        let task = Task {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            description_hash,
            agent_category,
            reward,
            status: tasksui::task_types::status_funded(),
            agent_id: @0x0,
            balance,
            proof_hash: vector[],
            judge_verdict: 0,
            judge_recommendation: 0,
            created_at: tx_context::epoch(ctx),
        };

        let task_id = object::id(&task).to_address();

        event::emit(TaskCreated {
            task_id,
            creator: tx_context::sender(ctx),
            reward,
        });

        event::emit(TaskFunded {
            task_id,
            escrow_amount: reward,
        });

        if (balance::value(&change) > 0) {
            transfer::public_transfer(coin::from_balance(change, ctx), tx_context::sender(ctx));
        } else {
            balance::destroy_zero(change);
        };

        transfer::share_object(task);
    }

    // ============================================================
    // Assign agent to task
    // ============================================================
    public fun assign_agent(
        task: &mut Task,
        agent: &AgentProfile,
        ctx: &TxContext,
    ) {
        assert!(
            tx_context::sender(ctx) == task.creator,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            task.status == tasksui::task_types::status_funded(),
            tasksui::task_types::e_invalid_status_transition()
        );
        assert!(
            agent.category == task.agent_category,
            tasksui::task_types::e_wrong_agent_category()
        );

        task.status = tasksui::task_types::status_running();
        task.agent_id = object::id(agent).to_address();
    }

    // ============================================================
    // Submit completion proof
    // ============================================================
    public fun submit_completion(
        task: &mut Task,
        agent: &AgentProfile,
        proof_hash: vector<u8>,
    ) {
        assert!(
            object::id(agent).to_address() == task.agent_id,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            vector::length(&proof_hash) > 0,
            tasksui::task_types::e_invalid_proof()
        );
        assert!(
            task.status == tasksui::task_types::status_running(),
            tasksui::task_types::e_invalid_status_transition()
        );

        task.status = tasksui::task_types::status_submitted();
        task.proof_hash = proof_hash;

        event::emit(CompletionSubmitted {
            task_id: object::id(task).to_address(),
            agent_id: object::id(agent).to_address(),
        });
    }

    // ============================================================
    // Submit judge report
    // ============================================================
    public fun submit_judge_report(
        task: &mut Task,
        verdict: u8,
        recommendation: u8,
        ctx: &TxContext,
    ) {
        assert!(
            tx_context::sender(ctx) == task.creator,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            task.status == tasksui::task_types::status_submitted(),
            tasksui::task_types::e_invalid_status_transition()
        );

        task.status = tasksui::task_types::status_judge_reviewed();
        task.judge_verdict = verdict;
        task.judge_recommendation = recommendation;

        event::emit(JudgeReviewed {
            task_id: object::id(task).to_address(),
            verdict,
            recommendation,
        });
    }

    // ============================================================
    // Approve work and release escrow to agent
    // ============================================================
    public fun approve_and_release(
        task: &mut Task,
        agent: &mut AgentProfile,
        ctx: &mut TxContext,
    ) {
        assert!(
            tx_context::sender(ctx) == task.creator,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            object::id(agent).to_address() == task.agent_id,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            task.status == tasksui::task_types::status_submitted()
                || task.status == tasksui::task_types::status_judge_reviewed(),
            tasksui::task_types::e_not_ready_for_release()
        );

        let amount = balance::value(&task.balance);
        task.status = tasksui::task_types::status_released();

        let coin = coin::from_balance(balance::withdraw_all(&mut task.balance), ctx);
        transfer::public_transfer(coin, agent.owner);

        agent.total_earned = agent.total_earned + amount;
        update_reputation(agent, true);

        event::emit(EscrowReleased {
            task_id: object::id(task).to_address(),
            agent_id: object::id(agent).to_address(),
            amount,
        });
    }

    // ============================================================
    // Cancel task and refund escrow to creator
    // ============================================================
    public fun cancel_task(task: &mut Task, ctx: &mut TxContext) {
        assert!(
            tx_context::sender(ctx) == task.creator,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            task.status == tasksui::task_types::status_funded(),
            tasksui::task_types::e_cannot_cancel()
        );

        task.status = tasksui::task_types::status_cancelled();

        let coin = coin::from_balance(balance::withdraw_all(&mut task.balance), ctx);
        transfer::public_transfer(coin, task.creator);

        event::emit(TaskCancelled {
            task_id: object::id(task).to_address(),
        });
    }

    // ============================================================
    // Mark task as disputed
    // ============================================================
    public fun mark_disputed(
        task: &mut Task,
        agent: &mut AgentProfile,
        ctx: &mut TxContext,
    ) {
        assert!(
            tx_context::sender(ctx) == task.creator,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            object::id(agent).to_address() == task.agent_id,
            tasksui::task_types::e_not_authorized()
        );
        assert!(
            task.status == tasksui::task_types::status_submitted()
                || task.status == tasksui::task_types::status_judge_reviewed(),
            tasksui::task_types::e_invalid_status_transition()
        );

        task.status = tasksui::task_types::status_disputed();

        let coin = coin::from_balance(balance::withdraw_all(&mut task.balance), ctx);
        transfer::public_transfer(coin, task.creator);

        update_reputation(agent, false);

        event::emit(TaskDisputed {
            task_id: object::id(task).to_address(),
        });
    }
}
