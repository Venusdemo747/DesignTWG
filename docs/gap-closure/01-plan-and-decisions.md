# 01 — Milestone Implementation Plan & Architectural Decisions

**Project:** designTWG Agentic AI Business Operating System  
**Version:** 1.0.0-draft  
**Target Architecture:** Human-Supervised Multi-Agent OS on Node.js/TypeScript  

---

## 1. High-Level Architecture Evolution

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
│  │     Server & Security Enforcement Layer (Node.js/TypeScript)     │  │
│  │  - Session/Bearer Token Auth    - Server-Side RBAC Middleware    │  │
│  │  - Append-Only Audit Logging    - Secrets & PII Redaction        │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────┴───────────────────────────────┐  │
│  │         Core Intelligence & Execution Subsystems                 │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Deterministic Exception     │  │ Human-Supervised Agent    │  │  │
│  │  │ Engine (Plain Code Rules)   │  │ Runtime & LLM Orchestrator│  │  │
│  │  │ - S01 Inactivity Detector   │  │ - Sales Growth Agent      │  │  │
│  │  │ - O02 Milestone Risk Monitor│  │ - Project Delivery Agent  │  │  │
│  │  │ - Staleness & QA Checks     │  │ - CEO Intelligence Agent  │  │  │
│  │  └──────────────┬──────────────┘  │ - Prompt Defense & Schema │  │  │
│  │                 │                 └─────────────┬─────────────┘  │  │
│  │                 ▼                               ▼                │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │   Human-in-the-Loop Approval Queue (Irwin, Nameeta, Anju)  │  │  │
│  │  │   Draft -> Review -> Edit/Approve/Reject -> Audit Logged   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │     Persistence & Integration Layer                              │  │
│  │  - Persistent Database (SQLite for dev/test; PostgreSQL target)  │  │
│  │  - Canonical Data Repository (Customers, Deals, Projects, Milest)│  │
│  │  - Provider Connectors (Zoho CRM, Projects, QBO-RO, M365 Graph)  │  │
│  │  - Fallback CSV Ingestion & Pre-flight Validator                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Milestone Breakdown & Delivery Sequence

### Milestone 1: Foundation — Persistence, Authentication & Server-Side RBAC
- **Objectives:** Replace volatile in-memory Maps with durable database persistence; enforce zero-trust authentication and server-side RBAC; establish append-only audit trail.
- **Key Deliverables:**
  - Database schema & versioned migrations (SQLite for zero-config local dev; PostgreSQL ready).
  - Repository layer preserving existing `CanonicalDataRegistry` interfaces for backward compatibility.
  - Authentication layer (Microsoft Entra ID SSO integration with local developer login fallback).
  - Server-side RBAC middleware covering all existing and new routes.
  - Append-only audit logger capturing actor, action, timestamp, entity, and diffs.
- **Verification Gate:** Server restart preserves all CSV and registry data; unauthenticated requests receive HTTP 401; unauthorized roles receive HTTP 403; test suite runs with 100% pass rate.

### Milestone 2: Deterministic Exception Detection Engine (S01 & O02)
- **Objectives:** Implement rule-based detection for sales deal inactivity (S01) and project milestone slippage (O02) before any LLM execution.
- **Key Deliverables:**
  - Domain models: `ExceptionRecord`, `DealActivityLog`, `MilestoneRiskSchedule`.
  - S01 Detector: Identifies open qualified deals missing owner, next action, follow-up date, or inactive for $> N$ days.
  - O02 Detector: Identifies overdue milestones, at-risk milestones within alert thresholds, and unassigned critical-path tasks.
  - Exception Inbox UI with severity badges, filters, and resolution lifecycle (`new` $\rightarrow$ `acknowledged` $\rightarrow$ `resolved` $\rightarrow$ `dismissed`).
  - Scheduled background execution job.
- **Verification Gate:** Deterministic test cases with seeded edge-case fixtures correctly generate exceptions without false positives.

### Milestone 3: LLM Layer, Multi-Agent Runtime & Human Approval Queue
- **Objectives:** Add provider-agnostic LLM reasoning, Sales Growth Agent, Project Delivery Agent, prompt-injection defenses, and a mandatory Human-in-the-Loop approval gate.
- **Key Deliverables:**
  - Provider-agnostic LLM client (supporting Gemini, Claude, OpenAI) with retry/backoff, token budget, and structured output parsing.
  - Prompt registry with versioned system prompts, strict output schemas (Zod), and prompt-injection guardrails.
  - **Sales Growth Agent**: Generates evidence-cited follow-up emails for S01 exceptions.
  - **Project Delivery Agent**: Generates root-cause analysis and escalation drafts for O02 milestone delays.
  - **Human-in-the-Loop Approval Queue UI**: Approver can review, edit text, approve, or reject (with reason); execution is stubbed until explicit operator release.
- **Verification Gate:** Unit tests with golden fixtures confirm schema validity and prompt-injection resistance; actions cannot execute without signed human approval.

### Milestone 4: Weekly CEO Intelligence Briefing (O09) & Notification System
- **Objectives:** Automate the Monday 8:00 AM CEO briefing from verified stored data; deliver alerts via Microsoft Teams and Email.
- **Key Deliverables:**
  - **CEO Intelligence Agent**: Synthesizes verified numbers into an executive brief (deal pipeline, critical milestone risks, cash/margin summary, decisions needed).
  - Executive Briefing Dashboard with historical archives and print/PDF export styling.
  - Microsoft Teams Webhook and SMTP email dispatch with rate-limiting and digest options.
  - Pilot KPI measurement dashboard (baseline vs. target tracking).
- **Verification Gate:** Brief generation runs on schedule, contains zero uncited numbers, and dispatches test alerts to configured channels.

### Milestone 5: Live API Connectors & OAuth 2.0 Integration
- **Objectives:** Transition from mock synthetic scaffolding to authenticated live OAuth 2.0 connections while strictly preserving the read-only financial invariant.
- **Key Deliverables:**
  - OAuth token manager with AES-256 encrypted credential storage and auto-refresh.
  - Live adapters for Zoho CRM, Zoho Projects, QuickBooks Online (read-only), and Microsoft Graph.
  - Updated health dashboard showing live vs. mock status.
  - Seamless fallback to CSV ingestion if external APIs fail or are throttled.
- **Verification Gate:** Live sandbox sync succeeds with recorded fixtures; read-only invariant verified against QuickBooks endpoints.

### Milestone 6: Design Operations (D1–D5), FFE Matrix & Profitability Intelligence
- **Objectives:** Implement architectural D1–D5 stage-gate tracking, FFE coordination, and financial margin risk reconciliation (Zoho Projects effort vs. QuickBooks actuals).
- **Key Deliverables:**
  - D1–D5 Stage Gate Checklist engine (Concept, Schematic, DD, CD, Handover).
  - FFE Matrix specification and procurement tracking (O07).
  - Profitability & Margin Risk Engine (O08 / X01) linking Deal $\leftrightarrow$ Project $\leftrightarrow$ Invoice.
  - Profitability Agent & Proposal Benchmarking Agent (S03, S06).
- **Verification Gate:** Seeded project with hour overruns generates explainable margin-erosion alert citing real invoice balances and logged timesheet entries.
