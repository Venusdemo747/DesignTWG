import { describe, expect, it } from "vitest";
import { DataMappingService } from "../src/mapping";
import { ZohoDeal } from "../src/connectors/zoho-crm";
import { ZohoProject } from "../src/connectors/zoho-projects";
import { QboCustomer } from "../src/connectors/quickbooks";

describe("Data Mapping Service", () => {
  const mapper = new DataMappingService();

  const mockDeal: ZohoDeal = {
    id: "CRM-DEAL-1001",
    dealName: "Bellevue Luxury Penthouse",
    accountName: "Bellevue Holdings",
    stage: "Closed Won",
    amount: 250000,
    closingDate: "2026-11-01",
    contactName: "James Bellevue",
    contactEmail: "james@bellevue.com",
    contactPhone: "+1 (555) 345-6789",
    projectScope: "Full architectural and interior package",
    billingType: "Milestone",
    lastModified: "2026-10-23T12:00:00Z",
  };

  it("returns system mapping definitions with field rules", () => {
    const defs = DataMappingService.getMappingDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(4);
    const crmToProjects = defs.find((d) => d.id === "map-crm-to-projects");
    expect(crmToProjects).toBeDefined();
    expect(crmToProjects?.fieldRules.length).toBeGreaterThan(0);
  });

  it("maps Deal to Zoho Project payload correctly", () => {
    const project = mapper.mapDealToProject(mockDeal);
    expect(project.projectName).toBe("Bellevue Luxury Penthouse");
    expect(project.crmDealId).toBe("CRM-DEAL-1001");
    expect(project.totalContractValue).toBe(250000);
    expect(project.templateUsed).toBe("TWG-Residential-HighEnd-v4");
  });

  it("maps Deal to QuickBooks Customer payload correctly", () => {
    const customer = mapper.mapDealToQboCustomer(mockDeal);
    expect(customer.companyName).toBe("Bellevue Holdings");
    expect(customer.email).toBe("james@bellevue.com");
  });

  it("maps Milestone to QuickBooks Invoice payload correctly", () => {
    const mockProject: ZohoProject = {
      id: "PRJ-TWG-900",
      projectName: "Bellevue Luxury Penthouse",
      crmDealId: "CRM-DEAL-1001",
      clientAccount: "Bellevue Holdings",
      status: "Active",
      templateUsed: "TWG-Residential-HighEnd-v4",
      budgetHours: 400,
      loggedHours: 50,
      totalContractValue: 250000,
      startDate: "2026-11-01",
      endDate: "2027-05-01",
      sharePointFolderSynced: true,
      milestones: [
        {
          id: "MS-900-1",
          name: "Phase 1: Conceptual Architecture",
          targetDate: "2026-12-01",
          status: "completed",
          billableAmount: 62500,
          invoiceTriggered: true,
          completionPercentage: 100,
        },
      ],
    };

    const mockCustomer: QboCustomer = {
      id: "QBO-CUST-900",
      displayName: "Bellevue Holdings",
      companyName: "Bellevue Holdings",
      email: "james@bellevue.com",
      balance: 0,
      currency: "USD",
    };

    const invoice = mapper.mapMilestoneToInvoice(
      mockProject,
      mockProject.milestones[0],
      mockCustomer,
    );

    expect(invoice.totalAmount).toBe(62500);
    expect(invoice.customerId).toBe("QBO-CUST-900");
    expect(invoice.lineItems?.[0].description).toContain("Phase 1");
  });

  it("maps Project to SharePoint dossier structure", () => {
    const mockProject: ZohoProject = {
      id: "PRJ-TWG-900",
      projectName: "Bellevue Luxury Penthouse",
      crmDealId: "CRM-DEAL-1001",
      clientAccount: "Bellevue Holdings",
      status: "Active",
      templateUsed: "TWG-Residential-HighEnd-v4",
      budgetHours: 400,
      loggedHours: 50,
      totalContractValue: 250000,
      startDate: "2026-11-01",
      endDate: "2027-05-01",
      sharePointFolderSynced: true,
      milestones: [],
    };

    const dossier = mapper.mapProjectToSharePointDossier(mockProject);
    expect(dossier.path).toBe("/sites/TWG-Projects/Clients/Bellevue Holdings/Bellevue Luxury Penthouse");
    expect(dossier.subfolders?.length).toBe(5);
  });
});
