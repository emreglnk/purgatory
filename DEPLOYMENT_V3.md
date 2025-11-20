# Deployment v3 - Security Fixes

**Deployment Date:** November 20, 2024  
**Network:** Sui Testnet  
**Transaction Digest:** `AEnBfHUXD4m56Ze3ht7AqzfJhtP5AqzKnNvvCa5UqqBJ`

---

## 🆕 New Deployment IDs

| Component | Object ID |
|-----------|-----------|
| **Package ID** | `0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490` |
| **GlobalPurgatory** | `0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d` |
| **UpgradeCap** | `0x3b7f73f31527ac299d55c82120c657b404b6f69a49e8c0d3a31307d6bb09d6d5` |

### Explorer Links

- **Package**: https://suiscan.xyz/testnet/object/0xe36223ecd83de21cef81ef6170c4c4660e08f24b5fdcf0b494d94063c0877490
- **GlobalPurgatory**: https://suiscan.xyz/testnet/object/0x492b807af1a2523208aefa995f4f97ce03f5fc16becbcc6032ede04c78fe3c5d
- **Transaction**: https://suiscan.xyz/testnet/tx/AEnBfHUXD4m56Ze3ht7AqzfJhtP5AqzKnNvvCa5UqqBJ

---

## ✅ Security Fixes Applied

### 1. [C-01] FURNACE_ADDRESS Fixed ✅
- **Issue**: Mismatch between contract (`@0xcafe`) and frontend address
- **Fix**: Updated contract to use correct admin address
- **Impact**: Fees now sent to correct destination
- **Files**: `sources/core.move:32`

### 2. [H-03] Event Timestamp Fixed ✅
- **Issue**: `restore()` function had dummy timestamp (0)
- **Fix**: Added `Clock` parameter to `restore()`, now emits real timestamp
- **Impact**: Backend indexer receives accurate data
- **Files**: 
  - `sources/core.move:163-180`
  - `frontend/src/lib/transactions.ts:45-63`
  - `tests/core_tests.move:49-55`

### 3. [FH-01] Input Validation Added ✅
- **Issue**: No validation for transaction inputs
- **Fix**: Created comprehensive validation module
- **Impact**: Protection against malformed inputs, injection attacks
- **Files**:
  - `frontend/src/lib/validation.ts` (new)
  - `frontend/src/lib/transactions.ts` (updated)

---

## 📋 Updated Files

### Smart Contract
- ✅ `sources/core.move` - FURNACE_ADDRESS + restore Clock

### Frontend
- ✅ `frontend/src/config/constants.ts` - New deployment IDs
- ✅ `frontend/src/lib/validation.ts` - New validation module
- ✅ `frontend/src/lib/transactions.ts` - Validation integration
- ✅ `frontend/src/App.tsx` - Updated contract link

### Backend (Reaper)
- ✅ `reaper/src/config.ts` - New deployment IDs
- ✅ `reaper/env.example` - New deployment IDs

### Documentation
- ✅ `README.md` - Updated deployment info and links
- ✅ `DEPLOYMENT_V3.md` - This file

### Tests
- ✅ `tests/core_tests.move` - Updated for Clock parameter

---

## 📊 Gas Costs

| Operation | Cost (MIST) | Cost (SUI) |
|-----------|-------------|------------|
| **Deployment** | 19,895,880 | ~0.0199 SUI |
| Storage Cost | 19,874,000 | ~0.0199 SUI |
| Computation | 1,000,000 | ~0.001 SUI |
| Storage Rebate | -978,120 | ~-0.001 SUI |

---

## 🔄 Migration from v2 → v3

**No migration needed!** This is a fresh deployment.

If you have active items in v2:
1. Restore items from old contract
2. Use new contract for future disposals

Old contract remains functional but won't receive updates.

---

## 🧪 Testing Checklist

- [x] Contract compiles without errors
- [x] All unit tests passing (6/6)
- [x] No linter warnings
- [x] Deployment successful
- [x] Frontend constants updated
- [x] Backend constants updated
- [x] Explorer links verified

---

## 🚀 What's Next?

### Immediate
- [ ] Update Reaper `.env` with new IDs
- [ ] Test frontend with real wallet
- [ ] Verify event indexing works

### Production Ready
- [ ] External security audit
- [ ] Bug bounty program
- [ ] Mainnet deployment
- [ ] KMS/Secrets Manager setup

---

## 📝 Notes

- Admin address: `0xb88dc1cd6785c977e59496cc62b3bac69af40730db0797f7eb4d3db43a8628fd`
- Service fee: 0.01 SUI (10,000,000 MIST)
- Retention period: 90 days (7,776,000,000 ms)
- All edge case security issues documented in TODO list

---

**Deployed by:** Admin  
**Last Updated:** November 20, 2024

