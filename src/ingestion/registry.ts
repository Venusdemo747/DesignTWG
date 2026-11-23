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
import { IEntityRepository, PostgresEntityRepository } from "../db/repository";

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

  constructor(private readonly repo: IEntityRepository = new PostgresEntityRepository()) {
    this.seedInitialSyntheticData();
  }

  public get repository(): IEntityRepository {
    return this.repo;
  }

  public async syncFromDatabase(): Promise<void> {
    try {
      const [customers, contacts, deals, projects, milestones, documents, invoices] = await Promise.all([
        this.repo.getAllCustomers(),
        this.repo.getAllContacts(),
        this.repo.getAllDeals(),
        this.repo.getAllProjects(),
        this.repo.getAllMilestones(),
        this.repo.getAllDocuments(),
        this.repo.getAllFinancialRecords(),
      ]);

      for (const c of customers) this.customers.set(c.sourceRecordId, c);
      for (const c of contacts) this.contacts.set(c.sourceRecordId, c);
      for (const d of deals) this.deals.set(d.sourceRecordId, d);
      for (const p of projects) this.projects.set(p.sourceRecordId, p);
      for (const m of milestones) this.milestones.set(m.sourceRecordId, m);
      for (const d of documents) this.documents.set(d.sourceRecordId, d);
      for (const i of invoices) this.invoices.set(i.sourceRecordId, i);
    } catch {
      // In-memory fallback if db is uninitialized in test
    }
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
    const existingIndex = this.getExistingIndex();
    return CsvIngestionValidator.validate(entityType, csvContent, existingIndex, recordOrigin);
  }

  public executeImport(
    entityType: IngestionEntityType,
    csvContent: string,
    options: IngestionExecutionOptions = {},
    recordOrigin: RecordOrigin = "IMPORTED_CSV",
  ): IngestionExecutionResult {
    const report = this.previewValidation(entityType, csvContent, recordOrigin);
    const auditId = options.auditId || `AUDIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dryRun = Boolean(options.dryRun);

    let importedCount = 0;
    let failedCount = report.invalidRows;
    let skippedCount = 0;

    if (!dryRun) {
      for (const rowResult of report.rowResults) {
        if (!rowResult.success || !rowResult.canonicalData) {
          continue;
        }

        const id =
          (rowResult.canonicalData as { sourceRecordId?: string }).sourceRecordId ||
          (rowResult.canonicalData as { canonicalId?: string }).canonicalId ||
          `ROW-${rowResult.rowNumber}`;

        switch (entityType) {
          case "customers": {
            const cust = rowResult.canonicalData as CanonicalCustomer;
            this.customers.set(id, cust);
            void this.repo.saveCustomer(cust).catch(() => {});
            importedCount++;
            break;
          }
          case "contacts": {
            const contact = rowResult.canonicalData as CanonicalContact;
            this.contacts.set(id, contact);
            void this.repo.saveContact(contact).catch(() => {});
            importedCount++;
            break;
          }
          case "deals": {
            const deal = rowResult.canonicalData as CanonicalDeal;
            this.deals.set(id, deal);
            void this.repo.saveDeal(deal).catch(() => {});
            importedCount++;
            break;
          }
          case "projects": {
            const prj = rowResult.canonicalData as CanonicalProject;
            this.projects.set(id, prj);
            void this.repo.saveProject(prj).catch(() => {});
            importedCount++;
            break;
          }
          case "milestones": {
            const ms = rowResult.canonicalData as CanonicalMilestone;
            this.milestones.set(id, ms);
            void this.repo.saveMilestone(ms).catch(() => {});
            importedCount++;
            break;
          }
          case "documents": {
            const doc = rowResult.canonicalData as CanonicalDocument;
            this.documents.set(id, doc);
            void this.repo.saveDocument(doc).catch(() => {});
            importedCount++;
            break;
          }
          case "invoices": {
            const inv = rowResult.canonicalData as CanonicalFinancialRecord;
            this.invoices.set(id, inv);
            void this.repo.saveFinancialRecord(inv).catch(() => {});
            importedCount++;
            break;
          }
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

    // Persist to database audit log
    void this.repo
      .appendAudit({
        id: auditId,
        timestamp: audit.timestamp,
        actorId: "csv_operator",
        actorRole: "Admin",
        action: `CSV_IMPORT_${entityType.toUpperCase()}`,
        resourceType: entityType.toUpperCase(),
        status: failedCount > 0 && importedCount === 0 ? "FAILED" : "SUCCESS",
        diffJson: JSON.stringify({
          entityType,
          total: report.totalRows,
          imported: importedCount,
          dryRun,
        }),
      })
      .catch(() => {});

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
