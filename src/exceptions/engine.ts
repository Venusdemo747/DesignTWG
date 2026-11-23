import crypto from "node:crypto";
import { IEntityRepository, PostgresEntityRepository } from "../db/repository";
import {
  ExceptionRecord,
  ExceptionFilterOptions,
  ExceptionStatus,
  ExceptionLifecycleEvent,
} from "./types";
import { S01InactivityDetector } from "./detectors/s01-detector";
import { O02MilestoneRiskDetector } from "./detectors/o02-detector";
import { DataQualityDetector } from "./detectors/data-quality-detector";

export interface ExceptionRunSummary {
  runId: string;
  timestamp: string;
  totalEvaluated: {
    deals: number;
    projects: number;
    milestones: number;
    invoices: number;
  };
  totalDetected: number;
  newCount: number;
  updatedCount: number;
  reopenedCount: number;
  exceptions: ExceptionRecord[];
}

export class ExceptionEngine {
  private readonly s01Detector = new S01InactivityDetector();
  private readonly o02Detector = new O02MilestoneRiskDetector();
  private readonly dqDetector = new DataQualityDetector();

  constructor(private readonly repo: IEntityRepository = new PostgresEntityRepository()) {}

  /**
   * Evaluates all detectors (S01, O02, Data Quality) against canonical data,
   * applying idempotent deduplication, state preservation, and reopen-on-recurrence.
   */
  public async runAllDetectors(referenceNow: Date = new Date()): Promise<ExceptionRunSummary> {
    const runId = `RUN-EXC-${Date.now()}`;
    const [deals, projects, milestones, invoices, customers] = await Promise.all([
      this.repo.getAllDeals(),
      this.repo.getAllProjects(),
      this.repo.getAllMilestones(),
      this.repo.getAllFinancialRecords(),
      this.repo.getAllCustomers(),
    ]);

    // 1. Execute deterministic detectors
    const s01Exceptions = this.s01Detector.evaluateDeals(deals, referenceNow);
    const o02Exceptions = this.o02Detector.evaluateMilestones(milestones, projects, referenceNow);
    const dqExceptions = this.dqDetector.evaluateDataQuality({
      customers,
      deals,
      projects,
      milestones,
      invoices,
      referenceNow,
    });

    const allDetected = [...s01Exceptions, ...o02Exceptions, ...dqExceptions];

    let newCount = 0;
    let updatedCount = 0;
    let reopenedCount = 0;
    const processedExceptions: ExceptionRecord[] = [];

    // 2. Process each detected exception through deduplication and lifecycle rules
    for (const detected of allDetected) {
      const existing = await this.repo.getExceptionByDedupHash(detected.dedupHash);

      if (!existing) {
        // Brand new exception
        await this.repo.saveException(detected);

        // Record initial lifecycle event
        await this.repo.transitionExceptionStatus({
          exceptionId: detected.id,
          toStatus: "NEW",
          actorId: "system_detector",
          actorRole: "System",
          reason: "Initial detection by deterministic rule engine",
        });

        newCount += 1;
        processedExceptions.push(detected);
      } else {
        // Existing exception
        if (existing.status === "RESOLVED" || existing.status === "DISMISSED") {
          // Reopen-on-recurrence invariant: condition persists or recurred in source system
          const reopened: ExceptionRecord = {
            ...existing,
            title: detected.title,
            description: detected.description,
            severity: detected.severity,
            evidence: detected.evidence,
            status: "NEW",
            detectedCount: existing.detectedCount + 1,
            lastDetectedAt: referenceNow.toISOString(),
            resolvedAt: undefined,
            dismissedReason: undefined,
            updatedAt: referenceNow.toISOString(),
          };

          await this.repo.saveException(reopened);

          await this.repo.transitionExceptionStatus({
            exceptionId: existing.id,
            toStatus: "NEW",
            actorId: "system_detector",
            actorRole: "System",
            reason: `Automatically reopened: condition persists in source data (${detected.evidence.ruleDescription})`,
          });

          reopenedCount += 1;
          processedExceptions.push(reopened);
        } else {
          // Exception already active (NEW or ACKNOWLEDGED) - update evidence and bump detection count without duplicating
          const updated: ExceptionRecord = {
            ...existing,
            title: detected.title,
            description: detected.description,
            severity: detected.severity,
            evidence: detected.evidence,
            detectedCount: existing.detectedCount + 1,
            lastDetectedAt: referenceNow.toISOString(),
            updatedAt: referenceNow.toISOString(),
          };

          await this.repo.saveException(updated);
          updatedCount += 1;
          processedExceptions.push(updated);
        }
      }
    }

    return {
      runId,
      timestamp: referenceNow.toISOString(),
      totalEvaluated: {
        deals: deals.length,
        projects: projects.length,
        milestones: milestones.length,
        invoices: invoices.length,
      },
      totalDetected: allDetected.length,
      newCount,
      updatedCount,
      reopenedCount,
      exceptions: processedExceptions,
    };
  }

  public async listExceptions(options: ExceptionFilterOptions = {}): Promise<ExceptionRecord[]> {
    return this.repo.listExceptions(options);
  }

  public async getExceptionById(id: string): Promise<ExceptionRecord | null> {
    return this.repo.getExceptionById(id);
  }

  public async transitionException(params: {
    exceptionId: string;
    toStatus: ExceptionStatus;
    actorId: string;
    actorRole: string;
    reason?: string;
  }): Promise<ExceptionRecord> {
    if (params.toStatus === "DISMISSED" && (!params.reason || params.reason.trim() === "")) {
      throw new Error("A specific dismissal reason is mandatory when dismissing an exception.");
    }
    return this.repo.transitionExceptionStatus(params);
  }

  public async getLifecycleEvents(exceptionId: string): Promise<ExceptionLifecycleEvent[]> {
    return this.repo.getExceptionLifecycleEvents(exceptionId);
  }
}
