import {
  CanonicalCustomer,
  CanonicalContact,
  CanonicalDeal,
  CanonicalProject,
  CanonicalMilestone,
  CanonicalDocument,
  CanonicalFinancialRecord,
  RecordOrigin,
} from "../canonical/types";
import {
  IngestionEntityType,
  IngestionExecutionOptions,
  IngestionExecutionResult,
  IngestionValidationReport,
} from "./types";
import { CsvIngestionValidator, ExistingReferenceIndex } from "./validator";

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  entityType: IngestionEntityType;
  totalProcessed: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  dryRun: boolean;
  sanitizedSummary: string;
}

export class CanonicalDataRegistry {
  private readonly customers = new Map<string, CanonicalCustomer>();
  private readonly contacts = new Map<string, CanonicalContact>();
  private readonly deals = new Map<string, CanonicalDeal>();
  private readonly projects = new Map<string, CanonicalProject>();
  private readonly milestones = new Map<string, CanonicalMilestone>();
  private readonly documents = new Map<string, CanonicalDocument>();
  private readonly invoices = new Map<string, CanonicalFinancialRecord>();

  private readonly auditLog: AuditRecord[] = [];

  constructor() {
    this.seedInitialSyntheticData();
  }

  private seedInitialSyntheticData(): void {
    const syntheticOrigin: RecordOrigin = "MOCK_SYNTHETIC";

    const cust1: CanonicalCustomer = {
      canonicalId: "TWG-CUST-SYN-001",
      sourceSystem: "zoho-crm",
      sourceRecordId: "SYN-ACC-001",
      recordOrigin: syntheticOrigin,
      companyName: "Oakwood Luxury Living LLC",
      displayName: "Oakwood Luxury Living LLC",
      primaryEmail: "mvance@oakwoodliving.com",
      currency: "USD",
      createdAt: "2026-10-22T08:00:00Z",
      updatedAt: "2026-10-22T08:00:00Z",
    };
    this.customers.set(cust1.sourceRecordId, cust1);

    const prj1: CanonicalProject = {
      canonicalId: "TWG-PRJ-SYN-701",
      sourceSystem: "zoho-projects",
      sourceRecordId: "SYN-PRJ-701",
      accountReferenceId: cust1.canonicalId,
      recordOrigin: syntheticOrigin,
      projectName: "Oakwood Estates - Luxury Residential Renovation",
      status: "Active",
      templateCode: "TWG-Residential-HighEnd-v4",
      budgetHours: 420,
      loggedHours: 115,
      totalContractValue: 185000,
      currency: "USD",
      startDate: "2026-10-22",
      createdAt: "2026-10-22T09:00:00Z",
      updatedAt: "2026-10-22T09:00:00Z",
    };
    this.projects.set(prj1.sourceRecordId, prj1);
  }

  public getExistingIndex(): ExistingReferenceIndex {
    const existingRecordsMap = new Map<string, Record<string, unknown>>();

    for (const [id, rec] of this.customers.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.contacts.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.deals.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.projects.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.milestones.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.documents.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }
    for (const [id, rec] of this.invoices.entries()) {
      existingRecordsMap.set(id, rec as unknown as Record<string, unknown>);
    }

    return {
      accountIds: new Set(this.customers.keys()),
      projectIds: new Set(this.projects.keys()),
      dealIds: new Set(this.deals.keys()),
      contactIds: new Set(this.contacts.keys()),
      invoiceIds: new Set(this.invoices.keys()),
      documentIds: new Set(this.documents.keys()),
      milestoneIds: new Set(this.milestones.keys()),
      existingRecordsMap,
    };
  }

  public previewValidation(
    entityType: IngestionEntityType,
    csvContent: string,
    recordOrigin: RecordOrigin = "IMPORTED_CSV",
  ): IngestionValidationReport {
    return CsvIngestionValidator.validate(
      entityType,
      csvContent,
      this.getExistingIndex(),
      recordOrigin,
    );
  }

