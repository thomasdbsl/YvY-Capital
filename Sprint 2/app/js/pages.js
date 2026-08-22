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
  return ({ current: "A jour", late: "En retard", incomplete: "Incomplet", hypothesis: "A valider", warning: "A revoir", blocking: "Bloquant" })[status] || status;
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
      <td>${badge(fund.coverage === "history-only" ? "Historique" : "Snapshot + historique", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
    </tr>`).join("");
    const alerts = data.anomalies.slice(0, 4).map((item) => `<div class="alert-item"><span class="alert-symbol">${item.rule_id}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.record_ref)} · aucune valeur source exposee</p></div>${badge(item.severity === "blocking" ? "Bloquant" : "A revoir", item.severity)}</div>`).join("");
    return `<section class="page" data-page="overview">
      ${pageHeading("Parcours Direction", "Une vue nette avant chaque decision.", "Synthese portefeuille, qualite, fraicheur et hypotheses reunies sans exposer les sources locales.", '<button class="button secondary" type="button" data-nav="quality">Voir les controles</button><button class="button primary" type="button" data-nav="funds">Explorer les fonds</button>')}
      <section class="card hero-card">
        <div class="hero-copy"><span class="eyebrow">Portefeuille synthetique · 7 fonds snapshot</span><h2>Encours juridique consolide</h2><div class="hero-total"><span>K01 · source synthetique</span><strong data-testid="executive-aum">${formatMoney(total)}</strong></div><p>La lecture transparisee reste une hypothese jusqu'a validation du bridge. Les quatorze fonds historiques sont suivis separement.</p><div class="hero-actions">${badge("Donnees d'exemple", "sample")} ${badge(statusLabel(scenarioStatus), scenarioStatus)}</div></div>
        <div class="hero-visual">${lineChart(history, benchmark, "Evolution synthetique de FUND_01 et de sa reference")}</div>
      </section>
      <div class="grid grid-kpis" style="margin-top:1rem">
        ${statCard({ label: "Encours brut", value: formatMoney(total), status: scenarioStatus, statusLabel: statusLabel(scenarioStatus), trend: "+2,4 %", meta: "K01", delay: 40 })}
        ${statCard({ label: "Lecture transparisee", value: formatMoney(total * 0.78), status: "hypothesis", statusLabel: "A valider", trend: "Bridge synthetique", meta: "K14", delay: 80 })}
        ${statCard({ label: "Qualite de publication", value: "94 / 100", status: "current", statusLabel: "Controlee", trend: "5 quarantaines", meta: "K16", delay: 120 })}
        ${statCard({ label: "Performance 12 mois", value: "+12,8 %", status: state.scenario === "incomplete" ? "incomplete" : "sample", statusLabel: state.scenario === "incomplete" ? "Incomplet" : "Exemple", trend: "+3,1 pts", meta: "H02", delay: 160 })}
      </div>
      <div class="grid grid-main">
        ${tableShell("Fonds prioritaires", "Snapshot detaille et couverture historique", [{label:"Fonds"},{label:"Couverture"},{label:"Encours",numeric:true},{label:"Jour",numeric:true}], fundRows, '<button class="button ghost small" type="button" data-nav="funds">Voir les 14 fonds</button>')}
        ${card("Alertes a traiter", "Le detail reste opaque et sans identifiant prive.", `<div class="alert-list">${alerts}</div>`, '<button class="button ghost small" type="button" data-nav="quality">Tout ouvrir</button>')}
      </div>
      ${sourceFootnote()}
    </section>`;
  });
}

function funds(state) {
  return pageOrState(state, () => {
    const query = state.query.trim().toLowerCase();
    const funds = state.data.funds.filter((fund) => fund.id.toLowerCase().includes(query));
    if (!funds.length) return `<section class="page">${pageHeading("Direction", "Fonds", "Couverture de quatorze alias synthetiques.")}${statePanel("no-match")}</section>`;
    const rows = funds.map((fund) => `<tr>
      <td><span class="row-title"><button type="button" class="table-button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button><small>${fund.lineage_ref}</small></span></td>
      <td>${badge(fund.coverage === "history-only" ? "Historique seulement" : "Snapshot + historique", fund.coverage === "history-only" ? "info" : "current")}</td>
      <td class="numeric">${formatMoney(fund.aum_brl)}</td><td class="numeric">${fund.nav_per_share.toFixed(2)}</td>
      <td class="numeric"><span class="trend ${fund.daily_return < 0 ? "negative" : "positive"}">${formatPercent(fund.daily_return)}</span></td>
      <td>${badge(statusLabel(fund.quality_status), fund.quality_status)}</td>
      <td><button type="button" class="button secondary small" data-action="select-fund" data-fund="${fund.id}">Ouvrir</button></td>
    </tr>`).join("");
    return `<section class="page" data-page="funds">${pageHeading("Parcours Direction", "Fonds", "Quatorze fonds historiques, dont sept disposent du snapshot detaille de demonstration.", '<button class="button primary" type="button" data-nav="comparison">Comparer</button>')}
      ${tableShell("Univers de fonds", `${funds.length} resultat(s) · aliases uniquement`, [{label:"Fonds"},{label:"Couverture"},{label:"Encours",numeric:true},{label:"Part",numeric:true},{label:"Jour",numeric:true},{label:"Qualite"},{label:"Action"}], rows, '<label><span class="sr-only">Rechercher un fonds</span><input type="search" id="fund-search" placeholder="Rechercher FUND_01" value="'+escapeHtml(state.query)+'"></label>')}
      ${sourceFootnote("SRC_SYNTHETIC_FIXTURES", state.scenario === "late" ? "En retard" : "A jour", state.scenario === "incomplete" ? "Incomplet" : "Valide")}
    </section>`;
  });
}

function fundDetail(state) {
  return pageOrState(state, () => {
    const fund = selectedFund(state);
    const fallbackPositions = state.data.positions.filter((item) => item.fund_id === "FUND_01");
    const positions = fallbackPositions.filter((item) => !state.allocationFilter || item.asset_class === state.allocationFilter);
    const rows = positions.map((position) => `<tr><td><span class="row-title"><strong>${position.instrument}</strong><small>${position.lineage_ref}</small></span></td><td>${position.asset_class}</td><td>${position.issuer}</td><td class="numeric">${formatMoney(position.value_brl, false)}</td><td class="numeric">${formatPercent(position.weight, 1)}</td><td>${badge(position.price_age_days > 20 ? "En retard" : "A jour", position.price_age_days > 20 ? "late" : "current")}</td></tr>`).join("");
    return `<section class="page" data-page="fund-detail">${pageHeading("Fonds / Allocation", fund.id, "Detail synthetique du fonds, de l'allocation jusqu'aux positions et a leur lineage.", '<button class="button secondary" type="button" data-nav="funds">Retour aux fonds</button><button class="button primary" type="button" data-nav="performance">Voir performance</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Actif net", value: formatMoney(fund.aum_brl), status: "current", statusLabel: "A jour", trend: formatPercent(fund.daily_return), meta: "K01", testId: "fund-aum" })}
        ${statCard({ label: "Valeur de part", value: fund.nav_per_share.toFixed(2), status: "current", statusLabel: "A jour", trend: "BRL / part", meta: "K02", delay: 40 })}
        ${statCard({ label: "Concentration Top 5", value: "41,8 %", status: "sample", statusLabel: "Exemple", trend: "Stable", meta: "K07", delay: 80 })}
        ${statCard({ label: "Fraicheur max", value: "24 jours", status: "late", statusLabel: "1 retard", trend: "Seuil propose", meta: "K15", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Allocation", "Selectionnez une classe pour filtrer les positions.", allocationView(state.data.allocation, state.allocationFilter), "", "allocation-card")}
        ${card("Rapprochement", "Composants synthetiques de K13.", `${miniBars([78, 12, 6, 4], "Repartition positions, caisse, provisions et ecart")}<div class="stat-meta" style="margin-top:1rem"><span>Positions + caisse + provisions</span>${badge("Seuil a valider", "hypothesis")}</div>`)}
      </div>
      <div style="margin-top:1rem">${tableShell("Positions", state.allocationFilter ? `Filtre : ${state.allocationFilter} · ${positions.length} lignes` : `${positions.length} positions synthetiques`, [{label:"Instrument"},{label:"Classe"},{label:"Emetteur"},{label:"Valeur",numeric:true},{label:"Poids",numeric:true},{label:"Prix"}], rows, '<button class="button ghost small" type="button" data-action="clear-allocation">Reinitialiser</button>')}</div>
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
    return `<section class="page" data-page="performance">${pageHeading("Performance & risque", `${fund.id} sur ${state.period}`, "Les series sont synthetiques. Les KPI historiques reels restent soumis aux controles de profondeur et de domaine.", '<button class="button secondary" type="button" data-nav="fund-detail">Allocation</button><button class="button primary" type="button" data-nav="comparison">Comparer</button>')}
      <div class="grid grid-kpis">
        ${statCard({ label: "Rendement cumule", value: "+12,8 %", status: "sample", statusLabel: "Exemple", trend: "+3,1 pts vs ref.", meta: "H02" })}
        ${statCard({ label: "Volatilite", value: "8,4 %", status: state.scenario === "incomplete" ? "incomplete" : "sample", statusLabel: state.scenario === "incomplete" ? "Incomplet" : "Exemple", trend: "252 jours proposes", meta: "H03", delay: 40 })}
        ${statCard({ label: "Drawdown max", value: "-4,2 %", status: "sample", statusLabel: "Exemple", trend: "Domaine valide", meta: "H05", delay: 80 })}
        ${statCard({ label: "Sharpe", value: "Indisponible", status: "hypothesis", statusLabel: "A valider", trend: "Taux sans risque requis", meta: "H04", delay: 120 })}
      </div>
      <div class="grid grid-main">
        ${card("Indice de performance", "Base 100 · donnees synthetiques", lineChart(primary, secondary, `Performance synthetique de ${fund.id}`), badge("H01-H03", "sample"))}
        ${card("Prerequis historiques", "Disponibilite ne signifie pas certification.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">H01</span><div><strong>NAV quotidienne</strong><p>Disponible avec controles de valeurs positives.</p></div>${badge("Controle", "current")}</div><div class="alert-item"><span class="alert-symbol">H04</span><div><strong>Taux sans risque</strong><p>Source et convention a valider.</p></div>${badge("A valider", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">H06</span><div><strong>Duration</strong><p>Unite non tranchee, calcul bloque.</p></div>${badge("Bloque", "unavailable")}</div></div>`)}
      </div>${sourceFootnote("SRC_SYNTHETIC_FIXTURES", "A jour", "Serie exemple")}</section>`;
  });
}

function comparison(state) {
  return pageOrState(state, () => {
    const funds = state.data.funds.slice(0, 7);
    const max = Math.max(...funds.map((fund) => fund.aum_brl));
    const rows = funds.map((fund) => `<tr><td><button class="table-button" type="button" data-action="select-fund" data-fund="${fund.id}">${fund.id}</button></td><td class="numeric">${formatMoney(fund.aum_brl)}</td><td><div class="quality-bar" aria-label="Poids relatif ${Math.round(fund.aum_brl / max * 100)} pour cent"><span style="width:${fund.aum_brl / max * 100}%"></span></div></td><td class="numeric">${formatPercent(fund.daily_return)}</td><td class="numeric">${(6.5 + funds.indexOf(fund) * 0.4).toFixed(1)} %</td><td>${badge(fund.quality_status === "current" ? "A jour" : "Incomplet", fund.quality_status)}</td></tr>`).join("");
    return `<section class="page" data-page="comparison">${pageHeading("Comparaison interne", "Sept fonds, une lecture comparable.", "Meme date, memes definitions et statut de qualite visible pour chaque mesure.", '<button class="button primary" type="button" data-nav="peers">Comparer aux pairs</button>')}${tableShell("Comparaison interne", "Valeurs entierement synthetiques", [{label:"Fonds"},{label:"Encours",numeric:true},{label:"Taille relative"},{label:"Jour",numeric:true},{label:"Volatilite",numeric:true},{label:"Qualite"}], rows)}${sourceFootnote()}</section>`;
  });
}

function peers(state) {
  return pageOrState(state, () => {
    const rows = state.data.peer_sample.map((peer, index) => `<tr><td>${index + 1}</td><td><strong>${peer.peer_id}</strong></td><td class="numeric">${peer.return_index.toFixed(1)}</td><td>${badge("Donnee exemple", "sample")}</td></tr>`).join("");
    return `<section class="page" data-page="peers">${pageHeading("Comparaison aux pairs", "Un adaptateur pret, aucune certification inventee.", "Cette vue utilise un univers synthetique. Elle se desactive si la source officielle n'est pas disponible et versionnee.", '<button class="button secondary" type="button" data-nav="comparison">Comparaison interne</button>')}
      <div class="grid grid-main">${tableShell("Univers synthetique", "6 pairs aliases · H07", [{label:"Rang"},{label:"Pair"},{label:"Indice",numeric:true},{label:"Statut"}], rows)}${card("Conditions d'activation", "Toutes restent a valider.", `<div class="alert-list"><div class="alert-item"><span class="alert-symbol">01</span><div><strong>Source versionnee</strong><p>Proprietaire et date de reference.</p></div>${badge("A valider", "hypothesis")}</div><div class="alert-item"><span class="alert-symbol">02</span><div><strong>Deduplication</strong><p>Identifiant synthetique unique par univers.</p></div>${badge("Teste", "current")}</div><div class="alert-item"><span class="alert-symbol">03</span><div><strong>Valeurs extremes</strong><p>Quarantaine avant tout classement.</p></div>${badge("Teste", "current")}</div></div>`)}</div>
      ${sourceFootnote("SRC_SYNTHETIC_FIXTURES", "A jour", "Exemple uniquement")}</section>`;
  });
}

function quality(state) {
  return pageOrState(state, () => {
    const anomalies = state.data.anomalies;
    const open = anomalies.filter((item) => item.status === "open").length;
    const blocked = anomalies.filter((item) => item.severity === "blocking" && item.status === "open").length;
    const rows = anomalies.map((item) => `<tr><td><button class="table-button" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">${item.rule_id}</button></td><td>${escapeHtml(item.title)}</td><td>${badge(item.severity, item.severity)}</td><td>${badge(item.status, item.status === "open" ? "warning" : item.status)}</td><td><code>${item.record_ref}</code></td><td><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">Detail</button></td></tr>`).join("");
    return `<section class="page" data-page="quality">${pageHeading("Parcours Analyste", "Qualite des donnees", "Regles explicites, quarantaines visibles et aucun contenu source dans les journaux.", '<button class="button primary" type="button" data-nav="import">Lancer un controle</button>')}
      <div class="grid grid-kpis">${statCard({label:"Anomalies ouvertes",value:String(open),status:open ? "warning" : "current",statusLabel:open ? "A traiter" : "Traite",meta:"K16"})}${statCard({label:"Bloquantes",value:String(blocked),status:blocked ? "blocking" : "current",statusLabel:blocked ? "Isolees" : "Zero",meta:"DQ"})}${statCard({label:"Lignes acceptees",value:"49",status:"current",statusLabel:"Valides",meta:"Run"})}${statCard({label:"Scan confidentialite",value:"0 hit",status:"current",statusLabel:"Sortie propre",meta:"DQ20/21"})}</div>
      <div style="margin-top:1rem">${tableShell("Journal des anomalies", `${anomalies.length} controles synthetiques`, [{label:"Regle"},{label:"Anomalie"},{label:"Severite"},{label:"Statut"},{label:"Reference"},{label:"Action"}], rows)}</div>${sourceFootnote()}</section>`;
  });
}

function workflowStage(state) {
  const openAnomalies = state.data.anomalies.filter((item) => item.status === "open");
  if (state.workflowStep === 0) return `<div class="drop-zone"><div><span class="eyebrow">Etape 1</span><h2>Selectionner une source de demonstration</h2><p>Seules les fixtures synthetiques peuvent etre chargees dans le prototype.</p><button class="button primary" type="button" data-action="select-source">Selectionner le lot synthetique</button></div></div>`;
  if (state.workflowStep === 1) return `<div><span class="eyebrow">Source selectionnee</span><h2>FIXTURE_BATCH_07</h2><p>Trois CSV couvrent les largeurs 38/51 colonnes et la section vide. Le manifest contient les empreintes sans ligne source.</p><div class="detail-grid"><div class="detail-item"><small>Classification</small><strong>synthetic-example</strong></div><div class="detail-item"><small>Run cible</small><strong>SPRINT2-WF-001</strong></div><div class="detail-item"><small>Fichiers logiques</small><strong>7 exports simules</strong></div><div class="detail-item"><small>Publication externe</small><strong>Interdite</strong></div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="run-structure">Controler la structure</button></div></div>`;
  if (state.workflowStep === 2) return `<div><span class="eyebrow">Controle termine</span><h2>${openAnomalies.length} anomalies a examiner</h2><p>Les cas bloquants restent en quarantaine. Ouvrez un detail pour simuler une resolution.</p><div class="progress-track" aria-label="Controle termine"><span style="width:100%"></span></div><div class="alert-list" style="margin-top:1rem">${state.data.anomalies.slice(0,5).map((item) => `<div class="alert-item"><span class="alert-symbol">${item.rule_id}</span><div><strong>${escapeHtml(item.title)}</strong><p>${item.record_ref}</p></div><button class="button secondary small" type="button" data-action="open-anomaly" data-anomaly="${item.anomaly_id}">Detail</button></div>`).join("")}</div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="quarantine-all">Quarantainer les cas bloquants</button></div></div>`;
  if (state.workflowStep === 3) return `<div><span class="eyebrow">Traitement simule</span><h2>Les enregistrements invalides sont isoles</h2><p>Les compteurs et motifs sont conserves ; aucune valeur source n'apparait dans le journal.</p>${miniBars([49,5,3,0], "49 lignes acceptees, 5 quarantaines, 3 avertissements, zero fuite")}<div style="margin-top:1rem"><button class="button primary" type="button" data-action="prepare-validation">Preparer la validation</button></div></div>`;
  if (state.workflowStep === 4) return `<div><span class="eyebrow">Validation du jeu</span><h2>Checklist de publication</h2><div class="alert-list"><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Contrats Silver et Gold</strong><p>Champs obligatoires presents.</p></div>${badge("Conforme", "current")}</div><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Confidentialite</strong><p>Denylist et motifs prives absents des sorties.</p></div>${badge("0 hit", "current")}</div><div class="alert-item"><span class="alert-symbol">OK</span><div><strong>Idempotence</strong><p>Deux executions, memes empreintes.</p></div>${badge("Conforme", "current")}</div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="validate-dataset">Valider le jeu synthetique</button></div></div>`;
  if (state.workflowStep === 5) return `<div><span class="eyebrow">Jeu valide</span><h2>Publier vers Serving prototype</h2><p>Cette publication reste locale et synthetique. Elle ne declenche aucun envoi vers un service externe.</p><div class="detail-grid"><div class="detail-item"><small>Cible</small><strong>Serving local</strong></div><div class="detail-item"><small>Classification</small><strong>synthetic-example</strong></div><div class="detail-item"><small>Identifiants prives</small><strong>0</strong></div><div class="detail-item"><small>Decision humaine</small><strong>Non requise pour fixture</strong></div></div><div style="margin-top:1rem"><button class="button primary" type="button" data-action="publish-dataset">Publier localement</button></div></div>`;
  return `<div><span class="eyebrow">Publication locale terminee</span><h2>Lineage disponible</h2><p>Le payload Serving synthetique est relie a son manifest et a ses fixtures opaques.</p><div class="lineage-chain"><div class="lineage-node"><strong>Fixture</strong><code>FIXTURE_01</code></div><div class="lineage-node"><strong>Silver</strong><code>REC_SNAPSHOT_01</code></div><div class="lineage-node"><strong>Gold</strong><code>LIN_KPI_K01</code></div><div class="lineage-node"><strong>Serving</strong><code>executive-aum</code></div></div><div style="margin-top:1rem"><button class="button secondary" type="button" data-nav="runs">Ouvrir le journal de run</button></div></div>`;
}

function importValidation(state) {
  return pageOrState(state, () => `<section class="page" data-page="import">${pageHeading("Parcours Analyste", "Import et validation", "Un workflow reellement interactif sur fixtures : selection, controle, anomalies, quarantaine, validation, publication et lineage.", '<button class="button secondary" type="button" data-action="reset-workflow">Reinitialiser</button>')}<div class="workflow"><aside class="card card-pad">${workflowSteps(state.workflowStep)}</aside><section class="card card-pad workflow-stage" aria-live="polite">${workflowStage(state)}</section></div>${sourceFootnote()}</section>`);
}

function runs(state) {
  return pageOrState(state, () => {
    const runRows = state.data.runs.map((run) => `<tr><td><code>${run.run_id}</code></td><td>${badge("Publie localement", "published")}</td><td>${run.generated_at.replace("T", " ").replace("Z", " UTC")}</td><td class="numeric">${run.accepted_records}</td><td class="numeric">${run.quarantined_records}</td><td><code>${run.manifest_ref}</code></td></tr>`).join("");
    const proofs = state.data.lineage_proofs.map((proof) => `<tr><td>${proof.screen_value_id}</td><td>${proof.kpi_id}</td><td><code>${proof.lineage_ref}</code></td><td><code>${proof.source_record_id}</code></td><td>${proof.business_date}</td></tr>`).join("");
    return `<section class="page" data-page="runs">${pageHeading("Run history & lineage", "Chaque chiffre garde sa piste.", "Manifest, statut, quarantaine et preuves ecran vers source synthetique sont consultables sans exposer les valeurs d'entree.", '<button class="button primary" type="button" data-nav="import">Nouveau run</button>')}
      ${tableShell("Journal des runs", "Run deterministe de preuve", [{label:"Run"},{label:"Statut"},{label:"Generation"},{label:"Acceptees",numeric:true},{label:"Quarantaines",numeric:true},{label:"Manifest"}], runRows)}
      <div style="margin-top:1rem">${tableShell("Preuves de lineage", "Trois traces minimales exigees par l'audit", [{label:"Valeur ecran"},{label:"KPI"},{label:"Lineage"},{label:"Record opaque"},{label:"Date"}], proofs)}</div>
      <div style="margin-top:1rem">${card("Chaine de preuve", "Exemple de la valeur executive-aum.", '<div class="lineage-chain"><div class="lineage-node"><strong>Manifest</strong><code>SPRINT2-WF-001</code></div><div class="lineage-node"><strong>Silver</strong><code>REC_SNAPSHOT_01</code></div><div class="lineage-node"><strong>Gold</strong><code>LIN_KPI_K01</code></div><div class="lineage-node"><strong>Ecran</strong><code>executive-aum</code></div></div>')}</div>${sourceFootnote()}</section>`;
  });
}

const renderers = { overview, funds, "fund-detail": fundDetail, performance, comparison, peers, quality, import: importValidation, runs };

export function renderPage(state) {
  return (renderers[state.view] || overview)(state);
}
