import { describe, expect, it } from "vitest";
import { S01InactivityDetector } from "../src/exceptions/detectors/s01-detector";
import { CanonicalDeal } from "../src/canonical/types";

describe("S01 Inactivity & Stalled Deal Detector (Section 3)", () => {
  const detector = new S01InactivityDetector({
    inactivityThresholdBusinessDays: 5,
    timezone: "America/Toronto",
  });

  const now = new Date("2026-11-24T12:00:00Z"); // Tuesday

  it("flags open deals missing an owner", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-01",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-001",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Highland Residences Phase 1",
        stage: "Proposal",
        amount: 85000,
        currency: "USD",
        ownerName: "", // missing owner
        ownerEmail: "",
        probabilityPercentage: 60,
        scopeSummary: "Complete BIM architectural package",
        closingDate: "2026-12-15",
        architecturalType: "Commercial",
        createdAt: "2026-11-20T10:00:00Z",
        updatedAt: "2026-11-20T10:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDeals(deals, now);
    const noOwner = exceptions.find((e) => e.type === "S01_DEAL_NO_OWNER");
    expect(noOwner).toBeDefined();
    expect(noOwner?.severity).toBe("HIGH");
    expect(noOwner?.sourceRecordId).toBe("DEAL-001");
    expect(noOwner?.evidence.ruleId).toBe("S01-RULE-01");
  });

  it("flags open deals missing next action / scope summary", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-02",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-002",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Bay Street Commercial Tower",
        stage: "Negotiation",
        amount: 150000,
        currency: "USD",
        ownerName: "Sarah Chen",
        ownerEmail: "sarah.sales@designtwg.com",
        probabilityPercentage: 80,
        scopeSummary: "", // missing next action
        closingDate: "2026-12-20",
        architecturalType: "Commercial",
        createdAt: "2026-11-20T10:00:00Z",
        updatedAt: "2026-11-20T10:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDeals(deals, now);
    const noNextAction = exceptions.find((e) => e.type === "S01_DEAL_NO_NEXT_ACTION");
    expect(noNextAction).toBeDefined();
    expect(noNextAction?.evidence.ruleId).toBe("S01-RULE-02");
  });

  it("flags open deals missing closing/follow-up date", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-03",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-003",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Yorkville Restaurant Renovation",
        stage: "Qualification",
        amount: 60000,
        currency: "USD",
        ownerName: "Sarah Chen",
        ownerEmail: "sarah.sales@designtwg.com",
        probabilityPercentage: 40,
        scopeSummary: "Schedule preliminary site walk",
        closingDate: "", // missing closing date
        architecturalType: "Commercial",
        createdAt: "2026-11-20T10:00:00Z",
        updatedAt: "2026-11-20T10:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDeals(deals, now);
    const noClosingDate = exceptions.find((e) => e.type === "S01_DEAL_NO_FOLLOWUP_DATE");
    expect(noClosingDate).toBeDefined();
    expect(noClosingDate?.severity).toBe("MEDIUM");
  });

  it("flags deals inactive beyond threshold (>5 business days) while ignoring weekends", () => {
    // 7 business days inactive (updated Tuesday 2026-11-10, evaluated Tuesday 2026-11-24)
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-04",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-004",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Metropolis Hotel Suite Expansion",
        stage: "Proposal",
        amount: 190000,
        currency: "USD",
        ownerName: "Irwin",
        ownerEmail: "irwin@designtwg.com",
        probabilityPercentage: 70,
        scopeSummary: "Awaiting board approval",
        closingDate: "2026-12-30",
        architecturalType: "Commercial",
        createdAt: "2026-11-01T10:00:00Z",
        updatedAt: "2026-11-10T10:00:00Z", // 10 business days ago
      },
    ];

    const exceptions = detector.evaluateDeals(deals, now);
    const inactive = exceptions.find((e) => e.type === "S01_DEAL_INACTIVE_5_DAYS");
    expect(inactive).toBeDefined();
    expect(inactive?.severity).toBe("HIGH");
    expect((inactive?.evidence.facts as { businessDaysInactive: number }).businessDaysInactive).toBeGreaterThanOrEqual(5);
  });

  it("ignores Closed Won and Closed Lost deals even if inactive or missing fields", () => {
    const deals: CanonicalDeal[] = [
      {
        canonicalId: "CANON-05",
        sourceSystem: "zoho-crm",
        sourceRecordId: "DEAL-005",
        recordOrigin: "IMPORTED_CSV",
        dealName: "Completed Flagship Project",
        stage: "Closed Won",
        amount: 300000,
        currency: "USD",
        ownerName: "", // missing owner
        probabilityPercentage: 100,
        scopeSummary: "",
        closingDate: "2026-01-01",
        architecturalType: "Commercial",
        createdAt: "2025-01-01T10:00:00Z",
        updatedAt: "2025-01-01T10:00:00Z",
      },
    ];

    const exceptions = detector.evaluateDeals(deals, now);
    expect(exceptions.length).toBe(0);
  });
});
