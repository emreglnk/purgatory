import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHEX } from "@mysten/sui/utils";
import { CONFIG } from "./config.js";
import { Database, PurgatoryItem } from "./database.js";
import { logger } from "./logger.js";
import cron from "node-cron";

/**
 * Reaper Bot
 * Automatically purges expired items from Purgatory
 */
export class Reaper {
  private client: SuiClient;
  private db: Database;
  private keypair: Ed25519Keypair;
  private address: string;

  constructor() {
    this.client = new SuiClient({ url: CONFIG.suiRpcUrl });
    this.db = new Database();

    // Initialize keypair from private key
    const privateKeyBytes = fromHEX(CONFIG.suiPrivateKey.replace("0x", ""));
    this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    this.address = this.keypair.getPublicKey().toSuiAddress();

    logger.info(`Reaper initialized with address: ${this.address}`);
  }

  /**
   * Start the reaper bot with cron scheduling
   */
  start() {
    logger.info(`Starting Reaper with schedule: ${CONFIG.cronSchedule}`);

    // Run immediately on start
    this.run().catch((error) => {
      logger.error("Initial run failed:", error);
    });

    // Schedule recurring runs
    cron.schedule(CONFIG.cronSchedule, async () => {
      try {
        await this.run();
      } catch (error) {
        logger.error("Scheduled run failed:", error);
      }
    });

    logger.info("Reaper is now running. Press Ctrl+C to stop.");
  }

  /**
   * Execute one reaper run
   */
  async run() {
    const startTime = Date.now();
    logger.info("=== Reaper Run Started ===");

    try {
      // 1. Fetch expired items
      const expiredItems = await this.db.getExpiredItems(CONFIG.batchSize);
      logger.info(`Found ${expiredItems.length} expired items`);

      if (expiredItems.length === 0) {
        await this.db.logReaperRun({
          items_scanned: 0,
          items_purged: 0,
          items_failed: 0,
          execution_time_ms: Date.now() - startTime,
          status: "SUCCESS",
        });
        logger.info("No items to purge");
        return;
      }

      // 2. Analyze items (check if burnable)
      const analyzedItems = await this.analyzeItems(expiredItems);

      // 3. Purge items in batches
      const results = await this.purgeItems(analyzedItems);

      // 4. Log results
      const executionTime = Date.now() - startTime;
      await this.db.logReaperRun({
        items_scanned: expiredItems.length,
        items_purged: results.purged,
        items_failed: results.failed,
        gas_used: results.gasUsed,
        execution_time_ms: executionTime,
        status: results.failed > 0 ? "PARTIAL" : "SUCCESS",
        tx_digests: results.txDigests,
      });

      logger.info(`=== Reaper Run Complete ===`);
      logger.info(`Purged: ${results.purged}, Failed: ${results.failed}, Time: ${executionTime}ms`);
    } catch (error) {
      logger.error("Reaper run failed:", error);
      await this.db.logReaperRun({
        items_scanned: 0,
        items_purged: 0,
        items_failed: 0,
        execution_time_ms: Date.now() - startTime,
        status: "FAILED",
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Analyze items to determine if they can be burned or must be transferred
   */
  private async analyzeItems(items: PurgatoryItem[]) {
    logger.info("Analyzing items for burn capability...");

    const analyzed = await Promise.all(
      items.map(async (item) => {
        try {
          // Check if module has a burn function
          const packageId = item.object_type.split("::")[0];
          const module = item.object_type.split("::")[1];

          // For Phase 1, we just transfer to DEAD_ADDRESS
          // In future, we can analyze module functions to see if burn() exists
          return {
            ...item,
            burnable: false, // Always false for Phase 1
          };
        } catch (error) {
          logger.warn(`Failed to analyze ${item.object_id}:`, error);
          return {
            ...item,
            burnable: false,
          };
        }
      })
    );

    return analyzed;
  }

  /**
   * Purge items by transferring to dead address
   */
  private async purgeItems(items: (PurgatoryItem & { burnable: boolean })[]) {
    const results = {
      purged: 0,
      failed: 0,
      gasUsed: 0,
      txDigests: [] as string[],
    };

    // Process items in batches to avoid hitting gas limits
    const batchSize = 50; // Conservative batch size
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        const tx = new Transaction();

        // Add purge calls for each item
        for (const item of batch) {
          tx.moveCall({
            target: `${CONFIG.purgatoryPackageId}::core::purge`,
            typeArguments: [item.object_type],
            arguments: [
              tx.object(CONFIG.globalPurgatoryId),
              tx.pure.id(item.object_id),
              tx.object("0x6"), // Clock
            ],
          });
        }

        // Set gas budget
        tx.setGasBudget(CONFIG.gasBudget);

        // Execute transaction
        logger.info(`Executing batch of ${batch.length} purges...`);
        const result = await this.client.signAndExecuteTransaction({
          transaction: tx,
          signer: this.keypair,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        if (result.effects?.status.status === "success") {
          logger.info(`Batch purged successfully: ${result.digest}`);
          results.purged += batch.length;
          results.txDigests.push(result.digest);

          // Update database for each item
          for (const item of batch) {
            await this.db.markAsPurged(item.object_id, result.digest);
          }

          // Track gas used
          const gasUsed = parseInt(result.effects.gasUsed.computationCost) +
            parseInt(result.effects.gasUsed.storageCost) -
            parseInt(result.effects.gasUsed.storageRebate);
          results.gasUsed += gasUsed;
        } else {
          logger.error(`Batch purge failed: ${result.effects?.status.error}`);
          results.failed += batch.length;
        }
      } catch (error) {
        logger.error(`Error purging batch:`, error);
        results.failed += batch.length;
      }

      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get reaper wallet balance
   */
  async getBalance() {
    const balance = await this.client.getBalance({
      owner: this.address,
    });
    logger.info(`Reaper balance: ${parseInt(balance.totalBalance) / 1e9} SUI`);
    return balance;
  }

  /**
   * Run once and exit (for manual execution)
   */
  async runOnce() {
    await this.run();
    process.exit(0);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const reaper = new Reaper();

  if (process.argv.includes("--once")) {
    reaper.runOnce().catch((error) => {
      logger.error("Reaper failed:", error);
      process.exit(1);
    });
  } else {
    reaper.start();
  }
}

