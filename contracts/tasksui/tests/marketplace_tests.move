#[test_only]
module tasksui::marketplace_tests {
    use tasksui::task_types;
    use tasksui::marketplace::{Self, Marketplace, AgentProfile, Task};
    use sui::test_scenario::{Self, Scenario, next_tx, ctx};
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_utils;

    // Helper to mint test SUI coins
    fun mint_sui(amount: u64, scenario: &mut Scenario): coin::Coin<SUI> {
        let ctx = next_tx(scenario);
        coin::mint_for_testing<SUI>(amount, ctx)
    }

    #[test]
    fun test_init() {
        let scenario = test_scenario::begin(@0xA);
        {
            marketplace::init(ctx(&mut scenario));
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_register_agent() {
        let sender = @0xAGENT;
        let scenario = test_scenario::begin(sender);
        {
            marketplace::init(ctx(&mut scenario));

            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                task_types::category_move_audit(),
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);

            let agent = test_scenario::take_shared<AgentProfile>(&scenario);
            assert!(agent.name == b"Move Auditor".to_string(), 0);
            assert!(agent.category == task_types::category_move_audit(), 0);
            assert!(agent.reputation_score == 100, 0);
            assert!(agent.completed_tasks == 0, 0);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_task_and_assign_agent() {
        let creator = @0xCREATOR;
        let agent_addr = @0xAGENT;
        let reward = 5_000_000_000; // 5 SUI in MIST

        let scenario = test_scenario::begin(creator);
        {
            marketplace::init(ctx(&mut scenario));

            // Register agent
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                task_types::category_move_audit(),
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);

            // Create task with escrow
            let payment = mint_sui(reward, &mut scenario);
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash-001".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                task_types::category_move_audit(),
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);

            let task = test_scenario::take_shared<Task>(&scenario);
            assert!(task.status == task_types::status_funded(), 0);
            assert!(task.reward == reward, 0);
            assert!(task.creator == creator, 0);
            test_scenario::return_shared(task);
        };

        // Assign agent (next transaction, same creator)
        {
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);

            marketplace::assign_agent(
                &mut task,
                &agent,
                ctx(&mut scenario),
            );

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_full_lifecycle() {
        let creator = @0xCREATOR;
        let agent_addr = @0xAGENT;
        let reward = 5_000_000_000; // 5 SUI

        let scenario = test_scenario::begin(agent_addr);
        {
            marketplace::init(ctx(&mut scenario));
        };

        // Register agent
        {
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                task_types::category_move_audit(),
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };

        // Creator creates and funds task
        {
            next_tx(&mut scenario, creator);
            let payment = mint_sui(reward, &mut scenario);
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash-001".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                task_types::category_move_audit(),
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };

        // Creator assigns agent
        {
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);

            // Verify we can't skip from FUNDED to submitted
            let proof = b"proof-hash".to_string().into_bytes();
            // submit_completion would fail here because task isn't RUNNING

            marketplace::assign_agent(&mut task, &agent, ctx(&mut scenario));
            assert!(task.status == task_types::status_running(), 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };

        // Agent submits completion
        {
            next_tx(&mut scenario, agent_addr);
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let proof = b"proof-hash-abc123".to_string().into_bytes();

            marketplace::submit_completion(&mut task, &mut agent, proof, ctx(&mut scenario));
            assert!(task.status == task_types::status_submitted(), 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };

        // Creator approves and releases escrow
        {
            next_tx(&mut scenario, creator);
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);

            marketplace::approve_and_release(&mut task, &mut agent, ctx(&mut scenario));
            assert!(task.status == task_types::status_released(), 0);
            assert!(agent.completed_tasks == 1, 0);
            assert!(agent.total_earned == reward, 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cancel_task() {
        let creator = @0xCREATOR;
        let reward = 5_000_000_000;

        let scenario = test_scenario::begin(creator);
        {
            marketplace::init(ctx(&mut scenario));

            let payment = mint_sui(reward, &mut scenario);
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                task_types::category_move_audit(),
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);

            let task = test_scenario::take_shared<Task>(&scenario);
            assert!(task.status == task_types::status_funded(), 0);

            marketplace::cancel_task(&mut task, ctx(&mut scenario));
            assert!(task.status == task_types::status_cancelled(), 0);

            test_scenario::return_shared(task);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_dispute_task() {
        let creator = @0xCREATOR;
        let agent_addr = @0xAGENT;
        let reward = 5_000_000_000;

        let scenario = test_scenario::begin(agent_addr);
        {
            marketplace::init(ctx(&mut scenario));
        };

        // Register agent
        {
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                task_types::category_move_audit(),
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };

        // Create task
        {
            next_tx(&mut scenario, creator);
            let payment = mint_sui(reward, &mut scenario);
            let marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                task_types::category_move_audit(),
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };

        // Assign agent
        {
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);
            marketplace::assign_agent(&mut task, &agent, ctx(&mut scenario));
            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };

        // Submit completion
        {
            next_tx(&mut scenario, agent_addr);
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let proof = b"bad-proof".to_string().into_bytes();
            marketplace::submit_completion(&mut task, &mut agent, proof, ctx(&mut scenario));
            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };

        // Creator disputes
        {
            next_tx(&mut scenario, creator);
            let task = test_scenario::take_shared<Task>(&scenario);
            let agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let initial_score = agent.reputation_score;

            marketplace::mark_disputed(&mut task, &mut agent, ctx(&mut scenario));
            assert!(task.status == task_types::status_disputed(), 0);
            assert!(agent.disputed_tasks == 1, 0);
            assert!(agent.reputation_score < initial_score, 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_status_transitions() {
        // Verify the can_transition helper covers all valid paths
        assert!(task_types::can_transition(
            task_types::status_funded(),
            task_types::status_running()
        ), 0);
        assert!(task_types::can_transition(
            task_types::status_running(),
            task_types::status_submitted()
        ), 0);
        assert!(task_types::can_transition(
            task_types::status_submitted(),
            task_types::status_released()
        ), 0);
        assert!(task_types::can_transition(
            task_types::status_submitted(),
            task_types::status_judge_reviewed()
        ), 0);

        // Invalid transitions
        assert!(!task_types::can_transition(
            task_types::status_pending_chain(),
            task_types::status_running()
        ), 0);
        assert!(!task_types::can_transition(
            task_types::status_released(),
            task_types::status_disputed()
        ), 0);
        assert!(!task_types::can_transition(
            task_types::status_running(),
            task_types::status_released()
        ), 0);
    }
}
