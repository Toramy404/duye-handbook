// Browser lifecycle tests use controlled devices, not a substitute for real ASR.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/voice.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function fixture({permission,resume,response,status,post}={}){
 const state={stops:0,closed:0,sources:0,posts:0},listeners={},rootListeners={};
 const stream={getTracks:()=>[{stop(){state.stops++}}]};
 class Context{
  constructor(){this.sampleRate=48000;this.audioWorklet={addModule:async()=>{}};this.destination={}}
  resume(){return resume?resume.promise:Promise.resolve()}
  close(){state.closed++;return Promise.resolve()}
  createMediaStreamSource(){state.sources++;return {connect(){},disconnect(){}}}
 }
 class Worklet{constructor(){this.port={onmessage:null}}connect(){}disconnect(){}}
 const document={hidden:false,addEventListener(n,f){listeners[n]=f},getElementById(){return {style:{},focus(){},setSelectionRange(){}}}};
 const window={NR_VOICE_SEARCH:{create:()=>({match:text=>({query:text,candidates:[]})})},addEventListener(n,f){listeners[n]=f}};
 const ctx={window,document,navigator:{mediaDevices:{getUserMedia:()=>permission?permission.promise:Promise.resolve(stream)}},AudioContext:Context,AudioWorkletNode:Worklet,performance,Blob,AbortController,setInterval,clearInterval,setTimeout,clearTimeout,
  async fetch(url,options){if(url.includes('/status')){state.connections=(state.connections||0)+1;return {ok:true,json:async()=>({mode:'desktop-local',token:'local-test-'+state.connections,engines:status||{sherpa:{ready:true},vosk:{ready:true}}})}};
   state.posts++;state.signal=options.signal;if(post)return post(state,options);return response?response.promise:{ok:true,json:async()=>({duration:1,results:[]})}}
 };
 vm.runInNewContext(source,ctx);
 const ui=window.NR_VOICE.create({}, {esc:s=>String(s),head:()=>'',active:()=>true,render(){state.renders=(state.renders||0)+1},open(){},search(text){state.query=text}});
 ui.bind({addEventListener(n,f){rootListeners[n]=f}});ui.mounted();await tick();
 return {ui,state,stream,document,listeners,rootListeners};
}
test('cancel while permission is pending stops the later acquired stream',async()=>{
 const permission=deferred(),f=await fixture({permission});
 f.ui.action('voice-record');await tick();f.ui.action('voice-cancel');permission.resolve(f.stream);await tick();
 assert.equal(f.state.stops,1);assert.equal(f.state.sources,0);assert.equal(f.state.posts,0);assert.match(f.ui.page(),/已停止/);
});
test('cancel during AudioContext.resume cannot restart a stale recording',async()=>{
 const resume=deferred(),f=await fixture({resume});
 f.ui.action('voice-record');await tick();f.ui.action('voice-cancel');resume.resolve();await tick();
 assert.equal(f.state.stops,1);assert.equal(f.state.closed,1);assert.equal(f.state.sources,0);assert.equal(f.state.posts,0);
});
test('backgrounding or leaving releases the microphone without a recognition request',async()=>{
 for(const trigger of ['hidden','pagehide','leave']){
  const f=await fixture();f.ui.action('voice-record');await tick();assert.match(f.ui.page(),/正在听/);
  if(trigger==='hidden'){f.document.hidden=true;f.listeners.visibilitychange()}else if(trigger==='pagehide')f.listeners.pagehide();else f.ui.leave();
  assert.equal(f.state.stops,1);assert.equal(f.state.closed,1);assert.equal(f.state.posts,0);assert.match(f.ui.page(),/已停止/);
 }
});
test('cancelled recognition cannot replace the next query with a late result',async()=>{
 const response=deferred(),f=await fixture({response});
 f.rootListeners.change({target:{id:'voice-file',files:[{size:32044}],value:'fixture.wav'}});
 await tick();assert.equal(f.state.posts,1);f.ui.action('voice-cancel');assert.equal(f.state.signal.aborted,true);
 f.ui.action('voice-example','狗牙');response.resolve({ok:true,json:async()=>({duration:1,results:[{engine:'sherpa',text:'旧结果',decode_ms:1}]})});await tick();
 assert.match(f.ui.page(),/value="狗牙"/);assert.doesNotMatch(f.ui.page(),/旧结果/);
});
test('one missing model does not disable the other installed engine',async()=>{
 const f=await fixture({status:{sherpa:{ready:true},vosk:{ready:false}}});
 assert.doesNotMatch(f.ui.page(),/aria-label="开始语音查询"[^>]*disabled/);
 f.ui.action('voice-engine','compare');assert.match(f.ui.page(),/aria-label="开始语音查询"[^>]*disabled/);
});
test('editing a transcript invalidates the old matches and searches the new text',async()=>{
 const f=await fixture();f.ui.action('voice-example','狗牙');
 f.rootListeners.input({target:{id:'voice-text',value:'铁眼',selectionStart:2,selectionEnd:2}});f.ui.action('voice-search');
 assert.equal(f.state.query,'铁眼');assert.doesNotMatch(f.ui.page(),/没有听清/);
});
test('service restart renews the token and retries the same audio only once',async()=>{
 const f=await fixture({post(state,options){return state.posts===1?{ok:false,status:403,json:async()=>({error:'stale token'})}:{ok:true,json:async()=>({duration:1,results:[{engine:'sherpa',text:'铁眼',decode_ms:3}]})}}});
 f.rootListeners.change({target:{id:'voice-file',files:[{size:32044}],value:'fixture.wav'}});await tick();
 assert.equal(f.state.connections,2);assert.equal(f.state.posts,2);assert.match(f.ui.page(),/已识别/);
});
test('a stopped service exposes a reconnect control instead of an unusable microphone',async()=>{
 const f=await fixture({post(){throw new TypeError('Failed to fetch')}});
 f.rootListeners.change({target:{id:'voice-file',files:[{size:32044}],value:'fixture.wav'}});await tick();
 assert.match(f.ui.page(),/data-action="voice-reconnect"/);assert.match(f.ui.page(),/aria-label="开始语音查询"[^>]*disabled/);
});
test('editing a matched query does not replace the input during Chinese IME composition',async()=>{
 const f=await fixture();f.ui.action('voice-example','狗牙');const renders=f.state.renders;
 const target={id:'voice-text',value:'tie',selectionStart:3,selectionEnd:3};
 f.rootListeners.input({target,isComposing:true});assert.equal(f.state.renders,renders);
 target.value='铁眼';target.selectionStart=target.selectionEnd=2;f.rootListeners.compositionend({target});
 assert.equal(f.state.renders,renders+1);f.ui.action('voice-search');assert.equal(f.state.query,'铁眼');
});
