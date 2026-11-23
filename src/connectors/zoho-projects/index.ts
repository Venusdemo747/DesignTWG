import { SystemHealthInfo } from "../types";

export interface ProjectMilestone {
  id: string;
  name: string;
  targetDate: string;
  status: "completed" | "in_progress" | "pending";
  billableAmount: number;
  invoiceTriggered: boolean;
  completionPercentage: number;
}

export interface ZohoProject {
  id: string;
  projectName: string;
  crmDealId: string;
  clientAccount: string;
  status: "Active" | "Planning" | "In Review" | "Completed";
  templateUsed: string;
  budgetHours: number;
  loggedHours: number;
  totalContractValue: number;
  startDate: string;
  endDate: string;
  milestones: ProjectMilestone[];
  sharePointFolderSynced: boolean;
}

export class ZohoProjectsConnector {
  private readonly projects: ZohoProject[] = [
    {
      id: "PRJ-TWG-701",
      projectName: "Oakwood Estates - Luxury Residential Renovation",
      crmDealId: "CRM-DEAL-8821",
      clientAccount: "Oakwood Luxury Living LLC",
      status: "Active",
      templateUsed: "TWG-Residential-HighEnd-v4",
      budgetHours: 420,
      loggedHours: 115,
      totalContractValue: 185000,
      startDate: "2026-10-22",
      endDate: "2027-04-15",
      sharePointFolderSynced: true,
      milestones: [
        {
          id: "MS-701-1",
          name: "Phase 1: Conceptual Architecture & Spatial Layout",
          targetDate: "2026-11-15",
          status: "completed",
          billableAmount: 46250,
          invoiceTriggered: true,
          completionPercentage: 100,
        },
        {
          id: "MS-701-2",
          name: "Phase 2: Structural Engineering & City Permits Submission",
          targetDate: "2026-12-20",
          status: "in_progress",
          billableAmount: 55500,
          invoiceTriggered: false,
          completionPercentage: 60,
        },
        {
          id: "MS-701-3",
          name: "Phase 3: Interior Architecture, Millwork & Fixture Specs",
          targetDate: "2027-02-28",
          status: "pending",
          billableAmount: 46250,
          invoiceTriggered: false,
          completionPercentage: 0,
        },
        {
          id: "MS-701-4",
          name: "Phase 4: Site Administration & Final Handover",
          targetDate: "2027-04-15",
          status: "pending",
          billableAmount: 37000,
          invoiceTriggered: false,
          completionPercentage: 0,
        },
      ],
    },
    {
      id: "PRJ-TWG-702",
      projectName: "Apex Tower - 14th Floor Commercial Workspace",
      crmDealId: "CRM-DEAL-8822",
      clientAccount: "Apex FinTech Global",
      status: "Planning",
      templateUsed: "TWG-Commercial-CorporateFitout-v3",
      budgetHours: 680,
      loggedHours: 45,
      totalContractValue: 320000,
      startDate: "2026-10-24",
      endDate: "2027-06-30",
      sharePointFolderSynced: true,
      milestones: [
        {
          id: "MS-702-1",
          name: "Phase 1: Workplace Programming & Acoustic Studies",
          targetDate: "2026-11-30",
          status: "in_progress",
          billableAmount: 80000,
          invoiceTriggered: false,
          completionPercentage: 40,
        },
        {
          id: "MS-702-2",
          name: "Phase 2: MEP & Structural Engineering Drawings",
          targetDate: "2027-01-31",
          status: "pending",
          billableAmount: 96000,
          invoiceTriggered: false,
          completionPercentage: 0,
        },
        {
          id: "MS-702-3",
          name: "Phase 3: FF&E Procurement & Millwork Detailing",
          targetDate: "2027-04-15",
          status: "pending",
          billableAmount: 80000,
          invoiceTriggered: false,
          completionPercentage: 0,
        },
        {
          id: "MS-702-4",
          name: "Phase 4: Construction Administration & Commissioning",
          targetDate: "2027-06-30",
          status: "pending",
          billableAmount: 64000,
          invoiceTriggered: false,
          completionPercentage: 0,
        },
      ],
    },
  ];

