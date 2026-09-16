import { loadData, loadInternalComparison, loadPerformance, loadPortfolio, loadReview, saveReview, loadRisk, loadReconciliation, loadIssues } from "./data.js";
import { escapeHtml, scenarioBanner, statePanel } from "./components.js";
import { renderPage } from "./pages.js";
import { setState, state, subscribe } from "./state.js";
import { requireLogin, authRequest, currentUser, endSession } from "./auth.js";

const labels = {
  risk: "Risk Analytics",
  reconciliation: "Reconciliation",
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
let sessionRecovery = null;
let dialogReturnFocus = null;

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 2800);
}

function navigate(view) {
  if (["quality", "import", "runs", "reconciliation"].includes(view) && currentUser?.role !== "ANALYST") {
    toast("Access forbidden: Analyst role required.");
    return;
  }
  setState({ view, allocationFilter: view === "fund-detail" ? state.allocationFilter : null });
  if (window.innerWidth <= 860) shell.dataset.sidebar = "closed";
  window.requestAnimationFrame(() => document.querySelector("#main-content")?.focus());
}

function render() {
  if (!state.data) return;
  const qualityKey = JSON.stringify(state.qualityFilters || {});
  if (state.view === "quality" && state.qualityKey !== qualityKey && currentUser?.role === "ANALYST") {
    state.qualityKey=qualityKey;
    state.qualityStatus="loading";
    loadIssues(state.qualityFilters).then((qualityData)=>{
      if (state.qualityKey===qualityKey && currentUser?.role==="ANALYST") setState({ qualityData,qualityStatus:"ready" });
    }).catch((error)=>{
      if (state.qualityKey===qualityKey) setState({ qualityStatus:"error",qualityError:error.message });
    });
  }
  const reconciliationKey = `${state.selectedFund}:${JSON.stringify(state.reconciliationFilters || {})}`;
  if (state.view === "reconciliation" && state.reconciliationKey !== reconciliationKey && currentUser?.role === "ANALYST") {
    state.reconciliationKey = reconciliationKey;
    state.reconciliationStatus = "loading";
    loadReconciliation(state.selectedFund,state.reconciliationFilters).then((reconciliationData)=>{
      if (state.reconciliationKey === reconciliationKey && currentUser?.role === "ANALYST") setState({ reconciliationData,reconciliationStatus:"ready" });
    }).catch((error)=>{
      if (state.reconciliationKey === reconciliationKey) setState({ reconciliationStatus:"error",reconciliationError:error.message });
    });
  }
  const riskKey = `${state.selectedFund}:${state.period}`;
  if (state.view === "risk" && state.riskKey !== riskKey) {
    state.riskKey = riskKey;
    state.riskStatus = "loading";
    loadRisk(state.selectedFund, state.period).then((riskData) => {
      if (state.riskKey === riskKey && currentUser) setState({ riskData, riskStatus: "ready" });
    }).catch((error) => {
      if (state.riskKey === riskKey) setState({ riskStatus: "error", riskError: error.message });
    });
  }
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
    ? snapshots.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join("")
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

async function openAnomaly(anomalyId, reviewContext = "quality") {
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const anomaly = (state.qualityData?.anomalies || state.data.anomalies).find((item) => item.anomaly_id === anomalyId) || { anomaly_id: anomalyId, title: "Control evidence", rule_id: "Loading", severity: "Loading", record_ref: "Loading", action: "Loading" };
  state.selectedAnomaly = anomalyId;
  anomalyTitle.textContent = anomaly.title;
  anomalyContent.innerHTML = `<div class="detail-grid">
    <div class="detail-item"><small>Rule</small><strong>${escapeHtml(anomaly.rule_id)}</strong></div>
    <div class="detail-item"><small>Severity</small><strong>${escapeHtml(anomaly.severity)}</strong></div>
    <div class="detail-item"><small>Opaque reference</small><code>${escapeHtml(anomaly.record_ref)}</code></div>
    <div class="detail-item"><small>Proposed action</small><strong>${escapeHtml(anomaly.action)}</strong></div>
  </div><p style="margin:1rem 0 0">The input value is never displayed in this prototype or in the shareable log.</p>`;
  dialog.showModal();
  try {
    const { issue, history } = await loadReview(anomalyId);
    if (!dialog.open || state.selectedAnomaly !== anomalyId) return;
    anomalyContent.innerHTML += `<dl><dt>Run</dt><dd>${escapeHtml(issue.run_id)}</dd><dt>Source reference</dt><dd>${escapeHtml(issue.logical_name)} / row ${escapeHtml(issue.source_row ?? "Unavailable")}</dd><dt>Reviewed by</dt><dd>${escapeHtml(issue.reviewed_by ?? "Not reviewed")} ${escapeHtml(issue.reviewed_at ?? "")}</dd></dl>
      <form id="review-form"><label for="review-status">Review status</label><select id="review-status" name="status">${["open","resolved","quarantined"].map((status) => `<option ${status === issue.status ? "selected" : ""}>${status}</option>`).join("")}</select>
      <label for="review-note">Analyst note (no private source values)</label><textarea id="review-note" name="note" maxlength="1000">${escapeHtml(issue.analyst_note)}</textarea>
      <p>Review decisions do not release quarantined data.</p><p id="review-error" role="alert"></p><button class="button primary" type="submit">Save review</button></form>
      <h3>Review history</h3><ul>${history.map((event) => `<li>${escapeHtml(event.occurred_at)} · ${escapeHtml(event.username)} · ${escapeHtml(event.action)} · ${escapeHtml(event.new_state?.status ?? "")}</li>`).join("") || "<li>No review events yet.</li>"}</ul>`;
    document.querySelector("#review-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        const result = await saveReview({ issue_id: anomalyId, status: form.elements.status.value, note: form.elements.note.value, revision: Number(issue.revision), context: reviewContext });
        anomaly.status = result.issue.status;
        state.reconciliationKey = null;
        state.qualityKey = null;
        dialog.close();
        render();
        toast("Review saved with audit evidence.");
        await openAnomaly(anomalyId, reviewContext);
      } catch (error) { document.querySelector("#review-error").textContent = error.message; }
      finally { if (button.isConnected) button.disabled = false; }
    });
  } catch (error) { toast(error.message); }
}

