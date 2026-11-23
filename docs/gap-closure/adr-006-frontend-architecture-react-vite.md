# ADR 006: Frontend Architecture — React + Vite SPA Consuming Express REST API

**Status:** PROPOSED (Awaiting User Approval Before Execution)  
**Date:** 2026-11-24  
**Context:** Audit Item D2, Target Product Specification  

---

## 1. Context and Problem Statement

The existing Task 27 integration UI is a single standalone HTML/CSS/JavaScript file (`src/dashboard/html.ts`) served at `GET /`. While lightweight and dependency-free for integration prototyping, it does not support rich reactive state management required by the full Agentic AI Business OS:
- Interactive **Exception Inbox** with sorting, multi-criteria filtering, and lifecycle actions (acknowledge, dismiss, resolve).
- Dynamic **Human-in-the-Loop Approval Queue** with real-time diff previews, reason fields, and escalation buttons.
- **Monday CEO Briefing Viewer** with expandable multi-system KPI tabs and evidence citation sidebars.
- Role-sensitive views based on authenticated user permissions.

---

## 2. Decision

We propose migrating the frontend to a **modern React 18+ SPA powered by Vite and TypeScript**, structured as follows:

```
design-twg-agentic-ai-main/
├── frontend/                     # Separate React SPA directory
│   ├── index.html
│   ├── package.json              # Vite, React, Lucide-React, TailwindCSS
│   ├── vite.config.ts            # Proxies /api to http://127.0.0.1:3027
│   └── src/
│       ├── components/           # ExceptionInbox, ApprovalQueue, CeoBriefViewer
│       ├── hooks/                # useAuth, useExceptions, useTransfers
│       ├── services/             # apiClient with CSRF & Bearer injection
│       └── App.tsx
└── src/                          # Express backend (unchanged REST API)
```

### Transition and Backward Compatibility Invariants:
1. **Parallel Coexistence:** The legacy HTML dashboard at `GET /` remains intact and functional until feature parity is proven and accepted.
2. **Decoupled API:** The React frontend will consume the exact same authenticated REST API endpoints (`/api/*`), maintaining strict separation of concerns.
3. **Execution Gate:** As instructed, implementation of the React SPA will NOT begin until the user explicitly approves this ADR.

---

## 3. Consequences

- **Positive:** Type-safe components, rich design-system UI matching professional commercial standards, reactive state updates.
- **Positive:** Reusable component library for Exception Inbox, Reviewer Queue, and KPI dashboards.
- **Negative:** Adds a frontend build step (`npm run build:frontend`).
