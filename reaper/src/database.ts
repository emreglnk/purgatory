import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "./config.js";

export interface PurgatoryItem {
  object_id: string;
  object_type: string;
  depositor: string;
  deposit_timestamp: number;
  fee_paid: number;
  status: "HELD" | "RESTORED" | "PURGED";
  created_at?: string;
  updated_at?: string;
  purged_at?: string | null;
  purge_tx_digest?: string | null;
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
}

