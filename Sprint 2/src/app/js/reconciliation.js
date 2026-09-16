import { escapeHtml as e, formatMoney, formatPercent, pageHeading, tableShell } from "./components.js";

export function reconciliationPage(state) {
  const filters=state.reconciliationFilters || {};
  const select=(key,label,values)=>`<label>${label}<select data-reconciliation-filter="${key}"><option value="">All</option>${values.map((v)=>`<option value="${e(v)}" ${filters[key]===v ? 'selected':''}>${e(v)}</option>`).join('')}</select></label>`;
  let body=`${select('result','Control result',['pass','fail','unavailable'])}${select('severity','Severity',['info','warning','blocking'])}${select('status','Review status',['open','resolved','quarantined','not-required'])}${select('run_id','Run',state.data.runs.map((r)=>r.run_id))}<label>Snapshot date<input type="date" data-reconciliation-filter="date" value="${e(filters.date || '')}"></label>`;
  body=`<div class="risk-tabs">${body}</div>`;
  if (state.reconciliationStatus!=='ready') body+=`<p role="status">${state.reconciliationStatus==='error' ? e(state.reconciliationError):'Loading reconciliation evidence...'}</p>`;
  else {
    const data=state.reconciliationData;
    const money=(value)=>value===null ? 'Unavailable':formatMoney(value,false);
    const rows=data.records.map((row)=>`<tr><td>${e(row.fund_code ?? 'Unavailable')}</td><td>${e(row.snapshot_date)}</td><td>${money(row.expected_nav)}</td><td>${money(row.holdings_total)}</td><td>${money(row.difference_value)}</td><td>${row.difference_fraction===null ? 'Unavailable':formatPercent(row.difference_fraction)}</td><td>${e(row.rule_status)} · ${e(row.severity)}<small>${e(row.rule_id)}</small></td><td>${e(row.review_status)}<small>${e(row.reviewed_by ?? '')}</small></td><td>${row.issue_id ? `<button class="button secondary" type="button" data-action="open-anomaly" data-anomaly="${e(row.issue_id)}" data-review-context="reconciliation">Review</button>`:'No review required'}</td></tr>`).join('');
    body+=`<p>${e(data.basis)}</p>`+tableShell('Reconciliation evidence',`${data.records.length} records on this page`,['Fund','Snapshot','Expected NAV','Portfolio total','Difference','Difference %','Control','Review status','Action'].map((label)=>({label})),rows);
    if (!data.records.length) body+='<p>No reconciliation evidence matches these filters.</p>';
    body+=`<div class="risk-tabs"><button class="button secondary" type="button" data-action="reconciliation-page" data-offset="${Math.max(0,data.offset-100)}" ${data.offset===0 ? 'disabled':''}>Previous</button><button class="button secondary" type="button" data-action="reconciliation-page" data-offset="${data.next_offset ?? 0}" ${data.next_offset===null ? 'disabled':''}>Next</button></div>`;
  }
  return `<section class="page" data-page="reconciliation">${pageHeading('Analyst governance',`${state.selectedFund} · Reconciliation`,'Compare portfolio totals with the matching NAV. Source controls and review decisions remain distinct.')}${body}</section>`;
}
