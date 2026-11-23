# 01 — Milestone Implementation Plan & Architectural Decisions

**Project:** designTWG Agentic AI Business Operating System  
**Version:** 1.1.0  
**Target Architecture:** Human-Supervised Multi-Agent OS on Node.js/TypeScript  

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   designTWG Agentic AI Operating System                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     Presentation Layer: Executive Dashboard & Operations UI      │  │
│  │  - Health & Adapters    - Exception Inbox (S01/O02)              │  │
│  │  - CSV Studio           - Approval Queue (Human-in-the-Loop)     │  │
│  │  - Pipeline Visualizer  - Monday 8:00 AM CEO Briefing Viewer     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │ (Auth & Role-Based Access)       │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │     Server & Security Enforcement Layer (Express.js / TypeScript) │  │
│  │  - Session/Bearer Token Auth    - Server-Side RBAC Middleware    │  │
│  │  - Append-Only Audit Logging    - Secrets & PII Redaction        │  │
│  │  - Production Safety Invariant: Refuse start if DEV_AUTH in Prod │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────┴───────────────────────────────┐  │
│  │         Core Intelligence & Execution Subsystems                 │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Deterministic Exception     │  │ Human-Supervised Agent    │  │  │
│  │  │ Engine (Plain Code Rules)   │  │ Runtime & LLM Orchestrator│  │  │
│  │  │ - S01 Inactivity Detector   │  │ - Claude Sonnet 5.5       │  │  │
│  │  │ - O02 Milestone Risk Monitor│  │ - Configurable Token Caps │  │  │
│  │  │ - Staleness & QA Checks     │  │ - Prompt Defense & Schema │  │  │
│  │  └──────────────┬──────────────┘  │ - CEO Agent (12k budget)  │  │  │
│  │                 │                 └─────────────┬─────────────┘  │  │
│  │                 ▼                               ▼                │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │   Human-in-the-Loop Approval Queue (Data-Driven Routing)   │  │  │
│  │  │   Irwin, Nameeta, Anju [ASSUMPTION - Configurable via DB]  │  │  │
│  │  │   Draft -> Review -> Edit/Approve/Reject -> Audit Logged   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │     Persistence & Integration Layer                              │  │
│  │  - Dual-Dialect Repository: SQLite (Dev) / PostgreSQL (Prod)     │  │
│  │  - Versioned SQL Migrations (Verified on SQLite and Postgres)    │  │
│  │  - Canonical Data Repository (Customers, Deals, Projects, Milest)│  │
│  │  - Provider Connectors (Zoho CRM, Projects, QBO-RO, M365 Graph)  │  │
│  │  - Fallback CSV Ingestion & Pre-flight Validator                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Decision Records (ADRs)

### ADR 001: Lifting the "No Autonomous AI" Restriction for Agentic Operating System
- **Status:** Approved
- **Context:** `docs/01-integration-architecture.md` and `docs/10-known-limitations-and-approvals.md` prohibited AI during the initial CSV plumbing phase.
- **Decision:** Lift this restriction to implement the requirements of `designTWG_Agentic_AI_Problem_Statement.md`.
- **Governing Constraints:**
  1. AI agents operate strictly in **"Human-Supervised Draft Mode"** by default.
  2. No external email, write to CRM, invoice, or financial transaction may occur without explicit recorded human approval.
  3. Deterministic code detects exceptions before LLM reasoning is invoked.
  4. All AI outputs cite authoritative source data records, source dates, and agent run IDs.

### ADR 002: Web Server Framework Selection (Express.js Adoption)
- **Status:** Proposed (Awaiting user approval)
- **Context:** The server currently uses raw `node:http` with manual pathname dispatching in `src/server.ts`. This cannot cleanly support session management, bearer token authentication, server-side RBAC middleware, CSRF protection, and rate limiting.
- **Evaluation:**
  - **Option A: Express.js (Recommended)**
    - *Pros:* Industry-standard middleware ecosystem (`cors`, `helmet`, `express-rate-limit`), rock-solid TypeScript support, trivial migration from `(req, res)` handlers, zero dev friction, well-understood security practices.
    - *Cons:* Slightly heavier than bare Node, but negligible for enterprise internal tooling.
  - **Option B: Fastify**
    - *Pros:* Built-in schema validation, fast performance.
    - *Cons:* Ecosystem plugin overhead, steeper migration from standard Node stream handlers.
- **Decision:** Adopt **Express.js** as the application server framework.
- **Migration & Non-Regression Plan:**
  1. Mount existing static dashboard and API handlers under Express router without breaking signature contracts.
  2. Preserve all 15 existing REST endpoints (`/api/health`, `/api/connections/test`, `/api/ingestion/*`, `/api/pipeline/run`, `/api/transfers`, `/api/sync/*`).
  3. Run the existing test suite (`tests/server.test.ts`) using supertest/fetch to ensure zero regressions before adding auth middleware.

