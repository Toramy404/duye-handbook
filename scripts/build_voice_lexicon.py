"""Build pronunciation hints from existing names, without changing game data."""
from pathlib import Path
import argparse,json
from pypinyin import lazy_pinyin,Style
ROOT=Path(__file__).resolve().parents[1]
def build():
 config=json.loads((ROOT/'config/voice-aliases.json').read_text('utf-8'))
 names=set(config['aliases'])
 for aliases in config['aliases'].values():names.update(aliases)
 for key in ['effects','weapons','characters','nightlords','wild_bosses','items','events','character_skills','recluse_spells']:
  for r in json.loads((ROOT/'data'/f'{key}.json').read_text('utf-8')):
   names.add(r['name'])
   if isinstance(r.get('aliases'),list):names.update(r['aliases'])
 pronunciations={s:lazy_pinyin(s,style=Style.NORMAL) for s in sorted(names) if s}
 # Characters allow previously unseen ASR homophones to be matched in the browser.
 chars={chr(i):lazy_pinyin(chr(i),style=Style.NORMAL)[0] for i in range(0x4e00,0xa000)}
 return ('window.NR_VOICE_LEXICON='+json.dumps({'aliases':config['aliases'],'phrases':pronunciations,'chars':chars},ensure_ascii=False,separators=(',',':'))+';\n').encode('utf-8')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();out=ROOT/'dist/voice-lexicon.js';b=build()
 if args.check:
  assert out.read_bytes()==b,'Rebuild voice lexicon';print('Voice lexicon matches existing names and reviewed aliases.')
 else:out.write_bytes(b);print('Voice lexicon:',len(b),'bytes')
