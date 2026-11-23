import { SystemId } from "../connectors/types";
import { ZohoCrmConnector, ZohoDeal } from "../connectors/zoho-crm";
import { ZohoProjectsConnector } from "../connectors/zoho-projects";
import { QuickBooksConnector } from "../connectors/quickbooks";
import { Microsoft365Connector } from "../connectors/microsoft-365";
import { DataMappingService } from "../mapping";

export type TransferStatus = "SUCCESS" | "IN_PROGRESS" | "FAILED" | "RETRY_QUEUED";

export interface TransferEvent {
  id: string;
  timestamp: string;
  trigger: string;
  sourceSystem: SystemId;
  targetSystem: SystemId;
  entityType: string;
  recordId: string;
  recordLabel: string;
  status: TransferStatus;
  durationMs: number;
  retryCount: number;
  details: string;
  payload: Record<string, unknown>;
}

export interface TransferStats {
  totalTransfers: number;
  successful: number;
  failed: number;
  inProgress: number;
  successRate: number;
  avgDurationMs: number;
}

export class TransferMonitor {
  private readonly transfers: TransferEvent[] = [
    {
      id: "TRX-2026-1044",
      timestamp: "2026-10-23T16:00:15Z",
      trigger: "QBO Payment Webhook",
      sourceSystem: "quickbooks",
      targetSystem: "microsoft-365",
      entityType: "Payment -> Teams Notification",
      recordId: "QBO-INV-10982",
      recordLabel: "Payment Received: $46,250 (Oakwood Estates Phase 1)",
      status: "SUCCESS",
      durationMs: 44,
      retryCount: 0,
      details: "Broadcasted payment confirmation to #Billing-Financial-Operations channel.",
      payload: {
        invoiceId: "QBO-INV-10982",
        amountPaid: 46250,
        customer: "Oakwood Luxury Living LLC",
      },
    },
    {
      id: "TRX-2026-1043",
      timestamp: "2026-10-23T14:42:08Z",
      trigger: "Zoho Projects Milestone Complete",
      sourceSystem: "zoho-projects",
      targetSystem: "quickbooks",
      entityType: "Milestone -> QBO Invoice",
      recordId: "MS-701-1",
      recordLabel: "Phase 1: Conceptual Architecture",
      status: "SUCCESS",
      durationMs: 82,
      retryCount: 0,
      details: "Generated Invoice TWG-INV-2026-088 in QuickBooks Online for $46,250.",
      payload: {
        milestoneId: "MS-701-1",
        projectId: "PRJ-TWG-701",
        amount: 46250,
        status: "Draft",
      },
    },
    {
      id: "TRX-2026-1042",
      timestamp: "2026-10-22T09:15:30Z",
      trigger: "Zoho CRM Deal Closed-Won Webhook",
      sourceSystem: "zoho-crm",
      targetSystem: "microsoft-365",
      entityType: "Project -> SharePoint Dossier",
      recordId: "CRM-DEAL-8821",
      recordLabel: "Oakwood Estates Workspace Provisioning",
      status: "SUCCESS",
      durationMs: 98,
      retryCount: 0,
      details: "Created SharePoint directory structure with 5 BIM & Contract subfolders.",
      payload: {
        path: "/sites/TWG-Projects/Clients/Oakwood Luxury Living LLC/Oakwood Estates",
        foldersCreated: 5,
      },
    },
    {
      id: "TRX-2026-1041",
      timestamp: "2026-10-22T09:14:10Z",
      trigger: "Zoho CRM Deal Closed-Won Webhook",
      sourceSystem: "zoho-crm",
      targetSystem: "zoho-projects",
      entityType: "Deal -> Project Workspace",
      recordId: "CRM-DEAL-8821",
      recordLabel: "Oakwood Estates - Luxury Residential Renovation",
      status: "SUCCESS",
      durationMs: 114,
      retryCount: 0,
      details: "Instantiated project PRJ-TWG-701 from TWG-Residential-HighEnd-v4 template with 4 milestones.",
      payload: {
        dealId: "CRM-DEAL-8821",
        projectId: "PRJ-TWG-701",
        contractValue: 185000,
      },
    },
  ];

  constructor(
    private readonly crm: ZohoCrmConnector,
    private readonly projects: ZohoProjectsConnector,
    private readonly qbo: QuickBooksConnector,
    private readonly m365: Microsoft365Connector,
    private readonly mapper: DataMappingService,
  ) {}

  public getTransfers(): TransferEvent[] {
    return [...this.transfers];
  }

