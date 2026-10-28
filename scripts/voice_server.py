"""Loopback-only desktop evaluation of the two real, locally installed ASR models.

No cloud ASR, microphone access, audio/text logs or saved recordings. The browser
requests its own microphone permission and sends one bounded PCM WAV per query.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit,parse_qs
import argparse,io,json,secrets,threading,time,wave,os
from setup_voice import ROOT,RUNTIME,MODELS

MAX_BYTES=16000*2*20+4096
TOKEN=secrets.token_urlsafe(32)
BUSY=threading.Lock()
ENGINES={}

def read_audio(payload):
 try:
  with wave.open(io.BytesIO(payload),'rb') as w:
   if w.getnchannels()!=1 or w.getsampwidth()!=2 or w.getframerate()!=16000 or w.getcomptype()!='NONE':
    raise ValueError('请使用16kHz、单声道、16位PCM WAV录音。')
   if not 1600<=w.getnframes()<=320000:raise ValueError('录音长度需在0.1至20秒之间。')
   count=w.getnframes();pcm=w.readframes(count)
   if len(pcm)!=count*2:raise ValueError('录音文件不完整。')
   return pcm,count/16000
 except (wave.Error,EOFError):raise ValueError('无法读取录音，请选择PCM WAV文件。')

def recognize(key,pcm):
 import numpy as np
 start=time.perf_counter();cold=key not in ENGINES
 folder=RUNTIME/MODELS[key]['folder']
 if not folder.is_dir():raise ValueError('模型尚未安装，请先运行语音预览启动脚本。')
 if cold:
  if key=='sherpa':
   import sherpa_onnx
   ENGINES[key]=sherpa_onnx.OnlineRecognizer.from_zipformer2_ctc(tokens=str(folder/'tokens.txt'),model=str(folder/'model.int8.onnx'),num_threads=2,enable_endpoint_detection=False)
  else:
   import vosk
   vosk.SetLogLevel(-1)
   # Vosk's Windows C++ file access cannot open Unicode absolute paths.
   # The launcher sets cwd to ROOT, so this model path contains only ASCII.
   ENGINES[key]=vosk.Model(os.path.relpath(folder))
 loaded=time.perf_counter()
 if key=='sherpa':
  recognizer=ENGINES[key];stream=recognizer.create_stream()
  # Padding lets the streaming model flush its final tokens.
  samples=np.concatenate((np.frombuffer(pcm,dtype='<i2').astype(np.float32)/32768,np.zeros(8000,dtype=np.float32)))
  stream.accept_waveform(16000,samples);stream.input_finished()
  while recognizer.is_ready(stream):recognizer.decode_stream(stream)
  text=recognizer.get_result(stream).strip()
 else:
  import vosk
  recognizer=vosk.KaldiRecognizer(ENGINES[key],16000);parts=[]
  for i in range(0,len(pcm),8000):
   if recognizer.AcceptWaveform(pcm[i:i+8000]):parts.append(json.loads(recognizer.Result()).get('text',''))
  parts.append(json.loads(recognizer.FinalResult()).get('text',''));text=' '.join(filter(None,parts)).strip()
 return {'engine':key,'text':text,'decode_ms':round((time.perf_counter()-loaded)*1000),'load_ms':round((loaded-start)*1000),'cold_start':cold}

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def log_message(self,*args):pass
 def end_headers(self):
  self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
  self.send_header('Permissions-Policy','microphone=(self)')
  super().end_headers()
 def valid_host(self):return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
 def reply(self,status,data):
  body=json.dumps(data,ensure_ascii=False).encode('utf-8');self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  if not self.valid_host():return self.reply(403,{'error':'仅允许本机访问。'})
  path=urlsplit(self.path).path
  if path=='/health':return self.reply(200,{'app':'nightreign-voice-preview','root':str(ROOT/'dist'),'port':self.server.server_port})
  if path=='/api/voice/status':
   return self.reply(200,{'mode':'desktop-local','token':TOKEN,'engines':{k:{'ready':(RUNTIME/v['folder']).is_dir(),'loaded':k in ENGINES} for k,v in MODELS.items()},'saves_audio':False})
  if path.startswith('/api/'):return self.reply(404,{'error':'接口不存在。'})
  return super().do_GET()
 def list_directory(self,path):self.send_error(404);return None
 def do_POST(self):
  if not self.valid_host():return self.reply(403,{'error':'仅允许本机访问。'})
  origin=self.headers.get('Origin')
  if origin not in {None,f'http://{self.headers.get("Host")}'} or not secrets.compare_digest(self.headers.get('X-Voice-Token',''),TOKEN):
   return self.reply(403,{'error':'请求来源不匹配，请刷新预览。'})
  parsed=urlsplit(self.path)
  if parsed.path!='/api/voice/recognize':return self.reply(404,{'error':'接口不存在。'})
  key=parse_qs(parsed.query).get('engine',['sherpa'])[0]
  if key not in {'sherpa','vosk','compare'}:return self.reply(400,{'error':'未知识别引擎。'})
  try:size=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.reply(400,{'error':'录音长度无效。'})
  if not 44<=size<=MAX_BYTES:return self.reply(413,{'error':'录音太长，请控制在20秒内。'})
  if not BUSY.acquire(blocking=False):return self.reply(409,{'error':'正在处理上一段录音，请稍后重试。'})
  try:
   self.connection.settimeout(20)
   pcm,duration=read_audio(self.rfile.read(size))
   import numpy as np
   rms=float(np.sqrt(np.mean((np.frombuffer(pcm,dtype='<i2').astype(np.float32)/32768)**2)))
   if rms<0.001:return self.reply(200,{'results':[],'duration':duration,'no_speech':True})
   results=[]
   for selected in (['sherpa','vosk'] if key=='compare' else [key]):
    try:results.append(recognize(selected,pcm))
    except Exception as e:
     print('ASR error:',selected,type(e).__name__,flush=True)
     results.append({'engine':selected,'error':'本地模型无法识别这段录音，请重试或检查模型安装。'})
   self.reply(200,{'results':results,'duration':duration,'same_audio':True})
  except ValueError as e:self.reply(400,{'error':str(e)})
  except (TimeoutError,ConnectionError):pass
  finally:BUSY.release()

if __name__=='__main__':
 os.chdir(ROOT)
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=4318);args=parser.parse_args()
 server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
 print(f'Voice preview: http://127.0.0.1:{args.port}/#voice',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
