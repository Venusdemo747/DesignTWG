-- Migration 002: Exception Engine Schema (S01, O02, Data Quality, and Lifecycle Events)

CREATE TABLE IF NOT EXISTS exceptions (
  id VARCHAR(64) PRIMARY KEY,
  dedup_hash VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL, -- 'BUSINESS' | 'DATA_QUALITY'
  type VARCHAR(64) NOT NULL,     -- e.g. 'S01_DEAL_NO_NEXT_ACTION', 'O02_MILESTONE_OVERDUE'
  severity VARCHAR(16) NOT NULL, -- 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NOT NULL,
  record_label VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  evidence_json TEXT NOT NULL,   -- Contains source fields, timestamps, rule evaluation details
  owner_name VARCHAR(128),
  owner_email VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'NEW', -- 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  detected_count INT NOT NULL DEFAULT 1,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_dedup ON exceptions(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_category ON exceptions(category);
CREATE INDEX IF NOT EXISTS idx_exceptions_owner ON exceptions(owner_email);
CREATE INDEX IF NOT EXISTS idx_exceptions_last_detected ON exceptions(last_detected_at DESC);

-- Immutable Lifecycle History for Exceptions
CREATE TABLE IF NOT EXISTS exception_lifecycle_events (
  id VARCHAR(64) PRIMARY KEY,
  exception_id VARCHAR(64) NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  from_status VARCHAR(32) NOT NULL,
  to_status VARCHAR(32) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_exception_id ON exception_lifecycle_events(exception_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_timestamp ON exception_lifecycle_events(timestamp DESC);
