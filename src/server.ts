import http from "node:http";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { ZohoCrmConnector } from "./connectors/zoho-crm";
import { ZohoProjectsConnector } from "./connectors/zoho-projects";
import { QuickBooksConnector } from "./connectors/quickbooks";
import { Microsoft365Connector } from "./connectors/microsoft-365";
import { ZohoCrmAdapter } from "./connectors/zoho-crm/adapter";
import { ZohoProjectsAdapter } from "./connectors/zoho-projects/adapter";
import { QuickBooksAdapter } from "./connectors/quickbooks/adapter";
import { Microsoft365Adapter } from "./connectors/microsoft-365/adapter";
import { HealthAggregator } from "./health";
import { DataMappingService } from "./mapping";
import { TransferMonitor } from "./transfer";
import { CanonicalDataRegistry } from "./ingestion/registry";
import { ControlledTransferPipeline } from "./transfer/pipeline";
import { CSV_TEMPLATES } from "./ingestion/templates";
import { IngestionEntityType } from "./ingestion/types";
import { renderDashboardHtml } from "./dashboard/html";

export class IntegrationDemoServer {
  public readonly app: express.Express;
  private server: http.Server | null = null;

  // Mock / Simulated connectors (for offline and demo simulation)
  public readonly crm = new ZohoCrmConnector();
  public readonly projects = new ZohoProjectsConnector();
  public readonly qbo = new QuickBooksConnector();
  public readonly m365 = new Microsoft365Connector();

  // Real provider-specific API adapters (for authenticated connection checks & live flows)
  public readonly crmAdapter = new ZohoCrmAdapter();
  public readonly projectsAdapter = new ZohoProjectsAdapter();
  public readonly qboAdapter = new QuickBooksAdapter();
  public readonly m365Adapter = new Microsoft365Adapter();

  public readonly mapper = new DataMappingService();
  public readonly registry = new CanonicalDataRegistry();
  public readonly pipeline = new ControlledTransferPipeline(this.registry);

  public readonly health = new HealthAggregator(
    this.crmAdapter,
    this.projectsAdapter,
    this.qboAdapter,
    this.m365Adapter,
    {
      crm: this.crmAdapter,
      projects: this.projectsAdapter,
      qbo: this.qboAdapter,
      m365: this.m365Adapter,
    },
  );

