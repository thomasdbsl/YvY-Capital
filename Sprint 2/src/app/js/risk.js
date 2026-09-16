import { escapeHtml as e, formatPercent, statCard, tableShell, pageHeading, card } from "./components.js";

const number = (value) => value === null || value === undefined ? "Unavailable" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });

function bars(rows, label, percent = false) {
  const valid = rows.filter((row) => Number.isFinite(row.value));
  if (!valid.length) return "<p>Unavailable for this fund/date.</p>";
  const max = Math.max(...valid.map((row) => Math.abs(row.value)), 1e-12);
  return `<div class="risk-bars" role="img" aria-label="${e(label)}; exact values are in the accompanying table.">${valid.map((row) => `<div><span>${e(row.label)}</span><meter min="0" max="${max}" value="${Math.abs(row.value)}" aria-label="${e(row.label)}">${number(row.value)}</meter><strong>${percent ? formatPercent(row.value) : number(row.value)}</strong></div>`).join("")}</div>`;
}

export function riskPage(state) {
  const heading = pageHeading("Risk Analytics", `${state.selectedFund} · Risk Analytics`, "Source-backed risk information. Missing values remain unavailable.");
  if (state.riskStatus !== "ready") return `<section class="page" data-page="risk">${heading}<p role="status">${state.riskStatus === "error" ? e(state.riskError) : "Loading risk data..."}</p></section>`;
  const data = state.riskData;
  const metrics = data.metrics;
  const tabs = ["overview", "drawdown", "liquidity", "stress", "dv01"];
  const selected = state.riskTab || "overview";
  const nav = `<nav class="risk-tabs" aria-label="Risk views">${tabs.map((tab) => `<button class="button secondary" type="button" data-action="risk-tab" data-tab="${tab}" ${selected === tab ? 'aria-current="page"' : ""}>${tab === "dv01" ? "DV01" : tab[0].toUpperCase()+tab.slice(1)}</button>`).join("")}</nav>`;
  let body = "";
  if (selected === "overview") {
    body = `<div class="grid grid-kpis">${[["Volatility",metrics.volatility,true],["Sharpe",metrics.sharpe,false],["Sortino",metrics.sortino,false],["Maximum drawdown",metrics.maximum_drawdown,true]].map(([label,value,pct]) => statCard({label,value:value == null ? "Unavailable" : pct ? formatPercent(value) : number(value),status:value == null ? "unavailable" : "current",statusLabel:value == null ? "Unavailable":"Calculated",meta:"Risk"})).join("")}</div>
    <p>Volatility measures return variability. Sharpe relates excess return to volatility; Sortino uses downside variability. All three reuse the Performance calculation and its available history.</p>
    ${metrics.risk_metrics_status === "unavailable-insufficient-history" ? `<p role="status">Risk-return metrics require at least ${e(metrics.minimum_risk_observations)} daily returns; ${e(metrics.daily_observations)} are available.</p>` : `<p>${e(metrics.daily_observations)} daily returns meet the configured minimum of ${e(metrics.minimum_risk_observations)}.</p>`}`;
  } else if (selected === "liquidity") {
    const rows=data.liquidity.horizons;
    body=card("Liquidity by horizon",`${data.liquidity.status} · % of NAV liquidatable within X business days`,bars(rows.map((r)=>({label:`${r.business_days} days`,value:r.fraction})),"Liquidity by business-day horizon",true))+
      tableShell("Liquidity observations","Only available source horizons; no interpolation",[{label:"As of"},{label:"Business days"},{label:"% of NAV"}],rows.map((r)=>`<tr><td>${e(r.date)}</td><td>${r.business_days}</td><td>${r.fraction === null ? "Unavailable" : formatPercent(r.fraction)}</td></tr>`).join(""));
  } else if (selected === "drawdown") {
    const rows=data.drawdown.history;
    const width=720,height=220;
    const min=Math.min(0,...rows.map((r)=>r.drawdown));
    const points=rows.map((r,i)=>`${50+i/Math.max(1,rows.length-1)*640},${35+(r.drawdown/(min || -1))*140}`).join(" ");
    const chart=rows.length ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Drawdown percent over date; exact values follow"><text x="4" y="20">Drawdown %</text><text x="5" y="40">0%</text><text x="5" y="175">${formatPercent(min)}</text><line x1="50" y1="35" x2="690" y2="35" stroke="currentColor"/><polyline points="${points}" fill="none" stroke="#5b3978" stroke-width="3"/><text x="50" y="205">${e(rows[0].date)}</text><text x="690" y="205" text-anchor="end">${e(rows.at(-1).date)}</text></svg>` : "<p>Drawdown unavailable for this fund/window.</p>";
    body=card("Drawdown","Distance below the source historical peak",chart+`<p>Current: ${data.drawdown.current == null ? "Unavailable":formatPercent(data.drawdown.current)} · Maximum in window: ${data.drawdown.maximum == null ? "Unavailable":formatPercent(data.drawdown.maximum)}</p>`)+
      `<details><summary>Drawdown observations</summary>${tableShell("Source drawdown","Daily fractions from the validated source",[{label:"Date"},{label:"Drawdown %"}],rows.map((r)=>`<tr><td>${e(r.date)}</td><td>${formatPercent(r.drawdown)}</td></tr>`).join(""))}</details>`;
  } else if (selected === "stress") {
    const stress=data.stress;
    const scenario=stress.scenarios.find((item)=>item.id === state.stressScenario) || stress.scenarios[0];
    body=card("Stress scenarios",stress.unit,scenario ? `<label for="stress-scenario">Scenario</label><select id="stress-scenario">${stress.scenarios.map((item)=>`<option value="${e(item.id)}" ${item.id === scenario.id ? "selected":""}>${e(item.id)}</option>`).join("")}</select><p>As of ${e(stress.date)} · Total impact (source nav_diff): ${number(scenario.nav_diff)} · Source nav_percent: ${number(scenario.nav_percent)}</p><p>Scenario and asset-group names are masked. Source values are shown without rescaling.</p>` : "<p>Stress results are unavailable for this fund/date.</p>");
    if (scenario) body+=tableShell("Stress breakdown","Source impact by masked asset group",[{label:"Asset group"},{label:"Source nav_diff"},{label:"Source nav_percent"}],scenario.groups.map((group)=>`<tr><td>${e(group.group)}</td><td>${number(group.nav_diff)}</td><td>${number(group.nav_percent)}</td></tr>`).join(""));
  } else {
    const dv=data.dv01;
    body=card("Interest-rate sensitivity",`${dv.status} · ${dv.unit}`,bars(dv.factors.map((r)=>({label:r.factor,value:r.value})),"Absolute DV01 bar lengths; signed source values are shown")+`<p>As of ${e(dv.date ?? "Unavailable")} · Arithmetic sum of source values: ${number(dv.total)}</p><p>Factor identifiers are masked. Null values mean unavailable or not applicable.</p>`)+
      tableShell("DV01 detail","Sorted by absolute source contribution",[{label:"Item"},{label:"Risk factor"},{label:"Vertex"},{label:"DV01 source value"},{label:"Financial value"}],dv.items.map((r)=>`<tr><td>${e(r.item_code)}</td><td>${e(r.risk_factor_code)}</td><td>${number(r.risk_factor_vertex)}</td><td>${number(r.dv01_notional_value)}</td><td>${number(r.financial_value)}</td></tr>`).join(""));
  }
  const window=data.window;
  return `<section class="page" data-page="risk">${heading}<p>${window ? `Requested: ${e(window.requested_start)} to ${e(window.requested_end)}. Available: ${e(window.start)} to ${e(window.end)} (${e(window.coverage_status)}).` : "Return history unavailable; other source dates are shown separately."}</p>${nav}${body}</section>`;
}
