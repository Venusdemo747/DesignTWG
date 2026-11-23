# Data Retention, Privacy & Cloud Residency Policy

**Standard:** PIPEDA (Personal Information Protection and Electronic Documents Act, Canada)  
**Corporate Entity:** designTWG  
**Recommended Cloud Region:** `Canada Central` (Toronto, Ontario)  

---

## 1. Data Residency & Sovereignty (`[VERIFY]`)

1. **Canadian Data Sovereignty Recommendation:**
   - designTWG operates out of Toronto, Ontario, managing commercial interior architectural designs, budgets, and leasehold improvement schedules for Canadian and North American hospitality/commercial franchise clients.
   - **Recommended Cloud Region:** **Azure `Canada Central` (Toronto)** or **AWS `ca-central-1` (Montreal)**.
   - **Data Residency Standard:** All primary database storage (PostgreSQL), SharePoint file caches, and audit logs must reside within Canadian borders to comply with provincial privacy standards and commercial non-disclosure agreements.

2. **Cross-Border LLM Ingestion Considerations:**
   - LLM inference (Anthropic Claude Sonnet 5.5) may process requests across North American datacenters.
   - **Enforced Mitigation:** Strict client-side data minimization via `minimizeRecordForPrompt()`:
     - No personal phone numbers, bank details, or credit card numbers are ever passed in LLM system or user prompts.
     - Deals and projects are referenced by canonical identifiers and commercial titles only.

---

## 2. Table-Specific Retention Schedule

| Data Category | Table Name | Retention Period | Purge Method | Legal Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Sessions** | `sessions` | 7 days after expiry | Automated daily purge job | Security minimization; prevent stale session accumulation. |
| **Raw Staging CSVs** | `ingested_records` | 90 days | Automated purge job | Temporary staging; canonical records are permanent. |
| **Integration Transfers**| `transfer_events` | 365 days (1 year) | Annual purge job | Integration diagnostics and synchronization verification. |
| **Commercial Deals** | `canonical_deals` | 7 years | Non-purgeable | Commercial contract and tax limitation period (CRA). |
| **Architectural Projects**| `canonical_projects`| 7 years | Non-purgeable | Architectural precedent, warranty, and liability period. |
| **Audit Logs** | `audit_log` | 7 years minimum | **Non-purgeable** (DB Trigger blocked) | Tamper-proof regulatory and security compliance trail. |

---

## 3. Immutability Safeguard

Attempts to run purge routines against `audit_log` throw database-level exceptions via the PL/pgSQL immutable triggers `trg_audit_log_immutable` and `trg_audit_log_immutable_truncate`.
