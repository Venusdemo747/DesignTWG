import { describe, expect, it } from "vitest";
import { QuickBooksConnector, QuickBooksReadOnlyViolationError } from "../src/connectors/quickbooks";
import { ZohoCrmConnector } from "../src/connectors/zoho-crm";
import { ZohoProjectsConnector } from "../src/connectors/zoho-projects";
import { Microsoft365Connector } from "../src/connectors/microsoft-365";
import { DataMappingService } from "../src/mapping";
import { TransferMonitor } from "../src/transfer";

describe("QuickBooks Read-Only Safety Invariant (Global Rule 3 & D1)", () => {
  it("BLOCKS direct customer creation without an approval record", async () => {
    const qbo = new QuickBooksConnector();
    await expect(
      qbo.findOrCreateCustomer("New Commercial Client", "client@newclient.com")
    ).rejects.toThrow(QuickBooksReadOnlyViolationError);
  });

  it("BLOCKS direct milestone invoice generation without an approval record", async () => {
    const qbo = new QuickBooksConnector();
    await expect(
      qbo.createMilestoneInvoice({
        customerName: "Oakwood Luxury Living LLC",
        customerEmail: "billing@oakwood.com",
        projectId: "PRJ-TEST-001",
        milestoneName: "D1 Schematic Design",
        amount: 25000,
      })
    ).rejects.toThrow(QuickBooksReadOnlyViolationError);
  });

  it("BLOCKS direct invoice payment settlement without an approval record", async () => {
    const qbo = new QuickBooksConnector();
    await expect(
      qbo.markInvoicePaid("QBO-INV-10982")
    ).rejects.toThrow(QuickBooksReadOnlyViolationError);
  });

  it("ALLOWS writes ONLY when a valid approvalRecordId is provided", async () => {
    const qbo = new QuickBooksConnector();
    const approvedInvoice = await qbo.createMilestoneInvoice({
      customerName: "Oakwood Luxury Living LLC",
      customerEmail: "billing@oakwood.com",
      projectId: "PRJ-TEST-001",
      milestoneName: "D1 Schematic Design",
      amount: 25000,
      approvalRecordId: "APP-RECORD-2026-QBO-001",
    });
    expect(approvedInvoice).toBeDefined();
    expect(approvedInvoice.memo).toContain("Approval: APP-RECORD-2026-QBO-001");

    const approvedPaid = await qbo.markInvoicePaid(approvedInvoice.id, "APP-RECORD-2026-QBO-002");
    expect(approvedPaid?.status).toBe("Paid");
  });

  it("proves TransferMonitor Deal-Won and Milestone sync remain strictly read-only and emit approval drafts", async () => {
    const crm = new ZohoCrmConnector();
    const projects = new ZohoProjectsConnector();
    const qbo = new QuickBooksConnector();
    const m365 = new Microsoft365Connector();
    const mapper = new DataMappingService();

    const monitor = new TransferMonitor(crm, projects, qbo, m365, mapper);

    const initialCustomersCount = (await qbo.getCustomers()).length;

    // Trigger deal won
    const dealWonRes = await monitor.triggerDealWonSync();
    expect(dealWonRes.customer).toBeDefined();
    // Verify QBO customers array was NOT mutated directly
    const currentCustomersCount = (await qbo.getCustomers()).length;
    expect(currentCustomersCount).toBe(initialCustomersCount);

    // Trigger milestone sync
    const milestoneRes = await monitor.triggerMilestoneSync();
    expect(milestoneRes.invoice).toBeDefined();
    expect((milestoneRes.invoice as { status: string }).status).toBe("DRAFT_PENDING_APPROVAL");
  });
});
