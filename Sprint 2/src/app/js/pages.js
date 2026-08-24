import { lineChart, miniBars } from "./charts.js";
import { allocationView, badge, card, escapeHtml, formatMoney, formatPercent, pageHeading, sourceFootnote, statCard, statePanel, tableShell, workflowSteps } from "./components.js";

const blockingScenarios = new Set(["loading", "empty", "error", "denied", "no-match"]);

function pageOrState(state, render) {
  if (blockingScenarios.has(state.scenario)) return `<section class="page">${statePanel(state.scenario)}</section>`;
  return render();
}

function statusFor(state, fallback = "current") {
  return ["late", "incomplete", "hypothesis"].includes(state.scenario) ? state.scenario : fallback;
}

function statusLabel(status) {
  return ({ current: "Current", late: "Late", incomplete: "Incomplete", hypothesis: "Pending validation", warning: "Review required", blocking: "Blocking" })[status] || status;
}

function selectedFund(state) {
  return state.data.funds.find((fund) => fund.id === state.selectedFund) || state.data.funds[0];
}

function overview(state) {
  return pageOrState(state, () => {
    const data = state.data;
    const total = data.funds.slice(0, 7).reduce((sum, fund) => sum + fund.aum_brl, 0);
    const history = data.history.map((item) => item.nav_index);
    const benchmark = data.history.map((item) => item.benchmark_index);
    const scenarioStatus = statusFor(state);
    const fundRows = data.funds.slice(0, 5).map((fund) => `<tr>
      <td><button type="button" class="table-button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button></td>
      <td>${badge(fund.coverage === "history-only" ? "History" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
    </tr>`).join("");
    const alerts = data.anomalies.slice(0, 4).map((item) => `<div class="alert-item"><span class="alert-symbol">${item.rule_id}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.record_ref)} · no source value exposed</p></div>${badge(item.severity === "blocking" ? "Blocking" : "Review required", item.severity)}</div>`).join("");
    return `<section class="page" data-page="overview">
      ${pageHeading("Executive journey", "A clear view before every decision.", "Portfolio overview, quality, freshness, and hypotheses in one place without exposing local sources.", '<button class="button secondary" type="button" data-nav="quality">View controls</button><button class="button primary" type="button" data-nav="funds">Explore funds</button>')}
      <section class="card hero-card">
        <div class="hero-copy"><span class="eyebrow">Synthetic portfolio · 7 snapshot funds</span><h2>Consolidated legal AUM</h2><div class="hero-total"><span>K01 · synthetic source</span><strong data-testid="executive-aum">${formatMoney(total)}</strong></div><p>The look-through view remains a hypothesis until the bridge is validated. The fourteen funds with historical coverage are tracked separately.</p><div class="hero-actions">${badge("Sample data", "sample")} ${badge(statusLabel(scenarioStatus), scenarioStatus)}</div></div>
        <div class="hero-visual">${lineChart(history, benchmark, "Synthetic performance of FUND_01 and its benchmark")}</div>
      </section>
      <div class="grid grid-kpis" style="margin-top:1rem">
        ${statCard({ label: "Gross AUM", value: formatMoney(total), status: scenarioStatus, statusLabel: statusLabel(scenarioStatus), trend: "+2.4%", meta: "K01", delay: 40 })}
        ${statCard({ label: "Look-through AUM", value: formatMoney(total * 0.78), status: "hypothesis", statusLabel: "Pending validation", trend: "Synthetic bridge", meta: "K14", delay: 80 })}
        ${statCard({ label: "Publication quality", value: "94 / 100", status: "current", statusLabel: "Controlled", trend: "5 quarantined", meta: "K16", delay: 120 })}
        ${statCard({ label: "12-month performance", value: "+12.8%", status: state.scenario === "incomplete" ? "incomplete" : "sample", statusLabel: state.scenario === "incomplete" ? "Incomplete" : "Sample", trend: "+3.1 pts", meta: "H02", delay: 160 })}
      </div>
      <div class="grid grid-main">
        ${tableShell("Priority funds", "Detailed snapshot and historical coverage", [{label:"Fund"},{label:"Coverage"},{label:"AUM",numeric:true},{label:"Daily return",numeric:true}], fundRows, '<button class="button ghost small" type="button" data-nav="funds">View all 14 funds</button>')}
        ${card("Alerts requiring action", "Details remain opaque and contain no private identifiers.", `<div class="alert-list">${alerts}</div>`, '<button class="button ghost small" type="button" data-nav="quality">Open all</button>')}
      </div>
      ${sourceFootnote()}
    </section>`;
  });
}

