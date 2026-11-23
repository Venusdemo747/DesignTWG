export type RecordOrigin = "IMPORTED_CSV" | "MOCK_SYNTHETIC" | "LIVE_API";

export interface CanonicalCustomer {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  recordOrigin: RecordOrigin;
  companyName: string;
  displayName: string;
  primaryEmail: string;
  phone?: string;
  website?: string;
  currency: string;
  taxNumber?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalContact {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  recordOrigin: RecordOrigin;
  accountReferenceId?: string; // Foreign reference to CanonicalCustomer
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  title?: string;
  role: "decision_maker" | "billing_contact" | "project_lead" | "general";
  createdAt: string;
}

export type DealStage =
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export interface CanonicalDeal {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  recordOrigin: RecordOrigin;
  dealName: string;
  accountReferenceId?: string;
  contactReferenceId?: string;
  ownerName: string;
  ownerEmail?: string;
  stage: DealStage;
  amount: number;
  currency: string;
  closingDate?: string;
  probabilityPercentage: number;
  scopeSummary?: string;
  architecturalType: "Residential" | "Commercial" | "Mixed-Use" | "Specialty";
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "Planning" | "Active" | "In Review" | "Completed" | "On Hold";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "delayed";

export interface CanonicalMilestone {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  projectReferenceId: string;
  recordOrigin: RecordOrigin;
  name: string;
  sequenceOrder: number;
  status: MilestoneStatus;
  targetDate?: string;
  completionDate?: string;
  billableAmount: number;
  currency: string;
  invoiceTriggered: boolean;
  completionPercentage: number;
}

export interface CanonicalProject {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  dealReferenceId?: string;
  accountReferenceId?: string;
  recordOrigin: RecordOrigin;
  projectName: string;
  status: ProjectStatus;
  templateCode: string;
  budgetHours: number;
  loggedHours: number;
  totalContractValue: number;
  currency: string;
  startDate: string;
  targetCompletionDate?: string;
  sharePointDossierPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalDocument {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  projectReferenceId?: string;
  recordOrigin: RecordOrigin;
  documentTitle: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sourceUrl: string;
  sharePointFolderCategory:
    | "01_Contract_and_Proposals"
    | "02_Schematic_Drawings_BIM"
    | "03_Engineering_Specs"
    | "04_Client_Presentations"
    | "05_Invoices_and_Billing";
  accessPermissionScope: "internal_all" | "project_team_only" | "executive_only" | "client_accessible";
  lastModifiedBy?: string;
  lastModifiedAt: string;
}

export type InvoicePaymentStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void";

export interface CanonicalFinancialRecord {
  canonicalId: string;
  sourceSystem: string;
  sourceRecordId: string;
  recordOrigin: RecordOrigin;
  accountReferenceId: string;
  projectReferenceId?: string;
  invoiceNumber: string;
  status: InvoicePaymentStatus;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  memo?: string;
  readOnlyEnforced: true; // Hardcoded safety invariant
  lineItems: Array<{
    lineId: string;
    description: string;
    amount: number;
    quantity: number;
    milestoneReferenceId?: string;
  }>;
}