  public async checkHealth(): Promise<SystemHealthInfo> {
    return {
      id: "zoho-projects",
      name: "Zoho Projects",
      category: "Project Management",
      status: "operational",
      connectionState: "MOCK",
      isLiveVerified: false,
      latencyMs: 42,
      lastCheckedAt: new Date().toISOString(),
      tokenExpiresInHours: 48,
      quotaUsed: 980,
      quotaLimit: 3000,
      activeRecordsCount: this.projects.length,
      endpoint: "https://projectsapi.zoho.com/restapi/portal/twg-portal",
      simulated: true,
      isReadOnly: false,
      supportedOperations: ["Projects.Read", "Milestones.Read", "Templates.Apply"],
      requiredScopes: ["ZohoProjects.projects.READ", "ZohoProjects.milestones.READ"],
      missingCredentials: [],
      notes: "Project template engine loaded. Webhook active for Milestone.Completion status transitions.",
    };
  }

  public async getProjects(): Promise<ZohoProject[]> {
    return [...this.projects];
  }

  public async getProjectById(id: string): Promise<ZohoProject | undefined> {
    return this.projects.find((p) => p.id === id);
  }

  public async createProjectFromDeal(params: {
    dealId: string;
    dealName: string;
    clientAccount: string;
    contractValue: number;
    billingType: string;
  }): Promise<ZohoProject> {
    const isCommercial = params.dealName.toLowerCase().includes("commercial") ||
                         params.dealName.toLowerCase().includes("tower");
    const template = isCommercial
      ? "TWG-Commercial-CorporateFitout-v3"
      : "TWG-Residential-HighEnd-v4";

    const budgetHours = isCommercial ? 650 : 400;
    const v = params.contractValue;

    const newProject: ZohoProject = {
      id: `PRJ-TWG-${Math.floor(703 + this.projects.length)}`,
      projectName: params.dealName,
      crmDealId: params.dealId,
      clientAccount: params.clientAccount,
      status: "Planning",
      templateUsed: template,
      budgetHours,
      loggedHours: 0,
      totalContractValue: v,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      sharePointFolderSynced: false,
      milestones: [
        {
          id: `MS-${Date.now()}-1`,
          name: "Phase 1: Conceptual Schematic Design & Feasibility",
          targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          status: "in_progress",
          billableAmount: Math.round(v * 0.25),
          invoiceTriggered: false,
          completionPercentage: 10,
        },
        {
          id: `MS-${Date.now()}-2`,
          name: "Phase 2: Detailed Architectural & Engineering CD Sets",
          targetDate: new Date(Date.now() + 75 * 86400000).toISOString().split("T")[0],
          status: "pending",
          billableAmount: Math.round(v * 0.30),
          invoiceTriggered: false,
          completionPercentage: 0,
        },
        {
          id: `MS-${Date.now()}-3`,
          name: "Phase 3: Interior Finishes, FF&E Schedules & Permits",
          targetDate: new Date(Date.now() + 120 * 86400000).toISOString().split("T")[0],
          status: "pending",
          billableAmount: Math.round(v * 0.25),
          invoiceTriggered: false,
          completionPercentage: 0,
        },
        {
          id: `MS-${Date.now()}-4`,
          name: "Phase 4: Construction Administration & Site Sign-off",
          targetDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
          status: "pending",
          billableAmount: Math.round(v * 0.20),
          invoiceTriggered: false,
          completionPercentage: 0,
        },
      ],
    };

    this.projects.unshift(newProject);
    return newProject;
  }

  public async completeMilestone(milestoneId: string): Promise<ProjectMilestone | undefined> {
    for (const project of this.projects) {
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        milestone.status = "completed";
        milestone.completionPercentage = 100;
        return milestone;
      }
    }
    return undefined;
  }
}
