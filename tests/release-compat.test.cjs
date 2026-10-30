const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),prefix='duye-weapons-preview-v1:';
const assets=process.env.NR_TEST_ASSET_ROOT||path.join(root,'dist');
let checks=0;
function eq(a,b,label){assert.deepEqual(JSON.parse(JSON.stringify(a)),b,label);checks++}
function boot(host,native=false){
 const fixtures={
  'nr-favorites':['legendary_weapon_effects|legendary:01','nightlords|gladius'],
  'nr-recent-v1':['nightlords|gladius'],'nr-crystal-marks':{'crystal-fixture':1},
  'nr-font-size':'large','nr-effect-density':'cards','nr-view-memory-v1':{},
  'nr-circle-timer-v1':{day:2,elapsed:660,startedAt:null},
  [prefix+'nr-favorites']:['weapons|weapon:dark-moon-greatsword'],
  [prefix+'nr-font-size']:'normal'
 };
 const store=Object.fromEntries(Object.entries(fixtures).map(([k,v])=>[k,JSON.stringify(v)])),reads=[],writes=[];
 const el={addEventListener(){},querySelectorAll(){return[]},classList:{toggle(){},add(){},remove(){}},dataset:{},value:'',open:false,scrollTop:0};
 const ctx={window:{innerWidth:1000,scrollTo(){},addEventListener(){},scrollY:0,...(native?{NightreignNative:{}}:{})},document:{getElementById(){return el},querySelectorAll(){return[]},addEventListener(){},body:el},localStorage:{getItem(k){reads.push(k);return store[k]||null},setItem(k,v){writes.push(k);store[k]=v}},setTimeout(){},clearTimeout(){},location:{host,hash:'#home'},history:{replaceState(){}}};
 vm.createContext(ctx);
 for(const name of ['data.js','catalog.js','weapons.js','circle-timer.js'])vm.runInContext(fs.readFileSync(path.join(assets,name),'utf8'),ctx);
 let app=fs.readFileSync(path.join(assets,'app.js'),'utf8');
 app=app.slice(0,app.indexOf('applyDisplay();shell();initializeReadingMemory();'))+'window.spec={state,previewMode,load,persist,settings,resolveRecords};})();';
 vm.runInContext(app,ctx);
 return{...ctx.window.spec,store,reads,writes,fixtures};
}
for(const [host,native] of [['appassets.androidplatform.net',true],['127.0.0.1:4317',false],['',false],['127.0.0.1:4318',true]]){
 const x=boot(host,native);
 eq(x.previewMode,false,'production environment '+host);
 eq(x.state.favorites,x.fixtures['nr-favorites'],'old favorites loaded '+host);
 eq([x.state.marks,x.state.fontSize,x.state.density,x.state.recent],[x.fixtures['nr-crystal-marks'],'large','cards',x.fixtures['nr-recent-v1']],'old preferences preserved '+host);
 eq(x.resolveRecords(x.state.favorites,true).map(v=>v[1].id),['legendary:01','gladius'],'legacy favorites still resolve '+host);
 eq(x.load('nr-circle-timer-v1',null),{day:2,elapsed:660,startedAt:null},'timer loads from production storage '+host);
 x.persist('nr-favorites',x.state.favorites.concat('weapons|weapon:dark-moon-greatsword'));
 eq(JSON.parse(x.store['nr-favorites']).length,3,'new favorite appends to old store '+host);
 eq(JSON.parse(x.store[prefix+'nr-favorites']),x.fixtures[prefix+'nr-favorites'],'preview fixture remains isolated '+host);
 eq(x.reads.concat(x.writes).every(k=>!k.startsWith(prefix)),true,'all runtime accesses use production keys '+host);
 eq(x.settings().includes('预览记录独立保存'),false,'production settings omit preview banner '+host);
 if(native)eq(x.state.phone,false,'native app never adds a desktop phone frame');
}
for(const host of ['127.0.0.1:4318','localhost:4318']){
 const x=boot(host);
 eq(x.previewMode,true,'isolated preview detected '+host);
 eq(x.state.favorites,x.fixtures[prefix+'nr-favorites'],'preview loads only its own favorites '+host);
 x.persist('nr-font-size','large');
 eq(x.reads.concat(x.writes).every(k=>k.startsWith(prefix)),true,'preview accesses remain prefixed '+host);
 eq(JSON.parse(x.store['nr-favorites']),x.fixtures['nr-favorites'],'production fixtures untouched '+host);
}
async function cacheScope(host,ownPrefix){
 const handlers={},deleted=[],keys=['nightreign-offline-old','duye-weapons-preview-old','other-app-cache'];
 const ctx={self:{location:{host},addEventListener(type,fn){handlers[type]=fn},clients:{claim(){}}},caches:{keys:async()=>keys,delete:async key=>{deleted.push(key);return true}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'dist/sw.js'),'utf8'),ctx);
 keys.push(vm.runInContext('CACHE',ctx));
 let pending;handlers.activate({waitUntil(p){pending=p}});await pending;
 eq(deleted,[ownPrefix+'old'],'service worker cleans only its own old caches '+host);
}
(async()=>{await cacheScope('127.0.0.1:4318','duye-weapons-preview-');await cacheScope('127.0.0.1:4317','nightreign-offline-');console.log({releaseCompatibilityChecks:checks,allPassed:true})})().catch(e=>{console.error(e);process.exitCode=1});
