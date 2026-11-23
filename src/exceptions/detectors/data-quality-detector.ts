import crypto from "node:crypto";
import {
  CanonicalDeal,
  CanonicalProject,
  CanonicalMilestone,
  CanonicalFinancialRecord,
  CanonicalCustomer,
} from "../../canonical/types";
import { ExceptionRecord } from "../types";

export class DataQualityDetector {
  public evaluateDataQuality(params: {
    customers: CanonicalCustomer[];
    deals: CanonicalDeal[];
    projects: CanonicalProject[];
    milestones: CanonicalMilestone[];
    invoices: CanonicalFinancialRecord[];
    lastSyncTimestamp?: string;
    referenceNow?: Date;
  }): ExceptionRecord[] {
    const referenceNow = params.referenceNow || new Date();
    const exceptions: ExceptionRecord[] = [];

    const customerIds = new Set(params.customers.map((c) => c.sourceRecordId));
    const projectIds = new Set(params.projects.map((p) => p.sourceRecordId));

    // 1. Check Date Formats across deals and milestones
    for (const deal of params.deals) {
      if (deal.closingDate) {
        const isIsoFormat = /^\d{4}-\d{2}-\d{2}/.test(deal.closingDate) && !isNaN(new Date(deal.closingDate).getTime());
        if (!isIsoFormat) {
          exceptions.push(this.createDqException({
            sourceSystem: "zoho-crm",
            sourceRecordId: deal.sourceRecordId,
            recordLabel: deal.dealName,
            type: "DQ_INVALID_DATE_FORMAT",
            severity: "MEDIUM",
            title: `Invalid Date Format in Deal: ${deal.dealName}`,
            description: `Closing date string '${deal.closingDate}' cannot be parsed as a valid ISO-8601 timestamp.`,
            ruleId: "DQ-RULE-01",
            facts: { field: "closingDate", rawValue: deal.closingDate },
            evaluatedAt: referenceNow.toISOString(),
          }));
        }
      }

      // Check Orphaned Customer reference
      if (deal.accountReferenceId && !customerIds.has(deal.accountReferenceId)) {
        exceptions.push(this.createDqException({
          sourceSystem: "zoho-crm",
          sourceRecordId: deal.sourceRecordId,
          recordLabel: deal.dealName,
          type: "DQ_ORPHAN_REFERENCE",
          severity: "HIGH",
          title: `Orphaned Customer Reference: ${deal.dealName}`,
          description: `Deal references Account '${deal.accountReferenceId}' which does not exist in canonical customer records.`,
          ruleId: "DQ-RULE-02",
          facts: { referencedAccountId: deal.accountReferenceId },
          evaluatedAt: referenceNow.toISOString(),
        }));
      }
    }

    // 2. Check Invoices referencing nonexistent Projects
    for (const inv of params.invoices) {
      if (inv.projectReferenceId && !projectIds.has(inv.projectReferenceId)) {
        exceptions.push(this.createDqException({
          sourceSystem: "quickbooks",
          sourceRecordId: inv.sourceRecordId,
          recordLabel: `Invoice ${inv.invoiceNumber}`,
          type: "DQ_ORPHAN_REFERENCE",
          severity: "HIGH",
          title: `Orphaned Project on Invoice: ${inv.invoiceNumber}`,
          description: `Invoice references Project '${inv.projectReferenceId}' which does not exist in canonical project records.`,
          ruleId: "DQ-RULE-03",
          facts: { referencedProjectId: inv.projectReferenceId },
          evaluatedAt: referenceNow.toISOString(),
        }));
      }
    }

    // 3. Check Stale Sync (> 24 hours without sync/import)
    if (params.lastSyncTimestamp) {
      const syncAgeHours = (referenceNow.getTime() - new Date(params.lastSyncTimestamp).getTime()) / (1000 * 60 * 60);
      if (syncAgeHours > 24) {
        exceptions.push(this.createDqException({
          sourceSystem: "system",
          sourceRecordId: "CANONICAL-SYNC-STATUS",
          recordLabel: "Canonical Integration Sync",
          type: "DQ_STALE_SYNC",
          severity: "MEDIUM",
          title: `Stale Data Sync (${Math.round(syncAgeHours)} hours elapsed)`,
          description: `Last recorded data synchronization or CSV import occurred ${Math.round(syncAgeHours)} hours ago (threshold: 24h).`,
          ruleId: "DQ-RULE-04",
          facts: { lastSyncTimestamp: params.lastSyncTimestamp, ageHours: syncAgeHours },
          evaluatedAt: referenceNow.toISOString(),
        }));
      }
    }

    return exceptions;
  }

  private createDqException(params: {
    sourceSystem: string;
    sourceRecordId: string;
    recordLabel: string;
    type: ExceptionRecord["type"];
    severity: ExceptionRecord["severity"];
    title: string;
    description: string;
    ruleId: string;
    facts: Record<string, unknown>;
    evaluatedAt: string;
  }): ExceptionRecord {
    const dedupSource = `${params.sourceSystem}:${params.sourceRecordId}:${params.type}`;
    const dedupHash = crypto.createHash("sha256").update(dedupSource).digest("hex");
    const exceptionId = `EXC-DQ-${dedupHash.slice(0, 12)}`;

    return {
      id: exceptionId,
      dedupHash,
      category: "DATA_QUALITY",
      type: params.type,
      severity: params.severity,
      sourceSystem: params.sourceSystem,
      sourceRecordId: params.sourceRecordId,
      recordLabel: params.recordLabel,
      title: params.title,
      description: params.description,
      evidence: {
        sourceSystem: params.sourceSystem,
        sourceRecordId: params.sourceRecordId,
        ruleId: params.ruleId,
        ruleDescription: "Data quality validation check",
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
