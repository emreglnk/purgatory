# Reaper Setup Guide

Complete guide to setting up and running the Purgatory Reaper backend.

## Prerequisites

- Node.js v18+ and npm
- Sui CLI configured
- Supabase account (free tier works)

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Navigate to **SQL Editor** in the sidebar
4. Copy the contents of `schema.sql`
5. Paste and run it in the SQL Editor
6. Verify tables were created in **Table Editor**

### 2. Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy your **Project URL** (e.g., `https://xxx.supabase.co`)
3. Copy your **service_role key** (NOT the anon key)
4. Save these for the next step

### 3. Create Reaper Wallet

The reaper needs its own wallet to execute transactions:

```bash
# Generate new address
sui client new-address ed25519

# List your addresses
sui client addresses

# Switch to testnet
sui client switch --env testnet

# Export the private key (you'll need this for .env)
sui client export --address <YOUR_NEW_ADDRESS>

# Fund it with testnet SUI
sui client faucet --address <YOUR_NEW_ADDRESS>
```

Save the exported private key securely.

### 4. Configure Environment

```bash
cd reaper
cp env.example .env
```

Edit `.env`:

```env
# Sui Configuration
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PRIVATE_KEY=suiprivkey1... # From step 3

# Contract (already deployed)
PURGATORY_PACKAGE_ID=0xbd6d8fe79f5ec1dd12236a5c9bfefabdc61379ef89a45bfa73a5d62a802a152a
GLOBAL_PURGATORY_ID=0x581a3d7614845b546877197e3dae6f9bdca327d3d72afa08c436d14f9308502a

# Supabase (from step 2)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhb... # service_role key

# Reaper Configuration (defaults are fine)
RETENTION_PERIOD_MS=7776000000
BATCH_SIZE=500
CRON_SCHEDULE=0 */6 * * *
GAS_BUDGET=100000000
LOG_LEVEL=info
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Verify Setup

Check if the reaper can connect:

```bash
npm run balance
```

You should see:
```
[INFO] Reaper initialized with address: 0x...
[INFO] Reaper balance: X.XX SUI
```

### 7. Backfill Historical Events

If items were already thrown into purgatory, index them:

```bash
npm run indexer:backfill
```

Watch the logs. It will process all `ItemThrown`, `ItemRestored`, and `ItemPurged` events.

### 8. Start the Indexer

The indexer runs continuously and monitors new events:

```bash
npm run indexer
```

Leave this running in a terminal or use a process manager (PM2, systemd, etc.)

### 9. Start the Reaper

The reaper runs on a schedule and purges expired items:

```bash
npm run reaper
```

It will:
- Run immediately on start
- Then run every 6 hours (configurable via `CRON_SCHEDULE`)

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start npm --name "purgatory-indexer" -- run indexer
pm2 start npm --name "purgatory-reaper" -- run reaper

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start", "indexer"]
```

Build and run:

```bash
docker build -t purgatory-reaper .
docker run -d --env-file .env purgatory-reaper
```

### Using Systemd

Create `/etc/systemd/system/purgatory-indexer.service`:

```ini
[Unit]
Description=Purgatory Indexer
After=network.target

[Service]
Type=simple
User=purgatory
WorkingDirectory=/opt/purgatory/reaper
ExecStart=/usr/bin/npm run indexer
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable purgatory-indexer
sudo systemctl start purgatory-indexer
```

## Monitoring

### Check Logs

```bash
# PM2
pm2 logs purgatory-reaper

# Systemd
sudo journalctl -u purgatory-reaper -f

# Docker
docker logs -f <container-id>
```

### Query Supabase

Check recent activity:

```sql
-- Recent reaper runs
SELECT * FROM reaper_logs 
ORDER BY run_timestamp DESC 
LIMIT 10;

-- Items waiting to be purged
SELECT COUNT(*) 
FROM purgatory_items 
WHERE status = 'HELD' 
AND deposit_timestamp < (EXTRACT(EPOCH FROM NOW()) * 1000 - 7776000000);

-- Statistics
SELECT * FROM purgatory_stats;
```

### Set Up Alerts

Configure Supabase webhooks to notify you:

1. Go to **Database** → **Webhooks**
2. Create a webhook on `reaper_logs` table
3. Trigger on `INSERT` with condition `status = 'FAILED'`
4. Send to Slack, Discord, or email

## Troubleshooting

### Problem: "Missing environment variables"

**Solution**: Ensure `.env` has all required values. Check with:
```bash
cat .env | grep -v "^#"
```

### Problem: Indexer not finding events

**Solution**: 
1. Verify contract address is correct
2. Check if anyone has actually thrown items
3. Run backfill: `npm run indexer:backfill`

### Problem: Reaper fails with "Insufficient gas"

**Solution**: Fund the wallet:
```bash
sui client faucet --address <REAPER_ADDRESS>
npm run balance
```

### Problem: Database connection errors

**Solution**:
1. Verify Supabase URL and key in `.env`
2. Check project is running (not paused)
3. Ensure service_role key (not anon key) is used

## Cost Estimation

### Testnet (Free)

- Gas is free
- Supabase free tier: 500MB database, 2GB bandwidth

### Mainnet

Assuming 1000 items per month:

- **Indexer**: Negligible (only reads)
- **Reaper**: ~0.01 SUI per transaction × ~20 transactions = 0.2 SUI/month
- **Supabase**: Free tier sufficient or $25/month for Pro

## Next Steps

Once running:

1. Monitor logs for first 24 hours
2. Verify items are being indexed correctly
3. Wait for first purge to execute
4. Check `reaper_logs` table for results

For questions or issues, check the main `README.md` or open an issue on GitHub.

