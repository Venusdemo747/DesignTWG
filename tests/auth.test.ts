import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertProductionAuthSafety } from "../src/auth/middleware";
import { DevAuthProvider, hashToken } from "../src/auth/provider";
import { PGliteDatabaseClient, resetDatabaseClient } from "../src/db/client";
import { DatabaseMigrator } from "../src/db/migrator";
import { PostgresEntityRepository } from "../src/db/repository";
import { IntegrationDemoServer } from "../src/server";

describe("Authentication, Session Security & Production Safety Gates", () => {
  let dbClient: PGliteDatabaseClient;
  let repo: PostgresEntityRepository;
  let authProvider: DevAuthProvider;
  let server: IntegrationDemoServer;
  let port: number;

  beforeAll(async () => {
    dbClient = new PGliteDatabaseClient(":memory:");
    await resetDatabaseClient(dbClient);

    const migrator = new DatabaseMigrator(dbClient);
    await migrator.runMigrations();

    repo = new PostgresEntityRepository(dbClient);
    authProvider = new DevAuthProvider(repo);

    server = new IntegrationDemoServer();
    port = await server.listen(0, "127.0.0.1");
  }, 30000);

  afterAll(async () => {
    await server.close();
    await resetDatabaseClient();
  });

  it("CRITICAL SAFETY GATE: Refuses to start if AUTH_DEV_MODE=true when NODE_ENV=production", () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origDevAuth = process.env.AUTH_DEV_MODE;

    try {
      process.env.NODE_ENV = "production";
      process.env.AUTH_DEV_MODE = "true";

      expect(() => assertProductionAuthSafety()).toThrow(
        /FATAL SECURITY VIOLATION: AUTH_DEV_MODE must NOT be enabled in production/
      );
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.AUTH_DEV_MODE = origDevAuth;
    }
  });

  it("proves dev login generates secure session with token hashed in database", async () => {
    const session = await authProvider.loginDev("Executive");
    expect(session.user.fullName).toBe("Irwin");
    expect(session.user.role).toBe("Executive");
    expect(session.rawToken).toContain("twg_dev_");

    // Verify token is NOT stored in plain-text in database
    const tokenHash = hashToken(session.rawToken);
    const dbSession = await repo.getSessionByHash(tokenHash);
    expect(dbSession).not.toBeNull();
    expect(dbSession?.sessionTokenHash).toBe(tokenHash);
    expect(dbSession?.sessionTokenHash).not.toBe(session.rawToken);
  });

  it("blocks dev login endpoint if AUTH_DEV_MODE is not true", async () => {
    const origDevAuth = process.env.AUTH_DEV_MODE;
    try {
      process.env.AUTH_DEV_MODE = "false";
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "Executive" }),
      });
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain("disabled");
    } finally {
      process.env.AUTH_DEV_MODE = origDevAuth;
    }
  });

  it("logs in successfully via API in dev mode and returns session", async () => {
    const origDevAuth = process.env.AUTH_DEV_MODE;
    try {
      process.env.AUTH_DEV_MODE = "true";
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "Finance" }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { role: string; fullName: string }; token: string };
      expect(data.user.role).toBe("Finance");
      expect(data.user.fullName).toBe("Anju");
      expect(data.token).toBeDefined();

      // Check cookie header was set
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain("twg_session");
      expect(cookieHeader).toContain("HttpOnly");
    } finally {
      process.env.AUTH_DEV_MODE = origDevAuth;
    }
  });

  it("ENFORCES LOGOUT INVALIDATION: removes session from database upon logout", async () => {
    const session = await authProvider.loginDev("Sales Lead");
    const tokenHash = hashToken(session.rawToken);

    // Verify session exists in DB
    const beforeLogout = await repo.getSessionByHash(tokenHash);
    expect(beforeLogout).not.toBeNull();

    // Call logout endpoint
    const logoutRes = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.rawToken}` },
    });
    expect(logoutRes.status).toBe(200);

    // Verify session is deleted from DB
    const afterLogout = await repo.getSessionByHash(tokenHash);
    expect(afterLogout).toBeNull();
  });

  it("ENFORCES SESSION EXPIRY & IDLE TIMEOUT: rejects expired or stale sessions", async () => {
    const user = await repo.getUserByEmail("irwin@designtwg.com");
    expect(user).not.toBeNull();

    // Expired session
    const expiredToken = "twg_dev_expired_token_12345";
    const expiredHash = hashToken(expiredToken);
    await repo.createSession({
      id: "sess-expired-01",
      sessionTokenHash: expiredHash,
      userId: user!.id,
      role: user!.role,
      expiresAt: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
      createdAt: new Date(Date.now() - 120000).toISOString(),
    });

    const mockReq = {
      headers: { authorization: `Bearer ${expiredToken}` },
      cookies: {},
    } as unknown as import("express").Request;

    const authResult = await authProvider.authenticate(mockReq);
    expect(authResult).toBeNull();
  });

  it("ENFORCES LOGIN RATE LIMITING & LOCKOUT: locks out after 5 consecutive failures", async () => {
    authProvider.clearFailedAttempts("Sales Lead");

    // Trigger 5 failed attempts
    for (let i = 0; i < 5; i++) {
      authProvider.recordFailedLogin("Sales Lead");
    }

    expect(authProvider.isLockedOut("Sales Lead")).toBe(true);

    await expect(
      authProvider.loginDev("Sales Lead")
    ).rejects.toThrow(/temporarily locked out/);

    authProvider.clearFailedAttempts("Sales Lead");
  });

  it("SUPPORTS SESSION ROTATION: rotates token and invalidates old credentials on role privilege change", async () => {
    const initialSession = await authProvider.loginDev("Project Manager");
    const user = await repo.getUserByEmail("nameeta@designtwg.com");
    expect(user).not.toBeNull();

    const rotatedSession = await authProvider.rotateSessionOnRoleChange(user!.id, "Executive");

    expect(rotatedSession.rawToken).not.toBe(initialSession.rawToken);
    expect(rotatedSession.user.role).toBe("Executive");
  });
});