function closeAnomaly() {
  dialog.close();
  if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus();
  dialogReturnFocus = null;
}

function handleAction(action, target) {
  if (action === "quality-page") setState({ qualityFilters:{ ...state.qualityFilters,offset:Number(target.dataset.offset) } });
  if (action === "reconciliation-page") setState({ reconciliationFilters:{ ...state.reconciliationFilters,offset:Number(target.dataset.offset) } });
  if (action === "risk-tab") setState({ riskTab: target.dataset.tab });
  if (action === "reset-scenario") setState({ scenario: "current" });
  if (action === "select-fund") {
    setState({ view: "fund-detail", allocationFilter: null });
    refreshFund(target.dataset.fund);
  }
  if (action === "filter-allocation") setState({ allocationFilter: target.dataset.class });
  if (action === "clear-allocation") setState({ allocationFilter: null });
  if (action === "open-anomaly") openAnomaly(target.dataset.anomaly, target.dataset.reviewContext || "quality");
  if (action === "close-dialog") closeAnomaly();
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
      loadInternalComparison(period, state.comparisonFundA, state.comparisonFundB),
    ]);
    if (sequence !== requestSequence) return;
    setState({ data: { ...state.data, performance, history: performance.history, internal_comparison: internalComparison }, dataStatus: "ready" });
  } catch (error) {
    if (sequence === requestSequence) setState({ dataStatus: "error", errorMessage: error.message });
  }
}

