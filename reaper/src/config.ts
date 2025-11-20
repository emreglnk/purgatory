import { config } from "dotenv";
config();

export const CONFIG = {
  // Sui Network
  suiNetwork: process.env.SUI_NETWORK || "testnet",
  suiRpcUrl: process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
  suiPrivateKey: process.env.SUI_PRIVATE_KEY || "",

  // Contract (v4 with Reputation Oracle)
  purgatoryPackageId: process.env.PURGATORY_PACKAGE_ID || "0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f",
  globalPurgatoryId: process.env.GLOBAL_PURGATORY_ID || "0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc",

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

