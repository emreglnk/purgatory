/*
 * Purgatory Core Module
 * 
 * Implements the logic for disposing of unwanted NFTs and Tokens on the Sui Network.
 * Features:
 * - Paid service model (0.1 SUI fee).
 * - 90-day retention period (purgatory).
 * - Restoration allowed by the original owner within the period.
 * - Public purging after the retention period expires.
 */

module purgatory::core {
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::dynamic_object_field as dof;
    use sui::event;
    use sui::table::{Self, Table};
    use std::type_name::{Self};
    use std::string::{Self, String};
    use std::ascii;

    // =========================================================================
    // Constants
    // =========================================================================

    /// Retention period: 90 days in milliseconds.
    const RETENTION_PERIOD: u64 = 7_776_000_000;

    /// Service fee: 0.01 SUI (10,000,000 MIST).
    const SERVICE_FEE: u64 = 10_000_000;

    /// Address where fees are sent (The Furnace).
    /// @dev This must match the admin address in frontend constants.
    const FURNACE_ADDRESS: address = @0xb88dc1cd6785c977e59496cc62b3bac69af40730db0797f7eb4d3db43a8628fd; 

    /// The "Dead Address" for items that cannot be burned programmatically.
    const DEAD_ADDRESS: address = @0x000000000000000000000000000000000000dead;

    // =========================================================================
    // Disposal Reason Codes (Reputation Oracle)
    // =========================================================================
    
    /// JUNK: Worthless but harmless items
    const REASON_JUNK: u8 = 0;
    
    /// SPAM: Unwanted marketing/airdrop items
    const REASON_SPAM: u8 = 1;
    
    /// MALICIOUS: Dangerous contracts (wallet drainers, scams)
    const REASON_MALICIOUS: u8 = 2;

    // =========================================================================
    // Error Codes
    // =========================================================================

    /// Error: The payment provided is less than the required service fee.
    const E_INSUFFICIENT_PAYMENT: u64 = 0;
    /// Error: The caller is not the original owner of the item.
    const E_NOT_OWNER: u64 = 1;
    /// Error: The retention period has not yet passed.
    const E_RETENTION_NOT_OVER: u64 = 2;
    /// Error: Only admin can perform this action.
    const E_NOT_ADMIN: u64 = 3;
    /// Error: Invalid disposal reason code.
    const E_INVALID_REASON: u64 = 4;

    // =========================================================================
    // Structs
    // =========================================================================

    /// The shared object that holds all items in Purgatory.
    public struct GlobalPurgatory has key {
        id: UID,
        /// Tracks metadata for every item in the Purgatory using the item's ID as the key.
        manifest: Table<ID, TrashRecord>,
        /// Admin address that can modify settings
        admin: address,
        /// Current service fee (can be updated by admin)
        current_fee: u64,
    }

    /// Metadata record for an item in Purgatory.
    public struct TrashRecord has store, drop {
        original_owner: address,
        deposit_timestamp: u64,
        fee_paid: u64,
        reason: u8, // Why this item was disposed (for reputation oracle)
    }

    // =========================================================================
    // Events
    // =========================================================================

    /// Emitted when an item is thrown into Purgatory.
    /// This event powers the Reputation Oracle system.
    public struct ItemThrown has copy, drop {
        item_id: ID,
        item_type: String, // Full type path (e.g., "0x123::nft::Hero")
        original_owner: address,
        reason: u8, // Disposal reason: 0=JUNK, 1=SPAM, 2=MALICIOUS
        timestamp: u64,
    }

    /// Emitted when an item is restored to its original owner.
    public struct ItemRestored has copy, drop {
        item_id: ID,
        restored_to: address,
        timestamp: u64,
    }

    /// Emitted when an item is purged (sent to dead address or burned).
    public struct ItemPurged has copy, drop {
        item_id: ID,
        sent_to: address,
        timestamp: u64,
    }

    // =========================================================================
    // Functions
    // =========================================================================

