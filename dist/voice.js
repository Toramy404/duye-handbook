(function(global){
'use strict';
function pcmWav(chunks,rate){
 var length=chunks.reduce(function(n,c){return n+c.length},0),input=new Float32Array(length),offset=0;
 chunks.forEach(function(c){input.set(c,offset);offset+=c.length});
 var size=Math.floor(length*16000/rate),buffer=new ArrayBuffer(44+size*2),v=new DataView(buffer);
 function str(at,s){for(var i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))}
 str(0,'RIFF');v.setUint32(4,36+size*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,size*2,true);
 for(var j=0;j<size;j++){
  var start=Math.floor(j*rate/16000),end=Math.min(length,Math.max(start+1,Math.floor((j+1)*rate/16000))),sum=0;
  for(var k=start;k<end;k++)sum+=input[k];var sample=Math.max(-1,Math.min(1,sum/(end-start)));
  v.setInt16(44+j*2,Math.round(sample*(sample<0?32768:32767)),true);
 }
 return new Blob([buffer],{type:'audio/wav'});
}
function create(D,h){
 var matcher=global.NR_VOICE_SEARCH.create(D,global.NR_CATALOG,global.NR_VOICE_LEXICON),esc=h.esc;
 var s={engine:'sherpa',status:'checking',message:'正在连接本机语音引擎…',service:null,results:[],selection:null,text:'',duration:0};
 var session=0,controller=null,media=null,context=null,source=null,node=null,chunks=[],rate=16000,started=0,lastSpeech=0,speech=false,watchdog=null,pending=false;
 var mic='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4M8 22h8"/></svg>';
 function repaint(){if(h.active())h.render()}
 function set(status,message){s.status=status;s.message=message;repaint()}
 function candidates(result){
  if(!result)return '';
  return (result.hint?'<p class="voice-hint">'+esc(result.hint)+'</p>':'')+result.candidates.map(function(c,i){
   return '<button class="voice-candidate" data-action="voice-open" data-value="'+i+'"><span><strong>'+esc(c.name)+(c.tier!==null?' +'+c.tier:'')+'</strong><small>'+esc(c.label)+' · '+esc(c.reason)+'</small></span><span aria-hidden="true">›</span></button>';
  }).join('');
 }
 function page(){
  var busy=['recording','recognizing','requesting'].includes(s.status),ready=s.service&&s.service.engines.sherpa.ready&&s.service.engines.vosk.ready;
  return h.head('语音查询','说名称或简称，直接找资料。')+'<section class="voice-panel panel"><div class="voice-heading"><span class="voice-local-dot"></span><span>本机离线识别</span><small>电脑测试版</small></div><div class="voice-engine" role="group" aria-label="识别引擎">'+[['sherpa','轻量中文','约25 MB模型'],['vosk','Vosk中文','对照模型'],['compare','同段对照','一次录音，两种结果']].map(function(e){return '<button data-action="voice-engine" data-value="'+e[0]+'" aria-pressed="'+(s.engine===e[0])+'" class="'+(s.engine===e[0]?'active':'')+'"'+(busy?' disabled':'')+'><strong>'+e[1]+'</strong><small>'+e[2]+'</small></button>'}).join('')+'</div><button class="voice-record '+(s.status==='recording'?'recording':'')+'" data-action="voice-record" aria-label="'+(s.status==='recording'?'结束录音并查询':'开始语音查询')+'"'+(!ready||s.status==='recognizing'||s.status==='requesting'?' disabled':'')+'>'+mic+'<span>'+(s.status==='recording'?'说完点这里':s.status==='recognizing'?'正在识别…':s.status==='requesting'?'等待麦克风…':'点一下，说出名称')+'</span></button><div class="voice-level" aria-hidden="true"><i id="voice-level-fill"></i></div><p class="voice-status" role="status" aria-live="polite">'+esc(s.message)+'</p>'+(busy?'<button class="ghost voice-cancel" data-action="voice-cancel">取消本次</button>':'')+(!ready?'<button class="ghost" data-action="voice-reconnect">重新连接</button>':'')+'<p class="voice-footnote">停顿后自动查询，最长12秒。录音不保存、不发往云端。</p></section>'+
  '<div class="voice-examples"><span>试试简称</span>'+['铁眼','狗牙','咆哮强化','安定着'].map(function(x){return '<button class="chip" data-action="voice-example" data-value="'+x+'"'+(busy?' disabled':'')+'>'+x+'</button>'}).join('')+'</div>'+
  '<section class="panel voice-results"><div class="voice-result-title"><h2>识别与匹配</h2>'+(s.duration?'<small>'+s.duration.toFixed(1)+'秒录音</small>':'')+'</div>'+
  (s.results.length?'<div class="voice-transcripts">'+s.results.map(function(r,i){return '<button data-action="voice-use" data-value="'+i+'"'+(r.error||busy?' disabled':'')+' class="'+(s.selectedEngine===r.engine?'active':'')+'"><span>'+(r.engine==='sherpa'?'轻量中文':'Vosk中文')+'</span><strong>'+esc(r.error||r.text||'未识别到文字')+'</strong>'+(!r.error?'<small>识别 '+(r.decode_ms/1000).toFixed(2)+'秒'+(r.cold_start?' · 首次加载 '+(r.load_ms/1000).toFixed(2)+'秒':'')+'</small>':'')+'</button>'}).join('')+'</div>':'<p class="small muted">录音后显示原话；也可以先试简称匹配。</p>')+
  '<form id="voice-text-form" class="voice-edit"><label for="voice-text">识别文字，可修改</label><div><input id="voice-text" maxlength="120" autocomplete="off" value="'+esc(s.text)+'" placeholder="例如：帮我查黑夜连枷"'+(busy?' disabled':'')+'><button type="submit"'+(busy?' disabled':'')+'>查找</button></div></form>'+candidates(s.selection)+(s.selection?'<button class="text-button" data-action="voice-search">用这段文字全库搜索</button>':'')+'</section>'+
  '<details class="panel voice-debug"><summary>对照测试与使用说明</summary><p class="small">“同段对照”会将同一段录音依次交给两个本机模型。耗时是本电脑结果，不代表手机速度。简称按钮只测名称匹配，不代表语音识别效果。</p><label class="voice-upload">导入测试录音<input id="voice-file" type="file" accept="audio/wav,.wav"'+(!ready||busy?' disabled':'')+'></label><p class="small muted">支持20秒内、16kHz单声道16位PCM WAV。此预览需本机语音服务；手机端引擎尚未接入。首次使用须允许浏览器访问麦克风。</p></details>';
 }
 async function connect(){
  if(pending||!h.active())return;pending=true;
  try{var response=await fetch('/api/voice/status',{cache:'no-store'});if(!response.ok)throw Error();var data=await response.json();if(data.mode!=='desktop-local')throw Error();s.service=data;set('idle','准备好了，点击麦克风开始。')}
  catch(e){s.service=null;set('unavailable','本机语音服务未连接，请用“打开语音测试”启动。')}
  finally{pending=false}
 }
 function mounted(){if(s.status==='checking')connect()}
 function matchText(text){s.text=String(text||'').slice(0,120);s.selection=matcher.match(s.text);repaint()}
 function cleanup(){
  clearInterval(watchdog);watchdog=null;
  if(node){node.port.onmessage=null;node.disconnect();node=null}if(source){source.disconnect();source=null}
  if(media){media.getTracks().forEach(function(t){t.stop()});media=null}
  if(context){context.close().catch(function(){});context=null}
 }
 function cancel(){session++;if(controller)controller.abort();controller=null;cleanup();chunks=[];set(s.service?'idle':'unavailable','已停止。本次录音未保存。')}
 async function send(blob,id){
  if(id!==session)return;set('recognizing',s.engine==='compare'?'同一段录音正在依次交给两个模型…':'正在本机识别…');var request=new AbortController();controller=request;var timeout=setTimeout(function(){request.abort()},90000);
  try{
   var response=await fetch('/api/voice/recognize?engine='+s.engine,{method:'POST',headers:{'Content-Type':'audio/wav','X-Voice-Token':s.service.token},body:blob,signal:request.signal});var data=await response.json();
   if(id!==session)return;if(!response.ok)throw Error(data.error||'识别失败，请重试。');
   s.duration=data.duration;s.results=data.results||[];var first=s.results.find(function(r){return r.text});
   s.selectedEngine=first?first.engine:null;s.text=first?first.text:'';s.selection=first?matcher.match(first.text):null;
   set('idle',first?'已识别，请查看匹配结果。':s.results.some(function(r){return r.error})?'模型处理失败，请查看下方说明。':'没有听清，请靠近麦克风再试。');
  }catch(e){if(id===session)set('error',e.name==='AbortError'?'识别超时，可重试。':e.message||'本机服务已断开，请重新连接。')}
  finally{clearTimeout(timeout);if(id===session)controller=null}
 }
 async function finish(){if(s.status!=='recording')return;var id=session,blob=pcmWav(chunks,rate);cleanup();chunks=[];await send(blob,id)}
 async function record(){
  if(s.status==='recording')return finish();if(!s.service||['requesting','recognizing'].includes(s.status))return;
  var id=++session;s.results=[];s.selection=null;s.duration=0;set('requesting','请允许麦克风访问…');
  try{
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('当前浏览器无法录音，可用Chrome或Edge打开本机预览。');
   var acquired=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(id!==session){acquired.getTracks().forEach(function(t){t.stop()});return}media=acquired;
   var acquiredContext=new AudioContext();context=acquiredContext;rate=context.sampleRate;await acquiredContext.audioWorklet.addModule('voice-capture.js');
   if(id!==session)return;await acquiredContext.resume();if(id!==session)return;
   source=acquiredContext.createMediaStreamSource(media);node=new AudioWorkletNode(acquiredContext,'duye-voice-capture');
   chunks=[];started=performance.now();lastSpeech=started;speech=false;
   node.port.onmessage=function(e){if(id!==session||s.status!=='recording')return;var c=e.data;chunks.push(c);var rms=Math.sqrt(c.reduce(function(n,v){return n+v*v},0)/c.length),now=performance.now();if(rms>0.015){speech=true;lastSpeech=now}var fill=document.getElementById('voice-level-fill');if(fill)fill.style.width=Math.min(100,rms*800)+'%'};
   source.connect(node);node.connect(context.destination);set('recording','正在听…说完停顿即可，也可点按钮结束。');
   watchdog=setInterval(function(){var now=performance.now();if(now-started>=12000||speech&&now-started>1000&&now-lastSpeech>1100)finish();else if(!speech&&now-started>6500){cleanup();chunks=[];set('idle','没有听到声音，请检查麦克风后重试。')}},120);
  }catch(e){if(id===session){cleanup();set('error',e.name==='NotAllowedError'?'麦克风未获允许。请在浏览器地址栏授权后再试。':e.name==='NotFoundError'?'未找到麦克风，可连接麦克风或导入录音。':e.message||'麦克风启动失败，请重试。')}}
 }
 function action(a,v){
  if(a==='voice-record')record();else if(a==='voice-cancel')cancel();else if(a==='voice-reconnect')connect();
  else if(a==='voice-engine'){if(['sherpa','vosk','compare'].includes(v)&&!['recording','recognizing','requesting'].includes(s.status)){s.engine=v;repaint()}}
  else if(a==='voice-example'){s.results=[];s.duration=0;s.selectedEngine=null;matchText(v)}
  else if(a==='voice-match')matchText(document.getElementById('voice-text').value);
  else if(a==='voice-use'){var r=s.results[Number(v)];if(r&&r.text){s.selectedEngine=r.engine;matchText(r.text)}}
  else if(a==='voice-open'){var c=s.selection&&s.selection.candidates[Number(v)];if(c)h.open(c)}
  else if(a==='voice-search')h.search(s.selection?s.selection.query:s.text);
 }
 function leave(){if(['recording','recognizing','requesting'].includes(s.status))cancel()}
 function bind(root){
  root.addEventListener('submit',function(e){if(e.target.id==='voice-text-form'){e.preventDefault();action('voice-match')}});
  root.addEventListener('input',function(e){if(e.target.id==='voice-text')s.text=e.target.value});
  root.addEventListener('change',function(e){if(e.target.id==='voice-file'&&e.target.files[0]){var file=e.target.files[0];e.target.value='';if(file.size>644096){set('error','录音过大，请选择20秒内的PCM WAV。');return}s.results=[];s.selection=null;send(file,++session)}});
  document.addEventListener('visibilitychange',function(){if(document.hidden)leave()});global.addEventListener('pagehide',leave);
 }
 return {page:page,mounted:mounted,action:action,leave:leave,bind:bind};
}
global.NR_VOICE={create:create,pcmWav:pcmWav};
if(typeof module!=='undefined'&&module.exports)module.exports={pcmWav:pcmWav};
})(typeof window!=='undefined'?window:globalThis);
