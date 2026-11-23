# Data Anonymization Checklist & Client Ingestion Protocol

**Target:** designTWG Real Data Export Request (Zoho CRM, Zoho Projects, QuickBooks)  
**Standard:** PIPEDA (Canada) & Provincial Privacy Compliance  

---

## 1. Required Client Scrubbing Protocol

Before exporting raw production CSVs or API snapshots from designTWG’s live tenants for testing or staging:

- [ ] **Remove All Real Person Names:** Replace contact and client representative names with pseudonyms (e.g. "Commercial Client Alpha", "Contact Beta").
- [ ] **Sanitize Email Addresses:** Map real email addresses to synthetic domain format: `<role>.<client_id>@example.designtwg.internal`.
- [ ] **Mask Phone Numbers & Direct Extensions:** Replace with generic dummy numbers: `+1-416-555-0100`.
- [ ] **Mask Physical Addresses:** Strip commercial unit numbers and residential client street addresses; retain only general municipality/region (e.g. "Toronto, ON", "Markham, ON").
- [ ] **Fuzz Commercial Contract Amounts:** Scale monetary values by a random factor ($\pm 10–15\%$) or map to tier benchmarks to prevent identification of private commercial lease negotiations.
- [ ] **Strip Credit Card / Banking Numbers:** Verify zero payment instrument details or bank account routing numbers are present in memo or invoice line-item fields.
- [ ] **Scrub Proprietary Architectural IP:** Redact proprietary contractor fee breakdowns or trade secrets from scope summaries.

---

## 2. Ingestion Verification Sign-Off

All test fixtures checked into this repository prior to receipt of the signed anonymized export are generated synthetically via `data/fixtures/dirty-synthetic-fixtures.json`.
