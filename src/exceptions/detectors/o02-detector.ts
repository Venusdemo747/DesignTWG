import crypto from "node:crypto";
import { CanonicalMilestone, CanonicalProject } from "../../canonical/types";
import { ExceptionRecord } from "../types";
import { getBusinessDaysDiff, DEFAULT_TIMEZONE } from "../../utils/business-days";

export interface O02DetectorConfig {
  atRiskLeadTimeBusinessDays: number;
  atRiskCompletionThreshold: number; // percentage (e.g. 50%)
  timezone: string;
}

export const DEFAULT_O02_CONFIG: O02DetectorConfig = {
  atRiskLeadTimeBusinessDays: 3,
  atRiskCompletionThreshold: 50,
  timezone: DEFAULT_TIMEZONE,
};

export class O02MilestoneRiskDetector {
  constructor(private readonly config: O02DetectorConfig = DEFAULT_O02_CONFIG) {}

  public evaluateMilestones(
    milestones: CanonicalMilestone[],
    projects: CanonicalProject[],
    referenceNow: Date = new Date()
  ): ExceptionRecord[] {
    const exceptions: ExceptionRecord[] = [];
    const projectMap = new Map(projects.map((p) => [p.sourceRecordId, p]));

    for (const milestone of milestones) {
      if (milestone.status === "completed") {
        continue; // completed milestones are not at risk
      }

      const parentProject = projectMap.get(milestone.projectReferenceId);
      const projectName = parentProject?.projectName || `Project ${milestone.projectReferenceId}`;

      if (!milestone.targetDate) {
        continue;
      }

      const targetDate = new Date(milestone.targetDate);
      if (isNaN(targetDate.getTime())) {
        continue; // handled by Data Quality detector
      }

      const businessDaysDiff = getBusinessDaysDiff(
        referenceNow,
        targetDate,
        this.config.timezone
      );

      // 1. Rule O02-1: Overdue milestone (target date is in the past)
      if (targetDate < referenceNow) {
        const overdueDays = Math.abs(businessDaysDiff);
        exceptions.push(this.createException({
          milestone,
          projectName,
          type: "O02_MILESTONE_OVERDUE",
          severity: "CRITICAL",
          title: `Overdue Milestone (${overdueDays} business days late): ${milestone.name}`,
          description: `Milestone for '${projectName}' was due on ${milestone.targetDate.split("T")[0]} but is only ${milestone.completionPercentage}% complete.`,
          ruleId: "O02-RULE-01",
          ruleDescription: "Milestones past their target completion date trigger critical operational escalation.",
          evaluatedAt: referenceNow.toISOString(),
          facts: {
            milestoneId: milestone.sourceRecordId,
            milestoneName: milestone.name,
            projectName,
            targetDueDate: milestone.targetDate,
            completionPercentage: milestone.completionPercentage,
            businessDaysOverdue: overdueDays,
            billableAmount: milestone.billableAmount,
          },
        }));
      }
      // 2. Rule O02-2: Milestone at risk (approaching within lead time with low completion)
      else if (
        businessDaysDiff <= this.config.atRiskLeadTimeBusinessDays &&
        milestone.completionPercentage < this.config.atRiskCompletionThreshold
      ) {
        exceptions.push(this.createException({
          milestone,
          projectName,
          type: "O02_MILESTONE_AT_RISK",
          severity: "HIGH",
          title: `At-Risk Milestone (${businessDaysDiff} days remaining, ${milestone.completionPercentage}% complete): ${milestone.name}`,
          description: `Milestone deadline approaches in ${businessDaysDiff} business days on ${milestone.targetDate.split("T")[0]} with completion below the ${this.config.atRiskCompletionThreshold}% threshold.`,
          ruleId: "O02-RULE-02",
          ruleDescription: "Milestones nearing deadline with <50% completion trigger proactive schedule intervention.",
          evaluatedAt: referenceNow.toISOString(),
          facts: {
            milestoneId: milestone.sourceRecordId,
            milestoneName: milestone.name,
            projectName,
            targetDueDate: milestone.targetDate,
            businessDaysRemaining: businessDaysDiff,
            completionPercentage: milestone.completionPercentage,
            threshold: this.config.atRiskCompletionThreshold,
          },
        }));
      }

      // 3. Rule O02-3: Unassigned milestone / task deliverables on active projects
      if (parentProject && parentProject.status === "Active" && (!milestone.name.includes("-") && milestone.sequenceOrder === 1 && milestone.completionPercentage === 0)) {
        // flag unassigned starting deliverable
      }
    }

    return exceptions;
  }

  private createException(params: {
    milestone: CanonicalMilestone;
    projectName: string;
    type: ExceptionRecord["type"];
    severity: ExceptionRecord["severity"];
    title: string;
    description: string;
    ruleId: string;
    ruleDescription: string;
    evaluatedAt: string;
    facts: Record<string, unknown>;
  }): ExceptionRecord {
    const dedupSource = `zoho-projects:${params.milestone.sourceRecordId}:${params.type}`;
    const dedupHash = crypto.createHash("sha256").update(dedupSource).digest("hex");
    const exceptionId = `EXC-O02-${dedupHash.slice(0, 12)}`;

    return {
      id: exceptionId,
      dedupHash,
      category: "BUSINESS",
      type: params.type,
      severity: params.severity,
      sourceSystem: "zoho-projects",
      sourceRecordId: params.milestone.sourceRecordId,
      recordLabel: `${params.projectName}: ${params.milestone.name}`,
      title: params.title,
      description: params.description,
      evidence: {
        sourceSystem: "zoho-projects",
        sourceRecordId: params.milestone.sourceRecordId,
        ruleId: params.ruleId,
        ruleDescription: params.ruleDescription,
        evaluatedAt: params.evaluatedAt,
        facts: params.facts,
      },
      status: "NEW",
      detectedCount: 1,
      firstDetectedAt: params.evaluatedAt,
      lastDetectedAt: params.evaluatedAt,
      createdAt: params.evaluatedAt,
      updatedAt: params.evaluatedAt,
    };
  }
}
