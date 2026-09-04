import { lineChart, miniBars } from "./charts.js";
import { allocationView, badge, card, escapeHtml, formatMoney, formatPercent, pageHeading, sourceFootnote, statCard, statePanel, tableShell, workflowSteps } from "./components.js";

const blockingScenarios = new Set(["loading", "empty", "error", "denied", "no-match"]);

function pageOrState(state, render) {
  if (state.dataStatus === "loading") return `<section class="page">${statePanel("loading")}</section>`;
  if (state.dataStatus === "error") return `<section class="page">${statePanel("error")}</section>`;
  if (blockingScenarios.has(state.scenario)) return `<section class="page">${statePanel(state.scenario)}</section>`;
  return render();
}

function statusLabel(status) {
  return ({ current: "Current", late: "Late", incomplete: "Incomplete", unavailable: "Unavailable", warning: "Review required", blocking: "Blocking", reconciled: "Reconciled" })[status] || status;
}

function selectedFund(state) {
  return state.data.funds.find((fund) => fund.id === state.selectedFund) || state.data.funds[0];
}

function metric(value, formatter, fallback = "Unavailable") {
  return value === null || value === undefined ? fallback : formatter(value);
}

function ratio(value) {
  return metric(value, (item) => Number(item).toFixed(2));
}

function pctCdi(value) {
  return metric(value, (item) => `${Number(item).toFixed(1)}%`);
}

function sourceFor(state, freshness = "Current", quality = "Validated") {
  return sourceFootnote("Governed MySQL", freshness, quality, state.data.meta.run_id);
}

function overview(state) {
  return pageOrState(state, () => {
    const data = state.data;
    const total = data.overview.total_aum_brl;
    const performance = data.performance;
    const history = performance.history;
    const fundRows = data.funds.filter((fund) => fund.aum_brl !== null).slice(0, 5).map((fund) => `<tr>
      <td><button type="button" class="table-button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button></td>
      <td>${badge(fund.coverage === "history-only" ? "History" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return !== null && fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
    </tr>`).join("");
    const alerts = data.anomalies.slice(0, 4).map((item) => `<div class="alert-item"><span class="alert-symbol">${item.rule_id}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.record_ref)} · no source value exposed</p></div>${badge(item.severity === "blocking" ? "Quarantined" : "Review required", item.severity)}</div>`).join("");
    return `<section class="page" data-page="overview">
      ${pageHeading("Executive journey", "A clear view before every decision.", "Portfolio overview, quality, freshness, and calculated performance from governed local data.", '<button class="button secondary" type="button" data-nav="quality">View controls</button><button class="button primary" type="button" data-nav="funds">Explore funds</button>')}
      <section class="card hero-card">
        <div class="hero-copy"><span class="eyebrow">Local restricted portfolio · ${data.overview.funds_with_nav}/${data.overview.fund_count} funds with valid NAV</span><h2>Latest available net assets</h2><div class="hero-total"><span>K01 · curated database</span><strong data-testid="executive-aum">${formatMoney(total)}</strong></div><p>Each fund uses its latest validated NAV. Missing or quarantined values remain explicitly unavailable.</p><div class="hero-actions">${badge("Governed data", "current")} ${badge(`${data.overview.open_issues} quality issues`, data.overview.open_issues ? "warning" : "current")}</div></div>
        <div class="hero-visual">${lineChart(history.map((item) => item.nav_index), history.map((item) => item.benchmark_index), `Performance of ${state.selectedFund} and its benchmark`, state.selectedFund, "CDI benchmark")}</div>
      </section>
      <div class="grid grid-kpis" style="margin-top:1rem">
        ${statCard({ label: "Latest available AUM", value: formatMoney(total), status: "current", statusLabel: "Calculated", trend: `${data.overview.funds_with_nav} funds with valid NAV`, meta: "K01", delay: 40 })}
        ${statCard({ label: "Fund coverage", value: `${data.overview.funds_with_nav} / ${data.overview.fund_count}`, status: data.overview.funds_with_nav === data.overview.fund_count ? "current" : "incomplete", statusLabel: data.overview.funds_with_nav === data.overview.fund_count ? "Complete" : "Partial", trend: "Validated latest snapshots", meta: "DQ", delay: 80 })}
        ${statCard({ label: "Open quality issues", value: String(data.overview.open_issues), status: data.overview.open_issues ? "warning" : "current", statusLabel: data.overview.open_issues ? "Traceable" : "Clear", trend: `${data.runs[0]?.quarantined_records ?? 0} quarantined rows`, meta: "DQ", delay: 120 })}
        ${statCard({ label: `${state.period.toUpperCase()} performance`, value: formatPercent(performance.metrics.period_return), status: performance.status, statusLabel: statusLabel(performance.status), trend: `${pctCdi(performance.metrics.pct_cdi)} of CDI`, meta: "H02", delay: 160 })}
      </div>
      <div class="grid grid-main">
        ${tableShell("Priority funds", "Validated latest snapshot and historical coverage", [{label:"Fund"},{label:"Coverage"},{label:"Net assets",numeric:true},{label:"Daily return",numeric:true}], fundRows, `<button class="button ghost small" type="button" data-nav="funds">View all ${data.funds.length} funds</button>`)}
        ${card("Alerts requiring action", "Rejected values stay opaque and traceable.", `<div class="alert-list">${alerts}</div>`, '<button class="button ghost small" type="button" data-nav="quality">Open all</button>')}
      </div>
      ${sourceFor(state)}
    </section>`;
  });
}

