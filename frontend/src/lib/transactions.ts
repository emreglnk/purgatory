import { Transaction } from "@mysten/sui/transactions";
import { PURGATORY_PACKAGE_ID, GLOBAL_PURGATORY_ID, SERVICE_FEE, FURNACE_ADDRESS } from "../config/constants";
import { validateObjectId, validateTypeString, validateBatchItems } from "./validation";

/**
 * Creates a transaction to throw away items into Purgatory
 * @param itemIds - Array of object IDs to dispose
 * @returns Transaction object ready to be signed and executed
 */
export function createThrowAwayTransaction(itemIds: string[]) {
  const tx = new Transaction();

  // For each item, we need to:
  // 1. Split coins for the service fee
  // 2. Call throw_away with the item, payment, and clock

  itemIds.forEach((itemId) => {
    // Split coins for service fee (0.1 SUI)
    const [coin] = tx.splitCoins(tx.gas, [SERVICE_FEE]);

    // Call throw_away function
    // Function signature: throw_away<T>(purgatory, item, payment, clock, ctx)
    tx.moveCall({
      target: `${PURGATORY_PACKAGE_ID}::core::throw_away`,
      // Note: Type argument T will need to be provided dynamically based on object type
      // For now we'll need to query the object to get its type
      arguments: [
        tx.object(GLOBAL_PURGATORY_ID), // purgatory: &mut GlobalPurgatory
        tx.object(itemId), // item: T
        coin, // payment: Coin<SUI>
        tx.object("0x6"), // clock: &Clock (system clock at 0x6)
      ],
    });
  });

  return tx;
}

/**
 * Creates a transaction to restore an item from Purgatory
 * @param itemId - Object ID to restore
 * @param itemType - Full type string of the object (e.g., "0x123::nft::MyNFT")
 * @returns Transaction object ready to be signed and executed
 */
export function createRestoreTransaction(itemId: string, itemType: string) {
  // Validate inputs
  const validatedId = validateObjectId(itemId);
  const validatedType = validateTypeString(itemType);
  
  const tx = new Transaction();

  tx.moveCall({
    target: `${PURGATORY_PACKAGE_ID}::core::restore`,
    typeArguments: [validatedType],
    arguments: [
      tx.object(GLOBAL_PURGATORY_ID), // purgatory: &mut GlobalPurgatory
      tx.pure.id(validatedId), // item_id: ID
      tx.object("0x6"), // clock: &Clock
    ],
  });

  return tx;
}

/**
 * Creates a transaction to purge an expired item from Purgatory
 * @param itemId - Object ID to purge
 * @param itemType - Full type string of the object
 * @returns Transaction object ready to be signed and executed
 */
export function createPurgeTransaction(itemId: string, itemType: string) {
  // Validate inputs
  const validatedId = validateObjectId(itemId);
  const validatedType = validateTypeString(itemType);
  
  const tx = new Transaction();

  tx.moveCall({
    target: `${PURGATORY_PACKAGE_ID}::core::purge`,
    typeArguments: [validatedType],
    arguments: [
      tx.object(GLOBAL_PURGATORY_ID), // purgatory: &mut GlobalPurgatory
      tx.pure.id(validatedId), // item_id: ID
      tx.object("0x6"), // clock: &Clock
    ],
  });

  return tx;
}

/**
 * Batch throw away transaction for multiple items
 * Note: This requires knowing the type of each object
 */
export function createBatchThrowAwayTransaction(items: Array<{ id: string; type: string }>) {
  // Validate all items first (max 50 items per batch)
  const validatedItems = validateBatchItems(items, 50);
  
  const tx = new Transaction();

  validatedItems.forEach(({ id, type }) => {
    const [coin] = tx.splitCoins(tx.gas, [SERVICE_FEE]);

    tx.moveCall({
      target: `${PURGATORY_PACKAGE_ID}::core::throw_away`,
      typeArguments: [type],
      arguments: [
        tx.object(GLOBAL_PURGATORY_ID),
        tx.object(id),
        coin,
        tx.object("0x6"),
      ],
    });
  });

  return tx;
}

