/* Voice matching uses names and aliases only; no game values are inferred. */
(function(global){
'use strict';
function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[\s，。！？、：:「」“”"'（）()【】\[\]·]/g,'')}
function query(s){
 var q=norm(s),scope=null;
 q=q.replace(/^(你好)?(渡夜手册)?(请)?(帮我)?(查找|查询|搜一下|搜索|查一下|查|找一下|找|看看)/,'');
 if(/^(局外|遗物)/.test(q)){scope='out';q=q.replace(/^(局外|遗物)/,'')}
 if(/^(局内)/.test(q)){scope='inside';q=q.replace(/^局内/,'')}
 q=q.replace(/^(武器|词条|角色|夜王)[的]?/,'').replace(/(是什么|的资料|的词条|的面板|怎么样)$/,'');
 var digit={'零':0,'一':1,'二':2,'三':3,'四':4,'五':5};
 q=q.replace(/(?:加|\+)([零一二三四五0-5])$/,function(_,n){return '+'+(digit[n]===undefined?n:digit[n])});
 var tier=q.match(/\+([0-5])$/);return {text:q,base:tier?q.slice(0,-2):q,tier:tier?Number(tier[1]):null,scope:scope};
}
function distance(a,b){var row=Array.from({length:b.length+1},function(_,i){return i});for(var i=1;i<=a.length;i++){var prev=row[0];row[0]=i;for(var j=1;j<=b.length;j++){var old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
function create(D,C,L){
 L=L||{aliases:{},phrases:{},chars:{}};
 function pronunciation(s){return (L.phrases[s]||Array.from(norm(s)).map(function(c){return L.chars[c]||c})).join(' ')}
 var entries=C.groups(D).map(function(g){return {collection:'effect_groups',id:g.id,name:g.name,scope:g.context,label:C.contexts[g.context]+'词条',rows:g.rows}});
 var labels={weapons:'武器',characters:'角色',nightlords:'夜王',wild_bosses:'野外Boss',items:'道具',events:'事件',recluse_spells:'混合魔法'};
 Object.keys(labels).forEach(function(c){(D[c]||[]).forEach(function(r){entries.push({collection:c,id:r.id,name:r.name,label:labels[c],aliases:r.aliases||[],english:r.name_en||''})})});
 entries.forEach(function(e){
  e.normal=norm(e.name);e.aliases=Array.from(new Set((Array.isArray(e.aliases)?e.aliases:[]).concat(L.aliases[e.name]||[]))).map(norm).filter(Boolean);
  e.py=pronunciation(e.name);e.aliasPy=e.aliases.map(pronunciation);
 });
 function match(raw){
  var q=query(raw);if(q.base.length<2)return {query:q.text,candidates:[],hint:'请说出完整名称或至少两个字的简称。'};
  var py=pronunciation(q.base),scored=[];
  entries.forEach(function(e){
   if(q.scope&&e.scope!==q.scope)return;
   if(q.tier!==null&&(!e.rows||!e.rows.some(function(r){return C.displayTier(D,r)===q.tier})))return;
   var score=0,reason='';
   if(e.normal===q.base){score=100;reason='名称匹配'}
   else if(e.aliases.includes(q.base)){score=98;reason='简称匹配'}
   else if(norm(e.english)===q.base){score=97;reason='英文名称'}
   else if(e.normal.includes(q.base)){score=85-Math.min(12,e.normal.length-q.base.length);reason='名称包含'}
   else if(e.py===py||e.aliasPy.includes(py)){score=82;reason='同音候选'}
   else if(q.base.length>=3){
    var probes=[e.normal].concat(e.aliases);var edit=Math.min.apply(null,probes.map(function(n){return distance(q.base,n)}));
    var a=py.split(' '),phonetic=Math.min.apply(null,[e.py].concat(e.aliasPy).map(function(p){var b=p.split(' ');return Math.abs(a.length-b.length)<=1?distance(a,b):99}));
    if(edit<=1||phonetic<=1){score=65;reason='近音／近字候选'}
   }
   if(score)scored.push(Object.assign({},e,{score:score,reason:reason,tier:q.tier}));
  });
  scored.sort(function(a,b){return b.score-a.score||a.name.length-b.name.length||a.id.localeCompare(b.id)});
  var top=scored[0];if(top)scored=scored.filter(function(e){return e.score>=top.score-15});
  return {query:q.text,candidates:scored.slice(0,6),hint:!top?'没有可靠匹配，可修改文字或用全库搜索。':top.score<90?'可能听成了同音字，请选择确认。':scored.length>1?'找到多个相关条目，请选择。':''};
 }
 return {match:match,entries:entries};
}
var api={create:create,normalize:norm,query:query,distance:distance};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.NR_VOICE_SEARCH=api;
})(typeof window!=='undefined'?window:globalThis);
