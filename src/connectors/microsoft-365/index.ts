import { SystemHealthInfo } from "../types";

export interface M365SharePointFolder {
  folderId: string;
  projectName: string;
  path: string;
  webUrl: string;
  subfolders: string[];
  filesCount: number;
  createdAt: string;
}

export interface M365TeamsAlert {
  id: string;
  channel: "Executive Architecture Pipeline" | "Project Delivery & Construction" | "Billing & Financial Operations";
  title: string;
  body: string;
  urgency: "info" | "success" | "warning";
  timestamp: string;
  metadata: Record<string, unknown>;
}

export class Microsoft365Connector {
  private readonly folders: M365SharePointFolder[] = [
    {
      folderId: "SP-DIR-401",
      projectName: "Oakwood Estates - Luxury Residential Renovation",
      path: "/sites/TWG-Projects/Clients/Oakwood Luxury Living LLC/Oakwood Estates",
      webUrl: "https://designtwg.sharepoint.com/sites/TWG-Projects/OakwoodEstates",
      subfolders: [
        "01_Contract_and_Proposals",
        "02_Schematic_Drawings_BIM",
        "03_Engineering_Specs",
        "04_Client_Presentations",
        "05_Invoices_and_Billing",
      ],
      filesCount: 24,
      createdAt: "2026-10-22T09:12:00Z",
    },
    {
      folderId: "SP-DIR-402",
      projectName: "Apex Tower - 14th Floor Commercial Workspace",
      path: "/sites/TWG-Projects/Clients/Apex FinTech Global/Apex Tower Fitout",
      webUrl: "https://designtwg.sharepoint.com/sites/TWG-Projects/ApexTower",
      subfolders: [
        "01_Contract_and_Proposals",
        "02_Schematic_Drawings_BIM",
        "03_Acoustic_MEP_Calculations",
        "04_Client_Presentations",
        "05_Invoices_and_Billing",
      ],
      filesCount: 16,
      createdAt: "2026-10-23T14:40:00Z",
    },
  ];

  private readonly teamsAlerts: M365TeamsAlert[] = [
    {
      id: "TEAMS-MSG-901",
      channel: "Executive Architecture Pipeline",
      title: "🎉 Deal Closed-Won: Oakwood Estates",
      body: "Zoho CRM Deal closed for $185,000. Project PRJ-TWG-701 provisioned in Zoho Projects and SharePoint dossier created.",
      urgency: "success",
      timestamp: "2026-10-22T09:14:00Z",
      metadata: { dealId: "CRM-DEAL-8821", amount: 185000 },
    },
    {
      id: "TEAMS-MSG-902",
      channel: "Billing & Financial Operations",
      title: "💵 Invoice Paid: TWG-INV-2026-088",
      body: "QuickBooks Online confirmed payment of $46,250 for Phase 1 Schematic Architecture from Oakwood Luxury Living LLC.",
      urgency: "success",
      timestamp: "2026-10-23T16:00:00Z",
      metadata: { invoiceId: "QBO-INV-10982", amount: 46250 },
    },
    {
      id: "TEAMS-MSG-903",
      channel: "Project Delivery & Construction",
      title: "📋 Milestone Update: Apex Tower Phase 1 In-Progress",
      body: "Zoho Projects milestone 'Workplace Programming & Acoustic Studies' reached 40% completion.",
      urgency: "info",
      timestamp: "2026-10-24T00:30:00Z",
      metadata: { projectId: "PRJ-TWG-702" },
    },
  ];

  public async checkHealth(): Promise<SystemHealthInfo> {
    return {
      id: "microsoft-365",
      name: "Microsoft 365 (SharePoint & Teams)",
      category: "Collaboration & Documents",
      status: "operational",
      connectionState: "MOCK",
      isLiveVerified: false,
      latencyMs: 31,
      lastCheckedAt: new Date().toISOString(),
      tokenExpiresInHours: 66,
      quotaUsed: 1840,
      quotaLimit: 10000,
      activeRecordsCount: this.folders.length + this.teamsAlerts.length,
      endpoint: "https://graph.microsoft.com/v1.0",
      simulated: true,
      isReadOnly: false,
      supportedOperations: ["Sites.Read", "Files.Metadata.Read", "ChannelMessage.Send"],
      requiredScopes: ["Sites.Read.All", "Files.Read.All"],
      missingCredentials: [],
      notes: "Azure AD App Registration valid. Graph API permissions: Sites.ReadWrite.All, ChannelMessage.Send. Document permissions preserved; no user bypass permitted.",
    };
  }

  public async getFolders(): Promise<M365SharePointFolder[]> {
    return [...this.folders];
  }

  public async getAlerts(): Promise<M365TeamsAlert[]> {
    return [...this.teamsAlerts];
  }

  public async provisionSharePointProjectDossier(
    projectName: string,
    clientAccount: string,
  ): Promise<M365SharePointFolder> {
    const slug = projectName.replace(/[^a-zA-Z0-9]/g, "");
    const folder: M365SharePointFolder = {
      folderId: `SP-DIR-${Math.floor(403 + this.folders.length)}`,
      projectName,
      path: `/sites/TWG-Projects/Clients/${clientAccount}/${projectName}`,
      webUrl: `https://designtwg.sharepoint.com/sites/TWG-Projects/${slug}`,
      subfolders: [
        "01_Contract_and_Proposals",
        "02_Schematic_Drawings_BIM",
        "03_Engineering_Specs",
        "04_Client_Presentations",
        "05_Invoices_and_Billing",
      ],
      filesCount: 5,
      createdAt: new Date().toISOString(),
    };
    this.folders.unshift(folder);
    return folder;
  }

  public async postTeamsAlert(alert: Omit<M365TeamsAlert, "id" | "timestamp">): Promise<M365TeamsAlert> {
    const newAlert: M365TeamsAlert = {
      ...alert,
      id: `TEAMS-MSG-${Math.floor(904 + this.teamsAlerts.length)}`,
      timestamp: new Date().toISOString(),
    };
    this.teamsAlerts.unshift(newAlert);
    return newAlert;
  }
}
