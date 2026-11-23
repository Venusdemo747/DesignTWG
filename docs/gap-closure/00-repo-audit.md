# 00 — Repository Audit & Baseline Assessment

**Project:** designTWG Agentic AI Business Operating System  
**Date:** November 2026  
**Auditor:** Principal Full-Stack Engineer & AI Systems Architect  
**Task Context:** Transition from Task 27 CSV Data Plumbing to Human-Supervised Agentic AI Operating System  

---

## 1. Executive Summary

This repository currently implements the **Phase 1 Data Plumbing & CSV Ingestion Prototype** (Task 27 Integration Foundation). It provides a robust, clean, and disciplined foundation for data modeling, CSV parsing, data validation, and simulated connector health checks. However, by architectural design (`docs/01-integration-architecture.md` and `docs/10-known-limitations-and-approvals.md`), all autonomous automation and AI agents were deliberately deferred.

The purpose of this audit is to catalogue the existing stack, identify highly reusable components, document existing technical debt and architectural gaps, and define a risk-managed path for evolving the system into the **Human-Supervised Agentic AI Business OS** required by `designTWG_Agentic_AI_Problem_Statement.md`.

---

## 2. Technical Stack Inventory

| Component | Current Technology | Status & Assessment |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js (v20.20.2), TypeScript 7.0.2 | Modern, strict typing enabled (`strict: true`, `target: ES2022`, `module: NodeNext`). Fast dev loop with `tsx`. |
| **Web Server Framework** | Native `node:http` (custom dispatcher) | Hand-crafted route dispatching in `src/server.ts`. Lightweight, but lacks middleware chaining, session management, and robust route parameter matching. |
| **Data Persistence** | In-Memory JavaScript `Map` (`CanonicalDataRegistry`) | **Critical Gap:** Zero persistence across restarts. Data lost on server stop. |
| **Data Validation** | Custom TypeScript validators + `zod` 4.6.7 | `zod` handles environment configuration; custom validator checks CSV syntax, references, and types. |
| **Logging** | `pino` 10.4.0 | Structured JSON logging with basic key redaction (`*.token`, `*.secret`, `*.client_secret`). |
| **Testing Suite** | `vitest` 5.0.5 | 11 test suites (36 unit/integration tests passing, 4 live connection tests skipped). High test discipline. |
| **Linting & Formatting** | None configured | No ESLint or Prettier setup. Relying solely on `tsc --noEmit`. |
| **Frontend / Dashboard** | Vanilla HTML5 / Modern CSS / Vanilla JS (`src/dashboard/html.ts`) | Server-rendered string template returning single-page interactive dashboard with tabs, KPI cards, and CSV upload forms. |
| **Authentication & RBAC** | None | Publicly accessible HTTP endpoints; no user identity, session, or role checking. |
| **AI / Agent Layer** | None | No LLM provider SDKs, no prompt registry, no agent loops, no approval workflows. |
| **Version Control** | Uninitialized (`.git` directory absent in download) | Working directory is currently untracked by Git. |

---

## 3. Component Reusability Analysis

### 3.1 Highly Reusable Components (Keep & Extend)
1. **Canonical Domain Types (`src/canonical/types.ts`):**
   - Clean data models for `CanonicalCustomer`, `CanonicalContact`, `CanonicalDeal`, `CanonicalProject`, `CanonicalMilestone`, `CanonicalDocument`, and `CanonicalFinancialRecord`.
   - *Extension needed:* Add activity timestamps, `ownerId`, `nextActionDescription`, `nextActionDueDate`, and milestone delay risk flags.
2. **CSV Ingestion & Validation Studio (`src/ingestion/*`):**
   - The 8 CSV entity templates, parser (`csv-parser.ts`), and pre-flight validation rules (`validator.ts`) are well-architected.
   - They will serve as the permanent manual data import fallback when live APIs are unavailable.
3. **8-Step Controlled Transfer Pipeline (`src/transfer/pipeline.ts`):**
   - Incorporates payload hashing, idempotency keys (`IDEMP-...`), duration tracking, and sanitized step logging.
   - Ideal foundation for tracking pipeline runs and agent execution traces.
