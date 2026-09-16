import { API_BASE_URL } from "./config.js";
import { csrfToken } from "./auth.js";

export function loadReview(issueId) { return request("review.php", { issue_id: issueId }); }
export function loadIssues(filters = {}) { return request("anomalies.php", filters); }
export function loadRisk(fundId, period) { return request("risk.php", { fund_id: fundId, period }); }
export function loadReconciliation(fundId, filters = {}) { return request("reconciliation.php", { fund_id: fundId, ...filters }); }

export async function saveReview(body) {
  const response = await fetch(`${API_BASE_URL}/review.php`, {
    method: "POST", cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() }, body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event("session-expired"));
  if (!response.ok) throw new Error(payload?.error?.message || "Review could not be saved");
  return payload;
}

function assertDashboardContract(data) {
  const requiredArrays = ["funds", "positions", "history", "kpis", "allocation", "anomalies", "runs", "lineage_proofs", "pipeline_stages", "source_files", "peer_sample"];
  if (data?.meta?.classification !== "local-restricted" || data.meta.runtime_source !== "governed-mysql") {
    throw new Error("The API did not return the governed Sprint 3 contract.");
  }
  for (const field of requiredArrays) {
    if (!Array.isArray(data[field])) throw new Error(`The API response is missing ${field}.`);
  }
}

async function request(endpoint, parameters = {}) {
  const query = new URLSearchParams(Object.entries(parameters).filter(([, value]) => value !== null && value !== undefined));
  const suffix = query.size ? `?${query}` : "";
  const response = await fetch(`${API_BASE_URL}/${endpoint}${suffix}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("session-expired"));
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.error?.message ? `: ${payload.error.message}` : "";
    } catch {}
    throw new Error(`Funds Manager API unavailable (${response.status})${detail}`);
  }
  return response.json();
}

export async function loadData() {
  const data = await request("dashboard.php");
  assertDashboardContract(data);
  return data;
}

export function loadPortfolio(fundId, snapshotDate = null) {
  return request("allocation.php", { fund_id: fundId, snapshot_date: snapshotDate });
}

export function loadPerformance(fundId, period) {
  return request("performance.php", { fund_id: fundId, period });
}

export function loadInternalComparison(period, fundA = null, fundB = null) {
  return request("internal_comparison.php", { period, fund_a: fundA, fund_b: fundB });
}
