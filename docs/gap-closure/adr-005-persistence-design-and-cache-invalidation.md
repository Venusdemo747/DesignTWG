# ADR 005: Hybrid Persistence Design & Multi-Instance Cache Invalidation Strategy

**Status:** APPROVED  
**Date:** 2026-11-24  
**Context:** Audit Item A6, Global Rule 1, Section 8 Data Architecture  

---

## 1. Context and Problem Statement

The initial Task 27 integration prototype stored all canonical data in ephemeral `Map<string, IngestedRecord>` instances and transfer histories in an array in memory. In Milestone 1, we introduced a persistent database layer (`PostgresEntityRepository` backed by PostgreSQL / PGlite). 

At server startup (`IntegrationDemoServer.init()`), the system queries PostgreSQL and populates the in-memory registry (`syncFromDatabase()`). 

While this provides fast lookups in single-process development, it poses architectural limits:
1. **Memory Growth:** Ingesting tens of thousands of architectural line items or historical timesheets increases Node.js process heap memory.
2. **Multi-Instance Inconsistency:** In a horizontal cloud deployment (e.g. 2+ container replicas in Azure App Service), a write to Replica A does not invalidate the in-memory cache of Replica B.

---

## 2. Decision

We establish **PostgreSQL as the single source of truth for all operational data**. The in-memory registry functions strictly as a bounded, write-through cache rather than the primary store.

### Architectural Invariants:
1. **Write-Through Persistence:** Every CSV import, entity save, and transfer event MUST write to the database table before or simultaneously with updating local state.
2. **Database Fallback on Cache Miss:** When querying an entity by ID, if absent in the in-memory cache, the repository queries PostgreSQL directly.
3. **Multi-Instance Invalidation Protocol:**
   - In single-node environments (dev/testing), write-through keeps cache and database consistent.
   - For multi-instance deployments (Phase 2), cache invalidation will be governed by PostgreSQL `LISTEN/NOTIFY` channels on `ingested_records_changed` or a Redis pub/sub bus to invalidate cached IDs across peer workers.
4. **Append-Only Immutability:** Audit logs and transfer logs are strictly database-resident and are never cached in mutable memory structures.

---

## 3. Consequences

- **Positive:** Zero data loss across server crashes or container restarts.
- **Positive:** Fast read latency for frequent lookups without redundant SQL network round-trips.
- **Negative:** Requires disciplined write-through methods on all repository mutations.