4. **Provider Connector Abstractions (`src/connectors/*`):**
   - Clear separation between simulated connectors (`index.ts`) and API adapters (`adapter.ts`) for Zoho CRM, Zoho Projects, QuickBooks, and Microsoft 365.
   - Preserves the fundamental invariant: **QuickBooks is strictly read-only**.

### 3.2 Components Requiring Major Refactoring or Replacement
1. **`CanonicalDataRegistry` (`src/ingestion/registry.ts`):**
   - Currently stores data in volatile in-memory maps (`private readonly customers = new Map()`).
   - *Action:* Must be backed by a persistent database (PostgreSQL / SQLite) via a clean Repository/DAO pattern with versioned schema migrations, while maintaining identical public query methods.
2. **Raw `node:http` Server Dispatcher (`src/server.ts`):**
   - 299 lines of manual `if (method === "GET" && url.pathname === ...)` matching.
   - *Action:* Wrap or introduce a minimal, type-safe middleware router (or lightweight adapter) so authentication, server-side RBAC, CSRF defense, and rate-limiting can be mounted cleanly as middleware without spaghetti code.
3. **UI Layer (`src/dashboard/html.ts`):**
   - Monolithic string literal (771 lines). 
   - *Action:* Retain existing UI tabs (Health, Ingestion Studio, Pipeline, Canonical Registry, Mapping, Transfers), but modularize into template fragments and append new dedicated views: **Exception Inbox (S01/O02)**, **Approval Queue**, and **Monday CEO Briefing View**.

---

## 4. Technical Debt and Risks

1. **Vulnerability to Server Restarts:**
   - Any CSV upload or pipeline run disappears as soon as the Node process exits.
2. **Missing Server-Side Authorization:**
   - All REST endpoints (`/api/sync/*`, `/api/ingestion/import`) are unauthenticated. Anyone on the local network can trigger mutations.
3. **Absence of Version Control:**
   - The workspace is not currently a git repository. Any destructive edit risks data loss without local commits.
4. **Vitest Engine Warning:**
   - Vitest 5 outputs `Unsupported engine` warnings on Node v20 (demands Node 22+). While tests run and pass completely, upgrading Node or pinning Vitest may be considered in the future.
5. **No AI Safety Defenses:**
   - No prompt injection sanitization, token budgeting, or output schema validation currently exists.

---

## 5. Discrepancies: Gap Analysis Report vs. Real Code

| Item in Preliminary Analysis | Reality in Code | Assessment |
| :--- | :--- | :--- |
| **"QuickBooks lacks integration"** | QuickBooks adapter exists with mocked responses and read-only enforcement. | Code already respects the read-only financial invariant. |
| **"Missing CSV ingestion"** | High quality CSV ingestion already exists for 7 entity types. | Ingestion engine is already complete; only database persistence is needed. |
| **"No test coverage"** | 11 Vitest test files with 36 passing tests already exist. | Existing test foundation is strong and should be maintained as a regression safety net. |
| **"Express.js server"** | Server uses native `node:http` without Express. | Must maintain low-overhead architecture or choose an unobtrusive routing solution. |

---

## 6. Architectural Decision Record (ADR 001)

### ADR 001: Lifting the "No Autonomous AI" Restriction for Agentic Operating System
- **Status:** Approved
- **Context:** `docs/01-integration-architecture.md` and `docs/10-known-limitations-and-approvals.md` deliberately prohibited AI agents during the data plumbing phase to ensure integration stability.
- **Decision:** Explicitly lift this restriction to implement the requirements of `designTWG_Agentic_AI_Problem_Statement.md`.
- **Governing Constraints:**
  1. AI agents will operate strictly in **"Human-Supervised Draft Mode"** by default.
  2. No external email, write to CRM, invoice, or financial transaction may occur without explicit human approval.
  3. Deterministic code must detect exceptions before LLM reasoning is invoked.
  4. All AI outputs must cite authoritative source data records, source dates, and agent run IDs.
