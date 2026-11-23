import crypto from "node:crypto";
import { CanonicalDeal } from "../../canonical/types";
import { ExceptionRecord } from "../types";
import { getBusinessDaysDiff, DEFAULT_TIMEZONE } from "../../utils/business-days";

export interface S01DetectorConfig {
  inactivityThresholdBusinessDays: number;
  timezone: string;
}

export const DEFAULT_S01_CONFIG: S01DetectorConfig = {
  inactivityThresholdBusinessDays: 5,
  timezone: DEFAULT_TIMEZONE,
};

export class S01InactivityDetector {
  constructor(private readonly config: S01DetectorConfig = DEFAULT_S01_CONFIG) {}

  public evaluateDeals(deals: CanonicalDeal[], referenceNow: Date = new Date()): ExceptionRecord[] {
    const exceptions: ExceptionRecord[] = [];

    // Filter to active open deals (exclude Closed Won and Closed Lost)
    const openDeals = deals.filter(
      (d) => !["Closed Won", "Closed Lost"].includes(d.stage)
    );

    for (const deal of openDeals) {
      // 1. Rule S01-1: Open qualified deal missing an owner
      if (!deal.ownerName || deal.ownerName.trim() === "" || deal.ownerName.toLowerCase() === "unassigned") {
        exceptions.push(this.createException({
          deal,
          type: "S01_DEAL_NO_OWNER",
          severity: "HIGH",
          title: `Unassigned Opportunity: ${deal.dealName}`,
          description: `Open deal valued at $${deal.amount.toLocaleString()} is currently unassigned with no designated sales representative.`,
          ruleId: "S01-RULE-01",
          ruleDescription: "Active commercial deals must have an assigned account executive or sales lead.",
          evaluatedAt: referenceNow.toISOString(),
          facts: {
            dealId: deal.sourceRecordId,
            dealName: deal.dealName,
            stage: deal.stage,
            amount: deal.amount,
            ownerName: deal.ownerName || null,
          },
        }));
      }

      // 2. Rule S01-2: Open deal missing next action / next step
      if (!deal.scopeSummary || deal.scopeSummary.trim() === "") {
        exceptions.push(this.createException({
          deal,
          type: "S01_DEAL_NO_NEXT_ACTION",
          severity: "HIGH",
          title: `Missing Next Action: ${deal.dealName}`,
          description: `Open deal in '${deal.stage}' stage has no recorded next action or immediate follow-up plan.`,
          ruleId: "S01-RULE-02",
          ruleDescription: "Qualified sales opportunities must maintain an explicit next action to prevent deal stall.",
          evaluatedAt: referenceNow.toISOString(),
          facts: {
            dealId: deal.sourceRecordId,
            dealName: deal.dealName,
            stage: deal.stage,
            amount: deal.amount,
            nextAction: null,
          },
        }));
      }

      // 3. Rule S01-3: Open deal missing target closing / follow-up date
      if (!deal.closingDate || deal.closingDate.trim() === "") {
        exceptions.push(this.createException({
          deal,
          type: "S01_DEAL_NO_FOLLOWUP_DATE",
          severity: "MEDIUM",
          title: `Missing Follow-Up Date: ${deal.dealName}`,
          description: `Open opportunity has no target closing or scheduled client follow-up date.`,
          ruleId: "S01-RULE-03",
          ruleDescription: "Deals require a target closing date for pipeline forecasting and SLA enforcement.",
          evaluatedAt: referenceNow.toISOString(),
          facts: {
            dealId: deal.sourceRecordId,
            dealName: deal.dealName,
            closingDate: null,
          },
        }));
      }

      // 4. Rule S01-4: Deal showing no recorded activity beyond threshold (default: 5 business days)
      const lastActivityTime = deal.updatedAt || deal.createdAt;
      if (lastActivityTime) {
        const businessDaysElapsed = getBusinessDaysDiff(
          lastActivityTime,
          referenceNow,
          this.config.timezone
        );

        if (businessDaysElapsed >= this.config.inactivityThresholdBusinessDays) {
          exceptions.push(this.createException({
            deal,
            type: "S01_DEAL_INACTIVE_5_DAYS",
            severity: "HIGH",
            title: `Stalled Sales Opportunity (${businessDaysElapsed} business days inactive): ${deal.dealName}`,
            description: `Deal has had no recorded sales activity or note updates for ${businessDaysElapsed} business days (threshold: ${this.config.inactivityThresholdBusinessDays} business days).`,
            ruleId: "S01-RULE-04",
            ruleDescription: "Deals with >5 business days of silence trigger sales lead follow-up review.",
            evaluatedAt: referenceNow.toISOString(),
            facts: {
              dealId: deal.sourceRecordId,
              dealName: deal.dealName,
              stage: deal.stage,
              amount: deal.amount,
              lastActivityDate: lastActivityTime,
              businessDaysInactive: businessDaysElapsed,
              threshold: this.config.inactivityThresholdBusinessDays,
            },
          }));
        }
      }
    }

    return exceptions;
  }

  private createException(params: {
    deal: CanonicalDeal;
    type: ExceptionRecord["type"];
    severity: ExceptionRecord["severity"];
    title: string;
    description: string;
    ruleId: string;
    ruleDescription: string;
    evaluatedAt: string;
    facts: Record<string, unknown>;
  }): ExceptionRecord {
    const dedupSource = `zoho-crm:${params.deal.sourceRecordId}:${params.type}`;
    const dedupHash = crypto.createHash("sha256").update(dedupSource).digest("hex");
    const exceptionId = `EXC-S01-${dedupHash.slice(0, 12)}`;

    return {
      id: exceptionId,
      dedupHash,
      category: "BUSINESS",
      type: params.type,
      severity: params.severity,
      sourceSystem: "zoho-crm",
      sourceRecordId: params.deal.sourceRecordId,
      recordLabel: params.deal.dealName,
      title: params.title,
      description: params.description,
      evidence: {
        sourceSystem: "zoho-crm",
        sourceRecordId: params.deal.sourceRecordId,
        ruleId: params.ruleId,
        ruleDescription: params.ruleDescription,
        evaluatedAt: params.evaluatedAt,
        facts: params.facts,
      },
      ownerName: params.deal.ownerName || undefined,
      ownerEmail: params.deal.ownerEmail || undefined,
      status: "NEW",
      detectedCount: 1,
      firstDetectedAt: params.evaluatedAt,
      lastDetectedAt: params.evaluatedAt,
      createdAt: params.evaluatedAt,
      updatedAt: params.evaluatedAt,
    };
  }
}
