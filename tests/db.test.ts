import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseMigrator } from "../src/db/migrator";
import {
  PostgresEntityRepository,
  redactSecretsAndPii,
} from "../src/db/repository";
import { PGliteDatabaseClient } from "../src/db/client";

describe("Database Migrations, Async Repository & Append-Only Audit", () => {
  let dbClient: PGliteDatabaseClient;
  let migrator: DatabaseMigrator;
  let repo: PostgresEntityRepository;

  beforeAll(async () => {
    // Run against in-memory PostgreSQL 16+ instance
    dbClient = new PGliteDatabaseClient(":memory:");
    migrator = new DatabaseMigrator(dbClient);
    repo = new PostgresEntityRepository(dbClient);

    const applied = await migrator.runMigrations();
    expect(applied).toContain("001_initial_schema.sql");
  }, 40000);

  afterAll(async () => {
    await dbClient.close();
  });

  it("proves migrations executed successfully and created tables on PostgreSQL 16+", async () => {
    const res = await dbClient.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tableNames = res.rows.map((r) => r.table_name);
    expect(tableNames).toContain("_migrations");
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("audit_log");
    expect(tableNames).toContain("approver_routing_rules");
    expect(tableNames).toContain("canonical_customers");
    expect(tableNames).toContain("canonical_deals");
    expect(tableNames).toContain("canonical_projects");
    expect(tableNames).toContain("canonical_milestones");
    expect(tableNames).toContain("canonical_financial_records");
    expect(tableNames).toContain("transfer_events");
  });

  it("stores and retrieves canonical customer records through async repository", async () => {
    await repo.saveCustomer({
      canonicalId: "TWG-CUST-TEST-001",
      sourceSystem: "zoho-crm",
      sourceRecordId: "ACC-TEST-001",
      recordOrigin: "IMPORTED_CSV",
      companyName: "Acme Design Co",
      displayName: "Acme Design",
      primaryEmail: "contact@acme.com",
      currency: "CAD",
      createdAt: "2026-11-23T20:00:00Z",
      updatedAt: "2026-11-23T20:00:00Z",
    });

    const retrieved = await repo.getCustomer("TWG-CUST-TEST-001");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.companyName).toBe("Acme Design Co");
    expect(retrieved?.currency).toBe("CAD");
  });

  it("stores and retrieves users and sessions with hashed tokens", async () => {
    await repo.createUser({
      id: "usr-irwin-01",
      email: "irwin@designtwg.com",
      fullName: "Irwin",
      role: "Executive",
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const user = await repo.getUserByEmail("irwin@designtwg.com");
    expect(user).not.toBeNull();
    expect(user?.fullName).toBe("Irwin");
    expect(user?.role).toBe("Executive");

    const sessionTokenHash = "hash-token-123456789";
    await repo.createSession({
      id: "sess-01",
      sessionTokenHash,
      userId: user!.id,
      role: user!.role,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const session = await repo.getSessionByHash(sessionTokenHash);
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe("irwin@designtwg.com");
  });

  it("appends audit log entries and verifies secret/PII redaction", async () => {
    const rawDiff = JSON.stringify({
      user: "irwin",
      token: "secret-token-xyz-123",
      password_hash: "hash_super_secret",
      apiKey: "zoho-api-key-999",
      creditCard: "4111 2222 3333 4444",
      action: "role_grant",
    });

    await repo.appendAudit({
      id: "audit-001",
      timestamp: new Date().toISOString(),
      actorId: "usr-irwin-01",
      actorRole: "Executive",
      action: "USER_ROLE_UPDATED",
      resourceType: "USER",
      resourceId: "usr-nameeta-01",
      diffJson: rawDiff,
      status: "SUCCESS",
    });

    const logs = await repo.getAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    const log = logs.find((l) => l.id === "audit-001");
    expect(log).toBeDefined();

    // Verify redactions
    expect(log?.diffJson).toContain("[REDACTED]");
    expect(log?.diffJson).not.toContain("secret-token-xyz-123");
    expect(log?.diffJson).not.toContain("hash_super_secret");
    expect(log?.diffJson).not.toContain("zoho-api-key-999");
    expect(log?.diffJson).toContain("[REDACTED_CARD]");
  });

  it("ENFORCES APPEND-ONLY INVARIANT: blocks UPDATE, DELETE, and TRUNCATE on audit_log via database trigger", async () => {
    // Attempting UPDATE on audit_log must throw SQL Exception
    await expect(
      dbClient.query("UPDATE audit_log SET action = 'TAMPERED' WHERE id = 'audit-001';")
    ).rejects.toThrow(/SECURITY VIOLATION.*audit_log.*strictly append-only/);

    // Attempting DELETE on audit_log must throw SQL Exception
    await expect(
      dbClient.query("DELETE FROM audit_log WHERE id = 'audit-001';")
    ).rejects.toThrow(/SECURITY VIOLATION.*audit_log.*strictly append-only/);

    // Attempting TRUNCATE on audit_log must throw SQL Exception
    await expect(
      dbClient.query("TRUNCATE TABLE audit_log;")
    ).rejects.toThrow(/SECURITY VIOLATION.*audit_log.*strictly append-only/);
  });
});
