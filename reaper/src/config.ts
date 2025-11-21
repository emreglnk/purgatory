import { config } from "dotenv";
config();

export const CONFIG = {
  // Sui Network
  suiNetwork: process.env.SUI_NETWORK || "testnet",
  suiRpcUrl: process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
  suiPrivateKey: process.env.SUI_PRIVATE_KEY || "",

  // Contract (with AdminCap & Dynamic Furnace)
  purgatoryPackageId: process.env.PURGATORY_PACKAGE_ID || "0x936fa3cbe1c4d8ed7c87f71e84a680b99e25f4846a8984c4583eae17d44058c0",
  globalPurgatoryId: process.env.GLOBAL_PURGATORY_ID || "0x7ffe6b844e3d76e9e7f0c39f34e749dc1cd44c561bad0ddd2d9a331d6d5f497f",

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || "",

  // Reaper
  retentionPeriodMs: parseInt(process.env.RETENTION_PERIOD_MS || "7776000000"),
  batchSize: parseInt(process.env.BATCH_SIZE || "500"),
  cronSchedule: process.env.CRON_SCHEDULE || "0 */6 * * *",
  gasBudget: parseInt(process.env.GAS_BUDGET || "100000000"),

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
} as const;

// Validate required environment variables
export function validateConfig() {
  const required = [
    "suiPrivateKey",
    "supabaseUrl",
    "supabaseKey",
  ];

  const missing = required.filter(
    (key) => !CONFIG[key as keyof typeof CONFIG]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\nPlease copy env.example to .env and fill in the values.`
    );
  }
}

