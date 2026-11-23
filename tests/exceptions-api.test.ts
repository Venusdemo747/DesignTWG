import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IntegrationDemoServer } from "../src/server";
import { ExceptionRecord } from "../src/exceptions/types";

describe("Exception Inbox REST API & RBAC Authorization", () => {
  const server = new IntegrationDemoServer();
  let port: number;
  let adminToken: string;
  let viewerToken: string;
  let pmToken: string;

  beforeAll(async () => {
    process.env.AUTH_DEV_MODE = "true";
    port = await server.listen(0, "127.0.0.1");

    // Login Admin
    const adminRes = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Admin" }),
    });
    adminToken = ((await adminRes.json()) as { token: string }).token;

    // Login Viewer
    const viewerRes = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Viewer" }),
    });
    viewerToken = ((await viewerRes.json()) as { token: string }).token;

    // Login Project Manager
    const pmRes = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Project Manager" }),
    });
    pmToken = ((await pmRes.json()) as { token: string }).token;
  }, 30000);

  afterAll(async () => {
    delete process.env.AUTH_DEV_MODE;
    await server.close();
  });

  it("POST /api/exceptions/run-detectors executes detection cycle and returns summary", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/exceptions/run-detectors`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { runId: string; totalDetected: number };
    expect(data.runId).toContain("RUN-EXC-");
    expect(typeof data.totalDetected).toBe("number");
  });

  it("GET /api/exceptions lists exceptions with category and status filters", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/exceptions?category=BUSINESS&status=NEW`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ExceptionRecord[];
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/exceptions/:id returns exception with immutable lifecycle history", async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/exceptions`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    const list = (await listRes.json()) as ExceptionRecord[];

    if (list.length > 0) {
      const target = list[0];
      const res = await fetch(`http://127.0.0.1:${port}/api/exceptions/${target.id}`, {
        headers: { Authorization: `Bearer ${pmToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { exception: ExceptionRecord; lifecycleEvents: unknown[] };
      expect(data.exception.id).toBe(target.id);
      expect(Array.isArray(data.lifecycleEvents)).toBe(true);
    }
  });

  it("RBAC: Blocks Viewer from transitioning exception (403 Forbidden), allows Project Manager (200 OK)", async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/exceptions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const list = (await listRes.json()) as ExceptionRecord[];

    if (list.length > 0) {
      const target = list[0];

      // Viewer attempt -> 403 Forbidden
      const viewerRes = await fetch(`http://127.0.0.1:${port}/api/exceptions/${target.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ toStatus: "ACKNOWLEDGED" }),
      });
      expect(viewerRes.status).toBe(403);

      // Project Manager attempt -> 200 OK
      const pmRes = await fetch(`http://127.0.0.1:${port}/api/exceptions/${target.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pmToken}`,
        },
        body: JSON.stringify({ toStatus: "ACKNOWLEDGED", reason: "Reviewed by PM Nameeta" }),
      });
      expect(pmRes.status).toBe(200);
      const pmData = (await pmRes.json()) as { success: boolean; exception: ExceptionRecord };
      expect(pmData.success).toBe(true);
      expect(pmData.exception.status).toBe("ACKNOWLEDGED");
    }
  });
});
