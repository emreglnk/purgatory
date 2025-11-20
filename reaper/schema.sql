-- Purgatory Items Table
-- Tracks all items that have been thrown into purgatory

CREATE TABLE IF NOT EXISTS purgatory_items (
    -- Primary key
    object_id TEXT PRIMARY KEY,
    
    -- Item metadata
    object_type TEXT NOT NULL,
    depositor TEXT NOT NULL,
    deposit_timestamp BIGINT NOT NULL,
    fee_paid BIGINT NOT NULL,
    disposal_reason SMALLINT DEFAULT 0, -- 0=JUNK, 1=SPAM, 2=MALICIOUS (Reputation Oracle)
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('HELD', 'RESTORED', 'PURGED')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Purge tracking
    purged_at TIMESTAMPTZ,
    purge_tx_digest TEXT,
    
    -- Indexes for efficient querying
    CONSTRAINT valid_status CHECK (status IN ('HELD', 'RESTORED', 'PURGED'))
);

-- Index for finding expired items
CREATE INDEX idx_purgatory_items_status_deposit ON purgatory_items(status, deposit_timestamp)
WHERE status = 'HELD';

-- Index for depositor lookups
CREATE INDEX idx_purgatory_items_depositor ON purgatory_items(depositor);

-- Index for status queries
CREATE INDEX idx_purgatory_items_status ON purgatory_items(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_purgatory_items_updated_at
    BEFORE UPDATE ON purgatory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Reaper Activity Log Table
-- Tracks bot execution history and performance

CREATE TABLE IF NOT EXISTS reaper_logs (
    id SERIAL PRIMARY KEY,
    run_timestamp TIMESTAMPTZ DEFAULT NOW(),
    items_scanned INTEGER NOT NULL,
    items_purged INTEGER NOT NULL,
    items_failed INTEGER NOT NULL,
    gas_used BIGINT,
    execution_time_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    error_message TEXT,
    tx_digests TEXT[] -- Array of transaction digests
);

-- Index for recent logs
CREATE INDEX idx_reaper_logs_timestamp ON reaper_logs(run_timestamp DESC);

-- Stats View for monitoring
CREATE OR REPLACE VIEW purgatory_stats AS
SELECT
    status,
    COUNT(*) as count,
    SUM(fee_paid) as total_fees,
    MIN(deposit_timestamp) as oldest_deposit,
    MAX(deposit_timestamp) as newest_deposit
FROM purgatory_items
GROUP BY status;

-- Comment documentation
-- =========================================================================
-- REPUTATION ORACLE: Collection Statistics
-- =========================================================================

-- Aggregated statistics for each NFT/Token type (Reputation Oracle)
CREATE TABLE IF NOT EXISTS collection_reputation (
    object_type TEXT PRIMARY KEY,
    junk_count INTEGER DEFAULT 0,
    spam_count INTEGER DEFAULT 0,
    malicious_count INTEGER DEFAULT 0,
    total_reports INTEGER DEFAULT 0,
    unique_reporters INTEGER DEFAULT 0,
    first_reported_at TIMESTAMPTZ DEFAULT NOW(),
    last_reported_at TIMESTAMPTZ DEFAULT NOW(),
    reputation_score DECIMAL(5, 2) DEFAULT 0.0, -- Calculated score (0-100, lower is worse)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reputation queries
CREATE INDEX idx_collection_reputation_score ON collection_reputation(reputation_score);
CREATE INDEX idx_collection_malicious ON collection_reputation(malicious_count DESC);
CREATE INDEX idx_collection_spam ON collection_reputation(spam_count DESC);

-- =========================================================================
-- REPUTATION ORACLE: Individual Reports (for transparency & disputes)
-- =========================================================================

-- Track individual disposal reports for transparency
CREATE TABLE IF NOT EXISTS disposal_reports (
    id SERIAL PRIMARY KEY,
    object_id TEXT NOT NULL,
    object_type TEXT NOT NULL,
    reporter_address TEXT NOT NULL,
    reason SMALLINT NOT NULL, -- 0=JUNK, 1=SPAM, 2=MALICIOUS
    tx_digest TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for report queries
CREATE INDEX idx_disposal_reports_object_type ON disposal_reports(object_type);
CREATE INDEX idx_disposal_reports_reporter ON disposal_reports(reporter_address);
CREATE INDEX idx_disposal_reports_reason ON disposal_reports(reason);
CREATE INDEX idx_disposal_reports_timestamp ON disposal_reports(timestamp DESC);

-- =========================================================================
-- Views & Comments
-- =========================================================================

COMMENT ON TABLE purgatory_items IS 'Tracks all items deposited into purgatory';
COMMENT ON TABLE reaper_logs IS 'Logs reaper bot execution history';
COMMENT ON TABLE collection_reputation IS 'Reputation oracle: aggregate reports per collection';
COMMENT ON TABLE disposal_reports IS 'Reputation oracle: individual disposal reports for transparency';
COMMENT ON VIEW purgatory_stats IS 'Aggregate statistics for monitoring';

