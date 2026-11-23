# 02 — Setup and Local Development Guide

## Prerequisites

- **Node.js**: v20+ or v22+
- **TypeScript**: v5+
- **npm**: v10+

---

## Installation & Running

1. **Clone or Open Repository**:
   ```bash
   cd ~/Task27-Integration
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Note: Without credentials, the system automatically runs in safe `MOCK` mode with synthetic sandboxes.*

4. **Run Automated Test Suite**:
   ```bash
   npm test
   ```

5. **Run TypeScript Typecheck & Production Build**:
   ```bash
   npm run typecheck
   npm run build
   ```

6. **Start Local Development & Integration Studio**:
   ```bash
   npm run demo
   ```
   Open your browser to: `http://localhost:3027`

---

## Running Opt-In Live Tests

To execute live tests against real sandbox or production credentials:
```bash
RUN_LIVE_TESTS=true npm test
```
*If credentials are not present in `.env`, the live test suite automatically and gracefully skips without failing.*
