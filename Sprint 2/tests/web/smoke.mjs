import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startPhpServer } from "../../scripts/php_runtime.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const filePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(filePath), "../../..");
const sprintRoot = path.join(repoRoot, "Sprint 2");
const testPort = Number.parseInt(process.env.FUNDS_MANAGER_TEST_HTTP_PORT || "4193", 10);
const server = await startPhpServer({ sprintRoot, port: testPort });
const baseUrl = server.appUrl;

let browser;
try {
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const dataRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", (request) => { if (/\/api\//.test(request.url())) dataRequests.push(request.url()); });

  const reportAssetDir = path.join(repoRoot, "Sprint 2", "assets", "report-captures");
  async function captureReportAsset(name) {
    if (!process.env.CAPTURE_REPORTS) return;
    await mkdir(reportAssetDir, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(reportAssetDir, `${name}.png`) });
  }

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
  assert.equal(dataRequests.some((url) => url.endsWith("/api/dashboard.php")), true);
  assert.equal(dataRequests.some((url) => url.includes("serving_data.json")), false);
  assert.equal(await page.locator(".nav-item").count(), 9);
  assert.equal(await page.locator("[onclick]").count(), 0);
  assert.match(await page.locator("#source-status").innerText(), /^S3-[A-F0-9]{20}/);
  await captureReportAsset("01-executive-overview-sprint3");

  const views = ["overview", "funds", "fund-detail", "performance", "comparison", "peers", "quality", "import", "runs"];
  for (const view of views) {
    await page.locator(`.nav-item[data-view="${view}"]`).click();
    await page.locator(`[data-page="${view}"]`).waitFor();
  }

  await page.locator("#fund-select").selectOption("FUND_01");
  await page.locator('.nav-item[data-view="fund-detail"]').click();
  await page.getByRole("heading", { name: /^FUND_01/ }).waitFor();
  const fundOnePositions = await page.locator("tbody tr").count();
  assert.ok(fundOnePositions > 0);
  const firstAllocation = page.locator(".allocation-button").first();
  await firstAllocation.click();
  const filteredPositions = await page.locator("tbody tr").count();
  assert.ok(filteredPositions > 0 && filteredPositions < fundOnePositions);
  await page.getByRole("button", { name: "Show all positions" }).click();

  await page.locator("#fund-select").selectOption("FUND_02");
  await page.getByRole("heading", { name: /^FUND_02/ }).waitFor();
  const fundTwoPositions = await page.locator("tbody tr").count();
  assert.notEqual(fundTwoPositions, fundOnePositions);
  const snapshots = await page.locator("#snapshot-select option").allTextContents();
  assert.ok(snapshots.length > 1);
  const olderSnapshot = snapshots.at(-1);
  await page.locator("#snapshot-select").selectOption(olderSnapshot);
  await page.getByRole("heading", { name: new RegExp(`FUND_02.*${olderSnapshot}`) }).waitFor();
  await captureReportAsset("02-fund-allocation-sprint3");

  await page.locator('.nav-item[data-view="performance"]').click();
  await page.locator("#period-select").selectOption("1m");
  const periodCard = page.locator(".stat-card").filter({ hasText: "Period return" });
  const oneMonthReturn = await periodCard.locator(".stat-value").innerText();
  await page.locator("#period-select").selectOption("12m");
  const twelveMonthReturn = await periodCard.locator(".stat-value").innerText();
  assert.notEqual(oneMonthReturn, twelveMonthReturn);
  assert.ok(dataRequests.some((url) => url.includes("performance.php") && url.includes("period=1m")));
  assert.ok(dataRequests.some((url) => url.includes("internal_comparison.php") && url.includes("period=12m")));
  await captureReportAsset("03-performance-risk-sprint3");

  await page.locator('.nav-item[data-view="comparison"]').click();
  assert.equal(await page.locator("tbody tr").count(), 14);
  await page.locator('.nav-item[data-view="peers"]').click();
  await page.getByRole("heading", { name: "Peer data is not yet certified." }).waitFor();
  assert.match(await page.locator("main").innerText(), /No governed peer dataset/);

  await page.locator('.nav-item[data-view="quality"]').click();
  await page.getByRole("button", { name: "Details" }).first().click();
  assert.equal(await page.locator("#anomaly-dialog").getAttribute("open"), "");
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.locator("#role-select").selectOption("analyst");
  await page.getByRole("heading", { name: "Import and validation" }).waitFor();
  assert.match(await page.locator("main").innerText(), /Successful governed ingestion/i);
  await page.locator('.nav-item[data-view="runs"]').click();
  assert.ok(await page.locator("tbody tr").count() > 10);
  await captureReportAsset("04-runs-lineage-sprint3");

  const residualRuntimeTerms = /Synthetic source|synthetic positions|Fully synthetic values|Select synthetic batch|SPRINT2-WF-001/i;
  assert.equal(residualRuntimeTerms.test(await page.locator("body").innerText()), false);
  const scenarios = ["loading", "late", "incomplete", "empty", "error", "denied", "no-match", "hypothesis"];
  for (const scenario of scenarios) {
    await page.locator("#scenario-select").selectOption(scenario);
    assert.equal(await page.locator("#scenario-select").inputValue(), scenario);
  }
  await page.locator("#scenario-select").selectOption("error");
  await page.getByRole("heading", { name: "The control failed" }).waitFor();
  await page.getByRole("button", { name: "Return to current data" }).click();

  for (const viewport of [{ width: 1024, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `Unexpected horizontal overflow at ${viewport.width}px: ${overflow}px`);
  }
  await page.getByRole("button", { name: "Open or close navigation" }).click();
  await page.locator(".nav-item").first().focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-view")), "funds");
  assert.deepEqual(consoleErrors, []);
  process.stdout.write("Web smoke: real fund/snapshot/period queries, nine views, unavailable states, governance, keyboard and responsive checks passed.\n");
} finally {
  if (browser) await browser.close();
  await server.stop();
}
