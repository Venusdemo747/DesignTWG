# 05 — CSV Templates and Ingestion Procedures

## Ingestion Overview

The CSV Ingestion Studio enables safe, manual, auditable batch importing for all five canonical entity categories.

---

## 1. Supported Entity Templates

### A. Customers & Accounts (`customers.csv`)
```csv
id,company_name,display_name,email,phone,website,currency,city,country
ACC-101,Aura Development Group,Aura Dev,contact@auradev.com,+1 (416) 555-0144,https://auradev.com,USD,Toronto,Canada
```

### B. Contacts (`contacts.csv`)
```csv
id,account_id,first_name,last_name,email,phone,title,role
CNT-201,ACC-101,Clara,Oswald,clara@auradev.com,+1 (416) 555-0145,VP Real Estate Development,decision_maker
```

### C. Leads & Deals (`deals.csv`)
```csv
id,deal_name,account_id,stage,amount,currency,closing_date,owner_name,architectural_type
DEAL-301,Aura Lakeside Condominium Architectural Package,ACC-101,Closed Won,$220000,USD,2026-11-15,Sarah Jenkins,Residential
```

### D. Projects (`projects.csv`)
```csv
id,project_name,deal_id,account_id,status,template_code,budget_hours,total_contract_value,start_date
PRJ-401,Aura Lakeside Condominium Architectural Package,DEAL-301,ACC-101,Active,TWG-Residential-HighEnd-v4,520,$220000,2026-11-15
```

### E. Milestones (`milestones.csv`)
```csv
id,project_id,name,billable_amount,currency,status,target_date,completion_percentage
MS-501,PRJ-401,Phase 1: Conceptual Schematic Design & Spatial Layout,$55000,USD,completed,2026-11-30,100
```

### F. Documents (`documents.csv`)
```csv
id,project_id,title,file_name,file_size_bytes,mime_type,source_url,category,access_scope
DOC-601,PRJ-401,Aura Lakeside Master BIM Model,Aura_Lakeside_BIM_Rev4.rvt,48291040,application/octet-stream,https://designtwg.sharepoint.com/sites/PRJ-401/BIM,02_Schematic_Drawings_BIM,project_team_only
```

### G. Invoices — Read-Only (`invoices.csv`)
```csv
id,invoice_number,account_id,project_id,status,total_amount,currency,issue_date,due_date,memo
INV-701,TWG-INV-2026-101,ACC-101,PRJ-401,Paid,$55000,USD,2026-11-30,2026-12-30,Milestone 1 Schematic Design billing for Aura Lakeside
```

---

## 2. Validation & Safety Checklist

- **Header Validation**: All required headers must be present and correctly spelled.
- **Type Safety**: Currencies are stripped of symbols and parsed as positive numbers; dates must follow ISO 8601 (`YYYY-MM-DD`).
- **Duplicate Prevention**: In-batch duplicates and collisions against existing records are detected.
- **No Silent Overwrite**: Conflicting existing records halt ingestion until explicitly reviewed.
- **Orphan Reference Detection**: Foreign keys (`account_id`, `project_id`, `deal_id`) are checked against current and historical batches.
