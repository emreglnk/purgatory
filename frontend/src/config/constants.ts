// Contract Constants and Configuration
// Deployed to Sui Testnet (v4 with Reputation Oracle - Nov 2024)

// Package ID from deployment (v4 with Reputation Oracle)
export const PURGATORY_PACKAGE_ID = "0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f";

// GlobalPurgatory shared object ID
export const GLOBAL_PURGATORY_ID = "0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc";

// UpgradeCap object ID (for future upgrades)
export const UPGRADE_CAP_ID = "0xff87d87eea119f0875bce7e386af713733ec81d5c50cf40279c50526673f63a3";

// Admin address that receives fees (your deployer address)
export const FURNACE_ADDRESS = "0xb88dc1cd6785c977e59496cc62b3bac69af40730db0797f7eb4d3db43a8628fd";

// Dead address for non-burnable items
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

// Service fee: 0.01 SUI (10,000,000 MIST)
export const SERVICE_FEE = 10_000_000n;

// Retention period: 90 days in milliseconds
export const RETENTION_PERIOD = 7_776_000_000;

// Network configuration
export const NETWORK = "testnet" as const;

// =========================================================================
// Disposal Reasons (Reputation Oracle)
// =========================================================================

export interface DisposalReason {
  value: number;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const DISPOSAL_REASONS: DisposalReason[] = [
  {
    value: 0,
    label: "Junk",
    emoji: "🗑️",
    description: "Worthless but harmless items",
    color: "text-zinc-500",
  },
  {
    value: 1,
    label: "Spam",
    emoji: "📢",
    description: "Unwanted marketing/airdrops",
    color: "text-yellow-500",
  },
  {
    value: 2,
    label: "Malicious",
    emoji: "💀",
    description: "Dangerous/scam items",
    color: "text-red-600",
  },
];

// Helper to get reason by value
export function getDisposalReason(value: number): DisposalReason | undefined {
  return DISPOSAL_REASONS.find((r) => r.value === value);
}