function funds(state) {
  return pageOrState(state, () => {
    const query = state.query.trim().toLowerCase();
    const funds = state.data.funds.filter((fund) => fund.id.toLowerCase().includes(query));
    if (!funds.length) return `<section class="page">${pageHeading("Executive", "Funds", "Coverage across fourteen synthetic aliases.")}${statePanel("no-match")}</section>`;
    const rows = funds.map((fund) => `<tr>
      <td><span class="row-title"><button type="button" class="table-button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button><small>${fund.lineage_ref}</small></span></td>
      <td>${badge(fund.coverage === "history-only" ? "History only" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td><td class="numeric">${fund.nav_per_share.toFixed(2)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
      <td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td>
      <td><button type="button" class="button secondary small" data-action="select-fund" data-fund="${fund.id}">Open</button></td>
    </tr>`).join("");
    return `<section class="page" data-page="funds">${pageHeading("Executive journey", "Funds", "Fourteen funds with historical coverage, including seven with a detailed demonstration snapshot.", '<button class="button primary" type="button" data-nav="comparison">Compare</button>')}
      ${tableShell("Fund universe", `${funds.length} result(s) · aliases only`, [{label:"Fund"},{label:"Coverage"},{label:"AUM",numeric:true},{label:"NAV per share",numeric:true},{label:"Daily return",numeric:true},{label:"Quality"},{label:"Action"}], rows, '<label><span class="sr-only">Search for a fund</span><input type="search" id="fund-search" placeholder="Search FUND_01" value="'+escapeHtml(state.query)+'"></label>')}
      ${sourceFootnote("SRC_SYNTHETIC_FIXTURES", state.scenario === "late" ? "Late" : "Current", state.scenario === "incomplete" ? "Incomplete" : "Valid")}
    </section>`;
  });
}

function fundDetail(state) {
  return pageOrState(state, () => {
    const fund = selectedFund(state);
    const fallbackPositions = state.data.positions.filter((item) => item.fund_id === "FUND_01");
    const positions = fallbackPositions.filter((item) => !state.allocationFilter || item.asset_class === state.allocationFilter);
    const rows = positions.map((position) => `<tr><td><span class="row-title"><strong>${position.instrument}</strong><small>${position.lineage_ref}</small></span></td><td>${position.asset_class}</td><td>${position.issuer}</td><td class="numeric">${formatMoney(position.value_brl, false)}</td><td class="numeric">${formatPercent(position.weight, 1)}</td><td>${badge(position.price_age_days > 20 ? "Late" : "Current", position.price_age_days > 20 ? "late" : "current")}</td></tr>`).join("");
    return `<section class="page" data-page="fund-detail">${pageHeading("Funds / Allocation", fund.id, "Synthetic fund detail from asset allocation through individual positions and lineage.", '<button class="button secondary" type="button" data-nav="funds">Back to funds</button><button class="button primary" type="button" data-nav="performance">View performance</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Net assets", value: formatMoney(fund.aum_brl), status: "current", statusLabel: "Current", trend: formatPercent(fund.daily_return), meta: "K01", testId: "fund-aum" })}
        ${statCard({ label: "NAV per share", value: fund.nav_per_share.toFixed(2), status: "current", statusLabel: "Current", trend: "BRL / share", meta: "K02", delay: 40 })}
        ${statCard({ label: "Top 5 concentration", value: "41.8%", status: "sample", statusLabel: "Sample", trend: "Stable", meta: "K07", delay: 80 })}
        ${statCard({ label: "Maximum price age", value: "24 days", status: "late", statusLabel: "1 late", trend: "Proposed threshold", meta: "K15", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Allocation", "Select an asset class to filter positions.", allocationView(state.data.allocation, state.allocationFilter), "", "allocation-card")}
        ${card("Reconciliation", "Synthetic components of K13.", `${miniBars([78, 12, 6, 4], "Breakdown of positions, cash, provisions, and variance")}<div class="stat-meta" style="margin-top:1rem"><span>Positions + cash + provisions</span>${badge("Threshold pending validation", "hypothesis")}</div>`)}
      </div>
      <div style="margin-top:1rem">${tableShell("Positions", state.allocationFilter ? `Filter: ${state.allocationFilter} · ${positions.length} rows` : `${positions.length} synthetic positions`, [{label:"Instrument"},{label:"Asset class"},{label:"Issuer"},{label:"Value",numeric:true},{label:"Weight",numeric:true},{label:"Price freshness"}], rows, '<button class="button ghost small" type="button" data-action="clear-allocation">Reset</button>')}</div>
      ${sourceFootnote()}
    </section>`;
  });
}

