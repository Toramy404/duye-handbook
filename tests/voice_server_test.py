"""Protocol/silence/limit tests; real-model comparisons are separate evaluation."""
import io,json,sys,threading,unittest,urllib.request,urllib.error,wave
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import voice_server as v

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

if __name__=='__main__':unittest.main()
