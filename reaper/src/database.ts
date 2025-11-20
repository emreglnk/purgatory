import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "./config.js";

export interface PurgatoryItem {
  object_id: string;
  object_type: string;
  depositor: string;
  deposit_timestamp: number;
  fee_paid: number;
  disposal_reason?: number; // 0=JUNK, 1=SPAM, 2=MALICIOUS
  status: "HELD" | "RESTORED" | "PURGED";
  created_at?: string;
  updated_at?: string;
  purged_at?: string | null;
  purge_tx_digest?: string | null;
}

export interface CollectionReputation {
  object_type: string;
  junk_count: number;
  spam_count: number;
  malicious_count: number;
  total_reports: number;
  unique_reporters: number;
  first_reported_at?: string;
  last_reported_at?: string;
  reputation_score: number;
  created_at?: string;
  updated_at?: string;
}

export interface DisposalReport {
  id?: number;
  object_id: string;
  object_type: string;
  reporter_address: string;
  reason: number;
  tx_digest: string;
  timestamp: number;
  created_at?: string;
}

export interface ReaperLog {
  id?: number;
  run_timestamp?: string;
  items_scanned: number;
  items_purged: number;
  items_failed: number;
  gas_used?: number;
  execution_time_ms?: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  error_message?: string | null;
  tx_digests?: string[];
}