function performance(state) {
  return pageOrState(state, () => {
    const fund = selectedFund(state);
    const history = state.data.history;
    const primary = history.map((item) => item.nav_index);
    const secondary = history.map((item) => item.benchmark_index);
    return `<section class="page" data-page="performance">${pageHeading("Performance & risk", `${fund.id} over ${state.period}`, "The series are synthetic. Historical KPIs remain subject to depth and domain controls.", '<button class="button secondary" type="button" data-nav="fund-detail">Allocation</button><button class="button primary" type="button" data-nav="comparison">Compare</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Cumulative return", value: "+12.8%", status: "sample", statusLabel: "Sample", trend: "+3.1 pts vs benchmark", meta: "H02" })}
        ${statCard({ label: "Volatility", value: "8.4%", status: state.scenario === "incomplete" ? "incomplete" : "sample", statusLabel: state.scenario === "incomplete" ? "Incomplete" : "Sample", trend: "Proposed 252-day basis", meta: "H03", delay: 40 })}
        ${statCard({ label: "Maximum drawdown", value: "-4.2%", status: "sample", statusLabel: "Sample", trend: "Valid domain", meta: "H05", delay: 80 })}
        ${statCard({ label: "Sharpe ratio", value: "Unavailable", status: "hypothesis", statusLabel: "Pending validation", trend: "Risk-free rate required", meta: "H04", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Performance index", "Base 100 · synthetic data", lineChart(primary, secondary, `Synthetic performance of ${fund.id}`), badge("H01-H03", "sample"))}
        ${card("Historical prerequisites", "Availability does not imply certification.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">H01</span><div><strong>Daily NAV</strong><p>Available with positive-value controls.</p></div>${badge("Controlled", "current")}</div><div class="alert-item"><span class="alert-symbol">H04</span><div><strong>Risk-free rate</strong><p>Source and convention pending validation.</p></div>${badge("Pending validation", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">H06</span><div><strong>Duration</strong><p>Unit not yet approved; calculation blocked.</p></div>${badge("Blocked", "unavailable")}</div></div>`)}
      </div>${sourceFootnote("SRC_SYNTHETIC_FIXTURES", "Current", "Sample series")}</section>`;
  });
}

function comparison(state) {
  return pageOrState(state, () => {
    const funds = state.data.funds.slice(0, 7);
    const max = Math.max(...funds.map((fund) => fund.aum_brl));
    const rows = funds.map((fund) => `<tr><td><button class="table-button" type="button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button></td><td class="numeric">${formatMoney(fund.aum_brl)}</td><td><div class="quality-bar" aria-label="Relative weight ${Math.round(fund.aum_brl / max * 100)} percent"><span style="width:${fund.aum_brl / max * 100}%"></span></div></td><td class="numeric">${formatPercent(fund.daily_return)}</td><td class="numeric">${(6.5 + funds.indexOf(fund) * 0.4).toFixed(1)}%</td><td>${badge(fund.quality_status === "current" ? "Current" : "Incomplete", fund.quality_status)}</td></tr>`).join("");
    return `<section class="page" data-page="comparison">${pageHeading("Internal comparison", "Seven funds on a comparable basis.", "The same date, definitions, and visible quality status for every measure.", '<button class="button primary" type="button" data-nav="peers">Compare with peers</button>')}${tableShell("Internal comparison", "Fully synthetic values", [{label:"Fund"},{label:"AUM",numeric:true},{label:"Relative size"},{label:"Daily return",numeric:true},{label:"Volatility",numeric:true},{label:"Quality"}], rows)}${sourceFootnote()}</section>`;
  });
}

