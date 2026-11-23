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
  IngestionValidationReport,
  RowValidationIssue,
  RowValidationResult,
} from "./types";
import { CsvParser, isValidEmail, isValidIsoDate, parseCurrency } from "./csv-parser";

export interface ExistingReferenceIndex {
  accountIds: Set<string>;
  projectIds: Set<string>;
  dealIds: Set<string>;
  contactIds: Set<string>;
  invoiceIds: Set<string>;
  documentIds: Set<string>;
  milestoneIds: Set<string>;
  existingRecordsMap: Map<string, Record<string, unknown>>;
}

export class CsvIngestionValidator {
  public static validate(
    entityType: IngestionEntityType,
    csvContent: string,
    existingIndex: ExistingReferenceIndex = {
      accountIds: new Set(),
      projectIds: new Set(),
      dealIds: new Set(),
      contactIds: new Set(),
      invoiceIds: new Set(),
      documentIds: new Set(),
      milestoneIds: new Set(),
      existingRecordsMap: new Map(),
    },
    recordOrigin: RecordOrigin = "IMPORTED_CSV",
  ): IngestionValidationReport {
    const rawRows = CsvParser.parse(csvContent);
    const rowResults: RowValidationResult[] = [];
    const summaryErrors: string[] = [];

    if (rawRows.length === 0) {
      return {
        entityType,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateCount: 0,
        orphanedRefCount: 0,
        conflictCount: 0,
        rowResults: [],
        summaryErrors: ["CSV file contains no data rows."],
        canProceedWithImport: false,
        generatedAt: new Date().toISOString(),
      };
    }

    const seenIdsInBatch = new Set<string>();
    let duplicateCount = 0;
    let orphanedRefCount = 0;
    let conflictCount = 0;

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNumber = index + 2; // Accounting for 1-based index and header line
      const issues: RowValidationIssue[] = [];

      let canonicalData: unknown = undefined;

      switch (entityType) {
        case "customers":
          canonicalData = this.validateCustomer(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "contacts":
          canonicalData = this.validateContact(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "deals":
          canonicalData = this.validateDeal(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "projects":
          canonicalData = this.validateProject(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "milestones":
          canonicalData = this.validateMilestone(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "documents":
          canonicalData = this.validateDocument(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
        case "invoices":
          canonicalData = this.validateInvoice(
            row,
            rowNumber,
            issues,
            seenIdsInBatch,
            existingIndex,
            recordOrigin,
          );
          break;
      }

      // Count issue categories
      for (const iss of issues) {
        if (iss.code === "DUPLICATE_IDENTIFIER") duplicateCount++;
        if (iss.code === "ORPHANED_REFERENCE") orphanedRefCount++;
        if (iss.code === "CONFLICTING_EXISTING_RECORD") conflictCount++;
      }

      const hasErrors = issues.some((i) => i.severity === "ERROR");

      rowResults.push({
        rowNumber,
        success: !hasErrors,
        rawRow: row,
        canonicalData: !hasErrors ? canonicalData : undefined,
        issues,
      });
    }

    const validRows = rowResults.filter((r) => r.success).length;
    const invalidRows = rowResults.length - validRows;

    return {
      entityType,
      totalRows: rowResults.length,
      validRows,
      invalidRows,
      duplicateCount,
      orphanedRefCount,
      conflictCount,
      rowResults,
      summaryErrors,
      canProceedWithImport: invalidRows === 0 && conflictCount === 0,
      generatedAt: new Date().toISOString(),
    };
  }

  private static validateCustomer(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalCustomer | undefined {
    const id = row.id || row.customer_id;
    const name = row.company_name || row.name;
    const email = row.email || row.primary_email;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing mandatory identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!name) {
      issues.push({
        rowNumber,
        field: "company_name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing mandatory company name",
      });
    }

    if (email && !isValidEmail(email)) {
      issues.push({
        rowNumber,
        field: "email",
        severity: "ERROR",
        code: "INVALID_EMAIL",
        message: `Invalid email address format: ${email}`,
        rawValue: email,
      });
    }

    const canonicalId = `TWG-CUST-${id}`;

    return {
      canonicalId,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      recordOrigin,
      companyName: name || "",
      displayName: row.display_name || name || "",
      primaryEmail: email || "",
      phone: row.phone,
      website: row.website,
      currency: (row.currency || "USD").toUpperCase(),
      taxNumber: row.tax_number,
      billingAddress: {
        street: row.street,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country || "USA",
      },
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private static validateContact(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalContact | undefined {
    const id = row.id || row.contact_id;
    const accountId = row.account_id || row.customer_id;
    const firstName = row.first_name || "";
    const lastName = row.last_name || "";
    const email = row.email;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing mandatory contact identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!accountId) {
      issues.push({
        rowNumber,
        field: "account_id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Contact must reference an account_id",
      });
    } else if (index.accountIds.size > 0 && !index.accountIds.has(accountId)) {
      issues.push({
        rowNumber,
        field: "account_id",
        severity: "ERROR",
        code: "ORPHANED_REFERENCE",
        message: `Referenced account_id '${accountId}' does not exist in registry`,
        rawValue: accountId,
      });
    }

    if (!lastName) {
      issues.push({
        rowNumber,
        field: "last_name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Contact must have a last_name",
      });
    }

    if (!email || !isValidEmail(email)) {
      issues.push({
        rowNumber,
        field: "email",
        severity: "ERROR",
        code: "INVALID_EMAIL",
        message: `Valid email is required for contact: ${email}`,
        rawValue: email,
      });
    }

    return {
      canonicalId: `TWG-CNT-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      recordOrigin,
      accountReferenceId: accountId ? `TWG-CUST-${accountId}` : undefined,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email: email || "",
      phone: row.phone,
      title: row.title,
      role: (row.role as CanonicalContact["role"]) || "general",
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private static validateDeal(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalDeal | undefined {
    const id = row.id || row.deal_id;
    const name = row.deal_name || row.title;
    const stage = row.stage;
    const rawAmount = row.amount || row.contract_value;
    const closingDate = row.closing_date;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing mandatory deal identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!name) {
      issues.push({
        rowNumber,
        field: "deal_name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing deal name",
      });
    }

    const amount = parseCurrency(rawAmount);
    if (!rawAmount || amount <= 0) {
      issues.push({
        rowNumber,
        field: "amount",
        severity: "ERROR",
        code: "INVALID_CURRENCY",
        message: `Amount must be a positive number: '${rawAmount}'`,
        rawValue: rawAmount,
      });
    }

    if (closingDate && !isValidIsoDate(closingDate)) {
      issues.push({
        rowNumber,
        field: "closing_date",
        severity: "ERROR",
        code: "INVALID_DATE_FORMAT",
        message: `Closing date must be in ISO format (YYYY-MM-DD): '${closingDate}'`,
        rawValue: closingDate,
      });
    }

    const validStages = ["Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
    const normalizedStage = validStages.find(
      (s) => s.toLowerCase() === (stage || "").toLowerCase(),
    ) || "Qualification";

    return {
      canonicalId: `TWG-DEAL-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      recordOrigin,
      dealName: name || "",
      accountReferenceId: row.account_id ? `TWG-CUST-${row.account_id}` : undefined,
      contactReferenceId: row.contact_id ? `TWG-CNT-${row.contact_id}` : undefined,
      ownerName: row.owner_name || "Unassigned",
      ownerEmail: row.owner_email,
      stage: normalizedStage as CanonicalDeal["stage"],
      amount,
      currency: (row.currency || "USD").toUpperCase(),
      closingDate,
      probabilityPercentage: parseInt(row.probability || "50", 10),
      scopeSummary: row.scope_summary,
      architecturalType: (row.architectural_type as CanonicalDeal["architecturalType"]) || "Residential",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private static validateProject(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalProject | undefined {
    const id = row.id || row.project_id;
    const name = row.project_name || row.title;
    const value = parseCurrency(row.total_contract_value || row.value);
    const startDate = row.start_date;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing mandatory project identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!name) {
      issues.push({
        rowNumber,
        field: "project_name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing project name",
      });
    }

    if (startDate && !isValidIsoDate(startDate)) {
      issues.push({
        rowNumber,
        field: "start_date",
        severity: "ERROR",
        code: "INVALID_DATE_FORMAT",
        message: `Project start date must be ISO format (YYYY-MM-DD): '${startDate}'`,
        rawValue: startDate,
      });
    }

    return {
      canonicalId: `TWG-PRJ-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      recordOrigin,
      dealReferenceId: row.deal_id ? `TWG-DEAL-${row.deal_id}` : undefined,
      accountReferenceId: row.account_id ? `TWG-CUST-${row.account_id}` : undefined,
      projectName: name || "",
      status: (row.status as CanonicalProject["status"]) || "Planning",
      templateCode: row.template_code || "TWG-Standard-v1",
      budgetHours: parseInt(row.budget_hours || "400", 10),
      loggedHours: parseInt(row.logged_hours || "0", 10),
      totalContractValue: value,
      currency: (row.currency || "USD").toUpperCase(),
      startDate: startDate || new Date().toISOString().split("T")[0],
      targetCompletionDate: row.target_completion_date,
      sharePointDossierPath: row.sharepoint_path,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private static validateMilestone(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalMilestone | undefined {
    const id = row.id || row.milestone_id;
    const projectId = row.project_id;
    const name = row.name || row.milestone_name;
    const amount = parseCurrency(row.billable_amount || row.amount);

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing milestone identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!projectId) {
      issues.push({
        rowNumber,
        field: "project_id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Milestone must reference a project_id",
      });
    } else if (index.projectIds.size > 0 && !index.projectIds.has(projectId)) {
      issues.push({
        rowNumber,
        field: "project_id",
        severity: "ERROR",
        code: "ORPHANED_REFERENCE",
        message: `Referenced project_id '${projectId}' does not exist in registry`,
        rawValue: projectId,
      });
    }

    if (!name) {
      issues.push({
        rowNumber,
        field: "name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Milestone name is required",
      });
    }

    return {
      canonicalId: `TWG-MS-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      projectReferenceId: projectId ? `TWG-PRJ-${projectId}` : "UNKNOWN",
      recordOrigin,
      name: name || "",
      sequenceOrder: parseInt(row.sequence_order || "1", 10),
      status: (row.status as CanonicalMilestone["status"]) || "pending",
      targetDate: row.target_date,
      completionDate: row.completion_date,
      billableAmount: amount,
      currency: (row.currency || "USD").toUpperCase(),
      invoiceTriggered: row.invoice_triggered === "true" || row.invoice_triggered === "1",
      completionPercentage: parseInt(row.completion_percentage || "0", 10),
    };
  }

  private static validateDocument(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalDocument | undefined {
    const id = row.id || row.doc_id;
    const title = row.title || row.document_title;
    const fileName = row.file_name;
    const sourceUrl = row.source_url;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing document id",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!fileName) {
      issues.push({
        rowNumber,
        field: "file_name",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing file_name",
      });
    }

    return {
      canonicalId: `TWG-DOC-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      projectReferenceId: row.project_id ? `TWG-PRJ-${row.project_id}` : undefined,
      recordOrigin,
      documentTitle: title || fileName || "",
      fileName: fileName || "",
      fileSizeBytes: parseInt(row.file_size_bytes || "1024", 10),
      mimeType: row.mime_type || "application/octet-stream",
      sourceUrl: sourceUrl || "",
      sharePointFolderCategory:
        (row.category as CanonicalDocument["sharePointFolderCategory"]) ||
        "02_Schematic_Drawings_BIM",
      accessPermissionScope:
        (row.access_scope as CanonicalDocument["accessPermissionScope"]) ||
        "project_team_only",
      lastModifiedBy: row.last_modified_by,
      lastModifiedAt: row.last_modified_at || new Date().toISOString(),
    };
  }

  private static validateInvoice(
    row: Record<string, string>,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
    recordOrigin: RecordOrigin,
  ): CanonicalFinancialRecord | undefined {
    const id = row.id || row.invoice_id;
    const invoiceNumber = row.invoice_number || row.doc_number;
    const accountId = row.account_id || row.customer_id;
    const rawTotal = row.total_amount || row.amount;
    const issueDate = row.issue_date || row.txn_date;
    const dueDate = row.due_date;

    if (!id) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing invoice identifier 'id'",
      });
    } else {
      this.checkIdUniqueness(id, rowNumber, issues, seenIds, index);
    }

    if (!invoiceNumber) {
      issues.push({
        rowNumber,
        field: "invoice_number",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Missing invoice number",
      });
    }

    if (!accountId) {
      issues.push({
        rowNumber,
        field: "account_id",
        severity: "ERROR",
        code: "REQUIRED_FIELD_MISSING",
        message: "Invoice must reference an account_id",
      });
    } else if (index.accountIds.size > 0 && !index.accountIds.has(accountId)) {
      issues.push({
        rowNumber,
        field: "account_id",
        severity: "ERROR",
        code: "ORPHANED_REFERENCE",
        message: `Referenced account_id '${accountId}' does not exist in registry`,
        rawValue: accountId,
      });
    }

    const totalAmount = parseCurrency(rawTotal);
    if (!rawTotal || totalAmount <= 0) {
      issues.push({
        rowNumber,
        field: "total_amount",
        severity: "ERROR",
        code: "INVALID_CURRENCY",
        message: `Total invoice amount must be positive: '${rawTotal}'`,
        rawValue: rawTotal,
      });
    }

    if (issueDate && !isValidIsoDate(issueDate)) {
      issues.push({
        rowNumber,
        field: "issue_date",
        severity: "ERROR",
        code: "INVALID_DATE_FORMAT",
        message: `Issue date must be in ISO format: '${issueDate}'`,
        rawValue: issueDate,
      });
    }

    return {
      canonicalId: `TWG-INV-${id}`,
      sourceSystem: row.source_system || "CSV_IMPORT",
      sourceRecordId: id || "UNKNOWN",
      recordOrigin,
      accountReferenceId: `TWG-CUST-${accountId}`,
      projectReferenceId: row.project_id ? `TWG-PRJ-${row.project_id}` : undefined,
      invoiceNumber: invoiceNumber || "",
      status: (row.status as CanonicalFinancialRecord["status"]) || "Draft",
      subtotalAmount: totalAmount,
      taxAmount: 0,
      totalAmount,
      currency: (row.currency || "USD").toUpperCase(),
      balanceDue: parseCurrency(row.balance_due ?? String(totalAmount)),
      issueDate: issueDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      memo: row.memo,
      readOnlyEnforced: true,
      lineItems: [
        {
          lineId: `LINE-${id}-1`,
          description: row.memo || `Architectural professional services`,
          amount: totalAmount,
          quantity: 1,
          milestoneReferenceId: row.milestone_id,
        },
      ],
    };
  }

  private static checkIdUniqueness(
    id: string,
    rowNumber: number,
    issues: RowValidationIssue[],
    seenIds: Set<string>,
    index: ExistingReferenceIndex,
  ): void {
    if (seenIds.has(id)) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "DUPLICATE_IDENTIFIER",
        message: `Duplicate identifier '${id}' detected within this import batch`,
        rawValue: id,
      });
    } else {
      seenIds.add(id);
    }

    // Check if ID already exists in repository and has different attributes (Conflict)
    if (index.existingRecordsMap.has(id)) {
      issues.push({
        rowNumber,
        field: "id",
        severity: "ERROR",
        code: "CONFLICTING_EXISTING_RECORD",
        message: `Record with id '${id}' already exists in registry. Silent overwriting is prevented.`,
        rawValue: id,
      });
    }
  }
}
