import { escapeHtml as e, pageHeading, statCard, tableShell, badge } from "./components.js";

const categories = ["DATA_QUALITY","PERFORMANCE","ALLOCATION","RISK","RECONCILIATION","OTHER"];
const priorities = ["LOW","NORMAL","HIGH"];
const statuses = ["OPEN","IN_REVIEW","RESOLVED"];
const contexts = ["overview","funds","fund-detail","performance","comparison","peers","risk","reconciliation","quality","import","runs","tickets"];
const words = (value) => value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const optionList = (values, selected = "") => values.map((value) => `<option value="${e(value)}" ${value === selected ? "selected" : ""}>${e(words(value))}</option>`).join("");

function filters(state) {
  const values=state.ticketFilters || {};
  const select=(key,label,items)=>`<label>${label}<select data-ticket-filter="${key}"><option value="">All</option>${optionList(items,values[key] || "")}</select></label>`;
  return `<div class="risk-tabs ticket-filters">${select("status","Status",statuses)}${select("category","Category",categories)}${select("priority","Priority",priorities)}</div>`;
}

function creationForm(state) {
  if (state.role !== "direction") return "";
  return `<section class="card card-pad ticket-create"><h2>Create analyst request</h2><p>Ask a focused question without including private source identifiers.</p>
    <form id="ticket-create-form" class="ticket-form">
      <label>Title<input name="title" required minlength="5" maxlength="160"></label>
      <label class="span-2">Description<textarea name="description" required minlength="10" maxlength="2000"></textarea></label>
      <label>Category<select name="category">${optionList(categories,"OTHER")}</select></label>
      <label>Priority<select name="priority">${optionList(priorities,"NORMAL")}</select></label>
      <label>Related fund<select name="related_fund"><option value="">None</option>${state.data.funds.map((fund)=>`<option value="${e(fund.id)}" ${fund.id===state.selectedFund ? "selected":""}>${e(fund.id)}</option>`).join("")}</select></label>
      <label>Related page<select name="related_context"><option value="">None</option>${optionList(contexts)}</select></label>
      <p class="span-2" id="ticket-form-error" role="alert"></p><button class="button primary" type="submit">Send to Analyst</button>
    </form></section>`;
}

function ticketDetail(state) {
  if (!state.selectedTicketId) return "";
  if (state.ticketDetailStatus === "loading") return '<section class="card card-pad"><p role="status">Loading ticket history...</p></section>';
  if (state.ticketDetailStatus === "error") return `<section class="card card-pad"><p role="alert">${e(state.ticketDetailError)}</p></section>`;
  const ticket=state.ticketDetail?.ticket;
  if (!ticket) return "";
  const history=(ticket.history || []).map((event)=>`<li><strong>${e(words(event.event_type))}</strong> · ${e(event.occurred_at)} · ${e(event.username)} (${e(event.role)}) · ${e(event.new_status)}${event.response ? `<p>${e(event.response)}</p>`:""}</li>`).join("");
  const audit=(ticket.audit || []).map((event)=>`<li><strong>${e(words(event.action))}</strong> · ${e(event.occurred_at)} · ${e(event.username)} (${e(event.role)})</li>`).join("");
  const analystForm=state.role === "analyst" && ticket.status !== "RESOLVED" ? `<form id="ticket-update-form" class="ticket-form" data-ticket-id="${e(ticket.ticket_id)}" data-revision="${ticket.revision}">
    <label>Status<select name="status">${optionList(statuses,ticket.status)}</select></label>
    <label class="span-2">Analyst response<textarea name="response" maxlength="2000">${e(ticket.analyst_response)}</textarea></label>
    <p class="span-2" id="ticket-update-error" role="alert"></p><button class="button primary" type="submit">Save response and status</button></form>` : "";
  return `<section class="card card-pad ticket-detail" aria-labelledby="ticket-detail-title"><div class="card-header"><div><span class="eyebrow">${e(ticket.ticket_id)}</span><h2 id="ticket-detail-title">${e(ticket.title)}</h2></div>${badge(words(ticket.status),ticket.status.toLowerCase())}</div>
    <div class="detail-grid"><div class="detail-item"><small>Executive</small><strong>${e(ticket.creator)}</strong></div><div class="detail-item"><small>Category / priority</small><strong>${e(words(ticket.category))} · ${e(words(ticket.priority))}</strong></div><div class="detail-item"><small>Fund / context</small><strong>${e(ticket.related_fund || "None")} · ${e(ticket.related_context || "None")}</strong></div><div class="detail-item"><small>Created</small><strong>${e(ticket.created_at)}</strong></div></div>
    <h3>Request</h3><p>${e(ticket.description)}</p><h3>Current Analyst response</h3><p>${e(ticket.analyst_response || "No response yet.")}</p>${analystForm}<h3>Immutable history</h3><ol class="ticket-history">${history}</ol><h3>Governance audit</h3><p class="muted">Audit entries record actions and status metadata, never the response text.</p><ol class="ticket-history" data-testid="ticket-audit">${audit}</ol></section>`;
}

export function ticketsPage(state) {
  const heading=pageHeading("Executive / Analyst workflow","Tickets",state.role === "analyst" ? "Review every Executive request, respond, and preserve its audit trail." : "Create focused requests and follow the Analyst response.");
  if (state.ticketsStatus !== "ready") return `<section class="page" data-page="tickets">${heading}<p role="status">${state.ticketsStatus === "error" ? e(state.ticketsError) : "Loading tickets..."}</p></section>`;
  const data=state.ticketsData;
  const rows=data.records.map((ticket)=>`<tr><td><button class="table-button" type="button" data-action="select-ticket" data-ticket-id="${e(ticket.ticket_id)}">${e(ticket.ticket_id)}</button></td><td>${e(ticket.created_at)}</td><td>${e(ticket.creator)}</td><td>${e(words(ticket.category))}</td><td>${e(ticket.related_fund || "None")}</td><td>${badge(words(ticket.priority),ticket.priority === "HIGH" ? "warning":"info")}</td><td>${badge(words(ticket.status),ticket.status.toLowerCase())}</td><td>${e(ticket.title)}</td></tr>`).join("");
  return `<section class="page" data-page="tickets">${heading}<div class="grid grid-thirds">
    ${statCard({label:"Open",value:String(data.summary.OPEN),status:data.summary.OPEN ? "warning":"current",statusLabel:"Queue",meta:"Tickets"})}
    ${statCard({label:"In review",value:String(data.summary.IN_REVIEW),status:"info",statusLabel:"Analyst",meta:"Tickets"})}
    ${statCard({label:"Resolved",value:String(data.summary.RESOLVED),status:"resolved",statusLabel:"Complete",meta:"Tickets"})}</div>
    ${creationForm(state)}${filters(state)}${tableShell(state.role === "analyst" ? "Executive requests":"My requests",`${data.records.length} ticket(s) in this view`,[{label:"Ticket"},{label:"Created"},{label:"Executive"},{label:"Category"},{label:"Fund"},{label:"Priority"},{label:"Status"},{label:"Title"}],rows)}
    ${data.records.length ? "":"<p>No tickets match these filters.</p>"}${ticketDetail(state)}</section>`;
}
