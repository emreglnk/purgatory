# Purgatory

**Asset Disposal System for Sui Network**

Clean your wallet by disposing unwanted NFTs and tokens with a 90-day recovery period. Built-in reputation oracle helps identify spam and malicious collections through community reports.

[![Sui Network](https://img.shields.io/badge/Sui-Testnet-blue)](https://suiscan.xyz/testnet/object/0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://emreglnk.github.io/purgatory/)

---

## Live Deployment

| Component | Address |
|-----------|---------|
| **Package ID** | [`0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f`](https://suiscan.xyz/testnet/object/0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f) |
| **GlobalPurgatory** | [`0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc`](https://suiscan.xyz/testnet/object/0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc) |
| **UpgradeCap** | `0xff87d87eea119f0875bce7e386af713733ec81d5c50cf40279c50526673f63a3` |
| **Network** | Sui Testnet |
| **Service Fee** | 0.01 SUI per item |

## Features

### Smart Contract
- Dispose unwanted assets to purgatory with 0.01 SUI fee
- 90-day recovery window to restore items
- Auto-purge expired items to dead address
- Type-safe generic support for any asset type
- Batch operations via Programmable Transaction Blocks
- On-chain reputation tracking (disposal reasons: junk, spam, malicious)

### Frontend
- Wallet integration with Sui wallets
- Real-time reputation badges for collections
- Visual icons for NFTs and tokens
- Batch disposal with reason tagging
- One-click recovery from trash bin
- Responsive design

### Backend (Reputation Oracle)
- Event indexer monitors all disposals
- Public API for reputation queries
- Aggregated statistics per collection type
- Sybil-resistant scoring (unique reporters counted)
- Automated purge scheduler

## Project Structure

```
purgatory/
├── sources/
│   └── core.move              # Smart contract
├── tests/
│   └── core_tests.move        # Unit tests
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── config/            # Contract addresses
│   │   └── lib/               # Transaction builders
│   └── public/
│       └── flame-logo.svg     # Logo
├── reaper/
│   ├── src/
│   │   ├── indexer.ts         # Event listener
│   │   ├── reaper.ts          # Purge bot
│   │   ├── api.ts             # REST API
│   │   └── database.ts        # Database interface
│   └── schema.sql             # PostgreSQL schema
├── Move.toml
└── README.md
```

## How It Works

### For Users

1. Connect your Sui wallet
2. Select unwanted NFTs or tokens
3. Choose disposal reason (junk/spam/malicious)
4. Pay 0.01 SUI per item
5. Restore anytime within 90 days
6. Items auto-purged after expiration

### For Developers

```typescript
// Dispose items
const tx = createBatchThrowAwayTransaction([
  { id: "0x123...", type: "0xabc::nft::MyNFT" }
], reason);
await signAndExecute({ transaction: tx });

// Restore items
const tx = createRestoreTransaction(itemId, itemType);
await signAndExecute({ transaction: tx });

// Query reputation
const response = await fetch(
  `https://purgatory-api.iyi.im/api/reputation/${encodeURIComponent(objectType)}`
);
const reputation = await response.json();
```

## Reputation Oracle API

**Base URL**: `https://purgatory-api.iyi.im`

| Endpoint | Description |
|----------|-------------|
| `GET /api/reputation/:objectType` | Get reputation for a collection |
| `GET /api/malicious` | List top malicious collections |
| `GET /api/flagged` | List all flagged collections |
| `POST /api/check-batch` | Batch check multiple types |

**Response format:**
```json
{
  "object_type": "0x...::nft::MyNFT",
  "junk_count": 150,
  "spam_count": 25,
  "malicious_count": 5,
  "total_reports": 180,
  "unique_reporters": 42,
  "reputation_score": 75
}
```

## Configuration

| Parameter | Value | Adjustable |
|-----------|-------|------------|
| **Service Fee** | 0.01 SUI (10M MIST) | Yes (admin only) |
| **Retention Period** | 90 days | No (hardcoded) |
| **Dead Address** | `0x000000000000000000000000000000000000dead` | No (hardcoded) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Sui Network (Move 2024) |
| **Smart Contract** | Move Language |
| **Frontend** | React + TypeScript + Vite |
| **Styling** | Tailwind CSS |
| **Wallet** | @mysten/dapp-kit |
| **Backend** | Node.js + Express |
| **Database** | Supabase (PostgreSQL) |
| **Hosting** | GitHub Pages (Frontend), Self-hosted (Backend) |

## Local Development

### Smart Contract
```bash
sui move build
sui move test
sui client publish --gas-budget 100000000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd reaper
npm install
npm run indexer     # Start event indexer
npm run api         # Start REST API
npm run reaper      # Start purge scheduler
```

## Resources

- **Live dApp**: [emreglnk.github.io/purgatory](https://emreglnk.github.io/purgatory/)
- **Contract Explorer**: [View on Suiscan](https://suiscan.xyz/testnet/object/0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f)
- **API Endpoint**: [purgatory-api.iyi.im](https://purgatory-api.iyi.im/health)
- **Sui Documentation**: [docs.sui.io](https://docs.sui.io)

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

MIT License - see LICENSE file for details

---

**Built on Sui Network** | [GitHub](https://github.com/emreglnk/purgatory)
