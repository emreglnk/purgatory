// Contract Constants and Configuration
// Deployed to Sui Testnet (v4 with Reputation Oracle - Nov 2024)

// Package ID from deployment (with AdminCap & Dynamic Furnace)
export const PURGATORY_PACKAGE_ID = "0x936fa3cbe1c4d8ed7c87f71e84a680b99e25f4846a8984c4583eae17d44058c0";

// GlobalPurgatory shared object ID
export const GLOBAL_PURGATORY_ID = "0x7ffe6b844e3d76e9e7f0c39f34e749dc1cd44c561bad0ddd2d9a331d6d5f497f";

// UpgradeCap object ID (for future upgrades)
export const UPGRADE_CAP_ID = "0x1dbe7936b712945bbda10dc2c010a03e0eedb2bde476014b9343ea62cfdbcfff";

// AdminCap object ID (for admin operations)
export const ADMIN_CAP_ID = "0x17cf05e3e359a593e89e64a6f2fd33a1cff21565f5d194d0a1af8d3c3a58a287";

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

// Reputation Oracle API
export const REPUTATION_API_URL = "https://purgatory-api.iyi.im";

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
    emoji: "",
    description: "Worthless but harmless items",
    color: "text-zinc-500",
  },
  {
    value: 1,
    label: "Spam",
    emoji: "",
    description: "Unwanted marketing/airdrops",
    color: "text-yellow-500",
  },
  {
    value: 2,
    label: "Malicious",
    emoji: "",
    description: "Dangerous/scam items",
    color: "text-red-600",
  },
];

// Helper to get reason by value
export function getDisposalReason(value: number): DisposalReason | undefined {
  return DISPOSAL_REASONS.find((r) => r.value === value);
}

