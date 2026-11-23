# 04 — Required Permissions and Scopes

To uphold the principle of least privilege, Design TWG requests only the minimum required access permissions.

| Provider | Scope Name | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| **Zoho CRM** | `ZohoCRM.modules.deals.READ` | Read-Only | Read deal title, stage, contract amount, and closing date. |
| **Zoho CRM** | `ZohoCRM.modules.contacts.READ` | Read-Only | Read client decision maker names and email addresses. |
| **Zoho CRM** | `ZohoCRM.modules.accounts.READ` | Read-Only | Match customer legal entities. |
| **Zoho Projects** | `ZohoProjects.projects.READ` | Read-Only | List project workspaces and template assignments. |
| **Zoho Projects** | `ZohoProjects.milestones.READ` | Read-Only | Verify milestone deliverable status and billable percentage. |
| **QuickBooks Online** | `com.intuit.quickbooks.accounting` | **Strictly Read-Only** | Query customer balances, invoices, and payment receipts. **All write operations prohibited.** |
| **Microsoft Graph** | `Sites.Read.All` | Read-Only | List SharePoint client sites and document libraries. |
| **Microsoft Graph** | `Files.Read.All` | Read-Only | Read file metadata, versions, and BIM drawing links. |

---

## Safety Enforcements

1. **QuickBooks Write Prohibition**: The QuickBooks adapter contains no write, update, or mutation endpoints. It provides solely `queryReadOnly()`.
2. **SharePoint User Permission Preserved**: Service principal credentials cannot be used to bypass document-level user ACLs.
3. **No Autonomous Actions**: No emails, customer notifications, or accounting ledger postings are executed autonomously.
