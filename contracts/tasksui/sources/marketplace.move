module tasksui::marketplace {
    use std::string::String;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};

    use tasksui::task_types::{
        Self,
        AgentRegistered,
        TaskCreated,
        TaskFunded,
        CompletionSubmitted,
        JudgeReviewed,
        EscrowReleased,
        TaskDisputed,
        TaskCancelled,
    };

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
    public entry fun register_agent(
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
            reputation_score: 100, // starts at 100, adjusts over time
            completed_tasks: 0,
            disputed_tasks: 0,
            total_earned: 0,
        };

        let agent_id = object::id_address(&agent.id);

        event::emit(AgentRegistered {
            agent_id,
            owner: tx_context::sender(ctx),
            name: agent.name,
            category,
        });

        transfer::share_object(agent);
    }

    // ============================================================
    // Update agent reputation (called internally on release/dispute)
    // ============================================================
    public(package) fun update_reputation(
        agent: &mut AgentProfile,
        success: bool,
    ) {
        if (success) {
            agent.completed_tasks = agent.completed_tasks + 1;
            // Reputation improves on success, capped at 100
            if (agent.reputation_score < 100) {
                agent.reputation_score = agent.reputation_score + 1;
            };
        } else {
            agent.disputed_tasks = agent.disputed_tasks + 1;
            // Reputation decreases on dispute, floored at 0
            if (agent.reputation_score > 0) {
                agent.reputation_score = agent.reputation_score - 5;
            };
        };
    }

    // ============================================================
    // Create task and fund escrow in a single transaction
    // ============================================================
    public entry fun create_task(
        _marketplace: &mut Marketplace,
        description_hash: vector<u8>,
        agent_category: u8,
        reward: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(reward > 0, task_types::e_insufficient_reward());
        assert!(
            coin::value(&payment) >= reward,
            task_types::e_insufficient_reward()
        );

        let balance = coin::into_balance(payment);
        let change = balance::split(&mut balance, balance::value(&balance) - reward);

        let task = Task {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            description_hash,
            agent_category,
            reward,
            status: task_types::status_funded(),
            agent_id: @0x0,
            balance,
            proof_hash: vector::empty(),
            judge_verdict: 0,
            judge_recommendation: 0,
            created_at: tx_context::epoch(ctx),
        };

        let task_id = object::id_address(&task.id);

        event::emit(TaskCreated {
            task_id,
            creator: tx_context::sender(ctx),
            reward,
        });

        event::emit(TaskFunded {
            task_id,
            escrow_amount: reward,
        });

        // Return any excess SUI to the creator
        if (balance::value(&change) > 0) {
            transfer::public_transfer(coin::from_balance(change, ctx), tx_context::sender(ctx));
        } else {
            balance::destroy_zero(change);
        };

        transfer::share_object(task);
    }

    // ============================================================
    // Submit completion proof (called by the assigned agent)
    // ============================================================
    public entry fun submit_completion(
        task: &mut Task,
        agent: &mut AgentProfile,
        proof_hash: vector<u8>,
        _ctx: &TxContext,
    ) {
        // Verify agent is assigned to this task
        assert!(
            object::id_address(&agent.id) == task.agent_id,
            task_types::e_not_authorized()
        );

        // Verify task is in RUNNING status
        assert!(
            task.status == task_types::status_running(),
            task_types::e_invalid_status_transition()
        );

        task.status = task_types::status_submitted();
        task.proof_hash = proof_hash;

        event::emit(CompletionSubmitted {
            task_id: object::id_address(&task.id),
            agent_id: object::id_address(&agent.id),
        });
    }

    // ============================================================
    // Submit judge report
    // ============================================================
    public entry fun submit_judge_report(
        task: &mut Task,
        verdict: u8,
        recommendation: u8,
        _ctx: &TxContext,
    ) {
        // Only the task creator can request judge review
        assert!(
            tx_context::sender(_ctx) == task.creator,
            task_types::e_not_authorized()
        );

        // Task must be in SUBMITTED status
        assert!(
            task.status == task_types::status_submitted(),
            task_types::e_invalid_status_transition()
        );

        task.status = task_types::status_judge_reviewed();
        task.judge_verdict = verdict;
        task.judge_recommendation = recommendation;

        event::emit(JudgeReviewed {
            task_id: object::id_address(&task.id),
            verdict,
            recommendation,
        });
    }

    // ============================================================
    // Assign agent to task (called by task creator)
    // ============================================================
    public entry fun assign_agent(
        task: &mut Task,
        agent: &AgentProfile,
        _ctx: &TxContext,
    ) {
        // Only the task creator can assign an agent
        assert!(
            tx_context::sender(_ctx) == task.creator,
            task_types::e_not_authorized()
        );

        // Task must be in FUNDED status
        assert!(
            task.status == task_types::status_funded(),
            task_types::e_invalid_status_transition()
        );

        // Agent category must match task category
        assert!(
            agent.category == task.agent_category,
            task_types::e_wrong_agent_category()
        );

        task.status = task_types::status_running();
        task.agent_id = object::id_address(&agent.id);
    }

    // ============================================================
    // Approve work and release escrow to agent
    // ============================================================
    public entry fun approve_and_release(
        task: &mut Task,
        agent: &mut AgentProfile,
        ctx: &mut TxContext,
    ) {
        // Only the task creator can release escrow
        assert!(
            tx_context::sender(ctx) == task.creator,
            task_types::e_not_authorized()
        );

        // Task must be SUBMITTED or JUDGE_REVIEWED
        assert!(
            task.status == task_types::status_submitted()
                || task.status == task_types::status_judge_reviewed(),
            task_types::e_not_ready_for_release()
        );

        let amount = balance::value(&task.balance);
        task.status = task_types::status_released();

        // Transfer escrowed SUI to the agent
        let coin = coin::from_balance(task.balance, ctx);
        transfer::public_transfer(coin, agent.owner);

        // Update agent stats
        agent.total_earned = agent.total_earned + amount;
        update_reputation(agent, true);

        event::emit(EscrowReleased {
            task_id: object::id_address(&task.id),
            agent_id: object::id_address(&agent.id),
            amount,
        });
    }

    // ============================================================
    // Cancel task and refund escrow to creator
    // ============================================================
    public entry fun cancel_task(
        task: &mut Task,
        ctx: &mut TxContext,
    ) {
        // Only the task creator can cancel
        assert!(
            tx_context::sender(ctx) == task.creator,
            task_types::e_not_authorized()
        );

        // Cannot cancel after release
        assert!(
            task.status != task_types::status_released(),
            task_types::e_cannot_cancel()
        );

        task.status = task_types::status_cancelled();

        // Refund escrowed SUI to creator
        let amount = balance::value(&task.balance);
        let coin = coin::from_balance(task.balance, ctx);
        transfer::public_transfer(coin, task.creator);

        event::emit(TaskCancelled {
            task_id: object::id_address(&task.id),
        });
    }

    // ============================================================
    // Mark task as disputed
    // ============================================================
    public entry fun mark_disputed(
        task: &mut Task,
        agent: &mut AgentProfile,
        _ctx: &TxContext,
    ) {
        // Only the task creator can dispute
        assert!(
            tx_context::sender(_ctx) == task.creator,
            task_types::e_not_authorized()
        );

        // Task must be SUBMITTED or JUDGE_REVIEWED
        assert!(
            task.status == task_types::status_submitted()
                || task.status == task_types::status_judge_reviewed(),
            task_types::e_invalid_status_transition()
        );

        task.status = task_types::status_disputed();

        // Refund escrow to creator on dispute
        let amount = balance::value(&task.balance);
        let coin = coin::from_balance(task.balance, ctx);
        transfer::public_transfer(coin, task.creator);

        update_reputation(agent, false);

        event::emit(TaskDisputed {
            task_id: object::id_address(&task.id),
        });
    }
}
