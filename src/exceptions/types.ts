export type ExceptionCategory = "BUSINESS" | "DATA_QUALITY";

export type ExceptionSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ExceptionStatus = "NEW" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export type ExceptionType =
  // S01 Sales Exceptions
  | "S01_DEAL_NO_NEXT_ACTION"
  | "S01_DEAL_NO_OWNER"
  | "S01_DEAL_NO_FOLLOWUP_DATE"
  | "S01_DEAL_INACTIVE_5_DAYS"
  // O02 Operations Exceptions
  | "O02_MILESTONE_OVERDUE"
  | "O02_MILESTONE_AT_RISK"
  | "O02_UNASSIGNED_CRITICAL_TASK"
  // Data Quality Exceptions
  | "DQ_MISSING_REQUIRED_FIELD"
  | "DQ_INVALID_DATE_FORMAT"
  | "DQ_STALE_SYNC"
  | "DQ_ORPHAN_REFERENCE";

export interface ExceptionEvidence {
  sourceSystem: string;
  sourceRecordId: string;
  ruleId: string;
  ruleDescription: string;
  evaluatedAt: string;
  facts: Record<string, unknown>;
}

export interface ExceptionRecord {
  id: string;
  dedupHash: string;
  category: ExceptionCategory;
  type: ExceptionType;
  severity: ExceptionSeverity;
  sourceSystem: string;
  sourceRecordId: string;
  recordLabel: string;
  title: string;
  description: string;
  evidence: ExceptionEvidence;
  ownerName?: string;
  ownerEmail?: string;
  status: ExceptionStatus;
  detectedCount: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt?: string;
  dismissedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionLifecycleEvent {
  id: string;
  exceptionId: string;
  fromStatus: ExceptionStatus;
  toStatus: ExceptionStatus;
  actorId: string;
  actorRole: string;
  reason?: string;
  timestamp: string;
}

export interface ExceptionFilterOptions {
  category?: ExceptionCategory;
  type?: ExceptionType;
  severity?: ExceptionSeverity;
  status?: ExceptionStatus;
  ownerEmail?: string;
  sourceSystem?: string;
  limit?: number;
  offset?: number;
}
