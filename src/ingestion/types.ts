export type IngestionEntityType =
  | "customers"
  | "contacts"
  | "deals"
  | "projects"
  | "milestones"
  | "documents"
  | "invoices";

export interface RowValidationIssue {
  rowNumber: number;
  field: string;
  severity: "ERROR" | "WARNING";
  code:
    | "REQUIRED_FIELD_MISSING"
    | "INVALID_DATA_TYPE"
    | "INVALID_DATE_FORMAT"
    | "INVALID_CURRENCY"
    | "INVALID_EMAIL"
    | "DUPLICATE_IDENTIFIER"
    | "ORPHANED_REFERENCE"
    | "CONFLICTING_EXISTING_RECORD"
    | "UNKNOWN_HEADER";
  message: string;
  rawValue?: unknown;
}

export interface RowValidationResult<T = unknown> {
  rowNumber: number;
  success: boolean;
  rawRow: Record<string, string>;
  canonicalData?: T;
  issues: RowValidationIssue[];
}

export interface IngestionValidationReport {
  entityType: IngestionEntityType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateCount: number;
  orphanedRefCount: number;
  conflictCount: number;
  rowResults: RowValidationResult[];
  summaryErrors: string[];
  canProceedWithImport: boolean;
  generatedAt: string;
}

export interface IngestionExecutionOptions {
  dryRun?: boolean;
  allowDuplicates?: boolean;
  onConflict?: "reject" | "skip";
  auditId?: string;
}

export interface IngestionExecutionResult {
  entityType: IngestionEntityType;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  dryRun: boolean;
  auditId: string;
  timestamp: string;
  report: IngestionValidationReport;
}
