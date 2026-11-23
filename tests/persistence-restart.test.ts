import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGliteDatabaseClient, resetDatabaseClient } from "../src/db/client";
import { DatabaseMigrator } from "../src/db/migrator";
import { IntegrationDemoServer } from "../src/server";
import { CSV_TEMPLATES } from "../src/ingestion/templates";

describe("Persistence & Server Restart Verification", () => {
  const testDbDir = path.resolve(process.cwd(), "data", "test-restart-db");

  beforeAll(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
  });

  afterAll(async () => {
    await resetDatabaseClient();
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  it(
    "proves ingested CSV data and transfer history survive server shutdown and restart",
    async () => {
      // --- LIFECYCLE 1: Start Server 1, import data, trigger transfers, then terminate ---
      const db1 = new PGliteDatabaseClient(testDbDir);
      await resetDatabaseClient(db1);

      const migrator = new DatabaseMigrator(db1);
      await migrator.runMigrations();

      const server1 = new IntegrationDemoServer();
      const port1 = await server1.listen(0, "127.0.0.1");

      // Import customers via CSV API
      const importRes = await fetch(`http://127.0.0.1:${port1}/api/ingestion/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "customers",
          csvContent: CSV_TEMPLATES.customers,
          dryRun: false,
        }),
      });
      expect(importRes.status).toBe(200);
      const importData = (await importRes.json()) as { importedCount: number };
      expect(importData.importedCount).toBeGreaterThan(0);

      // Trigger deal-won transfer sync
      const syncRes = await fetch(`http://127.0.0.1:${port1}/api/sync/deal-won`, {
        method: "POST",
      });
      expect(syncRes.status).toBe(200);

      // Verify Server 1 counts
      const counts1Res = await fetch(`http://127.0.0.1:${port1}/api/ingestion/registry/counts`);
      const counts1 = (await counts1Res.json()) as Record<string, { total: number; csvImported: number }>;
      expect(counts1.customers.csvImported).toBe(importData.importedCount);

      // Shut down Server 1 completely and release DB lock
      await server1.close();
      await resetDatabaseClient();

      // --- LIFECYCLE 2: Start Server 2, verifying state was persisted on disk and reloaded ---
      const db2 = new PGliteDatabaseClient(testDbDir);
      await resetDatabaseClient(db2);

      const server2 = new IntegrationDemoServer();
      const port2 = await server2.listen(0, "127.0.0.1");

      // Verify registry record counts match after restart
      const counts2Res = await fetch(`http://127.0.0.1:${port2}/api/ingestion/registry/counts`);
      const counts2 = (await counts2Res.json()) as Record<string, { total: number; csvImported: number }>;
      expect(counts2.customers.csvImported).toBe(counts1.customers.csvImported);
      expect(counts2.customers.total).toBe(counts1.customers.total);

      // Verify transfer history was preserved across restart
      const trans2Res = await fetch(`http://127.0.0.1:${port2}/api/transfers`);
      const transfers2 = (await trans2Res.json()) as Array<{ trigger: string; status: string }>;
      expect(transfers2.length).toBeGreaterThan(0);
      expect(transfers2.some((t) => t.trigger.includes("Deals.Closed_Won"))).toBe(true);

      await server2.close();
      await resetDatabaseClient();
    },
    60000
  );
});
