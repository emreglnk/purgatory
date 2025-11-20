<div align="center">
  <img src="frontend/public/flame-logo.svg" alt="Purgatory Logo" width="120" height="120" />
  
  # Purgatory
  
  **Permanent Asset Disposal System + Reputation Oracle on Sui Network**
  
  Clean your wallet. Report spam/scams. Build a safer ecosystem. 90-day recovery period.
  
  ## ✨ New: Reputation Oracle
  🏷️ Tag disposals | 🛡️ Community protection | 📊 Public API | 🔒 Sybil-resistant
  
  👉 **[What's New](./_dev_WHATS_NEW_REPUTATION_ORACLE.md)** | **[Quick Start](./_dev_REPUTATION_ORACLE_QUICKSTART.md)** | **[Deploy Guide](./_dev_DEPLOYMENT_REPUTATION_ORACLE.md)**
  
  [![Sui Network](https://img.shields.io/badge/Sui-Testnet-blue)](https://suiscan.xyz/testnet/object/0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d)
  [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
  
</div>

---

## Live Deployment

| Component | Address/Link |
|-----------|-------------|
| **Package ID** | [`0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490`](https://suiscan.xyz/testnet/object/0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490) |
| **GlobalPurgatory** | [`0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d`](https://suiscan.xyz/testnet/object/0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d) |
| **UpgradeCap** | `0x3b7f73f31527ac299d55c82120c657b404b6f69a49e8c0d3a31307d6bb09d6d5` |
| **Network** | Sui Testnet |
| **Service Fee** | 0.01 SUI (adjustable by admin) |
| **Version** | v3 (Security Fixes - Nov 2024) |

## Project Structure

```
purgatory/
├── sources/
│   └── core.move              # Smart contract (270 lines)
│
├── tests/
│   └── core_tests.move        # Unit tests (6/6 passing)
│
├── frontend/
│   ├── public/
│   │   └── flame-logo.svg     # Custom logo
│   └── src/
│       ├── components/
│       │   ├── WalletScanner.tsx   # Asset viewer
│       │   ├── ActionPanel.tsx     # Disposal UI
│       │   ├── TrashBin.tsx        # Recovery interface
│       │   └── TokenIcon.tsx       # Icon system
│       ├── config/
│       │   └── constants.ts        # Contract addresses
│       └── lib/
│           └── transactions.ts     # PTB builders
│
├── reaper/
│   ├── src/
│   │   ├── indexer.ts         # Event listener
│   │   ├── reaper.ts          # Purge bot
│   │   ├── database.ts        # Supabase ORM
│   │   └── logger.ts          # Logging
│   ├── schema.sql             # Database schema
│   └── SETUP.md               # Deployment guide
│
├── Move.toml
├── .gitignore
└── README.md
```

## Features

### Smart Contract
- **Disposal System**: Send unwanted assets to purgatory with 0.01 SUI fee
- **Recovery Period**: 90-day window to restore items
- **Auto-Purge**: Expired items automatically sent to dead address
- **Upgradeable**: Admin can adjust fees and transfer ownership
- **Type-Safe**: Generic support for any asset type (NFTs, Tokens)
- **Gas Efficient**: Batch operations via Programmable Transaction Blocks

### Frontend
- **Wallet Integration**: Seamless connection with Sui wallets
- **Smart Filtering**: Auto-detect and exclude system objects
- **Visual Icons**: NFT thumbnails, coin logos, fallback icons
- **Real-Time Updates**: Event-based tracking of disposed items
- **Restore Functionality**: One-click recovery from trash bin
- **Responsive Design**: Works on desktop and mobile

### Reaper (Backend)
- **Event Indexer**: Monitors blockchain for disposal events
- **Scheduled Purging**: Cron-based automatic cleanup
- **Batch Processing**: Handle up to 500 items per run
- **Supabase Integration**: PostgreSQL storage for tracking
- **Monitoring & Logs**: Comprehensive execution history


## How It Works

### For Users

1. **Connect** your Sui wallet
2. **Select** unwanted NFTs or tokens from your inventory
3. **Dispose** items with 0.01 SUI per item fee
4. **Restore** anytime within 90 days from trash bin
5. **Forget** about them - auto-purged after expiration

### For Developers

```typescript
// Dispose items
const tx = createBatchThrowAwayTransaction([
  { id: "0x123...", type: "0xabc::nft::MyNFT" }
]);
await signAndExecute({ transaction: tx });

// Restore items
const tx = createRestoreTransaction(itemId, itemType);
await signAndExecute({ transaction: tx });

// Admin: Update fee
sui client call \
  --function update_fee \
  --args {purgatory_id} 20000000
```

## 🔧 Configuration

Update contract addresses in `frontend/src/config/constants.ts`:

```typescript
export const PURGATORY_PACKAGE_ID = "0xbd6d...";
export const GLOBAL_PURGATORY_ID = "0x581a...";
```

## Configuration

| Parameter | Value | Adjustable |
|-----------|-------|------------|
| **Service Fee** | 0.01 SUI (10M MIST) | ✅ Yes (admin only) |
| **Retention Period** | 90 days | ❌ Hardcoded |
| **Dead Address** | `0x0...dead` | ❌ Hardcoded |


## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Sui Network (Move 2024) |
| **Smart Contract** | Move Language |
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v3 |
| **Wallet** | @mysten/dapp-kit |
| **Backend** | Node.js + TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Scheduling** | node-cron |

## Resources

- **Live Contract**: [View on Suiscan](https://suiscan.xyz/testnet/object/0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d)
- **Sui Documentation**: [docs.sui.io](https://docs.sui.io)
- **dApp Kit**: [SDK Docs](https://sdk.mystenlabs.com/dapp-kit)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - see LICENSE file for details

---

<div align="center">
  <img src="frontend/public/flame-logo.svg" alt="Purgatory" width="60" />
  
  **Built on Sui Network**
  
  [Report Bug](../../issues) · [Request Feature](../../issues)
</div>