export class Database {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }

  /**
   * Insert or update a purgatory item
   */
  async upsertItem(item: Omit<PurgatoryItem, "created_at" | "updated_at">) {
    const { data, error } = await this.client
      .from("purgatory_items")
      .upsert(item, { onConflict: "object_id" })
      .select()
      .single();

    if (error) throw error;
    return data as PurgatoryItem;
  }

  /**
   * Get items that are expired and ready to be purged
   */
  async getExpiredItems(limit: number = CONFIG.batchSize): Promise<PurgatoryItem[]> {
    const expiryThreshold = Date.now() - CONFIG.retentionPeriodMs;

    const { data, error } = await this.client
      .from("purgatory_items")
      .select("*")
      .eq("status", "HELD")
      .lt("deposit_timestamp", expiryThreshold)
      .limit(limit);

    if (error) throw error;
    return data as PurgatoryItem[];
  }

  /**
   * Mark item as purged
   */
  async markAsPurged(objectId: string, txDigest: string) {
    const { error } = await this.client
      .from("purgatory_items")
      .update({
        status: "PURGED",
        purged_at: new Date().toISOString(),
        purge_tx_digest: txDigest,
      })
      .eq("object_id", objectId);

    if (error) throw error;
  }

  /**
   * Mark item as restored (when user calls restore)
   */
  async markAsRestored(objectId: string) {
    const { error } = await this.client
      .from("purgatory_items")
      .update({ status: "RESTORED" })
      .eq("object_id", objectId);

    if (error) throw error;
  }

  /**
   * Get all items for a depositor
   */
  async getItemsByDepositor(depositor: string): Promise<PurgatoryItem[]> {
    const { data, error } = await this.client
      .from("purgatory_items")
      .select("*")
      .eq("depositor", depositor)
      .order("deposit_timestamp", { ascending: false });

    if (error) throw error;
    return data as PurgatoryItem[];
  }

  /**
   * Log reaper execution
   */
  async logReaperRun(log: ReaperLog) {
    const { error } = await this.client.from("reaper_logs").insert(log);
    if (error) throw error;
  }

  /**
   * Get recent reaper logs
   */
  async getRecentLogs(limit: number = 10): Promise<ReaperLog[]> {
    const { data, error } = await this.client
      .from("reaper_logs")
      .select("*")
      .order("run_timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ReaperLog[];
  }

  /**
   * Get statistics
   */
  async getStats() {
    const { data, error } = await this.client
      .from("purgatory_stats")
      .select("*");

    if (error) throw error;
    return data;
  }

  // =========================================================================
  // REPUTATION ORACLE METHODS
  // =========================================================================

  /**
   * Record a disposal report
   */
  async recordDisposalReport(report: Omit<DisposalReport, "id" | "created_at">) {
    const { error } = await this.client
      .from("disposal_reports")
      .insert(report);

    if (error) throw error;
  }

  /**
   * Update collection reputation statistics
   * This is called after each disposal report to maintain aggregate stats
   */
  async updateCollectionReputation(
    objectType: string,
    reason: number,
    reporterAddress: string
  ) {
    // First, check if collection exists
    const { data: existing } = await this.client
      .from("collection_reputation")
      .select("*")
      .eq("object_type", objectType)
      .single();

    if (!existing) {
      // Create new reputation record
      const newReputation: Partial<CollectionReputation> = {
        object_type: objectType,
        junk_count: reason === 0 ? 1 : 0,
        spam_count: reason === 1 ? 1 : 0,
        malicious_count: reason === 2 ? 1 : 0,
        total_reports: 1,
        unique_reporters: 1,
        reputation_score: this.calculateReputationScore(
          reason === 0 ? 1 : 0,
          reason === 1 ? 1 : 0,
          reason === 2 ? 1 : 0
        ),
      };

      const { error } = await this.client
        .from("collection_reputation")
        .insert(newReputation);

      if (error) throw error;
    } else {
      // Update existing reputation
      const junk_count = existing.junk_count + (reason === 0 ? 1 : 0);
      const spam_count = existing.spam_count + (reason === 1 ? 1 : 0);
      const malicious_count = existing.malicious_count + (reason === 2 ? 1 : 0);
      const total_reports = existing.total_reports + 1;

      const { error } = await this.client
        .from("collection_reputation")
        .update({
          junk_count,
          spam_count,
          malicious_count,
          total_reports,
          last_reported_at: new Date().toISOString(),
          reputation_score: this.calculateReputationScore(
            junk_count,
            spam_count,
            malicious_count
          ),
        })
        .eq("object_type", objectType);

      if (error) throw error;
    }
  }

  /**
   * Calculate reputation score (0-100, lower is worse)
   * Formula: Weighted average where MALICIOUS has highest weight
   */
  private calculateReputationScore(
    junkCount: number,
    spamCount: number,
    maliciousCount: number
  ): number {
    const total = junkCount + spamCount + maliciousCount;
    if (total === 0) return 100;

    // Weights: Junk=1, Spam=5, Malicious=20
    const weightedBadness =
      junkCount * 1 + spamCount * 5 + maliciousCount * 20;
    const maxPossibleBadness = total * 20; // If all were malicious

    // Convert to 0-100 scale (lower is worse)
    const score = 100 - (weightedBadness / maxPossibleBadness) * 100;
    return Math.round(score * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get reputation for a specific collection
   */
  async getCollectionReputation(
    objectType: string
  ): Promise<CollectionReputation | null> {
    const { data, error } = await this.client
      .from("collection_reputation")
      .select("*")
      .eq("object_type", objectType)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data as CollectionReputation;
  }

  /**
   * Get top malicious collections
   */
  async getTopMaliciousCollections(limit: number = 50): Promise<CollectionReputation[]> {
    const { data, error } = await this.client
      .from("collection_reputation")
      .select("*")
      .order("malicious_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as CollectionReputation[];
  }

  /**
   * Get top spam collections
   */
  async getTopSpamCollections(limit: number = 50): Promise<CollectionReputation[]> {
    const { data, error } = await this.client
      .from("collection_reputation")
      .select("*")
      .order("spam_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as CollectionReputation[];
  }

  /**
   * Get collections with lowest reputation scores
   */
  async getLowestReputationCollections(limit: number = 50): Promise<CollectionReputation[]> {
    const { data, error } = await this.client
      .from("collection_reputation")
      .select("*")
      .order("reputation_score", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as CollectionReputation[];
  }

  /**
   * Check if collection is flagged (has significant negative reports)
   */
  async isCollectionFlagged(objectType: string): Promise<{
    isFlagged: boolean;
    reason: string;
    reputation: CollectionReputation | null;
  }> {
    const reputation = await this.getCollectionReputation(objectType);

    if (!reputation) {
      return {
        isFlagged: false,
        reason: "No reports",
        reputation: null,
      };
    }

    // Flagging criteria
    if (reputation.malicious_count >= 10) {
      return {
        isFlagged: true,
        reason: `⚠️ ${reputation.malicious_count} MALICIOUS reports`,
        reputation,
      };
    }

    if (reputation.spam_count >= 50) {
      return {
        isFlagged: true,
        reason: `⚠️ ${reputation.spam_count} SPAM reports`,
        reputation,
      };
    }

    if (reputation.reputation_score < 30 && reputation.total_reports >= 20) {
      return {
        isFlagged: true,
        reason: `⚠️ Low reputation score: ${reputation.reputation_score}`,
        reputation,
      };
    }

    return {
      isFlagged: false,
      reason: "Clean",
      reputation,
    };
  }
}

