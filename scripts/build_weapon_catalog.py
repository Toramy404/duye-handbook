"""Convert preserved research into traceable preview records without inferred stats."""
import json, argparse
from expand_weapon_catalog import expand
from complete_weapon_panels import complete
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PREFIX='weapon-research:'
ALIASES={'dark-moon-greatsword':['月光大剑','月光剑'],'axe-of-godfrey':['王斧'],'ironeyes-bow':['铁眼弓','铁之眼弓'],'astrologers-staff':['观星者杖'],'clawmark-seal':['爪痕圣印'],'dragon-communion-seal':['龙飨圣印'],'ants-skull-plate':['蚂蚁盾'],'grafted-dragon':['龙头'],'marikas-hammer':['玛莉卡石槌']}
def read(p): return json.loads((ROOT/p).read_text('utf-8'))
def field(value,reason=None,state=None):
    return dict(value=value,state=state or ('unknown' if value is None else 'known'),reason=reason if value is None else None)
def build():
    m=read('docs/research/melee-12-source-observations.json'); t=read('docs/research/weapon-tools.json')
    weapons=[]; variants=[]; observations=[]; links=[]
    raw_sources={s['id']:s for s in m['sources']}; raw_sources.update(t['sources'])
    sources=[s for s in read('data/sources.json') if not s['id'].startswith((PREFIX,'weapon-index:','weapon-expansion:','weapon-panel:'))]
    for sid,s in raw_sources.items():
        sources.append({**s,'id':PREFIX+sid,'title':s.get('title',s.get('publisher',sid)+' · '+sid),'version':None,'note':s.get('limits',s.get('limitations_zh','研究来源记录，未完成游戏内验证。')),'research_source_id':sid})
    for r in m['samples']+t['items']:
        melee='sample_id' in r
        sample=r['sample_id'] if melee else r['id']
        slug=sample.removeprefix('nr-melee-').removeprefix('nr-tool-sample-'); wid='weapon:'+slug
        raw=r['source_observations'] if melee else [r['source_observation']]; o=raw[0]
        cat=r['category']['en']; group='melee' if melee else 'catalyst' if cat in ['Glintstone Staff','Sacred Seal'] else 'shield' if cat in ['Small Shield','Medium Shield','Greatshield'] else 'ranged'
        refs=set(); obsids=[]
        for i,obs in enumerate(raw):
            oid=wid+':observation:'+str(i+1); obsids.append(oid); refs.add(obs['source_id'])
            observations.append(dict(id=oid,weapon_id=wid,source_id=PREFIX+obs['source_id'],verification_status='source_reported',raw=obs))
        if melee:
            refs.update([r['name']['zh_source_id'],r['name']['en_source_id']])
            zh,en,status=r['name']['zh'],r['name']['en'],r['name']['mapping_status']
            attack={k:field(v) for k,v in o['attack_rating_display'].items()}
            scaling=dict(state='grades_displayed',grades=o['attribute_scaling_display'],unlisted_attribute_grades=None)
            sk=o['skill_display']; skill=dict(name_en=sk['name_en'],fp_cost_display=sk['fp_cost_text'],fixed_for_weapon=None) if sk['name_en'] else None
            skill_reason='来源未列固有战技，页面称按类别池随机；完整池未收录。'
            rarity=o['rarity_label']; conditions=o['numeric_conditions']
            reasons=dict(guard='近战研究样本未采集防御字段。',critical='近战研究样本未采集致命一击字段。',conditions='补丁、强化、角色及品质与数值绑定均未完成核验。')
            innate=dict(state='reported_innate' if o['innate_status_display'] else 'explicit_no_innate',effects=o['innate_status_display'])
            guard=field(None,reasons['guard']); critical=field(None,reasons['critical'])
            spell_power=field(None,'近战武器不适用法术威力。','not_applicable'); spells=field(None,'近战武器不适用触媒法术栏。','not_applicable')
            gaps=r['known_gaps_zh']; effect=r['existing_app_effect_id']; desc='近战武器 · '+r['category']['zh']; types=o['physical_attack_types_display']
        else:
            for ids in r['provenance'].values(): refs.update(ids)
            zh,en,status=r['name_zh'],r['name_en'],r['name_zh_status']
            attack={k:field(v) for k,v in o['attack'].items() if k!='critical'}
            critical=field(o['attack']['critical']); guard=field(o['guard']); scaling=o['scaling']; skill=o['skill']; reasons=r['null_reasons']
            skill_reason=reasons.get('skill','来源未给出战技记录。')
            spell_power=field(o['spell_power'],reasons.get('spell_power','该装备不适用触媒法术威力。'),'known' if o['spell_power'] is not None else 'not_applicable')
            spells=field(o['spells'],reasons.get('spells','该装备不适用触媒法术栏。'),'known' if o['spells'] is not None else 'not_applicable')
            rarity=o['rarity']; conditions=r['conditions']; innate=o['status']; gaps=r['verification']['pending']; effect=r['existing_relationship']['id'] if r['existing_relationship'] else None; desc=r['purpose_editorial']; types=[o['attack_type'].lower()]
        vid=wid+':source-example'
        variants.append(dict(id=vid,weapon_id=wid,observation_id=obsids[0],source_id=PREFIX+o['source_id'],verification_status='source_reported',rarity_label=rarity,level_required=o['level_required'],rarity_stats_binding_confirmed=False,attack=attack,critical=critical,guard=guard,scaling=scaling,attack_types=types,spell_power=spell_power,status=innate,skill=field(skill,skill_reason,'not_applicable' if skill is None and group=='catalyst' else None),spells=spells,conditions=conditions,null_reasons=reasons))
        weapons.append(dict(id=wid,name=zh,name_en=en,name_zh_status=status,aliases=ALIASES.get(slug,[]),category=r['category']['zh'],category_en=cat,group=group,description=desc,verification_status='source_reported',variant_ids=[vid],observation_ids=obsids,research_sample_id=sample,known_gaps=gaps,source_refs=[dict(source_id=PREFIX+sid,locator='研究样本 '+sample) for sid in sorted(refs)]))
        if effect: links.append(dict(id=wid+':legendary-effect',weapon_id=wid,effect_id=effect,collection='legendary_weapon_effects',verification_status='source_reported'))
    return complete(ROOT,expand(ROOT,dict(weapons=weapons,weapon_variants=variants,weapon_source_observations=observations,weapon_effect_links=links,sources=sources)))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    for name,data in build().items():
        path=ROOT/'data'/(name+'.json')
        if args.check: assert path.exists() and read(str(path.relative_to(ROOT)))==data, name+': adapter output differs'
        else: path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Weapon research adapter verified.' if args.check else 'Generated weapon preview collections.')