  public getStats(): TransferStats {
    const total = this.transfers.length;
    const successful = this.transfers.filter((t) => t.status === "SUCCESS").length;
    const failed = this.transfers.filter((t) => t.status === "FAILED").length;
    const inProgress = this.transfers.filter((t) => t.status === "IN_PROGRESS" || t.status === "RETRY_QUEUED").length;
    const avgDuration = total > 0
      ? Math.round(this.transfers.reduce((acc, t) => acc + t.durationMs, 0) / total)
      : 0;
    const successRate = total > 0 ? Number(((successful / total) * 100).toFixed(1)) : 100;

    return {
      totalTransfers: total,
      successful,
      failed,
      inProgress,
      successRate,
      avgDurationMs: avgDuration,
    };
  }

  public async triggerDealWonSync(dealId?: string): Promise<{
    project: unknown;
    customer: unknown;
    sharePoint: unknown;
    teamsAlert: unknown;
  }> {
    const deals = await this.crm.getDeals();
    const deal: ZohoDeal = (dealId ? deals.find((d) => d.id === dealId) : null) || deals[0];

    const startTime = Date.now();

    // 1. Create Project in Zoho Projects
    const project = await this.projects.createProjectFromDeal({
      dealId: deal.id,
      dealName: deal.dealName,
      clientAccount: deal.accountName,
      contractValue: deal.amount,
      billingType: deal.billingType,
    });

    this.transfers.unshift({
      id: `TRX-${Date.now()}-1`,
      timestamp: new Date().toISOString(),
      trigger: "Simulated Webhook: Deals.Closed_Won",
      sourceSystem: "zoho-crm",
      targetSystem: "zoho-projects",
      entityType: "Deal -> Project Workspace",
      recordId: deal.id,
      recordLabel: deal.dealName,
      status: "SUCCESS",
      durationMs: Date.now() - startTime + 45,
      retryCount: 0,
      details: `Provisioned project ${project.id} using template ${project.templateUsed}.`,
      payload: { dealId: deal.id, projectId: project.id, amount: deal.amount },
    });

    // 2. Provision Customer in QBO
    const customer = await this.qbo.findOrCreateCustomer(deal.accountName, deal.contactEmail);
    this.transfers.unshift({
      id: `TRX-${Date.now()}-2`,
      timestamp: new Date().toISOString(),
      trigger: "Event: Project Provisioned",
      sourceSystem: "zoho-crm",
      targetSystem: "quickbooks",
      entityType: "Deal -> QBO Customer Record",
      recordId: deal.id,
      recordLabel: deal.accountName,
      status: "SUCCESS",
      durationMs: 38,
      retryCount: 0,
      details: `Verified billing entity ${customer.displayName} in QuickBooks Online.`,
      payload: { customerId: customer.id, email: customer.email },
    });

    // 3. Provision SharePoint Dossier
    const spFolder = await this.m365.provisionSharePointProjectDossier(project.projectName, deal.accountName);
    this.transfers.unshift({
      id: `TRX-${Date.now()}-3`,
      timestamp: new Date().toISOString(),
      trigger: "Event: Project Provisioned",
      sourceSystem: "zoho-projects",
      targetSystem: "microsoft-365",
      entityType: "Project -> SharePoint Dossier",
      recordId: project.id,
      recordLabel: project.projectName,
      status: "SUCCESS",
      durationMs: 52,
      retryCount: 0,
      details: `Created SharePoint site folder with 5 architectural BIM & Contract subfolders.`,
      payload: { path: spFolder.path, webUrl: spFolder.webUrl },
    });

    // 4. Send Teams Alert
    const alert = await this.m365.postTeamsAlert({
      channel: "Executive Architecture Pipeline",
      title: `🎉 Deal Closed-Won: ${deal.dealName}`,
      body: `Contract value $${deal.amount.toLocaleString()}. Project ${project.id} provisioned with template ${project.templateUsed}. SharePoint dossier created.`,
      urgency: "success",
      metadata: { dealId: deal.id, projectId: project.id, amount: deal.amount },
    });

    this.transfers.unshift({
      id: `TRX-${Date.now()}-4`,
      timestamp: new Date().toISOString(),
      trigger: "Event: Pipeline Sync Complete",
      sourceSystem: "zoho-projects",
      targetSystem: "microsoft-365",
      entityType: "Event -> Teams Alert",
      recordId: project.id,
      recordLabel: `Alert to #Executive Pipeline`,
      status: "SUCCESS",
      durationMs: 29,
      retryCount: 0,
      details: `Notified executive team on Microsoft Teams.`,
      payload: { messageId: alert.id, channel: alert.channel },
    });

    return { project, customer, sharePoint: spFolder, teamsAlert: alert };
  }