function peers(state) {
  return pageOrState(state, () => {
    const rows = state.data.peer_sample.map((peer, index) => `<tr><td>${index + 1}</td><td><strong>${peer.peer_id}</strong></td><td class="numeric">${peer.return_index.toFixed(1)}</td><td>${badge("Sample data", "sample")}</td></tr>`).join("");
    return `<section class="page" data-page="peers">${pageHeading("Peer comparison", "An adapter is ready; no certification is implied.", "This view uses a synthetic universe. It is disabled when an official, versioned source is unavailable.", '<button class="button secondary" type="button" data-nav="comparison">Internal comparison</button>')}
      <div class="grid grid-main">${tableShell("Synthetic universe", "6 aliased peers · H07", [{label:"Rank"},{label:"Peer"},{label:"Index",numeric:true},{label:"Status"}], rows)}${card("Activation conditions", "All remain pending validation.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">01</span><div><strong>Versioned source</strong><p>Named owner and reference date.</p></div>${badge("Pending validation", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">02</span><div><strong>Deduplication</strong><p>One unique synthetic identifier per universe.</p></div>${badge("Tested", "current")}</div><div class="alert-item"><span class="alert-symbol">03</span><div><strong>Extreme values</strong><p>Quarantine before any ranking.</p></div>${badge("Tested", "current")}</div></div>`)}</div>
      ${sourceFootnote("SRC_SYNTHETIC_FIXTURES", "Current", "Sample only")}</section>`;
  });
}

function quality(state) {
  return pageOrState(state, () => {
    const anomalies = state.data.anomalies;
    const open = anomalies.filter((item) => item.status === "open").length;
    const blocked = anomalies.filter((item) => item.severity === "blocking" && item.status === "open").length;
    const rows = anomalies.map((item) => `<tr><td><button class="table-button" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">${item.rule_id}</button></td><td>${escapeHtml(item.title)}</td><td>${badge(item.severity, item.severity)}</td><td>${badge(item.status, item.status === "open" ? "warning" : item.status)}</td><td><code>${item.record_ref}</code></td><td><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">Details</button></td></tr>`).join("");
    return `<section class="page" data-page="quality">${pageHeading("Analyst journey", "Data quality", "Explicit rules, visible quarantines, and no source content in logs.", '<button class="button primary" type="button" data-nav="import">Run a control</button>')}
      <div class="grid grid-kpis">${statCard({label:"Open anomalies",value:String(open),status:open ? "warning" : "current",statusLabel:open ? "Action required" : "Processed",meta:"K16"})}${statCard({label:"Blocking anomalies",value:String(blocked),status:blocked ? "blocking" : "current",statusLabel:blocked ? "Isolated" : "Zero",meta:"DQ"})}${statCard({label:"Accepted rows",value:"49",status:"current",statusLabel:"Valid",meta:"Run"})}${statCard({label:"Confidentiality scan",value:"0 hits",status:"current",statusLabel:"Clean output",meta:"DQ20/21"})}</div>
      <div style="margin-top:1rem">${tableShell("Anomaly log", `${anomalies.length} synthetic controls`, [{label:"Rule"},{label:"Anomaly"},{label:"Severity"},{label:"Status"},{label:"Reference"},{label:"Action"}], rows)}</div>${sourceFootnote()}</section>`;
  });
}

function workflowStage(state) {
  const openAnomalies = state.data.anomalies.filter((item) => item.status === "open");
  if (state.workflowStep === 0) return `<div class="drop-zone"><div><span class="eyebrow">Step 1</span><h2>Select a demonstration source</h2><p>Only synthetic fixtures can be loaded into the prototype.</p><button class="button primary" type="button" data-action="select-source">Select synthetic batch</button></div></div>`;
  if (state.workflowStep === 1) return `<div><span class="eyebrow">Source selected</span><h2>FIXTURE_BATCH_07</h2><p>Three CSV files cover the 38/51-column layouts and the empty section. The manifest stores fingerprints without source rows.</p><div class="detail-grid"><div class="detail-item"><small>Classification</small><strong>synthetic-example</strong></div><div class="detail-item"><small>Target run</small><strong>SPRINT2-WF-001</strong></div><div class="detail-item"><small>Logical files</small><strong>7 simulated exports</strong></div><div class="detail-item"><small>External publication</small><strong>Prohibited</strong></div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="run-structure">Check structure</button></div></div>`;
  if (state.workflowStep === 2) return `<div><span class="eyebrow">Control completed</span><h2>${openAnomalies.length} anomalies to review</h2><p>Blocking cases remain quarantined. Open details to simulate a resolution.</p><div class="progress-track" aria-label="Control completed"><span style="width:100%"></span></div><div class="alert-list" style="margin-top:1rem">${state.data.anomalies.slice(0,5).map((item) => `<div class="alert-item"><span class="alert-symbol">${item.rule_id}</span><div><strong>${escapeHtml(item.title)}</strong><p>${item.record_ref}</p></div><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">Details</button></div>`).join("")}</div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="quarantine-all">Quarantine blocking cases</button></div></div>`;
  if (state.workflowStep === 3) return `<div><span class="eyebrow">Simulated treatment</span><h2>Invalid records are isolated</h2><p>Counts and reasons are retained; no source value appears in the log.</p>${miniBars([49,5,3,0], "49 accepted rows, 5 quarantined, 3 warnings, zero disclosures")}<div style="margin-top:1rem"><button class="button primary" type="button" data-action="prepare-validation">Prepare validation</button></div></div>`;
  if (state.workflowStep === 4) return `<div><span class="eyebrow">Dataset validation</span><h2>Publication checklist</h2><div class="alert-list"><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Silver and Gold contracts</strong><p>Required fields are present.</p></div>${badge("Compliant", "current")}</div><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Confidentiality</strong><p>Denylist terms and private patterns are absent from outputs.</p></div>${badge("0 hits", "current")}</div><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Idempotence</strong><p>Two executions produced the same fingerprints.</p></div>${badge("Compliant", "current")}</div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="validate-dataset">Validate synthetic dataset</button></div></div>`;
  if (state.workflowStep === 5) return `<div><span class="eyebrow">Dataset validated</span><h2>Publish to prototype Serving</h2><p>This publication remains local and synthetic. It does not send data to an external service.</p><div class="detail-grid"><div class="detail-item"><small>Target</small><strong>Local Serving</strong></div><div class="detail-item"><small>Classification</small><strong>synthetic-example</strong></div><div class="detail-item"><small>Private identifiers</small><strong>0</strong></div><div class="detail-item"><small>Human decision</small><strong>Not required for fixtures</strong></div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="publish-dataset">Publish locally</button></div></div>`;
  return `<div><span class="eyebrow">Local publication completed</span><h2>Lineage available</h2><p>The synthetic Serving payload is linked to its manifest and opaque fixtures.</p><div class="lineage-chain"><div class="lineage-node"><strong>Fixture</strong><code>FIXTURE_01</code></div><div class="lineage-node"><strong>Silver</strong><code>REC_SNAPSHOT_01</code></div><div class="lineage-node"><strong>Gold</strong><code>LIN_KPI_K01</code></div><div class="lineage-node"><strong>Serving</strong><code>executive-aum</code></div></div><div style="margin-top:1rem"><button class="button secondary" type="button" data-nav="runs">Open run log</button></div></div>`;
}

function importValidation(state) {
  return pageOrState(state, () => `<section class="page" data-page="import">${pageHeading("Analyst journey", "Import and validation", "A fully interactive fixture workflow: selection, control, anomalies, quarantine, validation, publication, and lineage.", '<button class="button secondary" type="button" data-action="reset-workflow">Reset</button>')}<div class="workflow"><aside class="card card-pad">${workflowSteps(state.workflowStep)}</aside><section class="card card-pad workflow-stage" aria-live="polite">${workflowStage(state)}</section></div>${sourceFootnote()}</section>`);
}

function runs(state) {
  return pageOrState(state, () => {
    const runRows = state.data.runs.map((run) => `<tr><td><code>${run.run_id}</code></td><td>${badge("Published locally", "published")}</td><td>${run.generated_at.replace("T", " ").replace("Z", " UTC")}</td><td class="numeric">${run.accepted_records}</td><td class="numeric">${run.quarantined_records}</td><td><code>${run.manifest_ref}</code></td></tr>`).join("");
    const proofs = state.data.lineage_proofs.map((proof) => `<tr><td>${proof.screen_value_id}</td><td>${proof.kpi_id}</td><td><code>${proof.lineage_ref}</code></td><td><code>${proof.source_record_id}</code></td><td>${proof.business_date}</td></tr>`).join("");
    return `<section class="page" data-page="runs">${pageHeading("Run history & lineage", "Every figure retains its trace.", "Manifest, status, quarantine, and screen-to-synthetic-source evidence are available without exposing input values.", '<button class="button primary" type="button" data-nav="import">New run</button>')}
      ${tableShell("Run log", "Deterministic evidence run", [{label:"Run"},{label:"Status"},{label:"Generated"},{label:"Accepted",numeric:true},{label:"Quarantined",numeric:true},{label:"Manifest"}], runRows)}
      <div style="margin-top:1rem">${tableShell("Lineage evidence", "Three minimum traces required by the audit", [{label:"Screen value"},{label:"KPI"},{label:"Lineage"},{label:"Opaque record"},{label:"Date"}], proofs)}</div>
      <div style="margin-top:1rem">${card("Evidence chain", "Example for the executive-aum value.", '<div class="lineage-chain"><div class="lineage-node"><strong>Manifest</strong><code>SPRINT2-WF-001</code></div><div class="lineage-node"><strong>Silver</strong><code>REC_SNAPSHOT_01</code></div><div class="lineage-node"><strong>Gold</strong><code>LIN_KPI_K01</code></div><div class="lineage-node"><strong>Screen</strong><code>executive-aum</code></div></div>')}</div>${sourceFootnote()}</section>`;
  });
}

const renderers = { overview, funds, "fund-detail": fundDetail, performance, comparison, peers, quality, import: importValidation, runs };

export function renderPage(state) {
  return (renderers[state.view] || overview)(state);
}
