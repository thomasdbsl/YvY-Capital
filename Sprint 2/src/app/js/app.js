import { loadData, loadInternalComparison, loadPerformance, loadPortfolio } from "./data.js";
import { escapeHtml, scenarioBanner, statePanel } from "./components.js";
import { renderPage } from "./pages.js";
import { setState, state, subscribe } from "./state.js";

const labels = {
  overview: "Overview",
  funds: "Funds",
  "fund-detail": "Allocation",
  performance: "Performance",
  comparison: "Internal comparison",
  peers: "Peer comparison",
  quality: "Data quality",
  import: "Import and validation",
  runs: "Runs and lineage",
};

const shell = document.querySelector(".app-shell");
const viewRoot = document.querySelector("#app-view");
const bannerRoot = document.querySelector("#scenario-banner");
const pageLabel = document.querySelector("#current-page-label");
const fundSelect = document.querySelector("#fund-select");
const periodSelect = document.querySelector("#period-select");
const snapshotSelect = document.querySelector("#snapshot-select");
const scenarioSelect = document.querySelector("#scenario-select");
const roleSelect = document.querySelector("#role-select");
const dialog = document.querySelector("#anomaly-dialog");
const anomalyTitle = document.querySelector("#anomaly-title");
const anomalyContent = document.querySelector("#anomaly-content");
const toastRegion = document.querySelector("#toast-region");
let requestSequence = 0;

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 2800);
}

function navigate(view) {
  setState({ view, allocationFilter: view === "fund-detail" ? state.allocationFilter : null });
  if (window.innerWidth <= 860) shell.dataset.sidebar = "closed";
  window.requestAnimationFrame(() => document.querySelector("#main-content")?.focus());
}

function render() {
  if (!state.data) return;
  viewRoot.setAttribute("aria-busy", "true");
  bannerRoot.innerHTML = scenarioBanner(state.scenario);
  viewRoot.innerHTML = renderPage(state);
  viewRoot.setAttribute("aria-busy", "false");
  pageLabel.textContent = labels[state.view];
  document.title = `${labels[state.view]} | Funds Manager`;
  document.querySelectorAll(".nav-item").forEach((item) => {
    const active = item.dataset.view === state.view;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
  });
  fundSelect.value = state.selectedFund;
  periodSelect.value = state.period;
  const snapshots = state.data.portfolio?.available_snapshots || [];
  snapshotSelect.innerHTML = snapshots.length
    ? snapshots.map((date) => `<option value="${date}">${date}</option>`).join("")
    : '<option value="">Unavailable</option>';
  snapshotSelect.disabled = !snapshots.length;
  snapshotSelect.value = state.selectedSnapshot || snapshots[0] || "";
  scenarioSelect.value = state.scenario;
  roleSelect.value = state.role;
  const sourceStrong = document.querySelector("#source-status strong");
  const sourceSmall = document.querySelector("#source-status small");
  if (sourceStrong) sourceStrong.textContent = state.data.meta.run_id;
  if (sourceSmall) sourceSmall.textContent = `Governed MySQL · ${state.data.meta.business_date || "date unavailable"}`;
}

function openAnomaly(anomalyId) {
  const anomaly = state.data.anomalies.find((item) => item.anomaly_id === anomalyId);
  if (!anomaly) return;
  state.selectedAnomaly = anomalyId;
  anomalyTitle.textContent = anomaly.title;
  anomalyContent.innerHTML = `<div class="detail-grid">
    <div class="detail-item"><small>Rule</small><strong>${escapeHtml(anomaly.rule_id)}</strong></div>
    <div class="detail-item"><small>Severity</small><strong>${escapeHtml(anomaly.severity)}</strong></div>
    <div class="detail-item"><small>Opaque reference</small><code>${escapeHtml(anomaly.record_ref)}</code></div>
    <div class="detail-item"><small>Proposed action</small><strong>${escapeHtml(anomaly.action)}</strong></div>
  </div><p style="margin:1rem 0 0">The input value is never displayed in this prototype or in the shareable log.</p>`;
  dialog.showModal();
}

function handleAction(action, target) {
  if (action === "reset-scenario") setState({ scenario: "current" });
  if (action === "select-fund") {
    setState({ view: "fund-detail", allocationFilter: null });
    refreshFund(target.dataset.fund);
  }
  if (action === "filter-allocation") setState({ allocationFilter: target.dataset.class });
  if (action === "clear-allocation") setState({ allocationFilter: null });
  if (action === "open-anomaly") openAnomaly(target.dataset.anomaly);
  if (action === "close-dialog") dialog.close();
}

