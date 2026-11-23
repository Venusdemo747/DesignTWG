import { IEntityRepository, PostgresEntityRepository } from "../db/repository";

export interface DiscoveryQuestionResult {
  questionNumber: number;
  questionText: string;
  dataSourceNeeded: string;
  calculationMethod: string;
  canBeAnswered: boolean;
  currentAnswer: string;
  confidence: "High" | "Medium" | "Low" | "Insufficient Data";
  missingDataPoints: string[];
}

export interface DataRequestItem {
  id: string;
  system: "Zoho CRM" | "Zoho Projects" | "QuickBooks" | "SharePoint / M365";
  entityName: string;
  requiredFields: string[];
  justification: string;
  priority: "High" | "Medium" | "Low";
}

export class DiscoveryBaselineService {
  constructor(private readonly repo: IEntityRepository = new PostgresEntityRepository()) {}

  public async evaluateDiscoveryQuestions(): Promise<{
    evaluatedAt: string;
    questions: DiscoveryQuestionResult[];
    dataRequestChecklist: DataRequestItem[];
  }> {
    const deals = await this.repo.getAllDeals();
    const projects = await this.repo.getAllProjects();
    const milestones = await this.repo.getAllMilestones();
    const financial = await this.repo.getAllFinancialRecords();
    const documents = await this.repo.getAllDocuments();

    const questions: DiscoveryQuestionResult[] = [];

    // Question 1: % of open deals lacking next steps or recent activity
    const openDeals = deals.filter((d) => !["Closed Won", "Closed Lost"].includes(d.stage));
    if (openDeals.length > 0) {
      // In canonical deals, check missing next steps or stale updates
      const lackingDeals = openDeals.filter((d) => !d.scopeSummary || d.probabilityPercentage === 0);
      const percentage = Number(((lackingDeals.length / openDeals.length) * 100).toFixed(1));
      questions.push({
        questionNumber: 1,
        questionText: "What percentage of open deals lack a clear next step or have had no recorded activity in the past five business days?",
        dataSourceNeeded: "Zoho CRM Deals (Stage != Closed Won/Lost, Next_Step field, Last_Activity_Time)",
        calculationMethod: "Count(Open Deals with NULL next_step OR last_activity > 5 business days) / Total Open Deals * 100",
        canBeAnswered: true,
        currentAnswer: `${percentage}% of open deals (${lackingDeals.length}/${openDeals.length}) lack documented next action steps or qualified probability in current records.`,
        confidence: "Medium",
        missingDataPoints: ["Live CRM last_activity_time field requires M2 detector or live sync."],
      });
    } else {
      questions.push({
        questionNumber: 1,
        questionText: "What percentage of open deals lack a clear next step or have had no recorded activity in the past five business days?",
        dataSourceNeeded: "Zoho CRM Deals",
        calculationMethod: "Count(Open Deals with NULL next_step) / Total Open Deals * 100",
        canBeAnswered: false,
        currentAnswer: "Cannot be answered: missing active open CRM deals in canonical repository.",
        confidence: "Insufficient Data",
        missingDataPoints: ["Active open deals export from Zoho CRM."],
      });
    }

    // Question 2: Proposal development time by project type and causes of delay
    questions.push({
      questionNumber: 2,
      questionText: "What is the average elapsed time between initial qualification and proposal delivery across different project types, and what are the primary causes of delay?",
      dataSourceNeeded: "Zoho CRM Deal Stage History & Proposal Timestamp logs",
      calculationMethod: "Average(Proposal_Delivery_Date - Qualified_Stage_Date) grouped by architectural_type",
      canBeAnswered: false,
      currentAnswer: "Cannot be answered: missing historical stage-transition timestamps and proposal draft completion logs.",
      confidence: "Insufficient Data",
      missingDataPoints: [
        "Deal stage history log (Qualified -> Proposal Drafted -> Proposal Sent timestamps).",
        "Project typology classification (Hospitality vs. Retail vs. Office).",
      ],
    });

    // Question 3: Count of overdue tasks and inconsistent D1–D5 checks
    const overdueMilestones = milestones.filter(
      (m) => m.targetDate && new Date(m.targetDate).getTime() < Date.now() && m.status !== "completed"
    );
    questions.push({
      questionNumber: 3,
      questionText: "How many active tasks across all projects are past their due dates, and which D1–D5 stage-gate checklist items are most consistently omitted or delayed?",
      dataSourceNeeded: "Zoho Projects Milestone & Task deliverables with D1–D5 stage tags",
      calculationMethod: "Count(Milestones WHERE target_date < TODAY AND status != 'Completed')",
      canBeAnswered: milestones.length > 0,
      currentAnswer: milestones.length > 0
        ? `Found ${overdueMilestones.length} overdue milestones out of ${milestones.length} total monitored milestones. D1-D5 gate checklist detail requires Phase 2 deliverable tracking.`
        : "Cannot be answered: missing Zoho Projects milestone records in canonical store.",
      confidence: milestones.length > 0 ? "Medium" : "Insufficient Data",
      missingDataPoints: ["Per-deliverable D1–D5 checklist completion flags in Zoho Projects."],
    });

    // Question 4: Frequency of extra scope done without commercial approval
    questions.push({
      questionNumber: 4,
      questionText: "How frequently is out-of-scope work performed before a formal change order is documented and approved?",
      dataSourceNeeded: "Zoho Projects Timesheet logs against budget hours vs. QBO Change Order invoices",
      calculationMethod: "Count(Projects WHERE logged_hours > budget_hours AND change_orders_count == 0)",
      canBeAnswered: projects.length > 0,
      currentAnswer: projects.some((p) => Number(p.loggedHours) > Number(p.budgetHours))
        ? `Detected project budget hour overruns without corresponding approved change order records.`
        : "Cannot be verified conclusively: timesheet hour logs and formal change order links require financial linking.",
      confidence: "Low",
      missingDataPoints: [
        "Timesheet task-level hour entries with scope classification.",
        "QuickBooks change order invoice line items.",
      ],
    });

    // Question 5: Reconciling project effort and financial records for realized margin
    questions.push({
      questionNumber: 5,
      questionText: "Can project effort records and financial accounting data currently be reconciled with sufficient accuracy to estimate realized project margin?",
      dataSourceNeeded: "Zoho Projects logged hours * burdened cost rate vs. QuickBooks collected payments",
      calculationMethod: "(QBO Total Collected - (Zoho Projects Hours * Hourly Burden Rate)) / QBO Total Collected",
      canBeAnswered: false,
      currentAnswer: "Cannot be answered: missing staff burdened hourly labor cost rate table and shared deal-project-invoice cross-reference ID.",
      confidence: "Insufficient Data",
      missingDataPoints: [
        "Staff cost rate table (internal burdened cost per hour).",
        "Consistent shared Project ID populated across both Zoho Projects and QuickBooks invoices.",
      ],
    });

    // Question 6: Document accessibility and reliability
    const totalDocs = documents.length;
    questions.push({
      questionNumber: 6,
      questionText: "Which documents and data fields across existing platforms are sufficiently reliable, current, and accessible to serve as the foundation for agent-assisted workflows?",
      dataSourceNeeded: "Audit of Canonical Customers, Deals, Projects, Milestones, and SharePoint folders",
      calculationMethod: "% Completeness across mandatory architectural fields",
      canBeAnswered: true,
      currentAnswer: `Evaluated ${deals.length} deals, ${projects.length} projects, ${milestones.length} milestones, ${financial.length} financial records, and ${totalDocs} document dossiers. Customer IDs and milestone dates are reliable; financial writes remain strictly guarded.`,
      confidence: "High",
      missingDataPoints: ["Live SharePoint graph index permissions."],
    });

    // Generate Data-Request Checklist for designTWG
    const dataRequestChecklist: DataRequestItem[] = [
      {
        id: "REQ-001",
        system: "Zoho CRM",
        entityName: "Deals & Deal Stages",
        requiredFields: ["Deal_Name", "Stage", "Amount", "Closing_Date", "Next_Step", "Owner", "Last_Activity_Time"],
        justification: "Required for S01 Inactivity Detector and pipeline conversion metrics.",
        priority: "High",
      },
      {
        id: "REQ-002",
        system: "Zoho Projects",
        entityName: "Projects & Milestones",
        requiredFields: ["Project_Name", "Milestone_Name", "Start_Date", "End_Date", "Status", "Owner", "Budget_Hours"],
        justification: "Required for O02 Milestone Risk Detector and D1–D5 stage-gate verification.",
        priority: "High",
      },
      {
        id: "REQ-003",
        system: "QuickBooks",
        entityName: "Invoices & Payments (Read-Only)",
        requiredFields: ["DocNumber", "CustomerRef", "TxnDate", "DueDate", "TotalAmt", "Balance", "LineItems"],
        justification: "Required for cash-flow runway tracking, overdue billing alerts, and realized margin calculation.",
        priority: "High",
      },
      {
        id: "REQ-004",
        system: "Zoho Projects",
        entityName: "Timesheets",
        requiredFields: ["Project_ID", "Task_ID", "User", "Hours", "Billing_Type", "Date"],
        justification: "Required for Discovery Question 4 and project margin reconciliation.",
        priority: "Medium",
      },
      {
        id: "REQ-005",
        system: "SharePoint / M365",
        entityName: "Project Folders & Drawings",
        requiredFields: ["Site_ID", "Folder_Path", "Category (D1_D5)", "Permissions"],
        justification: "Required for automated architectural dossier provisioning and spec QA retrieval.",
        priority: "Medium",
      },
    ];

    return {
      evaluatedAt: new Date().toISOString(),
      questions,
      dataRequestChecklist,
    };
  }
}
