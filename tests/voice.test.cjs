const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={window:{}};vm.createContext(ctx);
for(const f of ['data.js','catalog.js','voice-lexicon.js','voice-search.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',f),'utf8'),ctx);
const D=ctx.window.NR_DATA,original=JSON.stringify(D),matcher=ctx.window.NR_VOICE_SEARCH.create(D,ctx.window.NR_CATALOG,ctx.window.NR_VOICE_LEXICON);
let checks=0;function check(ok,label){assert.ok(ok,label);checks++}
for(const [input,name,reason] of [
 ['铁眼','铁之眼','简称匹配'],['弓哥','铁之眼','简称匹配'],['狗牙','猎犬长牙','简称匹配'],
 ['请帮我查一下黑夜连枷','黑夜骑兵连枷','简称匹配'],['亵渎','亵渎圣剑','简称匹配'],
 ['三头狗','格拉狄乌斯','简称匹配'],['安定着','安定者们','简称匹配'],['废物王','废弃物之王','简称匹配'],
 ['黑 夜 骑 兵 连 枷','黑夜骑兵连枷','名称匹配'],['黑夜骑兵连家','黑夜骑兵连枷','同音候选'],
 ['铁直眼','铁之眼','同音候选'],['冰龙','卡莉果','简称匹配'],['月光大剑','暗月大剑','简称匹配'],
 ['够 呀','猎犬长牙','同音候选'],['三 投 钱','格拉狄乌斯','近音／近字候选'],['亵渎 嵊县','亵渎圣剑','近音／近字候选']
 ]){let r=matcher.match(input).candidates[0];check(r&&r.name===name&&r.reason===reason,input+' -> '+name)}
let roar=matcher.match('咆哮强化').candidates;check(roar.length>=2,'roar preserves different scopes');check(roar.every(r=>r.name==='强化咆哮与吐息'),'roar is not character roar-heal effect');
let outside=matcher.match('查局外物理攻击加四').candidates;check(outside.length&&outside.every(r=>r.scope==='out'&&r.tier===4),'spoken tier and context');
check(matcher.match('局内咆哮强化').candidates.every(r=>r.scope==='inside'),'inside scope');
for(const text of ['狗','今天吃什么','帮我播放音乐','咆哮强化+4','<img src=x onerror=alert(1)>',''])check(matcher.match(text).candidates.length===0,'no invented result '+text);
for(const [name,aliases] of Object.entries(ctx.window.NR_VOICE_LEXICON.aliases))for(const alias of aliases)check(matcher.match(alias).candidates.some(r=>r.name===name),'reviewed alias exists '+alias);
check(JSON.stringify(D)===original,'matching never changes game data');
const {pcmWav}=require('../dist/voice.js');
(async()=>{
 for(const rate of [16000,44100,48000]){
  const c=new Float32Array(rate);for(let i=0;i<c.length;i++)c[i]=Math.sin(i/rate*2*Math.PI*300)*.3;
  const b=await pcmWav([c.subarray(0,100),c.subarray(100)],rate).arrayBuffer(),v=new DataView(b);
  check(v.getUint32(24,true)===16000&&v.getUint16(22,true)===1,'16k mono '+rate);
  check(v.getUint32(40,true)===32000&&b.byteLength===32044,'duration preserved '+rate);
 }
 console.log({voiceChecks:checks,allPassed:true});
})().catch(e=>{console.error(e);process.exitCode=1});
