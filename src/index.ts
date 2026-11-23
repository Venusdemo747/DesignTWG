import "dotenv/config";
import pino from "pino";
import { loadEnv } from "./config/env";
import { IntegrationDemoServer } from "./server";

const env = loadEnv();

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["*.token", "*.secret", "*.client_secret"],
});

logger.info(
  {
    environment: env.NODE_ENV,
    externalConnectionsVerified: false,
    simulatedConnectors: [
      "Zoho CRM",
      "Zoho Projects",
      "QuickBooks Online",
      "Microsoft 365",
    ],
  },
  "Task 27 integration foundation initialized",
);

export async function startDemoApp(port = Number(process.env.PORT || 3027)) {
  const demoServer = new IntegrationDemoServer();
  const actualPort = await demoServer.listen(port);
  const healthReport = await demoServer.health.getReport();

  logger.info(
    {
      port: actualPort,
      dashboardUrl: `http://localhost:${actualPort}`,
      overallStatus: healthReport.overallStatus,
      activeSystems: healthReport.activeSystemsCount,
      systems: healthReport.systems.map((s) => ({
        name: s.name,
        status: s.status,
        latencyMs: s.latencyMs,
      })),
    },
    `🚀 Task 27 Integration Demo server running at http://localhost:${actualPort}`,
  );

  return { demoServer, port: actualPort };
}

// Auto-start server when run directly
if (require.main === module || process.env.AUTO_START === "true") {
  startDemoApp().catch((err) => {
    logger.error({ err }, "Failed to start Task 27 integration demo server");
    process.exit(1);
  });
}
