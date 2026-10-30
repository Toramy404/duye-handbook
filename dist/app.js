/* Offline, dependency-free reference UI. No remote data fetches. */
(function(){
'use strict';
var D=window.NR_DATA,root=document.getElementById('app'),modal=document.getElementById('detail');
var esc=function(v){return String(v==null?'—':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var text=function(v){return esc(v)};
var previewMode=!window.NightreignNative&&['127.0.0.1:4318','localhost:4318'].includes(location.host);
var storagePrefix=previewMode?'duye-weapons-preview-v1:':'';
var weaponDetailParent=null;
var load=function(k,fallback){try{return JSON.parse(localStorage.getItem(storagePrefix+k))||fallback}catch(e){return fallback}};
var persist=function(k,v){try{localStorage.setItem(storagePrefix+k,JSON.stringify(v))}catch(e){toast('浏览器暂不允许保存，本次仍可使用')}};
var state={view:'home',context:'out',fontSize:load('nr-font-size','normal'),global:'',query:'',scope:'all',stack:'all',limit:36,mode:'regular',map:'all',n1:'',n2:'',extra:'',extraDay:'any',char:'wylder',level:15,eventLord:'all',marks:load('nr-crystal-marks',{}),layout:'all',zoom:1,players:'3',favorites:load('nr-favorites',[]),phone:!window.NightreignNative&&window.innerWidth>480,tag:'all',density:load('nr-effect-density','compact'),recent:load('nr-recent-v1',[]),searchReturn:'home',weaponGroup:'all',weaponCategory:'all',weaponRarity:'all'};
if(!Array.isArray(state.recent))state.recent=[];
if(!Array.isArray(state.favorites))state.favorites=[];
state.recent=state.recent.filter(function(k){return typeof k==='string'});
state.favorites=state.favorites.filter(function(k){return typeof k==='string'});
if(!state.marks||typeof state.marks!=='object'||Array.isArray(state.marks))state.marks={};
if(!['compact','cards'].includes(state.density))state.density='compact';
var collections={weapons:'武器图鉴',effects:'词条',items:'道具',legendary_weapon_effects:'传说武器',recluse_spells:'混合魔法',dodge_frames:'动作帧数',libra_trades:'商人交易',wild_bosses:'野外Boss',characters:'角色',nightlords:'夜王',events:'事件'};
var titles={voice:'语音查询',timer:'缩圈倒计时',weapons:'武器图鉴',home:'首页',effects:'词条',bosses:'夜王',crystals:'水晶',characters:'角色',events:'事件',favorites:'我的收藏',more:'更多资料',about:'数据与来源',items:'道具速查',legendary_weapon_effects:'传说武器',recluse_spells:'隐士混合魔法',dodge_frames:'动作帧数',libra_trades:'持秤商人交易',wild_bosses:'野外Boss',search:'全库搜索',settings:'设置'};
var maps={all:'全部地形',standard:'无地变地图',great_hollow:'大空洞',mountaintop:'山顶',crater:'火山口',rotted_woods:'腐败森林',noklateo:'隐城'};
var scopes={all:'全部',relic:'局外遗物',deep_relic:'深夜遗物',in_run:'局内词条',deep_in_run:'深夜局内',talisman:'护符',special_buff:'特殊效果'};
var attrs={vigor:'生命力',mind:'集中力',endurance:'耐力',strength:'力气',dexterity:'灵巧',intelligence:'智力',faith:'信仰',arcane:'感应'};
var damageNames={normal:'物理',standard:'物理',strike:'打击',slash:'斩击',pierce:'突刺',magic:'魔力',fire:'火',lightning:'雷',holy:'圣'};
var statusNames={scarletRot:'腐败',poison:'中毒',rot:'腐败',bleed:'出血',frost:'冻伤',sleep:'催眠',madness:'发狂',death_blight:'咒死'};
var shortNames={gladius:'三头犬',adel:'艾德雷',gnoster:'智虫',maris:'玛丽斯',libra:'利普拉',fulghor:'弗格尔',caligo:'卡莉果',heolstor:'布德奇冥',harmonia:'安定者',straghess:'废弃物王'};
var symbols={gladius:'狼',adel:'牙',gnoster:'虫',maris:'海',libra:'秤',fulghor:'骑',caligo:'雾',heolstor:'夜',harmonia:'衡',straghess:'王'};
var sourceMap=Object.fromEntries(D.sources.map(function(s){return[s.id,s]}));
var byId=function(coll,id){return (coll==='effect_groups'?effectGroups:(D[coll]||[])).find(function(r){return r.id===id})};
var bossName=function(id){var r=byId('night_boss_catalog',id);return r?r.name:id||'—'};
var lordName=function(id){var r=byId('nightlords',id);return r?r.name:id||'—'};
var iconPaths={voice:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5ZM6 11v1a6 6 0 0 0 12 0v-1M12 18v4M8 22h8',timer:'M12 8v5l3 2M9 2h6M12 2v3M4 14a8 8 0 1 0 16 0 8 8 0 1 0-16 0',weapons:'M20 3 8 15l-3-3L17 1h5v5l-2-3ZM3 14l7 7M6 18l-4 4',back:'m14 5-7 7 7 7',settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1zM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0',home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',effects:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',bosses:'m4 4 5 7-4 3 7 7 7-7-4-3 5-7-8 3z',crystals:'m12 2 8 9-8 11-8-11zM4 11h16M12 2v20',characters:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-3a8 8 0 0 1 16 0v3',events:'m13 2-9 12h7l-1 8 10-13h-8z',favorites:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',more:'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z',about:'M12 11v7M12 7v1M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0'};
var icon=function(k){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(iconPaths[k]||iconPaths.effects)+'"/></svg>'};
var btn=function(label,action,value,cls){return '<button class="'+(cls||'')+'" data-action="'+action+'"'+(value!=null?' data-value="'+esc(value)+'"':'')+(action==='back'?' aria-label="返回上一级"':'')+'>'+label+'</button>'};
var option=function(v,label,cur){return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(label)+'</option>'};
var select=function(key,values,cur,label){return '<label class="field">'+esc(label)+'<select data-state="'+key+'" aria-label="'+esc(label)+'">'+values.map(function(p){return option(p[0],p[1],cur)}).join('')+'</select></label>'};
var badge=function(r){var s=r.verification_status;if(s==='conflict')return '<span class="badge warn">来源有差异</span>';if(s==='corrected_from_source_comparison'||s==='corrected_from_primary_map')return '<span class="badge ok">已校正</span>';if(s==='cross_checked')return '<span class="badge ok">'+(r.field_comparison?'部分字段已核':'跨表已核')+'</span>';if(s==='needs_verification')return '<span class="badge">待补核</span>';return ''};
var keyOf=function(c,r){return c+'|'+r.id};
var favButton=function(c,r){var key=keyOf(c,r),on=state.favorites.indexOf(key)>=0;return '<button class="fav '+(on?'on':'')+'" data-action="favorite" data-value="'+esc(key)+'" aria-label="'+(on?'取消收藏':'收藏')+esc(r.name)+'" aria-pressed="'+on+'">'+(on?'★':'☆')+'</button>'};
var openButton=function(c,id,body,cls){return '<button class="'+(cls||'record-open')+'" data-action="detail" data-value="'+esc(c+'|'+id)+'">'+body+'</button>'};
var recordDesc=function(r){return r.description||r.trigger_summary||r.role_summary||r.effect_name||r.damage_text||(r.frames!=null?r.frames+'帧 · '+r.measurement_fps+'fps · '+r.frame_type:'')||(r.damage_multiplier?'承伤倍率、异常抵抗与韧性':'')};
var card=function(c,r){if(c==='weapons'&&weaponUI)return weaponUI.card(r);if(c==='effect_groups'||c==='effect_families')return familyCard(r);if(c==='effects')return familyCard(familyForRecord(r));return '<article class="record-card '+(c==='events'?'event-card':'')+'">'+openButton(c,r.id,'<div class="record-top"><span class="badge">'+esc(r.scope_zh||r.category||collections[c]||'资料')+'</span>'+badge(r)+'</div><h3>'+esc(r.name)+'</h3><p class="excerpt">'+esc(recordDesc(r))+'</p>'+(c==='events'?'<p class="event-elig">出现关联：'+esc((r.eligible_nightlord_ids||[]).map(lordName).join(' · ')||'未限定')+'</p>':''))+favButton(c,r)+'</article>'};
var empty=function(title,desc){return '<div class="empty"><strong>'+esc(title)+'</strong>'+esc(desc)+'</div>'};
var head=function(title,desc,action){return '<div class="page-head"><div><h1>'+esc(title)+'</h1>'+(desc?'<p class="muted">'+esc(desc)+'</p>':'')+'</div>'+(action||'')+'</div>'};
var sourceHTML=function(refs){return '<details><summary>查看来源与核对范围</summary><div class="source-list">'+(refs||[]).map(function(r){var s=sourceMap[r.source_id];return s?'<div class="source-item"><a href="'+esc(r.url||s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a><p>'+esc(r.locator||'来源索引')+(s.version?' · '+esc(s.version):'')+'</p></div>':''}).join('')+'</div><p class="small muted">来源链接需联网；本页资料已保存在本机。社区跨表一致不等于独立游戏实测。</p></details>'};
var weaponUI=window.NR_WEAPONS?window.NR_WEAPONS.create(D,{esc:esc,btn:btn,head:head,select:select,openButton:openButton,favButton:favButton,empty:empty,sourceHTML:sourceHTML}):null;
var timerUI=window.NR_TIMER?window.NR_TIMER.create(D,{esc:esc,btn:btn,head:head,sourceHTML:sourceHTML,load:load,persist:persist,render:render,toast:toast}):null;
var voiceUI=window.NR_VOICE?window.NR_VOICE.create(D,{esc:esc,head:head,render:render,active:function(){return state.view==='voice'},open:function(c){if(c.collection==='effect_groups'){var group=groupById.get(c.id),row=group&&c.tier!=null?group.rows.find(function(r){return catalog.displayTier(D,r)===c.tier}):null;familyDetail(c.id,row&&row.id)}else detail(c.collection,c.id)},search:function(q){state.searchReturn='voice';navigate('search');state.global=q;document.getElementById('global-search').value=q;render()}}):null;
function shell(){
 var nav=['home','voice','timer','weapons','effects','bosses','crystals','characters','events','favorites','more','settings'];
 root.innerHTML='<div class="shell"><div class="phone-banner"><span>手机 App 预览 · 390px</span>'+btn('展开预览','phone',null,'ghost')+'</div><aside class="sidebar"><div class="brand"><span class="knight-avatar brand-mark"><img src="assets/rain-knight.png" alt="打伞淋雨的小骑士"></span><div><strong>渡夜手册</strong><small>NIGHTREIGN COMPANION</small></div></div><nav class="nav" aria-label="主要导航">'+nav.map(function(v,i){return btn(icon(v)+'<span class="nav-label">'+titles[v]+'</span><span class="nav-index">'+String(i+1).padStart(2,'0')+'</span>','nav',v)}).join('')+'</nav><div class="sidebar-foot"><span class="online-dot"></span>本地资料 · 随时查阅<br><span class="small">含 DLC / 深夜模式<br>数据核对 2026.10.14</span></div></aside><div class="main">'+(previewMode?'<div class="preview-ribbon">预览版 · 收藏、设置与正式版独立保存</div>':'')+'<header class="topbar">'+btn(icon('back'),'back',null,'icon-button back-button')+'<div class="top-search"><span class="search-icon">⌕</span><input id="global-search" type="search" autocomplete="off" aria-label="搜索全部资料" placeholder="搜索武器、词条、角色或夜王…"><button class="voice-shortcut" data-action="nav" data-value="voice" aria-label="语音查询">'+icon('voice')+'</button></div><button class="timer-shortcut ghost" data-action="nav" data-value="timer" data-timer-badge>缩圈计时</button><div class="top-tools"><span id="offline-state" class="small muted"><span class="online-dot"></span>资料已载入</span>'+btn('手机预览','phone',null,'ghost')+'</div>'+btn(icon('settings'),'nav','settings','icon-button settings-button')+'</header><main id="content" class="content"></main></div><nav class="bottom-nav" aria-label="移动导航">'+['home','effects','bosses','crystals','more'].map(function(v){return btn(icon(v)+'<span>'+({home:'首页',effects:'词条',bosses:'夜王',crystals:'水晶',more:'更多'}[v])+'</span>','nav',v)}).join('')+'</nav></div>';
 render();
}
// Grouped browsing: row IDs point back to the unchanged effects array.
var catalog=window.NR_CATALOG;
var effectsById=new Map(D.effects.map(function(r){return[r.id,r]}));
var familyById=new Map(D.effect_families.map(function(f){return[f.id,f]}));
var effectGroups=catalog.groups(D),groupById=new Map(effectGroups.map(function(g){return[g.id,g]}));
function groupForFamily(f,context){return effectGroups.find(function(g){return g.family.id===f.id&&g.context===(context||state.context)})||effectGroups.find(function(g){return g.family.id===f.id})}
function familyForRecord(r){return groupById.get(D.effect_members[r.id].family_id+'@'+catalog.scopeContexts[r.scope])}
function asGroup(f){return f.context?f:groupForFamily(f)}
function familyRows(f){return asGroup(f).rows}
function tierLabel(r){var tier=catalog.displayTier(D,r);return tier!==null?'+'+tier:r.talisman_name||''}
function modifierNote(r){var note=String(r.negative_modifier_requirement||'').trim();return ['不附带负面词条','随机加入正面词条'].includes(note)?'':note}
function familySaved(f){var g=asGroup(f);return state.favorites.includes('effect_groups|'+g.id)||state.favorites.includes('effect_families|'+g.family.id)||g.rows.some(function(r){return state.favorites.includes('effects|'+r.id)})}
function familyFav(f){var g=asGroup(f),on=familySaved(g);return '<button class="fav '+(on?'on':'')+'" data-action="family-favorite" data-value="'+esc(g.id)+'" aria-label="'+(on?'取消收藏':'收藏')+esc(g.name)+' · '+catalog.contexts[g.context]+'" aria-pressed="'+on+'">'+(on?'★':'☆')+'</button>'}
function familyCard(result){
 var g=asGroup(result),rows=catalog.orderedRows(D,result.rows||g.rows),scopeList=Array.from(new Set(rows.map(function(r){return r.scope})));
 var shown=state.density==='compact'?rows.slice(0,2):rows;
 var tiers=Array.from(new Set(rows.map(function(r){return catalog.displayTier(D,r)}).filter(function(t){return t!==null}))).sort(function(a,b){return b-a});
 var summary=shown.map(function(r){return '<span class="summary-line" data-record-id="'+esc(r.id)+'">'+(tierLabel(r)?'<b>'+esc(tierLabel(r))+'</b>':'')+'<span class="summary-copy"><span class="summary-description">'+esc(r.description)+'</span><span class="summary-note">'+esc(({relic:'普通遗物',deep_relic:'深夜遗物',in_run:'普通局内',deep_in_run:'深夜局内'}[r.scope]||scopes[r.scope]))+(modifierNote(r)?' · <span class="summary-negative">'+esc(modifierNote(r))+'</span>':'')+'</span></span></span>'}).join('');
 var conflict=rows.some(function(r){return r.verification_status==='conflict'}),q=state.view==='search'?state.global:state.query,hidden=rows.length-shown.length;
 return '<article class="record-card effect-family '+(state.density==='compact'?'density-compact':'density-cards')+'" data-family-id="'+esc(g.id)+'"><button class="record-open family-open" data-action="family" data-value="'+esc(g.id)+'"'+(q&&result.bestId?' data-focus="'+esc(result.bestId)+'"':'')+'><span class="family-heading"><h3>'+esc(g.name)+'</h3>'+(tiers.length?'<span class="tier-range">'+esc(tiers.map(function(t){return '+'+t}).join(' / '))+'</span>':'')+'</span><span class="family-meta"><span class="context-label">'+catalog.contexts[g.context]+'</span>'+(scopeList.some(function(x){return x==='deep_relic'||x==='deep_in_run'})?'<span>含深夜</span>':'')+(conflict?'<span class="conflict-inline">来源有差异</span>':'')+'</span><span class="family-summary">'+summary+'</span><span class="family-tail">'+(hidden?'已显示 '+shown.length+' 条 · 还有 '+hidden+' 条':'全部 '+rows.length+' 条记录')+'<span>查看详情 ›</span></span></button>'+familyFav(g)+'</article>';
}
function resolveRecords(keys,expand){
 var list=keys.flatMap(function(k){var a=k.split('|'),r=byId(a[0],a[1]);if(!r)return[];if(a[0]==='effects')return[['effect_groups',familyForRecord(r)]];if(a[0]==='effect_families')return (expand?effectGroups.filter(function(g){return g.family.id===r.id}):[groupForFamily(r)]).map(function(g){return['effect_groups',g]});return [[a[0],r]]});
 var seen=new Set();return list.filter(function(a){var k=a[0]+'|'+a[1].id;if(seen.has(k))return false;seen.add(k);return true});
}
var clearedRecent=null;
function recentHTML(onlyEffects){
 var list=resolveRecords(state.recent,false).filter(function(a){return !onlyEffects||(a[0]==='effect_groups'&&a[1].context===state.context)}).slice(0,6);
 if(!list.length)return '';
 return '<section class="recent-strip"><div class="recent-heading"><span class="muted small">最近查看</span>'+btn('清除','clear-recent',null,'text-button clear-recent')+'</div><div class="recent-items">'+list.map(function(a){return btn(esc(a[1].name)+(!onlyEffects&&a[0]==='effect_groups'?' · '+catalog.contexts[a[1].context]:''),a[0]==='effect_groups'?'family':'detail',a[0]==='effect_groups'?a[1].id:a[0]+'|'+a[1].id,'recent-chip')}).join('')+'</div></section>';
}

function effectPage(){
 var results=catalog.selectFamilies(D,{query:state.query,scope:state.scope,stack:state.stack,tag:state.tag,context:state.context});
 var count=results.reduce(function(n,x){return n+x.rows.length},0);
 var h=head('词条','',btn('清除筛选','reset-effects',null,'ghost'));
 h+='<div class="context-tabs" role="tablist" aria-label="词条使用场景">'+Object.entries(catalog.contexts).map(function(a){return '<button role="tab" aria-selected="'+(state.context===a[0])+'" data-action="context" data-value="'+a[0]+'" class="'+(state.context===a[0]?'active':'')+'">'+a[1]+'</button>'}).join('')+'</div>';
 h+='<div class="effect-controls"><div class="toolbar"><input class="search" id="local-query" data-state="query" type="search" autocomplete="off" aria-label="搜索当前资料" placeholder="试试：生命力+3、回血、女爵、HP…" value="'+esc(state.query)+'">'+'</div><details class="extra-effect-filters"'+(state.stack!=='all'?' open':'')+'><summary>更多筛选'+(state.stack!=='all'?' · 已启用':'')+'</summary>'+select('stack',[['all','全部叠加状态'],['yes','可叠加'],['no','不可叠加'],['conflict','有来源差异']],state.stack,'叠加筛选')+'</details>';
 h+='<div class="filter-line"><span class="filter-caption">来源</span><div class="chips scope-chips">'+Object.entries(scopes).filter(function(a){return a[0]==='all'||catalog.scopeContexts[a[0]]===state.context}).map(function(a){return btn(({relic:'普通遗物',deep_relic:'深夜遗物',in_run:'普通局内',deep_in_run:'深夜局内'}[a[0]]||a[1]),'scope',a[0],'chip '+(state.scope===a[0]?'active':''))}).join('')+'</div></div>';
 h+='<div class="filter-line"><span class="filter-caption">效果</span><div class="chips tag-chips">'+[['all','不限效果']].concat(Object.entries(D.effect_tags)).map(function(a){return btn(a[1],'effect-tag',a[0],'chip '+(state.tag===a[0]?'active':''))}).join('')+'</div></div></div>';
 h+='<div class="results-heading"><p class="count"><strong>'+results.length+'</strong> 个入口 · '+count+' 条记录'+(state.query?' · 名称优先':' · 加攻、减伤优先')+'</p><div class="view-switch" role="group" aria-label="词条展示方式">'+btn('紧凑','density','compact',state.density==='compact'?'active':'')+btn('卡片','density','cards',state.density==='cards'?'active':'')+'</div></div>';
 h+='<p class="density-hint">'+(state.density==='compact'?'每组前两条 · 高档在前':'每组全部记录 · 高档在前')+'</p>';
 if(!state.query)h+=recentHTML(true);
 h+=results.length?'<div class="family-results '+(state.density==='compact'?'compact-list':'cards')+'">'+results.slice(0,state.limit).map(familyCard).join('')+'</div>':empty('没有符合条件的词条','可以清除筛选，或搜索“回血”“回蓝”等常用叫法。');
 if(results.length>state.limit)h+='<div class="load-wrap">'+btn('再显示36组（还剩 '+(results.length-state.limit)+'）','more-results',null,'ghost')+'</div>';
 return h;
}
function trackRecent(c,id){
 var r=byId(c,id);if(!r)return;
 if(c==='effects'){c='effect_groups';id=familyForRecord(r).id}
 var key=c+'|'+id;state.recent=[key].concat(state.recent.filter(function(k){return k!==key})).slice(0,20);persist('nr-recent-v1',state.recent);
}
function familyDetail(id,focusId){
 var f=groupById.get(id)||(familyById.has(id)?groupForFamily(familyById.get(id)):null);if(!f)return;id=f.id;trackRecent('effect_groups',id);
 var all=catalog.orderedRows(D,familyRows(f)),scopeList=Array.from(new Set(all.map(function(r){return r.scope})));
 var body='<div class="family-detail-note">'+catalog.contexts[f.context]+' · '+all.length+' 条记录</div>';
 scopeList.forEach(function(scope){
  var rows=all.filter(function(r){return r.scope===scope}),hasLabels=rows.some(function(r){return !!tierLabel(r)});
  body+='<section class="family-section" data-scope="'+scope+'"><h3>'+esc(scopes[scope])+'<span>'+rows.length+' 条</span></h3><table class="tier-table'+(hasLabels?'':' unnumbered-table')+'"><thead><tr>'+(hasLabels?'<th>档位 / 物品</th>':'')+'<th>数值与触发条件</th><th>叠加与核验</th></tr></thead><tbody>';
  body+=rows.map(function(r){
   return '<tr data-record-id="'+esc(r.id)+'" class="'+(r.id===focusId?'focused-tier':'')+'">'+(hasLabels?'<td data-label="档位 / 物品"><strong>'+esc(tierLabel(r))+'</strong>'+(r.id===focusId?'<span class="badge gold">搜索命中</span>':'')+'</td>':'')+'<td data-label="数值与条件"><div class="tier-description">'+esc(r.description)+'</div>'+(modifierNote(r)?'<div class="negative-condition">'+esc(modifierNote(r))+'</div>':'')+'</td><td data-label="叠加与核验"><span class="tier-stacking">'+esc(r.stacking||'来源未注明')+'</span>'+badge(r)+btn('原条目与来源','detail','effects|'+r.id,'text-button member-source')+'</td></tr>';
  }).join('')+'</tbody></table></section>';
 });
 modal.classList.add('family-dialog');
 modal.innerHTML='<div class="dialog-inner"><div class="dialog-head">'+btn(icon('back'),'back',null,'icon-button dialog-back')+'<div><span class="badge gold">'+catalog.contexts[f.context]+'</span><h2 id="detail-title">'+esc(f.name)+'</h2></div>'+btn('×','close',null,'close')+'</div>'+body+'<div class="load-wrap">'+btn(familySaved(f)?'★ 已收藏本组':'☆ 收藏整组','family-favorite',f.id,'ghost')+'</div></div>';
 modal.dataset.record='effect_groups|'+id;modal.dataset.focus=focusId||'';
 if(!modal.open)modal.showModal();modal.scrollTop=0;
 if(focusId)requestAnimationFrame(function(){var row=modal.querySelector('[data-record-id="'+CSS.escape(focusId)+'"]');if(row)row.scrollIntoView({block:'nearest'})});
}


function lordPortrait(id){return '<span class="lord-portrait '+(['harmonia','straghess'].includes(id)?'symbolic':'')+'"><img src="assets/nightlords/'+id+(['harmonia','straghess'].includes(id)?'.avif':'.webp')+'" alt="'+esc(shortNames[id])+(['harmonia','straghess'].includes(id)?'对应遗物图标':'头像')+'"></span>'}

function home(){
 return '<div class="home-welcome"><div><span class="eyebrow">NIGHTREIGN</span><h1>渡夜手册</h1><p class="muted">下一场远征，从这里开始。</p></div><span class="knight-avatar"><img src="assets/rain-knight.png" alt="打伞淋雨的小骑士"></span></div>'+recentHTML(false)+
 '<section class="hero"><div class="hero-art"><img src="assets/nightlords/heolstor.webp" alt="夜王"></div><div class="hero-copy"><div class="eyebrow">本局速查</div><h1>这一次，谁在终夜等你？</h1><p>选入已遭遇的 Boss，缩小夜王范围。</p><div class="hero-actions">'+btn('查找本局夜王 →','nav','bosses','primary')+btn('进入水晶地图','nav','crystals','ghost')+'</div></div></section>'+
 '<div class="quick-grid">'+[['voice','语音查询','轻量中文 · Vosk · 同段录音对照'],['timer','缩圈倒计时','手动启动 · 随时校准'],['weapons','武器图鉴',D.weapons.length+' 件装备 · 33 类别'],['effects','词条速查',D.effects.length+' 条数值与条件'],['characters','角色图鉴','10 位渡夜者'],['favorites','我的收藏',state.favorites.length?'已保存 '+state.favorites.length+' 条':'常查资料，一触即达']].map(function(a){return btn('<span class="quick-icon">'+icon(a[0])+'</span><span><strong>'+a[1]+'</strong><small>'+a[2]+'</small></span><span class="arrow">↗</span>','nav',a[0],'quick-card')}).join('')+'</div>'+
 '<div class="section-head"><h2>常用查阅</h2><span class="small muted">本体 + 见弃空洞者</span></div><div class="home-grid"><section class="panel"><div class="panel-title"><h3>夜王图鉴</h3><small>弱点 · 异常 · 韧性</small></div><div class="nightlord-chips">'+D.nightlords.map(function(r){return openButton('nightlords',r.id,lordPortrait(r.id)+'<span class="full-name">'+esc(r.name)+'</span><span class="short-name">'+shortNames[r.id]+'</span>','nightlord-chip')}).join('')+'</div></section><section class="panel"><div class="panel-title"><h3>大空洞探索</h3><span class="badge gold">交互地图</span></div><div class="map-teaser"><img src="assets/great-hollow.webp" alt="大空洞地表和地下合成底图"><div><strong>找到一颗，缩小范围。</strong><p>标记已发现或确认没有的点，推断本局可能的水晶组。</p>'+btn('打开地图 →','nav','crystals','text-button')+'</div></div></section></div>'+
 (state.favorites.length?'<div class="section-head"><h2>已收藏</h2>'+btn('查看全部','nav','favorites','text-button')+'</div><div class="cards">'+favoriteRecords().slice(0,4).map(function(a){return card(a[0],a[1])}).join('')+'</div>':'')+
 '<div class="footer">个人离线速查工具 · 非官方应用 · 数据与素材来源保留在每条详情中</div>';
}
function normalize(s){return catalog.normalize(s)}
function matches(r,q){return catalog.score(r,q)>0}
function recordPage(c){
 if(c==='weapons'&&weaponUI)return weaponUI.page(state);
 if(c==='effects')return effectPage();
 var isEffects=c==='effects',all=D[c]||[],results=all.filter(function(r){return matches(r,state.query)&&(!isEffects||state.scope==='all'||r.scope===state.scope)&&(!isEffects||state.stack==='all'||(state.stack==='yes'?r.stacking==='可叠加':state.stack==='no'?r.stacking==='不可叠加':r.verification_status==='conflict'))});
 results.sort(function(a,b){return catalog.score(b,state.query)-catalog.score(a,state.query)});
 var h=head(titles[c],isEffects?'数值、触发条件与叠加性，放在一起查。':'点击条目查看具体效果与出处。');
 h+='<div class="toolbar"><input class="search" id="local-query" data-state="query" type="search" autocomplete="off" aria-label="搜索当前资料" placeholder="'+(isEffects?'输入词条名、角色或效果，例如：女爵、攻击、回避':'输入关键词')+'" value="'+esc(state.query)+'">'+(isEffects?select('stack',[['all','全部叠加状态'],['yes','可叠加'],['no','不可叠加'],['conflict','有来源差异']],state.stack,'叠加筛选'):'')+'</div>';
 if(isEffects)h+='<div class="chips">'+Object.entries(scopes).filter(function(a){return a[0]==='all'||catalog.scopeContexts[a[0]]===state.context}).map(function(a){return btn(({relic:'普通遗物',deep_relic:'深夜遗物',in_run:'普通局内',deep_in_run:'深夜局内'}[a[0]]||a[1]),'scope',a[0],'chip '+(state.scope===a[0]?'active':''))}).join('')+'</div>';
 h+='<p class="count">找到 <strong>'+results.length+'</strong> 条'+(isEffects?' · “可叠加”不代表所有效果一律相加':'')+'</p>';
 h+=results.length?'<div class="cards">'+results.slice(0,state.limit).map(function(r){return card(c,r)}).join('')+'</div>':empty('没有匹配结果','试试更短的关键词，或清除筛选。');
 if(results.length>state.limit)h+='<div class="load-wrap">'+btn('再显示 36 条（还剩 '+(results.length-state.limit)+'）','more-results',null,'ghost')+'</div>';
 return h;
}
function bosses(){
 var pool=D.map_patterns.filter(function(p){
  return (state.mode==='deep'||p.availability!=='deep_only')&&(state.map==='all'||p.map_type===state.map)&&(!state.n1||p.night1_boss_id===state.n1)&&(!state.n2||p.night2_boss_id===state.n2)&&(!state.extra||[1,2].some(function(day){var e=p['day'+day+'_event'];return(state.extraDay==='any'||state.extraDay===String(day))&&e&&e.event_id==='extra_night_boss'&&e.additional_boss_id===state.extra}))
 });
 var groups=D.nightlords.map(function(l){return[l,pool.filter(function(p){return p.nightlord_id===l.id})]}).filter(function(a){return a[1].length});
 var opts=[['','尚未确认']].concat(D.night_boss_catalog.slice().sort(function(a,b){return a.name.localeCompare(b.name,'zh')}).map(function(r){return[r.id,r.name]}));
 var h=head('夜王','',btn('重置','reset-boss',null,'ghost'))+
 '<section class="filter-panel"><div class="filter-grid">'+select('mode',[['regular','普通远征'],['deep','深夜模式']],state.mode,'游玩模式')+select('map',Object.entries(maps),state.map,'地图地形')+select('n1',opts,state.n1,'第一夜 · 主要 Boss')+select('n2',opts,state.n2,'第二夜 · 主要 Boss')+'</div><details><summary>遇到了追加夜 Boss？</summary><div class="filter-extra">'+select('extra',opts,state.extra,'追加 Boss')+select('extraDay',[['any','任意一夜'],['1','第一夜追加'],['2','第二夜追加']],state.extraDay,'出现时间')+'</div><p class="small muted">追加战在主要夜战之后发生，请填在这里。普通远征自动排除仅限深夜的 80 种增补配置。</p></details></section>'+
 '<div class="section-head"><h2>候选夜王 <span class="gold">'+groups.length+'</span></h2><span class="small muted">'+pool.length+' 个配置匹配 · 数量不代表概率</span></div>';
 if(!groups.length)return h+empty('没有符合这些条件的配置','检查是否把追加 Boss 当成主要 Boss，或调整地形和游玩模式。');
 h+='<div class="boss-result-grid">'+groups.map(function(a){var l=a[0];return openButton('nightlords',l.id,lordPortrait(l.id)+'<strong>'+esc(l.name)+'</strong><p>'+esc(l.expedition_name_en)+'</p><p>'+a[1].length+' 个配置支持'+(l.dlc?' · DLC':'')+'</p>','boss-result')}).join('')+'</div>';
 h+='<details><summary>查看匹配配置（'+pool.length+'）</summary><div class="table-scroll"><table><thead><tr><th>编号</th><th>夜王 / 地形</th><th>第一夜</th><th>第二夜</th><th>追加战</th></tr></thead><tbody>'+pool.slice(0,120).map(function(p){var extra=[1,2].map(function(day){var e=p['day'+day+'_event'];return e&&e.additional_boss_id?'第'+day+'夜 '+bossName(e.additional_boss_id):''}).filter(Boolean).join('；');return '<tr><td>'+esc(p.pattern_id)+'</td><td>'+esc(lordName(p.nightlord_id))+'<br><span class="muted">'+esc(p.map_name)+'</span></td><td>'+esc(bossName(p.night1_boss_id))+'</td><td>'+esc(bossName(p.night2_boss_id))+'</td><td>'+esc(extra||'—')+'</td></tr>'}).join('')+'</tbody></table></div>'+(pool.length>120?'<p class="small muted">当前显示前120个，请继续筛选以缩小范围。</p>':'')+'</details>';
 return h;
}
function crystalCandidates(){return D.crystal_layouts.filter(function(l){return Object.entries(state.marks).every(function(a){return a[1]===1?l.point_ids.indexOf(a[0])>=0:a[1]===-1?l.point_ids.indexOf(a[0])<0:true})})}
function crystals(){
 var candidates=crystalCandidates(),present=Object.values(state.marks).filter(function(v){return v===1}).length,absent=Object.values(state.marks).filter(function(v){return v===-1}).length;
 var union=new Set(candidates.flatMap(function(l){return l.point_ids})),colors={blue:'#88b5df',red:'#da8f88',green:'#9ebda2',purple:'#b19ac8'};
 var h=head('水晶','点击点位循环标记：未探查 → 有水晶 → 确认没有。',btn('清空标记','reset-crystal',null,'ghost'));
 h+='<div class="crystal-layout"><section class="map-panel"><div class="map-tools"><span class="muted">地表 + 右下地下插图</span><div>'+btn('−','zoom','-','ghost')+' <span class="mono">'+Math.round(state.zoom*100)+'%</span> '+btn('＋','zoom','+','ghost')+'</div></div><div class="map-scroll" id="map-scroll"><div class="map-canvas" style="width:'+state.zoom*100+'%"><img src="assets/great-hollow.webp" alt="大空洞合成地图，坐标对应这张800乘817底图">'+D.crystal_points.map(function(p){var m=state.marks[p.id]||0,inLayout=state.layout==='all'||p.layout_ids.indexOf(state.layout)>=0;return '<button class="map-point '+(m===1?'present':m===-1?'absent':candidates.length&&union.has(p.id)?'recommended':'')+(!inLayout?' dim':'')+'" style="left:'+p.x_pct+'%;top:'+p.y_pct+'%" data-action="crystal" data-value="'+p.id+'" aria-label="水晶点'+p.source_point_id+'，'+(m===1?'已确认有':m===-1?'已确认没有':'未探查')+'" title="'+esc(p.name)+' · '+(p.layer==='surface'?'地表':'地下')+'">'+(m===-1?'×':p.source_point_id)+'</button>'}).join('')+'</div></div><div class="map-legend"><span><i class="dot" style="background:#d2c5a3"></i>未探查</span><span><i class="dot" style="background:#87b79c"></i>确认有</span><span><i class="dot" style="background:#dc9991"></i>确认没有</span><span>高亮圈：剩余候选点</span></div><p class="small muted" style="padding:8px 6px 0">底图：Nightreign Sidekick。放大后可拖动滚动条或滑动查看。</p></section>';
 h+='<aside class="crystal-side"><section class="panel"><div class="panel-title"><h3>本局可能的水晶组</h3><span class="badge gold">'+candidates.length+' / 4</span></div><p class="small muted">已确认有 '+present+' 点 · 确认没有 '+absent+' 点</p>'+
 D.crystal_layouts.map(function(l){var included=candidates.some(function(x){return x.id===l.id});return btn('<span><i class="dot" style="background:'+colors[l.id]+'"></i>'+l.name+'</span><span class="small">'+(included?'可能 · 8 点':'已排除')+'</span>','layout',l.id,'layout-card '+(state.layout===l.id?'active ':'')+(!included?'excluded':''))}).join('')+
 btn('显示全部点位','layout','all','text-button')+
 (!candidates.length?'<div class="notice warn">没有组合满足当前标记。检查点号与“确认没有”的判断；未探查不能当作没有。</div>':candidates.length===1?'<div class="notice">目前只剩'+candidates[0].name+'。继续核实高亮点，水晶组与地图配置编号没有固定对应。</div>':'<p class="small muted">点击组名仅突出该组点位；判断候选仍以你的实地标记为准。</p>')+'</section>';
 h+='<section class="panel"><h3>启动中央水晶</h3>'+select('players',[['1','单人'],['2','双人'],['3','三人']],state.players,'队伍人数')+'<div class="inline-stats"><div><strong>'+(state.players==='1'?'3':'4')+' 颗</strong><span>需要激活的周边水晶</span></div><div><strong>'+present+' 点</strong><span>已确认存在</span></div></div><p class="small muted" style="margin-top:14px">发现点位与激活水晶是两件事。此处标记只帮助识别组合，不作为已完成的激活计数。</p></section>'+
 '<details class="panel"><summary>点号、图层与来源</summary><div class="point-list">'+D.crystal_points.map(function(p){return btn(p.source_point_id+(p.layer==='surface'?'地':'下'),'crystal',p.id,'ghost')}).join('')+'</div><p class="small muted">1–21 为社区坐标表点号；“下”为右下地下插图。未制作可保证最短时间的导航路线。</p><a href="assets/大空洞地表水晶原图.jpg" target="_blank">查看带作者署名的地表组合原图 ↗</a>'+sourceHTML(D.crystal_points[0].source_refs)+'</details></aside></div>';
 return h;
}
function characterPage(){
 var c=byId('characters',state.char),r=D.character_levels.find(function(x){return x.character_id===c.id&&x.level===state.level});
 return head('角色','等级属性、被动、技艺和绝招，随时切换查看。')+
 '<div class="character-picker">'+D.characters.map(function(x){return btn('<span class="role-letter">'+esc(x.name[0])+'</span>'+esc(x.name)+'<small>'+esc(x.name_en)+'</small>','char',x.id,'character-option '+(x.id===c.id?'active':''))}).join('')+'</div>'+
 '<div class="character-layout"><section class="panel"><div class="panel-title"><div><h2>'+esc(c.name)+'</h2><span class="small muted">'+esc(c.name_en)+(c.dlc?' · DLC':'')+'</span></div>'+badge(r)+'</div><p class="muted">'+esc(c.role_summary)+'</p><div class="level-control"><label for="level">等级 <strong class="gold" id="level-number">'+state.level+'</strong></label><input id="level" type="range" min="1" max="15" step="1" value="'+state.level+'" data-state="level" aria-label="角色等级"></div><div class="vitals">'+[['hp','HP · 血量'],['fp','FP · 专注'],['stamina','ST · 精力']].map(function(a){return '<div class="vital"><span>'+a[1]+'</span><strong data-stat="'+a[0]+'">'+r[a[0]]+'</strong></div>'}).join('')+'</div><div class="attributes">'+Object.entries(attrs).map(function(a){return '<div class="attribute"><span class="muted">'+a[1]+'</span><strong>'+r[a[0]]+'</strong></div>'}).join('')+'</div>'+qualityDetails(r)+sourceHTML(r.source_refs)+'</section>'+
 '<section class="panel">'+D.character_skills.filter(function(x){return x.character_id===c.id}).map(function(s){return '<div class="skill-card"><h3><span class="badge gold">'+s.kind+'</span>'+esc(s.name)+'</h3><p>'+esc(s.description)+'</p><div class="metrics">'+Object.entries(s.metrics||{}).map(function(a){return '<span>'+esc(D.meta.labels[a[0]]||a[0])+'：'+esc(typeof a[1]==='object'?JSON.stringify(a[1]):a[1])+'</span>'}).join('')+'</div>'+sourceHTML(s.source_refs)+'</div>'}).join('')+'</section></div>';
}
function events(){
 var list=D.events.filter(function(r){return state.eventLord==='all'||r.eligible_nightlord_ids.indexOf(state.eventLord)>=0});
 return head('事件','查清入侵、诅咒和商人出现的条件与奖励。')+'<div class="toolbar">'+select('eventLord',[['all','全部夜王']].concat(D.nightlords.map(function(r){return[r.id,r.name]})),state.eventLord,'按对应夜王筛选')+'</div><p class="count">'+list.length+' 类事件 · 出现关联按520种配置归并，奖励数值按各条来源保留。</p><div class="cards">'+list.map(function(r){return card('events',r)}).join('')+'</div><div class="section-head"><h2>机制与交易</h2></div><div class="more-grid">'+btn('<strong>持秤商人交易</strong><p>愿望、代价与15级属性重分配</p>','nav','libra_trades')+btn('<strong>升级与缩圈</strong><p>逐级卢恩消耗和当日时间</p>','mechanics')+'</div>';
}
function favoriteRecords(){return resolveRecords(state.favorites,true)}
function favorites(){var rs=favoriteRecords();return head('收藏','')+(rs.length?'<div class="cards">'+rs.map(function(a){return card(a[0],a[1])}).join('')+'</div>':empty('还没有收藏','打开词条或夜王详情，点击星标收藏。'))}
function more(){
 return head('更多','')+'<div class="more-grid">'+[['timer','缩圈倒计时','开始、暂停、校准与两夜切换'],['weapons','武器图鉴',D.weapons.length+'件装备 · 33种类别'],['characters','角色图鉴','10名角色 · 150条等级记录'],['events','事件与遭遇','特殊事件、奖励与商人'],['favorites','我的收藏',state.favorites.length+'条已保存资料'],['items','道具速查','80条消耗品效果'],['legendary_weapon_effects','传说武器','25条固有效果'],['recluse_spells','隐士混合魔法','14种属性痕组合'],['dodge_frames','动作帧数','22条回避与动作记录'],['wild_bosses','野外Boss','81条实体与阶段记录'],['libra_trades','持秤商人交易','13种愿望与代价'],['settings','设置','显示偏好、个人记录与资料来源']].map(function(a){return btn('<strong>'+a[1]+'</strong><p>'+a[2]+'</p>','nav',a[0])}).join('')+'</div>';
}
function settings(){
 return head('设置','')+'<section class="settings-profile panel"><span class="knight-avatar"><img src="assets/rain-knight.png" alt="打伞淋雨的小骑士"></span><div><h2>渡夜手册</h2><p class="small muted">v0.5.0</p>'+(previewMode?'<p class="small muted">预览记录独立保存</p>':'')+'</div></section><div class="settings-grid"><section class="panel"><h2>显示</h2><div class="setting-row"><div><strong>字号</strong><p class="small muted">调整正文与词条数值</p></div><div class="view-switch">'+btn('标准','font-size','normal',state.fontSize==='normal'?'active':'')+btn('大字','font-size','large',state.fontSize==='large'?'active':'')+'</div></div><div class="setting-row"><div><strong>词条布局</strong><p class="small muted">紧凑看前两条，卡片看全部</p></div><div class="view-switch">'+btn('紧凑','density','compact',state.density==='compact'?'active':'')+btn('卡片','density','cards',state.density==='cards'?'active':'')+'</div></div></section><section class="panel"><h2>个人记录</h2><div class="setting-row"><div><strong>最近查看</strong><p class="small muted">'+state.recent.length+' 条浏览记录</p></div>'+btn('清除','clear-recent',null,'ghost')+'</div>'+(clearedRecent?'<div class="undo-row">已清除最近查看 '+btn('撤销清除','undo-recent',null,'text-button')+'</div>':'')+'<div class="setting-row"><div><strong>导出我的记录</strong><p class="small muted">收藏、水晶标记与显示偏好</p></div>'+btn('导出','export-prefs',null,'ghost')+'</div></section><section class="panel"><h2>关于</h2><a class="settings-link project-link" href="https://github.com/Toramy404/duye-handbook" target="_blank" rel="noopener noreferrer"><span><strong>项目仓库</strong><small>GitHub · Toramy404/duye-handbook</small></span><span aria-hidden="true">↗</span></a><a class="settings-link project-link" href="https://github.com/Toramy404" target="_blank" rel="noopener noreferrer"><span><strong>作者</strong><small>Toramy404</small></span><span aria-hidden="true">↗</span></a>'+btn('<span>资料来源与核对说明</span><span>›</span>','nav','about','settings-link')+'<p class="small muted">返回：详情 → 所属栏目 → 首页 → 退出。电脑预览在首页提示退出位置，安卓应用在首页返回时退出。</p></section></div>';
}
function applyDisplay(){document.body.classList.toggle('large-text',state.fontSize==='large');document.body.classList.toggle('phone-mode',state.phone)}
function goParent(v){navigate(v,{history:false});history.replaceState({view:v},'','#'+v)}
window.NR_APP_BACK=function(){
 if(modal.open){
  if(weaponDetailParent){var weaponParent=weaponDetailParent;weaponDetailParent=null;detail('weapons',weaponParent);return 'parent'}
  var parts=(modal.dataset.record||'').split('|'),c=parts[0],id=parts[1];
  if(c==='effects'){var r=effectsById.get(id);if(r){familyDetail(familyForRecord(r).id);return 'parent'}}
  var parent=c==='effect_groups'?'effects':c==='nightlords'?'bosses':c==='characters'?'characters':collections[c]?c:state.view;
  var g=c==='effect_groups'?groupById.get(id):null;
  modal.close();if(parent!==state.view)goParent(parent);
  if(g&&state.context!==g.context){state.context=g.context;state.scope='all';state.query='';state.tag='all';state.stack='all';render();rememberView()}
  return 'parent';
 }
 if(state.view==='home')return 'exit';
 var parents={about:'settings',items:'more',legendary_weapon_effects:'more',recluse_spells:'more',dodge_frames:'more',libra_trades:'more',wild_bosses:'more'};
 goParent(parents[state.view]||'home');return 'parent';
};

function about(){
 var a=D.audit;
 return head('资料来源','原资料快照：2026-10-14 · 武器样本：2026-10-17 · 数据版本 '+D.meta.dataVersion)+
 '<div class="data-stats">'+[[D.effects.length,'词条记录'],[520,'两夜配对已对照'],[110,'满级属性已比较'],[21,'水晶候选点']].map(function(x){return '<div class="panel"><strong>'+x[0]+'</strong><small>'+x[1]+'</small></div>'}).join('')+'</div>'+
 '<section class="panel"><h2>这次具体核对了什么</h2><p class="muted" style="margin-top:14px">全部520种配置的两夜主要Boss；10名角色满级共110个属性值；13个夜王实体的普通承伤倍率、异常阈值和韧性；深夜武器57类效果，以及按ID连接的522条遗物说明和部分同档叠加字段。</p><p class="notice" style="margin-top:16px">“跨表已核”只针对所列字段。来源可能共享同一套底层数据，并非独立游戏实验；未核验的数值保留“来源收录”，有差异的并列展示。</p><details><summary>主要修正与仍有差异的条目</summary>'+D.corrections.map(function(r){return '<div class="source-item"><strong>'+esc(r.name)+'</strong><p>'+esc(r.evidence)+'</p></div>'}).join('')+'</details><details><summary>未完成的核验与版本范围</summary>'+D.issues.filter(function(r){return r.severity!=='corrected'&&r.severity!=='normalized'}).map(function(r){return '<div class="source-item"><strong>'+esc(r.name)+'</strong><p>'+esc(r.detail)+'</p></div>'}).join('')+'</details></section>'+
 '<div class="section-head"><h2>离线使用</h2></div><section class="panel"><p>页面、资料和地图均从本机载入，不依赖在线字体或数据服务。首次访问完成缓存后，同一浏览器可离线重开；也可直接打开文件夹里的 index.html。</p><p class="small muted">收藏和水晶标记仅保存在当前浏览器。换浏览器、清理网站数据或使用不同地址会得到独立记录。安卓安装包与电脑预览分别保存个人记录。</p><div class="toolbar" style="margin-top:18px">'+btn('导出收藏与地图标记','export-prefs',null,'ghost')+btn('刷新页面','reload',null,'ghost')+'</div></section>'+
 '<div class="section-head"><h2>主要资料来源</h2><span class="small muted">点击后联网打开</span></div><section class="panel source-list">'+D.sources.filter(function(s){return ['quickref','sidekick-seeds','sidekick-coords','fifthmatt','slay-sheet','kevin-sheet','roundtable-relic','crystal-map','official-pc','official-ps'].includes(s.id)}).map(function(s){return '<div class="source-item"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a><p>'+esc(s.version||'来源未提供统一版本')+'</p></div>'}).join('')+'<p class="small muted">NightreignQuickRef 衍生数据保留 <a href="DATA-LICENSE.txt" target="_blank">GPL-3.0 许可</a>；地图归原作者所有，地表原图保留 Alex0Goat / SisterNun 署名。本工具供个人离线查询和开发验证。</p><p class="small muted">本体夜王头像取自 <a href="https://github.com/shahf215/Nightreign-Overlay/tree/main/public/assets/nightlordIcons" target="_blank" rel="noopener noreferrer">Nightreign Overlay</a>，游戏素材归原权利人。DLC 使用 NightreignQuickRef 收录的对应夜王遗物图标；小骑士表情由用户提供。布局参考 NightreignQuickRef 的分类及 MapFilter 的筛选方式。</p></section>';
}
function search(){
 var q=state.global,all=[];
 if(!q)return head('全库搜索','支持常用叫法、完整名称与指定档位。')+recentHTML(false);
 catalog.selectFamilies(D,{query:q}).forEach(function(result){all.push({collection:'effect_groups',record:result,result:result,score:result.score})});
 Object.keys(collections).filter(function(c){return c!=='effects'}).forEach(function(c){(D[c]||[]).forEach(function(r){var score=c==='weapons'&&weaponUI?weaponUI.score(r,q):catalog.score(r,q);if(score)all.push({collection:c,record:r,score:score})})});
 all.sort(function(a,b){return b.score-a.score});
 return head('搜索结果','“'+q+'” · '+all.length+' 个结果 · 名称优先，词条按组显示')+(all.length?'<div class="cards">'+all.slice(0,state.limit).map(function(a){return a.result?familyCard(a.result):card(a.collection,a.record)}).join('')+'</div>'+(all.length>state.limit?'<div class="load-wrap">'+btn('显示更多','more-results',null,'ghost')+'</div>':''):empty('没有匹配资料','试试“回血”“回蓝”“HP”或词条名加档位，例如生命力+3。'));
}
function qualityDetails(r){
 var h='';
 if(r.verification_status==='conflict'||r.verification_status==='needs_verification')h+='<div class="notice warn" style="margin-top:18px">'+(r.verification_status==='conflict'?'这条记录存在来源差异，以下保留对照值。':'本行仍需补核；当前显示原来源记录。')+'</div>';
 if(r.field_comparison&&Object.keys(r.field_comparison.differences||{}).length){
  h+='<div class="table-scroll"><table><thead><tr><th>字段</th><th>当前采用值</th><th>Slay原表</th></tr></thead><tbody>'+Object.entries(r.field_comparison.differences).map(function(a){var label=attrs[a[0]]||{hp:'HP',fp:'FP',stamina:'精力',poise_raw:'韧性'}[a[0]];if(!label){var p=a[0].split('.');label=(damageNames[p[1]]||statusNames[p[1]]||p[1])+(p[0]==='damage_multiplier'?'承伤倍率':'异常阈值')}return '<tr><td>'+esc(label)+'</td><td>'+esc(a[1].current)+'</td><td>'+esc(a[1].slay)+'</td></tr>'}).join('')+'</tbody></table></div>';
 }
 if(r.alternative_values){var a=r.alternative_values;h+='<details><summary>BWIKI另一组数值</summary><p class="small">HP / FP / 精力：'+esc(a.hp_fp_stamina.join(' / '))+'</p><p class="small">'+a.attributes_order.map(function(k,i){return esc(attrs[k])+' '+a.attributes[i]}).join(' · ')+'</p></details>'}
 if(r.quality_note)h+='<p class="small muted" style="margin-top:12px">'+esc(r.quality_note)+'</p>';
 return h;
}
function damageHTML(r){
 var h='<div class="detail-section"><h3>承伤倍率 · 越高越易受伤</h3><div class="mult-grid">';
 h+=Object.entries(r.damage_multiplier||{}).map(function(a){var v=a[1];return '<div class="mult '+(typeof v==='number'?(v>1?'weak':v<1?'resist':''):'')+'">'+'<img class="damage-icon" src="assets/types/'+(a[0]==='normal'?'standard':a[0])+'.png" alt="">'+esc(damageNames[a[0]]||a[0])+'<strong>'+esc(typeof v==='number'?'×'+v:v)+'</strong></div>'}).join('')+'</div><p class="small muted" style="margin-top:8px">例如 ×1.35 表示承受135%的该类伤害；×0.5 表示承受50%。</p></div>';
 if(r.status_threshold)h+='<div class="detail-section"><h3>异常积累基础阈值</h3><div class="attributes">'+Object.entries(r.status_threshold).map(function(a){return '<div class="attribute"><span class="muted">'+esc(statusNames[a[0]]||a[0])+'</span><strong>'+esc(a[1])+'</strong></div>'}).join('')+'</div></div>';
 var poise=r.poise_raw!=null?r.poise_raw:r.poise;
 if(poise!=null)h+='<p class="small" style="margin-top:14px">基础韧性：'+esc(poise)+'</p>';
 if(r.health_solo_sheet)h+='<p class="small muted">普通单人血量（Slay表）：'+r.health_solo_sheet+'；不用于深夜或永夜。</p>';
 return h+qualityDetails(r);
}
function detail(c,id){
 if(c==='effect_groups'||c==='effect_families'){familyDetail(id);return}
 modal.classList.remove('family-dialog');
 trackRecent(c,id);
 var r=byId(c,id);if(!r)return;var body='',desc=recordDesc(r);
 if(c==='nightlords'){
  body='<div class="lord-detail-portrait">'+lordPortrait(r.id)+'</div><p class="muted">'+esc(r.expedition_name_en)+' · '+esc(r.aliases.join(' / '))+'</p><p class="small muted" style="margin-top:12px">以下按实体与阶段分开；普通属性不能直接代替深夜难度模型。</p>'+
  D.boss_variants.filter(function(v){return v.nightlord_id===r.id}).map(function(v){return '<section class="detail-section"><h3>'+esc(v.name)+' '+badge(v)+'</h3>'+damageHTML(v)+sourceHTML(v.source_refs)+'</section>'}).join('');
 }else if(c==='weapons'&&weaponUI){body=weaponUI.detail(r);
 }else if(c==='characters'){
  modal.close();navigate('characters',{character:r.id});return;
 }else{
  body=(c==='effects'?btn('← 返回本组档位表','family',familyForRecord(r).id,'text-button'):'')+'<div class="detail-description">'+esc(desc)+'</div>';
  if(c==='effects'){
   body+='<dl class="kv"><dt>所属类别</dt><dd>'+esc(r.scope_zh)+' · '+esc(r.category||'—')+'</dd><dt>同名叠加</dt><dd>'+esc(r.stacking||'来源未注明')+(r.stacking_alternative?' / 另一来源：'+esc(r.stacking_alternative):'')+'</dd>'+(r.talisman_name?'<dt>护符名</dt><dd>'+esc(r.talisman_name)+'</dd>':'')+(modifierNote(r)?'<dt>负面条件</dt><dd>'+esc(modifierNote(r))+'</dd>':'')+'</dl>';
   if(r.audit_note)body+='<p class="notice" style="margin-top:18px">'+esc(r.audit_note)+'</p>';
   if(r.comparison_evidence){var e=r.comparison_evidence;body+='<details><summary>英文原表对照</summary>'+Object.entries(e).filter(function(a){return ['description_en','kevin','slay'].indexOf(a[0])>=0&&a[1]}).map(function(a){return '<p class="small">'+esc(Array.isArray(a[1])?a[1].filter(Boolean).join(' · '):a[1])+'</p>'}).join('')+'</details>'}
  }
  if(c==='events'){
   body+='<div class="detail-section"><h3>奖励与影响</h3><p>'+esc(r.reward_summary)+'</p></div><div class="detail-section"><h3>已收录配置中的夜王关联</h3><p>'+esc((r.eligible_nightlord_ids||[]).map(lordName).join('、')||'未取得限定列表')+'</p></div>';
   var timings=D.event_timing_rules.filter(function(t){return t.event_ids&&t.event_ids.includes(r.id)});
   if(timings.length)body+='<div class="detail-section"><h3>触发时间窗口</h3>'+timings.map(function(t){return '<p class="small">'+esc(t.name)+'：'+t.earliest_seconds+'–'+t.latest_seconds+'秒（当日开始计时）</p>'}).join('')+'<p class="small muted">还需满足事件自身条件；追加夜Boss按夜战结束触发。</p></div>';
  }
  if(c==='wild_bosses')body+=damageHTML(r);
  if(c==='items')body+='<p class="small muted">单格携带上限：'+esc(r.stack_capacity)+'</p>';
  if(c==='legendary_weapon_effects')body+='<p class="small">武器类别：'+esc(r.weapon_type)+'<br>削韧：'+esc(r.poise_damage_text)+'</p>';
  if(c==='recluse_spells')body+='<dl class="kv"><dt>属性痕</dt><dd>'+esc(r.elements)+'</dd><dt>伤害</dt><dd>'+esc(r.damage_text)+'</dd><dt>持续</dt><dd>'+esc(r.duration_text)+'</dd></dl>';
  if(c==='dodge_frames')body+='<div class="vitals"><div class="vital"><span>'+esc(r.frame_type)+'</span><strong>'+r.frames+'帧</strong></div><div class="vital"><span>测量基准</span><strong>60fps</strong></div><div class="vital"><span>换算时间</span><strong>'+Number(r.seconds).toFixed(3)+'s</strong></div></div>';
  if(c==='libra_trades'&&r.attribute_points)body+='<h3>15级能力点（不是HP/FP实值）</h3><div class="attributes">'+Object.entries(r.attribute_points).map(function(a){return '<div class="attribute"><span>'+esc(attrs[a[0]]||a[0])+'</span><strong>'+esc(a[1])+'</strong></div>'}).join('')+'</div>';
  body+=sourceHTML(r.source_refs);
 }
 modal.innerHTML='<div class="dialog-inner"><div class="dialog-head">'+btn(icon('back'),'back',null,'icon-button dialog-back')+'<div>'+(c==='weapons'?'':'<span class="badge gold">'+esc(r.scope_zh||collections[c]||'资料')+'</span> '+badge(r))+'<h2 id="detail-title">'+esc(r.name)+'</h2>'+(r.name_en?'<p class="small muted">'+esc(r.name_en)+'</p>':'')+'</div>'+btn('×','close',null,'close')+'</div>'+body+'<div class="load-wrap">'+btn((state.favorites.includes(keyOf(c,r))?'★ 已收藏':'☆ 收藏这条'),'favorite',keyOf(c,r),'ghost')+'</div></div>';
 if(!modal.open)modal.showModal();
 modal.scrollTop=0;modal.dataset.record=keyOf(c,r);
}
function mechanics(){
 modal.classList.remove('family-dialog');
 modal.innerHTML='<div class="dialog-inner"><div class="dialog-head"><h2 id="detail-title">升级与缩圈</h2>'+btn('×','close',null,'close')+'</div><p class="notice">1级升至15级累计513,116卢恩；本表逐级与Slay表交叉一致。</p><div class="table-scroll"><table><thead><tr><th>等级</th><th>本级需要</th><th>累计需要</th></tr></thead><tbody>'+D.level_costs.map(function(r){return '<tr><td>'+r.level+'</td><td>'+r.runes_from_previous_level.toLocaleString()+'</td><td>'+r.cumulative_runes.toLocaleString()+'</td></tr>'}).join('')+'</tbody></table></div><h3 style="margin-top:20px">缩圈时间（来源记录）</h3>'+D.circle_timing.map(function(r){return '<p class="small">'+esc(r.name)+'：'+esc(r.time_display)+(r.alternative_time_display?'（预计；另一来源 '+esc(r.alternative_time_display)+'）':'')+'</p>'}).join('')+'<details><summary>持有卢恩增伤采样</summary><p class="small muted">仅列原表采样点，不在点之间自动插值。</p><table><thead><tr><th>持有卢恩</th><th>攻击提升</th></tr></thead><tbody>'+D.rune_boon.map(function(r){return '<tr><td>'+r.runes.toLocaleString()+'</td><td>+'+r.damage_increase_pct+'%</td></tr>'}).join('')+'</tbody></table></details>'+sourceHTML(D.level_costs[1].source_refs.concat(D.circle_timing.flatMap(function(r){return r.source_refs})))+'</div>';modal.dataset.record='';if(!modal.open)modal.showModal();
}
function render(){
 var content=document.getElementById('content');var opened=Array.from(content.querySelectorAll('details[open]>summary')).map(function(x){return x.textContent});var fn={voice:function(){return voiceUI?voiceUI.page():empty('语音模块未载入','请刷新页面')},timer:function(){return timerUI.page()},home:home,settings:settings,bosses:bosses,crystals:crystals,characters:characterPage,events:events,favorites:favorites,more:more,about:about,search:search}[state.view];
 content.innerHTML=fn?fn():recordPage(state.view);
 content.querySelectorAll('details>summary').forEach(function(x){if(opened.includes(x.textContent))x.parentElement.open=true});
 document.querySelectorAll('.nav [data-action=nav],.bottom-nav [data-action=nav]').forEach(function(b){var active=b.dataset.value===state.view||(b.closest('.bottom-nav')&&b.dataset.value==='more'&&!['home','effects','bosses','crystals'].includes(state.view));b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 document.querySelector('.back-button').setAttribute('aria-label',state.view==='home'?'退出应用':'返回上一级');
 document.querySelector('.settings-button').setAttribute('aria-label','设置');
 if(timerUI)timerUI.tick();
 if(voiceUI&&state.view==='voice')voiceUI.mounted();
 document.title=(titles[state.view]||'资料')+' · 渡夜手册'+(previewMode?' · 预览':'');
}
// Per-view reading positions are stored separately from the underlying game data.
var viewMemory=load('nr-view-memory-v1',{}),restoreInProgress=false,scrollSaveTimer=null;
if(!viewMemory||typeof viewMemory!=='object'||Array.isArray(viewMemory))viewMemory={};
var viewFields={weapons:['query','weaponGroup','weaponCategory','weaponRarity','limit'],effects:['context','query','scope','stack','tag','limit'],search:['global','limit'],bosses:['mode','map','n1','n2','extra','extraDay'],characters:['char','level'],events:['eventLord'],crystals:['layout','zoom','players']};
var defaultFields={weaponGroup:'all',weaponCategory:'all',weaponRarity:'all',context:'out',query:'',scope:'all',stack:'all',tag:'all',limit:36,global:'',mode:'regular',map:'all',n1:'',n2:'',extra:'',extraDay:'any',char:'wylder',level:15,eventLord:'all',layout:'all',zoom:1,players:'3'};
function fieldsForView(v){return viewFields[v]||(collections[v]?['query','limit']:[])}
function currentScroll(){return state.phone?document.getElementById('content').scrollTop:window.scrollY}
function setReadingScroll(value){
 if(state.phone)document.getElementById('content').scrollTop=value||0;
 else window.scrollTo({top:value||0,behavior:'instant'});
}
function rememberView(){
 if(!document.getElementById('content'))return;
 var previous=viewMemory[state.view]||{scroll:{}},saved={fields:{},scroll:Object.assign({},previous.scroll)};
 fieldsForView(state.view).forEach(function(k){saved.fields[k]=state[k]});
 saved.scroll[state.phone?'phone':'desktop']=currentScroll();
 saved.open=Array.from(document.querySelectorAll('#content details[open]>summary')).map(function(e){return e.textContent});
 viewMemory[state.view]=saved;persist('nr-view-memory-v1',viewMemory);
}
function restoreFields(v){
 var saved=viewMemory[v]||{},data=saved.fields||{};
 fieldsForView(v).forEach(function(k){
  var value=data[k],fallback=defaultFields[k];
  state[k]=typeof value===typeof fallback?value:fallback;
 });
 state.limit=Math.max(36,Math.min(2000,Number(state.limit)||36));
 if(v==='characters'){
  if(!byId('characters',state.char))state.char='wylder';
  state.level=Math.max(1,Math.min(15,Math.round(Number(state.level)||15)));
 }
 if(v==='crystals')state.zoom=Math.max(1,Math.min(2.5,Number(state.zoom)||1));
 if(v==='effects'){
  if(!catalog.contexts[state.context])state.context='out';
  if(!data.context&&catalog.scopeContexts[state.scope])state.context=catalog.scopeContexts[state.scope];
  if(!scopes[state.scope]||(state.scope!=='all'&&catalog.scopeContexts[state.scope]!==state.context))state.scope='all';
  if(state.tag!=='all'&&!D.effect_tags[state.tag])state.tag='all';
  if(!['all','yes','no','conflict'].includes(state.stack))state.stack='all';
 }
}
function navigate(v,options){
 if(voiceUI&&state.view==='voice'&&v!=='voice')voiceUI.leave();
 options=options||{};if(!titles[v])v='home';
 if(!options.initial)rememberView();
 state.view=v;restoreFields(v);
 if(v==='characters'&&options.character&&byId('characters',options.character))state.char=options.character;
 document.getElementById('global-search').value=v==='search'?state.global:'';
 if(modal.open)modal.close();weaponDetailParent=null;
 restoreInProgress=true;render();
 var saved=viewMemory[v]||{},pos=(saved.scroll||{})[state.phone?'phone':'desktop']||0;
 document.querySelectorAll('#content details>summary').forEach(function(e){e.parentElement.open=(saved.open||[]).includes(e.textContent)});
 requestAnimationFrame(function(){setReadingScroll(pos);restoreInProgress=false});
 if(options.history!==false&&location.hash!=='#'+v)history.pushState({view:v},'','#'+v);
}
function renderKeepFocus(target){
 var id=target.id,pos=target.selectionStart,scroll=currentScroll();render();
 var next=id&&document.getElementById(id);
 if(next){next.focus({preventScroll:true});if(pos!=null&&next.setSelectionRange)next.setSelectionRange(pos,pos)}
 setReadingScroll(scroll);
}
function queueRemember(){if(restoreInProgress)return;clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(function(){if(!restoreInProgress)rememberView()},140)}
function initializeReadingMemory(){
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 window.addEventListener('scroll',queueRemember,{passive:true});
 document.getElementById('content').addEventListener('scroll',queueRemember,{passive:true});
 window.addEventListener('pagehide',rememberView);
 document.addEventListener('visibilitychange',function(){if(document.hidden)rememberView()});
 window.addEventListener('hashchange',function(){var v=location.hash.slice(1);if(v!==state.view)navigate(v,{history:false})});
 root.addEventListener('input',queueRemember);
 root.addEventListener('compositionend',function(e){if(e.target.matches('input[type=search]'))e.target.dispatchEvent(new Event('input',{bubbles:true}))});
root.addEventListener('change',queueRemember);
 root.addEventListener('click',queueRemember);
}


function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(function(){t.classList.remove('visible')},2300)}
function handleAction(e){
 var b=e.target.closest('[data-action]');if(!b)return;var a=b.dataset.action,v=b.dataset.value;
 if(a.startsWith('voice-')&&voiceUI){voiceUI.action(a,v);return;}
 if(timerUI&&timerUI.action(a,v))return;
 if(a==='nav')navigate(v);
 else if(a==='back'){if(window.NR_APP_BACK()==='exit'){if(window.NightreignNative&&window.NightreignNative.exitApp)window.NightreignNative.exitApp();else toast('已到首页；安卓 App 在这里返回即退出')}}
 else if(a==='context'){state.context=v;state.scope='all';state.limit=36;render();setReadingScroll(0)}
 else if(a==='font-size'){state.fontSize=v;persist('nr-font-size',v);applyDisplay();render()}
 else if(a==='clear-recent'){clearedRecent=state.recent.slice();state.recent=[];persist('nr-recent-v1',[]);render();toast('最近查看已清除，可在设置中撤销')}
 else if(a==='undo-recent'){state.recent=Array.from(new Set(state.recent.concat(clearedRecent||[]))).slice(0,20);clearedRecent=null;persist('nr-recent-v1',state.recent);render();toast('最近查看已恢复')}
 else if(a==='phone'){rememberView();state.phone=!state.phone;document.body.classList.toggle('phone-mode',state.phone);window.scrollTo(0,0);requestAnimationFrame(function(){var m=viewMemory[state.view]||{};setReadingScroll((m.scroll||{})[state.phone?'phone':'desktop']||0)})}
 else if(a==='scope'){state.scope=v;state.limit=36;render();setReadingScroll(0)}
 else if(a==='effect-tag'){state.tag=v;state.limit=36;render();setReadingScroll(0)}
 else if(a==='density'){state.density=v;persist('nr-effect-density',v);var pos=currentScroll();render();setReadingScroll(pos)}
 else if(a==='reset-effects'){state.query='';state.scope='all';state.stack='all';state.tag='all';state.limit=36;render();setReadingScroll(0)}
 else if(a==='family'){familyDetail(v,b.dataset.focus)}
 else if(a==='family-favorite'){
  var g=groupById.get(v);if(!g)return;var on=familySaved(g),legacy='effect_families|'+g.family.id;
  // Expand legacy all-context favorites before removing only this context.
  if(on&&state.favorites.includes(legacy)){
   state.favorites=state.favorites.filter(function(k){return k!==legacy});
   effectGroups.filter(function(x){return x.family.id===g.family.id&&x.id!==g.id}).forEach(function(x){var k='effect_groups|'+x.id;if(!state.favorites.includes(k))state.favorites.push(k)});
  }
  if(on)state.favorites=state.favorites.filter(function(k){return k!=='effect_groups|'+g.id&&!g.rows.some(function(r){return k==='effects|'+r.id})});
  else state.favorites.push('effect_groups|'+g.id);
  persist('nr-favorites',state.favorites);toast(on?'已取消此组收藏':'已收藏'+catalog.contexts[g.context]+'词条');
  var pos=currentScroll(),ds=modal.scrollTop,focus=modal.dataset.focus;render();setReadingScroll(pos);
  if(modal.open&&modal.dataset.record==='effect_groups|'+g.id){familyDetail(g.id,focus);requestAnimationFrame(function(){modal.scrollTop=ds})}
 }

 else if(a==='more-results'){var y=currentScroll();state.limit+=36;render();setReadingScroll(y)}
 else if(a==='weapon-group'){state.limit=36;state.weaponGroup=v;state.weaponCategory='all';render();setReadingScroll(0)}
 else if(a==='reset-weapons'){state.limit=36;state.query='';state.weaponGroup='all';state.weaponCategory='all';state.weaponRarity='all';render();setReadingScroll(0)}
 else if(a==='weapon-effect'){var link=D.weapon_effect_links.find(function(x){return x.weapon_id===v});if(link){weaponDetailParent=v;detail('legendary_weapon_effects',link.effect_id)}}
 else if(a==='detail'){weaponDetailParent=null;var pair=v.split('|');detail(pair[0],pair[1])}
 else if(a==='close'){weaponDetailParent=null;modal.close()}
 else if(a==='favorite'){
  var i=state.favorites.indexOf(v);if(i<0)state.favorites.push(v);else state.favorites.splice(i,1);persist('nr-favorites',state.favorites);toast(i<0?'已加入收藏':'已取消收藏');
  var y=currentScroll();render();setReadingScroll(y);
  if(modal.open&&modal.dataset.record===v){var scroll=modal.scrollTop;var parts=v.split('|');detail(parts[0],parts[1]);modal.scrollTop=scroll}
 }else if(a==='char'){state.char=v;render()}
 else if(a==='reset-boss'){Object.assign(state,{mode:'regular',map:'all',n1:'',n2:'',extra:'',extraDay:'any'});render()}
 else if(a==='crystal'){
  var box=document.getElementById('map-scroll'),x=box?box.scrollLeft:0,y=box?box.scrollTop:0,w=window.scrollY;
  var old=state.marks[v]||0;state.marks[v]=old===0?1:old===1?-1:0;if(!state.marks[v])delete state.marks[v];persist('nr-crystal-marks',state.marks);render();
  box=document.getElementById('map-scroll');box.scrollLeft=x;box.scrollTop=y;window.scrollTo(0,w);
 }else if(a==='layout'){state.layout=state.layout===v?'all':v;render()}
 else if(a==='reset-crystal'){state.marks={};state.layout='all';persist('nr-crystal-marks',{});render();toast('水晶标记已清空')}
 else if(a==='zoom'){state.zoom=Math.max(1,Math.min(2.5,state.zoom+(v==='+'?.25:-.25)));render()}
 else if(a==='mechanics')mechanics();
 else if(a==='reload')location.reload();
 else if(a==='export-prefs'){
  var blob=new Blob([JSON.stringify({app:'渡夜手册',version:2,favorites:state.favorites,crystalMarks:state.marks,recent:state.recent,display:{density:state.density,fontSize:state.fontSize}},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=previewMode?'渡夜手册-预览-我的记录.json':'渡夜手册-我的记录.json';link.click();setTimeout(function(){URL.revokeObjectURL(url)},1000);
 }
}
root.addEventListener('click',handleAction);modal.addEventListener('cancel',function(e){e.preventDefault();window.NR_APP_BACK()});modal.addEventListener('click',function(e){if(e.target===modal){modal.close();return}handleAction(e)});
root.addEventListener('input',function(e){
 if(e.isComposing)return;
 if(e.target.id==='global-search'){
  var q=e.target.value;
  if(q&&state.view!=='search'){if(voiceUI&&state.view==='voice')voiceUI.leave();rememberView();state.searchReturn=state.view;state.view='search';history.pushState({view:'search'},'','#search')}
  if(!q){state.global='';navigate(state.searchReturn||'home');return}
  state.global=q;state.limit=36;render();setReadingScroll(0);return;
 }
 var key=e.target.dataset.state;if(!key)return;
 if(key==='query'){state.query=e.target.value;state.limit=36;renderKeepFocus(e.target)}
 if(key==='level'){state.level=Number(e.target.value);document.getElementById('level-number').textContent=state.level}
});
root.addEventListener('compositionend',function(e){if(e.target.matches('input[type=search]'))e.target.dispatchEvent(new Event('input',{bubbles:true}))});
root.addEventListener('change',function(e){var k=e.target.dataset.state;if(k&&k!=='query'){state[k]=k==='level'?Number(e.target.value):e.target.value;state.limit=36;render()}});
document.addEventListener('keydown',function(e){if(e.key==='/'&&!modal.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();document.getElementById('global-search').focus()}});
if(voiceUI)voiceUI.bind(root);
applyDisplay();shell();initializeReadingMemory();navigate(titles[location.hash.slice(1)]?location.hash.slice(1):'home',{initial:true,history:false});
if(timerUI)timerUI.startTick();
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register('./sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(){var el=document.getElementById('offline-state');if(el)el.innerHTML='<span class="online-dot"></span>离线缓存就绪'}).catch(function(){var el=document.getElementById('offline-state');if(el)el.textContent='本地资料已载入'});
}
})();
