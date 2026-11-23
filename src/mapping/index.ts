import { ZohoDeal } from "../connectors/zoho-crm";
import { ZohoProject, ProjectMilestone } from "../connectors/zoho-projects";
import { QboCustomer, QboInvoice } from "../connectors/quickbooks";
import { M365SharePointFolder } from "../connectors/microsoft-365";

export interface FieldMappingRule {
  sourceSystem: string;
  sourceField: string;
  targetSystem: string;
  targetField: string;
  transformationType: "direct" | "template_lookup" | "calculation" | "path_slug" | "composite_key";
  isRequired: boolean;
  normalizationApplied: string;
  sampleSourceValue: string;
  sampleTargetValue: string;
  unsupportedFeaturesAndLimitations?: string;
}

export interface SystemMappingDefinition {
  id: string;
  category: "Customers & Contacts" | "Leads & Deals" | "Projects & Milestones" | "Documents & Metadata" | "Financial Records (Read-Only)";
  sourceSystem: string;
  targetSystem: string;
  triggerEvent: string;
  description: string;
  stableIdentifierPattern: string;
  duplicateResolutionRule: string;
  nullHandlingPolicy: string;
  knownLimitations: string[];
  fieldRules: FieldMappingRule[];
}

export class DataMappingService {
  public static getMappingDefinitions(): SystemMappingDefinition[] {
    return [
      {
        id: "map-customers-contacts",
        category: "Customers & Contacts",
        sourceSystem: "Zoho CRM / CSV",
        targetSystem: "QuickBooks Online & Canonical Registry",
        triggerEvent: "Account.Created | CSV.Import",
        description: "Maps commercial and residential client accounts and primary contacts to QuickBooks Customer records.",
        stableIdentifierPattern: "TWG-CUST-{SourceAccountId}",
        duplicateResolutionRule: "Exact company_name match or primary_email match resolves to existing record. Silent overwrites blocked.",
        nullHandlingPolicy: "Defaults currency to USD; taxNumber and phone are optional.",
        knownLimitations: [
          "QuickBooks requires distinct DisplayName; appended suffixes may be required for duplicate legal names.",
          "Parent-child sub-customer hierarchies in QBO require manual review.",
        ],
        fieldRules: [
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Account.Account_Name",
            targetSystem: "QuickBooks Online",
            targetField: "Customer.CompanyName",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Trim whitespace, capitalize legal suffix",
            sampleSourceValue: "Oakwood Luxury Living LLC",
            sampleTargetValue: "Oakwood Luxury Living LLC",
          },
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Account.Email",
            targetSystem: "QuickBooks Online",
            targetField: "Customer.PrimaryEmailAddr.Address",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Lowercase RFC 5322 email validation",
            sampleSourceValue: "Billing@OakwoodLiving.com",
            sampleTargetValue: "billing@oakwoodliving.com",
          },
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Account.id",
            targetSystem: "Canonical Model",
            targetField: "Customer.canonicalId",
            transformationType: "composite_key",
            isRequired: true,
            normalizationApplied: "Prefix with TWG-CUST-",
            sampleSourceValue: "ACC-101",
            sampleTargetValue: "TWG-CUST-ACC-101",
          },
        ],
      },
      {
        id: "map-crm-to-projects",
        category: "Leads & Deals",
        sourceSystem: "Zoho CRM",
        targetSystem: "Zoho Projects / Canonical Model",
        triggerEvent: "Deal.Stage == 'Closed Won'",
        description: "Translates CRM deal opportunities, scope of work, and contract fees into project delivery workspaces.",
        stableIdentifierPattern: "TWG-DEAL-{SourceDealId}",
        duplicateResolutionRule: "Matches on CRM Deal ID. Once Won, stage transition cannot be reversed automatically.",
        nullHandlingPolicy: "Probability defaults to 100% on Closed Won; scopeSummary defaults to deal title if empty.",
        knownLimitations: [
          "Custom formula commission fields in Zoho CRM are omitted from pipeline data.",
          "Multi-currency conversion gains/losses are not computed in canonical layer.",
        ],
        fieldRules: [
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Deal.Deal_Name",
            targetSystem: "Zoho Projects",
            targetField: "Project.name",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Standard title case",
            sampleSourceValue: "Oakwood Estates - Luxury Residential Renovation",
            sampleTargetValue: "Oakwood Estates - Luxury Residential Renovation",
          },
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Deal.Amount",
            targetSystem: "Canonical Registry",
            targetField: "CanonicalDeal.amount",
            transformationType: "calculation",
            isRequired: true,
            normalizationApplied: "Parsed from formatted currency string to positive float",
            sampleSourceValue: "$185,000.00",
            sampleTargetValue: "185000.00",
          },
          {
            sourceSystem: "Zoho CRM",
            sourceField: "Deal.Closing_Date",
            targetSystem: "Canonical Registry",
            targetField: "CanonicalDeal.closingDate",
            transformationType: "direct",
            isRequired: false,
            normalizationApplied: "ISO 8601 (YYYY-MM-DD)",
            sampleSourceValue: "2026-10-22",
            sampleTargetValue: "2026-10-22",
          },
        ],
      },
      {
        id: "map-projects-milestones",
        category: "Projects & Milestones",
        sourceSystem: "Zoho Projects",
        targetSystem: "QuickBooks Online & SharePoint",
        triggerEvent: "Milestone.status == 'completed'",
        description: "Maps architectural phases (Concept, Engineering, Millwork, Handover) to deliverables and billing triggers.",
        stableIdentifierPattern: "TWG-PRJ-{ProjectId} / TWG-MS-{MilestoneId}",
        duplicateResolutionRule: "Milestone sequence order and project ID form unique composite index.",
        nullHandlingPolicy: "completionPercentage defaults to 0% if missing; targetDate defaults to project completion date.",
        knownLimitations: [
          "Zoho Projects subtasks do not map to QBO line items; only top-level milestone phases are billable.",
          "Timesheet logged hours are informational only and not converted to T&M invoices in this phase.",
        ],
        fieldRules: [
          {
            sourceSystem: "Zoho Projects",
            sourceField: "Milestone.name",
            targetSystem: "QuickBooks Online",
            targetField: "Invoice.Line[0].Description",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Appends milestone percentage label",
            sampleSourceValue: "Phase 1: Conceptual Architecture",
            sampleTargetValue: "Phase 1: Conceptual Architecture (25% Milestone)",
          },
          {
            sourceSystem: "Zoho Projects",
            sourceField: "Milestone.billable_amount",
            targetSystem: "QuickBooks Online",
            targetField: "Invoice.Line[0].Amount",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Currency normalization (2 decimal places)",
            sampleSourceValue: "$46,250",
            sampleTargetValue: "46250.00",
          },
        ],
      },
      {
        id: "map-documents-metadata",
        category: "Documents & Metadata",
        sourceSystem: "Microsoft 365 / SharePoint",
        targetSystem: "Canonical Registry & Project Dossiers",
        triggerEvent: "Document.Uploaded | Folder.Provisioned",
        description: "Preserves document metadata, BIM file links, and document-level permission scopes.",
        stableIdentifierPattern: "TWG-DOC-{DocumentId}",
        duplicateResolutionRule: "Path + FileName unique constraint. Version history preserved in SharePoint.",
        nullHandlingPolicy: "accessPermissionScope defaults to 'project_team_only'.",
        knownLimitations: [
          "SharePoint external sharing guest links cannot be validated without tenant admin credentials.",
          "Document file contents are NOT downloaded or cached; only sanitized metadata and secure URLs are indexed.",
        ],
        fieldRules: [
          {
            sourceSystem: "SharePoint Graph",
            sourceField: "DriveItem.webUrl",
            targetSystem: "Canonical Document",
            targetField: "CanonicalDocument.sourceUrl",
            transformationType: "path_slug",
            isRequired: true,
            normalizationApplied: "Valid HTTPS URL validation",
            sampleSourceValue: "https://designtwg.sharepoint.com/sites/PRJ-701/BIM/Oakwood_BIM_Rev4.rvt",
            sampleTargetValue: "https://designtwg.sharepoint.com/sites/PRJ-701/BIM/Oakwood_BIM_Rev4.rvt",
          },
          {
            sourceSystem: "SharePoint Graph",
            sourceField: "DriveItem.size",
            targetSystem: "Canonical Document",
            targetField: "CanonicalDocument.fileSizeBytes",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Integer byte count",
            sampleSourceValue: "48291040",
            sampleTargetValue: "48291040",
          },
        ],
      },
      {
        id: "map-financial-records",
        category: "Financial Records (Read-Only)",
        sourceSystem: "QuickBooks Online",
        targetSystem: "Canonical Financial Store",
        triggerEvent: "Invoice.Query | Payment.Query (Read-Only)",
        description: "Ingests read-only invoice balances, payment settlement records, and accounts receivable data.",
        stableIdentifierPattern: "TWG-INV-{InvoiceId}",
        duplicateResolutionRule: "Invoice DocNumber is immutable and unique per QBO realm.",
        nullHandlingPolicy: "Tax amount defaults to 0 if zero-rated; balanceDue defaults to totalAmount if unpaid.",
        knownLimitations: [
          "STRICTLY READ-ONLY: No invoice or payment creation operations allowed against live QuickBooks Online.",
          "Voided invoices are flagged as status 'Void' and cannot be purged.",
        ],
        fieldRules: [
          {
            sourceSystem: "QuickBooks Online",
            sourceField: "Invoice.DocNumber",
            targetSystem: "Canonical Financial Record",
            targetField: "CanonicalFinancialRecord.invoiceNumber",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Alphanumeric invoice format",
            sampleSourceValue: "TWG-INV-2026-088",
            sampleTargetValue: "TWG-INV-2026-088",
          },
          {
            sourceSystem: "QuickBooks Online",
            sourceField: "Invoice.TotalAmt",
            targetSystem: "Canonical Financial Record",
            targetField: "CanonicalFinancialRecord.totalAmount",
            transformationType: "direct",
            isRequired: true,
            normalizationApplied: "Float currency",
            sampleSourceValue: "46250.00",
            sampleTargetValue: "46250.00",
          },
        ],
      },
    ];
  }

  public mapDealToProject(deal: ZohoDeal): Partial<ZohoProject> {
    const isCommercial = deal.dealName.toLowerCase().includes("commercial") ||
                         deal.dealName.toLowerCase().includes("tower");
    const template = isCommercial
      ? "TWG-Commercial-CorporateFitout-v3"
      : "TWG-Residential-HighEnd-v4";

    return {
      projectName: deal.dealName,
      crmDealId: deal.id,
      clientAccount: deal.accountName,
      status: "Planning",
      templateUsed: template,
      budgetHours: isCommercial ? 650 : 400,
      totalContractValue: deal.amount,
      startDate: new Date().toISOString().split("T")[0],
    };
  }

  public mapDealToQboCustomer(deal: ZohoDeal): Partial<QboCustomer> {
    return {
      displayName: deal.accountName,
      companyName: deal.accountName,
      email: deal.contactEmail,
      currency: "USD",
      balance: 0,
    };
  }

  public mapMilestoneToInvoice(
    project: ZohoProject,
    milestone: ProjectMilestone,
    customer: QboCustomer,
  ): Partial<QboInvoice> {
    return {
      customerId: customer.id,
      customerName: customer.displayName,
      projectId: project.id,
      totalAmount: milestone.billableAmount,
      status: "Draft",
      memo: `Milestone billing: ${milestone.name} for project ${project.id}`,
      lineItems: [
        {
          id: `LINE-${Date.now()}`,
          description: `${milestone.name} (${Math.round((milestone.billableAmount / project.totalContractValue) * 100)}% Milestone)`,
          amount: milestone.billableAmount,
          itemRef: "ITEM-ARCH-MILESTONE",
          quantity: 1,
        },
      ],
    };
  }

  public mapProjectToSharePointDossier(project: ZohoProject): Partial<M365SharePointFolder> {
    const slug = project.projectName.replace(/[^a-zA-Z0-9]/g, "");
    return {
      projectName: project.projectName,
      path: `/sites/TWG-Projects/Clients/${project.clientAccount}/${project.projectName}`,
      webUrl: `https://designtwg.sharepoint.com/sites/TWG-Projects/${slug}`,
      subfolders: [
        "01_Contract_and_Proposals",
        "02_Schematic_Drawings_BIM",
        "03_Engineering_Specs",
        "04_Client_Presentations",
        "05_Invoices_and_Billing",
      ],
    };
  }
}
