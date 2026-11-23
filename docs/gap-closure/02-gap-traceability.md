# 02 — Gap Traceability Matrix & Requirements Register

**Source of Truth:** `designTWG_Agentic_AI_Problem_Statement.md`  
**System Status:** Milestone 1 Foundation Complete & Verified; Business Gaps Scheduled across Milestones M2–M9.  

---

## CATEGORY 1: BUSINESS REQUIREMENTS (from MD Sections 3, 4, and 5)

### 1.1 Sales Gaps (MD Section 3: S01 – S07)

| Gap ID | Business Gap (from MD) | Agent Owner | Milestone | Status | Evidence (Tests / Commit / Artifact) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S01** | Qualified opportunities lack recorded owners, next actions, follow-up dates; leads become inactive without automated flagging | Sales Growth Agent | **M2** (Detection) + **M3** (Drafting & Approval) | **M2 DETECTION VERIFIED** | `tests/s01-detector.test.ts` (S01-1, S01-2, S01-3, S01-4), `tests/business-days.test.ts`, `tests/exceptions-lifecycle.test.ts`, `tests/exceptions-api.test.ts` |
| **S02** | Prospecting across hospitality/commercial franchise sectors is unsystematic; target account research is manual | Target Account Research Agent | **M7** | Not started | Scheduled for M7 |
| **S03** | Proposal production requires repetitive manual assembly of scope, fees, timeline from past projects without precedent retrieval | Proposal & Pricing Agent | **M6** | Not started | Scheduled for M6 Precedent Index |
| **S04** | Win/loss patterns and stalled-deal causes are not systematically analyzed to improve conversion | Pipeline Analytics Agent | **M7** | Not started | Scheduled for M7 |
| **S05** | Commitments made during sales are not translated to standardized project kickoff briefs and task structures | Kickoff Handoff Generator | **M7** | Not started | Scheduled for M7 |
| **S06** | Fee decisions are made without immediate visibility into historical actual hours, margins, or cost overruns | Proposal & Pricing Agent | **M6** | Not started | Scheduled for M6 Historical Fee Benchmarking |
| **S07** | Follow-up with past clients and key accounts relies on executive memory rather than scheduled relationship intelligence | Account Intelligence Digest | **M7** | Not started | Scheduled for M7 |

---

### 1.2 Operations Gaps (MD Section 4: O01 – O10)

| Gap ID | Business Gap (from MD) | Agent Owner | Milestone | Status | Evidence (Tests / Commit / Artifact) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **O01** | D1–D5 design phases lack uniform stage-gate verification; deliverable completion and sign-off tracking varies across PMs | Stage-Gate Validator | **M6** | Not started | Scheduled for M6 D1–D5 tracker |
| **O02** | Project delays, scope creep, and milestone slippage are identified reactively rather than flagged proactively | Project Delivery Agent | **M2** (Detection) + **M3** (Escalation) | **M2 DETECTION VERIFIED** | `tests/o02-detector.test.ts` (O02-1 overdue, O02-2 at-risk 3-business-day lead time), `tests/business-days.test.ts`, `tests/exceptions-lifecycle.test.ts`, `tests/exceptions-api.test.ts` |
| **O03** | Project documents, specifications, and client communications are fragmented across folders without unified search | Knowledge & RAG Agent | **M9** | Not started | Scheduled for M9 SharePoint RAG |
| **O04** | Cross-referencing drawing sets, specifications, and equipment schedules for consistency requires tedious manual review | Drawing & Spec QA Agent | **M9** | Not started | Scheduled for M9 QA verification |
| **O05** | Staff allocation across concurrent projects is managed via disconnected spreadsheets without skill or deadline visibility | Resource Allocator | **M8** | Not started | Scheduled for M8 Capacity Balancer |
| **O06** | Scope additions are performed before change orders are priced, documented, and commercially approved | Scope & Change Agent | **M8** | Not started | Scheduled for M8 Change Order Drafter |
| **O07** | FF&E specification, client approvals, and procurement tracking require manual coordination between design and finance | FF&E Procurement Tracker | **M6** | Not started | Scheduled for M6 FF&E matrix |
| **O08** | Project delivery milestones and financial billing milestones are disconnected, creating delayed invoicing and margin leakage | Profitability Engine | **M6** | Not started | Scheduled for M6 Margin Reconciliation |
| **O09** | Executive reporting requires manual compilation of hours, milestones, billing, and pipeline data every week | CEO Intelligence Agent | **M4** | Not started | Scheduled for M4 Monday 08:00 Briefing |
| **O10** | Lessons learned, design decisions, and vendor evaluations from completed projects are rarely captured for future reuse | Retrospective Knowledge Repo | **M8** | Not started | Scheduled for M8 Post-Project Repo |

