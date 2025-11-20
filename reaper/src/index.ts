import { validateConfig, CONFIG } from "./config.js";
import { Indexer } from "./indexer.js";
import { Reaper } from "./reaper.js";
import { logger } from "./logger.js";

/**
 * Main entry point for the Purgatory backend services
 */
async function main() {
  logger.info("Starting Purgatory Backend Services...");

  try {
    // Validate configuration
    validateConfig();
    logger.info("Configuration validated");

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case "indexer":
        logger.info("Starting Indexer Service");
        const indexer = new Indexer();
        if (args.includes("--backfill")) {
          await indexer.backfill();
        } else {
          await indexer.start();
        }
        break;

      case "reaper":
        logger.info("Starting Reaper Service");
        const reaper = new Reaper();
        if (args.includes("--once")) {
          await reaper.runOnce();
        } else {
          reaper.start();
        }
        break;

      case "balance":
        const balanceReaper = new Reaper();
        await balanceReaper.getBalance();
        process.exit(0);
        break;

      default:
        console.log(`
Purgatory Backend Services

Usage:
  npm run indexer          - Start the event indexer (continuous)
  npm run indexer:backfill - Backfill historical events
  npm run reaper           - Start the reaper bot (scheduled)
  npm run reaper:once      - Run reaper once and exit
  npm run balance          - Check reaper wallet balance

Environment:
  Copy env.example to .env and configure:
  - SUI_PRIVATE_KEY: Bot wallet private key
  - SUPABASE_URL: Your Supabase project URL
  - SUPABASE_SERVICE_KEY: Supabase service role key

Configuration:
  Network: ${CONFIG.suiNetwork}
  Package: ${CONFIG.purgatoryPackageId}
  Purgatory: ${CONFIG.globalPurgatoryId}
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error("Fatal error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

main();