### ADR 003: Database Engine Strategy — Dual-Dialect Support (SQLite in Dev / PostgreSQL in Prod)
- **Status:** Approved
- **Context:** The environment audit confirms Docker is not installed on this developer workstation (`docker: The term 'docker' is not recognized`). Running PostgreSQL via `docker-compose` locally is physically impossible without installing Docker Desktop or a dedicated local PostgreSQL service.
- **Decision:** Implement a **Dual-Dialect Database Layer** using standard SQL migrations and a unified query interface (Kysely or Knex/SQL standard):
  1. **Development & Testing:** Embedded **SQLite** (`better-sqlite3`), running with WAL mode, zero configuration, and zero external daemons.
  2. **Production:** **PostgreSQL 16+** (Azure Database for PostgreSQL or containerized).
  3. **Compatibility Guarantee:** All schema definitions use standard ANSI SQL datatypes and constraints supported by both engines (`TEXT`, `INTEGER`, `NUMERIC`, `TIMESTAMP/DATETIME`). A dual-dialect migration test harness will run migrations against SQLite and validate the exact SQL DDL for PostgreSQL compatibility.

---

## 3. Specifications Addressing User Constraints

### 3.1 LLM Configuration & Token Budget
- **Default Model:** `claude-sonnet-5-5` (Anthropic Claude Sonnet 5.5).
- **Supported Provider Registry (`[VERIFY]` Verified):**
  - Anthropic: `claude-sonnet-5-5` (default), `claude-3-5-sonnet-latest`, `claude-3-7-sonnet-latest`
  - OpenAI: `gpt-4o`, `gpt-4o-mini`, `o3-mini`
  - Google Gemini: `gemini-2.0-flash`, `gemini-1.5-pro`
- **Rate & Cost Limits:**
  - Hard limit of **30 calls/hour** and **$15.00/day** ceiling with automated circuit breaker.
  - **Configurable per-agent token budgets:**
    - Sales Growth Agent: 4,000 input / 1,500 output tokens.
    - Project Delivery Agent: 6,000 input / 2,000 output tokens.
    - CEO Intelligence Agent: **16,000 input / 4,000 output tokens** (sized to ingest full multi-system weekly KPI snapshots).

### 3.2 Human-in-the-Loop Approvers & Data-Driven Routing
- **Status:** **`[ASSUMPTION]`**
  - The problem statement names **Irwin, Nameeta, and Anju** as reviewers (Section 7), but does **not** formally define their organizational titles or approval boundaries.
  - **Implementation Invariant:** Approver assignments are stored in data (database table `approver_routing_rules` and `config/approvers.json`), never hard-coded in logic:
    ```json
    {
      "rules": [
        { "domain": "commercial_pricing", "approver": "Irwin", "fallback": "Nameeta" },
        { "domain": "design_gates", "approver": "Nameeta", "fallback": "Irwin" },
        { "domain": "finance_invoicing", "approver": "Anju", "fallback": "Irwin" }
      ]
    }
    ```
  - This allows designTWG leadership to reassign responsibilities instantly without code modifications.

### 3.3 Microsoft Teams Webhooks vs. Email Notifications
- **Status:** **`[VERIFY]` Verified**
  - **Official Finding:** Microsoft officially **retired Office 365 Connectors** in Microsoft Teams (final cutoff May 2026). Legacy connector incoming webhook URLs no longer function.
  - **Modern Standard:** Teams channel alerts must be sent via the **Workflows App / Power Automate** template: *"Post to a channel when a webhook request is received"*, which accepts **Adaptive Cards (v1.4/1.5)**.
  - **Fallback:** SMTP Email (via NodeMailer) serves as the guaranteed deliverability fallback if webhook URLs fail or are unconfigured.

### 3.4 Production Safety Gate
- In `src/config/env.ts` and server startup:
  ```typescript
  if (config.NODE_ENV === "production" && config.AUTH_DEV_MODE === "true") {
    throw new Error("FATAL CONFIG ERROR: AUTH_DEV_MODE must NOT be enabled when NODE_ENV is production!");
  }
  ```

### 3.5 Timezone & DST-Safe Scheduling
- Schedule: Monday 08:00 AM in **`America/Toronto`** (Canada Eastern Time).
- Uses a DST-aware scheduler (`croner` with `timezone: "America/Toronto"`).
- Includes deterministic unit tests simulating the spring-forward (EST $\rightarrow$ EDT) and fall-back (EDT $\rightarrow$ EST) transition dates to verify exactly one trigger occurs at 08:00 local time.

### 3.6 Open Items for Client & Tenant Clarification
1. **Microsoft 365 Tenant Admin Access (`[VERIFY]`):** Who holds Global Administrator rights in designTWG’s Microsoft Entra ID tenant to grant admin consent for `Sites.Read.All` and `Files.Read.All` application scopes?
2. **Preferred Azure Data Residency Region (`[VERIFY]`):** For Canadian data sovereignty compliance regarding designTWG’s commercial client files, recommend **`Canada Central` (Toronto)**. Awaiting confirmation.
