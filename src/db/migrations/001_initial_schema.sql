-- 001_initial_schema.sql
-- PostgreSQL 16+ Schema for designTWG Agentic AI Business OS

-- 1. Migration History
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users and Roles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sessions (Hashed Session Tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  session_token_hash VARCHAR(128) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 4. Append-Only Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(128) NOT NULL,
  resource_id VARCHAR(128),
  payload_hash VARCHAR(64),
  diff_json TEXT,
  ip_address VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS'
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Enforce Append-Only Property at Database Engine Level via PL/pgSQL Trigger
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: audit_log table is strictly append-only. UPDATE, DELETE, and TRUNCATE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_audit_log_immutable_truncate ON audit_log;
CREATE TRIGGER trg_audit_log_immutable_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_audit_log_modification();

-- 5. Data-Driven Approver Routing Rules
CREATE TABLE IF NOT EXISTS approver_routing_rules (
  id VARCHAR(64) PRIMARY KEY,
  domain VARCHAR(128) NOT NULL UNIQUE,
  primary_approver_name VARCHAR(128) NOT NULL,
  primary_approver_email VARCHAR(255) NOT NULL,
  fallback_approver_name VARCHAR(128) NOT NULL,
  fallback_approver_email VARCHAR(255) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Canonical Customers / Accounts
CREATE TABLE IF NOT EXISTS canonical_customers (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  record_origin VARCHAR(32) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  primary_email VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  website VARCHAR(255),
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  tax_number VARCHAR(64),
  billing_address_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Canonical Contacts
CREATE TABLE IF NOT EXISTS canonical_contacts (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  record_origin VARCHAR(32) NOT NULL,
  account_reference_id VARCHAR(64),
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  title VARCHAR(128),
  role VARCHAR(64) NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Canonical Deals
CREATE TABLE IF NOT EXISTS canonical_deals (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  record_origin VARCHAR(32) NOT NULL,
  deal_name VARCHAR(255) NOT NULL,
  account_reference_id VARCHAR(64),
  contact_reference_id VARCHAR(64),
  owner_name VARCHAR(128) NOT NULL,
  owner_email VARCHAR(255),
  stage VARCHAR(64) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  closing_date VARCHAR(64),
  probability_percentage INT NOT NULL DEFAULT 0,
  scope_summary TEXT,
  architectural_type VARCHAR(64) NOT NULL DEFAULT 'Commercial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Canonical Projects
CREATE TABLE IF NOT EXISTS canonical_projects (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  record_origin VARCHAR(32) NOT NULL,
  deal_reference_id VARCHAR(64),
  account_reference_id VARCHAR(64),
  project_name VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'Planning',
  template_code VARCHAR(128) NOT NULL,
  budget_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  logged_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_contract_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  start_date VARCHAR(64) NOT NULL,
  target_completion_date VARCHAR(64),
  sharepoint_dossier_path VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Canonical Milestones
CREATE TABLE IF NOT EXISTS canonical_milestones (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  project_reference_id VARCHAR(64) NOT NULL,
  record_origin VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  status VARCHAR(64) NOT NULL DEFAULT 'pending',
  target_date VARCHAR(64),
  completion_date VARCHAR(64),
  billable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  invoice_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  completion_percentage INT NOT NULL DEFAULT 0
);

-- 11. Canonical Documents
CREATE TABLE IF NOT EXISTS canonical_documents (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  project_reference_id VARCHAR(64),
  record_origin VARCHAR(32) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(128) NOT NULL,
  source_url TEXT NOT NULL,
  sharepoint_folder_category VARCHAR(128) NOT NULL,
  access_permission_scope VARCHAR(64) NOT NULL DEFAULT 'internal_all',
  last_modified_by VARCHAR(128),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Canonical Financial Records (Read-Only Safety Invariant)
CREATE TABLE IF NOT EXISTS canonical_financial_records (
  canonical_id VARCHAR(64) PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL UNIQUE,
  record_origin VARCHAR(32) NOT NULL,
  account_reference_id VARCHAR(64) NOT NULL,
  project_reference_id VARCHAR(64),
  invoice_number VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  subtotal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  issue_date VARCHAR(64) NOT NULL,
  due_date VARCHAR(64) NOT NULL,
  paid_date VARCHAR(64),
  memo TEXT,
  read_only_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  line_items_json TEXT NOT NULL DEFAULT '[]'
);

-- 13. Transfer Events (Transfer Monitor History)
CREATE TABLE IF NOT EXISTS transfer_events (
  transfer_id VARCHAR(64) PRIMARY KEY,
  trigger VARCHAR(64) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  target_system VARCHAR(64) NOT NULL,
  record_reference VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  latency_ms INT NOT NULL DEFAULT 0,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transfers_timestamp ON transfer_events(timestamp DESC);
