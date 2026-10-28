// Exercise every existing page/detail and cross-page flows against real data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
function boot(saved={}){
 const nodes=new Map(),events={},store={...saved},location={host:'127.0.0.1:4318',hash:'#home'},metrics={voiceLeaves:0};
 function node(id){if(!nodes.has(id))nodes.set(id,{id,dataset:{},value:'',innerHTML:'',scrollTop:0,open:false,style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},setSelectionRange(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},close(){this.open=false},showModal(){this.open=true},addEventListener(type,fn){(events[id+':'+type]??=[]).push(fn)}});return nodes.get(id)}
 const ctx={window:{innerWidth:1000,scrollTo(){},addEventListener(){},scrollY:0,NR_VOICE:{create(D,h){metrics.voiceHooks=h;return {page:()=>'<h1>语音查询</h1>',mounted(){},bind(){},leave(){metrics.voiceLeaves++},action(){}}}}},document:{getElementById:node,querySelector:node,querySelectorAll(){return []},addEventListener(){},body:node('body')},localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},setTimeout(){},clearTimeout(){},requestAnimationFrame(fn){fn()},CSS:{escape:String},history:{pushState(s,t,url){location.hash=url},replaceState(s,t,url){location.hash=url}},location};
 vm.createContext(ctx);
 for(const f of ['data.js','catalog.js','weapons.js','circle-timer.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 let code=fs.readFileSync(path.join(root,'app.js'),'utf8');
 code=code.slice(0,code.indexOf('applyDisplay();shell();initializeReadingMemory();'))+'window.audit={state,titles,collections,navigate,render,detail,familyDetail,viewMemory,effectGroups,damageHTML};})();';
 vm.runInContext(code,ctx);
 const A=ctx.window.audit;
 return {A,D:ctx.window.NR_DATA,C:ctx.window.NR_CATALOG,metrics,node,ctx,input(id,value){const target=node(id);target.value=value;(events['app:input']||[]).forEach(fn=>fn({target}))}};
}
test('all page routes render with the real data bundle',()=>{
 const {A,node}=boot(),errors=[];
 for(const route of Object.keys(A.titles)){try{A.navigate(route);assert.ok(node('content').innerHTML.length>0,route)}catch(e){errors.push(route+': '+e.message)}}
 assert.deepEqual(errors,[]);
});
test('all record and effect-group details render without changing source data',()=>{
 const {A,D,node}=boot(),original=JSON.stringify(D),errors=[];let count=0;
 for(const collection of Object.keys(A.collections))for(const row of D[collection]||[]){try{
  A.detail(collection,row.id);count++;
  for(const match of node('detail').innerHTML.matchAll(/<img[^>]+src="([^"]+)"/g))assert.ok(fs.existsSync(path.join(root,match[1])),collection+'/'+row.id+' missing image '+match[1]);
 }catch(e){errors.push(collection+'/'+row.id+': '+e.message)}}
 for(const group of A.effectGroups){A.familyDetail(group.id);count++}
 assert.deepEqual(errors,[]);assert.equal(JSON.stringify(D),original);assert.ok(count>2000);assert.ok(node('detail').innerHTML.length>100);
});
test('a character result overrides the previously remembered character, preserving level',()=>{
 const {A}=boot();A.viewMemory.characters={fields:{char:'wylder',level:8},scroll:{}};
 A.navigate('voice');A.detail('characters','ironeye');assert.equal(A.state.char,'ironeye');assert.equal(A.state.level,8);
});
test('typing in global search from voice releases capture and clears back to voice',()=>{
 const f=boot();f.A.navigate('voice');f.input('global-search','暗月');assert.equal(f.metrics.voiceLeaves,1);assert.equal(f.A.state.view,'search');
 f.input('global-search','');assert.equal(f.A.state.view,'voice');
});
test('voice full-library search returns to voice after clearing the query',()=>{
 const f=boot();f.A.navigate('voice');f.metrics.voiceHooks.search('暗月');f.input('global-search','');assert.equal(f.A.state.view,'voice');
});
test('a spoken tier opens the matching original row in the effect table',()=>{
 const f=boot(),g=f.A.effectGroups.find(g=>g.name==='提升物理攻击力'&&g.context==='out');
 f.metrics.voiceHooks.open({collection:'effect_groups',id:g.id,tier:0});
 const row=g.rows.find(r=>f.C.displayTier(f.D,r)===0);assert.equal(f.node('detail').dataset.focus,row.id);
});
test('wild boss poise preserves numeric and uncertain text values',()=>{
 const f=boot();for(const r of f.D.wild_bosses){const html=f.A.damageHTML(r);assert.ok(html.includes('基础韧性：'+r.poise),r.id);assert.ok(!html.includes('normal.png')&&!html.includes('scarletRot'),r.id+' raw source keys are translated')}
});
test('malformed saved records and obsolete character IDs cannot break the home and character pages',()=>{
 const prefix='duye-weapons-preview-v1:',f=boot({[prefix+'nr-favorites']:JSON.stringify([null,3,'nightlords|gladius']),[prefix+'nr-recent-v1']:JSON.stringify([false,'nightlords|gladius']),[prefix+'nr-crystal-marks']:'"invalid"',[prefix+'nr-view-memory-v1']:JSON.stringify({characters:{fields:{char:'removed',level:99}}})});
 for(const route of ['home','favorites','crystals','characters'])assert.doesNotThrow(()=>f.A.navigate(route),route);
 assert.ok(f.A.state.favorites.includes('nightlords|gladius'));
});
