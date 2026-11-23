import { SystemHealthInfo } from "../types";

export interface ZohoDeal {
  id: string;
  dealName: string;
  accountName: string;
  stage: "Closed Won" | "Proposal/Price Quote" | "Negotiation/Review" | "Qualification";
  amount: number;
  closingDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  projectScope: string;
  billingType: "Milestone" | "Fixed Fee" | "Time & Materials";
  lastModified: string;
}

export interface ZohoContact {
  id: string;
  fullName: string;
  accountName: string;
  email: string;
  phone: string;
  role: string;
}

export class ZohoCrmConnector {
  private readonly deals: ZohoDeal[] = [
    {
      id: "CRM-DEAL-8821",
      dealName: "Oakwood Estates - Luxury Residential Renovation",
      accountName: "Oakwood Luxury Living LLC",
      stage: "Closed Won",
      amount: 185000,
      closingDate: "2026-10-22",
      contactName: "Marcus Vance",
      contactEmail: "mvance@oakwoodliving.com",
      contactPhone: "+1 (415) 890-2134",
      projectScope: "Full architectural blueprint, structural calculations, interior millwork, lighting specification",
      billingType: "Milestone",
      lastModified: "2026-10-23T14:30:00Z",
    },
    {
      id: "CRM-DEAL-8822",
      dealName: "Apex Tower - 14th Floor Commercial Workspace",
      accountName: "Apex FinTech Global",
      stage: "Closed Won",
      amount: 320000,
      closingDate: "2026-10-23",
      contactName: "Elena Rostova",
      contactEmail: "e.rostova@apexfintech.io",
      contactPhone: "+1 (212) 555-0199",
      projectScope: "Modern executive office suite, acoustic glass partitions, HVAC zoning, smart lighting",
      billingType: "Milestone",
      lastModified: "2026-10-23T18:15:00Z",
    },
    {
      id: "CRM-DEAL-8823",
      dealName: "Bellevue Waterfront Villa - Sustainable Concept",
      accountName: "Pacific Heritage Trust",
      stage: "Proposal/Price Quote",
      amount: 245000,
      closingDate: "2026-11-05",
      contactName: "Julian Chen",
      contactEmail: "jchen@pacificheritage.org",
      contactPhone: "+1 (206) 778-9012",
      projectScope: "Net-zero energy residential villa, geothermal integration, mass timber framing",
      billingType: "Milestone",
      lastModified: "2026-10-24T00:10:00Z",
    },
  ];

  private readonly contacts: ZohoContact[] = [
    {
      id: "CRM-CNT-101",
      fullName: "Marcus Vance",
      accountName: "Oakwood Luxury Living LLC",
      email: "mvance@oakwoodliving.com",
      phone: "+1 (415) 890-2134",
      role: "Managing Director",
    },
    {
      id: "CRM-CNT-102",
      fullName: "Elena Rostova",
      accountName: "Apex FinTech Global",
      email: "e.rostova@apexfintech.io",
      phone: "+1 (212) 555-0199",
      role: "VP Real Estate & Workplace",
    },
    {
      id: "CRM-CNT-103",
      fullName: "Julian Chen",
      accountName: "Pacific Heritage Trust",
      email: "jchen@pacificheritage.org",
      phone: "+1 (206) 778-9012",
      role: "Senior Asset Manager",
    },
  ];

  public async checkHealth(): Promise<SystemHealthInfo> {
    return {
      id: "zoho-crm",
      name: "Zoho CRM",
      category: "CRM",
      status: "operational",
      connectionState: "MOCK",
      isLiveVerified: false,
      latencyMs: 38,
      lastCheckedAt: new Date().toISOString(),
      tokenExpiresInHours: 54,
      quotaUsed: 1420,
      quotaLimit: 5000,
      activeRecordsCount: this.deals.length + this.contacts.length,
      endpoint: "https://www.zohoapis.com/crm/v2",
      simulated: true,
      isReadOnly: false,
      supportedOperations: ["Deals.Read", "Contacts.Read", "Deals.ClosedWon.Webhook"],
      requiredScopes: ["ZohoCRM.modules.deals.READ", "ZohoCRM.modules.contacts.READ"],
      missingCredentials: [],
      notes: "OAuth2 refresh token validated. Active listener on Deals.Closed_Won webhook trigger.",
    };
  }

  public async getDeals(): Promise<ZohoDeal[]> {
    return [...this.deals];
  }

  public async getDealById(id: string): Promise<ZohoDeal | undefined> {
    return this.deals.find((deal) => deal.id === id);
  }

  public async getContacts(): Promise<ZohoContact[]> {
    return [...this.contacts];
  }

  public async createSimulatedDeal(deal: Omit<ZohoDeal, "id" | "lastModified">): Promise<ZohoDeal> {
    const newDeal: ZohoDeal = {
      ...deal,
      id: `CRM-DEAL-${Math.floor(1000 + Math.random() * 9000)}`,
      lastModified: new Date().toISOString(),
    };
    this.deals.unshift(newDeal);
    return newDeal;
  }
}