---

### 1.3 Cross-Functional Gaps (MD Section 5: X01 – X04)

| Gap ID | Business Gap (from MD) | Agent Owner | Milestone | Status | Evidence (Tests / Commit / Artifact) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **X01** | Sales commitments and project delivery capacity are not evaluated together, risking overcommitment | Sales-Delivery Capacity Balancer | **M6** | Not started | Scheduled for M6 |
| **X02** | Past project data, proposals, and margin outcomes are underutilized in scoping new commercial work | Historical Precedent Retrieval | **M6** + **M8** | Not started | Scheduled for M6/M8 |
| **X03** | Financial and operational performance reporting is retrospective; forecasting runway and slippage lacks predictive models | Runway & Slippage Engine | **M4** + **M6** | Not started | Scheduled for M4/M6 |
| **X04** | Managing exceptions across sales and delivery requires disproportionate CEO involvement in routine operational decisions | Human-in-the-Loop Routing | **M3** + **M4** | In progress (routing rules seeded) | Approver routing table seeded in M1 |

---

## CATEGORY 2: ENGINEERING FOUNDATIONS (Implemented & Verified in M1)

| Engineering Foundation Component | Implementation Details | Status | Evidence (Tests / Code) |
| :--- | :--- | :--- | :--- |
| **Persistent Relational DB** | PostgreSQL 16+ via `@electric-sql/pglite` and `pg.Pool` | **VERIFIED** | `tests/db.test.ts`, `tests/persistence-restart.test.ts` |
| **Versioned SQL Migrations** | `001_initial_schema.sql` (13 core tables, indexes, triggers) | **VERIFIED** | `DatabaseMigrator.runMigrations()` |
| **Append-Only Audit Trigger** | PL/pgSQL triggers blocking UPDATE, DELETE, and TRUNCATE | **VERIFIED** | `tests/db.test.ts` (Update, Delete & Truncate throw) |
| **Server-Side Deny-By-Default RBAC**| 7 application roles enforced at Express layer; route crawler | **VERIFIED** | `tests/rbac.test.ts` (Automated route tree scan) |
| **Session Security & Invalidation** | SHA-256 token hashing, expiry, idle timeout, logout deletion | **VERIFIED** | `tests/auth.test.ts` (Hashed storage, logout invalidation) |
| **Express Middleware Hardening** | Helmet headers, rate limiting (200 req/min), 2MB body limit | **VERIFIED** | `tests/server.test.ts` (413 Payload Too Large, Helmet headers) |
| **Production Safety Gate** | Refusal to launch if `AUTH_DEV_MODE=true` in `production` | **VERIFIED** | `tests/auth.test.ts` |
| **QuickBooks Read-Only Invariant** | Direct writes blocked without recorded approval ID | **VERIFIED** | `tests/qbo-read-only.test.ts` (Writes throw violation error) |

---

## CATEGORY 3: PROJECT & ARCHITECTURAL DECISIONS (Engineering Choices)

| Decision Item | Chosen Standard & Rationale | Status |
| :--- | :--- | :--- |
| **Default LLM Model** | Claude Sonnet 5.5 (`claude-sonnet-5-5`), configurable via env; verified naming | Adopted for M3 |
| **LLM Cost & Rate Caps** | Hard ceiling: $15.00/day, 30 calls/hr; per-agent token limits (CEO: 16k input) | Designed for M3/M5 |
| **Teams Alerting Channel** | Workflows / Power Automate App webhook (Adaptive Cards v1.4/1.5); SMTP email fallback | Verified finding (legacy retired) |
| **Executive Schedule & Timezone**| Monday 08:00 AM America/Toronto with DST-safe croner engine | Scheduled for M4 |
| **Approver Personas** | Irwin, Nameeta, Anju roles marked `[ASSUMPTION]`; routing stored in data table | Implemented in M1 seed |

---