async function refreshComparison(fundA, fundB) {
  const sequence = ++requestSequence;
  setState({ comparisonFundA: fundA, comparisonFundB: fundB, dataStatus: "loading", errorMessage: null });
  try {
    const internalComparison = await loadInternalComparison(state.period, fundA, fundB);
    if (sequence !== requestSequence) return;
    setState({ data: { ...state.data, internal_comparison: internalComparison }, dataStatus: "ready" });
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
  const target = event.target;
  const qualityFilter = target.dataset.qualityFilter;
  const reconciliationFilter = target.dataset.reconciliationFilter;
  const value = target.value;
  const id = target.id;
  // Capture the intent before the async page load can replace this control.
  window.setTimeout(() => {
    if (qualityFilter) setState({ qualityFilters:{ ...state.qualityFilters,[qualityFilter]:value,offset:0 } });
    if (reconciliationFilter) setState({ reconciliationFilters:{ ...state.reconciliationFilters,[reconciliationFilter]:value,offset:0 } });
    if (id === "stress-scenario") setState({ stressScenario:value });
    if (id === "fund-search") setState({ query:value });
    if (id === "comparison-fund-a") refreshComparison(value,state.comparisonFundB);
    if (id === "comparison-fund-b") refreshComparison(state.comparisonFundA,value);
  }, 0);
}, { capture: true });

fundSelect.addEventListener("change", (event) => refreshFund(event.target.value));
periodSelect.addEventListener("change", (event) => refreshPeriod(event.target.value));
snapshotSelect.addEventListener("change", (event) => refreshSnapshot(event.target.value));
scenarioSelect.addEventListener("change", (event) => setState({ scenario: event.target.value }));
document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await authRequest({ action: "logout" });
    void recoverSession("You have signed out.");
  } catch (error) { toast(error.message); }
});
window.addEventListener("session-expired", async () => {
  void recoverSession();
});

function recoverSession(message) {
  if (sessionRecovery) return sessionRecovery;
  requestSequence += 1;
  endSession(message);
  state.data = null;
  sessionRecovery = initialize().finally(() => { sessionRecovery = null; });
  return sessionRecovery;
}

document.querySelector("#menu-button").addEventListener("click", () => {
  const open = shell.dataset.sidebar === "open";
  shell.dataset.sidebar = open ? "closed" : "open";
  document.querySelector("#menu-button").setAttribute("aria-expanded", String(!open));
});

document.querySelector("#help-button").addEventListener("click", () => toast("Fund, snapshot, and period filters query the governed local API."));

document.querySelector(".primary-nav").addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = [...document.querySelectorAll(".nav-item")].filter((item) => !item.hidden);
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
  const sequence = ++requestSequence;
  try {
    const user = await requireLogin();
    if (sequence !== requestSequence || !currentUser) return;
    state.riskKey = null;
    state.riskData = null;
    state.reconciliationKey = null;
    state.reconciliationData = null;
    state.qualityKey = null;
    state.qualityData = null;
    setState({
      role:user.role === "ANALYST" ? "analyst" : "direction", view:"overview", period:"12m", scenario:"current",
      selectedSnapshot:null, allocationFilter:null, query:"", qualityFilters:{}, reconciliationFilters:{},
      riskTab:"overview", stressScenario:null, dataStatus:"loading", errorMessage:null,
    }, { silent:true });
    document.querySelectorAll('.nav-item[data-view="quality"], .nav-item[data-view="import"], .nav-item[data-view="runs"], .nav-item[data-view="reconciliation"]').forEach((item) => { item.hidden = user.role !== "ANALYST"; });
    document.querySelectorAll(".nav-label")[1].hidden = user.role !== "ANALYST";
    const data = await loadData();
    if (sequence !== requestSequence || currentUser?.user_id !== user.user_id) return;
    fundSelect.innerHTML = data.funds.map((fund) => `<option value="${escapeHtml(fund.id)}">${escapeHtml(fund.id)}</option>`).join("");
    const selectedFund = data.funds[0]?.id || "FUND_01";
    const requestedFunds = data.internal_comparison?.targeted?.requested_funds;
    setState({
      data,
      selectedFund,
      comparisonFundA: requestedFunds?.fund_a || data.funds[0]?.id || "FUND_01",
      comparisonFundB: requestedFunds?.fund_b || data.funds[1]?.id || "FUND_02",
      selectedSnapshot: data.portfolio?.snapshot_date || null,
      dataStatus: "ready",
    });
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