  public readonly transfer = new TransferMonitor(
    this.crm,
    this.projects,
    this.qbo,
    this.m365,
    this.mapper,
  );

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security headers (Helmet) - configured to allow dashboard styles and font CDNs
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Preserves dashboard inline assets & Google fonts
        crossOriginEmbedderPolicy: false,
      }),
    );

    // CORS headers
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      if (_req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });

    // Rate Limiting: 200 requests/minute in development/production, disabled in testing
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 200,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      skip: () => process.env.NODE_ENV === "test",
      message: { error: "Rate limit exceeded. Please wait a minute before retrying." },
    });
    this.app.use("/api/", limiter);

    // Body Parsers with 2MB payload cap
    this.app.use(express.json({ limit: "2mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "2mb" }));
    this.app.use(cookieParser());
  }

  private setupRoutes(): void {
    // UI Routes
    this.app.get(["/", "/index.html"], (_req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(renderDashboardHtml());
    });

    // Health & Connections
    this.app.get("/api/health", async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const report = await this.health.getReport();
        res.json(report);
      } catch (err) {
        next(err);
      }
    });

    this.app.post("/api/connections/test", async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await this.health.testAllConnections();
        res.json(results);
      } catch (err) {
        next(err);
      }
    });

    // CSV Ingestion Templates
    this.app.get("/api/ingestion/templates", (_req: Request, res: Response) => {
      res.json(Object.keys(CSV_TEMPLATES));
    });

    this.app.get("/api/ingestion/template/:type", (req: Request, res: Response) => {
      const type = req.params.type as string;
      const template = CSV_TEMPLATES[type];
      if (!template) {
        res.status(404).json({ error: `Template not found for '${type}'` });
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.status(200).send(template);
    });

    // CSV Ingestion: Preview Validation
    this.app.post("/api/ingestion/preview", (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const entityType = (body.entityType as IngestionEntityType) || "customers";
        const csvContent = (body.csvContent as string) || CSV_TEMPLATES[entityType] || "";
        const report = this.registry.previewValidation(entityType, csvContent, "IMPORTED_CSV");
        res.json(report);
      } catch (err) {
        next(err);
      }
    });

    // CSV Ingestion: Execute Import
    this.app.post("/api/ingestion/import", (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const entityType = (body.entityType as IngestionEntityType) || "customers";
        const csvContent = (body.csvContent as string) || CSV_TEMPLATES[entityType] || "";
        const dryRun = Boolean(body.dryRun);
        const result = this.registry.executeImport(
          entityType,
          csvContent,
          { dryRun, onConflict: "reject" },
          "IMPORTED_CSV",
        );
        res.json(result);
      } catch (err) {
        next(err);
      }
    });

    // Canonical Registry Record Counts
    this.app.get("/api/ingestion/registry/counts", (_req: Request, res: Response) => {
      const counts = this.registry.getCounts();
      res.json(counts);
    });

    // Controlled 8-Step Pipeline
    this.app.post("/api/pipeline/run", (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const entityType = (body.entityType as IngestionEntityType) || "customers";
        const payload = (body.payload as string) || CSV_TEMPLATES[entityType] || "";
        const dryRun = Boolean(body.dryRun);
        const result = this.pipeline.execute(entityType, payload, { dryRun, onConflict: "reject" });
        res.json(result);
      } catch (err) {
        next(err);
      }
    });

    // Audit Logs
    this.app.get("/api/audit/logs", (_req: Request, res: Response) => {
      const logs = this.registry.getAuditLog();
      res.json(logs);
    });

    // Data Mapping Definitions
    this.app.get("/api/mapping/samples", (_req: Request, res: Response) => {
      const mappings = DataMappingService.getMappingDefinitions();
      res.json(mappings);
    });

    // Transfer Monitor Routes
    this.app.get("/api/transfers", (_req: Request, res: Response) => {
      const transfers = this.transfer.getTransfers();
      res.json(transfers);
    });

    this.app.get("/api/transfers/stats", (_req: Request, res: Response) => {
      const stats = this.transfer.getStats();
      res.json(stats);
    });

    this.app.post("/api/sync/deal-won", async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.transfer.triggerDealWonSync();
        res.json(result);
      } catch (err) {
        next(err);
      }
    });

    this.app.post("/api/sync/milestone", async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.transfer.triggerMilestoneSync();
        res.json(result);
      } catch (err) {
        next(err);
      }
    });

    this.app.post("/api/sync/payment", async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.transfer.triggerPaymentSync();
        res.json(result);
      } catch (err) {
        next(err);
      }
    });

    this.app.post("/api/sync/fault", (_req: Request, res: Response) => {
      const result = this.transfer.simulateFaultAndAutoRetry();
      res.json(result);
    });

    this.app.post("/api/ping/:systemId", (req: Request, res: Response) => {
      const systemId = req.params.systemId;
      const latencyMs = Math.floor(25 + Math.random() * 35);
      res.json({ systemId, status: "ok", latencyMs, pingedAt: new Date().toISOString() });
    });

    // 404 Route Handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: "Route not found", path: req.path });
    });

    // Global Error Handler
    this.app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status = typeof err === "object" && err !== null && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500;
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(status).json({ error: message });
    });
  }

  public createServer(): http.Server {
    const server = http.createServer(this.app);
    this.server = server;
    return server;
  }

  public listen(port = 3027, host = "127.0.0.1"): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = this.createServer();
      server.listen(port, host, () => {
        const address = server.address();
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          resolve(port);
        }
      });
      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          server.listen(0, host, () => {
            const address = server.address();
            if (address && typeof address === "object") {
              resolve(address.port);
            } else {
              resolve(3028);
            }
          });
        } else {
          reject(err);
        }
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
