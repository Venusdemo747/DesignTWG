# Architecture Decision Record 008: LLM Provider = Google Gemini

## Status
Accepted (Governing Milestone 3 and Agent Layer)

## Context & Requirements
`designTWG_Agentic_AI_Problem_Statement.md` requires an Agentic AI Business Operating System that reasons over retrieved canonical records, explains exceptions (S01, O02), and drafts consequential actions (follow-ups, escalations) for human approval.

Key architectural and governance constraints:
1. **Provider-Agnostic Interface:** The system must maintain a unified `LlmClient` interface to prevent vendor lock-in, but the only adapter implemented for M3 is Google Gemini.
2. **Deterministic-Before-LLM:** Deterministic rules detect exceptions; the LLM is invoked only to reason, summarize, and draft on top of verified facts.
3. **Evidence-First & Citations:** Every AI output must cite verifiable source IDs and dates from the provided prompt context.
4. **Data Privacy & Canadian Residency:** Client architectural and financial data must be protected against model training; enterprise data residency in Canada is preferred.
5. **Cost & Rate Governance:** A hard cap of \$15.00/day and 30 calls/hour with an automated circuit breaker, configurable per-agent token budgets, and graceful fallback to a clearly labelled Mock LLM mode when API credentials are absent.

---

## Options Considered

### Option 1: Anthropic Claude (Claude 3.5 Sonnet / 3.7 Sonnet)
- **Pros:** Strong reasoning and agentic tool use; high adherence to complex prompt instructions.
- **Cons:** Primary API endpoints are hosted in US regions; direct enterprise Canadian data residency requires AWS Bedrock; replaced per user direction.

### Option 2: Google Gemini via Gemini Developer API (Google AI Studio)
- **Pros:** Low latency, competitive token pricing, large context windows, native structured output (`responseSchema` / JSON mode), simple API key authentication (`GEMINI_API_KEY`), rapid onboarding for development.
- **Cons:** Free tier terms permit Google to use inputs/outputs for product improvement. **Paid tier explicitly protects customer data from training**, but regional endpoint selection is less granular than Vertex AI.

### Option 3: Google Gemini via Vertex AI (Google Cloud Platform)
- **Pros:** Full Google Cloud enterprise compliance, IAM service account authentication, zero customer data used for training on all tiers, and Canadian data residency in `northamerica-northeast1` (Montreal) and `northamerica-northeast2` (Toronto).
- **Cons:** Requires active Google Cloud Project setup, billing account, Service Account key/Workload Identity configuration, and elevated infrastructure management.

---

## Decision

We adopt **Google Gemini** as the primary and default LLM provider for designTWG.

1. **Provider-Agnostic Interface with Gemini Adapter:**
   - Define a pure TypeScript interface `LlmClient` (`generateDraft()`, `countTokens()`, `health()`).
   - Implement `GeminiAdapter` in `src/llm/adapters/gemini.ts` using the official Google Gen AI SDK (`@google/genai` or `@google/generative-ai`).
   - Leave room for future adapters (`ClaudeAdapter`, `OpenAiAdapter`) behind the same contract.

2. **Model Selection & Environment Configuration:**
   - **Primary Reasoning Model:** `gemini-2.5-pro` (or `gemini-1.5-pro` `[VERIFY]`) for multi-document synthesis, CEO weekly briefs, and proposal drafts.
   - **Fast Extraction Model:** `gemini-2.5-flash` (or `gemini-2.0-flash` `[VERIFY]`) for quick exception classification and deal nudge drafts.
   - Configurable via `.env`:
     ```env
     LLM_PROVIDER=gemini
     GEMINI_API_KEY=
     LLM_MODEL_PRIMARY=gemini-2.5-pro
     LLM_MODEL_FAST=gemini-2.5-flash
     LLM_DAILY_COST_CAP_USD=15.00
     LLM_MAX_CALLS_PER_HOUR=30
     ```

3. **Gemini API vs Vertex AI Strategy:**
   - **Development & POC (Phase 1):** Use Google Gemini API with paid tier API key (`GEMINI_API_KEY`). **Under Google's paid Terms of Service, customer data is NOT used for training.** Free tier must NOT be used for real client data.
   - **Production Enterprise (Phase 2):** Upgrade the `GeminiAdapter` to connect via Vertex AI with credentials targeting `northamerica-northeast2` (Toronto) for full Canadian data residency.

4. **Structured Output & Schema Enforcement:**
   - Use Gemini's native `responseSchema` (JSON Schema) to constrain model outputs.
   - Double-validate every output with application-layer Zod schemas. If the LLM generates malformed JSON, retry up to 2 times with exponential backoff before safely degrading to a human review requirement.

5. **Search Grounding Disabled:**
   - Any built-in Google Search / web grounding is explicitly disabled (`googleSearch: false`). Agents reason exclusively over retrieved canonical records supplied in the prompt context.

6. **Programmatic Citation Verification:**
   - The LLM does not originate citations; it must reference IDs from the provided facts.
   - The orchestrator validates that every cited source record ID exists in the input context. Outputs with hallucinated IDs are rejected.

7. **Mock LLM Mode:**
   - If `GEMINI_API_KEY` is not configured, the system boots in `MOCK_LLM_MODE=true`. It generates deterministic, canned proposal and nudge drafts clearly watermarked:  
     `"[MOCK LLM DRAFT: NOT REAL AI OUTPUT - CONFIGURE GEMINI_API_KEY FOR LIVE INFERENCE]"`

---

## Consequences

- **Developer Setup:** Developers only need a paid `GEMINI_API_KEY` in their `.env` file to test live LLM features, or run without keys using Mock LLM mode.
- **Cost Ceiling:** The orchestrator maintains an atomic token/cost ledger (`src/llm/circuit-breaker.ts`). If daily spend reaches \$15.00, subsequent calls throw `DailyCostCapExceededError` until midnight UTC.
- **Verification:** Unit tests and CI run in Mock LLM mode without paid calls. An opt-in script (`npm run eval:live`) evaluates live Gemini calls against golden test sets.
