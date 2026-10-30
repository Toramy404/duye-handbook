const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const M=read('docs/research/melee-12-source-observations.json'),R=read('docs/research/weapon-tools.json'),records={},reads=[],writes=[];
const prefix='duye-weapons-preview-v1:';
// Synthetic fixtures only; never inspect a real browser profile or production origin.
for(const key of ['nr-favorites','nr-recent-v1','nr-crystal-marks','nr-font-size','nr-effect-density','nr-view-memory-v1'])records[key]=JSON.stringify({productionSentinel:key});
records[prefix+'nr-favorites']=JSON.stringify(['legendary_weapon_effects|legendary:01']);
const originalProduction=JSON.stringify(Object.fromEntries(Object.entries(records).filter(([k])=>!k.startsWith(prefix))));
const node={addEventListener(){},querySelectorAll(){return[]},setAttribute(){},classList:{toggle(){},add(){},remove(){}},dataset:{},scrollTop:0,value:'',innerHTML:''};
const modal={...node,dataset:{},open:false,showModal(){this.open=true},close(){this.open=false}},box={...node};
const ctx={window:{scrollTo(){},addEventListener(){},scrollY:0},document:{getElementById(id){return id==='detail'?modal:box},querySelectorAll(){return[]},querySelector(){return box},addEventListener(){},body:node},localStorage:{getItem(k){reads.push(k);return records[k]||null},setItem(k,v){writes.push(k);records[k]=v}},setTimeout(){},clearTimeout(){},requestAnimationFrame(fn){fn()},CSS:{escape:s=>s},history:{replaceState(){},pushState(){}},location:{hash:'#weapons',host:'127.0.0.1:4318'}};
vm.createContext(ctx);for(const file of ['data.js','catalog.js','weapons.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),ctx);
let app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');app=app.slice(0,app.indexOf('applyDisplay();shell();initializeReadingMemory();'))+`render=function(){};toast=function(){};currentScroll=function(){return 27};setReadingScroll=function(){};window.test={state,weaponUI,detail,handleAction,resolveRecords,rememberView,restoreFields,navigate,search};})();`;vm.runInContext(app,ctx);
const T=ctx.window.test,D=ctx.window.NR_DATA,W=T.weaponUI;let checks=0;
function check(name,truth){assert.ok(truth,name);checks++}
function equal(a,b,name){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),name);checks++}
function action(a,v){T.handleAction({target:{closest(){return{dataset:{action:a,value:v}}}}})}
const legacy=w=>D.weapon_variants.find(v=>v.id===w.variant_ids[0]);
const originalData=JSON.stringify(D),get=id=>D.weapons.find(r=>r.id==='weapon:'+id),variant=id=>W.variant(get(id));
equal([D.weapons.length,new Set(D.weapons.map(r=>r.category_en)).size,D.weapon_effect_links.length,D.legendary_weapon_effects.length],[387,33,25,25],'coverage and unchanged old effect count');
equal(D.weapons.filter(r=>r.name_zh_status.includes('provisional')).length,11,'candidate translations retained');
check('unique IDs',new Set(D.weapons.map(r=>r.id)).size===387);
const src=new Set(D.sources.map(s=>s.id));check('source IDs unique',src.size===D.sources.length);
for(const w of D.weapons.filter(w=>w.research_sample_id)){
 const v=legacy(w),isMelee=w.group==='melee',original=isMelee?M.samples.find(r=>r.sample_id===w.research_sample_id):R.items.find(r=>r.id===w.research_sample_id),raw=isMelee?original.source_observations:[original.source_observation],first=raw[0];
 equal(w.observation_ids.filter(id=>!id.endsWith(':panel-observation-20261017')).map(id=>D.weapon_source_observations.find(o=>o.id===id).raw),raw,w.name+' source observations lossless');
 check(w.name+' source links resolve',w.source_refs.every(r=>src.has(r.source_id))&&src.has(v.source_id));
 check(w.name+' no overstated verification',w.verification_status==='source_reported'&&v.verification_status==='source_reported');
 equal(v.conditions,isMelee?first.numeric_conditions:original.conditions,w.name+' conditions unchanged');
 equal(v.rarity_stats_binding_confirmed,false,w.name+' no inferred rarity binding');
 for(const k of ['physical','magic','fire','lightning','holy'])equal(v.attack[k].value,(isMelee?first.attack_rating_display:first.attack)[k],w.name+' '+k+' exact');
 equal(v.scaling.grades,isMelee?first.attribute_scaling_display:first.scaling.grades,w.name+' scaling exact');
 equal(v.status.effects,isMelee?first.innate_status_display:first.status.effects,w.name+' status exact');
 if(!isMelee){equal(v.guard.value,first.guard,w.name+' guard exact');equal(v.critical.value,first.attack.critical,w.name+' critical exact');equal(v.spell_power.value,first.spell_power,w.name+' spell power separate');equal(v.skill.value,first.skill,w.name+' skill exact')}
 else {check(w.name+' unknown guard not zero',v.guard.value===null&&v.guard.state==='unknown'&&!!v.guard.reason);equal(v.critical.state,'unknown',w.name+' no assumed critical100')}
 check(w.name+' detail shows source and limitation',W.detail(w).includes('来源报告 · 条件待核')&&W.detail(w).includes('查看来源与核对范围'));
}
const expectedLinks={'axe-of-godfrey':'legendary:23','dark-moon-greatsword':'legendary:02','marikas-hammer':'legendary:15','bastards-stars':'legendary:17','bolt-of-gransax':'legendary:19','grafted-dragon':'legendary:22','carian-regal-scepter':'legendary:24'};
for(const [slug,id] of Object.entries(expectedLinks)){equal(D.weapon_effect_links.find(l=>l.weapon_id==='weapon:'+slug).effect_id,id,'explicit link '+slug);check('old linked record '+id,D.legendary_weapon_effects.some(r=>r.id===id))}
check('old legendary favorite resolves',T.resolveRecords(T.state.favorites,true)[0][1].id==='legendary:01');
check('unknown differs from explicit zero',legacy(get('battle-axe')).guard.value===null&&variant('hand-ballista').guard.value.boost===0);
check('FP0 not lost',W.detail(get('hand-ballista')).includes('FP 原页显示：<span class="mono">0</span>'));
check('unknown innate is not no innate',W.detail(get('astrologers-staff')).includes('待核：来源未给出固有异常'));
check('random shield skill not no skill',W.detail(get('brass-shield')).includes('未给具体战技'));
check('Uchigatana discrepancy visible',W.detail(get('uchigatana')).includes('Unsheathe')&&W.detail(get('uchigatana')).includes('BWIKI 标注“随机”'));
check('catalyst stats distinct',W.card(get('astrologers-staff')).includes('Spell Power <b>133</b>')&&W.card(get('astrologers-staff')).includes('近战物理 <b>25</b>'));
Object.assign(T.state,{view:'weapons',query:'月光大剑',weaponGroup:'melee',weaponCategory:'Greatsword',weaponRarity:'legendary'});
equal(W.select(T.state).map(r=>r.id),['weapon:dark-moon-greatsword'],'alias and combined filters');
T.rememberView();T.navigate('home');T.navigate('weapons');equal([T.state.query,T.state.weaponGroup,T.state.weaponCategory,T.state.weaponRarity],['月光大剑','melee','Greatsword','legendary'],'return restores all filters');
T.detail('weapons','weapon:dark-moon-greatsword');action('weapon-effect','weapon:dark-moon-greatsword');equal(modal.dataset.record,'legendary_weapon_effects|legendary:02','opens old effect');ctx.window.NR_APP_BACK();equal(modal.dataset.record,'weapons|weapon:dark-moon-greatsword','effect back to weapon');ctx.window.NR_APP_BACK();check('weapon back retains list filters',!modal.open&&T.state.view==='weapons'&&T.state.query==='月光大剑');
action('favorite','weapons|weapon:dark-moon-greatsword');check('new and legacy favorites coexist',T.resolveRecords(T.state.favorites,true).length===2);
action('font-size','large');action('density','cards');action('clear-recent');action('undo-recent');T.rememberView();
check('all storage reads and writes isolated',reads.every(k=>k.startsWith(prefix))&&writes.every(k=>k.startsWith(prefix)));
equal(JSON.stringify(Object.fromEntries(Object.entries(records).filter(([k])=>!k.startsWith(prefix)))),originalProduction,'production fixtures untouched');
action('reset-weapons');T.state.query='Carian Regal';equal(W.select(T.state).map(r=>r.id),['weapon:carian-regal-scepter'],'English multiword search');
T.state.query='不存在xyz';equal(W.select(T.state).length,0,'empty result');T.state.query='';action('weapon-group','shield');equal(W.select(T.state).length,71,'shield filter');
T.state.global='月光大剑';check('global search includes weapon',T.search().includes('weapons|weapon:dark-moon-greatsword'));
T.state.view='weapons';ctx.window.NR_APP_BACK();equal(T.state.view,'home','weapon list parent home');equal(ctx.window.NR_APP_BACK(),'exit','home exit');

