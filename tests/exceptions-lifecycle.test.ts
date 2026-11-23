import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGliteDatabaseClient, resetDatabaseClient } from "../src/db/client";
import { DatabaseMigrator } from "../src/db/migrator";
import { PostgresEntityRepository } from "../src/db/repository";
import { ExceptionEngine } from "../src/exceptions/engine";
import { CanonicalDeal, CanonicalMilestone, CanonicalProject } from "../src/canonical/types";

describe("Exception Engine Deduplication, Lifecycle Transitions & Reopen-on-Recurrence", () => {
  let dbClient: PGliteDatabaseClient;
  let repo: PostgresEntityRepository;
  let engine: ExceptionEngine;

  beforeAll(async () => {
    dbClient = new PGliteDatabaseClient(":memory:");
    await resetDatabaseClient(dbClient);

    const migrator = new DatabaseMigrator(dbClient);
    await migrator.runMigrations();

    repo = new PostgresEntityRepository(dbClient);
    engine = new ExceptionEngine(repo);

    // Seed test deal with missing owner and missing next action
    await repo.saveDeal({
      canonicalId: "CANON-DEAL-LIFECYCLE-01",
      sourceSystem: "zoho-crm",
      sourceRecordId: "DEAL-LIFE-001",
      recordOrigin: "IMPORTED_CSV",
      dealName: "Oakwood Condominium Lobby",
      stage: "Proposal",
      amount: 90000,
      currency: "USD",
      ownerName: "", // missing owner
      ownerEmail: "",
      probabilityPercentage: 50,
      scopeSummary: "", // missing next action
      closingDate: "2026-12-01",
      architecturalType: "Commercial",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    });
  });

  afterAll(async () => {
    await resetDatabaseClient();
  });

  it("IDEMPOTENT DETECTION & DEDUPLICATION: creates exceptions on Run 1, bumps count without duplicating on Run 2", async () => {
    // Run 1
    const run1 = await engine.runAllDetectors(new Date("2026-11-24T12:00:00Z"));
    expect(run1.newCount).toBeGreaterThan(0);
    expect(run1.updatedCount).toBe(0);

    const initialList = await engine.listExceptions();
    const initialCount = initialList.length;
    expect(initialCount).toBeGreaterThan(0);

    const targetExc = initialList.find((e) => e.sourceRecordId === "DEAL-LIFE-001");
    expect(targetExc).toBeDefined();
    expect(targetExc?.status).toBe("NEW");
    expect(targetExc?.detectedCount).toBe(1);

    // Run 2: Immediately execute detection again
    const run2 = await engine.runAllDetectors(new Date("2026-11-24T12:05:00Z"));
    expect(run2.newCount).toBe(0); // 0 new exceptions created
    expect(run2.updatedCount).toBeGreaterThan(0); // Existing exceptions updated

    const afterList = await engine.listExceptions();
    expect(afterList.length).toBe(initialCount); // Zero duplicate rows inserted

    const afterExc = await engine.getExceptionById(targetExc!.id);
    expect(afterExc?.detectedCount).toBe(2); // Bumped detected count
  });

  it("AUDITED LIFECYCLE TRANSITIONS: transitions NEW -> ACKNOWLEDGED -> RESOLVED with event history", async () => {
    const list = await engine.listExceptions({ status: "NEW" });
    const target = list[0];
    expect(target).toBeDefined();

    // 1. Acknowledge exception
    const acknowledged = await engine.transitionException({
      exceptionId: target.id,
      toStatus: "ACKNOWLEDGED",
      actorId: "usr-pm-nameeta",
      actorRole: "Project Manager",
      reason: "Acknowledged by Nameeta during Monday review",
    });
    expect(acknowledged.status).toBe("ACKNOWLEDGED");

    // 2. Resolve exception
    const resolved = await engine.transitionException({
      exceptionId: target.id,
      toStatus: "RESOLVED",
      actorId: "usr-sales-sarah",
      actorRole: "Sales Lead",
      reason: "Assigned owner and scheduled follow-up meeting with client",
    });
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeDefined();

    // 3. Verify immutable lifecycle events history
    const events = await engine.getLifecycleEvents(target.id);
    expect(events.length).toBeGreaterThanOrEqual(3); // NEW -> ACKNOWLEDGED -> RESOLVED
    expect(events.some((e) => e.toStatus === "ACKNOWLEDGED")).toBe(true);
    expect(events.some((e) => e.toStatus === "RESOLVED")).toBe(true);
  });

  it("MANDATORY DISMISSAL REASON: fails transition to DISMISSED if reason is omitted", async () => {
    const list = await engine.listExceptions();
    const target = list[0];

    await expect(
      engine.transitionException({
        exceptionId: target.id,
        toStatus: "DISMISSED",
        actorId: "usr-admin-alex",
        actorRole: "Admin",
        reason: "", // Omitted reason
      })
    ).rejects.toThrow(/dismissal reason is mandatory/);

    const dismissed = await engine.transitionException({
      exceptionId: target.id,
      toStatus: "DISMISSED",
      actorId: "usr-admin-alex",
      actorRole: "Admin",
      reason: "Internal test deal; deliberate sandbox fixture exception",
    });
    expect(dismissed.status).toBe("DISMISSED");
    expect(dismissed.dismissedReason).toContain("Internal test deal");
  });

  it("REOPEN-ON-RECURRENCE: automatically reopens resolved exception if condition persists in source data", async () => {
    const list = await engine.listExceptions();
    const target = list.find((e) => e.sourceRecordId === "DEAL-LIFE-001");
    expect(target).toBeDefined();

    // Ensure it is currently marked RESOLVED
    await engine.transitionException({
      exceptionId: target!.id,
      toStatus: "RESOLVED",
      actorId: "usr-irwin-ceo",
      actorRole: "Executive",
      reason: "Premature resolution test",
    });

    const beforeRun = await engine.getExceptionById(target!.id);
    expect(beforeRun?.status).toBe("RESOLVED");

    // The deal in the database STILL has missing owner and missing next action!
    // Re-running detectors MUST detect the persistent defect and reopen it.
    const run = await engine.runAllDetectors(new Date("2026-11-24T14:00:00Z"));
    expect(run.reopenedCount).toBeGreaterThan(0);

    const afterRun = await engine.getExceptionById(target!.id);
    expect(afterRun?.status).toBe("NEW"); // Reopened!

    const events = await engine.getLifecycleEvents(target!.id);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.toStatus).toBe("NEW");
    expect(lastEvent.reason).toContain("Automatically reopened");
  });
});
