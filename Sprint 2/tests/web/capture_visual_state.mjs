import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baselineUrl = process.env.BASELINE_URL;
const currentUrl = process.env.CURRENT_URL;
const outputDir = process.env.VISUAL_OUTPUT_DIR;
if (!baselineUrl || !currentUrl || !outputDir) {
  throw new Error("BASELINE_URL, CURRENT_URL and VISUAL_OUTPUT_DIR are required");
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(url, filename, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
  await page.close();
}

try {
  await capture(baselineUrl, "before-desktop.png", { width: 1440, height: 1000 });
  await capture(currentUrl, "after-desktop.png", { width: 1440, height: 1000 });
  await capture(baselineUrl, "before-mobile.png", { width: 390, height: 844 });
  await capture(currentUrl, "after-mobile.png", { width: 390, height: 844 });
  process.stdout.write(`Deterministic visual states captured in ${outputDir}.\n`);
} finally {
  await browser.close();
}
