# 09 — Security Controls and Secret Management

## 1. Secrets Exclusion and Storage

- **`.gitignore` Hardening**:
  `.env`, `.env.*`, `*.pem`, `*.key`, `*.cert`, `*.crt`, `*credentials*`, and `*token*.json` are excluded from Git tracking.
- **Zero Hardcoded Secrets**:
  All credentials, OAuth refresh tokens, and client secrets are read exclusively from environment variables via `src/config/env.ts`.

---

## 2. Token Redaction and Logging Safeguards

- **Pino Logger Redaction**:
  Configured to redact all paths matching `*.token`, `*.secret`, and `*.client_secret`.
- **HTTP Client Sanitization (`src/connectors/http-client.ts`)**:
  - `sanitizeUrl()` strips sensitive query parameters (`token=`, `secret=`, `key=`, `password=`).
  - `redactSensitiveObject()` recursively replaces tokens and authorization headers with `[REDACTED]`.
  - Errors emitted to the integration dashboard or audit ledger never contain raw credentials.

---

## 3. Financial Invariant Enforcement

- QuickBooks Online connector adapter enforces `isReadOnly: true` at runtime and compile-time.
- Mutation endpoints (`createCustomer`, `createInvoice`, `recordPayment`) do not exist in the production adapter.

---

## 4. SharePoint Access Boundaries

- Document permissions are preserved at the Microsoft Graph API level.
- No user-level access controls are bypassed. Document contents are not downloaded or exposed in unauthenticated contexts.
