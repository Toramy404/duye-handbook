/* Weapon identities, source panels and legendary effects stay separate. */
(function(global){
'use strict';
var groups={all:'全部装备',melee:'近战',ranged:'远程',catalyst:'施法工具',shield:'盾牌'};
var rarities={common:'普通',uncommon:'优良',rare:'稀有',legendary:'传说'};
var names={physical:'物理',magic:'魔力',fire:'火',lightning:'雷',holy:'圣',critical:'致命一击',boost:'防御强度',strength:'力气',dexterity:'灵巧',intelligence:'智力',faith:'信仰',arcane:'感应',standard:'普通',strike:'打击',slash:'斩击',pierce:'突刺',scarlet_rot:'猩红腐败',blood_loss:'出血',frostbite:'冻伤',poison:'中毒'};
names.madness='发狂';names.sleep='催眠';names.range='射程';
var paths={melee:'M19 4 9 14l-3-3L16 1h6v6l-3-3ZM4 13l7 7M7 17l-5 5M1 20l3 3',ranged:'M5 2c16 1 16 19 0 20L13 12 5 2M2 12h20m-4-4 4 4-4 4',catalyst:'m5 22 10-15M12 2l7-1 4 6-7 2-4-7ZM4 18l4 3',shield:'M12 2 3 5v8c1 5 5 8 9 10 4-2 8-5 9-10V5L12 2ZM12 6v12M7 10h10'};
function glyph(group){return '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="'+paths[group]+'"/></svg>'}
function create(D,H){
 var sourceNames=new Map(D.sources.map(s=>[s.id,s.title]));
 var esc=H.esc,btn=H.btn,variants=new Map(D.weapon_variants.map(v=>[v.id,v])),observations=new Map(D.weapon_source_observations.map(o=>[o.id,o]));
 var links=new Map(D.weapon_effect_links.map(l=>[l.weapon_id,l])),indexed=new Map(D.weapons.map(r=>[r.id,Object.assign({},r,{description:r.description+' '+r.category_en})]));
 function variant(r){return variants.get(r.display_variant_id||r.variant_ids[0])}
 function score(r,q){return global.NR_CATALOG.score(indexed.get(r.id)||r,q)}
 function rarity(r){var v=variant(r);return v?v.rarity_label:links.has(r.id)?'legendary':null}
 function select(state){return D.weapons.filter(r=>(state.weaponGroup==='all'||r.group===state.weaponGroup)&&(state.weaponCategory==='all'||r.category_en===state.weaponCategory)&&(state.weaponRarity==='all'||(rarity(r)||'unknown')===state.weaponRarity)&&score(r,state.query)>0).sort((a,b)=>score(b,state.query)-score(a,state.query)||Number(links.has(b.id))-Number(links.has(a.id))||Number(!!variant(b))-Number(!!variant(a)))}
 function display(value){return value===null?'<span class="weapon-pending">待核</span>':esc(value)}
 function mini(v,r){
  if(!v)return '<span class="weapon-index-label">名称与分类</span>';
  if(r.group==='catalyst')return '<span>Spell Power <b>'+esc(v.spell_power.value)+'</b></span><span>近战物理 <b>'+esc(v.attack.physical.value)+'</b></span>';
  if(r.group==='shield'&&v.guard.value)return '<span>物理防御 <b>'+display(v.guard.value.physical)+'</b></span><span>防御强度 <b>'+display(v.guard.value.boost)+'</b></span>';
  return Object.entries(v.attack).filter(x=>x[1].state==='conflict'||x[1].value!==null&&x[1].value!==0).map(x=>'<span>'+esc(names[x[0]])+' <b>'+display(x[1].value)+'</b></span>').join('');
 }
 function card(r){
  var v=variant(r),quality=rarity(r);
  return '<article class="weapon-card rarity-'+(quality||'index')+'">'+H.openButton('weapons',r.id,
   '<h3>'+esc(r.name)+'</h3>'+(r.name_en?'<p class="weapon-en">'+esc(r.name_en)+'</p>':'')+
   '<div class="weapon-card-meta"><span class="weapon-type-icon">'+glyph(r.group)+'</span><span>'+esc(r.category)+'</span>'+(quality?'<span class="weapon-quality">'+esc(rarities[quality])+'</span>':'')+'</div>'+
   '<div class="weapon-mini">'+mini(v,r)+'</div><div class="weapon-card-foot"><span>'+(links.has(r.id)?'查看庇佑与战技':v?'查看面板与详情':'查看条目')+' ↗</span></div>','weapon-open')+H.favButton('weapons',r)+'</article>';
 }
 function page(state){
  var rows=select(state),subset=D.weapons.filter(r=>state.weaponGroup==='all'||r.group===state.weaponGroup),cats=Array.from(new Map(subset.map(r=>[r.category_en,r.category])).entries()),limit=state.limit||36;
  return '<div class="weapon-page">'+H.head('武器图鉴','找武器、看面板，查对应的传说效果。',btn('传说效果库 →','nav','legendary_weapon_effects','ghost'))+
   '<section class="weapon-intro"><div><span class="eyebrow">ARSENAL</span><h2>你的随身兵器簿</h2><p>近战、远程、施法工具与盾牌，按名称和类别快速查找。</p></div><div class="weapon-totals"><span><strong>'+D.weapons.length+'</strong>件装备</span><span><strong>'+D.weapons.filter(r=>rarity(r)==='legendary').length+'</strong>件传说</span></div></section>'+
   '<section class="panel weapon-controls"><div class="weapon-tabs" aria-label="装备大类">'+Object.entries(groups).map(([k,label])=>btn(label+' <small>'+D.weapons.filter(r=>k==='all'||r.group===k).length+'</small>','weapon-group',k,state.weaponGroup===k?'active':'')).join('')+'</div><div class="weapon-toolbar"><label class="weapon-query-label" for="local-query">搜索武器<input id="local-query" data-state="query" type="search" autocomplete="off" aria-label="搜索武器" placeholder="中文、English 或别名，如月光大剑" value="'+esc(state.query)+'"></label>'+H.select('weaponCategory',[['all','全部类别']].concat(cats),state.weaponCategory,'武器类别')+H.select('weaponRarity',[['all','全部品质']].concat(Object.entries(rarities),[['unknown','品质待核']]),state.weaponRarity,'品质')+'</div></section>'+
   '<div class="weapon-result-head"><p class="count">找到 <strong>'+rows.length+'</strong> 件装备</p>'+btn('清除筛选','reset-weapons',null,'text-button')+'</div>'+(rows.length?'<div class="weapon-grid">'+rows.slice(0,limit).map(card).join('')+'</div>':H.empty('没有匹配的武器','试试其他名称，或清除分类和品质筛选。'))+
   (rows.length>limit?'<div class="load-wrap">'+btn('再显示 36 件（还剩 '+(rows.length-limit)+'）','more-results',null,'ghost')+'</div>':'')+
   '<details class="weapon-reference"><summary>收录范围与说明</summary><p>'+D.weapons.length+' 件名称与分类，'+D.weapons.filter(r=>!!variant(r)).length+' 件含来源面板；'+D.weapon_effect_links.length+' 件已关联原传说效果库。传说品质单独按武器资料筛选，不用效果库数量替代。未决字段显示“待核”，各来源原值保留在详情末尾。</p><p>目录按 2025 年基础装备资料整理，尚未覆盖后续 DLC 初始装备；来源与数值条件在各条目末尾保留。</p></details></div>';
 }
 function stats(title,entries){return entries.length?'<section class="weapon-detail-section"><h3>'+title+'</h3><dl class="weapon-stats">'+entries.map(([label,val])=>'<div><dt>'+esc(label)+'</dt><dd>'+val+'</dd></div>').join('')+'</dl></section>':''}
 function auditHTML(r){
  var a=r.panel_audit,groups=new Map(),labels={level_required:'需求等级',rarity:'品质',critical:'致命一击',spell_power:'法术威力',skill_assignment:'战技分配'},prefix={attack:'攻击',guard:'防御',scaling:'补正'};
  a.differences.forEach(d=>{if(!groups.has(d.field))groups.set(d.field,[]);groups.get(d.field).push(d)});
  function value(v){return esc(rarities[v]||({source_example:'列出战技示例',random_pool:'随机战技'}[v])||v)}
  function source(id){return id.includes('armamenthelper')?'参数快照':id.includes('rps-transcription')?'RPS 转录':(sourceNames.get(id)||id).split(' · ')[0]}
  var h='<section class="weapon-audit"><h3>交叉核对</h3><p>'+esc(a.date)+' · '+a.compared_fields+' 类字段参与对照，'+a.matched_comparisons+' 次取值一致。相同不代表游戏实测；版本与计算条件仍需核验。</p>';
  if(groups.size)h+='<ul>'+Array.from(groups).map(([field,rows])=>{
   var bits=field.split('.'),label=labels[field]||(names[bits[1]]||bits[1])+(prefix[bits[0]]||''),d=rows[0];
   var refs=rows.map(x=>source(x.source_id)+' '+value(x.reference));
   var ending=d.resolution==='adopted'?'本次展示 '+value(d.adopted_value)+'。':d.resolution==='conditions_unknown'?'计算条件未对齐，保留页面示例，不合并、不作排名。':d.resolution==='assignment_note'?'示例不代表固定战技。':'正文标为待核。';
   return '<li><strong>'+esc(label)+'</strong>：Mobalytics '+value(d.primary)+'；'+refs.join('；')+'。'+ending+'</li>';
  }).join('')+'</ul>';
  if(a.notes&&a.notes.length)h+=a.notes.map(n=>'<p>'+esc(n)+'</p>').join('');
  return h+'</section>';
 }
 function detail(r){
  var v=variant(r),link=links.get(r.id),h='<p class="weapon-detail-category">'+esc(r.category)+(r.category_en?' · '+esc(r.category_en):'')+'</p>';
  if(v){
   h+=stats('攻击力',Object.entries(v.attack).filter(([,f])=>f.value!==null||f.state==='conflict').map(([k,f])=>[names[k],display(f.value)]));
   h+=stats('属性补正',Object.entries(v.scaling.grades||{}).map(([k,n])=>[names[k],display(n)]));
   var other=[];
   if(v.level_required!==null)other.push(['需求等级',esc(v.level_required)]);
   if(v.range&&v.range.value!==null)other.push(['射程',esc(v.range.value)]);
   if(v.attack_types.length)other.push(['物理类型',v.attack_types.map(x=>esc(names[x]||x)).join(' / ')]);
   if(v.critical.value!==null||v.critical.state==='conflict')other.push(['致命一击',display(v.critical.value)]);
   if(v.spell_power.value!==null)other.push(['Spell Power',esc(v.spell_power.value)]);
   h+=stats('其他面板',other);
   if(v.guard.value&&Object.values(v.guard.value).some(n=>typeof n==='number'&&n>0))h+=stats('防御',Object.entries(v.guard.value).map(([k,n])=>[names[k],display(n)]));
   if(v.status.effects&&v.status.effects.length)h+='<section class="weapon-detail-section"><h3>固有异常</h3><p>'+v.status.effects.map(e=>esc(names[e.type]||e.type)+'积累 '+esc(e.buildup)).join(' · ')+'</p></section>';
   var skill=v.skill.value,spell=v.spells.value;
   if(skill||spell)h+='<section class="weapon-detail-section"><h3>战技与法术</h3>'+(skill?'<p class="weapon-skill-kind">'+(v.skill_assignment==='example_with_random_report'?'战技随机 · 下方为示例':'战技示例')+'</p><p><strong>'+esc(skill.name_en)+'</strong></p>'+(skill.fp_cost_display!==null?'<p>FP 原页显示：<span class="mono">'+esc(skill.fp_cost_display)+'</span></p>':''):'')+(spell?'<p>法术栏 '+esc(spell.slots)+' 个</p>':'')+'</section>';
  }
  if(v&&v.skill_assignment==='random_pool')h+='<section class="weapon-detail-section"><h3>战技</h3><p>按类别池随机分配</p></section>';
  if(link){var effect=D.legendary_weapon_effects.find(x=>x.id===link.effect_id);h+='<section class="weapon-linked"><span class="eyebrow">LEGENDARY BLESSING</span><h3>'+esc(effect.effect_name||effect.name)+'</h3><p>'+esc(effect.description)+'</p>'+btn('查看传说效果与原始出处 →','weapon-effect',r.id,'text-button')+'</section>'}
  if(!v&&!link)h+='<p class="weapon-index-empty">已收录这件装备，面板与战技正在补充。</p>';
  h+='<details class="weapon-reference"><summary>来源与说明</summary>';
  if(v){
   h+='<div class="weapon-source-banner"><strong>来源报告 · 条件待核</strong><p>整理品质：'+esc(rarities[v.rarity_label]||'待核')+' · 需求等级：'+esc(v.level_required)+'</p><p>数值为来源示例；游戏补丁、强化、角色及品质与数值绑定尚未完整确认。</p></div>';
   if(v.scaling.state==='explicit_none')h+='<p>来源明确注明无属性补正。</p>';
   else h+='<p>属性补正只展示来源列出的项目；未列项保留未知。</p>';
   if(v.guard.value===null)h+='<p>'+esc(v.guard.reason)+'</p>';
   else if(Object.values(v.guard.value).every(n=>n===0))h+='<p>来源防御字段均为 0，正文省略该区块；原始 0 值仍保留。</p>';
   if(v.status.effects===null)h+='<p>待核：来源未给出固有异常条目。</p>';
   else if(v.status.state==='explicit_no_innate')h+='<p>来源称无固有异常；随机词条另计。</p>';
   if(!v.skill.value)h+='<p>'+esc((v.skill.reason||'').replace(/^(not_applicable|random_unobserved|unknown)：/,''))+'</p>';
   else h+='<p>战技为页面示例，固定掉落规则待核；FP 的分段格式按原页保留。</p>';
   if(v.spell_power.value!==null)h+='<p>Spell Power 为来源法术威力，独立于近战攻击力，计算条件待核。</p>';
  }
  if(r.panel_audit)h+=auditHTML(r);
  if((r.name_zh_status||'').includes('provisional'))h+='<p>中文名称沿用候选记录，英文身份保留。</p>';
  r.observation_ids.map(id=>observations.get(id)).filter(o=>o&&o.raw.scope==='skill_assignment_and_chinese_name').forEach(o=>{h+='<p>打刀的战技描述有差异：Mobalytics 列出 Unsheathe；BWIKI 标注“'+esc(o.raw.skill_assignment_text)+'”。未将示例认定为固定战技。</p>'});
  if(r.comparison_note)h+='<p>'+esc(r.comparison_note)+'</p>';
  h+='<ul>'+r.known_gaps.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul>'+H.sourceHTML(r.source_refs)+'</details>';
  return h;
 }
 return {page:page,card:card,detail:detail,select:select,score:score,variant:variant};
}
global.NR_WEAPONS={create:create};
})(window);
