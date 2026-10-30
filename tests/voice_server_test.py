"""Protocol/silence/limit tests; real-model comparisons are separate evaluation."""
import io,json,sys,threading,unittest,urllib.request,urllib.error,wave,struct,tempfile,zipfile,hashlib
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import voice_server as v
import setup_voice as setup

def wav(frames=16000,rate=16000):
 b=io.BytesIO()
 with wave.open(b,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(b'\0\0'*frames)
 return b.getvalue()

class Protocol(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=v.ThreadingHTTPServer(('127.0.0.1',0),v.Handler);cls.url=f'http://127.0.0.1:{cls.server.server_port}'
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join()
 def post(self,body,token=v.TOKEN,origin=None,engine='sherpa'):
  headers={'X-Voice-Token':token,'Content-Type':'audio/wav'}
  if origin:headers['Origin']=origin
  req=urllib.request.Request(self.url+'/api/voice/recognize?engine='+engine,data=body,headers=headers)
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_silence(self):
  status,data=self.post(wav());self.assertEqual(status,200);self.assertTrue(data['no_speech']);self.assertEqual(data['results'],[])
 def test_wrong_origin(self):self.assertEqual(self.post(wav(),origin='https://other.example')[0],403)
 def test_no_token(self):self.assertEqual(self.post(wav(),token='')[0],403)
 def test_invalid_audio(self):self.assertEqual(self.post(b'x'*100)[0],400)
 def test_wrong_rate(self):self.assertEqual(self.post(wav(rate=48000))[0],400)
 def test_limit(self):self.assertEqual(self.post(b'x'*(v.MAX_BYTES+1))[0],413)
 def test_engine(self):self.assertEqual(self.post(wav(),engine='cloud')[0],400)
 def test_short(self):self.assertEqual(self.post(wav(frames=10))[0],400)
 def test_status(self):
  with urllib.request.urlopen(self.url+'/api/voice/status') as r:
   data=json.load(r);self.assertIn('no-store',r.headers['Cache-Control']);self.assertFalse(data['saves_audio'])
 def test_foreign_host(self):
  with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(urllib.request.Request(self.url+'/api/voice/status',headers={'Host':'other.example'}))
  self.assertEqual(e.exception.code,403)
 def test_busy(self):
  v.BUSY.acquire()
  try:self.assertEqual(self.post(wav())[0],409)
  finally:v.BUSY.release()
 def test_oversized_format_chunk(self):
  body=bytearray(wav());struct.pack_into('<I',body,16,4294967295)
  self.assertEqual(self.post(body)[0],400)
 def test_compare_receives_identical_pcm(self):
  body=bytearray(wav());body[44:]=struct.pack('<h',1000)*16000;seen=[]
  def decoder(key,pcm):seen.append((key,pcm));return {'engine':key,'text':'测试'}
  with patch.object(v,'recognize',side_effect=decoder):status,data=self.post(body,engine='compare')
  self.assertEqual(status,200);self.assertEqual([x[0] for x in seen],['sherpa','vosk'])
  self.assertEqual(seen[0][1],seen[1][1]);self.assertTrue(data['same_audio'])

class ModelInstallation(unittest.TestCase):
 def test_incomplete_folder_is_not_ready_and_setup_repairs_it(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=Path(temporary);folder=root/'model';folder.mkdir();(folder/'weights').write_bytes(b'broken')
   archive=root/'model.zip'
   with zipfile.ZipFile(archive,'w') as z:z.writestr('model/weights',b'complete-model')
   with patch.object(setup,'RUNTIME',root),patch.object(setup,'MODELS',{'test':{'folder':'model','url':'https://example.invalid/model.zip'}}),patch.object(setup,'HASHES',{'test':hashlib.sha256(archive.read_bytes()).hexdigest()}),patch.object(setup,'REQUIRED',{'test':{'weights':14}}):
    self.assertFalse(setup.model_ready('test'));setup.setup();self.assertTrue(setup.model_ready('test'))
    self.assertEqual((folder/'weights').read_bytes(),b'complete-model')

if __name__=='__main__':unittest.main()
