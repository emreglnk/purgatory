// Contract Constants and Configuration
// Deployed to Sui Testnet (v3 with security fixes - Nov 2024)

// Package ID from deployment (v3 with security fixes)
export const PURGATORY_PACKAGE_ID = "0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490";

// GlobalPurgatory shared object ID
export const GLOBAL_PURGATORY_ID = "0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d";

// UpgradeCap object ID (for future upgrades)
export const UPGRADE_CAP_ID = "0x3b7f73f31527ac299d55c82120c657b404b6f69a49e8c0d3a31307d6bb09d6d5";

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

