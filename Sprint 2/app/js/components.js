import { donutGradient } from "./charts.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function formatMoney(value, compact = true) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value ?? 0);
}

export function formatPercent(value, digits = 2) {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: digits, signDisplay: "exceptZero" }).format(value ?? 0);
}

export function badge(label, status = "info") {
  return `<span class="badge ${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

export function pageHeading(eyebrow, title, description, actions = "") {
  return `<header class="page-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</header>`;
}

export function statCard({ label, value, status = "current", statusLabel = "A jour", trend = "", meta = "", delay = 0, testId = "" }) {
  const trendClass = String(trend).startsWith("-") ? "negative" : "positive";
  return `<article class="card stat-card" style="--delay:${delay}ms" ${testId ? `data-testid="${testId}"` : ""}>
    <div class="stat-top"><span class="stat-label">${escapeHtml(label)}</span>${badge(statusLabel, status)}</div>
    <div class="stat-value">${escapeHtml(value)}</div>
    <div class="stat-meta"><span class="trend ${trend ? trendClass : ""}">${escapeHtml(trend || "Source synthetique")}</span><span>${escapeHtml(meta)}</span></div>
  </article>`;
}

export function card(title, subtitle, content, action = "", classes = "") {
  return `<section class="card card-pad ${classes}"><header class="card-header"><div><h2 class="card-title">${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>${action ? `<div class="card-action">${action}</div>` : ""}</header>${content}</section>`;
}

const stateCopy = {
  loading: ["CHG", "Chargement des donnees", "Le run est en cours de lecture. Aucun chiffre intermediaire n'est publie."],
  empty: ["VIDE", "Aucune donnee disponible", "Cette source ne contient aucun enregistrement pour les filtres selectionnes."],
  error: ["ERR", "Le controle a echoue", "Le lot reste isole. Consultez le journal de run ou relancez le controle."],
  denied: ["403", "Acces refuse", "Votre role de demonstration ne permet pas d'ouvrir cette vue."],
  "no-match": ["0", "Aucune correspondance", "Modifiez le fonds, la periode ou le filtre de recherche."],
};

export function statePanel(scenario) {
  if (scenario === "loading") {
    return `<section class="card card-pad state-panel" aria-label="Chargement"><div class="state-panel-inner" style="width:100%;text-align:left"><div class="skeleton title"></div><div class="skeleton line"></div><div class="skeleton line" style="width:72%"></div><div class="skeleton block"></div><span class="sr-only">Chargement en cours</span></div></section>`;
  }
  const [icon, title, copy] = stateCopy[scenario] || stateCopy.empty;
  return `<section class="card state-panel"><div class="state-panel-inner"><div class="state-icon" aria-hidden="true">${icon}</div><h2>${title}</h2><p>${copy}</p><button class="button primary" type="button" data-action="reset-scenario">Revenir aux donnees d'exemple</button></div></section>`;
}

export function scenarioBanner(scenario) {
  const messages = {
    sample: ["Donnees d'exemple", "Toutes les valeurs sont synthetiques et reproductibles via SPRINT2-WF-001."],
    current: ["Donnees a jour", "Les controles de fraicheur et de qualite sont conformes dans ce scenario."],
    late: ["Donnees en retard", "Une source depasse le seuil de fraicheur propose. Les valeurs restent visibles avec avertissement."],
    incomplete: ["Donnees incompletes", "Une partie des prerequis manque. Les KPI concernes sont marques comme incomplets."],
    hypothesis: ["Hypothese a valider", "Le bridge fonds-dans-fonds et certains seuils attendent une decision partenaire."],
  };
  if (!messages[scenario]) return "";
  const [title, copy] = messages[scenario];
  return `<div class="scenario-banner"><p><strong>${title}.</strong> ${copy}</p>${badge(title, scenario === "current" ? "current" : scenario)}</div>`;
}

export function allocationView(allocation, activeFilter) {
  const { gradient, colors } = donutGradient(allocation);
  return `<div class="donut-layout">
    <div class="donut-shell"><div class="donut" style="--donut-gradient:${gradient}"></div><div class="donut-center"><strong>100%</strong><small>allocation</small></div></div>
    <div class="allocation-list" aria-label="Filtrer les positions par classe">
      ${allocation.map((item, index) => `<button type="button" class="allocation-button ${activeFilter === item.asset_class ? "is-active" : ""}" data-action="filter-allocation" data-class="${escapeHtml(item.asset_class)}" aria-pressed="${activeFilter === item.asset_class}"><span class="swatch" style="--swatch:${colors[index]}"></span><span>${escapeHtml(item.asset_class)}</span><strong>${formatPercent(item.weight, 0)}</strong></button>`).join("")}
      <button type="button" class="button ghost small" data-action="clear-allocation" ${activeFilter ? "" : "disabled"}>Afficher toutes les positions</button>
    </div>
  </div>`;
}

export function sourceFootnote(source = "SRC_SYNTHETIC_FIXTURES", freshness = "A jour", quality = "Valide") {
  return `<div class="scenario-banner" style="margin:1rem 0 0"><p><strong>Source</strong> ${escapeHtml(source)} · <strong>Fraicheur</strong> ${escapeHtml(freshness)} · <strong>Qualite</strong> ${escapeHtml(quality)} · <strong>Run</strong> SPRINT2-WF-001</p></div>`;
}

export function tableShell(title, subtitle, headings, rows, toolbar = "") {
  return `<section class="card table-card"><div class="table-toolbar"><div><h2 class="card-title">${escapeHtml(title)}</h2><small>${escapeHtml(subtitle)}</small></div>${toolbar}</div><div class="table-scroll"><table><thead><tr>${headings.map((heading) => `<th scope="col" class="${heading.numeric ? "numeric" : ""}">${escapeHtml(heading.label)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

export function workflowSteps(current) {
  const steps = ["Selection", "Structure", "Anomalies", "Traitement", "Validation", "Publication", "Lineage"];
  return `<ol class="step-list" aria-label="Etapes du workflow">${steps.map((label, index) => `<li class="step ${index === current ? "is-current" : ""} ${index < current ? "is-complete" : ""}" ${index === current ? 'aria-current="step"' : ""}><span class="step-index">${index < current ? "OK" : index + 1}</span><span><strong>${label}</strong><small>${index < current ? "Terminee" : index === current ? "En cours" : "A venir"}</small></span></li>`).join("")}</ol>`;
}
