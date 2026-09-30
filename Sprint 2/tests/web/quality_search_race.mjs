import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {startPhpServer} from '../../scripts/php_runtime.mjs';
import {provisionQaAccount, loginPage} from '../auth_helpers.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
const credentials = provisionQaAccount('qa_search_race');
const previousOrigins = process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = 'http://127.0.0.1:4198';
const server = await startPhpServer({sprintRoot:fileURLToPath(new URL('../../',import.meta.url)),port:4198});
if (previousOrigins === undefined) delete process.env.FUNDS_MANAGER_ALLOWED_ORIGINS;
else process.env.FUNDS_MANAGER_ALLOWED_ORIGINS = previousOrigins;
let browser;
try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(server.appUrl);
  await loginPage(page,credentials);
  await page.getByRole('heading',{name:'A clear view before every decision.'}).waitFor();
  let releaseResponse;
  const gate = new Promise(resolve => { releaseResponse=resolve; });
  let intercepted;
  const waiting = new Promise(resolve => { intercepted=resolve; });
  await page.route('**/api/anomalies.php*',async route => {
    const response = await route.fetch();
    if (!new URL(route.request().url()).searchParams.has('search')) {
      intercepted();
      await gate;
    }
    await route.fulfill({response});
  });
  await page.locator('#menu-button').click();
  await page.locator('.nav-item[data-view="quality"]').click();
  await Promise.race([waiting,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Initial quality request missing')),10000))]);
  const input = page.getByLabel('Search issues',{exact:true});
  await input.fill('unmatched-qa-search');
  releaseResponse();
  await page.getByText('No issues match these filters.',{exact:true}).waitFor();
  assert.equal(await input.inputValue(),'unmatched-qa-search');
  assert.equal(await input.evaluate(element=>document.activeElement===element),true);
  assert.equal(await input.evaluate(element=>element.selectionStart),'unmatched-qa-search'.length);
  console.log('Quality search: delayed initial response preserves mobile draft, focus, selection and filtered result.');
} finally {
  await browser?.close();
  await server.stop();
}
