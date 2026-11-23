import crypto from "node:crypto";
import { IDatabaseClient, getDatabaseClient } from "./client";
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
import { IngestionEntityType } from "../ingestion/types";

export interface DbUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  passwordHash?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbSession {
  id: string;
  sessionTokenHash: string;
  userId: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export interface DbAuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  payloadHash?: string;
  diffJson?: string;
  ipAddress?: string;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
}

export interface ApproverRule {
  id: string;
  domain: string;
  primaryApproverName: string;
  primaryApproverEmail: string;
  fallbackApproverName: string;
  fallbackApproverEmail: string;
  description?: string;
}

export interface DbTransferEvent {
  transferId: string;
  trigger: string;
  sourceSystem: string;
  targetSystem: string;
  recordReference: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "RETRYING";
  latencyMs: number;
  details?: string;
  timestamp: string;
}

export function redactSecretsAndPii(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact credit cards (13-19 digits)
    if (/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(obj)) {
      return "[REDACTED_CARD]";
    }
    // Redact JWTs or bearer tokens
    if (/^Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(obj)) {
      return "[REDACTED_TOKEN]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSecretsAndPii);
  }
  if (typeof obj === "object") {
    const sensitiveKeys = new Set([
      "password",
      "password_hash",
      "token",
      "secret",
      "client_secret",
      "refresh_token",
      "access_token",
      "authorization",
      "apiKey",
      "api_key",
      "taxNumber",
      "tax_number",
    ]);
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveKeys.has(k) || sensitiveKeys.has(k.toLowerCase())) {
        redacted[k] = "[REDACTED]";
      } else {
        redacted[k] = redactSecretsAndPii(v);
      }
    }
    return redacted;
  }
  return obj;
}

export interface IEntityRepository {
  // Canonical Entities
  saveCustomer(customer: CanonicalCustomer): Promise<void>;
  getCustomer(id: string): Promise<CanonicalCustomer | null>;
  getAllCustomers(): Promise<CanonicalCustomer[]>;

  saveContact(contact: CanonicalContact): Promise<void>;
  getAllContacts(): Promise<CanonicalContact[]>;

  saveDeal(deal: CanonicalDeal): Promise<void>;
  getAllDeals(): Promise<CanonicalDeal[]>;

  saveProject(project: CanonicalProject): Promise<void>;
  getAllProjects(): Promise<CanonicalProject[]>;

  saveMilestone(milestone: CanonicalMilestone): Promise<void>;
  getAllMilestones(): Promise<CanonicalMilestone[]>;

  saveDocument(doc: CanonicalDocument): Promise<void>;
  getAllDocuments(): Promise<CanonicalDocument[]>;

  saveFinancialRecord(record: CanonicalFinancialRecord): Promise<void>;
  getAllFinancialRecords(): Promise<CanonicalFinancialRecord[]>;

  getCounts(): Promise<Record<IngestionEntityType, { total: number; csv: number; mock: number }>>;
  clearAllEntities(): Promise<void>;

  // Users & Auth
  createUser(user: DbUser): Promise<void>;
  getUserById(id: string): Promise<DbUser | null>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  createSession(session: DbSession): Promise<void>;
  getSessionByHash(tokenHash: string): Promise<(DbSession & { user: DbUser }) | null>;
  deleteSession(tokenHash: string): Promise<void>;

  // Approver Rules
  getApproverRules(): Promise<ApproverRule[]>;
  saveApproverRule(rule: ApproverRule): Promise<void>;

  // Audit Logs (Append-Only)
  appendAudit(entry: DbAuditEntry): Promise<void>;
  getAuditLogs(limit?: number): Promise<DbAuditEntry[]>;

  // Transfers
  saveTransfer(event: DbTransferEvent): Promise<void>;
  getTransfers(limit?: number): Promise<DbTransferEvent[]>;
}

export class PostgresEntityRepository implements IEntityRepository {
  constructor(private readonly db: IDatabaseClient = getDatabaseClient()) {}

