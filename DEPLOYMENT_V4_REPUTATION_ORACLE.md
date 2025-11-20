# 🔥 Purgatory v4 - Reputation Oracle Deployment

## Deployment Information

**Version:** v0.0.2 (Reputation Oracle)  
**Date:** November 20, 2024  
**Network:** Sui Testnet

---

## 📦 Contract Details

| Component | ID | Link |
|-----------|---|------|
| **Package ID** | `0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f` | [View on SuiScan](https://suiscan.xyz/testnet/object/0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f) |
| **GlobalPurgatory** | `0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc` | [View on SuiScan](https://suiscan.xyz/testnet/object/0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc) |
| **UpgradeCap** | `0xff87d87eea119f0875bce7e386af713733ec81d5c50cf40279c50526673f63a3` | [View on SuiScan](https://suiscan.xyz/testnet/object/0xff87d87eea119f0875bce7e386af713733ec81d5c50cf40279c50526673f63a3) |
| **Transaction** | `2wNHsb74NwGebdhgGPZpYPrpRyXDE9YwV8t6F24pwrYc` | [View on SuiScan](https://suiscan.xyz/testnet/tx/2wNHsb74NwGebdhgGPZpYPrpRyXDE9YwV8t6F24pwrYc) |

---

## ✨ What's New in v4

### 1. **Tagged Disposal System**
Users now select a disposal reason when throwing items away:
- 🗑️ **JUNK** (0) - Worthless but harmless
- 📢 **SPAM** (1) - Unwanted marketing/airdrops
- 💀 **MALICIOUS** (2) - Dangerous/scam items

### 2. **Enhanced Events**
The `ItemThrown` event now includes:
- `item_type: String` - Full type path for reputation tracking
- `reason: u8` - Disposal reason code

### 3. **Reputation Oracle Ready**
Contract emits structured events that power a decentralized reputation system:
- Immutable on-chain records
- Community-driven spam/scam detection
- Public API support for wallet integrations

---

## 🏗️ Contract Changes

### Breaking Changes (Why v4 is New Deploy)
- `throw_away()` function signature changed (added `reason` parameter)
- `ItemThrown` event structure changed (added fields)
- `TrashRecord` struct updated (added `reason` field)

These are **incompatible changes** requiring a fresh deployment rather than an upgrade.

### New Function Signature
```move
public fun throw_away<T: key + store>(
    purgatory: &mut GlobalPurgatory,
    item: T,
    payment: Coin<SUI>,
    reason: u8,        // NEW: 0=JUNK, 1=SPAM, 2=MALICIOUS
    clock: &Clock,
    ctx: &mut TxContext
)
```

### New Event Structure
```move
public struct ItemThrown has copy, drop {
    item_id: ID,
    item_type: String,    // NEW: For reputation tracking
    original_owner: address,
    reason: u8,           // NEW: Disposal reason
    timestamp: u64,
}
```

---

## 📊 Gas Costs

| Operation | Gas Used |
|-----------|----------|
| **Contract Deployment** | 21.8 SUI |
| **Storage Cost** | 21.8 SUI |
| **Computation Cost** | 0.001 SUI |

---

## 🔄 Migration from v3

### For Users
- **No action needed** - Old items in v3 Purgatory remain accessible
- **New disposals** use v4 contract with reason selection
- **Optional:** Restore items from v3, then re-dispose to v4 with reason

### For Developers
Update contract IDs in your code:

**Frontend:**
```typescript
// frontend/src/config/constants.ts
export const PURGATORY_PACKAGE_ID = "0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f";
export const GLOBAL_PURGATORY_ID = "0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc";
```

**Backend:**
```typescript
// reaper/src/config.ts
purgatoryPackageId: "0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f",
globalPurgatoryId: "0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc",
```

---

## 🚀 Next Steps

### 1. Frontend Deployment ✅
```bash
git add .
git commit -m "Deploy v4 with Reputation Oracle"
git push origin main
# GitHub Actions will auto-deploy to GitHub Pages
```

### 2. Backend Setup (Pending)
```bash
# 1. Create Supabase project
# 2. Run database migrations (schema.sql)
# 3. Configure .env with new contract IDs
# 4. Deploy to Railway/VPS
```

### 3. Test Disposal with Reason
- Visit deployed frontend
- Connect wallet
- Select an NFT
- Choose disposal reason
- Confirm transaction
- Verify event includes `item_type` and `reason`

### 4. Verify Indexer
- Check Supabase for new event structure
- Confirm `disposal_reports` table populating
- Monitor `collection_reputation` aggregations

---

## 🎯 Roadmap

### Phase 1: Core System ✅
- [x] Smart contract with reason parameter
- [x] Enhanced event structure
- [x] Frontend reason selector
- [x] Database schema for reputation

### Phase 2: Backend Infrastructure (In Progress)
- [ ] Deploy indexer to process events
- [ ] Deploy API server
- [ ] Setup Supabase database
- [ ] Test end-to-end flow

### Phase 3: Public Features
- [ ] Public reputation dashboard
- [ ] API documentation
- [ ] Wallet integration examples
- [ ] Marketing & partnerships

---

## 📞 Support

### Documentation
- Smart Contract: `sources/core.move`
- Frontend: `frontend/src/`
- Backend: `reaper/src/`

### Verification
Verify deployment on SuiScan:
```
https://suiscan.xyz/testnet/object/0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f
```

---

**🔥 Purgatory v4 - Building a safer Sui ecosystem, one disposal at a time!**

