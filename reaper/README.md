# Reaper Bot - Purgatory Backend

Automated purging service for the Purgatory dApp. Monitors expired items and executes purge transactions.

## 🏗️ Architecture

The backend consists of two main services:

1. **Indexer**: Listens to blockchain events and maintains a database of purgatory items
2. **Reaper**: Scheduled bot that purges expired items

## 📦 Setup

### 1. Install Dependencies

```bash
cd reaper
npm install
```

### 2. Configure Supabase

Create a new Supabase project at [supabase.com](https://supabase.com) and run the schema:

```bash
# Copy the SQL from schema.sql and run it in your Supabase SQL editor
```

### 3. Environment Configuration

```bash
cp env.example .env
```

Edit `.env` and fill in:

- `SUI_PRIVATE_KEY`: Generate a new wallet for the bot
  ```bash
  sui client new-address ed25519
  sui client export --address <ADDRESS>
  ```
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (Settings → API)

### 4. Fund the Reaper Wallet

The reaper needs SUI tokens to pay for gas:

```bash
# Check balance
npm run balance

# Get testnet funds
sui client faucet --address <REAPER_ADDRESS>
```

## 🚀 Running

### Indexer

Continuously monitors blockchain events:

```bash
# Start indexer (runs continuously)
npm run indexer

# Backfill historical events
npm run indexer:backfill
```

### Reaper

Automatically purges expired items:

```bash
# Start reaper with cron schedule
npm run reaper

# Run once manually
npm run reaper:once
```

## 📊 Monitoring

Check the `reaper_logs` table in Supabase for execution history:

```sql
SELECT * FROM reaper_logs ORDER BY run_timestamp DESC LIMIT 10;
```

View statistics:

```sql
SELECT * FROM purgatory_stats;
```

## 🔧 Configuration

Edit `.env` to customize:

- `CRON_SCHEDULE`: How often to run (default: every 6 hours)
- `BATCH_SIZE`: Max items per run (default: 500)
- `GAS_BUDGET`: Gas budget per transaction (default: 0.1 SUI)

## 📁 Database Schema

### `purgatory_items`

Tracks all items in purgatory:

- `object_id`: Unique object identifier
- `object_type`: Full Move type
- `depositor`: Original owner address
- `deposit_timestamp`: When item was deposited
- `status`: HELD | RESTORED | PURGED

### `reaper_logs`

Execution history:

- `run_timestamp`: When the reaper ran
- `items_scanned`: How many items were checked
- `items_purged`: Successfully purged
- `items_failed`: Failed purges
- `gas_used`: Total gas consumed

## 🐛 Troubleshooting

### "Missing environment variables"

Ensure `.env` is properly configured with all required values.

### "Insufficient gas"

Fund the reaper wallet:

```bash
sui client faucet --address <REAPER_ADDRESS>
```

### Indexer not picking up events

Run backfill to sync historical events:

```bash
npm run indexer:backfill
```

## 🔐 Security

- **Never commit `.env`** to version control
- Use a dedicated wallet for the reaper (not your main wallet)
- Store `SUPABASE_SERVICE_KEY` securely
- Monitor the reaper wallet balance regularly

## 📈 Performance

- Indexes ~50 events per query
- Purges up to 500 items per run
- Batches 50 items per transaction
- Runs every 6 hours by default

Adjust `BATCH_SIZE` and `CRON_SCHEDULE` based on your needs.

