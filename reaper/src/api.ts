import express, { Request, Response } from "express";
import cors from "cors";
import { Database } from "./database.js";
import { logger } from "./logger.js";

/**
 * Reputation Oracle API Server
 * Provides endpoints for querying collection reputation data
 */
export class ReputationAPI {
  private app: express.Application;
  private db: Database;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.db = new Database();
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: Date.now() });
    });

    // Get reputation for a specific collection
    this.app.get("/api/reputation/:objectType", this.getCollectionReputation.bind(this));

    // Check if collection is flagged
    this.app.get("/api/check/:objectType", this.checkCollection.bind(this));

    // Get top malicious collections
    this.app.get("/api/malicious", this.getTopMalicious.bind(this));

    // Get top spam collections
    this.app.get("/api/spam", this.getTopSpam.bind(this));

    // Get lowest reputation collections
    this.app.get("/api/lowest-reputation", this.getLowestReputation.bind(this));

    // Batch check multiple collections
    this.app.post("/api/check-batch", this.checkBatch.bind(this));

    // Get purgatory stats
    this.app.get("/api/stats", this.getStats.bind(this));

    // Get items by depositor
    this.app.get("/api/items/:depositor", this.getItemsByDepositor.bind(this));
  }

  /**
   * GET /api/reputation/:objectType
   * Get reputation data for a specific collection
   */
  private async getCollectionReputation(req: Request, res: Response) {
    try {
      const { objectType } = req.params;
      const decodedType = decodeURIComponent(objectType);

      const reputation = await this.db.getCollectionReputation(decodedType);

      if (!reputation) {
        return res.json({
          object_type: decodedType,
          junk_count: 0,
          spam_count: 0,
          malicious_count: 0,
          total_reports: 0,
          reputation_score: 100,
          status: "clean",
        });
      }

      res.json(reputation);
    } catch (error) {
      logger.error("Error getting collection reputation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/check/:objectType
   * Check if a collection is flagged
   */
  private async checkCollection(req: Request, res: Response) {
    try {
      const { objectType } = req.params;
      const decodedType = decodeURIComponent(objectType);

      const result = await this.db.isCollectionFlagged(decodedType);

      res.json(result);
    } catch (error) {
      logger.error("Error checking collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/check-batch
   * Check multiple collections at once
   * Body: { objectTypes: string[] }
   */
  private async checkBatch(req: Request, res: Response) {
    try {
      const { objectTypes } = req.body;

      if (!Array.isArray(objectTypes)) {
        return res.status(400).json({ error: "objectTypes must be an array" });
      }

      const results = await Promise.all(
        objectTypes.map(async (type) => {
          const result = await this.db.isCollectionFlagged(type);
          return {
            objectType: type,
            ...result,
          };
        })
      );

      res.json({ results });
    } catch (error) {
      logger.error("Error checking batch:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/malicious?limit=50
   * Get top malicious collections
   */
  private async getTopMalicious(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const collections = await this.db.getTopMaliciousCollections(limit);

      res.json({ collections });
    } catch (error) {
      logger.error("Error getting top malicious:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/spam?limit=50
   * Get top spam collections
   */
  private async getTopSpam(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const collections = await this.db.getTopSpamCollections(limit);

      res.json({ collections });
    } catch (error) {
      logger.error("Error getting top spam:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/lowest-reputation?limit=50
   * Get collections with lowest reputation scores
   */
  private async getLowestReputation(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const collections = await this.db.getLowestReputationCollections(limit);

      res.json({ collections });
    } catch (error) {
      logger.error("Error getting lowest reputation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/stats
   * Get general purgatory statistics
   */
  private async getStats(req: Request, res: Response) {
    try {
      const stats = await this.db.getStats();
      res.json({ stats });
    } catch (error) {
      logger.error("Error getting stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/items/:depositor
   * Get items for a specific depositor
   */
  private async getItemsByDepositor(req: Request, res: Response) {
    try {
      const { depositor } = req.params;
      const items = await this.db.getItemsByDepositor(depositor);

      res.json({ items });
    } catch (error) {
      logger.error("Error getting items by depositor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Start the API server
   */
  start() {
    this.app.listen(this.port, () => {
      logger.info(`Reputation Oracle API running on port ${this.port}`);
      logger.info(`Health check: http://localhost:${this.port}/health`);
      logger.info(`API documentation: http://localhost:${this.port}/api/*`);
    });
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || "3000");
  const api = new ReputationAPI(port);
  api.start();
}

