const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../dist/sw.js'),'utf8');
function worker(){
 const handlers={},lookups=[],cached=new Map([['http://127.0.0.1:4318/voice.js','voice-script'],['./index.html','offline-shell']]);
 const ctx={URL,Response,self:{location:{host:'127.0.0.1:4318',origin:'http://127.0.0.1:4318'},addEventListener(type,fn){handlers[type]=fn}},fetch:async()=>{throw new TypeError('Network disconnected')},caches:{match:async key=>{const k=typeof key==='string'?key:key.url;lookups.push(k);return cached.get(k)}}};
 vm.runInNewContext(code,ctx);return {handlers,lookups};
}
test('offline scripts and navigation fall back to the installed cache',async()=>{
 const {handlers}=worker();let result;
 handlers.fetch({request:{url:'http://127.0.0.1:4318/voice.js',method:'GET',mode:'cors'},respondWith(p){result=p}});assert.equal(await result,'voice-script');
 handlers.fetch({request:{url:'http://127.0.0.1:4318/',method:'GET',mode:'navigate'},respondWith(p){result=p}});assert.equal(await result,'offline-shell');
});
test('speech tokens, recognition requests, and health checks never use the offline cache',()=>{
 const {handlers,lookups}=worker();
 for(const [path,method] of [['/api/voice/status','GET'],['/api/voice/recognize?engine=compare','POST'],['/health','GET']]){
  handlers.fetch({request:{url:'http://127.0.0.1:4318'+path,method},respondWith(){assert.fail('private API must bypass cache')}});
 }
 assert.deepEqual(lookups,[]);
});
