import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
for(const file of ['dist/voice.js','dist/voice-search.js','dist/voice-capture.js','dist/voice-lexicon.js','dist/app.js','dist/catalog.js','dist/weapons.js','dist/circle-timer.js','dist/data.js','dist/sw.js','serve.mjs']) execFileSync(process.execPath,['--check',file]);
const manifest=fs.readFileSync('android/AndroidManifest.xml','utf8');
const version=manifest.match(/android:versionName="([^"]+)"/)[1];
assert.equal(JSON.parse(fs.readFileSync('package.json')).version,version,'package and Android versions must agree');
assert.ok(fs.readFileSync('dist/app.js','utf8').includes('v'+version+'</p>'),'Preview and Android versions must agree');
const sw=fs.readFileSync('dist/sw.js','utf8');
const assets=JSON.parse(sw.match(/const ASSETS=(\[[^;]+\]);/)[1]);
for(const asset of assets) assert.ok(fs.existsSync(path.join('dist',asset==='./'?'index.html':asset)),`Missing offline asset: ${asset}`);
// Inspect tracked files only; ignored local signing files may legitimately exist.
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert.ok(tracked.length>0,'No tracked files to audit');
const blocked=/(^|\/)(signing|node_modules|build|reports|\.git|work)(\/|$)|\.(jks|keystore|p12|pfx|pem|apk|pyc|log|pid)$|(^|\/)(password\.txt|\.env(?:\..*)?)$/i;
for(const file of tracked){
  assert.ok(!blocked.test(file),`Private/generated file is tracked: ${file}`);
  const buf=fs.readFileSync(file);
  if(buf.includes(0)) continue;
  const text=buf.toString('utf8');
  assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),`Private key in ${file}`);
  assert.ok(!/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/.test(text),`Access token in ${file}`);
}
console.log(`Repository check passed: ${tracked.length} tracked files, ${assets.length} offline assets, version ${version}.`);