function funds(state) {
  return pageOrState(state, () => {
    const query = state.query.trim().toLowerCase();
    const visibleFunds = state.data.funds.filter((fund) => fund.id.toLowerCase().includes(query));
    if (!visibleFunds.length) return `<section class="page">${pageHeading("Executive", "Funds", "Governed fund aliases.")}${statePanel("no-match")}</section>`;
    const rows = visibleFunds.map((fund) => `<tr>
      <td><span class="row-title"><button type="button" class="table-button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button><small>${fund.lineage_ref || "No curated NAV"}</small></span></td>
      <td>${badge(fund.coverage === "history-only" ? "History only" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td><td>${fund.business_date || "Unavailable"}</td>
      <td class="numeric"><span class="trend ${fund.daily_return !== null && fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
      <td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td>
      <td><button type="button" class="button secondary small" data-action="select-fund" data-fund="${fund.id}">Open</button></td>
    </tr>`).join("");
    return `<section class="page" data-page="funds">${pageHeading("Executive journey", "Funds", `${state.data.funds.length} governed fund aliases with validated historical coverage.`, '<button class="button primary" type="button" data-nav="comparison">Compare</button>')}
      ${tableShell("Fund universe", `${visibleFunds.length} result(s) · aliases only`, [{label:"Fund"},{label:"Coverage"},{label:"Net assets",numeric:true},{label:"As of"},{label:"Daily return",numeric:true},{label:"Quality"},{label:"Action"}], rows, '<label><span class="sr-only">Search for a fund</span><input type="search" id="fund-search" placeholder="Search FUND_01" value="'+escapeHtml(state.query)+'"></label>')}
      ${sourceFor(state)}
    </section>`;
  });
}

function fundDetail(state) {
  return pageOrState(state, () => {
    const fund = selectedFund(state);
    const portfolio = state.data.portfolio;
    if (!portfolio.available) {
      return `<section class="page" data-page="fund-detail">${pageHeading("Funds / Allocation", fund.id, "No validated holdings snapshot is available for this fund.", '<button class="button secondary" type="button" data-nav="funds">Back to funds</button>')}${card("Portfolio unavailable", "The NAV or holdings were missing or quarantined before curated storage.", `<p>Historical performance remains available. No portfolio value has been invented.</p>`, '<button class="button primary" type="button" data-nav="performance">View performance</button>')}${sourceFor(state, fund.freshness_status, fund.quality_status)}</section>`;
    }
    const positions = portfolio.positions.filter((item) => !state.allocationFilter || item.asset_class === state.allocationFilter);
    const rows = positions.map((position) => `<tr><td><span class="row-title"><strong>${position.instrument}</strong><small>${position.lineage_ref}</small></span></td><td>${position.asset_class}</td><td>${position.issuer}</td><td class="numeric">${formatMoney(position.value_brl, false)}</td><td class="numeric">${formatPercent(position.weight, 1)}</td><td>${badge("Validated", "current")}</td></tr>`).join("");
    const bars = portfolio.allocation.map((item) => Math.abs(item.weight) * 100);
    return `<section class="page" data-page="fund-detail">${pageHeading("Funds / Allocation", `${fund.id} · ${portfolio.snapshot_date}`, "Fund-specific allocation and masked holdings from the selected validated snapshot.", '<button class="button secondary" type="button" data-nav="funds">Back to funds</button><button class="button primary" type="button" data-nav="performance">View performance</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Net assets", value: formatMoney(portfolio.nav_brl), status: "current", statusLabel: "Validated", trend: formatPercent(fund.daily_return), meta: "K01", testId: "fund-aum" })}
        ${statCard({ label: "Snapshot", value: portfolio.snapshot_date, status: "current", statusLabel: "Exact", trend: `${portfolio.positions.length} holdings`, meta: "NAV", delay: 40 })}
        ${statCard({ label: "Top 5 concentration", value: formatPercent(portfolio.metrics.top5_concentration), status: "current", statusLabel: "Calculated", trend: "Positive holdings / NAV", meta: "K07", delay: 80 })}
        ${statCard({ label: "Reconciliation", value: formatPercent(portfolio.metrics.reconciliation_ratio), status: "current", statusLabel: "Reconciled", trend: "Holdings / NAV", meta: "DQ13", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Allocation", "Select an asset class to filter this fund's holdings.", allocationView(portfolio.allocation, state.allocationFilter), "", "allocation-card")}
        ${card("Reconciliation", "Grouped NAV values for the exact selected snapshot.", `${miniBars(bars, "Relative allocation by governed asset group")}<div class="stat-meta" style="margin-top:1rem"><span>Sum of holdings / NAV</span>${badge(formatPercent(portfolio.metrics.reconciliation_ratio), "current")}</div>`)}
      </div>
      <div style="margin-top:1rem">${tableShell("Holdings", state.allocationFilter ? `Filter: ${state.allocationFilter} · ${positions.length} rows` : `${positions.length} masked holdings`, [{label:"Instrument"},{label:"Asset class"},{label:"Issuer"},{label:"Value",numeric:true},{label:"Weight",numeric:true},{label:"Quality"}], rows, '<button class="button ghost small" type="button" data-action="clear-allocation">Reset</button>')}</div>
      ${sourceFor(state, fund.freshness_status, "Reconciled")}
    </section>`;
  });
}