    /// Module initializer. Creates the GlobalPurgatory and shares it.
    fun init(ctx: &mut TxContext) {
        let admin_address = tx_context::sender(ctx);
        let purgatory = GlobalPurgatory {
            id: object::new(ctx),
            manifest: table::new(ctx),
            admin: admin_address,
            current_fee: SERVICE_FEE,
        };
        transfer::share_object(purgatory);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    /// Throws an item into Purgatory with a disposal reason.
    /// Requires a payment of SERVICE_FEE (0.1 SUI).
    /// The item is stored as a Dynamic Object Field on the GlobalPurgatory object.
    /// The reason code creates an immutable on-chain record for the Reputation Oracle.
    public fun throw_away<T: key + store>(
        purgatory: &mut GlobalPurgatory,
        item: T,
        payment: Coin<SUI>,
        reason: u8, // Disposal reason: 0=JUNK, 1=SPAM, 2=MALICIOUS
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 1. Validate Reason Code
        assert!(reason <= REASON_MALICIOUS, E_INVALID_REASON);

        // 2. Validate Payment (use current_fee from purgatory)
        assert!(coin::value(&payment) >= purgatory.current_fee, E_INSUFFICIENT_PAYMENT);

        // 3. Collect Fee
        transfer::public_transfer(payment, FURNACE_ADDRESS);

        let item_id = object::id(&item);
        let original_owner = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 4. Get type information for reputation tracking
        let item_type = type_name::with_defining_ids<T>();
        let item_type_ascii = type_name::into_string(item_type);
        let item_type_string = string::utf8(ascii::into_bytes(item_type_ascii));

        // 5. Create Record
        let record = TrashRecord {
            original_owner,
            deposit_timestamp: timestamp,
            fee_paid: purgatory.current_fee,
            reason, // Store reason for potential future queries
        };

        // 6. Store Item and Record
        table::add(&mut purgatory.manifest, item_id, record);
        dof::add(&mut purgatory.id, item_id, item);

        // 7. Emit Event (Powers the Reputation Oracle)
        // This immutable on-chain record enables community-driven spam detection
        event::emit(ItemThrown {
            item_id,
            item_type: item_type_string,
            original_owner,
            reason,
            timestamp,
        });
    }

    /// Restores an item from Purgatory to its original owner.
    /// Can only be called by the original owner.
    public fun restore<T: key + store>(
        purgatory: &mut GlobalPurgatory,
        item_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 1. Retrieve Record
        let record = table::remove<ID, TrashRecord>(&mut purgatory.manifest, item_id);

        // 2. Verify Ownership
        assert!(record.original_owner == tx_context::sender(ctx), E_NOT_OWNER);

        // 3. Retrieve Item
        let item = dof::remove<ID, T>(&mut purgatory.id, item_id);

        // 4. Return Item
        transfer::public_transfer(item, record.original_owner);

        // 5. Emit Event with accurate timestamp
        event::emit(ItemRestored {
            item_id,
            restored_to: record.original_owner,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Purges an expired item from Purgatory.
    /// Can be called by anyone after the retention period.
    /// Moves the item to the DEAD_ADDRESS.
    public fun purge<T: key + store>(
        purgatory: &mut GlobalPurgatory,
        item_id: ID,
        clock: &Clock,
    ) {
        // 1. Retrieve Record Immutably first to check time?
        // We need to remove it to proceed, but if we abort we roll back.
        // So we can just remove it and check the fields.
        let record = table::remove<ID, TrashRecord>(&mut purgatory.manifest, item_id);

        // 2. Check Retention Period
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time >= record.deposit_timestamp + RETENTION_PERIOD, E_RETENTION_NOT_OVER);

        // 3. Retrieve Item
        let item = dof::remove<ID, T>(&mut purgatory.id, item_id);

        // 4. Dispose Item
        // Transfers to DEAD_ADDRESS as per Phase 1 requirements.
        transfer::public_transfer(item, DEAD_ADDRESS);

        // 5. Emit Event
        event::emit(ItemPurged {
            item_id,
            sent_to: DEAD_ADDRESS,
            timestamp: current_time,
        });
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /// Update the service fee (admin only)
    public fun update_fee(
        purgatory: &mut GlobalPurgatory,
        new_fee: u64,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == purgatory.admin, E_NOT_ADMIN);
        purgatory.current_fee = new_fee;
    }

    /// Transfer admin rights to a new address (admin only)
    public fun transfer_admin(
        purgatory: &mut GlobalPurgatory,
        new_admin: address,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == purgatory.admin, E_NOT_ADMIN);
        purgatory.admin = new_admin;
    }

    /// Get current fee (view function)
    public fun get_current_fee(purgatory: &GlobalPurgatory): u64 {
        purgatory.current_fee
    }

    /// Get admin address (view function)
    public fun get_admin(purgatory: &GlobalPurgatory): address {
        purgatory.admin
    }
}

