import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IntegrationDemoServer } from "../src/server";

describe("Integration Demo Server API", () => {
  const demoServer = new IntegrationDemoServer();
  let port: number;
  let authToken: string;

  beforeAll(async () => {
    process.env.AUTH_DEV_MODE = "true";
    port = await demoServer.listen(0, "127.0.0.1");

    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Executive" }),
    });
    const loginData = (await loginRes.json()) as { token: string };
    authToken = loginData.token;
  });

  afterAll(async () => {
    delete process.env.AUTH_DEV_MODE;
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
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ systemId: string; state: string }>;
    expect(data.length).toBe(4);
  });

  it("serves CSV templates on GET /api/ingestion/templates", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ingestion/templates`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as string[];
    expect(data).toContain("customers");
    expect(data).toContain("invoices");
  });

  it("handles CSV validation preview on POST /api/ingestion/preview", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ingestion/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ entityType: "customers" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { totalRows: number; canProceedWithImport: boolean };
    expect(data.totalRows).toBeGreaterThan(0);
    expect(data.canProceedWithImport).toBe(true);
  });

  it("serves transfers list on GET /api/transfers", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/transfers`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("serves mapping definitions on GET /api/mapping/samples", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mapping/samples`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data.length).toBeGreaterThan(0);
  });

  it("handles simulated deal won trigger on POST /api/sync/deal-won", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/deal-won`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { project: unknown; customer: unknown };
    expect(data.project).toBeDefined();
    expect(data.customer).toBeDefined();
  });

  it("enforces Helmet security headers on responses", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
  });

  it("enforces 2MB body size limit with 413 Payload Too Large", async () => {
    const largePayload = JSON.stringify({ data: "x".repeat(2.5 * 1024 * 1024) });
    const res = await fetch(`http://127.0.0.1:${port}/api/ingestion/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: largePayload,
    });
    expect(res.status).toBe(413);
  });
});
