import { REPUTATION_API_URL } from "../config/constants";

export interface CollectionReputation {
  object_type: string;
  junk_count: number;
  spam_count: number;
  malicious_count: number;
  total_reports: number;
  unique_reporters: number;
  reputation_score: number;
  first_reported_at?: string;
  last_reported_at?: string;
}

export interface ReputationCheckResult {
  isFlagged: boolean;
  reason: string;
  reputation: CollectionReputation | null;
}

/**
 * Get reputation for a specific collection type
 */
export async function getCollectionReputation(
  objectType: string
): Promise<CollectionReputation | null> {
  try {
    const encodedType = encodeURIComponent(objectType);
    const response = await fetch(
      `${REPUTATION_API_URL}/api/reputation/${encodedType}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch reputation:", error);
    return null;
  }
}

/**
 * Check if collection is flagged
 */
export async function checkCollectionFlag(
  objectType: string
): Promise<ReputationCheckResult> {
  try {
    const encodedType = encodeURIComponent(objectType);
    const response = await fetch(
      `${REPUTATION_API_URL}/api/check/${encodedType}`
    );

    if (!response.ok) {
      return {
        isFlagged: false,
        reason: "Unknown",
        reputation: null,
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to check reputation:", error);
    return {
      isFlagged: false,
      reason: "Unknown",
      reputation: null,
    };
  }
}

/**
 * Batch check multiple collections
 */
export async function checkBatch(
  objectTypes: string[]
): Promise<Map<string, ReputationCheckResult>> {
  try {
    const response = await fetch(`${REPUTATION_API_URL}/api/check-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectTypes }),
    });

    if (!response.ok) {
      return new Map();
    }

    const data = await response.json();
    const resultMap = new Map<string, ReputationCheckResult>();

    for (const result of data.results) {
      resultMap.set(result.objectType, result);
    }

    return resultMap;
  } catch (error) {
    console.error("Failed to batch check:", error);
    return new Map();
  }
}

/**
 * Get reputation badge info based on reputation data
 */
export function getReputationBadge(reputation: CollectionReputation | null): {
  emoji: string;
  label: string;
  color: string;
  severity: "unknown" | "clean" | "junk" | "spam" | "malicious";
} {
  if (!reputation || reputation.total_reports === 0) {
    return {
      emoji: "❓",
      label: "Unknown",
      color: "text-zinc-500 bg-zinc-900/50 border-zinc-700",
      severity: "unknown",
    };
  }

  // Check for malicious (highest priority)
  if (reputation.malicious_count >= 10) {
    return {
      emoji: "💀",
      label: `Malicious (${reputation.malicious_count} reports)`,
      color: "text-red-500 bg-red-900/20 border-red-600",
      severity: "malicious",
    };
  }

  // Check for spam
  if (reputation.spam_count >= 50) {
    return {
      emoji: "📢",
      label: `Spam (${reputation.spam_count} reports)`,
      color: "text-yellow-500 bg-yellow-900/20 border-yellow-600",
      severity: "spam",
    };
  }

  // Check for junk (many reports)
  if (reputation.junk_count >= 100) {
    return {
      emoji: "🗑️",
      label: `Junk (${reputation.junk_count} reports)`,
      color: "text-zinc-400 bg-zinc-900/20 border-zinc-600",
      severity: "junk",
    };
  }

  // Check reputation score
  if (reputation.reputation_score < 30 && reputation.total_reports >= 20) {
    return {
      emoji: "⚠️",
      label: `Low Score (${reputation.reputation_score.toFixed(0)}/100)`,
      color: "text-orange-500 bg-orange-900/20 border-orange-600",
      severity: "spam",
    };
  }

  // Has some reports but not flagged
  if (reputation.total_reports > 0) {
    return {
      emoji: "ℹ️",
      label: `${reputation.total_reports} reports`,
      color: "text-blue-500 bg-blue-900/20 border-blue-600",
      severity: "clean",
    };
  }

  return {
    emoji: "✓",
    label: "Clean",
    color: "text-green-500 bg-green-900/20 border-green-600",
    severity: "clean",
  };
}