function performance(state) {
  return pageOrState(state, () => {
    const fund = selectedFund(state);
    const performanceData = state.data.performance;
    const metrics = performanceData.metrics;
    const history = performanceData.history;
    const window = performanceData.window ? `${performanceData.window.start} to ${performanceData.window.end}` : "Unavailable";
    return `<section class="page" data-page="performance">${pageHeading("Performance & risk", `${fund.id} over ${state.period}`, `Validated base-100 series and documented calculations over ${window}.`, '<button class="button secondary" type="button" data-nav="fund-detail">Allocation</button><button class="button primary" type="button" data-nav="comparison">Compare</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Period return", value: formatPercent(metrics.period_return), status: performanceData.status, statusLabel: statusLabel(performanceData.status), trend: `${pctCdi(metrics.pct_cdi)} of CDI`, meta: "H02" })}
        ${statCard({ label: "Volatility", value: formatPercent(metrics.volatility), status: metrics.volatility === null ? "unavailable" : "current", statusLabel: metrics.volatility === null ? "Unavailable" : "Calculated", trend: `${metrics.daily_observations} daily returns · 252 days`, meta: "H03", delay: 40 })}
        ${statCard({ label: "Maximum drawdown", value: formatPercent(metrics.maximum_drawdown), status: metrics.maximum_drawdown === null ? "unavailable" : "current", statusLabel: metrics.maximum_drawdown === null ? "Unavailable" : "Observed", trend: "Minimum supplied drawdown", meta: "H05", delay: 80 })}
        ${statCard({ label: "Sharpe ratio", value: ratio(metrics.sharpe), status: metrics.sharpe === null ? "unavailable" : "current", statusLabel: metrics.sharpe === null ? "Unavailable" : "Calculated", trend: "CDI as risk-free proxy", meta: "H04", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Performance index", `Base 100 · ${history.length} aligned observations`, lineChart(history.map((item) => item.nav_index), history.map((item) => item.benchmark_index), `Performance of ${fund.id}`, fund.id, "CDI benchmark"), badge("Calculated", "current"))}
        ${card("Calculation evidence", "The backend applies one documented convention.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">CDI</span><div><strong>${pctCdi(metrics.pct_cdi)} of CDI</strong><p>Fund and benchmark use exactly the same dates.</p></div>${badge("Aligned", "current")}</div><div class="alert-item"><span class="alert-symbol">SR</span><div><strong>Sortino ${ratio(metrics.sortino)}</strong><p>Downside deviation uses negative daily excess returns.</p></div>${badge(metrics.sortino === null ? "Unavailable" : "Calculated", metrics.sortino === null ? "unavailable" : "current")}</div><div class="alert-item"><span class="alert-symbol">NAV</span><div><strong>Daily index</strong><p>Values are displayed as an index, never as a percentage return.</p></div>${badge("Controlled", "current")}</div></div>`)}
      </div>${sourceFor(state)}
    </section>`;
  });
}

function comparison(state) {
  return pageOrState(state, () => {
    const comparisonData = state.data.internal_comparison;
    const funds = comparisonData.funds;
    const maxAum = Math.max(...funds.map((fund) => fund.aum_brl || 0), 1);
    const rows = funds.map((fund) => `<tr><td><button class="table-button" type="button" data-action="select-fund" data-fund="${fund.fund_id}">${fund.fund_id}</button></td><td class="numeric">${formatMoney(fund.aum_brl)}</td><td><div class="quality-bar" aria-label="Relative size ${Math.round((fund.aum_brl || 0) / maxAum * 100)} percent"><span style="width:${(fund.aum_brl || 0) / maxAum * 100}%"></span></div></td><td class="numeric">${formatPercent(fund.period_return)}</td><td class="numeric">${pctCdi(fund.pct_cdi)}</td><td class="numeric">${formatPercent(fund.volatility)}</td><td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td></tr>`).join("");
    const window = comparisonData.window ? `${comparisonData.window.start} to ${comparisonData.window.end}` : "Unavailable";
    return `<section class="page" data-page="comparison">${pageHeading("Internal comparison", `${funds.length} funds on a comparable basis.`, `Every fund uses the shared ${state.period} window: ${window}.`, '<button class="button primary" type="button" data-nav="peers">Peer status</button>')}${tableShell("Internal comparison", "Calculated from aligned fund and CDI series", [{label:"Fund"},{label:"AUM",numeric:true},{label:"Relative size"},{label:"Period return",numeric:true},{label:"% CDI",numeric:true},{label:"Volatility",numeric:true},{label:"Quality"}], rows)}${sourceFor(state)}</section>`;
  });
}

function peers(state) {
  return pageOrState(state, () => `<section class="page" data-page="peers">${pageHeading("Peer comparison", "Peer data is not yet certified.", "No external peer number is displayed until its source, classification, and business validation are approved.", '<button class="button secondary" type="button" data-nav="comparison">Internal comparison</button>')}
    <div class="grid grid-main">${card("Peer universe unavailable", "Pending source certification.", `<div class="state-panel"><div class="state-panel-inner"><div class="state-icon">N/A</div><h2>No governed peer dataset</h2><p>The application intentionally leaves this view empty rather than inventing comparison values.</p></div></div>`)}${card("Activation conditions", "All remain pending validation.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">01</span><div><strong>Versioned source</strong><p>Named owner and reference date.</p></div>${badge("Pending", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">02</span><div><strong>Classification</strong><p>Approved privacy and distribution scope.</p></div>${badge("Pending", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">03</span><div><strong>Business certification</strong><p>Comparable peer methodology.</p></div>${badge("Pending", "hypothesis")}</div></div>`)}</div>
    ${sourceFor(state, "Unavailable", "Pending certification")}</section>`);
}

function quality(state) {
  return pageOrState(state, () => {
    const anomalies = state.data.anomalies;
    const latestRun = state.data.runs[0];
    const open = anomalies.filter((item) => item.status === "open").length;
    const blocked = anomalies.filter((item) => item.severity === "blocking").length;
    const rows = anomalies.map((item) => `<tr><td><button class="table-button" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">${item.rule_id}</button></td><td>${escapeHtml(item.title)}</td><td>${badge(item.severity, item.severity)}</td><td>${badge(item.action, item.action === "quarantine" ? "warning" : "info")}</td><td><code>${item.record_ref}</code></td><td><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">Details</button></td></tr>`).join("");
    return `<section class="page" data-page="quality">${pageHeading("Analyst journey", "Data quality", "Persisted schema, completeness, uniqueness, integrity, sanity, portfolio, and privacy controls.", '<button class="button primary" type="button" data-nav="import">View pipeline</button>')}
      <div class="grid grid-kpis">${statCard({label:"Open issues",value:String(open),status:open ? "warning" : "current",statusLabel:open ? "Traceable" : "Clear",meta:"DQ"})}${statCard({label:"Blocking rows",value:String(blocked),status:blocked ? "blocking" : "current",statusLabel:blocked ? "Quarantined" : "Zero",meta:"DQ"})}${statCard({label:"Curated records",value:String(latestRun?.accepted_records ?? 0),status:"current",statusLabel:"Loaded",meta:"Run"})}${statCard({label:"API privacy",value:"Masked",status:"current",statusLabel:"Controlled",trend:"Private fields excluded",meta:"Privacy"})}</div>
      <div style="margin-top:1rem">${tableShell("Quality issue log", `${anomalies.length} persisted issues`, [{label:"Rule"},{label:"Issue"},{label:"Severity"},{label:"Action"},{label:"Opaque reference"},{label:"Details"}], rows)}</div>${sourceFor(state, "Current", "Quarantine applied")}</section>`;
  });
}

function importValidation(state) {
  return pageOrState(state, () => {
    const run = state.data.runs[0];
    const stage = `<div><span class="eyebrow">Successful governed ingestion</span><h2>${run.run_id}</h2><p>Immutable CSVs were fingerprinted, parsed, validated, normalized, quarantined where required, and loaded transactionally into MySQL.</p>${miniBars([run.source_file_count, run.accepted_records, run.quarantined_records, run.warning_records], "Source files, curated records, quarantined rows, and warnings")}<div class="detail-grid" style="margin-top:1rem"><div class="detail-item"><small>Source files</small><strong>${run.source_file_count}</strong></div><div class="detail-item"><small>Curated records</small><strong>${run.accepted_records}</strong></div><div class="detail-item"><small>Quarantined rows</small><strong>${run.quarantined_records}</strong></div><div class="detail-item"><small>Manifest</small><code>${run.manifest_ref}</code></div></div><p style="margin-top:1rem">Rebuild command: <code>scripts/setup_database.ps1</code>. Import actions are intentionally not exposed through this unauthenticated dashboard.</p><button class="button secondary" type="button" data-nav="runs">Open run evidence</button></div>`;
    return `<section class="page" data-page="import">${pageHeading("Analyst journey", "Import and validation", "Read-only evidence of the executed Raw → Bronze → Silver → Gold → Serving pipeline.")}<div class="workflow"><aside class="card card-pad">${workflowSteps(7)}</aside><section class="card card-pad workflow-stage" aria-live="polite">${stage}</section></div>${sourceFor(state, "Current", run.status)}</section>`;
  });
}

function runs(state) {
  return pageOrState(state, () => {
    const runRows = state.data.runs.map((run) => `<tr><td><code>${run.run_id}</code></td><td>${badge(run.status, run.status.includes("quarantine") ? "warning" : "current")}</td><td>${run.generated_at.replace("T", " ").replace("Z", " UTC")}</td><td class="numeric">${run.accepted_records}</td><td class="numeric">${run.quarantined_records}</td><td><code>${run.manifest_ref}</code></td></tr>`).join("");
    const proofs = state.data.lineage_proofs.map((proof) => `<tr><td>${proof.screen_value_id}</td><td>${proof.source_id}</td><td><code>${proof.lineage_ref}</code></td><td class="numeric">${proof.record_count}</td><td><code>${proof.source_record_id}</code></td></tr>`).join("");
    const run = state.data.runs[0];
    return `<section class="page" data-page="runs">${pageHeading("Run history & lineage", "Every curated value retains its trace.", "Manifest hashes, statuses, quarantines, and source-to-table evidence are persisted without exposing source values.", '<button class="button secondary" type="button" data-nav="import">Pipeline details</button>')}
      ${tableShell("Run log", "Deterministic ingestion evidence", [{label:"Run"},{label:"Status"},{label:"Generated"},{label:"Curated",numeric:true},{label:"Quarantined",numeric:true},{label:"Manifest"}], runRows)}
      <div style="margin-top:1rem">${tableShell("Lineage evidence", `${state.data.lineage_proofs.length} source-to-table groups`, [{label:"Target table"},{label:"Source file"},{label:"Evidence"},{label:"Records",numeric:true},{label:"Source hash"}], proofs)}</div>
      <div style="margin-top:1rem">${card("Evidence chain", "Example for the current dashboard data.", `<div class="lineage-chain"><div class="lineage-node"><strong>Manifest</strong><code>${run.manifest_ref}</code></div><div class="lineage-node"><strong>Run</strong><code>${run.run_id}</code></div><div class="lineage-node"><strong>Curated</strong><code>${run.accepted_records} rows</code></div><div class="lineage-node"><strong>Serving</strong><code>PHP API</code></div></div>`)}</div>${sourceFor(state, "Current", run.status)}</section>`;
  });
}

const renderers = { overview, funds, "fund-detail": fundDetail, performance, comparison, peers, quality, import: importValidation, runs };

export function renderPage(state) {
  return (renderers[state.view] || overview)(state);
}
