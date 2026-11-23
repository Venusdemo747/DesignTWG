# Architecture Decision Record 007: Deterministic Exception Engine & Idempotent Deduplication Architecture

## Status
Accepted (Milestone 2 Delivery)

## Context & Requirements
Under `designTWG_Agentic_AI_Problem_Statement.md`:
- **Section 3 (Sales Gaps - S01):** Qualified opportunities lack recorded owners, next actions, and follow-up dates, while leads become inactive without automated flagging.
- **Section 4 (Operations Gaps - O02):** Project delays, scope creep, and milestone slippage are identified reactively rather than flagged proactively.
- **Section 8 (Data & Technical Safeguards):** "Deterministic before LLM." Detection must be implemented with deterministic code and explicit business rules, reserving LLM reasoning strictly for contextual drafting and summarization.
- **Invariants:**
  1. Exception detection must be idempotent: repeated runs over the same source data must never create duplicate records. Instead, they must bump the `detected_count` and update the `last_detected_at` timestamp.
  2. Lifecycle transitions must be fully audited and immutable.
  3. Reopen-on-recurrence: if an exception is manually resolved or dismissed by a human user, but the underlying dirty or stalled condition persists in the source system upon subsequent scans, the engine must automatically reopen it to `NEW` status and record an automated audit event.
  4. Timezone & Holiday safety: date calculations must respect the `America/Toronto` timezone (Eastern Time) and account for Daylight Saving Time (DST) and Ontario statutory holidays.

## Decision

### 1. Pure Deterministic Detector Modules
We constructed modular, pure rule-based detectors in `src/exceptions/detectors/`:
- **`S01StalledOpportunityDetector`**:
  - `S01_MISSING_OWNER`: Open deal lacking an assigned sales lead.
  - `S01_MISSING_NEXT_ACTION`: Open deal lacking next steps / action description.
  - `S01_MISSING_FOLLOW_UP_DATE`: Open deal with no scheduled closing/follow-up date.
  - `S01_INACTIVE_EXCEEDS_5_DAYS`: Open deal whose last update exceeds 5 Ontario business days.
- **`O02MilestoneDelayDetector`**:
  - `O02_OVERDUE_MILESTONE`: Milestone whose target completion date is past the evaluation timestamp and is not yet marked `Completed`.
  - `O02_AT_RISK_MILESTONE`: Milestone approaching target date within 3 business days lead-time with completion percentage under 50%.
- **`DataQualityDetector`**:
  - Evaluates cross-system relational integrity: deals referencing non-existent accounts, milestones referencing non-existent projects, and invalid/future timestamps.

### 2. America/Toronto DST & Statutory Holiday Business Day Utilities
Implemented in `src/utils/business-days.ts`:
- Converts calendar timestamps to `America/Toronto` wall-clock time using `Intl.DateTimeFormat`.
- Evaluates Ontario statutory holidays (New Year's Day, Family Day, Good Friday, Victoria Day, Canada Day, Civic Holiday, Labour Day, Thanksgiving, Christmas Day, Boxing Day).
- Accurately computes business day offsets across weekends, holidays, and DST transition weeks (spring forward / fall back).

### 3. Deduplication via SHA-256 Hashing
Each detected condition generates a stable deduplication hash:
$$\text{dedupHash} = \text{SHA256}(\text{category} + \text{"::"} + \text{type} + \text{"::"} + \text{sourceSystem} + \text{"::"} + \text{sourceRecordId})$$
The database schema (`002_exceptions_schema.sql`) enforces uniqueness via a unique index on `dedup_hash`.

### 4. Idempotency & Reopen-on-Recurrence Workflow
When `ExceptionEngine.runAllDetectors()` executes:
1. If the exception is new: inserts into `exceptions` with `detected_count = 1` and logs an initial `NEW` lifecycle event.
2. If the exception exists and is active (`NEW` or `ACKNOWLEDGED`): increments `detected_count`, updates `last_detected_at`, and preserves human assignment.
3. If the exception exists and was `RESOLVED` or `DISMISSED`: transitions the exception back to `NEW`, increments `detected_count`, clears previous resolution timestamps, and records a structured audit event explaining the automated reopening.

### 5. Exception Inbox REST API & UI
Exposed authenticated REST endpoints in `src/server.ts` guarded by RBAC:
- `GET /api/exceptions`: List and filter exceptions by status, severity, category, owner, and source system.
- `GET /api/exceptions/:id`: Detailed view including complete immutable lifecycle history.
- `POST /api/exceptions/:id/transition`: Transition status (`ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`). Requires mandatory reason on dismissal.
- `POST /api/exceptions/run-detectors`: On-demand execution of detector scan.

Integrated an Exception Inbox tab into the executive dashboard (`src/dashboard/html.ts`) with real-time severity badges, filter toggles, and one-click acknowledgement/resolution modals.

## Consequences & Verification
- **Test Coverage:** Verified by 24 passing tests across 6 dedicated test suites:
  - `tests/business-days.test.ts` (5/5)
  - `tests/s01-detector.test.ts` (5/5)
  - `tests/o02-detector.test.ts` (3/3)
  - `tests/data-quality-detector.test.ts` (3/3)
  - `tests/exceptions-lifecycle.test.ts` (4/4)
  - `tests/exceptions-api.test.ts` (4/4)
- **Regression Safety:** Full test suite passes cleanly with 88 tests passing across 21 test files (plus 1 skipped live OAuth suite).
