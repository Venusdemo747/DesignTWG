# 02 — Gap Traceability Matrix

**Project:** designTWG Agentic AI Operating System  
**Mapping Standard:** `designTWG_Agentic_AI_Problem_Statement.md` $\leftrightarrow$ Implementation Milestones  

---

## 1. Sales Gaps (S01 – S07)

| Gap ID | Specific Business Gap | Target Capability | Assigned Milestone | Implementation Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S01** | Qualified opportunities lack recorded owners, next actions, follow-up dates | Monitor CRM, flag inactivity, draft follow-ups, request approval | **M2** (Detection) + **M3** (Drafting & Approval) | `S01InactivityDetector`, `SalesGrowthAgent`, `ApprovalQueue` | Planned |
| **S02** | Unsystematic prospecting across hospitality/franchise | Research and prioritize qualified target accounts | Backlog (Phase 3) | Target Account Research Agent hook | Hook designed |
| **S03** | Proposal production requires manual retrieval of scope, fees, precedents | Assemble drafts from approved templates and precedents | **M6** (Phase 2) | `ProposalPricingAgent`, Scope Precedent Index | Planned |
| **S04** | Win/loss and stalled-deal patterns not analyzed | Surface conversion bottlenecks and interventions | Backlog (Phase 3) | Pipeline Analytics & Win/Loss Analyzer | Hook designed |
| **S05** | Commitments not translated to standardized project handoffs | Generate approved kickoff briefs and checklist packages | Backlog (Phase 3) | Deal-Won Kickoff Handoff Generator | Hook designed |
| **S06** | Fee decisions disconnected from historical effort and margin | Provide benchmark-based pricing flags and margin scenarios | **M6** (Phase 2) | Historical Fee Benchmarking Engine | Planned |
| **S07** | Key-account follow-up relies on executive memory | Relationship briefs and prioritized engagement plans | Backlog (Phase 3) | Key Account Intelligence Digest | Hook designed |

---

## 2. Operations Gaps (O01 – O10)

| Gap ID | Specific Business Gap | Target Capability | Assigned Milestone | Implementation Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **O01** | D1–D5 checklist & approval completion varies between projects | Check stage gates and flag missing deliverables | **M6** (Phase 2) | `D1D5StageGateValidator`, Deliverable Checklist | Planned |
| **O02** | Project delays and blockers detected via periodic manual review | Monitor milestones and escalate risks before deadlines | **M2** (Detection) + **M3** (Escalation Agent) | `O02MilestoneRiskDetector`, `ProjectDeliveryAgent` | Planned |
| **O03** | Project knowledge fragmented across documents/folders | Permission-aware search and evidence-linked answers | Backlog (Phase 3) | SharePoint Document RAG with Security Trimming | Hook designed |
| **O04** | Manual QA misses inconsistencies across drawings, specs, schedules | Flag discrepancies for designer verification | Backlog (Phase 3) | Spec/Schedule Cross-Verification Engine | Hook designed |
| **O05** | Staff allocation lacks unified view of skills, deadlines, capacity | Suggest workload and resource adjustments | Backlog (Phase 3) | Capacity & Skill Allocation Optimizer | Hook designed |
| **O06** | Additional scope not identified and priced before work proceeds | Detect potential changes and draft approval requests | Backlog (Phase 3) | Scope Creep & Change Order Detection | Hook designed |
| **O07** | FFE specs, approvals, and procurement need tighter coordination | Track FFE matrix completeness and approval exceptions | **M6** (Phase 2) | `FfeMatrixTracker`, Procurement Exception Flag | Planned |
| **O08** | Project delivery and financial performance not integrated for margin forecasts | Combine effort, scope, and accounting to flag margin risk | **M6** (Phase 2) | Effort/Accounting Margin Reconciliation Engine | Planned |
| **O09** | Executive reporting depends on repetitive manual consolidation | Generate validated weekly KPI and decision briefs | **M4** | `CeoIntelligenceAgent`, Monday Briefing View | Planned |
| **O10** | Lessons learned not consistently captured for reuse | Structure post-project learning & process updates | Backlog (Phase 3) | Retrospective Knowledge Repository | Hook designed |

---

## 3. Cross-Functional Gaps (X01 – X04)

| Gap ID | Gap | Business Implication | Assigned Milestone | Implementation Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **X01** | Sales commitments and delivery capacity not evaluated together | Overcommitment and resource strain | **M6** | Sales Pipeline vs. Active Project Capacity Balancer | Planned |
| **X02** | Historical proposals, costs, and decisions underused | Repeated work and inconsistent pricing | **M6** | Proposal & Pricing Agent (Precedent Database) | Planned |
| **X03** | Performance reporting is mainly retrospective | Delayed intervention on cash, schedule, and margins | **M4** + **M6** | Predictive Runway & Schedule Slippage Alerts | Planned |
| **X04** | Routine exceptions require disproportionate CEO involvement | Less time for strategic growth and leadership | **M3** + **M4** | Delegated Human-in-the-Loop Approval Routing | Planned |
