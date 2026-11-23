export const CSV_TEMPLATES: Record<string, string> = {
  customers: `id,company_name,display_name,email,phone,website,currency,city,country
ACC-101,Aura Development Group,Aura Dev,contact@auradev.com,+1 (416) 555-0144,https://auradev.com,USD,Toronto,Canada
ACC-102,Sterling Heritage Properties,Sterling Properties,info@sterlingproperties.com,+1 (212) 555-0182,https://sterlingproperties.com,USD,New York,USA
ACC-103,Vanguard Workspace Solutions,Vanguard Solutions,procurement@vanguardwork.com,+1 (312) 555-0199,https://vanguardwork.com,USD,Chicago,USA`,

  contacts: `id,account_id,first_name,last_name,email,phone,title,role
CNT-201,ACC-101,Clara,Oswald,clara@auradev.com,+1 (416) 555-0145,VP Real Estate Development,decision_maker
CNT-202,ACC-102,Alastair,Sterling,alastair@sterlingproperties.com,+1 (212) 555-0183,Managing Principal,decision_maker
CNT-203,ACC-103,Devon,Vance,dvance@vanguardwork.com,+1 (312) 555-0198,Director of Facilities,project_lead`,

  deals: `id,deal_name,account_id,stage,amount,currency,closing_date,owner_name,architectural_type
DEAL-301,Aura Lakeside Condominium Architectural Package,ACC-101,Closed Won,$220000,USD,2026-11-15,Sarah Jenkins,Residential
DEAL-302,Sterling Manhattan Flagship HQ Renovation,ACC-102,Proposal,$380000,USD,2026-12-01,Marcus Sterling,Commercial
DEAL-303,Vanguard Chicago Tech Hub Fitout,ACC-103,Negotiation,$160000,USD,2026-11-20,Elena Rostova,Commercial`,

  projects: `id,project_name,deal_id,account_id,status,template_code,budget_hours,total_contract_value,start_date
PRJ-401,Aura Lakeside Condominium Architectural Package,DEAL-301,ACC-101,Active,TWG-Residential-HighEnd-v4,520,$220000,2026-11-15
PRJ-402,Sterling Manhattan Flagship HQ Renovation,DEAL-302,ACC-102,Planning,TWG-Commercial-CorporateFitout-v3,680,$380000,2026-12-01`,

  milestones: `id,project_id,name,billable_amount,currency,status,target_date,completion_percentage
MS-501,PRJ-401,Phase 1: Conceptual Schematic Design & Spatial Layout,$55000,USD,completed,2026-11-30,100
MS-502,PRJ-401,Phase 2: Structural Engineering & Permit Submission,$66000,USD,in_progress,2026-12-20,40
MS-503,PRJ-401,Phase 3: Interior Finishes & Custom Millwork Specs,$55000,USD,pending,2027-02-15,0
MS-504,PRJ-401,Phase 4: Construction Administration & Handover,$44000,USD,pending,2027-04-30,0`,

  documents: `id,project_id,title,file_name,file_size_bytes,mime_type,source_url,category,access_scope
DOC-601,PRJ-401,Aura Lakeside Master BIM Model,Aura_Lakeside_BIM_Rev4.rvt,48291040,application/octet-stream,https://designtwg.sharepoint.com/sites/PRJ-401/BIM,02_Schematic_Drawings_BIM,project_team_only
DOC-602,PRJ-401,Structural Calculations & Load Analysis,Aura_Structural_Report_Stamped.pdf,8420192,application/pdf,https://designtwg.sharepoint.com/sites/PRJ-401/Specs,03_Engineering_Specs,project_team_only
DOC-603,PRJ-401,Executed Architectural Client Agreement,Aura_TWG_Executed_Contract.pdf,2401820,application/pdf,https://designtwg.sharepoint.com/sites/PRJ-401/Contracts,01_Contract_and_Proposals,executive_only`,

  invoices: `id,invoice_number,account_id,project_id,status,total_amount,currency,issue_date,due_date,memo
INV-701,TWG-INV-2026-101,ACC-101,PRJ-401,Paid,$55000,USD,2026-11-30,2026-12-30,Milestone 1 Schematic Design billing for Aura Lakeside
INV-702,TWG-INV-2026-102,ACC-101,PRJ-401,Draft,$66000,USD,2026-12-20,2027-01-20,Milestone 2 Structural Engineering billing for Aura Lakeside`,
};
