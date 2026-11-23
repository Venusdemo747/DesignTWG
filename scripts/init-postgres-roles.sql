-- Least-privilege application role initialization for PostgreSQL 16
-- Ensures application does not connect as superuser / table owner

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'twg_app') THEN
    CREATE ROLE twg_app WITH LOGIN PASSWORD 'twg_app_secure_pass';
  END IF;
END $$;

GRANT CONNECT ON DATABASE designtwg_db TO twg_app;
GRANT USAGE ON SCHEMA public TO twg_app;

-- Default privileges for tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO twg_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO twg_app;
