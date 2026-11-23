import { describe, expect, it } from "vitest";
import { CanonicalDataRegistry } from "../src/ingestion/registry";
import { ControlledTransferPipeline } from "../src/transfer/pipeline";
import { CSV_TEMPLATES } from "../src/ingestion/templates";

describe("8-Step Controlled Transfer Pipeline", () => {
  it("executes 8 steps in dry-run mode without mutating canonical registry", () => {
    const registry = new CanonicalDataRegistry();
    const pipeline = new ControlledTransferPipeline(registry);
    const initialCustomerCount = registry.getCustomers().length;

    const result = pipeline.execute("customers", CSV_TEMPLATES.customers, { dryRun: true });

    expect(result.stepLogs.length).toBe(8);
    expect(result.dryRun).toBe(true);
    expect(result.idempotencyKey).toMatch(/^IDEMP-customers-/);
    expect(result.sanitizedAuditMetadata.payloadHash).toBeDefined();

    // Registry remains unmutated
    expect(registry.getCustomers().length).toBe(initialCustomerCount);
  });

  it("commits records on authorized execution and logs sanitized audit entry", () => {
    const registry = new CanonicalDataRegistry();
    const pipeline = new ControlledTransferPipeline(registry);

    const result = pipeline.execute("customers", CSV_TEMPLATES.customers, { dryRun: false });

    expect(result.stepLogs.length).toBe(8);
    expect(result.importedRecordsCount).toBe(3);
    expect(result.failedRecordsCount).toBe(0);

    const auditLogs = registry.getAuditLog();
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].auditId).toBe(result.pipelineId);
  });

  it("enforces read-only safety invariant on financial invoice imports", () => {
    const registry = new CanonicalDataRegistry();
    const pipeline = new ControlledTransferPipeline(registry);

    const result = pipeline.execute("invoices", CSV_TEMPLATES.invoices, { dryRun: true });
    expect(result.sanitizedAuditMetadata.readOnlyProtected).toBe(true);
  });
});
