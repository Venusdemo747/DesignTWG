export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design TWG | Task 27 Real Integration Foundation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #070B12;
      --bg-card: rgba(15, 23, 42, 0.78);
      --bg-card-hover: rgba(30, 41, 59, 0.9);
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(56, 189, 248, 0.35);
      --text-main: #F1F5F9;
      --text-muted: #94A3B8;
      --primary: #38BDF8;
      --primary-glow: rgba(56, 189, 248, 0.25);
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --purple: #A855F7;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
        linear-gradient(to bottom, #070B12, #0B1220);
      min-height: 100vh;
      overflow-x: hidden;
    }

    header {
      border-bottom: 1px solid var(--border);
      background: rgba(7, 11, 18, 0.85);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand { display: flex; align-items: center; gap: 1rem; }
    .logo-badge {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #0284C7, #6366F1);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.15rem; color: white;
      box-shadow: 0 0 24px rgba(56, 189, 248, 0.4);
    }
    .brand-title h1 {
      font-size: 1.18rem; font-weight: 700; letter-spacing: -0.02em;
      display: flex; align-items: center; gap: 0.6rem;
    }
    .demo-pill {
      font-size: 0.68rem; background: rgba(56, 189, 248, 0.15); color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.2rem 0.6rem;
      border-radius: 9999px; font-weight: 600; text-transform: uppercase;
    }
    .readonly-pill {
      font-size: 0.68rem; background: rgba(245, 158, 11, 0.15); color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.2rem 0.6rem;
      border-radius: 9999px; font-weight: 600; text-transform: uppercase;
    }
    .brand-title p { font-size: 0.8rem; color: var(--text-muted); }

    .header-actions { display: flex; align-items: center; gap: 1rem; }
    .status-indicator {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8rem; color: #38BDF8;
      background: rgba(56, 189, 248, 0.1); padding: 0.35rem 0.85rem;
      border-radius: 9999px; border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #38BDF8; box-shadow: 0 0 10px #38BDF8;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }

    .nav-tabs {
      display: flex; gap: 0.5rem; padding: 1.25rem 2rem 0;
      max-width: 1440px; margin: 0 auto;
      border-bottom: 1px solid var(--border); overflow-x: auto;
    }
    .tab-btn {
      background: none; border: none; color: var(--text-muted);
      font-family: var(--font-sans); font-size: 0.9rem; font-weight: 600;
      padding: 0.75rem 1.15rem; cursor: pointer; border-bottom: 2px solid transparent;
      transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
    }
    .tab-btn:hover { color: var(--text-main); }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }

    main { max-width: 1440px; margin: 0 auto; padding: 2rem; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem; margin-bottom: 2rem;
    }
    .kpi-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 1.25rem; backdrop-filter: blur(12px);
    }
    .kpi-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .kpi-value { font-size: 1.7rem; font-weight: 800; color: #FFF; display: flex; align-items: baseline; gap: 0.5rem; }
    .kpi-sub { font-size: 0.74rem; color: var(--success); font-weight: 500; }

    .section-title {
      font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;
      display: flex; align-items: center; justify-content: space-between;
    }

    .systems-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem; margin-bottom: 2.5rem;
    }
    .system-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 1.5rem; backdrop-filter: blur(12px);
      display: flex; flex-direction: column; justify-content: space-between;
      transition: all 0.25s;
    }
    .system-card:hover { border-color: var(--border-accent); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); }

    .sys-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
    .sys-icon-title { display: flex; align-items: center; gap: 0.85rem; }
    .sys-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center;
      justify-content: center; font-size: 1.4rem; background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .sys-title h3 { font-size: 1.05rem; font-weight: 700; }
    .sys-title span { font-size: 0.75rem; color: var(--text-muted); }

    .state-badge {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.72rem; padding: 0.25rem 0.65rem; border-radius: 9999px;
      font-weight: 700; font-family: var(--font-mono); text-transform: uppercase;
    }
    .state-badge.MOCK { background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .state-badge.CONFIGURED { background: rgba(168, 85, 247, 0.15); color: #C084FC; border: 1px solid rgba(168, 85, 247, 0.3); }
    .state-badge.CONNECTED { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .state-badge.FAILED { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .state-badge.NOT_CONFIGURED { background: rgba(148, 163, 184, 0.15); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.3); }

    .sys-metrics {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
      background: rgba(0, 0, 0, 0.25); padding: 0.85rem; border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04); margin-bottom: 1rem;
    }
    .metric-item { display: flex; flex-direction: column; }
    .metric-key { font-size: 0.7rem; color: var(--text-muted); }
    .metric-val { font-size: 0.88rem; font-weight: 600; font-family: var(--font-mono); color: #F8FAFC; }

    .sys-operations {
      background: rgba(0, 0, 0, 0.15); border-radius: 8px; padding: 0.65rem 0.85rem;
      margin-bottom: 1rem; font-size: 0.74rem; color: #CBD5E1;
    }
    .sys-operations strong { color: #FFF; font-size: 0.72rem; text-transform: uppercase; }

    .sys-footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 0.85rem;
    }
    .sys-notes { font-size: 0.72rem; color: var(--text-muted); max-width: 70%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .btn-ping, .btn-action {
      background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--primary); font-size: 0.76rem; font-weight: 600; padding: 0.4rem 0.85rem;
      border-radius: 6px; cursor: pointer; transition: all 0.2s;
    }
    .btn-ping:hover, .btn-action:hover { background: rgba(56, 189, 248, 0.25); transform: translateY(-1px); }

    .btn-primary {
      background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white;
      border: none; padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.84rem;
      font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45); }

    /* Ingestion Studio Styles */
    .studio-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;
    }
    @media (max-width: 980px) { .studio-grid { grid-template-columns: 1fr; } }

    .studio-panel {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 1.5rem;
    }
    .studio-panel h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .studio-panel p { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; }

    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.78rem; font-weight: 600; color: #CBD5E1; margin-bottom: 0.4rem; }
    select, textarea {
      width: 100%; background: #070B12; border: 1px solid rgba(255, 255, 255, 0.12);
      color: #F8FAFC; border-radius: 8px; padding: 0.7rem; font-family: var(--font-mono); font-size: 0.8rem;
    }
    textarea { height: 180px; resize: vertical; }

    .scorecard {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;
    }
    .score-box {
      background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border);
      border-radius: 10px; padding: 0.75rem; text-align: center;
    }
    .score-num { font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); }
    .score-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; }

    /* Tables */
    .table-container {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; overflow: hidden; margin-top: 1rem;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem; }
    th {
      background: rgba(0, 0, 0, 0.35); color: var(--text-muted); font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.05em; padding: 0.85rem 1.1rem;
      border-bottom: 1px solid var(--border);
    }
    td { padding: 0.85rem 1.1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #CBD5E1; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    /* Pipeline Step Visualizer */
    .steps-flow {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem;
    }
    .step-box {
      background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border);
      border-radius: 12px; padding: 1rem; position: relative;
    }
    .step-box.PASSED { border-color: rgba(16, 185, 129, 0.4); }
    .step-box.WARNING { border-color: rgba(245, 158, 11, 0.4); }
    .step-box.FAILED { border-color: rgba(239, 68, 68, 0.4); }
    .step-num { font-size: 0.72rem; font-weight: 700; color: var(--primary); text-transform: uppercase; }
    .step-title { font-weight: 700; font-size: 0.88rem; margin: 0.2rem 0; color: #FFF; }
    .step-desc { font-size: 0.74rem; color: var(--text-muted); }

    pre {
      background: #070B12; border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1rem; border-radius: 8px; color: #38BDF8; font-family: var(--font-mono);
      font-size: 0.76rem; overflow-x: auto;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo-badge">TWG</div>
      <div class="brand-title">
        <h1>Design TWG <span class="demo-pill">Task 27 Integration</span> <span class="readonly-pill">QBO Read-Only</span></h1>
        <p>Enterprise Integration Foundation &bull; CSV Ingestion &bull; API Adapters &bull; Canonical Registry</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-primary" onclick="testLiveConnections()">
        <span>📡</span> Run Authenticated Connection Check
      </button>
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span id="header-conn-status">4 Connectors Evaluated</span>
      </div>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-overview')">
      <span>🔌</span> Connected Systems & Health
    </button>
    <button class="tab-btn" onclick="switchTab('tab-ingestion')">
      <span>📥</span> CSV Ingestion & Validation Studio
    </button>
    <button class="tab-btn" onclick="switchTab('tab-pipeline')">
      <span>⚙️</span> 8-Step Controlled Pipeline
    </button>
    <button class="tab-btn" onclick="switchTab('tab-canonical')">
      <span>🗄️</span> Canonical Registry & Counts
    </button>
    <button class="tab-btn" onclick="switchTab('tab-mapping')">
      <span>🔄</span> 5-Category Mapping & Limitations
    </button>
    <button class="tab-btn" onclick="switchTab('tab-transfers')">
      <span>⚡</span> Transfer Monitor
    </button>
  </nav>

  <main>
    <!-- TAB 1: OVERVIEW & STATUS CARDS -->
    <div id="tab-overview" class="tab-pane active">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Connector Adapters</div>
          <div class="kpi-value" id="kpi-active">4 / 4 <span class="kpi-sub">Evaluated</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Live API Verified</div>
          <div class="kpi-value" id="kpi-live">0 <small style="font-size:0.9rem; color:#94A3B8;">/ 4</small> <span class="kpi-sub" style="color:#F59E0B;">Safe Scaffolding</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Canonical Records</div>
          <div class="kpi-value" id="kpi-records">2 <span class="kpi-sub">In Memory</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Financial Safety Invariant</div>
          <div class="kpi-value" style="font-size:1.3rem; color:#34D399;">STRICTLY READ-ONLY</div>
        </div>
      </div>

      <div class="section-title">
        <h2><span>🔌</span> Integration Adapters & Honesty Verification</h2>
        <small style="color: #94A3B8; font-weight: normal;">* Live status requires real authenticated OAuth API response. Mock tests are never presented as live connections.</small>
      </div>

      <div class="systems-grid" id="systems-container"></div>
    </div>

    <!-- TAB 2: CSV INGESTION & VALIDATION STUDIO -->
    <div id="tab-ingestion" class="tab-pane">
      <div class="studio-grid">
        <div class="studio-panel">
          <h3><span>📄</span> Authorized CSV Import</h3>
          <p>Import enterprise records using validated CSV templates with duplicate detection and relationship checks.</p>

          <div class="form-group">
            <label class="form-label">Canonical Entity Category</label>
            <select id="entity-select" onchange="loadSelectedTemplate()">
              <option value="customers">Customers & Accounts (customers.csv)</option>
              <option value="contacts">Contacts & Decision Makers (contacts.csv)</option>
              <option value="deals">Leads & Deals (deals.csv)</option>
              <option value="projects">Projects & Workspaces (projects.csv)</option>
              <option value="milestones">Milestones & Phases (milestones.csv)</option>
              <option value="documents">Documents & Metadata (documents.csv)</option>
              <option value="invoices">Financial Invoices - Read-Only (invoices.csv)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">CSV Content (Headers & Data Rows)</label>
            <textarea id="csv-input" placeholder="Paste CSV payload here..."></textarea>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn-action" onclick="loadSelectedTemplate()">Load Sample Template</button>
            <button class="btn-primary" onclick="previewValidation()">Validate & Preview</button>
            <button class="btn-action" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border-color: rgba(16, 185, 129, 0.3);" onclick="executeImport(false)">Commit Authorized Import</button>
          </div>
        </div>

        <div class="studio-panel">
          <h3><span>📊</span> Validation Pre-Flight Scorecard</h3>
          <p>Validation results, duplicate detection, and schema verification.</p>

          <div class="scorecard">
            <div class="score-box">
              <div class="score-num" id="sc-total" style="color: #FFF;">0</div>
              <div class="score-label">Total Rows</div>
            </div>
            <div class="score-box">
              <div class="score-num" id="sc-valid" style="color: #34D399;">0</div>
              <div class="score-label">Valid Rows</div>
            </div>
            <div class="score-box">
              <div class="score-num" id="sc-invalid" style="color: #F87171;">0</div>
              <div class="score-label">Invalid Rows</div>
            </div>
            <div class="score-box">
              <div class="score-num" id="sc-dups" style="color: #F59E0B;">0</div>
              <div class="score-label">Duplicates</div>
            </div>
          </div>

          <div id="validation-report-details" style="font-size: 0.8rem; color: #94A3B8;">
            Select an entity type and click "Validate & Preview" to inspect rows.
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Row #</th>
              <th>Status</th>
              <th>Identifier</th>
              <th>Issues / Validation Checks</th>
              <th>Canonical Preview</th>
            </tr>
          </thead>
          <tbody id="validation-rows-tbody">
            <tr><td colspan="5" style="text-align:center; color: #64748B;">No validation run executed yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: 8-STEP CONTROLLED PIPELINE -->
    <div id="tab-pipeline" class="tab-pane">
      <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2>8-Step Controlled Transfer Pipeline</h2>
          <p style="font-size: 0.82rem; color: #94A3B8;">Reliable ingestion pipeline with idempotency, duplicate prevention, and sanitized audit logging.</p>
        </div>
        <button class="btn-primary" onclick="runPipelineDemo()">Execute 8-Step Pipeline Dry-Run</button>
      </div>

      <div class="steps-flow" id="pipeline-steps-container"></div>

      <div class="table-container">
        <h4 style="padding: 1rem 1.1rem; border-bottom: 1px solid var(--border); font-size: 0.9rem;">Sanitized Audit Ledger</h4>
        <table>
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Timestamp</th>
              <th>Entity</th>
              <th>Processed</th>
              <th>Imported</th>
              <th>Dry-Run</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody id="audit-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: CANONICAL REGISTRY -->
    <div id="tab-canonical" class="tab-pane">
      <div class="section-title">
        <h2><span>🗄️</span> Canonical Registry Record Inventory</h2>
        <small style="color: #94A3B8;">Segregated by Record Origin (Imported CSV vs Synthetic Sandbox)</small>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Entity Category</th>
              <th>Total Records</th>
              <th>Imported from CSV</th>
              <th>Mock / Synthetic Demo</th>
              <th>Access Safety</th>
            </tr>
          </thead>
          <tbody id="counts-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- TAB 5: MAPPING & LIMITATIONS -->
    <div id="tab-mapping" class="tab-pane">
      <div class="mapping-grid" id="mapping-container"></div>
    </div>

    <!-- TAB 6: TRANSFER MONITOR -->
    <div id="tab-transfers" class="tab-pane">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Trigger & Entity</th>
              <th>Pipeline Path</th>
              <th>Record Reference</th>
              <th>Latency</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody id="transfers-tbody"></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    let healthData = null;
    let currentReport = null;

    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.currentTarget.classList.add('active');
    }

    async function loadData() {
      try {
        const [healthRes, mapRes, transRes, countsRes, auditRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/mapping/samples'),
          fetch('/api/transfers'),
          fetch('/api/ingestion/registry/counts'),
          fetch('/api/audit/logs')
        ]);

        healthData = await healthRes.json();
        const mappingDefs = await mapRes.json();
        const transfers = await transRes.json();
        const counts = await countsRes.json();
        const audits = await auditRes.json();

        renderHealthCards();
        renderMappingView(mappingDefs);
        renderTransfersTable(transfers);
        renderCountsTable(counts);
        renderAuditTable(audits);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    }

    function renderHealthCards() {
      if (!healthData) return;
      document.getElementById('kpi-live').innerHTML = \`\${healthData.liveVerifiedSystemsCount} <small style="font-size:0.9rem; color:#94A3B8;">/ 4</small> <span class="kpi-sub" style="color:\${healthData.liveVerifiedSystemsCount > 0 ? '#34D399' : '#F59E0B'};">\${healthData.liveVerifiedSystemsCount > 0 ? 'Verified' : 'Safe Scaffolding'}</span>\`;

      const icons = {
        'zoho-crm': '🎯',
        'zoho-projects': '📐',
        'quickbooks': '💳',
        'microsoft-365': '📁'
      };

      const container = document.getElementById('systems-container');
      container.innerHTML = healthData.systems.map(sys => {
        const quotaPct = Math.round((sys.quotaUsed / sys.quotaLimit) * 100);
        const stateClass = sys.connectionState || 'MOCK';
        const isLive = sys.isLiveVerified;

        return \`
          <div class="system-card">
            <div>
              <div class="sys-header">
                <div class="sys-icon-title">
                  <div class="sys-icon">\${icons[sys.id] || '🔌'}</div>
                  <div class="sys-title">
                    <h3>\${sys.name}</h3>
                    <span>\${sys.category} \${sys.isReadOnly ? ' &bull; <b style="color:#F59E0B;">READ-ONLY</b>' : ''}</span>
                  </div>
                </div>
                <div class="state-badge \${stateClass}">\${stateClass}</div>
              </div>

              <div class="sys-metrics">
                <div class="metric-item">
                  <span class="metric-key">Live Verification</span>
                  <span class="metric-val" style="color: \${isLive ? '#34D399' : '#F59E0B'};">\${isLive ? 'VERIFIED' : 'UNVERIFIED'}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-key">Latency</span>
                  <span class="metric-val">\${sys.latencyMs} ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-key">Required Scopes</span>
                  <span class="metric-val" style="font-size:0.75rem;">\${sys.requiredScopes ? sys.requiredScopes.length : 0} defined</span>
                </div>
                <div class="metric-item">
                  <span class="metric-key">Missing Config</span>
                  <span class="metric-val" style="color: \${sys.missingCredentials && sys.missingCredentials.length > 0 ? '#F87171' : '#34D399'}; font-size:0.75rem;">
                    \${sys.missingCredentials && sys.missingCredentials.length > 0 ? sys.missingCredentials.length + ' keys missing' : 'None (Configured)'}
                  </span>
                </div>
              </div>

              <div class="sys-operations">
                <strong>Supported Operations:</strong>
                <div style="margin-top:0.3rem; color: #94A3B8;">\${(sys.supportedOperations || []).join(' &bull; ')}</div>
              </div>
            </div>

            <div class="sys-footer">
              <span class="sys-notes" title="\${sys.notes}">\${sys.notes}</span>
              <button class="btn-ping" onclick="pingAdapter('\${sys.id}')">Test Ping</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function loadSelectedTemplate() {
      const type = document.getElementById('entity-select').value;
      const res = await fetch('/api/ingestion/template/' + type);
      const text = await res.text();
      document.getElementById('csv-input').value = text;
    }

    async function previewValidation() {
      const entityType = document.getElementById('entity-select').value;
      const csvContent = document.getElementById('csv-input').value;

      const res = await fetch('/api/ingestion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, csvContent })
      });

      currentReport = await res.json();
      document.getElementById('sc-total').textContent = currentReport.totalRows;
      document.getElementById('sc-valid').textContent = currentReport.validRows;
      document.getElementById('sc-invalid').textContent = currentReport.invalidRows;
      document.getElementById('sc-dups').textContent = currentReport.duplicateCount;

      const tbody = document.getElementById('validation-rows-tbody');
      tbody.innerHTML = currentReport.rowResults.map(r => {
        const idVal = r.rawRow.id || r.rawRow.customer_id || r.rawRow.deal_id || 'N/A';
        const statusHtml = r.success
          ? '<span style="color:#34D399; font-weight:700;">✓ VALID</span>'
          : '<span style="color:#F87171; font-weight:700;">✗ INVALID</span>';

        const issuesHtml = r.issues.length === 0
          ? '<span style="color:#94A3B8;">No issues detected.</span>'
          : r.issues.map(i => \`<div style="color:\${i.severity === 'ERROR' ? '#F87171' : '#F59E0B'}; font-size:0.75rem;">[\${i.code}] \${i.message}</div>\`).join('');

        return \`
          <tr>
            <td>\${r.rowNumber}</td>
            <td>\${statusHtml}</td>
            <td style="font-family:var(--font-mono);">\${idVal}</td>
            <td>\${issuesHtml}</td>
            <td style="font-family:var(--font-mono); font-size:0.72rem; color:#38BDF8;">\${r.canonicalData ? r.canonicalData.canonicalId : '-'}</td>
          </tr>
        \`;
      }).join('');

      document.getElementById('validation-report-details').innerHTML = \`
        <b>Status:</b> \${currentReport.canProceedWithImport ? '<span style="color:#34D399;">Ready for ingestion</span>' : '<span style="color:#F87171;">Errors found - fix before committing</span>'}
        &bull; Conflicts: \${currentReport.conflictCount} &bull; Orphaned Refs: \${currentReport.orphanedRefCount}
      \`;
    }

    async function executeImport(dryRun = false) {
      const entityType = document.getElementById('entity-select').value;
      const csvContent = document.getElementById('csv-input').value;

      const res = await fetch('/api/ingestion/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, csvContent, dryRun })
      });

      const result = await res.json();
      alert(\`Ingestion Complete! Imported: \${result.importedCount}, Skipped: \${result.skippedCount}, Failed: \${result.failedCount}. Audit ID: \${result.auditId}\`);
      await loadData();
    }

    async function runPipelineDemo() {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'customers', dryRun: true })
      });
      const data = await res.json();

      const container = document.getElementById('pipeline-steps-container');
      container.innerHTML = data.stepLogs.map(s => \`
        <div class="step-box \${s.status}">
          <div class="step-num">Step \${s.stepNumber} &bull; \${s.status} (\${s.durationMs}ms)</div>
          <div class="step-title">\${s.stepName}</div>
          <div class="step-desc">\${s.details}</div>
        </div>
      \`).join('');

      await loadData();
    }

    async function testLiveConnections() {
      const res = await fetch('/api/connections/test', { method: 'POST' });
      const results = await res.json();
      alert(\`Tested 4 real adapters: \${results.map(r => r.systemName + ': ' + r.state).join(' | ')}\`);
      await loadData();
    }

    async function pingAdapter(id) {
      const res = await fetch('/api/ping/' + id, { method: 'POST' });
      const data = await res.json();
      alert(\`Pinged \${id}: Latency \${data.latencyMs}ms\`);
      await loadData();
    }

    function renderMappingView(mappings) {
      const container = document.getElementById('mapping-container');
      container.innerHTML = mappings.map(m => \`
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:1.25rem; margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
            <h3 style="font-size:1rem; font-weight:700;">\${m.category} &bull; \${m.sourceSystem} &rarr; \${m.targetSystem}</h3>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:#A855F7;">Index: \${m.stableIdentifierPattern}</span>
          </div>
          <p style="font-size:0.8rem; color:#94A3B8; margin-bottom:0.6rem;">\${m.description}</p>
          <div style="font-size:0.75rem; color:#E2E8F0; margin-bottom:0.6rem;">
            <b>Duplicate Resolution:</b> \${m.duplicateResolutionRule}<br>
            <b>Null Policy:</b> \${m.nullHandlingPolicy}
          </div>
          <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:0.6rem; font-size:0.73rem; color:#F59E0B;">
            <b>Known Limitations:</b> \${(m.knownLimitations || []).join(' &bull; ')}
          </div>
        </div>
      \`).join('');
    }

    function renderTransfersTable(transfers) {
      const tbody = document.getElementById('transfers-tbody');
      tbody.innerHTML = transfers.map(t => \`
        <tr>
          <td><span class="state-badge \${t.status}">\${t.status}</span></td>
          <td><b>\${t.entityType}</b><div style="font-size:0.72rem; color:#94A3B8;">\${t.trigger}</div></td>
          <td>\${t.sourceSystem} &rarr; \${t.targetSystem}</td>
          <td style="font-family:var(--font-mono);">\${t.recordLabel}</td>
          <td>\${t.durationMs}ms</td>
          <td>\${new Date(t.timestamp).toLocaleTimeString()}</td>
        </tr>
      \`).join('');
    }

    function renderCountsTable(counts) {
      const tbody = document.getElementById('counts-tbody');
      tbody.innerHTML = Object.entries(counts).map(([cat, c]) => \`
        <tr>
          <td style="font-weight:600; text-transform:capitalize;">\${cat}</td>
          <td style="font-family:var(--font-mono); font-weight:700; color:#FFF;">\${c.total}</td>
          <td style="font-family:var(--font-mono); color:#38BDF8;">\${c.csvImported}</td>
          <td style="font-family:var(--font-mono); color:#A855F7;">\${c.mockSynthetic}</td>
          <td>\${cat === 'invoices' ? '<span class="readonly-pill">READ-ONLY ENFORCED</span>' : '<span style="color:#34D399;">Standard Read/Write</span>'}</td>
        </tr>
      \`).join('');
    }

    function renderAuditTable(audits) {
      const tbody = document.getElementById('audit-tbody');
      tbody.innerHTML = audits.map(a => \`
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:#38BDF8;">\${a.auditId}</td>
          <td>\${new Date(a.timestamp).toLocaleTimeString()}</td>
          <td style="text-transform:capitalize;">\${a.entityType}</td>
          <td>\${a.totalProcessed}</td>
          <td style="color:#34D399;">\${a.importedCount}</td>
          <td>\${a.dryRun ? '<span style="color:#F59E0B;">YES</span>' : 'NO'}</td>
          <td style="font-size:0.75rem; color:#94A3B8;">\${a.sanitizedSummary}</td>
        </tr>
      \`).join('');
    }

    // Init
    loadData();
    loadSelectedTemplate();
    setInterval(loadData, 8000);
  </script>
</body>
</html>`;
}
