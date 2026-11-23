import { SystemHealthInfo } from "../types";

export interface QboLineItem {
  id: string;
  description: string;
  amount: number;
  itemRef: string;
  quantity: number;
}

export interface QboCustomer {
  id: string;
  displayName: string;
  companyName: string;
  email: string;
  balance: number;
  currency: string;
}

export interface QboInvoice {
  id: string;
  docNumber: string;
  customerId: string;
  customerName: string;
  projectId: string;
  totalAmount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  txnDate: string;
  dueDate: string;
  lineItems: QboLineItem[];
  memo: string;
}

export class QuickBooksConnector {
  private readonly customers: QboCustomer[] = [
    {
      id: "QBO-CUST-501",
      displayName: "Oakwood Luxury Living LLC",
      companyName: "Oakwood Luxury Living LLC",
      email: "billing@oakwoodliving.com",
      balance: 0,
      currency: "USD",
    },
    {
      id: "QBO-CUST-502",
      displayName: "Apex FinTech Global",
      companyName: "Apex FinTech Global",
      email: "finance@apexfintech.io",
      balance: 80000,
      currency: "USD",
    },
  ];

  private readonly invoices: QboInvoice[] = [
    {
      id: "QBO-INV-10982",
      docNumber: "TWG-INV-2026-088",
      customerId: "QBO-CUST-501",
      customerName: "Oakwood Luxury Living LLC",
      projectId: "PRJ-TWG-701",
      totalAmount: 46250,
      status: "Paid",
      txnDate: "2026-10-22",
      dueDate: "2026-11-21",
      memo: "Initial Retainer & Phase 1 Schematic Architecture milestone",
      lineItems: [
        {
          id: "LINE-1",
          description: "Phase 1: Conceptual Architecture & Spatial Layout (25% Milestone)",
          amount: 46250,
          itemRef: "ITEM-ARCH-DESIGN",
          quantity: 1,
        },
      ],
    },
    {
      id: "QBO-INV-10983",
      docNumber: "TWG-INV-2026-089",
      customerId: "QBO-CUST-502",
      customerName: "Apex FinTech Global",
      projectId: "PRJ-TWG-702",
      totalAmount: 80000,
      status: "Sent",
      txnDate: "2026-10-24",
      dueDate: "2026-11-24",
      memo: "Commercial Workspace Phase 1 Workplace Programming milestone",
      lineItems: [
        {
          id: "LINE-2",
          description: "Phase 1: Workplace Programming & Acoustic Studies (25% Milestone)",
          amount: 80000,
          itemRef: "ITEM-COMM-FITOUT",
          quantity: 1,
        },
      ],
    },
  ];

  public async checkHealth(): Promise<SystemHealthInfo> {
    return {
      id: "quickbooks",
      name: "QuickBooks Online",
      category: "Accounting & ERP",
      status: "operational",
      connectionState: "MOCK",
      isLiveVerified: false,
      latencyMs: 52,
      lastCheckedAt: new Date().toISOString(),
      tokenExpiresInHours: 72,
      quotaUsed: 420,
      quotaLimit: 5000,
      activeRecordsCount: this.customers.length + this.invoices.length,
      endpoint: "https://quickbooks.api.intuit.com/v3/company/91303541882",
      simulated: true,
      isReadOnly: true,
      supportedOperations: ["Customers.Query (Read-Only)", "Invoices.Query (Read-Only)"],
      requiredScopes: ["com.intuit.quickbooks.accounting"],
      missingCredentials: [],
      notes: "Intuit OAuth 2.0 Realm active. Chart of Accounts mapped to 4000-Design-Revenue. STRICTLY READ-ONLY.",
    };
  }

  public async getCustomers(): Promise<QboCustomer[]> {
    return [...this.customers];
  }

  public async getInvoices(): Promise<QboInvoice[]> {
    return [...this.invoices];
  }

  public async findOrCreateCustomer(name: string, email: string): Promise<QboCustomer> {
    const existing = this.customers.find(
      (c) => c.companyName.toLowerCase() === name.toLowerCase() || c.displayName.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;

    const newCust: QboCustomer = {
      id: `QBO-CUST-${Math.floor(503 + this.customers.length)}`,
      displayName: name,
      companyName: name,
      email,
      balance: 0,
      currency: "USD",
    };
    this.customers.push(newCust);
    return newCust;
  }

  public async createMilestoneInvoice(params: {
    customerName: string;
    customerEmail: string;
    projectId: string;
    milestoneName: string;
    amount: number;
  }): Promise<QboInvoice> {
    const customer = await this.findOrCreateCustomer(params.customerName, params.customerEmail);
    const invoiceNum = `TWG-INV-2026-${String(this.invoices.length + 90).padStart(3, "0")}`;

    const newInvoice: QboInvoice = {
      id: `QBO-INV-${Math.floor(10990 + this.invoices.length)}`,
      docNumber: invoiceNum,
      customerId: customer.id,
      customerName: customer.displayName,
      projectId: params.projectId,
      totalAmount: params.amount,
      status: "Draft",
      txnDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      memo: `Milestone billing: ${params.milestoneName} for project ${params.projectId}`,
      lineItems: [
        {
          id: `LINE-${Date.now()}`,
          description: params.milestoneName,
          amount: params.amount,
          itemRef: "ITEM-ARCH-MILESTONE",
          quantity: 1,
        },
      ],
    };

    customer.balance += params.amount;
    this.invoices.unshift(newInvoice);
    return newInvoice;
  }

  public async markInvoicePaid(invoiceId: string): Promise<QboInvoice | undefined> {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.status = "Paid";
      const cust = this.customers.find((c) => c.id === inv.customerId);
      if (cust) {
        cust.balance = Math.max(0, cust.balance - inv.totalAmount);
      }
      return inv;
    }
    return undefined;
  }
}
