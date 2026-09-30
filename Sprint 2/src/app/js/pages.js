import { lineChart, miniBars } from "./charts.js";
import { riskPage } from "./risk.js";
import { reconciliationPage } from "./reconciliation.js";
import { ticketsPage } from "./tickets.js";
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

function comparisonOptions(funds, selected, disabledFund) {
  return funds.map((fund) => `<option value="${escapeHtml(fund.id)}" ${fund.id === selected ? "selected" : ""} ${fund.id === disabledFund ? "disabled" : ""}>${escapeHtml(fund.id)}</option>`).join("");
}

function sourceFor(state, freshness = "Current", quality = "Validated") {
  return sourceFootnote("Governed MySQL", freshness, quality, state.data.meta.run_id);
}

function overview(state) {
  return pageOrState(state, () => {
    const data = state.data;
    const isAnalyst = state.role === "analyst";
    const total = data.overview.total_aum_brl;
    const performance = data.performance;
    const history = performance.history;
    const fundRows = data.funds.filter((fund) => fund.aum_brl !== null).slice(0, 5).map((fund) => `<tr>
      <td><button type="button" class="table-button" data-action="select-fund" data-fund="${escapeHtml(fund.id)}">${escapeHtml(fund.id)}</button></td>
      <td>${badge(fund.coverage === "history-only" ? "History" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return !== null && fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
    </tr>`).join("");
    const alerts = isAnalyst
      ? data.anomalies.slice(0, 4).map((item) => `<div class="alert-item"><span class="alert-symbol">${escapeHtml(item.rule_id)}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.record_ref)} · no source value exposed</p></div>${badge(item.severity === "blocking" ? "Quarantined" : "Review required", item.severity)}</div>`).join("")
      : `<p>${data.overview.open_issues} open quality issues are tracked in the Analyst governance workspace.</p>`;
    const governanceAction = isAnalyst ? '<button class="button secondary" type="button" data-nav="quality">View controls</button>' : "";
    const alertsAction = isAnalyst ? '<button class="button ghost small" type="button" data-nav="quality">Open all</button>' : "";
    return `<section class="page" data-page="overview">
      ${pageHeading("Executive journey", "A clear view before every decision.", "Portfolio overview, quality, freshness, and calculated performance from governed local data.", `${governanceAction}<button class="button primary" type="button" data-nav="funds">Explore funds</button>`)}
      <section class="card hero-card">
        <div class="hero-copy"><span class="eyebrow">Local restricted portfolio · ${data.overview.funds_with_nav}/${data.overview.fund_count} funds with valid NAV</span><h2>Latest available net assets</h2><div class="hero-total"><span>K01 · curated database</span><strong data-testid="executive-aum">${formatMoney(total)}</strong></div><p>Each fund uses its latest validated NAV. Missing or quarantined values remain explicitly unavailable.</p><div class="hero-actions">${badge("Governed data", "current")} ${badge(`${data.overview.open_issues} quality issues`, data.overview.open_issues ? "warning" : "current")}</div></div>
        <div class="hero-visual">${lineChart(history.map((item) => item.nav_index), history.map((item) => item.benchmark_index), `Performance of ${state.selectedFund} and its benchmark`, state.selectedFund, "CDI benchmark", history.map((item) => item.date))}</div>
      </section>
      <div class="grid grid-kpis" style="margin-top:1rem">
        ${statCard({ label: "Latest available AUM", value: formatMoney(total), status: "current", statusLabel: "Calculated", trend: `${data.overview.funds_with_nav} funds with valid NAV`, meta: "K01", delay: 40 })}
        ${statCard({ label: "Fund coverage", value: `${data.overview.funds_with_nav} / ${data.overview.fund_count}`, status: data.overview.funds_with_nav === data.overview.fund_count ? "current" : "incomplete", statusLabel: data.overview.funds_with_nav === data.overview.fund_count ? "Complete" : "Partial", trend: "Validated latest snapshots", meta: "DQ", delay: 80 })}
        ${statCard({ label: "Open quality issues", value: String(data.overview.open_issues), status: data.overview.open_issues ? "warning" : "current", statusLabel: data.overview.open_issues ? "Traceable" : "Clear", trend: `${data.overview.quarantined_records} quarantined rows`, meta: "DQ", delay: 120 })}
        ${statCard({ label: `${state.period.toUpperCase()} performance`, value: formatPercent(performance.metrics.period_return), status: performance.status, statusLabel: statusLabel(performance.status), trend: `% of CDI: ${pctCdi(performance.metrics.pct_cdi)}`, meta: "H02", delay: 160 })}
      </div>
      <div class="grid grid-main">
        ${tableShell("Priority funds", "Validated latest snapshot and historical coverage", [{label:"Fund"},{label:"Coverage"},{label:"Net assets",numeric:true},{label:"Daily return",numeric:true}], fundRows, `<button class="button ghost small" type="button" data-nav="funds">View all ${data.funds.length} funds</button>`)}
        ${card("Quality status", "Rejected values stay opaque and traceable.", `<div class="alert-list">${alerts}</div>`, alertsAction)}
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
      <td><span class="row-title"><button type="button" class="table-button" data-action="select-fund" data-fund="${escapeHtml(fund.id)}">${escapeHtml(fund.id)}</button><small>${escapeHtml(fund.lineage_ref || "No curated NAV")}</small></span></td>
      <td>${badge(fund.coverage === "history-only" ? "History only" : "Snapshot + history", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td><td>${escapeHtml(fund.business_date || "Unavailable")}</td>
      <td class="numeric"><span class="trend ${fund.daily_return !== null && fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
      <td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td>
      <td><button type="button" class="button secondary small" data-action="select-fund" data-fund="${escapeHtml(fund.id)}">Open</button></td>
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
    const rows = positions.map((position) => `<tr><td><span class="row-title"><strong>${escapeHtml(position.instrument)}</strong><small>${escapeHtml(position.lineage_ref)}</small></span></td><td>${escapeHtml(position.asset_class)}</td><td>${escapeHtml(position.issuer)}</td><td class="numeric">${formatMoney(position.value_brl, false)}</td><td class="numeric">${formatPercent(position.weight, 1)}</td><td>${badge("Validated", "current")}</td></tr>`).join("");
    const bars = portfolio.allocation.map((item) => Math.abs(item.weight) * 100);
    return `<section class="page" data-page="fund-detail">${pageHeading("Funds / Allocation", `${fund.id} · ${portfolio.snapshot_date}`, "Fund-specific allocation and masked holdings from the selected validated snapshot.", '<button class="button secondary" type="button" data-nav="funds">Back to funds</button><button class="button primary" type="button" data-nav="performance">View performance</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Net assets", value: formatMoney(portfolio.nav_brl), status: "current", statusLabel: "Validated", trend: "Exact selected snapshot", meta: "K01", testId: "fund-aum" })}
        ${statCard({ label: "Net return", value: formatPercent(portfolio.net_return.value), status: portfolio.net_return.status === "calculated" ? "current":"unavailable", statusLabel: portfolio.net_return.status === "calculated" ? "Calculated":"Unavailable", trend: portfolio.net_return.start_date ? `${portfolio.net_return.start_date} → ${portfolio.net_return.end_date}` : "No prior return observation", meta: "H01", testId: "allocation-net-return" })}
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
    const window = performanceData.window;
    const windowText = window ? `${window.start} to ${window.end}` : "Unavailable";
    const coverage = window?.coverage_status === "partial"
      ? `Partial ${state.period.toUpperCase()} coverage. Common history: ${windowText}; requested from ${window.requested_start}.`
      : `Validated common history: ${windowText}.`;
    return `<section class="page" data-page="performance">${pageHeading("Performance & risk", `${fund.id} · ${state.period.toUpperCase()} requested`, `Source fund and CDI indexes, not rebased to the selected period. ${coverage}`, '<button class="button secondary" type="button" data-nav="fund-detail">Allocation</button><button class="button primary" type="button" data-nav="comparison">Compare</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Period return", value: formatPercent(metrics.period_return), status: performanceData.status, statusLabel: statusLabel(performanceData.status), trend: "Fund return over common window", meta: "H02" })}
        ${statCard({ label: "% of CDI", value: pctCdi(metrics.pct_cdi), status: metrics.pct_cdi === null ? "unavailable" : "current", statusLabel: metrics.pct_cdi === null ? "Unavailable" : "Calculated", trend: "Fund return / CDI return × 100", meta: "H02", delay: 40 })}
        ${statCard({ label: "Volatility", value: formatPercent(metrics.volatility), status: metrics.volatility === null ? "unavailable" : "current", statusLabel: metrics.volatility === null ? "Unavailable" : "Calculated", trend: `${metrics.daily_observations} daily returns · minimum ${metrics.minimum_risk_observations}`, meta: "H03", delay: 80 })}
        ${statCard({ label: "Maximum drawdown", value: formatPercent(metrics.maximum_drawdown), status: metrics.maximum_drawdown === null ? "unavailable" : "current", statusLabel: metrics.maximum_drawdown === null ? "Unavailable" : "Observed", trend: "Minimum supplied drawdown", meta: "H05", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Performance index", `Source index levels · ${history.length} aligned observations`, lineChart(history.map((item) => item.nav_index), history.map((item) => item.benchmark_index), `Performance of ${fund.id}`, fund.id, "CDI benchmark", history.map((item) => item.date)), badge(window?.coverage_status === "partial" ? "Partial period" : "Calculated", window?.coverage_status === "partial" ? "incomplete" : "current"))}
        ${card("Calculation evidence", "The backend applies one documented convention.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">CDI</span><div><strong>${pctCdi(metrics.pct_cdi)} of CDI</strong><p>Fund and benchmark use exactly the same dates.</p></div>${badge("Aligned", "current")}</div><div class="alert-item"><span class="alert-symbol">SR</span><div><strong>Sharpe ${ratio(metrics.sharpe)} · Sortino ${ratio(metrics.sortino)}</strong><p>CDI is the proxy; downside deviation uses negative excess returns.</p></div>${badge(metrics.sharpe === null && metrics.sortino === null ? "Unavailable" : "Calculated", metrics.sharpe === null && metrics.sortino === null ? "unavailable" : "current")}</div><div class="alert-item"><span class="alert-symbol">NAV</span><div><strong>Daily index</strong><p>Values are displayed as an index, never as a percentage return.</p></div>${badge("Controlled", "current")}</div></div>`)}
      </div>${sourceFor(state)}
    </section>`;
  });
}

function comparison(state) {
  return pageOrState(state, () => {
    const comparisonData = state.data.internal_comparison;
    const funds = comparisonData.funds;
    const targeted = comparisonData.targeted;
    const targetedFunds = targeted?.funds || [];
    const fundA = targetedFunds.find((fund) => fund.fund_id === state.comparisonFundA) || targetedFunds[0];
    const fundB = targetedFunds.find((fund) => fund.fund_id === state.comparisonFundB) || targetedFunds[1];
    const maxAum = Math.max(...funds.map((fund) => fund.aum_brl || 0), 1);
    const rows = funds.map((fund) => `<tr><td class="sticky-cell"><button class="table-button" type="button" data-action="select-fund" data-fund="${escapeHtml(fund.fund_id)}">${escapeHtml(fund.fund_id)}</button></td><td class="numeric">${formatMoney(fund.aum_brl)}</td><td><div class="quality-bar" aria-label="Relative size ${Math.round((fund.aum_brl || 0) / maxAum * 100)} percent"><span style="width:${(fund.aum_brl || 0) / maxAum * 100}%"></span></div></td><td class="numeric">${formatPercent(fund.period_return)}</td><td class="numeric">${pctCdi(fund.pct_cdi)}</td><td class="numeric">${formatPercent(fund.volatility)}</td><td class="numeric">${ratio(fund.sharpe)}</td><td class="numeric">${ratio(fund.sortino)}</td><td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td></tr>`).join("");
    const window = comparisonData.window ? `${comparisonData.window.start} to ${comparisonData.window.end}` : "Unavailable";
    const targetedWindow = targeted?.window ? `${targeted.window.start} to ${targeted.window.end}` : "No common comparison window";
    const targetedMetrics = fundA && fundB ? [
      ["Period return", formatPercent(fundA.period_return), formatPercent(fundB.period_return)],
      ["% of CDI", pctCdi(fundA.pct_cdi), pctCdi(fundB.pct_cdi)],
      ["NAV (latest AUM)", formatMoney(fundA.aum_brl), formatMoney(fundB.aum_brl)],
      ["Volatility", formatPercent(fundA.volatility), formatPercent(fundB.volatility)],
      ["Sharpe", ratio(fundA.sharpe), ratio(fundB.sharpe)],
      ["Sortino", ratio(fundA.sortino), ratio(fundB.sortino)],
      ["Max drawdown", formatPercent(fundA.maximum_drawdown), formatPercent(fundB.maximum_drawdown)],
    ].map(([label, valueA, valueB]) => `<tr><th scope="row">${label}</th><td class="numeric">${valueA}</td><td class="numeric">${valueB}</td></tr>`).join("") : "";
    const controls = `<div class="comparison-controls">
      <label><span>Fund A</span><select id="comparison-fund-a" aria-label="Select Fund A">${comparisonOptions(state.data.funds, state.comparisonFundA, state.comparisonFundB)}</select></label>
      <span class="comparison-versus" aria-hidden="true">VS</span>
      <label><span>Fund B</span><select id="comparison-fund-b" aria-label="Select Fund B">${comparisonOptions(state.data.funds, state.comparisonFundB, state.comparisonFundA)}</select></label>
    </div>`;
    const targetedContent = targeted?.status === "current" && fundA && fundB
      ? `<div class="comparison-result-grid"><div>${lineChart(targeted.history.map((item) => item.fund_a_index), targeted.history.map((item) => item.fund_b_index), `${fundA.fund_id} compared with ${fundB.fund_id}`, fundA.fund_id, fundB.fund_id, targeted.history.map((item) => item.date))}</div><div class="table-scroll comparison-metrics"><table data-testid="targeted-comparison-table"><thead><tr><th scope="col">Metric</th><th scope="col" class="numeric">${escapeHtml(fundA.fund_id)}</th><th scope="col" class="numeric">${escapeHtml(fundB.fund_id)}</th></tr></thead><tbody>${targetedMetrics}</tbody></table></div></div>`
      : '<div class="state-panel compact-state"><div class="state-panel-inner"><div class="state-icon">N/A</div><h2>No common comparison window</h2><p>The selected funds do not have enough aligned observations for a reliable comparison.</p></div></div>';
    return `<section class="page" data-page="comparison">${pageHeading("Internal comparison", "Compare two funds on exactly the same dates.", `Targeted comparison plus the existing ${funds.length}-fund ranking for ${state.period.toUpperCase()}.`, '<button class="button primary" type="button" data-nav="peers">Peer status</button>')}
      ${card("Targeted comparison", `${targetedWindow} · both performance series rebased to 100`, `${controls}${targetedContent}`, badge(targeted?.status === "current" ? "Common window" : "Unavailable", targeted?.status === "current" ? "current" : "unavailable"), "targeted-comparison")}
      <div class="portfolio-comparison wide-table" data-testid="portfolio-comparison-table">${tableShell("Portfolio-wide comparison", `All funds aligned on the shared window: ${window}`, [{label:"Fund"},{label:"AUM",numeric:true},{label:"Relative size"},{label:"Period return",numeric:true},{label:"% of CDI",numeric:true},{label:"Volatility",numeric:true},{label:"Sharpe",numeric:true},{label:"Sortino",numeric:true},{label:"Quality"}], rows)}</div>
      ${sourceFor(state)}</section>`;
  });
}

function peers(state) {
  return pageOrState(state, () => `<section class="page" data-page="peers">${pageHeading("Peer comparison", "Peer data is not yet certified.", "No external peer number is displayed until its source, classification, and business validation are approved.", '<button class="button secondary" type="button" data-nav="comparison">Internal comparison</button>')}
    <div class="grid grid-main">${card("Peer universe unavailable", "Pending source certification.", `<div class="state-panel"><div class="state-panel-inner"><div class="state-icon">N/A</div><h2>No governed peer dataset</h2><p>The application intentionally leaves this view empty rather than inventing comparison values.</p></div></div>`)}${card("Activation conditions", "All remain pending validation.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">01</span><div><strong>Versioned source</strong><p>Named owner and reference date.</p></div>${badge("Pending", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">02</span><div><strong>Classification</strong><p>Approved privacy and distribution scope.</p></div>${badge("Pending", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">03</span><div><strong>Business certification</strong><p>Comparable peer methodology.</p></div>${badge("Pending", "hypothesis")}</div></div>`)}</div>
    ${sourceFor(state, "Unavailable", "Pending certification")}</section>`);
}

function quality(state) {
  return pageOrState(state, () => {
    const anomalies = state.qualityData?.anomalies || [];
    const filters = state.qualityFilters || {};
    const filterSelect = (key,label,values) => `<label>${label}<select data-quality-filter="${key}"><option value="">All</option>${values.map((value)=>`<option value="${escapeHtml(value)}" ${filters[key]===value ? 'selected':''}>${escapeHtml(value)}</option>`).join('')}</select></label>`;
    const filterBar = `<div class="risk-tabs"><label>Search issues<input type="search" data-quality-filter="search" value="${escapeHtml(filters.search || '')}" maxlength="100"></label>${filterSelect('severity','Severity',['info','warning','blocking'])}${filterSelect('status','Status',['open','resolved','quarantined'])}${filterSelect('rule_id','Rule',[...new Set(state.data.anomalies.map((item)=>item.rule_id))].sort())}${filterSelect('run_id','Run',state.data.runs.map((run)=>run.run_id))}${filterSelect('fund_id','Fund (linked reconciliation issues)',state.data.funds.map((fund)=>fund.id))}</div>`;
    if (state.qualityStatus !== 'ready') return `<section class="page" data-page="quality">${pageHeading('Analyst journey','Data quality','Filter source controls and review their evidence.')}${filterBar}<p role="status">${state.qualityStatus==='error' ? escapeHtml(state.qualityError):'Loading issues...'}</p></section>`;
    const latestRun = state.data.runs[0];
    const open = anomalies.filter((item) => item.status === "open").length;
    const blocked = anomalies.filter((item) => item.severity === "blocking").length;
    const rows = anomalies.map((item) => `<tr><td><button class="table-button" type="button" data-action="open-anomaly" data-anomaly="${escapeHtml(item.anomaly_id)}" data-review-context="quality">${escapeHtml(item.rule_id)}</button></td><td>${escapeHtml(item.title)}</td><td>${badge(item.severity, item.severity)}</td><td>${badge(item.action, item.action === "quarantine" ? "warning" : "info")}</td><td><code>${escapeHtml(item.record_ref)}</code></td><td><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${escapeHtml(item.anomaly_id)}" data-review-context="quality">Details</button></td></tr>`).join("");
    return `<section class="page" data-page="quality">${pageHeading("Analyst journey", "Data quality", "Persisted schema, completeness, uniqueness, integrity, sanity, portfolio, and privacy controls.", '<button class="button primary" type="button" data-nav="import">View pipeline</button>')}
      <div class="grid grid-kpis">${statCard({label:"Open issues",value:String(open),status:open ? "warning" : "current",statusLabel:open ? "Traceable" : "Clear",meta:"DQ"})}${statCard({label:"Blocking rows",value:String(blocked),status:blocked ? "blocking" : "current",statusLabel:blocked ? "Quarantined" : "Zero",meta:"DQ"})}${statCard({label:"Curated records",value:String(latestRun?.accepted_records ?? 0),status:"current",statusLabel:"Loaded",meta:"Run"})}${statCard({label:"API privacy",value:"Masked",status:"current",statusLabel:"Controlled",trend:"Private fields excluded",meta:"Privacy"})}</div>
      ${filterBar}<p>Issue counts above refer to this filtered page. Fund filtering applies where reconciliation evidence provides a verified link.</p><div style="margin-top:1rem">${tableShell("Quality issue log", `${anomalies.length} issues on this page`, [{label:"Rule"},{label:"Issue"},{label:"Severity"},{label:"Action"},{label:"Opaque reference"},{label:"Details"}], rows)}</div>${anomalies.length ? '' : '<p>No issues match these filters.</p>'}<div class="risk-tabs"><button class="button secondary" data-action="quality-page" data-offset="${Math.max(0,state.qualityData.offset-100)}" ${state.qualityData.offset===0 ? 'disabled':''}>Previous</button><button class="button secondary" data-action="quality-page" data-offset="${state.qualityData.next_offset ?? 0}" ${state.qualityData.next_offset===null ? 'disabled':''}>Next</button></div>${sourceFor(state, "Current", "Quarantine applied")}</section>`;
  });
}

function importValidation(state) {
  return pageOrState(state, () => {
    const run = state.data.runs[0];
    const stageRows = state.data.pipeline_stages.map((item) => `<tr><td>${escapeHtml(item.stage)}</td><td class="numeric">${item.accepted_records}</td><td class="numeric">${item.warning_records}</td><td class="numeric">${item.quarantined_records}</td></tr>`).join("");
    const stage = `<div><span class="eyebrow">Latest successful governed ingestion</span><h2>${escapeHtml(run.run_id)}</h2><p>Immutable CSVs were fingerprinted, parsed, validated, normalized, quarantined where required, and loaded transactionally into MySQL.</p>${miniBars([run.source_file_count, run.accepted_records, run.quarantined_records, run.warning_records], "Source files, curated records, quarantined rows, and warnings")}<div class="detail-grid" style="margin-top:1rem"><div class="detail-item"><small>Source files</small><strong>${run.source_file_count}</strong></div><div class="detail-item"><small>Curated records</small><strong>${run.accepted_records}</strong></div><div class="detail-item"><small>Quarantined rows</small><strong>${run.quarantined_records}</strong></div><div class="detail-item"><small>Manifest</small><code>${escapeHtml(run.manifest_ref)}</code></div></div>${tableShell("Persisted pipeline stages","Counts stored for this run",[{label:"Stage"},{label:"Accepted",numeric:true},{label:"Warnings",numeric:true},{label:"Quarantined",numeric:true}],stageRows)}<p style="margin-top:1rem">Rebuild command: <code>scripts/setup_database.ps1</code>. Import actions are intentionally not exposed through the dashboard.</p><button class="button secondary" type="button" data-nav="runs">Open run evidence</button></div>`;
    return `<section class="page" data-page="import">${pageHeading("Analyst journey", "Import and validation", "Read-only evidence of the executed Raw → Bronze → Silver → Gold → Serving pipeline.")}<div class="workflow"><aside class="card card-pad">${workflowSteps(7)}</aside><section class="card card-pad workflow-stage" aria-live="polite">${stage}</section></div>${sourceFor(state, "Current", run.status)}</section>`;
  });
}

function runs(state) {
  return pageOrState(state, () => {
    const runRows = state.data.runs.map((run) => `<tr><td><code>${escapeHtml(run.run_id)}</code></td><td>${badge(run.status, run.status.includes("quarantine") ? "warning" : "current")}</td><td>${escapeHtml(run.generated_at.replace("T", " ").replace("Z", " UTC"))}</td><td class="numeric">${run.accepted_records}</td><td class="numeric">${run.quarantined_records}</td><td><code>${escapeHtml(run.manifest_ref)}</code></td></tr>`).join("");
    const proofs = state.data.lineage_proofs.map((proof) => `<tr><td>${escapeHtml(proof.screen_value_id)}</td><td>${escapeHtml(proof.dashboard_domain)}</td><td>${escapeHtml(proof.source_id)}</td><td><code>${escapeHtml(proof.lineage_ref)}</code></td><td class="numeric">${proof.record_count}</td><td><code>${escapeHtml(proof.source_record_id)}</code></td></tr>`).join("");
    const run = state.data.runs[0];
    const latestSource = state.data.source_files.reduce((latest,item) => !latest || item.modified_at > latest ? item.modified_at : latest, null);
    const proof = state.data.lineage_proofs[0];
    const stages = state.data.pipeline_stages.map((item) => item.stage).join(" → ");
    return `<section class="page" data-page="runs">${pageHeading("Run history & lineage", "Every curated value retains its trace.", "Manifest hashes, statuses, quarantines, and source-to-table evidence are persisted without exposing source values.", '<button class="button secondary" type="button" data-nav="import">Pipeline details</button>')}
      <div class="detail-grid"><div class="detail-item"><small>Latest run status</small><strong>${escapeHtml(run.status)}</strong></div><div class="detail-item"><small>Latest successful run</small><code>${escapeHtml(state.data.latest_successful_run?.run_id ?? "Unavailable")}</code></div><div class="detail-item"><small>Latest source modification</small><strong>${escapeHtml(latestSource ?? "Unavailable")}</strong></div><div class="detail-item"><small>Warnings / quarantined</small><strong>${run.warning_records} / ${run.quarantined_records}</strong></div></div>
      ${tableShell("Run log", "Deterministic ingestion evidence", [{label:"Run"},{label:"Status"},{label:"Generated"},{label:"Curated",numeric:true},{label:"Quarantined",numeric:true},{label:"Manifest"}], runRows)}
      <div style="margin-top:1rem">${tableShell("Lineage evidence", `${state.data.lineage_proofs.length} source-to-table groups`, [{label:"Target table"},{label:"Dashboard domain"},{label:"Source file"},{label:"Evidence"},{label:"Records",numeric:true},{label:"Source hash"}], proofs)}</div>
      <div style="margin-top:1rem">${card("Evidence chain", "A persisted source-to-dashboard path from the current run.", proof ? `<div class="lineage-chain"><div class="lineage-node"><strong>Source file</strong><code>${escapeHtml(proof.source_id)}</code></div><div class="lineage-node"><strong>Run</strong><code>${escapeHtml(run.run_id)}</code></div><div class="lineage-node"><strong>Pipeline stages</strong><code>${escapeHtml(stages)}</code></div><div class="lineage-node"><strong>Target table</strong><code>${escapeHtml(proof.screen_value_id)}</code></div><div class="lineage-node"><strong>Dashboard domain</strong><code>${escapeHtml(proof.dashboard_domain)}</code></div></div>` : "<p>Lineage evidence is unavailable for this run.</p>")}</div>${sourceFor(state, "Current", run.status)}</section>`;
  });
}

const renderers = { overview, funds, "fund-detail": fundDetail, performance, comparison, peers, quality, import: importValidation, runs, risk: riskPage, reconciliation: reconciliationPage, tickets: ticketsPage };

export function renderPage(state) {
  return (renderers[state.view] || overview)(state);
}
