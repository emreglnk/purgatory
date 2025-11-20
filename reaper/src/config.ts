import { config } from "dotenv";
config();

export const CONFIG = {
  // Sui Network
  suiNetwork: process.env.SUI_NETWORK || "testnet",
  suiRpcUrl: process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
  suiPrivateKey: process.env.SUI_PRIVATE_KEY || "",

  // Contract (v3 with security fixes)
  purgatoryPackageId: process.env.PURGATORY_PACKAGE_ID || "0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490",
  globalPurgatoryId: process.env.GLOBAL_PURGATORY_ID || "0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d",

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