## CATEGORY 4: MD SECTION 8 SAFEGUARDS

| Section 8 Safeguard Requirement | Description in Problem Statement | Milestone | Implementation Status |
| :--- | :--- | :--- | :--- |
| **Least-Privilege System Access** | Role-based permissions matching user job function; no broad access | **M1** | **VERIFIED** (`src/auth/middleware.ts`, `docs/gap-closure/03-rbac-matrix.md`) |
| **Document-Level Permissions** | Sensitive commercial, financial, and client files restricted | **M1** + **M9** | M1 canonical model includes `access_permission_scope`; M9 enforces in SharePoint RAG |
| **Explicit Tool Permissions** | Agents have only specific read or draft permissions; no autonomous writes | **M1** + **M3** | **VERIFIED for QBO** (`tests/qbo-read-only.test.ts`); M3 enforces for CRM and Projects |
| **Mandatory Source Citations** | Every AI output cites source record, field, date, and confidence level | **M3** | Schema required in M3 prompt registry and response validators |
| **Approval Gates for Actions** | High-impact actions require explicit human review and sign-off | **M1** + **M3** | M1 seeded approver rules; M3 builds interactive Approval Queue |
| **Append-Only Audit Logs** | Comprehensive audit trail of data access, agent runs, approvals, errors | **M1** | **VERIFIED** (`audit_log` table with PL/pgSQL immutable triggers) |
| **Configurable Retention Rules**| Policy-driven data retention periods; compliant purge jobs | **M1-fix** | Implemented in `src/retention/policy.ts` |
| **Prompt Injection Defenses** | Treat all external data (CSV cells, notes, documents) as untrusted | **M3** | Prompt sanitization layer and delimiter defense in M3 |
| **Deterministic Error Handling**| Graceful degradation on connector timeout or rate limit | **M1** | **VERIFIED** (Health aggregator, honest degraded status, retry monitor) |
| **Evaluation Harness & Golden Set**| Regression test suite evaluating agent accuracy and safety | **M3** | Scheduled for M3 agent harness |

---

## CATEGORY 5: MD SECTION 9 SUCCESS METRICS

| Metric Name (MD Section 9) | Target Value | Baseline Status | Current Value | Tracking Component |
| :--- | :--- | :--- | :--- | :--- |
| **Deals with Recorded Next Action** | $\ge 95\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **Follow-up Actions on Time** | $\ge 95\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **Overdue Milestones Surfaced Early** | $100\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **Weekly Report Preparation Time** | $-50\%$ to $-60\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **D1–D5 Stage Gate Completion** | $\ge 95\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **Proposal Drafting Time** | $-40\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |
| **CEO Operational Exception Time** | $-30\%$ | *Illustrative, not verified* | Pending baseline capture | `src/metrics/index.ts` |

---

## CATEGORY 6: MD SECTION 10 DISCOVERY QUESTIONS & BASELINE READINESS

| Discovery Question (MD Section 10) | Data Source Needed | Calculation Method | Baseline Status |
| :--- | :--- | :--- | :--- |
| **1. % of open deals lacking next steps/recent activity** | Zoho CRM Deals | Count open qualified deals where `next_step` is NULL or `last_activity > 5 days` / Total open deals | Needs M2 S01 Detector |
| **2. Proposal development time by project type & delays** | Zoho CRM Proposals / PM logs | Timestamp of deal created to proposal sent; variance against project type median | Data-Request Checklist generated |
| **3. Count of overdue tasks & inconsistent D1–D5 checks** | Zoho Projects Milestones & Tasks | Overdue tasks count; count of completed milestones missing prerequisite gate sign-offs | Needs M2 O02 + M6 D1–D5 |
| **4. Extra scope done without commercial approval** | Zoho Projects timesheets vs QBO change orders | Logged hours beyond contract baseline without corresponding approved change order invoice | Data-Request Checklist generated |
| **5. Reconciliation of project effort to realized margin** | Zoho Projects logged hours $\times$ rates vs QBO payments | Total billed and collected minus (logged hours $\times$ burdened labor rate) / Total contract value | Data-Request Checklist generated |
| **6. Reliability & accessibility of documents/fields** | SharePoint / Zoho CRM field audit | Completeness score: % of mandatory fields non-null across past 90 days imports | Discovery Module (`src/discovery`) |