  // Canonical Customers
  public async saveCustomer(c: CanonicalCustomer): Promise<void> {
    const sql = `
      INSERT INTO canonical_customers (
        canonical_id, source_system, source_record_id, record_origin,
        company_name, display_name, primary_email, phone, website,
        currency, tax_number, billing_address_json, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (source_record_id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        display_name = EXCLUDED.display_name,
        primary_email = EXCLUDED.primary_email,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        currency = EXCLUDED.currency,
        tax_number = EXCLUDED.tax_number,
        billing_address_json = EXCLUDED.billing_address_json,
        updated_at = EXCLUDED.updated_at;
    `;
    await this.db.query(sql, [
      c.canonicalId,
      c.sourceSystem,
      c.sourceRecordId,
      c.recordOrigin,
      c.companyName,
      c.displayName,
      c.primaryEmail,
      c.phone || null,
      c.website || null,
      c.currency,
      c.taxNumber || null,
      c.billingAddress ? JSON.stringify(c.billingAddress) : null,
      c.createdAt,
      c.updatedAt,
    ]);
  }

  public async getCustomer(id: string): Promise<CanonicalCustomer | null> {
    const res = await this.db.query<Record<string, unknown>>(
      "SELECT * FROM canonical_customers WHERE canonical_id = $1 OR source_record_id = $1 LIMIT 1;",
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      companyName: r.company_name as string,
      displayName: r.display_name as string,
      primaryEmail: r.primary_email as string,
      phone: (r.phone as string) || undefined,
      website: (r.website as string) || undefined,
      currency: r.currency as string,
      taxNumber: (r.tax_number as string) || undefined,
      billingAddress: r.billing_address_json ? JSON.parse(r.billing_address_json as string) : undefined,
      createdAt: (r.created_at as Date | string).toString(),
      updatedAt: (r.updated_at as Date | string).toString(),
    };
  }

