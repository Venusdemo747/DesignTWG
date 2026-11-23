import { describe, expect, it } from "vitest";
import { O02MilestoneRiskDetector } from "../src/exceptions/detectors/o02-detector";
import { CanonicalMilestone, CanonicalProject } from "../src/canonical/types";

describe("O02 Milestone Risk & Schedule Slippage Detector (Section 4)", () => {
  const detector = new O02MilestoneRiskDetector({
    atRiskLeadTimeBusinessDays: 3,
    atRiskCompletionThreshold: 50,
    timezone: "America/Toronto",
  });

  const now = new Date("2026-11-24T12:00:00Z"); // Tuesday

  const projects: CanonicalProject[] = [
    {
      canonicalId: "CANON-PRJ-01",
      sourceSystem: "zoho-projects",
      sourceRecordId: "PRJ-001",
      recordOrigin: "IMPORTED_CSV",
      projectName: "Boutique Hotel Renovation",
      status: "Active",
      templateCode: "TMPL-ARCH-COMMERCIAL-5D",
      budgetHours: 450,
      loggedHours: 120,
      totalContractValue: 200000,
      currency: "USD",
      startDate: "2026-09-01",
      targetCompletionDate: "2027-02-28",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-11-20T00:00:00Z",
    },
  ];

  it("flags overdue milestones past target completion date with CRITICAL severity", () => {
    const milestones: CanonicalMilestone[] = [
      {
        canonicalId: "CANON-MLS-01",
        sourceSystem: "zoho-projects",
        sourceRecordId: "MLS-001",
        projectReferenceId: "PRJ-001",
        recordOrigin: "IMPORTED_CSV",
        name: "D1 Schematic Design Sign-Off",
        sequenceOrder: 1,
        status: "in_progress",
        targetDate: "2026-11-15T00:00:00Z", // 9 days in the past
        billableAmount: 40000,
        currency: "USD",
        invoiceTriggered: false,
        completionPercentage: 40,
      },
    ];

    const exceptions = detector.evaluateMilestones(milestones, projects, now);
    const overdue = exceptions.find((e) => e.type === "O02_MILESTONE_OVERDUE");
    expect(overdue).toBeDefined();
    expect(overdue?.severity).toBe("CRITICAL");
    expect(overdue?.evidence.ruleId).toBe("O02-RULE-01");
    expect((overdue?.evidence.facts as { businessDaysOverdue: number }).businessDaysOverdue).toBeGreaterThan(0);
  });

  it("flags at-risk milestones approaching deadline within lead time (<=3 days) with <50% completion", () => {
    const milestones: CanonicalMilestone[] = [
      {
        canonicalId: "CANON-MLS-02",
        sourceSystem: "zoho-projects",
        sourceRecordId: "MLS-002",
        projectReferenceId: "PRJ-001",
        recordOrigin: "IMPORTED_CSV",
        name: "D2 Design Development Review",
        sequenceOrder: 2,
        status: "in_progress",
        targetDate: "2026-11-26T12:00:00Z", // 2 business days from now
        billableAmount: 50000,
        currency: "USD",
        invoiceTriggered: false,
        completionPercentage: 20, // Low completion
      },
    ];

    const exceptions = detector.evaluateMilestones(milestones, projects, now);
    const atRisk = exceptions.find((e) => e.type === "O02_MILESTONE_AT_RISK");
    expect(atRisk).toBeDefined();
    expect(atRisk?.severity).toBe("HIGH");
    expect(atRisk?.evidence.ruleId).toBe("O02-RULE-02");
    expect((atRisk?.evidence.facts as { businessDaysRemaining: number }).businessDaysRemaining).toBeLessThanOrEqual(3);
  });

  it("ignores completed milestones even if completion date was past target date", () => {
    const milestones: CanonicalMilestone[] = [
      {
        canonicalId: "CANON-MLS-03",
        sourceSystem: "zoho-projects",
        sourceRecordId: "MLS-003",
        projectReferenceId: "PRJ-001",
        recordOrigin: "IMPORTED_CSV",
        name: "D1 Schematic Design Initial Gate",
        sequenceOrder: 1,
        status: "completed",
        targetDate: "2026-10-01T00:00:00Z",
        completionDate: "2026-10-05T00:00:00Z",
        billableAmount: 30000,
        currency: "USD",
        invoiceTriggered: true,
        completionPercentage: 100,
      },
    ];

    const exceptions = detector.evaluateMilestones(milestones, projects, now);
    expect(exceptions.length).toBe(0);
  });
});
