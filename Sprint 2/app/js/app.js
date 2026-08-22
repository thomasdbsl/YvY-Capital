import { loadData } from "./data.js";
import { escapeHtml, scenarioBanner } from "./components.js";
import { renderPage } from "./pages.js";
import { setState, state, subscribe, updateAnomaly } from "./state.js";

const labels = {
  overview: "Vue generale",
  funds: "Fonds",
  "fund-detail": "Allocation",
  performance: "Performance",
  comparison: "Comparaison interne",
  peers: "Comparaison aux pairs",
  quality: "Qualite des donnees",
  import: "Import et validation",
  runs: "Runs et lineage",
};

const shell = document.querySelector(".app-shell");
const viewRoot = document.querySelector("#app-view");
const bannerRoot = document.querySelector("#scenario-banner");
const pageLabel = document.querySelector("#current-page-label");
const fundSelect = document.querySelector("#fund-select");
const periodSelect = document.querySelector("#period-select");
const scenarioSelect = document.querySelector("#scenario-select");
const roleSelect = document.querySelector("#role-select");
const dialog = document.querySelector("#anomaly-dialog");
const anomalyTitle = document.querySelector("#anomaly-title");
const anomalyContent = document.querySelector("#anomaly-content");
const toastRegion = document.querySelector("#toast-region");

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
  scenarioSelect.value = state.scenario;
  roleSelect.value = state.role;
  const sourceSmall = document.querySelector("#source-status small");
  if (sourceSmall) sourceSmall.textContent = `Source synthetique · ${state.scenario === "late" ? "en retard" : state.scenario === "incomplete" ? "incomplete" : "a jour"}`;
}

function openAnomaly(anomalyId) {
  const anomaly = state.data.anomalies.find((item) => item.anomaly_id === anomalyId);
  if (!anomaly) return;
  state.selectedAnomaly = anomalyId;
  anomalyTitle.textContent = anomaly.title;
  anomalyContent.innerHTML = `<div class="detail-grid">
    <div class="detail-item"><small>Regle</small><strong>${escapeHtml(anomaly.rule_id)}</strong></div>
    <div class="detail-item"><small>Severite</small><strong>${escapeHtml(anomaly.severity)}</strong></div>
    <div class="detail-item"><small>Reference opaque</small><code>${escapeHtml(anomaly.record_ref)}</code></div>
    <div class="detail-item"><small>Action proposee</small><strong>${escapeHtml(anomaly.action)}</strong></div>
  </div><p style="margin:1rem 0 0">La valeur d'entree n'est jamais affichee dans ce prototype ni dans le journal partageable.</p>`;
  dialog.showModal();
}

function handleAction(action, target) {
  if (action === "reset-scenario") setState({ scenario: "sample" });
  if (action === "select-fund") setState({ selectedFund: target.dataset.fund, view: "fund-detail", allocationFilter: null });
  if (action === "filter-allocation") setState({ allocationFilter: target.dataset.class });
  if (action === "clear-allocation") setState({ allocationFilter: null });
  if (action === "open-anomaly") openAnomaly(target.dataset.anomaly);
  if (action === "close-dialog") dialog.close();
  if (action === "resolve-anomaly" && state.selectedAnomaly) {
    updateAnomaly(state.selectedAnomaly, "resolved");
    dialog.close();
    toast("Anomalie marquee resolue dans la simulation.");
  }
  if (action === "quarantine-anomaly" && state.selectedAnomaly) {
    updateAnomaly(state.selectedAnomaly, "quarantined");
    dialog.close();
    toast("Enregistrement synthetique place en quarantaine.");
  }
  if (action === "select-source") setState({ workflowStep: 1 });
  if (action === "run-structure") {
    setState({ workflowStep: 2 });
    toast("Controle de structure termine.");
  }
  if (action === "quarantine-all") {
    state.data.anomalies.filter((item) => item.severity === "blocking").forEach((item) => { item.status = "quarantined"; });
    setState({ workflowStep: 3 });
  }
  if (action === "prepare-validation") setState({ workflowStep: 4 });
  if (action === "validate-dataset") {
    setState({ workflowStep: 5 });
    toast("Jeu synthetique valide.");
  }
  if (action === "publish-dataset") {
    setState({ workflowStep: 6 });
    toast("Publication locale terminee. Aucun envoi externe.");
  }
  if (action === "reset-workflow") setState({ workflowStep: 0 });
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

fundSelect.addEventListener("change", (event) => setState({ selectedFund: event.target.value }));
periodSelect.addEventListener("change", (event) => setState({ period: event.target.value }));
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

document.querySelector("#help-button").addEventListener("click", () => toast("Utilisez le selecteur Scenario prototype pour demontrer tous les etats."));

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
  const data = await loadData();
  fundSelect.innerHTML = data.funds.map((fund) => `<option value="${fund.id}">${fund.id}</option>`).join("");
  setState({ data });
  if (window.innerWidth <= 860) {
    shell.dataset.sidebar = "closed";
    document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
  }
}

initialize();
