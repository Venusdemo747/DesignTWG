import { describe, expect, it } from "vitest";
import { ZohoCrmConnector } from "../src/connectors/zoho-crm";
import { ZohoProjectsConnector } from "../src/connectors/zoho-projects";
import { QuickBooksConnector } from "../src/connectors/quickbooks";
import { Microsoft365Connector } from "../src/connectors/microsoft-365";

describe("Simulated Connectors", () => {
  it("Zoho CRM provides healthy status and mock deals", async () => {
    const crm = new ZohoCrmConnector();
    const health = await crm.checkHealth();
    expect(health.id).toBe("zoho-crm");
    expect(health.status).toBe("operational");
    expect(health.simulated).toBe(true);

    const deals = await crm.getDeals();
    expect(deals.length).toBeGreaterThan(0);
    expect(deals[0].dealName).toBeDefined();

    const newDeal = await crm.createSimulatedDeal({
      dealName: "Penthouse Suite",
      accountName: "Sterling Capital",
      stage: "Closed Won",
      amount: 150000,
      closingDate: "2026-10-30",
      contactName: "Sarah Sterling",
      contactEmail: "sarah@sterling.com",
      contactPhone: "+1 (555) 123-4567",
      projectScope: "Luxury renovation",
      billingType: "Milestone",
    });
    expect(newDeal.id).toMatch(/^CRM-DEAL-/);
  });

  it("Zoho Projects provisions project workspaces and handles milestones", async () => {
    const projects = new ZohoProjectsConnector();
    const health = await projects.checkHealth();
    expect(health.id).toBe("zoho-projects");
    expect(health.status).toBe("operational");

    const projectList = await projects.getProjects();
    expect(projectList.length).toBeGreaterThan(0);

    const created = await projects.createProjectFromDeal({
      dealId: "CRM-DEAL-9999",
      dealName: "Highland Residences",
      clientAccount: "Highland LLC",
      contractValue: 200000,
      billingType: "Milestone",
    });
    expect(created.crmDealId).toBe("CRM-DEAL-9999");
    expect(created.milestones.length).toBe(4);

    const completed = await projects.completeMilestone(created.milestones[0].id);
    expect(completed?.status).toBe("completed");
    expect(completed?.completionPercentage).toBe(100);
  });

  it("QuickBooks Online creates customers, milestone invoices, and records payments", async () => {
    const qbo = new QuickBooksConnector();
    const health = await qbo.checkHealth();
    expect(health.id).toBe("quickbooks");
    expect(health.status).toBe("operational");

    const customers = await qbo.getCustomers();
    expect(customers.length).toBeGreaterThan(0);

    const invoice = await qbo.createMilestoneInvoice({
      customerName: "Nordic Designs Inc",
      customerEmail: "finance@nordic.com",
      projectId: "PRJ-TWG-799",
      milestoneName: "Phase 1: Concept Schematic",
      amount: 50000,
    });
    expect(invoice.id).toMatch(/^QBO-INV-/);
    expect(invoice.status).toBe("Draft");
    expect(invoice.totalAmount).toBe(50000);

    const paid = await qbo.markInvoicePaid(invoice.id);
    expect(paid?.status).toBe("Paid");
  });

  it("Microsoft 365 provisions SharePoint dossier folders and sends Teams alerts", async () => {
    const m365 = new Microsoft365Connector();
    const health = await m365.checkHealth();
    expect(health.id).toBe("microsoft-365");
    expect(health.status).toBe("operational");

    const dossier = await m365.provisionSharePointProjectDossier(
      "Marina Penthouse",
      "Marina Bay Developments",
    );
    expect(dossier.subfolders.length).toBe(5);
    expect(dossier.path).toContain("Marina Bay Developments");

    const alert = await m365.postTeamsAlert({
      channel: "Executive Architecture Pipeline",
      title: "Test Alert",
      body: "Test message body",
      urgency: "info",
      metadata: { test: true },
    });
    expect(alert.id).toMatch(/^TEAMS-MSG-/);
  });
});
