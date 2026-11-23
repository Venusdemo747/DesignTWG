import { getDatabaseClient, IDatabaseClient } from "./client";
import { DatabaseMigrator } from "./migrator";
import { PostgresEntityRepository } from "./repository";

export async function runDatabaseSeed(db: IDatabaseClient = getDatabaseClient()): Promise<void> {
  const migrator = new DatabaseMigrator(db);
  await migrator.runMigrations();

  const repo = new PostgresEntityRepository(db);

  // 1. Seed 7 Default Users for RBAC Roles
  const defaultUsers = [
    {
      id: "usr-irwin-ceo",
      email: "irwin@designtwg.com",
      fullName: "Irwin",
      role: "Executive",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-sarah-sales",
      email: "sarah.sales@designtwg.com",
      fullName: "Sarah Chen",
      role: "Sales Lead",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-nameeta-pm",
      email: "nameeta@designtwg.com",
      fullName: "Nameeta",
      role: "Project Manager",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-david-designer",
      email: "david.design@designtwg.com",
      fullName: "David Ross",
      role: "Designer",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-anju-finance",
      email: "anju@designtwg.com",
      fullName: "Anju",
      role: "Finance",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-alex-admin",
      email: "admin@designtwg.com",
      fullName: "Alex Admin",
      role: "Admin",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-victor-viewer",
      email: "viewer@designtwg.com",
      fullName: "Victor Viewer",
      role: "Viewer",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const user of defaultUsers) {
    await repo.createUser(user);
  }

  // 2. Seed Data-Driven Approver Routing Rules [ASSUMPTION: Roles for Irwin, Nameeta, Anju]
  const defaultRules = [
    {
      id: "rule-commercial",
      domain: "commercial_pricing",
      primaryApproverName: "Irwin",
      primaryApproverEmail: "irwin@designtwg.com",
      fallbackApproverName: "Nameeta",
      fallbackApproverEmail: "nameeta@designtwg.com",
      description: "Approval for proposals, discounts, fee benchmarking, and contractual terms.",
    },
    {
      id: "rule-design",
      domain: "design_gates",
      primaryApproverName: "Nameeta",
      primaryApproverEmail: "nameeta@designtwg.com",
      fallbackApproverName: "Irwin",
      fallbackApproverEmail: "irwin@designtwg.com",
      description: "Approval for D1-D5 gate sign-offs, kickoff packages, and design deliverables.",
    },
    {
      id: "rule-finance",
      domain: "finance_invoicing",
      primaryApproverName: "Anju",
      primaryApproverEmail: "anju@designtwg.com",
      fallbackApproverName: "Irwin",
      fallbackApproverEmail: "irwin@designtwg.com",
      description: "Approval for progressive billing triggers, receivables escalations, and invoice syncs.",
    },
  ];

  for (const rule of defaultRules) {
    await repo.saveApproverRule(rule);
  }

  // 3. Seed Initial Synthetic Records (Preserving existing synthetic baseline)
  await repo.saveCustomer({
    canonicalId: "TWG-CUST-SYN-001",
    sourceSystem: "zoho-crm",
    sourceRecordId: "SYN-ACC-001",
    recordOrigin: "MOCK_SYNTHETIC",
    companyName: "Oakwood Luxury Living LLC",
    displayName: "Oakwood Luxury Living LLC",
    primaryEmail: "mvance@oakwoodliving.com",
    currency: "USD",
    createdAt: "2026-10-22T08:00:00Z",
    updatedAt: "2026-10-22T08:00:00Z",
  });

  await repo.saveProject({
    canonicalId: "TWG-PRJ-SYN-701",
    sourceSystem: "zoho-projects",
    sourceRecordId: "SYN-PRJ-701",
    accountReferenceId: "TWG-CUST-SYN-001",
    recordOrigin: "MOCK_SYNTHETIC",
    projectName: "Oakwood Estates - Luxury Residential Renovation",
    status: "Active",
    templateCode: "TWG-Residential-HighEnd-v4",
    budgetHours: 420,
    loggedHours: 115,
    totalContractValue: 185000,
    currency: "USD",
    startDate: "2026-10-22",
    createdAt: "2026-10-22T09:00:00Z",
    updatedAt: "2026-10-22T09:00:00Z",
  });

  // 4. Seed Initial Audit Record
  await repo.appendAudit({
    id: `audit-seed-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: "system",
    actorRole: "Admin",
    action: "DATABASE_INITIALIZED",
    resourceType: "SYSTEM",
    status: "SUCCESS",
    diffJson: JSON.stringify({ seededUsers: defaultUsers.length, seededRules: defaultRules.length }),
  });
}

// Allow direct CLI execution
if (require.main === module || process.env.AUTO_SEED === "true") {
  runDatabaseSeed()
    .then(() => {
      console.log("Database seeded successfully with users, rules, and canonical records.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database seed failed:", err);
      process.exit(1);
    });
}