  public executeImport(
    entityType: IngestionEntityType,
    csvContent: string,
    options: IngestionExecutionOptions = {},
    recordOrigin: RecordOrigin = "IMPORTED_CSV",
  ): IngestionExecutionResult {
    const report = this.previewValidation(entityType, csvContent, recordOrigin);
    const dryRun = options.dryRun ?? false;
    const auditId = options.auditId || `AUDIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let importedCount = 0;
    let skippedCount = 0;
    const failedCount = report.invalidRows;

    if (!dryRun) {
      for (const rowResult of report.rowResults) {
        if (!rowResult.success || !rowResult.canonicalData) {
          skippedCount++;
          continue;
        }

        const data = rowResult.canonicalData as { sourceRecordId: string };
        const id = data.sourceRecordId;

        // Never silently overwrite conflicting records
        const existing = this.getExistingIndex().existingRecordsMap.get(id);
        if (existing && options.onConflict === "reject") {
          skippedCount++;
          continue;
        }

        switch (entityType) {
          case "customers":
            this.customers.set(id, rowResult.canonicalData as CanonicalCustomer);
            importedCount++;
            break;
          case "contacts":
            this.contacts.set(id, rowResult.canonicalData as CanonicalContact);
            importedCount++;
            break;
          case "deals":
            this.deals.set(id, rowResult.canonicalData as CanonicalDeal);
            importedCount++;
            break;
          case "projects":
            this.projects.set(id, rowResult.canonicalData as CanonicalProject);
            importedCount++;
            break;
          case "milestones":
            this.milestones.set(id, rowResult.canonicalData as CanonicalMilestone);
            importedCount++;
            break;
          case "documents":
            this.documents.set(id, rowResult.canonicalData as CanonicalDocument);
            importedCount++;
            break;
          case "invoices":
            this.invoices.set(id, rowResult.canonicalData as CanonicalFinancialRecord);
            importedCount++;
            break;
        }
      }
    }

    const audit: AuditRecord = {
      auditId,
      timestamp: new Date().toISOString(),
      entityType,
      totalProcessed: report.totalRows,
      importedCount: dryRun ? 0 : importedCount,
      failedCount,
      skippedCount: dryRun ? report.totalRows : skippedCount,
      dryRun,
      sanitizedSummary: dryRun
        ? `Dry-run preview: ${report.validRows}/${report.totalRows} rows valid.`
        : `Ingested ${importedCount} records into canonical registry (${failedCount} failed, ${skippedCount} skipped).`,
    };

    this.auditLog.unshift(audit);

    return {
      entityType,
      importedCount: dryRun ? 0 : importedCount,
      skippedCount: dryRun ? report.totalRows : skippedCount,
      failedCount,
      dryRun,
      auditId,
      timestamp: audit.timestamp,
      report,
    };
  }

  public getCustomers(): CanonicalCustomer[] {
    return Array.from(this.customers.values());
  }

  public getContacts(): CanonicalContact[] {
    return Array.from(this.contacts.values());
  }

  public getDeals(): CanonicalDeal[] {
    return Array.from(this.deals.values());
  }

  public getProjects(): CanonicalProject[] {
    return Array.from(this.projects.values());
  }

  public getMilestones(): CanonicalMilestone[] {
    return Array.from(this.milestones.values());
  }

  public getDocuments(): CanonicalDocument[] {
    return Array.from(this.documents.values());
  }

  public getInvoices(): CanonicalFinancialRecord[] {
    return Array.from(this.invoices.values());
  }

  public getAuditLog(): AuditRecord[] {
    return [...this.auditLog];
  }

  public getCounts(): Record<string, { total: number; csvImported: number; mockSynthetic: number }> {
    const countCategory = (records: Array<{ recordOrigin: RecordOrigin }>) => ({
      total: records.length,
      csvImported: records.filter((r) => r.recordOrigin === "IMPORTED_CSV").length,
      mockSynthetic: records.filter((r) => r.recordOrigin === "MOCK_SYNTHETIC").length,
    });

    return {
      customers: countCategory(this.getCustomers()),
      contacts: countCategory(this.getContacts()),
      deals: countCategory(this.getDeals()),
      projects: countCategory(this.getProjects()),
      milestones: countCategory(this.getMilestones()),
      documents: countCategory(this.getDocuments()),
      invoices: countCategory(this.getInvoices()),
    };
  }
}
