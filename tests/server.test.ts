import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IntegrationDemoServer } from "../src/server";

describe("Integration Demo Server API", () => {
  const demoServer = new IntegrationDemoServer();
  let port: number;

  beforeAll(async () => {
    port = await demoServer.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await demoServer.close();
  });

  it("serves HTML dashboard on root GET /", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Design TWG");
    expect(html).toContain("Task 27");
  });

  it("serves health report on GET /api/health", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { activeSystemsCount: number; systems: unknown[] };
    expect(data.activeSystemsCount).toBe(4);
    expect(data.systems.length).toBe(4);
  });

  it("tests live adapter connections honestly via POST /api/connections/test", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/connections/test`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ systemId: string; state: string }>;
    expect(data.length).toBe(4);
  });

  it("serves CSV templates on GET /api/ingestion/templates", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ingestion/templates`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as string[];
    expect(data).toContain("customers");
    expect(data).toContain("invoices");
  });

  it("handles CSV validation preview on POST /api/ingestion/preview", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ingestion/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "customers" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { totalRows: number; canProceedWithImport: boolean };
    expect(data.totalRows).toBeGreaterThan(0);
    expect(data.canProceedWithImport).toBe(true);
  });

  it("serves transfers list on GET /api/transfers", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/transfers`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("serves mapping definitions on GET /api/mapping/samples", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mapping/samples`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("handles simulated deal won trigger on POST /api/sync/deal-won", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/deal-won`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { project: unknown; customer: unknown };
    expect(data.project).toBeDefined();
    expect(data.customer).toBeDefined();
  });
});
