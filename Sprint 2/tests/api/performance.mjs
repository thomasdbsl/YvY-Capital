import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startPhpServer, resolvePhpRuntime } from "../../scripts/php_runtime.mjs";
import { provisionQaAccount, loginCookie, loginPage } from "../auth_helpers.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sprintRoot = path.join(root, "Sprint 2");
assert.match(process.env.FUNDS_MANAGER_DB_NAME || "", /_sprint4_qa$/, "Performance checks require the Sprint 4 QA database");

const runtime = resolvePhpRuntime();
const phpArguments = runtime.ini ? ["-c", runtime.ini] : [];
phpArguments.push(path.join(sprintRoot, "tests/api/performance_db.php"));
const explain = spawnSync(runtime.executable, phpArguments, { env: process.env, encoding: "utf8", windowsHide: true });
assert.equal(explain.status, 0, explain.stderr);
const indexEvidence = JSON.parse(explain.stdout);
assert.deepEqual(Object.keys(indexEvidence), ["quality", "reconciliation", "returns", "dv01"]);

const credentials = provisionQaAccount("qa_performance");
const previousOrigins = process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = "http://127.0.0.1:4196";
const server = await startPhpServer({ sprintRoot, port: 4196 });
if (previousOrigins === undefined) delete process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
else process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = previousOrigins;

let browser;
try {
  const cookie = await loginCookie(server.apiUrl, credentials);
  const endpointTimings = {};
  for (const route of [
    "dashboard.php", "performance.php?fund_id=FUND_01&period=12m", "risk.php?fund_id=FUND_01&period=12m",
    "anomalies.php?severity=blocking", "reconciliation.php?fund_id=FUND_01", "runs.php",
  ]) {
    const samples = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const started = performance.now();
      const response = await fetch(`${server.apiUrl}/${route}`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) });
      if (response.status !== 200) throw new Error(`${route}: ${response.status} ${await response.text()}`);
      await response.arrayBuffer();
      samples.push(Number((performance.now() - started).toFixed(2)));
    }
    endpointTimings[route.split("?")[0]] = { min_ms: Math.min(...samples), median_ms: samples.sort((a,b) => a-b)[1], max_ms: Math.max(...samples) };
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) => browserErrors.push(`${request.method()} ${request.url()}`));
  const appStarted = performance.now();
  await page.goto(server.appUrl);
  await loginPage(page, credentials);
  await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
  const authenticatedLoadMs = Number((performance.now() - appStarted).toFixed(2));
  const riskStarted = performance.now();
  await page.locator('.nav-item[data-view="risk"]').click();
  await page.getByRole("button", { name: "Liquidity", exact: true }).waitFor();
  const riskViewMs = Number((performance.now() - riskStarted).toFixed(2));
  assert.deepEqual(browserErrors, []);
  console.log(JSON.stringify({ endpoint_timings: endpointTimings, browser_ms: { authenticated_load: authenticatedLoadMs, risk_view: riskViewMs }, indexes: indexEvidence }));
} finally {
  await browser?.close();
  await server.stop();
}
