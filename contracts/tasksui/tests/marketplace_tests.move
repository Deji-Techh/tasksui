#[test_only]
module tasksui::marketplace_tests {
    use tasksui::task_types;
    use tasksui::marketplace::{Self, Marketplace, AgentProfile, Task};
    use sui::test_scenario::{Self, Scenario, next_tx, ctx};
    use sui::coin;
    use sui::sui::SUI;

    fun mint_sui(amount: u64, scenario: &mut Scenario): coin::Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ctx(scenario))
    }

    #[test]
    fun test_init() {
        let mut scenario = test_scenario::begin(@0xA);
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_register_agent() {
        let sender = @0xB;
        let mut scenario = test_scenario::begin(sender);

        // Tx 0: init marketplace
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        next_tx(&mut scenario, sender);

        // Tx 1: register agent
        {
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                b"Reviews Sui Move code for vulnerabilities".to_string(),
                task_types::status_funded(),
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, sender);

        // Tx 2: verify agent
        {
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);
            assert!(*marketplace::agent_name(&agent) == b"Move Auditor".to_string(), 0);
            assert!(marketplace::agent_category(&agent) == 1, 0);
            assert!(marketplace::agent_reputation_score(&agent) == 100, 0);
            assert!(marketplace::agent_completed_tasks(&agent) == 0, 0);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_task_and_assign_agent() {
        let creator = @0xC;
        let reward = 5_000_000_000;

        let mut scenario = test_scenario::begin(creator);

        // Tx 0: init marketplace
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        next_tx(&mut scenario, creator);

        // Tx 1: register agent
        {
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                b"Reviews Sui Move code for vulnerabilities".to_string(),
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 2: create task with escrow
        {
            let payment = mint_sui(reward, &mut scenario);
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash-001".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                1,
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 3: verify task
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            assert!(marketplace::get_status(&task) == task_types::status_funded(), 0);
            assert!(marketplace::get_reward(&task) == reward, 0);
            assert!(marketplace::get_creator(&task) == creator, 0);
            test_scenario::return_shared(task);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_full_lifecycle() {
        let creator = @0xC;
        let agent_addr = @0xB;
        let reward = 5_000_000_000;

        // Start as agent_addr
        let mut scenario = test_scenario::begin(agent_addr);

        // Tx 0: init marketplace
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        next_tx(&mut scenario, agent_addr);

        // Tx 1: register agent
        {
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                b"Reviews Sui Move code for vulnerabilities".to_string(),
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 2: creator creates and funds task
        {
            let payment = mint_sui(reward, &mut scenario);
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash-001".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                1,
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 3: creator assigns agent
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);

            marketplace::assign_agent(&mut task, &agent, ctx(&mut scenario));
            assert!(marketplace::get_status(&task) == task_types::status_running(), 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        next_tx(&mut scenario, agent_addr);

        // Tx 4: agent submits completion
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let proof = b"proof-hash-abc123".to_string().into_bytes();

            marketplace::submit_completion(&mut task, &agent, proof);
            assert!(marketplace::get_status(&task) == task_types::status_submitted(), 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        next_tx(&mut scenario, creator);

        // Tx 5: creator approves and releases escrow
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);

            marketplace::approve_and_release(&mut task, &mut agent, ctx(&mut scenario));
            assert!(marketplace::get_status(&task) == task_types::status_released(), 0);
            assert!(marketplace::agent_completed_tasks(&agent) == 1, 0);
            assert!(marketplace::agent_total_earned(&agent) == reward, 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cancel_task() {
        let creator = @0xC;
        let reward = 5_000_000_000;

        let mut scenario = test_scenario::begin(creator);

        // Tx 0: init marketplace
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        next_tx(&mut scenario, creator);

        // Tx 1: create task
        {
            let payment = mint_sui(reward, &mut scenario);
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                1,
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 2: cancel task
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            assert!(marketplace::get_status(&task) == task_types::status_funded(), 0);

            marketplace::cancel_task(&mut task, ctx(&mut scenario));
            assert!(marketplace::get_status(&task) == task_types::status_cancelled(), 0);

            test_scenario::return_shared(task);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_dispute_task() {
        let creator = @0xC;
        let agent_addr = @0xB;
        let reward = 5_000_000_000;

        let mut scenario = test_scenario::begin(agent_addr);

        // Tx 0: init marketplace
        {
            marketplace::init_for_testing(ctx(&mut scenario));
        };
        next_tx(&mut scenario, agent_addr);

        // Tx 1: register agent
        {
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            marketplace::register_agent(
                &mut marketplace,
                b"Move Auditor".to_string(),
                b"Reviews Sui Move code for vulnerabilities".to_string(),
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 2: create task
        {
            let payment = mint_sui(reward, &mut scenario);
            let mut marketplace = test_scenario::take_shared<Marketplace>(&scenario);
            let desc_hash = b"task-hash".to_string().into_bytes();

            marketplace::create_task(
                &mut marketplace,
                desc_hash,
                1,
                reward,
                payment,
                ctx(&mut scenario),
            );
            test_scenario::return_shared(marketplace);
        };
        next_tx(&mut scenario, creator);

        // Tx 3: assign agent
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);
            marketplace::assign_agent(&mut task, &agent, ctx(&mut scenario));
            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        next_tx(&mut scenario, agent_addr);

        // Tx 4: submit completion
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let proof = b"bad-proof".to_string().into_bytes();
            marketplace::submit_completion(&mut task, &agent, proof);
            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        next_tx(&mut scenario, creator);

        // Tx 5: creator disputes
        {
            let mut task = test_scenario::take_shared<Task>(&scenario);
            let mut agent = test_scenario::take_shared<AgentProfile>(&scenario);
            let initial_score = marketplace::agent_reputation_score(&agent);

            marketplace::mark_disputed(&mut task, &mut agent, ctx(&mut scenario));
            assert!(marketplace::get_status(&task) == task_types::status_disputed(), 0);
            assert!(marketplace::agent_disputed_tasks(&agent) == 1, 0);
            assert!(marketplace::agent_reputation_score(&agent) < initial_score, 0);

            test_scenario::return_shared(task);
            test_scenario::return_shared(agent);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_status_transitions() {
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
