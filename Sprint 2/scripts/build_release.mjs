import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../src/app/',import.meta.url));
function files(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
    const target=path.join(directory,entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}
const manifest = [];
for (const file of files(root)) {
  const contents=readFileSync(file,'utf8');
  const references=[];
  if (file.endsWith('.js')) {
    for (const match of contents.matchAll(/^\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/gm)) references.push(match[1]);
  } else if (file.endsWith('.html')) {
    for (const match of contents.matchAll(/(?:src|href)=["']([^"']+)["']/g)) references.push(match[1]);
  } else if (file.endsWith('.css')) {
    for (const match of contents.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) references.push(match[1]);
  }
  for (const reference of references) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const target=path.resolve(path.dirname(file),reference.split(/[?#]/)[0]);
    assert.ok(target.startsWith(root),`Asset escapes app root: ${reference}`);
    assert.ok(existsSync(target) && statSync(target).isFile(),`Missing asset/import: ${reference}`);
  }
  assert.ok(!/serving_data\.json|pipeline\/output/.test(contents),'Historical data must not be a runtime dependency');
  manifest.push({file:path.relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(contents).digest('hex')});
}
assert.ok(manifest.some(item=>item.file==='index.html'));
console.log(`Static application build verified: ${manifest.length} files, local imports/assets resolved, API-only data path. No transpilation or synthetic dataset generation is required.`);
