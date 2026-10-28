"""Download only the two selected public ASR models into an ignored local runtime."""
from pathlib import Path
import hashlib,json,shutil,tarfile,urllib.request,zipfile,os,subprocess

ROOT=Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'.voice-runtime'
MODELS={
 'sherpa': {'folder':'sherpa-onnx-streaming-zipformer-small-ctc-zh-int8-2025-04-01','url':'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-small-ctc-zh-int8-2025-04-01.tar.bz2'},
 'vosk': {'folder':'vosk-model-small-cn-0.22','url':'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip'},
}
HASHES={'sherpa':'b3b309f7ce4a737195fcc6963ea19b0653a7d3401580af5ae0d3e284cbb71f0b','vosk':'3af8b0e7e0f835ae9d414ce5df580237a3cfb08d586c9fbbb0f7ff29ad5b14ba'}
# Required runtime files and sizes from the two SHA-256-pinned official archives.
REQUIRED={
 'sherpa':{'model.int8.onnx':26342340,'tokens.txt':13366},
 'vosk':{'am/final.mdl':15901896,'conf/mfcc.conf':153,'conf/model.conf':289,
  'graph/disambig_tid.int':234,'graph/Gr.fst':26082259,'graph/HCLr.fst':16158762,
  'graph/phones/word_boundary.int':7161,'ivector/final.dubm':168048,'ivector/final.ie':9927287,
  'ivector/final.mat':44975,'ivector/global_cmvn.stats':1090,'ivector/online_cmvn.conf':0,'ivector/splice.conf':35}
}

def model_ready(key):
 folder=RUNTIME/MODELS[key]['folder']
 try:return all((folder/name).is_file() and (folder/name).stat().st_size==size for name,size in REQUIRED[key].items())
 except OSError:return False

def setup():
 RUNTIME.mkdir(exist_ok=True)
 reports={}
 for key,info in MODELS.items():
  archive=RUNTIME/info['url'].split('/')[-1]
  if not archive.exists():
   partial=archive.with_suffix(archive.suffix+'.part')
   print('Downloading '+key,flush=True)
   request=urllib.request.Request(info['url'],headers={'User-Agent':'DuyeHandbook-voice-preview/0.1'})
   try:
    with urllib.request.urlopen(request,timeout=60) as source, partial.open('wb') as output:shutil.copyfileobj(source,output)
   except urllib.error.URLError:
    if os.name!='nt':raise
    # Windows' system trust store can differ from Python's. Keep TLS validation.
    quote=lambda s:"'"+str(s).replace("'","''")+"'"
    command="$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri "+quote(info['url'])+" -OutFile "+quote(partial)+" -TimeoutSec 180"
    subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',command],check=True)
   partial.replace(archive)
  assert hashlib.sha256(archive.read_bytes()).hexdigest()==HASHES[key], 'Model archive hash mismatch: '+key
  dest=RUNTIME/info['folder']
  if not model_ready(key):
   if archive.suffix=='.zip':
    with zipfile.ZipFile(archive) as z:
     for n in z.namelist():
      assert (RUNTIME/n).resolve().is_relative_to(RUNTIME.resolve()),'Unsafe archive member'
     z.extractall(RUNTIME)
   else:
    with tarfile.open(archive) as t:t.extractall(RUNTIME,filter='data')
  assert model_ready(key),'Model extraction is incomplete: '+key
  reports[key]={**info,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'archive_bytes':archive.stat().st_size,'files':{str(p.relative_to(dest)).replace('\\','/'):p.stat().st_size for p in dest.rglob('*') if p.is_file()}}
  print(key+': '+str(reports[key]['archive_bytes'])+' bytes downloaded; model available',flush=True)
 (RUNTIME/'model-manifest.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),'utf-8')

if __name__=='__main__':setup()