const expansion=read('docs/research/weapon-legendary-expansion-20261017.json');
equal(D.weapons.filter(w=>w.variant_ids.length).length,387,'all 387 identities have explicit source panels');
for(const raw of expansion.items){
 const w=get(raw.slug),v=legacy(w);
 equal(Object.fromEntries(Object.entries(v.attack).map(([k,f])=>[k,f.value])),raw.attack,w.name+' new attack matches source');
 equal(v.guard.value,raw.guard,w.name+' new guard matches source');
 equal(v.scaling.grades,raw.scaling,w.name+' new scaling matches source');
 equal(v.status.effects,raw.status,w.name+' new status matches source');
 equal(v.skill.value,raw.skill,w.name+' new FP and skill match source');
 equal(D.weapon_effect_links.find(l=>l.weapon_id===w.id).effect_id,raw.effect_id,w.name+' legendary ID is explicit');
}
for(const w of D.weapons){
 check(w.name+' identity sources resolve',w.source_refs.length>0&&w.source_refs.every(r=>src.has(r.source_id)));
 const html=W.detail(w),body=html.split('<details class="weapon-reference">')[0],card=W.card(w);
 check(w.name+' source section last',html.includes('<summary>来源与说明</summary>')&&!body.includes('来源报告')&&html.endsWith('</details>'));
 check(w.name+' name before type',card.indexOf('<h3>')<card.indexOf('weapon-card-meta'));
 check(w.name+' render no missing values',!html.includes('undefined')&&!html.includes('NaN'));
}
for(const id of ['hand-ballista','lion-greatbow']){
 const body=W.detail(get(id)).split('<details class="weapon-reference">')[0];
 check(id+' no empty defense or status block',!body.includes('<h3>防御</h3>')&&!body.includes('<h3>固有异常</h3>'));
}
check('known status kept',W.detail(get('antspur-rapier')).split('<details class="weapon-reference">')[0].includes('猩红腐败积累 56'));
check('shield guard kept',W.detail(get('brass-shield')).split('<details class="weapon-reference">')[0].includes('<h3>防御</h3>'));
check('all legendary effects linked once',new Set(D.weapon_effect_links.map(l=>l.effect_id)).size===25);
const knight=D.weapons.find(w=>w.name==='骑士大剑');
check('wrongly labeled table not imported',W.variant(knight).attack.holy.value===0&&W.variant(knight).attack.physical.value===107&&variant('golden-order-greatsword').attack.holy.value===102);
Object.assign(T.state,{view:'weapons',query:'',weaponGroup:'all',weaponCategory:'all',weaponRarity:'legendary',limit:36});
equal(W.select(T.state).length,26,'legendary filter uses rarity, including Eclipse Shotel');
T.state.weaponRarity='all';equal((W.page(T.state).match(/<article class="weapon-card/g)||[]).length,36,'large catalog paginates initial 36');
action('more-results');equal((W.page(T.state).match(/<article class="weapon-card/g)||[]).length,72,'next page appends 36');
T.rememberView();T.navigate('home');T.navigate('weapons');equal(T.state.limit,72,'return preserves loaded count');
action('reset-weapons');equal(T.state.limit,36,'clear resets loaded count');


const audit=read('docs/research/weapon-panel-audit-20261017.json');
const followup=read('docs/research/weapon-panel-followup-20261018.json');
equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'docs/research/weapon-panel-audit-20261017.json'))).digest('hex'),followup.base_audit_sha256,'first audit remains unchanged');
for(const extra of followup.items){
 const row=audit.items.find(x=>x.weapon_id===extra.weapon_id);
 equal(row.game_id,extra.game_id,'follow-up identity uses exact parameter ID');
 for(const key of ['comparators','comparisons','resolutions'])row[key].push(...extra[key]);
 if('quality_needs_review' in extra)row.quality_needs_review=extra.quality_needs_review;
}

const byEnglish=name=>D.weapons.find(w=>w.name_en===name),active=name=>W.variant(byEnglish(name));
equal(D.weapon_variants.filter(v=>!v.id.endsWith(':panel-20261017')).length,42,'historical 42 panels retained');
equal(new Set(D.weapons.map(w=>w.game_parameter_id)).size,387,'base parameter identity is unique for every weapon');
for(const item of audit.items){
 const w=D.weapons.find(w=>w.id===item.weapon_id),v=W.variant(w);
 check(w.name+' active panel reference',w.display_variant_id===v.id&&w.variant_ids.includes(v.id));
 equal(D.weapon_source_observations.find(o=>o.id===v.observation_id).raw,item.primary,w.name+' original current-page values preserved');
 for(const family of ['attack','guard','scaling'])for(const [key,raw] of Object.entries(item.primary[family])){
  const field=family+'.'+key,res=item.resolutions.find(r=>r.field===field),actual=family==='attack'?v.attack[key].value:family==='guard'?v.guard.value[key]:v.scaling.grades[key];
  equal(actual,v.pending_fields.includes(field)?null:res?res.value:raw,w.name+' '+field+' follows explicit decision');
 }
 check(w.name+' not game-verified',v.verification_status==='source_reported'&&v.rarity_stats_binding_confirmed===false&&Object.values(v.conditions).every(x=>x===null));
 check(w.name+' independent parameter mapping',item.comparators.some(c=>c.source_id==='weapon-panel:armamenthelper'&&c.locator.includes(String(w.game_parameter_id))));
 check(w.name+' all comparison links resolve',item.comparisons.every(c=>src.has(c.source_id)));
 for(const decision of item.resolutions){
  check(w.name+' correction has supporting facts',decision.source_ids.length>=2&&decision.source_ids.every(id=>item.comparators.some(c=>c.source_id===id&&c.fields[decision.field]===decision.value)));
 }
}
equal(active('Rotten Battle Hammer').guard.value.magic,36,'reject 366 typo with explicit corroboration');
equal([active('Staff of the Avatar').attack.physical.value,active('Staff of the Avatar').attack.holy.value,active('Staff of the Avatar').guard.value.boost],[96,64,48],'Avatar values from recorded corrections');
equal(active('Greathorn Hammer').attack.physical.value,111,'Greathorn conflicting panel corrected');
equal(active('Cleanrot Spear').attack.holy.value,44,'Cleanrot holy attack corrected');
equal(active('Miséricorde').scaling.grades.dexterity,'S','two independent tables support Misericorde scaling correction');
equal(active("Executor's Blade").rarity_label,'common','starting blade is not the summoned legendary skill blade');
equal(active('Eclipse Shotel').rarity_label,'legendary','Eclipse quality independent from old blessing library');
check('Eclipse does not invent a blessing',!D.weapon_effect_links.some(l=>l.weapon_id===byEnglish('Eclipse Shotel').id));
equal(active('Nightrider Flail').attack.physical.value,82,'Flail base physical corroborated by parameter and GameWith');
equal(active('Fallingstar Beast Jaw').attack.magic.value,67,'Jaw base magic corroborated by parameter and GameWith');
equal(active('Erdtree Seal').attack.holy.value,15,'Seal holy 15 is not lost as zero');
equal(active('Sacred Relic Sword').critical.value,110,'critical independently corroborated by two new detail pages');
equal(active('Nightrider Flail').pending_fields,['guard.boost'],'unresolved guard field remains explicit');
equal(active('Nightrider Flail').guard.value.boost,null,'21 vs 32 guard is not guessed');
check('pending guard visibly rendered',W.detail(byEnglish('Nightrider Flail')).split('<details class="weapon-reference">')[0].includes('待核'));
check('training example is not merged into base damage',byEnglish('Nightrider Flail').panel_audit.differences.some(d=>d.field==='attack.physical'&&d.reference===73&&d.resolution==='conditions_unknown'&&d.adopted_value===null));
equal(followup.items.reduce((n,x)=>n+x.resolutions.filter(r=>r.field!=='rarity').length,0),23,'23 of 24 original numeric fields resolved');
equal(D.weapons.filter(w=>W.variant(w).pending_fields.some(k=>k!=='rarity')).map(w=>w.name_en),['Nightrider Flail'],'only Flail numeric pending in this audit scope');
const reviewedShields=followup.items.filter(x=>x.quality_was_pending);
equal(reviewedShields.length,43,'all 43 original unknown shield qualities reviewed');
equal(reviewedShields.reduce((counts,x)=>{const r=x.resolutions.find(r=>r.field==='rarity');counts[r.value]=(counts[r.value]||0)+1;return counts},{}),{rare:20,uncommon:23},'direct classifications give 20 purple and 23 blue shields');
for(const item of reviewedShields){
 const w=D.weapons.find(w=>w.id===item.weapon_id),decision=item.resolutions.find(r=>r.field==='rarity');
 equal(W.variant(w).rarity_label,decision.value,w.name+' uses explicit two-site rarity');
 check(w.name+' rarity adoption does not claim numeric binding',!W.variant(w).rarity_stats_binding_confirmed&&w.panel_audit.notes.some(s=>s.includes('基础品质')));
}
check('adoption rationale remains at end of details',W.detail(byEnglish('Ivory Sickle')).split('<details class="weapon-reference">')[1].includes('GameWith与Game8'));

check('conflict retains both actual values',W.detail(byEnglish('Fallingstar Beast Jaw')).includes('Mobalytics 76')&&W.detail(byEnglish('Fallingstar Beast Jaw')).includes('参数快照 67'));
check('real melee guard now shown',W.detail(get('battle-axe')).split('<details class="weapon-reference">')[0].includes('<h3>防御</h3>')&&variant('battle-axe').guard.value.boost===36);
equal(active('Scorpion Kite Shield').level_required,3,'shield level no longer globally one');
equal(active('Scorpion Kite Shield').rarity_label,'uncommon','shield quality uses direct classifications, not level inference');
Object.assign(T.state,{weaponGroup:'all',weaponCategory:'all',weaponRarity:'unknown',query:''});
equal(W.select(T.state).length,0,'all originally suspect shield qualities now have explicit corroboration');
check('no conversion of numeric coefficients to letter grade',active('Hand Ballista').scaling.state==='not_listed'&&Object.keys(active('Hand Ballista').scaling.grades).length===0);
check('spell power conditions remain separate',byEnglish("Astrologer's Staff").panel_audit.differences.some(d=>d.field==='spell_power'&&d.resolution==='conditions_unknown')&&active("Astrologer's Staff").spell_power.value===133);
Object.assign(T.state,{weaponGroup:'all',weaponCategory:'all',weaponRarity:'legendary',query:''});
check('legendary filter excludes starting blade',!W.select(T.state).includes(byEnglish("Executor's Blade"))&&W.select(T.state).includes(byEnglish('Eclipse Shotel')));
Object.assign(T.state,{weaponRarity:'all',query:'Wing of Astel'});equal(W.select(T.state).map(w=>w.name_en),['Wing of Astel'],'new English identities searchable');
T.state.query='艾丝缇薄翼';equal(W.select(T.state).map(w=>w.name_en),['Wing of Astel'],'parameter Chinese alias searchable without replacing stable ID');
T.state.query='';
check('correction explanations render as text',D.corrections.every(c=>typeof c.evidence==='string'));

equal(JSON.stringify(D),originalData,'all UI operations preserve data');
const sw=fs.readFileSync(path.join(root,'dist/sw.js'),'utf8');check('worker uses the selected environment prefix',sw.includes('key.startsWith(CACHE_PREFIX)'));
const hashes={'data/legendary_weapon_effects.json':'d0904d3b95ca8542125b90f0f8afa8ef6611fb237d995f3d03e8ff69528f6355','data/effects.json':'5580a3d4aabfc0da4902711a0314d0c1ecad159f31470c11e0f198fcb01ee612','data/map_patterns.json':'5660a20b2a6e626e09d8cce0d72277410ae30f70057eb08f4b24251ec3cf09ed','data/characters.json':'ecc3a9d15547626632e84d684b9af954733813031ec3293827e4eb34117cf235','docs/research/weapon-catalog-samples-20261017.md':'2688bf1721999ba1bb3181e17a50fffb13251d640fdcfcb592b249db6141127f','docs/research/melee-12-source-observations.json':'fa76330e7fd0e961811f637e3e577ca348e18137f899723fa5d100fc18770854','docs/research/weapon-tools.json':'112230a22cb4213c25c3eee4fdbbf6260bf79388eec5dbeefeef533db3fd4e80'};
for(const [p,hash] of Object.entries(hashes))equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),hash,p+' original hash');
console.log({weaponChecks:checks,allPassed:true});