  public async triggerMilestoneSync(milestoneId?: string): Promise<{ invoice: unknown; teamsAlert: unknown }> {
    const projects = await this.projects.getProjects();
    let targetMilestone = projects[0]?.milestones[1];
    let parentProject = projects[0];

    if (milestoneId) {
      for (const p of projects) {
        const found = p.milestones.find((m) => m.id === milestoneId);
        if (found) {
          targetMilestone = found;
          parentProject = p;
          break;
        }
      }
    }

    if (!targetMilestone) {
      throw new Error("Milestone not found");
    }

    targetMilestone.status = "completed";
    targetMilestone.completionPercentage = 100;
    targetMilestone.invoiceTriggered = true;

    // Create invoice in QBO
    const invoice = await this.qbo.createMilestoneInvoice({
      customerName: parentProject.clientAccount,
      customerEmail: "billing@client.com",
      projectId: parentProject.id,
      milestoneName: targetMilestone.name,
      amount: targetMilestone.billableAmount,
    });

    this.transfers.unshift({
      id: `TRX-${Date.now()}-5`,
      timestamp: new Date().toISOString(),
      trigger: "Zoho Projects Milestone Status: Completed",
      sourceSystem: "zoho-projects",
      targetSystem: "quickbooks",
      entityType: "Milestone -> QBO Invoice",
      recordId: targetMilestone.id,
      recordLabel: targetMilestone.name,
      status: "SUCCESS",
      durationMs: 74,
      retryCount: 0,
      details: `Generated Invoice ${invoice.docNumber} ($${invoice.totalAmount.toLocaleString()}) in QuickBooks Online.`,
      payload: {
        milestoneId: targetMilestone.id,
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
      },
    });

    // Alert in Teams
    const alert = await this.m365.postTeamsAlert({
      channel: "Billing & Financial Operations",
      title: `📄 Invoice Generated: ${invoice.docNumber}`,
      body: `Milestone '${targetMilestone.name}' completed on ${parentProject.projectName}. Draft invoice created for $${invoice.totalAmount.toLocaleString()}.`,
      urgency: "info",
      metadata: { invoiceId: invoice.id, projectId: parentProject.id },
    });

    return { invoice, teamsAlert: alert };
  }

  public async triggerPaymentSync(): Promise<{ invoice: unknown; alert: unknown }> {
    const invoices = await this.qbo.getInvoices();
    const sentInvoice = invoices.find((i) => i.status === "Sent") || invoices[0];

    const updated = await this.qbo.markInvoicePaid(sentInvoice.id);

    this.transfers.unshift({
      id: `TRX-${Date.now()}-6`,
      timestamp: new Date().toISOString(),
      trigger: "QuickBooks Webhook: Invoice.PaymentReceived",
      sourceSystem: "quickbooks",
      targetSystem: "microsoft-365",
      entityType: "Payment -> Teams Notification",
      recordId: sentInvoice.id,
      recordLabel: `Payment: ${sentInvoice.docNumber} ($${sentInvoice.totalAmount.toLocaleString()})`,
      status: "SUCCESS",
      durationMs: 41,
      retryCount: 0,
      details: `Confirmed settlement of $${sentInvoice.totalAmount.toLocaleString()} from ${sentInvoice.customerName}.`,
      payload: {
        invoiceId: sentInvoice.id,
        amount: sentInvoice.totalAmount,
        status: "Paid",
      },
    });

    const alert = await this.m365.postTeamsAlert({
      channel: "Billing & Financial Operations",
      title: `💵 Payment Confirmed: ${sentInvoice.docNumber}`,
      body: `Received full settlement of $${sentInvoice.totalAmount.toLocaleString()} from ${sentInvoice.customerName}.`,
      urgency: "success",
      metadata: { invoiceId: sentInvoice.id, amount: sentInvoice.totalAmount },
    });

    return { invoice: updated, alert };
  }

  public simulateFaultAndAutoRetry(): TransferEvent {
    const faultEvent: TransferEvent = {
      id: `TRX-${Date.now()}-FAULT`,
      timestamp: new Date().toISOString(),
      trigger: "Simulated Rate Limit & Network Glitch",
      sourceSystem: "quickbooks",
      targetSystem: "microsoft-365",
      entityType: "Audit Log Sync",
      recordId: "AUDIT-GL-771",
      recordLabel: "Nightly Ledger Batch Sync",
      status: "FAILED",
      durationMs: 1205,
      retryCount: 1,
      details: "HTTP 429 Too Many Requests: QuickBooks sandbox throttle exceeded. Exponential backoff queued.",
      payload: { retryAfterSeconds: 5, attempt: 1 },
    };

    this.transfers.unshift(faultEvent);

    // Auto-resolve after a slight delay
    setTimeout(() => {
      faultEvent.status = "SUCCESS";
      faultEvent.details = "Auto-recovered via exponential backoff (attempt 2). Sync completed successfully.";
      faultEvent.retryCount = 2;
    }, 3500);

    return faultEvent;
  }
}