async function refreshFund(fundId) {
  const sequence = ++requestSequence;
  setState({ selectedFund: fundId, selectedSnapshot: null, dataStatus: "loading", errorMessage: null });
  try {
    const [portfolio, performance] = await Promise.all([
      loadPortfolio(fundId),
      loadPerformance(fundId, state.period),
    ]);
    if (sequence !== requestSequence) return;
    setState({
      data: { ...state.data, portfolio, allocation: portfolio.allocation, positions: portfolio.positions, performance, history: performance.history },
      selectedSnapshot: portfolio.snapshot_date,
      dataStatus: "ready",
    });
  } catch (error) {
    if (sequence === requestSequence) setState({ dataStatus: "error", errorMessage: error.message });
  }
}

async function refreshSnapshot(snapshotDate) {
  const sequence = ++requestSequence;
  setState({ selectedSnapshot: snapshotDate, dataStatus: "loading", errorMessage: null });
  try {
    const portfolio = await loadPortfolio(state.selectedFund, snapshotDate);
    if (sequence !== requestSequence) return;
    setState({ data: { ...state.data, portfolio, allocation: portfolio.allocation, positions: portfolio.positions }, dataStatus: "ready" });
  } catch (error) {
    if (sequence === requestSequence) setState({ dataStatus: "error", errorMessage: error.message });
  }
}

async function refreshPeriod(period) {
  const sequence = ++requestSequence;
  setState({ period, dataStatus: "loading", errorMessage: null });
  try {
    const [performance, internalComparison] = await Promise.all([
      loadPerformance(state.selectedFund, period),
      loadInternalComparison(period),
    ]);
    if (sequence !== requestSequence) return;
    setState({ data: { ...state.data, performance, history: performance.history, internal_comparison: internalComparison }, dataStatus: "ready" });
  } catch (error) {
    if (sequence === requestSequence) setState({ dataStatus: "error", errorMessage: error.message });
  }
}

document.addEventListener("click", (event) => {
  const navTarget = event.target.closest("[data-nav]");
  if (navTarget) navigate(navTarget.dataset.nav);
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) handleAction(actionTarget.dataset.action, actionTarget);
  const sidebarTarget = event.target.closest(".nav-item[data-view]");
  if (sidebarTarget) navigate(sidebarTarget.dataset.view);
});

viewRoot.addEventListener("change", (event) => {
  if (event.target.id === "fund-search") setState({ query: event.target.value });
});

fundSelect.addEventListener("change", (event) => refreshFund(event.target.value));
periodSelect.addEventListener("change", (event) => refreshPeriod(event.target.value));
snapshotSelect.addEventListener("change", (event) => refreshSnapshot(event.target.value));
scenarioSelect.addEventListener("change", (event) => setState({ scenario: event.target.value }));
roleSelect.addEventListener("change", (event) => {
  const role = event.target.value;
  setState({ role, view: role === "analyst" ? "import" : "overview" });
});

document.querySelector("#menu-button").addEventListener("click", () => {
  const open = shell.dataset.sidebar === "open";
  shell.dataset.sidebar = open ? "closed" : "open";
  document.querySelector("#menu-button").setAttribute("aria-expanded", String(!open));
});

document.querySelector("#help-button").addEventListener("click", () => toast("Fund, snapshot, and period filters query the governed local API."));

document.querySelector(".primary-nav").addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = [...document.querySelectorAll(".nav-item")];
  const current = items.indexOf(document.activeElement);
  let next = current;
  if (event.key === "ArrowDown") next = (current + 1) % items.length;
  if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = items.length - 1;
  event.preventDefault();
  items[next].focus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && window.innerWidth <= 860 && shell.dataset.sidebar === "open" && !dialog.open) {
    shell.dataset.sidebar = "closed";
    document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
  }
});

subscribe(render);

async function initialize() {
  try {
    const data = await loadData();
    fundSelect.innerHTML = data.funds.map((fund) => `<option value="${fund.id}">${fund.id}</option>`).join("");
    const selectedFund = data.funds[0]?.id || "FUND_01";
    setState({ data, selectedFund, selectedSnapshot: data.portfolio?.snapshot_date || null, dataStatus: "ready" });
    if (window.innerWidth <= 860) {
      shell.dataset.sidebar = "closed";
      document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
    }
  } catch (error) {
    state.errorMessage = error.message;
    viewRoot.innerHTML = statePanel("error");
    viewRoot.setAttribute("aria-busy", "false");
  }
}

initialize();
