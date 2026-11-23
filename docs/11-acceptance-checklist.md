# 11 — Per-Provider Acceptance Checklist

Use this checklist to verify production readiness prior to enabling live synchronization.

---

### Zoho CRM
- [ ] OAuth Client registered in Zoho Developer Console.
- [ ] Refresh token generated with `ZohoCRM.modules.deals.READ`, `contacts.READ`, `accounts.READ`.
- [ ] `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN` added to production vault.
- [ ] `testConnection()` executed and returns state `CONNECTED` with HTTP 200.
- [ ] Deal stage mappings verified against active CRM pipeline stages.

---

### Zoho Projects
- [ ] Portal ID identified and verified in Zoho Projects admin console.
- [ ] OAuth token generated with `ZohoProjects.projects.READ` and `milestones.READ`.
- [ ] Architectural project templates (`TWG-Residential-HighEnd-v4`, `TWG-Commercial-CorporateFitout-v3`) verified in portal.
- [ ] `testConnection()` executed and returns state `CONNECTED`.

---

### QuickBooks Online
- [ ] App registered on Intuit Developer Portal with `com.intuit.quickbooks.accounting` scope.
- [ ] Realm ID (Company ID) verified against Design TWG QBO company file.
- [ ] `isReadOnly: true` invariant confirmed. **Zero write methods enabled.**
- [ ] Read-only query test executed against `/companyinfo/{realmId}` returning HTTP 200.
- [ ] Chart of accounts mapped to design service revenue accounts.

---

### Microsoft 365 / SharePoint
- [ ] Azure AD App Registration created under Design TWG tenant.
- [ ] Client Secret stored securely in vault.
- [ ] Tenant Admin consent granted for `Sites.Read.All` and `Files.Read.All`.
- [ ] Document library permissions verified; user ACL boundaries respected.
- [ ] `testConnection()` executed against `/v1.0/organization` returning HTTP 200.

---

### CSV Ingestion & Canonical Registry
- [x] CSV templates validated for all 7 entity types.
- [x] Pre-flight validator detects duplicates, conflicts, and orphaned foreign references.
- [x] Canonical registry separates `IMPORTED_CSV` from `MOCK_SYNTHETIC` records.
- [x] Sanitized audit ledger records all ingestion operations without logging secrets.
- [x] Automated test suite passing 100%.
