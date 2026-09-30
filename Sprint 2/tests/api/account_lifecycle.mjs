import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {startPhpServer} from '../../scripts/php_runtime.mjs';
import {loginCookie} from '../auth_helpers.mjs';

assert.match(process.env.FUNDS_MANAGER_DB_NAME || '', /_qa$/, 'Requires a dedicated QA database');
const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../scripts/php_cli.mjs', import.meta.url));
const username = 'qa_lifecycle';
let password = randomBytes(24).toString('base64url');
function provision(role='ANALYST', action='provision') {
  const result = spawnSync(process.execPath, [cli, 'provision'], {encoding:'utf8', windowsHide:true,
    env:{...process.env,FUNDS_MANAGER_PROVISION_USERNAME:username,FUNDS_MANAGER_PROVISION_PASSWORD:password,
      FUNDS_MANAGER_PROVISION_ROLE:role,FUNDS_MANAGER_PROVISION_ACTION:action}});
  assert.equal(result.status,0,result.stderr);
}
provision();
const server = await startPhpServer({sprintRoot:root,port:4197});
const status = async cookie => (await fetch(`${server.apiUrl}/auth.php`, {headers:{Cookie:cookie}})).status;
async function rejectedLogin(candidatePassword) {
  const initial = await fetch(`${server.apiUrl}/auth.php`);
  const state = await initial.json();
  const cookie = initial.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
  return fetch(`${server.apiUrl}/auth.php`, {
    method:'POST', headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':state.csrf_token},
    body:JSON.stringify({action:'login',username,password:candidatePassword})
  });
}
try {
  const first = await loginCookie(server.apiUrl,{username,password});
  assert.equal(await status(first),200);
  const previousPassword = password;
  password = randomBytes(24).toString('base64url');
  provision();
  assert.equal(await status(first),401,'Password reset must revoke previous sessions');
  const oldLogin = await rejectedLogin(previousPassword);
  assert.equal(oldLogin.status,401,'Previous password must no longer authenticate');
  const reset = await loginCookie(server.apiUrl,{username,password});
  assert.equal(await status(reset),200);
  provision('EXECUTIVE');
  assert.equal(await status(reset),401,'Role change must revoke previous sessions');
  const executive = await loginCookie(server.apiUrl,{username,password});
  assert.equal((await fetch(`${server.apiUrl}/health.php`,{headers:{Cookie:executive}})).status,403);
  provision('EXECUTIVE','disable');
  assert.equal(await status(executive),401,'Disable must revoke previous sessions');
  const disabledLogin = await rejectedLogin(password);
  assert.equal(disabledLogin.status,401,'Disabled account must not authenticate');
  provision();
  const restored = await loginCookie(server.apiUrl,{username,password});
  const health = await fetch(`${server.apiUrl}/health.php`,{headers:{Cookie:restored}});
  assert.equal(health.status,200);
  const healthBody = await health.json();
  assert.equal(healthBody.database,'connected');
  assert.ok(Object.hasOwn(healthBody.operations,'latest_failed_attempt'));
  assert.ok(Object.hasOwn(healthBody.operations,'latest_business_date'));
  assert.ok(Array.isArray(healthBody.pipeline_stages));
  assert.ok(Number.isInteger(healthBody.quality_counts.total));
  assert.equal(healthBody.status,['failed','blocked'].includes(healthBody.operations.latest_attempt?.status) ? 'degraded' : 'ok');
  const dashboard = await fetch(`${server.apiUrl}/dashboard.php`,{headers:{Cookie:restored}});
  assert.equal(dashboard.status,200);
  assert.equal((await dashboard.json()).meta.run_id,healthBody.latest_successful_run_id,
    'Business data must keep successful lineage when a later attempt fails');
  for (const entry of [healthBody.operations.latest_attempt, healthBody.operations.latest_failed_attempt]) {
    if (entry === null) continue;
    assert.match(entry.attempt_id,/^[a-f0-9]{32}$/);
    assert.match(entry.started_at,/Z$/);
    assert.deepEqual(Object.keys(entry).sort(),['attempt_id','run_id','status','stage','started_at','completed_at','duration_ms','error_code'].sort());
  }
  console.log('Account lifecycle: create, reset, session revocation, role boundaries, disable, reactivate and authenticated health passed.');
} finally { await server.stop(); }
