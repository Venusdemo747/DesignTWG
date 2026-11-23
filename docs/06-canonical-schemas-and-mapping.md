# 06 — Canonical Schemas and Mapping Tables

## Canonical Entity Models

Design TWG integrates disparate software platforms into five canonical data entities.

### 1. Customers & Contacts
- **Canonical Model**: `CanonicalCustomer`, `CanonicalContact`
- **Stable ID**: `TWG-CUST-{SourceId}`, `TWG-CNT-{SourceId}`
- **Source Systems**: Zoho CRM (`Accounts`), QuickBooks Online (`Customer`)
- **Normalizations**: Company names normalized with trimmed whitespace, RFC 5322 lowercase email validation.

### 2. Leads & Deals
- **Canonical Model**: `CanonicalDeal`
- **Stable ID**: `TWG-DEAL-{SourceId}`
- **Source Systems**: Zoho CRM (`Deals`)
- **Stage Mapping**:
  - `Qualification` &rarr; `Qualification`
  - `Proposal/Price Quote` &rarr; `Proposal`
  - `Negotiation/Review` &rarr; `Negotiation`
  - `Closed Won` &rarr; `Closed Won`
  - `Closed Lost` &rarr; `Closed Lost`

### 3. Projects & Milestones
- **Canonical Model**: `CanonicalProject`, `CanonicalMilestone`
- **Stable ID**: `TWG-PRJ-{SourceId}`, `TWG-MS-{SourceId}`
- **Source Systems**: Zoho Projects (`projects`, `milestones`)
- **Templates**:
  - Commercial Projects &rarr; `TWG-Commercial-CorporateFitout-v3`
  - Residential Projects &rarr; `TWG-Residential-HighEnd-v4`

### 4. Documents & Metadata
- **Canonical Model**: `CanonicalDocument`
- **Stable ID**: `TWG-DOC-{SourceId}`
- **Source Systems**: Microsoft Graph / SharePoint (`driveItems`)
- **Categories**:
  - `01_Contract_and_Proposals`
  - `02_Schematic_Drawings_BIM`
  - `03_Engineering_Specs`
  - `04_Client_Presentations`
  - `05_Invoices_and_Billing`

### 5. Financial Records (Strictly Read-Only)
- **Canonical Model**: `CanonicalFinancialRecord`
- **Stable ID**: `TWG-INV-{SourceId}`
- **Source Systems**: QuickBooks Online (`Invoice`, `Payment`)
- **Invariant**: `readOnlyEnforced: true`.
