# 03 — Role-Based Access Control (RBAC) Permission Matrix

**Project:** designTWG Agentic AI Business Operating System  
**Standard:** Server-Side Enforced, Deny-by-Default  
**Security Invariant:** Every route without an explicit public allowlist entry requires authentication and role verification.  

---

## 1. Role Definitions

1. **Executive (CEO / Managing Principal - Irwin):** Full access to commercial decisions, financial forecasts, CEO briefings, approval releases, and connector settings.
2. **Sales Lead (Sarah Chen):** Qualified opportunity management, deal stage progression, proposal requests, and deal-won kickoff triggers.
3. **Project Manager (Nameeta):** Project delivery oversight, D1–D5 milestone completion, task allocation, and schedule risk escalation.
4. **Designer (David Ross):** Design execution, drawing checklists, specification reviews, and deliverable submissions.
5. **Finance (Anju):** Read-only QuickBooks monitoring, invoice validation, progressive billing approvals, and payment reconciliation.
6. **Admin (Alex Admin):** System administration, database migrations, security configurations, and full access.
7. **Viewer (Victor Viewer):** Read-only access to operational dashboards and high-level KPIs.

---

## 2. Route x Role Permission Matrix

| HTTP Method | Route Path | Access Policy | Allowed Roles | Audit Logged |
| :---: | :--- | :---: | :--- | :---: |
| `GET` | `/` | Public Allowlist | Unauthenticated / All | No |
| `GET` | `/index.html` | Public Allowlist | Unauthenticated / All | No |
| `GET` | `/api/health` | Public Allowlist | Unauthenticated / All (Liveness probe) | No |
| `POST` | `/api/auth/dev-login` | Public (Dev Only) | Unauthenticated / Dev Only | Yes |
| `POST` | `/api/auth/logout` | Public Allowlist | Unauthenticated / All | No |
| `GET` | `/api/auth/me` | Public Allowlist | Unauthenticated / All | No |
| `POST` | `/api/connections/test` | Guarded | `Admin`, `Executive` | Yes |
| `GET` | `/api/discovery/baseline` | Guarded | `Admin`, `Executive` | Yes |
| `GET` | `/api/metrics` | Guarded | All Authenticated Roles | No |
| `GET` | `/api/exceptions` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Finance` | No |
| `GET` | `/api/exceptions/:id` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Finance` | No |
| `POST` | `/api/exceptions/:id/transition` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Finance` | Yes |
| `POST` | `/api/exceptions/run-detectors` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager` | Yes |
| `GET` | `/api/ingestion/templates` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `GET` | `/api/ingestion/template/:type` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `POST` | `/api/ingestion/preview` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Finance` | Yes |
| `POST` | `/api/ingestion/import` | Guarded | `Admin`, `Executive` | Yes |
| `GET` | `/api/ingestion/registry/counts` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `POST` | `/api/pipeline/run` | Guarded | `Admin`, `Executive` | Yes |
| `GET` | `/api/audit/logs` | Guarded | `Admin`, `Executive`, `Finance` | Yes |
| `GET` | `/api/mapping/samples` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `GET` | `/api/transfers` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `GET` | `/api/transfers/stats` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |
| `POST` | `/api/sync/deal-won` | Guarded | `Admin`, `Executive`, `Sales Lead` | Yes |
| `POST` | `/api/sync/milestone` | Guarded | `Admin`, `Executive`, `Project Manager` | Yes |
| `POST` | `/api/sync/payment` | Guarded | `Admin`, `Executive`, `Finance` | Yes |
| `POST` | `/api/sync/fault` | Guarded | `Admin` | Yes |
| `POST` | `/api/ping/:systemId` | Guarded | `Admin`, `Executive`, `Sales Lead`, `Project Manager`, `Designer`, `Finance`, `Viewer` | No |

---

## 3. Enforcement Strategy

1. **Deny-by-Default:** An authorization guard is mounted on the router. Any route not present in `PUBLIC_ALLOWLIST` that does not declare role requirements is automatically rejected with HTTP 401/403.
2. **Automated Route Guard Test:** A dedicated test dynamically inspects `app._router.stack`, checks all registered endpoints, and fails the test suite if any endpoint lacks an explicit auth/role guard.
