import { SuiClient, SuiEventFilter, EventId } from "@mysten/sui/client";
import { CONFIG } from "./config.js";
import { Database } from "./database.js";
import { logger } from "./logger.js";

/**
 * Indexer Service
 * Listens to on-chain events and updates the database
 */
export class Indexer {
  private client: SuiClient;
  private db: Database;
  private lastCursor: EventId | null = null;

  constructor() {
    this.client = new SuiClient({ url: CONFIG.suiRpcUrl });
    this.db = new Database();
  }

  /**
   * Start indexing events from the blockchain
   */
  async start() {
    logger.info("Starting indexer service...");

    // Index in a loop
    while (true) {
      try {
        await this.indexEvents();
        // Wait 10 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        logger.error("Error indexing events:", error);
        // Wait 30 seconds on error before retrying
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  /**
   * Index new events from the blockchain
   */
  private async indexEvents() {
    // Query for ItemThrown events
    const itemThrownFilter: SuiEventFilter = {
      MoveEventModule: {
        package: CONFIG.purgatoryPackageId,
        module: "core",
      },
    };

    const events = await this.client.queryEvents({
      query: itemThrownFilter,
      cursor: this.lastCursor,
      limit: 50,
    });

    if (events.data.length === 0) {
      return;
    }

    logger.info(`Processing ${events.data.length} events`);

    for (const event of events.data) {
      try {
        await this.processEvent(event);
      } catch (error) {
        logger.error(`Error processing event ${event.id.txDigest}:`, error);
      }
    }

    // Update cursor for next iteration
    this.lastCursor = events.nextCursor ?? null;
    logger.info(`Indexed up to cursor: ${JSON.stringify(this.lastCursor)}`);
  }

  /**
   * Process a single event
   */
  private async processEvent(event: any) {
    const eventType = event.type.split("::").pop();

    switch (eventType) {
      case "ItemThrown":
        await this.handleItemThrown(event);
        break;
      case "ItemRestored":
        await this.handleItemRestored(event);
        break;
      case "ItemPurged":
        await this.handleItemPurged(event);
        break;
      default:
        logger.debug(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Handle ItemThrown event (with Reputation Oracle support)
   */
  private async handleItemThrown(event: any) {
    const { item_id, item_type, original_owner, reason, timestamp } = event.parsedJson;

    try {
      const objectType = item_type || "Unknown";
      const disposalReason = reason !== undefined ? parseInt(reason) : 0;

      // 1. Store the item in purgatory_items
      await this.db.upsertItem({
        object_id: item_id,
        object_type: objectType,
        depositor: original_owner,
        deposit_timestamp: parseInt(timestamp),
        fee_paid: 10_000_000, // SERVICE_FEE constant (0.01 SUI)
        disposal_reason: disposalReason,
        status: "HELD",
      });

      // 2. Record individual disposal report (for transparency)
      await this.db.recordDisposalReport({
        object_id: item_id,
        object_type: objectType,
        reporter_address: original_owner,
        reason: disposalReason,
        tx_digest: event.id.txDigest,
        timestamp: parseInt(timestamp),
      });

      // 3. Update collection reputation statistics
      await this.db.updateCollectionReputation(
        objectType,
        disposalReason,
        original_owner
      );

      logger.info(`Indexed item thrown: ${item_id} (reason: ${disposalReason})`);
      
      // Log if this is a malicious report
      if (disposalReason === 2) {
        logger.warn(`⚠️ MALICIOUS report for collection: ${objectType}`);
      }
    } catch (error) {
      logger.error(`Failed to index item ${item_id}:`, error);
    }
  }

  /**
   * Handle ItemRestored event
   */
  private async handleItemRestored(event: any) {
    const { item_id } = event.parsedJson;

    await this.db.markAsRestored(item_id);
    logger.info(`Marked item as restored: ${item_id}`);
  }

  /**
   * Handle ItemPurged event
   */
  private async handleItemPurged(event: any) {
    const { item_id } = event.parsedJson;

    await this.db.markAsPurged(item_id, event.id.txDigest);
    logger.info(`Marked item as purged: ${item_id}`);
  }

  /**
   * Backfill historical events
   */
  async backfill(fromCheckpoint?: number) {
    logger.info("Starting backfill...");

    const filter: SuiEventFilter = {
      MoveEventModule: {
        package: CONFIG.purgatoryPackageId,
        module: "core",
      },
    };

    let cursor = null;
    let totalProcessed = 0;

    while (true) {
      const events = await this.client.queryEvents({
        query: filter,
        cursor,
        limit: 50,
      });

      if (events.data.length === 0) break;

      for (const event of events.data) {
        try {
          await this.processEvent(event);
          totalProcessed++;
        } catch (error) {
          logger.error(`Error processing event:`, error);
        }
      }

      cursor = events.nextCursor;
      if (!events.hasNextPage) break;

      logger.info(`Backfilled ${totalProcessed} events so far...`);
    }

    logger.info(`Backfill complete. Processed ${totalProcessed} events.`);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new Indexer();

  // Check if backfill flag is provided
  if (process.argv.includes("--backfill")) {
    indexer.backfill().catch((error) => {
      logger.error("Backfill failed:", error);
      process.exit(1);
    });
  } else {
    indexer.start().catch((error) => {
      logger.error("Indexer failed:", error);
      process.exit(1);
    });
  }
}

