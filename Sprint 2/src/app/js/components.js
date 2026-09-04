import { donutGradient } from "./charts.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function formatMoney(value, compact = true) {
  if (value === null || value === undefined) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: digits, signDisplay: "exceptZero" }).format(value);
}

export function badge(label, status = "info") {
  return `<span class="badge ${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

export function pageHeading(eyebrow, title, description, actions = "") {
  return `<header class="page-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</header>`;
}

export function statCard({ label, value, status = "current", statusLabel = "Current", trend = "", meta = "", delay = 0, testId = "" }) {
  const trendClass = String(trend).startsWith("-") ? "negative" : "positive";
  return `<article class="card stat-card" style="--delay:${delay}ms" ${testId ? `data-testid="${testId}"` : ""}>
    <div class="stat-top"><span class="stat-label">${escapeHtml(label)}</span>${badge(statusLabel, status)}</div>
    <div class="stat-value">${escapeHtml(value)}</div>
    <div class="stat-meta"><span class="trend ${trend ? trendClass : ""}">${escapeHtml(trend || "Governed source")}</span><span>${escapeHtml(meta)}</span></div>
  </article>`;
}

export function card(title, subtitle, content, action = "", classes = "") {
  return `<section class="card card-pad ${classes}"><header class="card-header"><div><h2 class="card-title">${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>${action ? `<div class="card-action">${action}</div>` : ""}</header>${content}</section>`;
}

const stateCopy = {
  loading: ["LOAD", "Loading data", "The run is being read. No intermediate figures are published."],
  empty: ["EMPTY", "No data available", "This source contains no records for the selected filters."],
  error: ["ERR", "The control failed", "The batch remains isolated. Review the run log or run the control again."],
  denied: ["403", "Access denied", "Your demonstration role is not permitted to open this view."],
  "no-match": ["0", "No matches", "Change the fund, period, or search filter."],
};

export function statePanel(scenario) {
  if (scenario === "loading") {
    return `<section class="card card-pad state-panel" aria-label="Loading"><div class="state-panel-inner" style="width:100%;text-align:left"><div class="skeleton title"></div><div class="skeleton line"></div><div class="skeleton line" style="width:72%"></div><div class="skeleton block"></div><span class="sr-only">Loading in progress</span></div></section>`;
  }
  const [icon, title, copy] = stateCopy[scenario] || stateCopy.empty;
  return `<section class="card state-panel"><div class="state-panel-inner"><div class="state-icon" aria-hidden="true">${icon}</div><h2>${title}</h2><p>${copy}</p><button class="button primary" type="button" data-action="reset-scenario">Return to current data</button></div></section>`;
}

export function scenarioBanner(scenario) {
  const messages = {
    current: ["Governed local data", "Values come from the curated MySQL database; private identifiers remain local."],
    late: ["Late data", "One source exceeds the proposed freshness threshold. Values remain visible with a warning."],
    incomplete: ["Incomplete data", "Some prerequisites are missing. Affected KPIs are marked as incomplete."],
    hypothesis: ["Hypothesis pending validation", "The fund-of-funds bridge and selected thresholds require a partner decision."],
  };
  if (!messages[scenario]) return "";
  const [title, copy] = messages[scenario];
  return `<div class="scenario-banner"><p><strong>${title}.</strong> ${copy}</p>${badge(title, scenario === "current" ? "current" : scenario)}</div>`;
}

export function allocationView(allocation, activeFilter) {
  const { gradient, colors } = donutGradient(allocation);
  return `<div class="donut-layout">
    <div class="donut-shell"><div class="donut" style="--donut-gradient:${gradient}"></div><div class="donut-center"><strong>100%</strong><small>positive allocation</small></div></div>
    <div class="allocation-list" aria-label="Filter positions by asset class">
      ${allocation.map((item, index) => `<button type="button" class="allocation-button ${activeFilter === item.asset_class ? "is-active" : ""}" data-action="filter-allocation" data-class="${escapeHtml(item.asset_class)}" aria-pressed="${activeFilter === item.asset_class}"><span class="swatch" style="--swatch:${colors[index]}"></span><span>${escapeHtml(item.asset_class)}</span><strong>${formatPercent(item.weight, 0)}</strong></button>`).join("")}
      <button type="button" class="button ghost small" data-action="clear-allocation" ${activeFilter ? "" : "disabled"}>Show all positions</button>
    </div>
  </div>`;
}

export function sourceFootnote(source = "Governed MySQL", freshness = "Current", quality = "Validated", run = "Unavailable") {
  return `<div class="scenario-banner" style="margin:1rem 0 0"><p><strong>Source</strong> ${escapeHtml(source)} · <strong>Freshness</strong> ${escapeHtml(freshness)} · <strong>Quality</strong> ${escapeHtml(quality)} · <strong>Run</strong> ${escapeHtml(run)}</p></div>`;
}

export function tableShell(title, subtitle, headings, rows, toolbar = "") {
  return `<section class="card table-card"><div class="table-toolbar"><div><h2 class="card-title">${escapeHtml(title)}</h2><small>${escapeHtml(subtitle)}</small></div>${toolbar}</div><div class="table-scroll"><table><thead><tr>${headings.map((heading) => `<th scope="col" class="${heading.numeric ? "numeric" : ""}">${escapeHtml(heading.label)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

export function workflowSteps(current) {
  const steps = ["Source", "Bronze", "Validation", "Silver", "Gold", "MySQL", "Serving"];
  return `<ol class="step-list" aria-label="Workflow steps">${steps.map((label, index) => `<li class="step ${index === current ? "is-current" : ""} ${index < current ? "is-complete" : ""}" ${index === current ? 'aria-current="step"' : ""}><span class="step-index">${index < current ? "OK" : index + 1}</span><span><strong>${label}</strong><small>${index < current ? "Completed" : index === current ? "In progress" : "Upcoming"}</small></span></li>`).join("")}</ol>`;
}
