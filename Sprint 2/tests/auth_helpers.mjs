import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export function provisionQaAccount(username) {
  assert.match(process.env.FUNDS_MANAGER_DB_NAME || '', /_sprint4_qa$/, 'Regression credentials may only be provisioned in Sprint 4 QA');
  const cli=fileURLToPath(new URL('../scripts/php_cli.mjs',import.meta.url));
  const password=randomBytes(24).toString('base64url');
  for (const command of ['migrate','provision']) {
    const result=spawnSync(process.execPath,[cli,command],{encoding:'utf8',windowsHide:true,
      env:{...process.env,FUNDS_MANAGER_PROVISION_USERNAME:username,FUNDS_MANAGER_PROVISION_PASSWORD:password,FUNDS_MANAGER_PROVISION_ROLE:'ANALYST'}});
    assert.equal(result.status,0,result.stderr);
  }
  return {username,password};
}

export async function loginCookie(apiUrl,credentials) {
  const response=await fetch(`${apiUrl}/auth.php`);
  assert.equal(response.status,200);
  const initial=await response.json();
  const cookie=response.headers.getSetCookie().map((item)=>item.split(';')[0]).join('; ');
  const login=await fetch(`${apiUrl}/auth.php`,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':initial.csrf_token},
    body:JSON.stringify({action:'login',...credentials})});
  assert.equal(login.status,200);
  return login.headers.getSetCookie().map((item)=>item.split(';')[0]).join('; ');
}

export async function loginPage(page,credentials) {
  await page.getByLabel('Username',{exact:true}).fill(credentials.username);
  await page.getByLabel('Password',{exact:true}).fill(credentials.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
}
