import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { startPhpServer } from "../../scripts/php_runtime.mjs";

const { chromium, request } = createRequire(import.meta.url)("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
assert.match(process.env.FUNDS_MANAGER_DB_NAME || "", /_sprint4_qa$/, "Authentication tests require a dedicated Sprint 4 QA database");
const cli = path.join(root, "Sprint 2/scripts/php_cli.mjs");
function command(name, extra = {}) {
  const result = spawnSync(process.execPath, [cli, name], { env: { ...process.env, ...extra }, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}
command("migrate");
command("migrate");
const password = randomBytes(24).toString("base64url");
for (const role of ["EXECUTIVE", "ANALYST"]) {
  command("provision", { FUNDS_MANAGER_PROVISION_USERNAME: `qa_${role.toLowerCase()}`, FUNDS_MANAGER_PROVISION_PASSWORD: password, FUNDS_MANAGER_PROVISION_ROLE: role });
}
command("provision", { FUNDS_MANAGER_PROVISION_USERNAME: "qa_locked", FUNDS_MANAGER_PROVISION_PASSWORD: password, FUNDS_MANAGER_PROVISION_ROLE: "ANALYST" });
process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = 'http://127.0.0.1:4194';
const server = await startPhpServer({ sprintRoot: path.join(root, "Sprint 2"), port: 4194 });
let browser;
let expiryServer;
let unavailableServer;
const contexts = [];
let checks = 0;
async function assertAccessibleSurface(page, label) {
  const failures = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
    };
    const issues = [];
    for (const control of document.querySelectorAll("button,input,select,textarea")) {
      if (!visible(control)) continue;
      const named = control.labels?.length || control.getAttribute("aria-label") || control.getAttribute("aria-labelledby") || (control.tagName === "BUTTON" && control.textContent.trim());
      if (!named) issues.push(`unnamed ${control.tagName.toLowerCase()}#${control.id}`);
    }
    for (const table of document.querySelectorAll("table")) {
      if (visible(table) && [...table.querySelectorAll("thead th")].some((cell) => cell.getAttribute("scope") !== "col")) issues.push("table header missing scope=col");
    }
    for (const chart of document.querySelectorAll('svg,[role="img"]')) {
      if (visible(chart) && (!chart.getAttribute("role") || !chart.getAttribute("aria-label"))) issues.push("chart missing role or label");
    }
    const styles=getComputedStyle(document.documentElement);
    const luminance=(hex)=>{
      const channels=[1,3,5].map((start)=>parseInt(hex.slice(start,start+2),16)/255)
        .map((value)=>value<=0.04045 ? value/12.92:((value+0.055)/1.055)**2.4);
      return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
    };
    for (const [foreground,background] of [
      ['--ink-500','--surface-solid'],['--ink-650','--surface-solid'],['--violet-700','--surface-solid'],
      ['--sage-700','--sage-100'],['--amber-700','--amber-100'],['--rose-700','--rose-100'],['--blue-700','--blue-100'],
    ]) {
      const front=styles.getPropertyValue(foreground).trim(); const back=styles.getPropertyValue(background).trim();
      const ratio=(Math.max(luminance(front),luminance(back))+0.05)/(Math.min(luminance(front),luminance(back))+0.05);
      if (ratio<4.5) issues.push(`contrast ${foreground}/${background} is ${ratio.toFixed(2)}:1`);
    }
    return issues;
  });
  assert.deepEqual(failures, [], `${label}: ${failures.join(", ")}`);
}
async function call(context, route, status, body, token) {
  const response = await context.fetch(`${server.apiUrl}/${route}`, {
    method: body ? "POST" : "GET", ...(body ? { data: body, headers: { "X-CSRF-Token": token || "" } } : {}),
  });
  assert.equal(response.status(), status, `${route}: ${await response.text()}`);
  checks += 1;
  return response.json();
}
async function openView(page, view, expectedPage = view) {
  if (await page.locator('.app-shell').getAttribute('data-sidebar') === 'closed') await page.locator('#menu-button').click();
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  await page.locator(`section[data-page="${expectedPage}"]`).waitFor();
}
async function exerciseBusinessJourney(page) {
  assert.notEqual((await page.getByTestId('executive-aum').innerText()).trim(), '');
  await openView(page, 'funds');
  assert.ok(await page.locator('section[data-page="funds"] tbody tr').count() >= 10);
  await page.locator('#fund-select').selectOption('FUND_03');
  await openView(page,'fund-detail');
  await page.locator('section[data-page="fund-detail"]').waitFor();
  await page.getByTestId('fund-aum').waitFor();
  const snapshots=await page.locator('#snapshot-select option').evaluateAll((items)=>items.map((item)=>item.value).filter(Boolean));
  if (snapshots.length>1) {
    await page.locator('#snapshot-select').selectOption(snapshots.at(-1));
    await page.getByRole('heading',{name:new RegExp(`FUND_03.*${snapshots.at(-1)}`)}).waitFor();
  }
  const allocation=page.locator('[data-action="filter-allocation"]').first();
  await allocation.click();
  assert.equal(await allocation.getAttribute('aria-pressed'),'true');
  assert.ok(await page.locator('section[data-page="fund-detail"] tbody tr').count()>0);
  await openView(page,'performance');
  await page.locator('#period-select').selectOption('6m');
  await page.getByRole('heading',{name:/FUND_03.*6M requested/}).waitFor();
  assert.ok(await page.locator('section[data-page="performance"] svg[role="img"]').count()>0);
  await openView(page,'comparison');
  await page.locator('#comparison-fund-a').selectOption('FUND_03');
  await page.locator('#comparison-fund-b').selectOption('FUND_05');
  await page.locator('section[data-page="comparison"] tbody [data-fund="FUND_05"]').first().waitFor();
  await openView(page,'peers');
  await page.getByText('Peer data is not yet certified.',{exact:true}).waitFor();
  await openView(page,'risk');
  for (const tab of ['Drawdown','Liquidity','Stress','DV01']) {
    await page.getByRole('button',{name:tab,exact:true}).click();
    await assertAccessibleSurface(page,`full journey ${tab}`);
  }
}
try {
  let ticketId;
  const anonymous = await request.newContext(); contexts.push(anonymous);
  await call(anonymous, "funds.php", 401);
  const preflight = await call(anonymous, "auth.php", 200);
  await call(anonymous, "auth.php", 403, { action: "login", username: "qa_executive", password });
  await call(anonymous, "auth.php", 401, { action: "login", username: "qa_executive", password: "wrong" }, preflight.csrf_token);
  const beforeCookie = (await anonymous.storageState()).cookies[0].value;
  const executive = await call(anonymous, "auth.php", 200, { action: "login", username: "qa_executive", password }, preflight.csrf_token);
  assert.equal(executive.user.role, "EXECUTIVE");
  assert.equal(JSON.stringify(executive).includes("password"), false);
  const cookie = (await anonymous.storageState()).cookies[0];
  assert.notEqual(cookie.value, beforeCookie);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "Strict");
  await call(anonymous, "funds.php", 200);
  await call(anonymous, "anomalies.php", 403);
  await call(anonymous, "runs.php", 403);
  await call(anonymous, "health.php", 403);
  await call(anonymous, "review.php", 403);
  await call(anonymous, "reconciliation.php", 403);
  const dashboard = await call(anonymous, "dashboard.php", 200);
  assert.equal(dashboard.funds.length, 14);
  assert.deepEqual(dashboard.anomalies, []);
  assert.deepEqual(dashboard.runs, []);
  assert.ok(dashboard.overview.open_issues > 0);
  assert.ok(dashboard.overview.quarantined_records > 0);
  const ticketBody={action:"create",title:"Allocation clarification",description:"Please review the selected fund allocation evidence.",category:"ALLOCATION",priority:"HIGH",related_fund:"FUND_01",related_context:"fund-detail"};
  await call(anonymous,"tickets.php",403,ticketBody);
  const createdTicket=await call(anonymous,"tickets.php",201,ticketBody,executive.csrf_token);
  ticketId=createdTicket.ticket.ticket_id;
  assert.match(ticketId,/^TKT-[0-9]{6}$/);
  assert.equal(createdTicket.ticket.status,"OPEN");
  assert.deepEqual(createdTicket.ticket.audit.map((event)=>event.action),["TICKET_CREATED"]);
  const executiveTickets=await call(anonymous,"tickets.php",200);
  assert.ok(executiveTickets.records.some((ticket)=>ticket.ticket_id===ticketId));
  await call(anonymous,"tickets.php",403,{action:"update",ticket_id:ticketId,status:"IN_REVIEW",response:"Forbidden",revision:0},executive.csrf_token);
  await call(anonymous, "auth.php", 403, { action: "logout" });
  await call(anonymous, "auth.php", 200, { action: "logout" }, executive.csrf_token);
  await call(anonymous, "funds.php", 401);
  const locked = await request.newContext(); contexts.push(locked);
  const lockedInitial = await call(locked, "auth.php", 200);
  const unknownFailure = await call(locked, "auth.php", 401, { action: "login", username: "qa_unknown", password: "incorrect-password" }, lockedInitial.csrf_token);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const knownFailure = await call(locked, "auth.php", 401, { action: "login", username: "qa_locked", password: "incorrect-password" }, lockedInitial.csrf_token);
    assert.equal(knownFailure.error.message, unknownFailure.error.message);
  }
  const lockedFailure = await call(locked, "auth.php", 401, { action: "login", username: "qa_locked", password }, lockedInitial.csrf_token);
  assert.equal(lockedFailure.error.message, unknownFailure.error.message);
  const analyst = await request.newContext(); contexts.push(analyst);
  const initial = await call(analyst, "auth.php", 200);
  const signedIn = await call(analyst, "auth.php", 200, { action: "login", username: "qa_analyst", password }, initial.csrf_token);
  const analystTickets=await call(analyst,"tickets.php?status=OPEN&category=ALLOCATION&priority=HIGH&fund_id=FUND_01",200);
  assert.ok(analystTickets.records.some((ticket)=>ticket.ticket_id===ticketId));
  const ticketDetail=await call(analyst,`tickets.php?ticket_id=${ticketId}`,200);
  assert.equal(ticketDetail.ticket.history[0].event_type,"CREATED");
  await call(analyst,"tickets.php",403,{action:"update",ticket_id:ticketId,status:"IN_REVIEW",response:"Evidence reviewed.",revision:0});
  const updatedTicket=await call(analyst,"tickets.php",200,{action:"update",ticket_id:ticketId,status:"IN_REVIEW",response:"Evidence reviewed.",revision:0},signedIn.csrf_token);
  assert.equal(updatedTicket.ticket.status,"IN_REVIEW");
  assert.equal(updatedTicket.ticket.analyst_response,"Evidence reviewed.");
  assert.deepEqual(updatedTicket.ticket.history.slice(-2).map((event)=>event.event_type),["STATUS_CHANGED","RESPONSE_ADDED"]);
  assert.deepEqual(updatedTicket.ticket.audit.map((event)=>event.action),["TICKET_CREATED","TICKET_STATUS_CHANGED","TICKET_RESPONSE_ADDED"]);
  assert.equal(JSON.stringify(updatedTicket.ticket.audit).includes("Evidence reviewed."),false);
  await call(analyst,"tickets.php",409,{action:"update",ticket_id:ticketId,status:"RESOLVED",response:"Stale update",revision:0},signedIn.csrf_token);
  const executiveAgain=await request.newContext(); contexts.push(executiveAgain);
  const executiveAgainInitial=await call(executiveAgain,"auth.php",200);
  await call(executiveAgain,"auth.php",200,{action:"login",username:"qa_executive",password},executiveAgainInitial.csrf_token);
  const executiveUpdatedView=await call(executiveAgain,`tickets.php?ticket_id=${ticketId}`,200);
  assert.equal(executiveUpdatedView.ticket.status,"IN_REVIEW");
  assert.equal(executiveUpdatedView.ticket.analyst_response,"Evidence reviewed.");
  const issues = await call(analyst, "anomalies.php", 200);
  const blockingIssues = await call(analyst, "anomalies.php?severity=blocking", 200);
  assert.ok(blockingIssues.anomalies.length > 0);
  assert.ok(blockingIssues.anomalies.every((issue) => issue.severity === "blocking"));
  const noIssues = await call(analyst, "anomalies.php?search=unmatched-qa-search", 200);
  assert.equal(noIssues.anomalies.length, 0);
  await call(analyst, "anomalies.php?offset=-1", 400);
  await call(analyst, "anomalies.php?rule_id=bad", 400);
  const id = issues.anomalies[0].anomaly_id;
  const detail = await call(analyst, `review.php?issue_id=${id}`, 200);
  const review = { issue_id: id, status: detail.issue.status, note: "QA review <script>window.reviewInjected=true</script>", revision: Number(detail.issue.revision) };
  await call(analyst, "review.php", 403, review);
  const saved = await call(analyst, "review.php", 200, review, signedIn.csrf_token);
  assert.equal(Number(saved.issue.revision), review.revision + 1);
  assert.equal(saved.issue.analyst_note, review.note);
  assert.equal(saved.history[0].action, "QUALITY_ISSUE_REVIEWED");
  assert.equal(JSON.stringify(saved.history).includes("<script>"), false);
  await call(analyst, "review.php", 409, review, signedIn.csrf_token);
  await call(analyst, "review.php?issue_id=invalid", 400);
  await call(analyst, "review.php", 400, { ...review, status: "approved" }, signedIn.csrf_token);
  await call(analyst, "review.php", 400, { ...review, context: "invalid" }, signedIn.csrf_token);
  await call(analyst, "runs.php", 200);
  await call(analyst, "health.php", 200);
  const reconciliation = await call(analyst, "reconciliation.php", 200);
  assert.ok(reconciliation.records.length > 0);
  for (const row of reconciliation.records) {
    if (row.expected_nav !== null && row.holdings_total !== null) assert.ok(Math.abs(row.difference_value - (row.holdings_total - row.expected_nav)) < 1e-6);
    if (row.rule_status === "fail") assert.ok(row.issue_id);
  }
  await call(analyst, "reconciliation.php?result=invalid", 400);
  await call(analyst, "reconciliation.php?date=2026-99-99", 400);
  const reconciliationRecord = reconciliation.records.find((row) => row.issue_id);
  const reconciliationIssue = reconciliationRecord?.issue_id;
  const reconciliationFund = reconciliationRecord?.fund_code;
  assert.ok(reconciliationIssue);
  assert.ok(reconciliationFund);
  const reconciliationDetail = await call(analyst, `review.php?issue_id=${reconciliationIssue}`, 200);
  const reconciliationReview = await call(analyst, "review.php", 200, {
    issue_id: reconciliationIssue, status: reconciliationDetail.issue.status,
    note: "Reconciliation evidence reviewed in QA.", revision: Number(reconciliationDetail.issue.revision), context: "reconciliation",
  }, signedIn.csrf_token);
  assert.equal(reconciliationReview.history[0].action, "RECONCILIATION_REVIEWED");
  const observedStressStates = new Set();
  const observedDv01States = new Set();
  for (const fund of ["FUND_01", "FUND_03", "FUND_10", "FUND_14"]) {
    const risk = await call(analyst, `risk.php?fund_id=${fund}&period=12m`, 200);
    const performance = await call(analyst, `performance.php?fund_id=${fund}&period=12m`, 200);
    assert.deepEqual(risk.metrics, performance.metrics);
    assert.equal(risk.metrics.minimum_risk_observations, 20);
    if (risk.metrics.daily_observations < risk.metrics.minimum_risk_observations) {
      assert.equal(risk.metrics.risk_metrics_status, "unavailable-insufficient-history");
      assert.equal(risk.metrics.volatility, null);
      assert.equal(risk.metrics.sharpe, null);
      assert.equal(risk.metrics.sortino, null);
    }
    assert.equal(risk.fund_id, fund);
    if (risk.drawdown.history.length) assert.equal(risk.drawdown.maximum, Math.min(...risk.drawdown.history.map((row) => row.drawdown)));
    for (const row of risk.liquidity.horizons) {
      assert.ok([1,5,21,63,126,252].includes(row.business_days));
      assert.ok(row.fraction === null || row.fraction >= 0 && row.fraction <= 1);
    }
    const nonNullLiquidity = risk.liquidity.horizons.filter((row) => row.fraction !== null).length;
    assert.equal(risk.liquidity.status, !risk.liquidity.horizons.length || !nonNullLiquidity ? "unavailable" : nonNullLiquidity < risk.liquidity.horizons.length ? "partial" : "available");
    observedStressStates.add(risk.stress.status);
    observedDv01States.add(risk.dv01.status);
    if (risk.stress.status === "available") {
      assert.ok(risk.stress.scenarios.length > 0);
      assert.ok(risk.stress.scenarios.every((item) => /^SCN-[a-f0-9]{12}$/.test(item.id)));
      const selectedScenario = await call(analyst, `risk.php?fund_id=${fund}&period=12m&scenario=${risk.stress.scenarios[0].id}`, 200);
      assert.equal(selectedScenario.stress.scenarios.length, 1);
    } else assert.deepEqual(risk.stress.scenarios, []);
    if (risk.dv01.total !== null) assert.ok(Math.abs(risk.dv01.total - risk.dv01.items.reduce((sum, row) => sum + (row.dv01_notional_value ?? 0), 0)) < 1e-6);
    if (fund === "FUND_01") assert.ok(risk.dv01.items.some((row) => row.risk_factor_vertex === null), "Expected null DV01 fields must remain valid rows");
    assert.doesNotMatch(JSON.stringify(risk), /source_fund_id|result_json_restricted|strategy_name_restricted|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  }
  assert.ok(observedStressStates.has("available") && observedStressStates.has("unavailable"));
  assert.ok(observedDv01States.has("available") && observedDv01States.has("unavailable"));
  await call(analyst, "risk.php?fund_id=FUND_99", 404);
  await call(analyst, "risk.php?fund_id=FUND_01&period=invalid", 400);
  await call(analyst, "risk.php?fund_id=FUND_01&scenario=invalid", 400);
  await call(analyst, "risk.php?fund_id=FUND_01&scenario=SCN-000000000000", 404);
  const peerState = await call(analyst, "peers.php", 200);
  assert.equal(peerState.status, "unavailable-pending-certification");
  const missingRisk = await call(analyst, "risk.php?fund_id=FUND_14&period=12m", 200);
  assert.ok([missingRisk.liquidity.status, missingRisk.stress.status, missingRisk.dv01.status].includes("unavailable"));

  const originalTimeout = process.env.FUNDS_MANAGER_SESSION_TIMEOUT;
  const originalOrigins = process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
  process.env.FUNDS_MANAGER_SESSION_TIMEOUT = "3";
  process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = "http://127.0.0.1:4195";
  expiryServer = await startPhpServer({ sprintRoot: path.join(root, "Sprint 2"), port: 4195 });
  if (originalTimeout === undefined) delete process.env.FUNDS_MANAGER_SESSION_TIMEOUT;
  else process.env.FUNDS_MANAGER_SESSION_TIMEOUT = originalTimeout;
  process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = originalOrigins;

  const expiring = await request.newContext(); contexts.push(expiring);
  const expiryInitial = await call(expiring, "auth.php", 200);
  await call(expiring, "auth.php", 200, { action: "login", username: "qa_executive", password }, expiryInitial.csrf_token);
  await new Promise((resolve) => setTimeout(resolve, 3100));
  const expiredResponse = await expiring.fetch(`${expiryServer.apiUrl}/funds.php`);
  assert.equal(expiredResponse.status(), 401);
  assert.equal((await expiredResponse.json()).error.message, "Session expired");
  checks += 1;

  browser = await chromium.launch({ headless: true });
  const journeys = [
    { role: "executive", width: 390 },
    { role: "executive", width: 1440 },
    { role: "analyst", width: 390 },
    { role: "analyst", width: 768 },
    { role: "analyst", width: 1024 },
    { role: "analyst", width: 1440 },
  ];
  for (const { role, width } of journeys) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(`console: ${message.text()}`); });
    page.on("requestfailed", (request) => browserErrors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
    page.on("response", (response) => {
      if (response.status() >= 400) browserErrors.push(`response: ${response.status()} ${response.request().method()} ${response.url()}`);
    });
    await page.goto(server.appUrl);
    await page.getByLabel("Username", { exact: true }).waitFor();
    assert.equal(await page.getByLabel("Username", { exact: true }).evaluate((element) => document.activeElement === element), true);
    assert.equal(await page.getByLabel("Username", { exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
    await page.getByLabel("Username", { exact: true }).fill(`qa_${role}`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try { await page.getByRole("heading", { name: "A clear view before every decision." }).waitFor(); }
    catch (error) { console.error(await page.locator("body").innerText()); throw error; }
    assert.equal(await page.locator('#role-select').isDisabled(), true);
    assert.equal(await page.locator('.nav-item[data-view="quality"]').getAttribute("hidden") !== null, role === "executive");
    assert.equal(await page.locator('.nav-item[data-view="tickets"]').isVisible(),true);
    const navNumbers=await page.locator('.nav-item:not([hidden]) .nav-icon').allTextContents();
    assert.equal(new Set(navNumbers).size,navNumbers.length);
    assert.deepEqual(navNumbers,[...navNumbers].sort((a,b)=>Number(a)-Number(b)));
    assert.equal(await page.getByRole("button", { name: "View controls", exact: true }).count(), role === "analyst" ? 1 : 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${role} overflow at ${width}px`);
    await assertAccessibleSurface(page, `${role} overview ${width}px`);
    if (width===1440) await exerciseBusinessJourney(page);
    if (width <= 860) await page.locator("#menu-button").click();
    await page.locator('.nav-item[data-view="risk"]').focus();
    await page.locator('.nav-item[data-view="risk"]').press("ArrowDown");
    const expectedNext = "tickets";
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.view), expectedNext);
    await page.locator('.nav-item[data-view="risk"]').focus();
    await page.locator('.nav-item[data-view="risk"]').click();
    await page.getByRole("button", { name: "Liquidity", exact: true }).waitFor();
    for (const tab of ["Drawdown", "Liquidity", "Stress", "DV01"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${tab} overflow at ${width}px`);
      await assertAccessibleSurface(page, `${tab} ${width}px`);
    }
    if (width <= 860) await page.locator("#menu-button").click();
    await page.locator('.nav-item[data-view="tickets"]').click();
    await page.getByRole("heading",{name:"Tickets",exact:true}).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`Tickets overflow at ${width}px`);
    await assertAccessibleSurface(page,`Tickets ${role} ${width}px`);
    if (role === "executive" && width === 1440) {
      await page.getByLabel("Title",{exact:true}).fill("Browser Executive request");
      await page.getByLabel("Description",{exact:true}).fill("Please validate the browser journey request and its governed context.");
      await page.getByRole("button",{name:"Send to Analyst",exact:true}).click();
      await page.getByText("Request sent to the Analyst queue.",{exact:true}).waitFor();
      await page.getByRole("heading",{name:"Browser Executive request",exact:true}).waitFor();
    }
    if (role === "analyst") {
      if (width===1440) await page.locator('#fund-select').selectOption(reconciliationFund);
      if (width <= 860) await page.locator("#menu-button").click();
      await page.locator('.nav-item[data-view="reconciliation"]').click();
      await page.getByRole("heading", { name:"Reconciliation evidence", exact:true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`Reconciliation overflow at ${width}px`);
      if (width===1440) {
        const reconciliationReview=page.locator('[data-review-context="reconciliation"]').first();
        await reconciliationReview.click();
        await page.getByLabel("Analyst note (no private source values)").fill("Reconciliation reviewed from the full Analyst journey.");
        await page.getByRole("button", { name: "Save review", exact: true }).click();
        await page.getByText("Review saved with audit evidence.", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Close details", exact: true }).click();
      }
      if (width <= 860) await page.locator("#menu-button").click();
      await page.locator('.nav-item[data-view="quality"]').click();
      const issueSearch=page.getByLabel("Search issues", { exact:true });
      await issueSearch.fill("unmatched-qa-search");
      await issueSearch.evaluate((element)=>element.dispatchEvent(new Event('change',{bubbles:true})));
      try { await page.getByText("No issues match these filters.", { exact:true }).waitFor({timeout:10000}); }
      catch (error) { throw new Error(`${role} ${width}px quality filter did not settle:\n${await page.locator('#app-view').innerText()}`,{cause:error}); }
      await page.getByLabel("Search issues", { exact:true }).fill("");
      await page.getByLabel("Search issues", { exact:true }).evaluate((element)=>element.dispatchEvent(new Event('change',{bubbles:true})));
      const reviewTrigger = page.locator('[data-action="open-anomaly"]').first();
      await reviewTrigger.click();
      await page.getByLabel("Analyst note (no private source values)").waitFor();
      assert.equal(await page.locator("#anomaly-dialog").evaluate((element) => element.contains(document.activeElement)), true);
      await page.getByRole("button", { name: "Close details", exact: true }).click();
      assert.equal(await reviewTrigger.evaluate((element) => document.activeElement === element), true);
      await reviewTrigger.click();
      await page.getByLabel("Analyst note (no private source values)").waitFor();
      assert.equal(await page.evaluate(() => window.reviewInjected), undefined);
      await page.getByLabel("Analyst note (no private source values)").fill("Reviewed from the Analyst journey.");
      await page.getByRole("button", { name: "Save review", exact: true }).click();
      await page.getByText("Review saved with audit evidence.", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Close details", exact: true }).click();
      if (width===1440) {
        await openView(page,'tickets');
        const ticketButton=page.locator('[data-action="select-ticket"]').first();
        await ticketButton.click();
        await page.locator('#ticket-detail-title').waitFor();
        const ticketStatus=page.locator('#ticket-update-form select[name="status"]');
        if (await ticketStatus.count()) {
          await ticketStatus.selectOption('RESOLVED');
          await page.getByLabel('Analyst response',{exact:true}).fill('Reviewed and resolved from the Analyst journey.');
          await page.getByRole('button',{name:'Save response and status',exact:true}).click();
          await page.getByText('Ticket updated with audit evidence.',{exact:true}).waitFor();
        }
        await openView(page,'import');
        assert.deepEqual(await page.locator('section[data-page="import"] table tbody tr td:first-child').allTextContents(),['raw','bronze','silver','gold','serving']);
        await openView(page,'runs');
        await page.getByText('Latest successful run',{exact:true}).waitFor();
        assert.ok(await page.locator('section[data-page="runs"] .lineage-chain .lineage-node').count()>=5);
      }
    }
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    if (role==="executive" && width===1440) {
      await page.getByLabel("Username", { exact:true }).fill("qa_analyst");
      await page.getByLabel("Password", { exact:true }).fill(password);
      await page.getByRole("button", { name:"Sign in", exact:true }).click();
      await page.getByRole("heading", { name:"A clear view before every decision." }).waitFor();
      assert.equal(await page.locator('#fund-select').evaluate((element)=>element.value),'FUND_01');
      assert.equal(await page.locator('#period-select').evaluate((element)=>element.value),'12m');
      assert.equal(await page.locator('#scenario-select').evaluate((element)=>element.value),'current');
      assert.equal(await page.locator('.nav-item[data-view="quality"]').isVisible(),true);
      await page.getByRole("button", { name:"Sign out", exact:true }).click();
      await page.getByRole("button", { name:"Sign in", exact:true }).waitFor();
    }
    assert.deepEqual(browserErrors, [], `${role} browser errors at ${width}px:\n${browserErrors.join("\n")}`);
    await page.close();
  }

  const expiryPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await expiryPage.goto(expiryServer.appUrl);
  await expiryPage.getByLabel("Username", { exact: true }).fill("qa_executive");
  await expiryPage.getByLabel("Password", { exact: true }).fill(password);
  await expiryPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await expiryPage.getByRole("heading", { name: "A clear view before every decision." }).waitFor();
  await new Promise((resolve) => setTimeout(resolve, 3100));
  await expiryPage.locator("#menu-button").click();
  await expiryPage.locator('.nav-item[data-view="risk"]').click();
  await expiryPage.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await expiryPage.getByText("Session expired. Please sign in again.", { exact: true }).waitFor();
  await expiryPage.close();

  const originalDatabase = process.env.FUNDS_MANAGER_DB_NAME;
  const originsBeforeUnavailable = process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
  process.env.FUNDS_MANAGER_DB_NAME = "yvy_missing_database_for_sprint4_browser_test";
  process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = "http://127.0.0.1:4197";
  unavailableServer = await startPhpServer({ sprintRoot: path.join(root, "Sprint 2"), port: 4197 });
  process.env.FUNDS_MANAGER_DB_NAME = originalDatabase;
  process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = originsBeforeUnavailable;
  const unavailablePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await unavailablePage.goto(unavailableServer.appUrl);
  await unavailablePage.getByLabel("Username", { exact: true }).fill("qa_executive");
  await unavailablePage.getByLabel("Password", { exact: true }).fill(password);
  await unavailablePage.getByRole("button", { name: "Sign in", exact: true }).click();
  await unavailablePage.getByText("Database is unavailable", { exact: true }).waitFor();
  assert.equal(await unavailablePage.locator("#login-panel").isVisible(), true);
  await unavailablePage.close();
  console.log(`Authentication: ${checks} HTTP checks passed; cookie rotation, HttpOnly/SameSite, Executive/Analyst isolation, CSRF, logout, responsive checks and complete desktop role journeys passed.`);
} finally {
  await browser?.close();
  for (const context of contexts) await context.dispose();
  await expiryServer?.stop();
  await unavailableServer?.stop();
  await server.stop();
}
