import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const filePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(filePath), "../../..");
const sprintRoot = path.join(repoRoot, "Sprint 2");
const baseUrl = "http://127.0.0.1:4173/src/app/";

const server = spawn("py", ["-3.12", "-m", "http.server", "4173", "--directory", sprintRoot], {
  cwd: repoRoot,
  stdio: "ignore",
  windowsHide: true,
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Local prototype server did not start");
}

let browser;
try {
  await waitForServer();
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  const reportAssetDir = path.join(repoRoot, "Sprint 2", "assets", "report-captures");
  async function captureReportAsset(name) {
    if (!process.env.CAPTURE_REPORTS) return;
    await mkdir(reportAssetDir, { recursive: true });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const sidebar = document.querySelector(".sidebar");
      if (sidebar) sidebar.scrollTop = 0;
    });
    await page.waitForTimeout(700);
    if (await page.locator(".toast").count()) await page.waitForTimeout(2400);
    await page.screenshot({ path: path.join(reportAssetDir, `${name}.png`) });
  }

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
  await captureReportAsset("01-executive-overview");
  if (process.env.CAPTURE_ARTIFACTS) {
    const artefactDir = path.join(repoRoot, "Sprint 2", "assets", "test-artifacts");
    await mkdir(artefactDir, { recursive: true });
    await page.screenshot({ path: path.join(artefactDir, "sprint2-desktop.png"), fullPage: true });
  }
  assert.equal(await page.locator(".nav-item").count(), 9);
  assert.equal(await page.locator("[onclick]").count(), 0);

  const views = ["overview", "funds", "fund-detail", "performance", "comparison", "peers", "quality", "import", "runs"];
  const scenarios = ["current", "loading", "late", "incomplete", "empty", "error", "denied", "no-match", "sample", "hypothesis"];
  const residualFrench = /\b(?:Vue generale|Donnees?|A jour|En retard|A valider|Qualite|Fonds|Comparaison|Chargement|Aucune|Acces refuse|Hypothese|Parcours|Revenir|Controle|Selectionner|Quarantainer|Valider le jeu|Publier localement|Fraicheur|Encours|Rendement|Volatilite|Indisponible|Lignes?|Severite|Statut|Regle|Ecran|Chaine de preuve|synthetique)\b/i;

  for (const view of views) {
    await page.locator(`.nav-item[data-view="${view}"]`).click();
    await page.locator(`[data-page="${view}"]`).waitFor();
  }

  for (const scenario of scenarios) {
    await page.locator("#scenario-select").selectOption(scenario);
    for (const view of views) {
      await page.locator(`.nav-item[data-view="${view}"]`).click();
      await page.locator("#app-view").waitFor();
      const visibleCopy = await page.locator("body").innerText();
      assert.equal(residualFrench.test(visibleCopy), false, `Residual French copy in ${view}/${scenario}`);
    }
  }
  await page.locator("#scenario-select").selectOption("sample");
  await page.locator('.nav-item[data-view="overview"]').click();

  await page.getByRole("button", { name: "Funds", exact: true }).click();
  await page.getByRole("button", { name: "FUND_01", exact: true }).first().click();
  const allPositions = await page.locator("tbody tr").count();
  await page.getByRole("button", { name: /Private credit/ }).click();
  const filteredPositions = await page.locator("tbody tr").count();
  assert.ok(filteredPositions > 0 && filteredPositions < allPositions);
  await captureReportAsset("02-fund-allocation-filtered");

  await page.locator('.nav-item[data-view="performance"]').click();
  await captureReportAsset("03-performance-risk");
  await page.locator('.nav-item[data-view="comparison"]').click();
  await captureReportAsset("04-internal-comparison");
  await page.locator('.nav-item[data-view="peers"]').click();
  await captureReportAsset("05-peer-comparison");
  await page.locator('.nav-item[data-view="quality"]').click();
  await captureReportAsset("06-data-quality");

  await page.locator("#role-select").selectOption("analyst");
  await page.getByRole("button", { name: "Select synthetic batch" }).click();
  await page.getByRole("button", { name: "Check structure" }).click();
  await captureReportAsset("07-import-control");
  await page.getByRole("button", { name: "Details" }).first().click();
  assert.equal(await page.locator("#anomaly-dialog").getAttribute("open"), "");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Quarantine blocking cases" }).click();
  await page.getByRole("button", { name: "Prepare validation" }).click();
  await page.getByRole("button", { name: "Validate synthetic dataset" }).click();
  await page.getByRole("button", { name: "Publish locally" }).click();
  await page.getByRole("heading", { name: "Lineage available" }).waitFor();
  await page.locator('.nav-item[data-view="runs"]').click();
  await captureReportAsset("08-runs-lineage");

  await page.locator("#scenario-select").selectOption("error");
  await page.getByRole("heading", { name: "The control failed" }).waitFor();
  await page.getByRole("button", { name: "Return to sample data" }).click();
  for (const scenario of scenarios) {
    await page.locator("#scenario-select").selectOption(scenario);
    assert.equal(await page.locator("#scenario-select").inputValue(), scenario);
  }
  await page.locator("#scenario-select").selectOption("sample");

  for (const viewport of [{ width: 1024, height: 900 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
    const intermediateOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(intermediateOverflow <= 1, `Unexpected horizontal overflow at ${viewport.width}px: ${intermediateOverflow}px`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await captureReportAsset("09-mobile-overview");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Unexpected horizontal overflow: ${overflow}px`);
  await page.getByRole("button", { name: "Open or close navigation" }).click();
  await page.locator(".nav-item").first().focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-view")), "funds");
  if (process.env.CAPTURE_ARTIFACTS) await page.screenshot({ path: path.join(repoRoot, "Sprint 2", "assets", "test-artifacts", "sprint2-mobile.png"), fullPage: true });
  assert.deepEqual(consoleErrors, []);
  process.stdout.write("Web smoke: navigation, drill-down, analyst workflow, states, keyboard and responsive checks passed.\n");
} finally {
  if (browser) await browser.close();
  server.kill();
}
