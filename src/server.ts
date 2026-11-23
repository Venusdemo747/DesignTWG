import http from "node:http";
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

  private async parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
      req.on("error", reject);
    });
  }

  public createServer(): http.Server {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host || "localhost"}`);
      const method = req.method ?? "GET";

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        // UI
        if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(renderDashboardHtml());
          return;
        }

        // Health & Connections
        if (method === "GET" && url.pathname === "/api/health") {
          const report = await this.health.getReport();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(report));
          return;
        }

        if (method === "POST" && url.pathname === "/api/connections/test") {
          const results = await this.health.testAllConnections();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(results));
          return;
        }

        // CSV Ingestion Templates
        if (method === "GET" && url.pathname === "/api/ingestion/templates") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(Object.keys(CSV_TEMPLATES)));
          return;
        }

        if (method === "GET" && url.pathname.startsWith("/api/ingestion/template/")) {
          const type = url.pathname.replace("/api/ingestion/template/", "");
          const template = CSV_TEMPLATES[type];
          if (!template) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Template not found for '${type}'` }));
            return;
          }
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(template);
          return;
        }

        // CSV Ingestion: Preview Validation
        if (method === "POST" && url.pathname === "/api/ingestion/preview") {
          const body = await this.parseJsonBody(req);
          const entityType = (body.entityType as IngestionEntityType) || "customers";
          const csvContent = (body.csvContent as string) || CSV_TEMPLATES[entityType] || "";
          const report = this.registry.previewValidation(entityType, csvContent, "IMPORTED_CSV");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(report));
          return;
        }

        // CSV Ingestion: Execute Import
        if (method === "POST" && url.pathname === "/api/ingestion/import") {
          const body = await this.parseJsonBody(req);
          const entityType = (body.entityType as IngestionEntityType) || "customers";
          const csvContent = (body.csvContent as string) || CSV_TEMPLATES[entityType] || "";
          const dryRun = Boolean(body.dryRun);
          const result = this.registry.executeImport(
            entityType,
            csvContent,
            { dryRun, onConflict: "reject" },
            "IMPORTED_CSV",
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        // Canonical Registry Record Counts
        if (method === "GET" && url.pathname === "/api/ingestion/registry/counts") {
          const counts = this.registry.getCounts();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(counts));
          return;
        }

        // Controlled 8-Step Pipeline
        if (method === "POST" && url.pathname === "/api/pipeline/run") {
          const body = await this.parseJsonBody(req);
          const entityType = (body.entityType as IngestionEntityType) || "customers";
          const payload = (body.payload as string) || CSV_TEMPLATES[entityType] || "";
          const dryRun = Boolean(body.dryRun);
          const result = this.pipeline.execute(entityType, payload, { dryRun, onConflict: "reject" });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        // Audit Logs
        if (method === "GET" && url.pathname === "/api/audit/logs") {
          const logs = this.registry.getAuditLog();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(logs));
          return;
        }

        // Data Mapping Definitions
        if (method === "GET" && url.pathname === "/api/mapping/samples") {
          const mappings = DataMappingService.getMappingDefinitions();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(mappings));
          return;
        }

        // Legacy Simulated Transfer Monitor Routes
        if (method === "GET" && url.pathname === "/api/transfers") {
          const transfers = this.transfer.getTransfers();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(transfers));
          return;
        }

        if (method === "GET" && url.pathname === "/api/transfers/stats") {
          const stats = this.transfer.getStats();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(stats));
          return;
        }

        if (method === "POST" && url.pathname === "/api/sync/deal-won") {
          const result = await this.transfer.triggerDealWonSync();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        if (method === "POST" && url.pathname === "/api/sync/milestone") {
          const result = await this.transfer.triggerMilestoneSync();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        if (method === "POST" && url.pathname === "/api/sync/payment") {
          const result = await this.transfer.triggerPaymentSync();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        if (method === "POST" && url.pathname === "/api/sync/fault") {
          const result = this.transfer.simulateFaultAndAutoRetry();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }

        if (method === "POST" && url.pathname.startsWith("/api/ping/")) {
          const systemId = url.pathname.replace("/api/ping/", "");
          const latencyMs = Math.floor(25 + Math.random() * 35);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ systemId, status: "ok", latencyMs, pingedAt: new Date().toISOString() }));
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Route not found", path: url.pathname }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    });

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
