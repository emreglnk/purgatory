#[test_only]
module purgatory::core_tests {
    use purgatory::core::{Self, GlobalPurgatory, AdminCap};
    use sui::test_scenario::{Self as ts};
    use sui::clock::{Self};
    use sui::coin::{Self};
    use sui::sui::SUI;

    const ADMIN: address = @0xAD;
    const USER1: address = @0xCAFE;
    const USER2: address = @0xBABE;

    const RETENTION_PERIOD: u64 = 7_776_000_000;
    const SERVICE_FEE: u64 = 10_000_000;

    public struct JunkItem has key, store { id: UID }

    #[test]
    #[allow(unused_assignment)]
    fun test_full_lifecycle() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        let mut junk_id_opt: Option<ID> = option::none();

        // Initialize as ADMIN so they become the admin
        {
            core::init_for_testing(ts::ctx(scenario));
        };

        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);

            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            junk_id_opt = option::some(object::id(&junk));

            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE, ts::ctx(scenario));

            core::throw_away(&mut purgatory, junk, payment, 0, &clock, ts::ctx(scenario)); // reason: 0 (JUNK)

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        let junk_id = *option::borrow(&junk_id_opt);

        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let clock = clock::create_for_testing(ts::ctx(scenario));
            core::restore<JunkItem>(&mut purgatory, junk_id, &clock, ts::ctx(scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(purgatory);
        };

        ts::next_tx(scenario, USER1);
        {
            let junk = ts::take_from_sender<JunkItem>(scenario);
            assert!(object::id(&junk) == junk_id, 0);
            ts::return_to_sender(scenario, junk);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[allow(unused_assignment)]
    fun test_purge_flow() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        let mut junk_id_opt: Option<ID> = option::none();

        {
            core::init_for_testing(ts::ctx(scenario));
        };

        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);

            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            junk_id_opt = option::some(object::id(&junk));
            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE, ts::ctx(scenario));

            core::throw_away(&mut purgatory, junk, payment, 0, &clock, ts::ctx(scenario)); // reason: 0 (JUNK)

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        let junk_id = *option::borrow(&junk_id_opt);

        // Purge after time (Success)
        ts::next_tx(scenario, USER2);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000 + RETENTION_PERIOD + 1);

            core::purge<JunkItem>(&mut purgatory, junk_id, &clock);

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = core::E_RETENTION_NOT_OVER)]
    #[allow(unused_assignment)]
    fun test_purge_too_early() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        let mut junk_id_opt: Option<ID> = option::none();

        { core::init_for_testing(ts::ctx(scenario)); };

        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);
            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            junk_id_opt = option::some(object::id(&junk));
            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE, ts::ctx(scenario));
            core::throw_away(&mut purgatory, junk, payment, 0, &clock, ts::ctx(scenario)); // reason: 0 (JUNK)
            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        let junk_id = *option::borrow(&junk_id_opt);

        ts::next_tx(scenario, USER2);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000 + RETENTION_PERIOD - 1); 
            
            core::purge<JunkItem>(&mut purgatory, junk_id, &clock);

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };
        ts::end(scenario_val);
    }

    #[test]
    fun test_admin_update_fee() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;

        { core::init_for_testing(ts::ctx(scenario)); };

        // Admin updates the fee with AdminCap
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            
            // Check initial fee
            assert!(core::get_current_fee(&purgatory) == SERVICE_FEE, 0);
            
            // Update to new fee
            core::update_fee(&admin_cap, &mut purgatory, 5_000_000);
            
            // Verify update
            assert!(core::get_current_fee(&purgatory) == 5_000_000, 1);
            
            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(purgatory);
        };

        ts::end(scenario_val);
    }

    #[test]
    fun test_admin_update_furnace() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;

        { core::init_for_testing(ts::ctx(scenario)); };

        // Admin updates furnace address with AdminCap
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            
            // Check initial furnace (should be ADMIN)
            assert!(core::get_furnace_address(&purgatory) == ADMIN, 0);
            
            // Update to new furnace
            core::update_furnace(&admin_cap, &mut purgatory, USER1);
            
            // Verify update
            assert!(core::get_furnace_address(&purgatory) == USER1, 1);
            
            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(purgatory);
        };

        ts::end(scenario_val);
    }

    #[test]
    fun test_furnace_receives_fees() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;

        { core::init_for_testing(ts::ctx(scenario)); };

        // User throws away item, furnace should receive fee
        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);

            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE, ts::ctx(scenario));

            core::throw_away(&mut purgatory, junk, payment, 0, &clock, ts::ctx(scenario));

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        // Furnace (ADMIN) should have received the fee
        ts::next_tx(scenario, ADMIN);
        {
            let coin = ts::take_from_sender<coin::Coin<SUI>>(scenario);
            assert!(coin::value(&coin) == SERVICE_FEE, 0);
            ts::return_to_sender(scenario, coin);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = core::E_INVALID_REASON)]
    fun test_invalid_reason() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;

        { core::init_for_testing(ts::ctx(scenario)); };

        // Try to throw away with invalid reason (> 2)
        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);

            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE, ts::ctx(scenario));

            core::throw_away(&mut purgatory, junk, payment, 99, &clock, ts::ctx(scenario)); // Invalid reason

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = core::E_INSUFFICIENT_PAYMENT)]
    fun test_insufficient_payment() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;

        { core::init_for_testing(ts::ctx(scenario)); };

        // Try to throw away with insufficient payment
        ts::next_tx(scenario, USER1);
        {
            let mut purgatory = ts::take_shared<GlobalPurgatory>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            clock::set_for_testing(&mut clock, 1000);

            let junk = JunkItem { id: object::new(ts::ctx(scenario)) };
            let payment = coin::mint_for_testing<SUI>(SERVICE_FEE - 1, ts::ctx(scenario)); // Too low

            core::throw_away(&mut purgatory, junk, payment, 0, &clock, ts::ctx(scenario));

            ts::return_shared(purgatory);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario_val);
    }
}
