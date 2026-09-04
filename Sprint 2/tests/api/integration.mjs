import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPhpServer } from "../../scripts/php_runtime.mjs";

const filePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(filePath), "../../..");
const sprintRoot = path.join(repoRoot, "Sprint 2");

async function requestJson(apiUrl, route, expectedStatus = 200, options = {}) {
  const response = await fetch(`${apiUrl}/${route}`, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${route}: ${text.slice(0, 300)}`);
  }
  assert.equal(response.status, expectedStatus, `${route}: ${JSON.stringify(body)}`);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/);
  return { response, body };
}

function assertNoPrivateData(value) {
  const serialized = JSON.stringify(value);
  const forbidden = [
    /source_fund_id|asset_name_restricted|issuer_name_restricted|isin_restricted|items_json_restricted/i,
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,
    /\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/,
    /[A-Za-z]:\\Users\\/i,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /\b(?:gh[pousr]_|sk-)[A-Za-z0-9_-]{20,}\b/,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(serialized), false, `Private pattern in API response: ${pattern}`);
}

const server = await startPhpServer({ sprintRoot, port: 4180 });
try {
  const health = await requestJson(server.apiUrl, "health.php");
  assert.equal(health.body.status, "ok");
  assert.equal(health.body.database, "connected");
  assert.equal(health.body.classification, "local-restricted");
  assert.equal(health.body.funds, 14);
  assert.match(health.body.run_id, /^S3-[A-F0-9]{20}$/);

  const dashboard = await requestJson(server.apiUrl, "dashboard.php");
  assert.equal(dashboard.body.meta.runtime_source, "governed-mysql");
  assert.equal(dashboard.body.meta.publication_allowed, false);
  assert.equal(dashboard.body.funds.length, 14);
  assert.equal(dashboard.body.peer_sample.length, 0);
  assert.equal(dashboard.body.peer_status, "unavailable-pending-certification");
  assert.ok(dashboard.body.anomalies.length > 0);
  assertNoPrivateData(dashboard.body);

  const fundOne = await requestJson(server.apiUrl, "allocation.php?fund_id=FUND_01");
  const fundTwo = await requestJson(server.apiUrl, "allocation.php?fund_id=FUND_02");
  assert.equal(fundOne.body.fund_id, "FUND_01");
  assert.equal(fundTwo.body.fund_id, "FUND_02");
  assert.ok(fundOne.body.positions.length > 0 && fundTwo.body.positions.length > 0);
  assert.notDeepEqual(fundOne.body.positions.map((row) => row.id), fundTwo.body.positions.map((row) => row.id));
  assert.ok(Math.abs(fundOne.body.metrics.reconciliation_ratio - 1) < 0.01);
  assert.ok(Math.abs(fundOne.body.allocation.reduce((sum, row) => sum + row.weight, 0) - 1) < 0.01);
  const olderSnapshot = fundOne.body.available_snapshots.at(-1);
  const olderPortfolio = await requestJson(server.apiUrl, `allocation.php?fund_id=FUND_01&snapshot_date=${olderSnapshot}`);
  assert.equal(olderPortfolio.body.snapshot_date, olderSnapshot);
  await requestJson(server.apiUrl, "allocation.php?fund_id=FUND_99", 404);
  await requestJson(server.apiUrl, "allocation.php?fund_id=FUND_01&snapshot_date=2026-99-99", 400);
  await requestJson(server.apiUrl, `fund.php?id=${encodeURIComponent("FUND_01' OR 1=1 --")}`, 400);

  const performance1m = await requestJson(server.apiUrl, "performance.php?fund_id=FUND_01&period=1m");
  const performance12m = await requestJson(server.apiUrl, "performance.php?fund_id=FUND_01&period=12m");
  assert.ok(performance1m.body.history.length < performance12m.body.history.length);
  assert.notEqual(performance1m.body.window.start, performance12m.body.window.start);
  assert.notEqual(performance1m.body.metrics.period_return, performance12m.body.metrics.period_return);
  const first = performance1m.body.history[0].nav_index;
  const last = performance1m.body.history.at(-1).nav_index;
  assert.ok(Math.abs(performance1m.body.metrics.period_return - (last / first - 1)) < 1e-12);
  assert.ok(performance1m.body.metrics.daily_observations > 1);
  await requestJson(server.apiUrl, "performance.php?fund_id=FUND_01&period=all", 400);
  await requestJson(server.apiUrl, "performance.php?fund_id=FUND_01%27%20OR%201%3D1&period=12m", 400);

  const comparison = await requestJson(server.apiUrl, "internal_comparison.php?period=6m");
  assert.equal(comparison.body.funds.length, 14);
  assert.ok(comparison.body.window.start < comparison.body.window.end);
  assert.ok(comparison.body.funds.every((row) => Object.hasOwn(row, "period_return") && Object.hasOwn(row, "volatility")));
  await requestJson(server.apiUrl, "internal_comparison.php?period=24m", 400);

  const anomalies = await requestJson(server.apiUrl, "anomalies.php");
  assert.ok(anomalies.body.anomalies.every((row) => /^[a-f0-9]{20}$/.test(row.record_ref)));
  const blocking = await requestJson(server.apiUrl, "anomalies.php?severity=blocking&status=open");
  assert.ok(blocking.body.anomalies.length > 0);
  await requestJson(server.apiUrl, "anomalies.php?severity=blocking%27%20OR%201%3D1", 400);

  const runs = await requestJson(server.apiUrl, "runs.php");
  assert.ok(runs.body.runs.length >= 1);
  assert.equal(runs.body.source_files.length, 14);
  assert.ok(runs.body.lineage_proofs.length >= 10);
  assertNoPrivateData(runs.body);

  await requestJson(server.apiUrl, "health.php", 405, { method: "POST" });
  await requestJson(server.apiUrl, "health.php", 403, { headers: { Origin: "https://untrusted.example" } });
  const allowedCors = await requestJson(server.apiUrl, "health.php", 200, { headers: { Origin: "http://127.0.0.1:4173" } });
  assert.equal(allowedCors.response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");

  const dataSource = await readFile(path.join(sprintRoot, "src", "app", "js", "data.js"), "utf8");
  assert.equal(/serving_data\.json|createFallbackData|fallbackFunds|fallbackPositions/.test(dataSource), false, "Runtime JSON fallback remains in data.js");
  assert.match(dataSource, /dashboard\.php/);
  assert.match(dataSource, /allocation\.php/);
  assert.match(dataSource, /performance\.php/);

  process.stdout.write("API integration: real MySQL data, business calculations, fund/date windows, privacy, errors, CORS and lineage passed.\n");
} finally {
  await server.stop();
}

const originalDatabase = process.env.FUNDS_MANAGER_DB_NAME;
process.env.FUNDS_MANAGER_DB_NAME = "yvy_missing_database_for_error_test";
const failingServer = await startPhpServer({ sprintRoot, port: 4182 });
try {
  await requestJson(failingServer.apiUrl, "health.php", 503);
} finally {
  await failingServer.stop();
  if (originalDatabase === undefined) delete process.env.FUNDS_MANAGER_DB_NAME;
  else process.env.FUNDS_MANAGER_DB_NAME = originalDatabase;
}
