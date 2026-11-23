import { describe, expect, it } from "vitest";
import { DataQualityDetector } from "../src/exceptions/detectors/data-quality-detector";
import {
  CanonicalDeal,
  CanonicalCustomer,
  CanonicalFinancialRecord,
} from "../src/canonical/types";

describe("Data-Quality Exception Detector (Section 8 Invariant)", () => {
  const detector = new DataQualityDetector();
  const now = new Date("2026-11-24T12:00:00Z");

  it("detects invalid date format strings in deals and milestones", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-DQ-01",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-BAD-DATE",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Invalid Date Deal",
        stage: "Qualification",
        amount: 50000,
        currency: "USD",
        ownerName: "Sarah Chen",
        probabilityPercentage: 50,
        closingDate: "invalid-date-format-99", // Malformed string
        architecturalType: "Commercial",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDataQuality({
      customers: [],
      deals,
      projects: [],
      milestones: [],
      invoices: [],
      referenceNow: now,
    });

    const badDateExc = exceptions.find((e) => e.type === "DQ_INVALID_DATE_FORMAT");
    expect(badDateExc).toBeDefined();
    expect(badDateExc?.category).toBe("DATA_QUALITY");
    expect(badDateExc?.evidence.ruleId).toBe("DQ-RULE-01");
  });

  it("detects orphaned customer references where deal references nonexistent account", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-DQ-02",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-ORPHAN-CUST",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Orphaned Customer Deal",
        stage: "Qualification",
        amount: 80000,
        currency: "USD",
        accountReferenceId: "ACC-DOES-NOT-EXIST", // Orphaned
        ownerName: "Sarah Chen",
        probabilityPercentage: 50,
        closingDate: "2026-12-31",
        architecturalType: "Commercial",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDataQuality({
      customers: [], // No matching customer
      deals,
      projects: [],
      milestones: [],
      invoices: [],
      referenceNow: now,
    });

    const orphanExc = exceptions.find((e) => e.type === "DQ_ORPHAN_REFERENCE");
    expect(orphanExc).toBeDefined();
    expect(orphanExc?.category).toBe("DATA_QUALITY");
    expect(orphanExc?.severity).toBe("HIGH");
  });

  it("detects stale sync imports older than 24 hours", () => {
    const staleSyncTimestamp = "2026-11-20T10:00:00Z"; // 4 days ago

    const exceptions = detector.evaluateDataQuality({
      customers: [],
      deals: [],
      projects: [],
      milestones: [],
      invoices: [],
      lastSyncTimestamp: staleSyncTimestamp,
      referenceNow: now,
    });

    const staleExc = exceptions.find((e) => e.type === "DQ_STALE_SYNC");
    expect(staleExc).toBeDefined();
    expect(staleExc?.category).toBe("DATA_QUALITY");
    expect(staleExc?.evidence.ruleId).toBe("DQ-RULE-04");
  });
});