  public async getAllCustomers(): Promise<CanonicalCustomer[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_customers ORDER BY created_at ASC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      companyName: r.company_name as string,
      displayName: r.display_name as string,
      primaryEmail: r.primary_email as string,
      phone: (r.phone as string) || undefined,
      website: (r.website as string) || undefined,
      currency: r.currency as string,
      taxNumber: (r.tax_number as string) || undefined,
      billingAddress: r.billing_address_json ? JSON.parse(r.billing_address_json as string) : undefined,
      createdAt: (r.created_at as Date | string).toString(),
      updatedAt: (r.updated_at as Date | string).toString(),
    }));
  }

  // Canonical Contacts
  public async saveContact(c: CanonicalContact): Promise<void> {
    const sql = `
      INSERT INTO canonical_contacts (
        canonical_id, source_system, source_record_id, record_origin,
        account_reference_id, first_name, last_name, full_name, email, phone, title, role, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (source_record_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        title = EXCLUDED.title,
        role = EXCLUDED.role;
    `;
    await this.db.query(sql, [
      c.canonicalId,
      c.sourceSystem,
      c.sourceRecordId,
      c.recordOrigin,
      c.accountReferenceId || null,
      c.firstName,
      c.lastName,
      c.fullName,
      c.email,
      c.phone || null,
      c.title || null,
      c.role,
      c.createdAt,
    ]);
  }

  public async getAllContacts(): Promise<CanonicalContact[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_contacts ORDER BY created_at ASC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      accountReferenceId: (r.account_reference_id as string) || undefined,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      fullName: r.full_name as string,
      email: r.email as string,
      phone: (r.phone as string) || undefined,
      title: (r.title as string) || undefined,
      role: r.role as CanonicalContact["role"],
      createdAt: (r.created_at as Date | string).toString(),
    }));
  }

  // Canonical Deals
  public async saveDeal(d: CanonicalDeal): Promise<void> {
    const sql = `
      INSERT INTO canonical_deals (
        canonical_id, source_system, source_record_id, record_origin,
        deal_name, account_reference_id, contact_reference_id, owner_name, owner_email,
        stage, amount, currency, closing_date, probability_percentage,
        scope_summary, architectural_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (source_record_id) DO UPDATE SET
        deal_name = EXCLUDED.deal_name,
        stage = EXCLUDED.stage,
        amount = EXCLUDED.amount,
        owner_name = EXCLUDED.owner_name,
        probability_percentage = EXCLUDED.probability_percentage,
        updated_at = EXCLUDED.updated_at;
    `;
    await this.db.query(sql, [
      d.canonicalId,
      d.sourceSystem,
      d.sourceRecordId,
      d.recordOrigin,
      d.dealName,
      d.accountReferenceId || null,
      d.contactReferenceId || null,
      d.ownerName,
      d.ownerEmail || null,
      d.stage,
      d.amount,
      d.currency,
      d.closingDate || null,
      d.probabilityPercentage,
      d.scopeSummary || null,
      d.architecturalType,
      d.createdAt,
      d.updatedAt,
    ]);
  }

  public async getAllDeals(): Promise<CanonicalDeal[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_deals ORDER BY created_at ASC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      dealName: r.deal_name as string,
      accountReferenceId: (r.account_reference_id as string) || undefined,
      contactReferenceId: (r.contact_reference_id as string) || undefined,
      ownerName: r.owner_name as string,
      ownerEmail: (r.owner_email as string) || undefined,
      stage: r.stage as CanonicalDeal["stage"],
      amount: Number(r.amount),
      currency: r.currency as string,
      closingDate: (r.closing_date as string) || undefined,
      probabilityPercentage: Number(r.probability_percentage),
      scopeSummary: (r.scope_summary as string) || undefined,
      architecturalType: r.architectural_type as CanonicalDeal["architecturalType"],
      createdAt: (r.created_at as Date | string).toString(),
      updatedAt: (r.updated_at as Date | string).toString(),
    }));
  }

  // Canonical Projects
  public async saveProject(p: CanonicalProject): Promise<void> {
    const sql = `
      INSERT INTO canonical_projects (
        canonical_id, source_system, source_record_id, record_origin,
        deal_reference_id, account_reference_id, project_name, status,
        template_code, budget_hours, logged_hours, total_contract_value,
        currency, start_date, target_completion_date, sharepoint_dossier_path,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (source_record_id) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        status = EXCLUDED.status,
        logged_hours = EXCLUDED.logged_hours,
        updated_at = EXCLUDED.updated_at;
    `;
    await this.db.query(sql, [
      p.canonicalId,
      p.sourceSystem,
      p.sourceRecordId,
      p.recordOrigin,
      p.dealReferenceId || null,
      p.accountReferenceId || null,
      p.projectName,
      p.status,
      p.templateCode,
      p.budgetHours,
      p.loggedHours,
      p.totalContractValue,
      p.currency,
      p.startDate,
      p.targetCompletionDate || null,
      p.sharePointDossierPath || null,
      p.createdAt,
      p.updatedAt,
    ]);
  }

  public async getAllProjects(): Promise<CanonicalProject[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_projects ORDER BY created_at ASC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      dealReferenceId: (r.deal_reference_id as string) || undefined,
      accountReferenceId: (r.account_reference_id as string) || undefined,
      recordOrigin: r.record_origin as RecordOrigin,
      projectName: r.project_name as string,
      status: r.status as CanonicalProject["status"],
      templateCode: r.template_code as string,
      budgetHours: Number(r.budget_hours),
      loggedHours: Number(r.logged_hours),
      totalContractValue: Number(r.total_contract_value),
      currency: r.currency as string,
      startDate: r.start_date as string,
      targetCompletionDate: (r.target_completion_date as string) || undefined,
      sharePointDossierPath: (r.sharepoint_dossier_path as string) || undefined,
      createdAt: (r.created_at as Date | string).toString(),
      updatedAt: (r.updated_at as Date | string).toString(),
    }));
  }

  // Canonical Milestones
  public async saveMilestone(m: CanonicalMilestone): Promise<void> {
    const sql = `
      INSERT INTO canonical_milestones (
        canonical_id, source_system, source_record_id, project_reference_id,
        record_origin, name, sequence_order, status, target_date,
        completion_date, billable_amount, currency, invoice_triggered, completion_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (source_record_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        completion_date = EXCLUDED.completion_date,
        completion_percentage = EXCLUDED.completion_percentage;
    `;
    await this.db.query(sql, [
      m.canonicalId,
      m.sourceSystem,
      m.sourceRecordId,
      m.projectReferenceId,
      m.recordOrigin,
      m.name,
      m.sequenceOrder,
      m.status,
      m.targetDate || null,
      m.completionDate || null,
      m.billableAmount,
      m.currency,
      m.invoiceTriggered,
      m.completionPercentage,
    ]);
  }

  public async getAllMilestones(): Promise<CanonicalMilestone[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_milestones ORDER BY sequence_order ASC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      projectReferenceId: r.project_reference_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      name: r.name as string,
      sequenceOrder: Number(r.sequence_order),
      status: r.status as CanonicalMilestone["status"],
      targetDate: (r.target_date as string) || undefined,
      completionDate: (r.completion_date as string) || undefined,
      billableAmount: Number(r.billable_amount),
      currency: r.currency as string,
      invoiceTriggered: Boolean(r.invoice_triggered),
      completionPercentage: Number(r.completion_percentage),
    }));
  }

  // Canonical Documents
  public async saveDocument(d: CanonicalDocument): Promise<void> {
    const sql = `
      INSERT INTO canonical_documents (
        canonical_id, source_system, source_record_id, project_reference_id,
        record_origin, document_title, file_name, file_size_bytes,
        mime_type, source_url, sharepoint_folder_category, access_permission_scope,
        last_modified_by, last_modified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (source_record_id) DO UPDATE SET
        document_title = EXCLUDED.document_title,
        file_size_bytes = EXCLUDED.file_size_bytes,
        last_modified_at = EXCLUDED.last_modified_at;
    `;
    await this.db.query(sql, [
      d.canonicalId,
      d.sourceSystem,
      d.sourceRecordId,
      d.projectReferenceId || null,
      d.recordOrigin,
      d.documentTitle,
      d.fileName,
      d.fileSizeBytes,
      d.mimeType,
      d.sourceUrl,
      d.sharePointFolderCategory,
      d.accessPermissionScope,
      d.lastModifiedBy || null,
      d.lastModifiedAt,
    ]);
  }

  public async getAllDocuments(): Promise<CanonicalDocument[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_documents ORDER BY last_modified_at DESC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      projectReferenceId: (r.project_reference_id as string) || undefined,
      recordOrigin: r.record_origin as RecordOrigin,
      documentTitle: r.document_title as string,
      fileName: r.file_name as string,
      fileSizeBytes: Number(r.file_size_bytes),
      mimeType: r.mime_type as string,
      sourceUrl: r.source_url as string,
      sharePointFolderCategory: r.sharepoint_folder_category as CanonicalDocument["sharePointFolderCategory"],
      accessPermissionScope: r.access_permission_scope as CanonicalDocument["accessPermissionScope"],
      lastModifiedBy: (r.last_modified_by as string) || undefined,
      lastModifiedAt: (r.last_modified_at as Date | string).toString(),
    }));
  }

  // Canonical Financial Records (Read-Only)
  public async saveFinancialRecord(f: CanonicalFinancialRecord): Promise<void> {
    const sql = `
      INSERT INTO canonical_financial_records (
        canonical_id, source_system, source_record_id, record_origin,
        account_reference_id, project_reference_id, invoice_number, status,
        subtotal_amount, tax_amount, total_amount, currency, balance_due,
        issue_date, due_date, paid_date, memo, read_only_enforced, line_items_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (source_record_id) DO UPDATE SET
        status = EXCLUDED.status,
        balance_due = EXCLUDED.balance_due,
        paid_date = EXCLUDED.paid_date;
    `;
    await this.db.query(sql, [
      f.canonicalId,
      f.sourceSystem,
      f.sourceRecordId,
      f.recordOrigin,
      f.accountReferenceId,
      f.projectReferenceId || null,
      f.invoiceNumber,
      f.status,
      f.subtotalAmount,
      f.taxAmount,
      f.totalAmount,
      f.currency,
      f.balanceDue,
      f.issueDate,
      f.dueDate,
      f.paidDate || null,
      f.memo || null,
      true, // Read-only invariant
      JSON.stringify(f.lineItems),
    ]);
  }

  public async getAllFinancialRecords(): Promise<CanonicalFinancialRecord[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM canonical_financial_records ORDER BY issue_date DESC;");
    return res.rows.map((r) => ({
      canonicalId: r.canonical_id as string,
      sourceSystem: r.source_system as string,
      sourceRecordId: r.source_record_id as string,
      recordOrigin: r.record_origin as RecordOrigin,
      accountReferenceId: r.account_reference_id as string,
      projectReferenceId: (r.project_reference_id as string) || undefined,
      invoiceNumber: r.invoice_number as string,
      status: r.status as CanonicalFinancialRecord["status"],
      subtotalAmount: Number(r.subtotal_amount),
      taxAmount: Number(r.tax_amount),
      totalAmount: Number(r.total_amount),
      currency: r.currency as string,
      balanceDue: Number(r.balance_due),
      issueDate: r.issue_date as string,
      dueDate: r.due_date as string,
      paidDate: (r.paid_date as string) || undefined,
      memo: (r.memo as string) || undefined,
      readOnlyEnforced: true,
      lineItems: JSON.parse(r.line_items_json as string),
    }));
  }

  public async getCounts(): Promise<Record<IngestionEntityType, { total: number; csv: number; mock: number }>> {
    const tables: Array<{ type: IngestionEntityType; table: string }> = [
      { type: "customers", table: "canonical_customers" },
      { type: "contacts", table: "canonical_contacts" },
      { type: "deals", table: "canonical_deals" },
      { type: "projects", table: "canonical_projects" },
      { type: "milestones", table: "canonical_milestones" },
      { type: "documents", table: "canonical_documents" },
      { type: "invoices", table: "canonical_financial_records" },
    ];

    const result = {} as Record<IngestionEntityType, { total: number; csv: number; mock: number }>;

    for (const { type, table } of tables) {
      const q = await this.db.query<{ count: string; origin: string }>(
        `SELECT COUNT(*) as count, record_origin as origin FROM ${table} GROUP BY record_origin;`
      );
      let csv = 0;
      let mock = 0;
      for (const row of q.rows) {
        if (row.origin === "IMPORTED_CSV") csv += parseInt(row.count, 10);
        if (row.origin === "MOCK_SYNTHETIC") mock += parseInt(row.count, 10);
      }
      result[type] = {
        total: csv + mock,
        csv,
        mock,
      };
    }

    return result;
  }

  public async clearAllEntities(): Promise<void> {
    await this.db.query("DELETE FROM canonical_financial_records;");
    await this.db.query("DELETE FROM canonical_documents;");
    await this.db.query("DELETE FROM canonical_milestones;");
    await this.db.query("DELETE FROM canonical_projects;");
    await this.db.query("DELETE FROM canonical_deals;");
    await this.db.query("DELETE FROM canonical_contacts;");
    await this.db.query("DELETE FROM canonical_customers;");
  }

  // Users & Sessions
  public async createUser(u: DbUser): Promise<void> {
    const sql = `
      INSERT INTO users (id, email, full_name, role, password_hash, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at;
    `;
    await this.db.query(sql, [
      u.id,
      u.email,
      u.fullName,
      u.role,
      u.passwordHash || null,
      u.isActive,
      u.createdAt,
      new Date().toISOString(),
    ]);
  }

  public async getUserById(id: string): Promise<DbUser | null> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM users WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id as string,
      email: r.email as string,
      fullName: r.full_name as string,
      role: r.role as string,
      passwordHash: (r.password_hash as string) || undefined,
      isActive: Boolean(r.is_active),
      createdAt: (r.created_at as Date | string).toString(),
    };
  }

  public async getUserByEmail(email: string): Promise<DbUser | null> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;", [email]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id as string,
      email: r.email as string,
      fullName: r.full_name as string,
      role: r.role as string,
      passwordHash: (r.password_hash as string) || undefined,
      isActive: Boolean(r.is_active),
      createdAt: (r.created_at as Date | string).toString(),
    };
  }

  public async createSession(s: DbSession): Promise<void> {
    const sql = `
      INSERT INTO sessions (id, session_token_hash, user_id, role, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6);
    `;
    await this.db.query(sql, [s.id, s.sessionTokenHash, s.userId, s.role, s.expiresAt, s.createdAt]);
  }

  public async getSessionByHash(tokenHash: string): Promise<(DbSession & { user: DbUser }) | null> {
    const sql = `
      SELECT s.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;
    `;
    const res = await this.db.query<Record<string, unknown>>(sql, [tokenHash]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id as string,
      sessionTokenHash: r.session_token_hash as string,
      userId: r.user_id as string,
      role: r.role as string,
      expiresAt: (r.expires_at as Date | string).toString(),
      createdAt: (r.created_at as Date | string).toString(),
      user: {
        id: r.user_id as string,
        email: r.email as string,
        fullName: r.full_name as string,
        role: r.role as string,
        isActive: Boolean(r.is_active),
        createdAt: (r.user_created_at as Date | string).toString(),
      },
    };
  }

  public async deleteSession(tokenHash: string): Promise<void> {
    await this.db.query("DELETE FROM sessions WHERE session_token_hash = $1;", [tokenHash]);
  }

  // Approver Rules
  public async getApproverRules(): Promise<ApproverRule[]> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM approver_routing_rules ORDER BY domain ASC;");
    return res.rows.map((r) => ({
      id: r.id as string,
      domain: r.domain as string,
      primaryApproverName: r.primary_approver_name as string,
      primaryApproverEmail: r.primary_approver_email as string,
      fallbackApproverName: r.fallback_approver_name as string,
      fallbackApproverEmail: r.fallback_approver_email as string,
      description: (r.description as string) || undefined,
    }));
  }

  public async saveApproverRule(rule: ApproverRule): Promise<void> {
    const sql = `
      INSERT INTO approver_routing_rules (
        id, domain, primary_approver_name, primary_approver_email,
        fallback_approver_name, fallback_approver_email, description, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (domain) DO UPDATE SET
        primary_approver_name = EXCLUDED.primary_approver_name,
        primary_approver_email = EXCLUDED.primary_approver_email,
        fallback_approver_name = EXCLUDED.fallback_approver_name,
        fallback_approver_email = EXCLUDED.fallback_approver_email,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;
    `;
    await this.db.query(sql, [
      rule.id,
      rule.domain,
      rule.primaryApproverName,
      rule.primaryApproverEmail,
      rule.fallbackApproverName,
      rule.fallbackApproverEmail,
      rule.description || null,
    ]);
  }

  // Audit Logs (Append-Only with Redaction)
  public async appendAudit(entry: DbAuditEntry): Promise<void> {
    // Redact sensitive keys and PII in diffJson if present
    let sanitizedDiff = entry.diffJson;
    if (sanitizedDiff) {
      try {
        const parsed = JSON.parse(sanitizedDiff);
        sanitizedDiff = JSON.stringify(redactSecretsAndPii(parsed));
      } catch {
        // keep as is
      }
    }

    const sql = `
      INSERT INTO audit_log (
        id, timestamp, actor_id, actor_role, action, resource_type,
        resource_id, payload_hash, diff_json, ip_address, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
    `;
    await this.db.query(sql, [
      entry.id,
      entry.timestamp,
      entry.actorId,
      entry.actorRole,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.payloadHash || null,
      sanitizedDiff || null,
      entry.ipAddress || null,
      entry.status,
    ]);
  }

  public async getAuditLogs(limit = 100): Promise<DbAuditEntry[]> {
    const res = await this.db.query<Record<string, unknown>>(
      "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $1;",
      [limit]
    );
    return res.rows.map((r) => ({
      id: r.id as string,
      timestamp: (r.timestamp as Date | string).toString(),
      actorId: r.actor_id as string,
      actorRole: r.actor_role as string,
      action: r.action as string,
      resourceType: r.resource_type as string,
      resourceId: (r.resource_id as string) || undefined,
      payloadHash: (r.payload_hash as string) || undefined,
      diffJson: (r.diff_json as string) || undefined,
      ipAddress: (r.ip_address as string) || undefined,
      status: r.status as DbAuditEntry["status"],
    }));
  }

  // Transfer Events
  public async saveTransfer(e: DbTransferEvent): Promise<void> {
    const sql = `
      INSERT INTO transfer_events (
        transfer_id, trigger, source_system, target_system, record_reference,
        status, latency_ms, details, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (transfer_id) DO UPDATE SET
        status = EXCLUDED.status,
        latency_ms = EXCLUDED.latency_ms,
        details = EXCLUDED.details;
    `;
    await this.db.query(sql, [
      e.transferId,
      e.trigger,
      e.sourceSystem,
      e.targetSystem,
      e.recordReference,
      e.status,
      e.latencyMs,
      e.details || null,
      e.timestamp,
    ]);
  }

  public async getTransfers(limit = 50): Promise<DbTransferEvent[]> {
    const res = await this.db.query<Record<string, unknown>>(
      "SELECT * FROM transfer_events ORDER BY timestamp DESC LIMIT $1;",
      [limit]
    );
    return res.rows.map((r) => ({
      transferId: r.transfer_id as string,
      trigger: r.trigger as string,
      sourceSystem: r.source_system as string,
      targetSystem: r.target_system as string,
      recordReference: r.record_reference as string,
      status: r.status as DbTransferEvent["status"],
      latencyMs: Number(r.latency_ms),
      details: (r.details as string) || undefined,
      timestamp: (r.timestamp as Date | string).toString(),
    }));
  }
}
