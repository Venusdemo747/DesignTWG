# 08 — Data-Quality Findings and Recommendations

During the ingestion audit and schema analysis, the following data-quality risks were identified along with mitigation rules:

1. **Inconsistent Date Formats in Legacy Exports**:
   - *Finding*: Older CRM exports contained dates in mixed formats (`MM/DD/YYYY`, `DD-MM-YYYY`, and ISO 8601).
   - *Mitigation*: The ingestion validator strictly rejects non-ISO formats during pre-flight checks and requires `YYYY-MM-DD` or full ISO 8601.

2. **Currency Symbol Pollution**:
   - *Finding*: Financial values exported from spreadsheets frequently contain currency symbols (`$`, `USD`, commas).
   - *Mitigation*: `parseCurrency` strips formatting, validates positive float amounts, and flags negative or invalid values.

3. **Orphaned Contact & Milestone References**:
   - *Finding*: Contacts exported from Zoho CRM without parent `Account_ID` or milestones referencing deleted projects cause broken graph relationships.
   - *Mitigation*: The pre-flight validator cross-checks foreign keys against the existing canonical registry and flags `ORPHANED_REFERENCE` errors before execution.

4. **Conflicting Records on Re-Import**:
   - *Finding*: Re-uploading a CSV file with updated details previously caused silent overwriting of customer records.
   - *Mitigation*: The pipeline checks `existingRecordsMap` and blocks conflicting records under the `onConflict: "reject"` policy.

5. **QuickBooks DisplayName Uniqueness Constraint**:
   - *Finding*: Intuit QBO enforces strict global uniqueness on `DisplayName`. Two different client entities sharing a trade name cause rejection in QBO.
   - *Mitigation*: Documented recommendation to append project codes or client IDs to company names where collisions occur.
