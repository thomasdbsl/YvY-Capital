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
const baseUrl = "http://127.0.0.1:4173/app/";

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

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Une vue nette avant chaque decision." }).waitFor();
  if (process.env.CAPTURE_ARTIFACTS) {
    const artefactDir = path.join(repoRoot, "artifacts");
    await mkdir(artefactDir, { recursive: true });
    await page.screenshot({ path: path.join(artefactDir, "sprint2-desktop.png"), fullPage: true });
  }
  assert.equal(await page.locator(".nav-item").count(), 9);
  assert.equal(await page.locator("[onclick]").count(), 0);

  for (const view of ["overview", "funds", "fund-detail", "performance", "comparison", "peers", "quality", "import", "runs"]) {
    await page.locator(`.nav-item[data-view="${view}"]`).click();
    await page.locator(`[data-page="${view}"]`).waitFor();
  }
  await page.locator('.nav-item[data-view="overview"]').click();

  await page.getByRole("button", { name: "Fonds", exact: true }).click();
  await page.getByRole("button", { name: "FUND_01", exact: true }).first().click();
  const allPositions = await page.locator("tbody tr").count();
  await page.getByRole("button", { name: /Credit prive/ }).click();
  const filteredPositions = await page.locator("tbody tr").count();
  assert.ok(filteredPositions > 0 && filteredPositions < allPositions);

  await page.locator("#role-select").selectOption("analyst");
  await page.getByRole("button", { name: "Selectionner le lot synthetique" }).click();
  await page.getByRole("button", { name: "Controler la structure" }).click();
  await page.getByRole("button", { name: "Detail" }).first().click();
  assert.equal(await page.locator("#anomaly-dialog").getAttribute("open"), "");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Quarantainer les cas bloquants" }).click();
  await page.getByRole("button", { name: "Preparer la validation" }).click();
  await page.getByRole("button", { name: "Valider le jeu synthetique" }).click();
  await page.getByRole("button", { name: "Publier localement" }).click();
  await page.getByRole("heading", { name: "Lineage disponible" }).waitFor();

  await page.locator("#scenario-select").selectOption("error");
  await page.getByRole("heading", { name: "Le controle a echoue" }).waitFor();
  await page.getByRole("button", { name: "Revenir aux donnees d'exemple" }).click();
  for (const scenario of ["current", "loading", "late", "incomplete", "empty", "error", "denied", "no-match", "sample", "hypothesis"]) {
    await page.locator("#scenario-select").selectOption(scenario);
    assert.equal(await page.locator("#scenario-select").inputValue(), scenario);
  }
  await page.locator("#scenario-select").selectOption("sample");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Unexpected horizontal overflow: ${overflow}px`);
  await page.getByRole("button", { name: "Ouvrir ou fermer la navigation" }).click();
  await page.locator(".nav-item").first().focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-view")), "funds");
  if (process.env.CAPTURE_ARTIFACTS) await page.screenshot({ path: path.join(repoRoot, "artifacts", "sprint2-mobile.png"), fullPage: true });
  assert.deepEqual(consoleErrors, []);
  process.stdout.write("Web smoke: navigation, drill-down, analyst workflow, states, keyboard and responsive checks passed.\n");
} finally {
  if (browser) await browser.close();
  server.kill();
}
