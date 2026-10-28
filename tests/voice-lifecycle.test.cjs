// Browser lifecycle tests use controlled devices, not a substitute for real ASR.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/voice.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function fixture({permission,resume,response}={}){
 const state={stops:0,closed:0,sources:0,posts:0},listeners={},rootListeners={};
 const stream={getTracks:()=>[{stop(){state.stops++}}]};
 class Context{
  constructor(){this.sampleRate=48000;this.audioWorklet={addModule:async()=>{}};this.destination={}}
  resume(){return resume?resume.promise:Promise.resolve()}
  close(){state.closed++;return Promise.resolve()}
  createMediaStreamSource(){state.sources++;return {connect(){},disconnect(){}}}
 }
 class Worklet{constructor(){this.port={onmessage:null}}connect(){}disconnect(){}}
 const document={hidden:false,addEventListener(n,f){listeners[n]=f},getElementById(){return {style:{}}}};
 const window={NR_VOICE_SEARCH:{create:()=>({match:text=>({query:text,candidates:[]})})},addEventListener(n,f){listeners[n]=f}};
 const ctx={window,document,navigator:{mediaDevices:{getUserMedia:()=>permission?permission.promise:Promise.resolve(stream)}},AudioContext:Context,AudioWorkletNode:Worklet,performance,Blob,AbortController,setInterval,clearInterval,setTimeout,clearTimeout,
  async fetch(url,options){if(url.includes('/status'))return {ok:true,json:async()=>({mode:'desktop-local',token:'local-test',engines:{sherpa:{ready:true},vosk:{ready:true}}})};
   state.posts++;state.signal=options.signal;return response?response.promise:{ok:true,json:async()=>({duration:1,results:[]})}}
 };
 vm.runInNewContext(source,ctx);
 const ui=window.NR_VOICE.create({}, {esc:s=>String(s),head:()=>'',active:()=>true,render(){},open(){},search(){}});
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
