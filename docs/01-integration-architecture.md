# 01 — Integration Architecture: Design TWG Enterprise Bus

## Overview

The Design TWG Task 27 integration foundation connects four core enterprise applications into a unified, reliable data-ingestion and synchronization architecture:

1. **Zoho CRM**: Lead qualification, deal stage progression, contract value, and client relationship management.
2. **Zoho Projects**: Architectural project workspaces, milestone phase templates (Concept, CD Sets, Millwork & Interior Specs, Construction Admin & Handover), and delivery tracking.
3. **QuickBooks Online (QBO)**: Progressive milestone billing, accounts receivable, customer balance ledger, and payment tracking (**STRICTLY READ-ONLY**).
4. **Microsoft 365 / SharePoint & Graph**: Standardized client project dossiers (`01_Contract_and_Proposals`, `02_Schematic_Drawings_BIM`, `03_Engineering_Specs`, `04_Client_Presentations`, `05_Invoices_and_Billing`), and Teams broadcast alerts.

---

## Architectural Principles

```
                  ┌───────────────────────────────────────────────┐
                  │          Design TWG Integration Bus           │
                  │                                               │
                  │  ┌─────────────────┐   ┌───────────────────┐  │
                  │  │ CSV Ingestion   │   │ Provider Adapters │  │
                  │  │ & Validation    │   │ (OAuth 2.0 / REST)│  │
                  │  └────────┬────────┘   └─────────┬─────────┘  │
                  │           │                      │            │
                  │           ▼                      ▼            │
                  │  ┌─────────────────────────────────────────┐  │
                  │  │     Controlled Transfer Pipeline        │  │
                  │  │  (Idempotency, Deduplication, Audit)    │  │
                  │  └────────────────────┬────────────────────┘  │
                  │                       │                       │
                  │                       ▼                       │
                  │  ┌─────────────────────────────────────────┐  │
                  │  │         Canonical Data Registry         │  │
                  │  │  (Customers, Deals, Projects, Invoices) │  │
                  │  └─────────────────────────────────────────┘  │
                  └───────────────────────┬───────────────────────┘
                                          │
             ┌──────────────┬─────────────┴────────────┬──────────────┐
             ▼              ▼                          ▼              ▼
       ┌──────────┐   ┌────────────┐            ┌─────────────┐ ┌───────────┐
       │ Zoho CRM │   │ZohoProjects│            │ QuickBooks  │ │  M365     │
       │ (Deals)  │   │(Milestones)│            │(Strictly RO)│ │(SharePoint│
       └──────────┘   └────────────┘            └─────────────┘ └───────────┘
```

1. **Segregation of Origins**: Records are explicitly categorized into `IMPORTED_CSV`, `MOCK_SYNTHETIC`, or `LIVE_API`. Synthetic sandbox fixtures are never represented as live production data.
2. **Honest Connection Reporting**: Every connector adapter reports one of five discrete states: `MOCK`, `CONFIGURED`, `CONNECTED`, `FAILED`, or `NOT_CONFIGURED`. Live status is verified only when an authenticated real API call succeeds.
3. **Read-Only Financial Invariant**: QuickBooks Online operations are strictly read-only. No write, update, or invoice creation endpoints exist in the production adapter.
4. **Permission Awareness**: SharePoint integration preserves document-level access permissions. Service principals are not permitted to bypass tenant or user security boundaries.
5. **No Premature AI or Autonomous Automation**: This phase implements reliable plumbing, validation, and data verification without AI agents or scheduled autonomous decisions.
