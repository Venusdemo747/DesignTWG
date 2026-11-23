import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppRole } from "../src/auth/types";
import { PGliteDatabaseClient, resetDatabaseClient } from "../src/db/client";
import { DatabaseMigrator } from "../src/db/migrator";
import { IntegrationDemoServer } from "../src/server";

export const PUBLIC_ALLOWLIST = new Set([
  "GET /",
  "GET /index.html",
  "GET /api/health",
  "POST /api/auth/dev-login",
  "POST /api/auth/logout",
  "GET /api/auth/me",
]);

describe("Server-Side Role-Based Access Control (RBAC) & Route Enumeration", () => {
  let dbClient: PGliteDatabaseClient;
  let server: IntegrationDemoServer;
  let port: number;
  const userTokens: Partial<Record<AppRole, string>> = {};

  beforeAll(async () => {
    process.env.AUTH_DEV_MODE = "true";

    dbClient = new PGliteDatabaseClient(":memory:");
    await resetDatabaseClient(dbClient);

    const migrator = new DatabaseMigrator(dbClient);
    await migrator.runMigrations();

    server = new IntegrationDemoServer();
    port = await server.listen(0, "127.0.0.1");

    // Log in as each role to acquire tokens
    const roles: AppRole[] = [
      "Executive",
      "Sales Lead",
      "Project Manager",
      "Designer",
      "Finance",
      "Admin",
      "Viewer",
    ];

    for (const role of roles) {
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { token: string };
      userTokens[role] = data.token;
    }
  }, 40000);

  afterAll(async () => {
    delete process.env.AUTH_DEV_MODE;
    await server.close();
    await resetDatabaseClient();
  });

  it("CRITICAL RBAC CHECK: enumerates all registered Express routes and fails if any route lacks a guard", async () => {
    // In Express 5, router stack is in app._router or app.router
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const router = (server.app as any)._router || (server.app as any).router;
    expect(router).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes: Array<{ path: string; method: string }> = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.stack.forEach((layer: any) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const p of paths) {
          for (const m of methods) {
            routes.push({ path: p, method: m });
          }
        }
      }
    });

    expect(routes.length).toBeGreaterThan(10);

    // Verify each route is either in the public allowlist OR blocks unauthenticated access
    for (const route of routes) {
      const routeKey = `${route.method} ${route.path}`;
      if (PUBLIC_ALLOWLIST.has(routeKey)) {
        continue;
      }

      // Convert express route param like /api/ingestion/template/:type to a concrete path
      const testPath = route.path.replace(/:[a-zA-Z0-9_]+/g, "test");
      const res = await fetch(`http://127.0.0.1:${port}${testPath}`, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        body: ["POST", "PUT", "PATCH"].includes(route.method) ? JSON.stringify({}) : undefined,
      });

      // Must be blocked with 401 Unauthorized
      expect(
        res.status,
        `SECURITY VIOLATION: Route '${routeKey}' is missing an authentication guard and is publicly accessible!`
      ).toBe(401);
    }
  });

  it("blocks Viewer and Designer from executing imports (403 Forbidden)", async () => {
    const resViewer = await fetch(`http://127.0.0.1:${port}/api/ingestion/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userTokens.Viewer}`,
      },
      body: JSON.stringify({ entityType: "customers" }),
    });
    expect(resViewer.status).toBe(403);

    const resDesigner = await fetch(`http://127.0.0.1:${port}/api/ingestion/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userTokens.Designer}`,
      },
      body: JSON.stringify({ entityType: "customers" }),
    });
    expect(resDesigner.status).toBe(403);
  });

  it("blocks Designer from triggering deal-won sync (403 Forbidden)", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/deal-won`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userTokens.Designer}`,
      },
    });
    expect(res.status).toBe(403);
  });

  it("allows Sales Lead to trigger deal-won sync (200 OK)", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/deal-won`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userTokens["Sales Lead"]}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it("allows Project Manager to trigger milestone sync (200 OK)", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/milestone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userTokens["Project Manager"]}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it("allows Finance to trigger payment sync (200 OK)", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userTokens.Finance}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it("allows Executive to access audit logs (200 OK) while Viewer is blocked (403 Forbidden)", async () => {
    const resViewer = await fetch(`http://127.0.0.1:${port}/api/audit/logs`, {
      headers: {
        Authorization: `Bearer ${userTokens.Viewer}`,
      },
    });
    expect(resViewer.status).toBe(403);

    const resExec = await fetch(`http://127.0.0.1:${port}/api/audit/logs`, {
      headers: {
        Authorization: `Bearer ${userTokens.Executive}`,
      },
    });
    expect(resExec.status).toBe(200);
  });
});
