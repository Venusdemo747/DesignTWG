# 10 — Known Limitations, Missing Approvals, and Outstanding Setup

## 1. Unverified Live Connections

Due to the absence of live production credentials in this environment, all 4 external systems operate with **safe scaffolding** and mock fallbacks:
- **Zoho CRM**: Live connection unverified pending client ID, secret, and refresh token.
- **Zoho Projects**: Live connection unverified pending portal ID and refresh token.
- **QuickBooks Online**: Live connection unverified pending Intuit developer credentials and realm ID.
- **Microsoft 365 / SharePoint**: Live connection unverified pending Azure AD tenant admin consent and client secret.

---

## 2. Outstanding Administrative Approvals

1. **Intuit Developer Production Keys**:
   - Access to live QBO requires Intuit app review and compliance questionnaire submission.
2. **Microsoft Entra ID (Azure AD) Admin Consent**:
   - Application scopes (`Sites.Read.All`, `Files.Read.All`) require global tenant administrator consent.
3. **Zoho Multi-Data Center Routing**:
   - Accounts created in EU, IN, or AU domains require setting `ZOHO_CRM_ACCOUNTS_URL` to the regional endpoint (e.g. `https://accounts.zoho.eu`).

---

## 3. Deliberate Invariants for Phase 1

- **No AI Agents**: No automated decision-making or autonomous workflows are implemented in this phase.
- **No Production Writes to QuickBooks**: QBO is strictly read-only to prevent financial ledger corruption.
- **Manual Ingestion Verification**: All CSV imports require explicit pre-flight validation and manual operator authorization.
