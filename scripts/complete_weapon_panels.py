"""Apply explicit weapon panel evidence; keep every historical observation immutable."""
from copy import deepcopy
import json
import hashlib

PREFIX = 'weapon-panel:'


def load_audit(root):
    """Layer reviewed facts over the immutable first audit, never over raw observations."""
    path = root / 'docs/research/weapon-panel-audit-20261017.json'
    followup = json.loads((root / 'docs/research/weapon-panel-followup-20261018.json').read_text('utf-8'))
    assert hashlib.sha256(path.read_bytes()).hexdigest() == followup['base_audit_sha256'], 'Follow-up baseline changed'
    audit = json.loads(path.read_text('utf-8'))
    by_id = {row['weapon_id']: row for row in audit['items']}
    audit['sources'].extend(followup['sources'])
    for extra in followup['items']:
        row = by_id[extra['weapon_id']]
        assert row['game_id'] == extra['game_id'], 'Weapon identity changed'
        old_fields = {r['field'] for r in row['resolutions']}
        assert not old_fields.intersection(r['field'] for r in extra['resolutions']), 'Duplicate resolution'
        for key in ('comparators', 'comparisons', 'resolutions'):
            row[key].extend(extra[key])
        row['reviewed_at'] = extra['reviewed_at']
        row['review_notes'] = extra['notes'] + [r['reason'] for r in extra['unresolved']]
        if 'quality_needs_review' in extra:
            row['quality_needs_review'] = extra['quality_needs_review']
    return audit


def field(value, reason=None, state=None):
    return dict(value=value, state=state or ('known' if value is not None else 'unknown'),
                reason=reason if value is None else None)


def complete(root, data):
    audit = load_audit(root)
    by_id = {w['id']: w for w in data['weapons']}
    assert set(by_id) == {r['weapon_id'] for r in audit['items']}
    data['sources'].extend(audit['sources'])
    corrections = json.loads((root / 'data/corrections.json').read_text('utf-8'))
    data['corrections'] = [c for c in corrections if not c['id'].startswith(PREFIX)]
    for row in audit['items']:
        w = by_id[row['weapon_id']]
        p = deepcopy(row['primary'])
        sid = row['primary_source_id']
        oid = w['id'] + ':panel-observation-20261017'
        vid = w['id'] + ':panel-20261017'
        # Retain the independent page observation before applying reviewed corrections.
        data['weapon_source_observations'].append(dict(id=oid, weapon_id=w['id'], source_id=sid,
            verification_status='source_reported', raw=row['primary']))
        resolved = {r['field']: r for r in row['resolutions']}
        for key, r in resolved.items():
            parts = key.split('.')
            if len(parts) == 2:
                p[parts[0]][parts[1]] = r['value']
            else:
                p[key] = r['value']
        pending = sorted({c['field'] for c in row['comparisons'] if c['state'] == 'conflict'
                          and c['field'] not in resolved and c['field'] != 'skill_assignment'})
        if row['quality_needs_review']:
            pending = sorted(set(pending) | {'rarity'})
        # Conflicting numeric/letter fields are not promoted to one certain display value.
        reason = '来源数值不同，见详情末尾并列记录；未据此生成确定值。'
        attack = {k: field(None, reason, 'conflict') if 'attack.'+k in pending else field(v)
                  for k, v in p['attack'].items()}
        guard = {k: None if 'guard.'+k in pending else v for k, v in p['guard'].items()}
        grades = {k: None if 'scaling.'+k in pending else v for k, v in p['scaling'].items()}
        critical = field(None, reason, 'conflict') if 'critical' in pending else field(p['critical'])
        skill_reason = ('触媒使用法术栏。' if w['group']=='catalyst'
                        else '来源称按类别池随机分配，未给具体战技；不推断无战技。')
        conditions = dict(game_version=None, character=None, character_level=None,
                          upgrade=None, holding_mode=None, buffs=None, affinity_roll=None)
        variant = dict(id=vid, weapon_id=w['id'], observation_id=oid, source_id=sid,
            verification_status='source_reported', rarity_label=None if row['quality_needs_review'] else p['rarity'],
            rarity_state='needs_verification' if row['quality_needs_review'] else 'source_reported',
            level_required=p['level_required'], rarity_stats_binding_confirmed=False,
            attack=attack, guard=field(guard), critical=critical,
            scaling=dict(state=p['scaling_state'], grades=grades, unlisted_attribute_grades=None),
            attack_types=p['attack_types'], status=p['status'],
            spell_power=field(p['spell_power'], '不适用触媒法术威力。',
                              'known' if p['spell_power'] is not None else 'not_applicable'),
            range=field(p['range'], '来源未列射程。'),
            skill=field(p['skill'], skill_reason, 'not_applicable' if w['group']=='catalyst' else None),
            skill_assignment='example_with_random_report' if row['random_assignment_reported'] else p['skill_assignment'],
            spells=field(p['spells'], '不适用触媒法术栏。', 'known' if p['spells'] else 'not_applicable'),
            conditions=conditions, pending_fields=pending, corrections=row['resolutions'],
            null_reasons=dict(conditions='补丁、强化、角色、持握与品质绑定未核实。'))
        data['weapon_variants'].append(variant)
        w['variant_ids'].append(vid)
        w['observation_ids'].append(oid)
        w['display_variant_id'] = vid
        w['catalog_coverage'] = 'panel'
        w['name_en'] = row['name_en']
        w['game_parameter_id'] = row['game_id']
        w['aliases'] = sorted(set(w['aliases'] + [row['name_zh_parameter'], row['primary']['name_en']]) - {w['name'], w['name_en']})
        w.pop('comparison_note', None)  # Superseded by field-level audit; original research stays intact.
        w['known_gaps'] = ['资料未统一游戏补丁、强化、角色与持握条件，不提供总伤害或强弱排名。']
        if pending:
            w['known_gaps'].append('正文“待核”的字段仍有来源分歧；并列值与出处见上方核对记录。')
        if w['name_zh_status'].find('provisional') >= 0:
            w['known_gaps'].append('历史候选中文名状态保留；游戏参数中的名称已作为检索别名。')
        refs = [dict(source_id=sid, locator='Attack & Guard Stats / Scaling and More / Ashes of War')]
        refs.extend(dict(source_id=c['source_id'], locator=c['locator']) for c in row['comparators'])
        w['source_refs'] = refs + w['source_refs']
        w['panel_audit'] = dict(date=row.get('reviewed_at', audit['accessed']),
            notes=(['同站盾牌页面均标普通，且本条等级与参数表冲突；品质标签暂不采用，原页面品质“普通”保留。不按需求等级推算品质。'] if row['quality_needs_review'] else []) + row.get('review_notes', []),
            decisions=row['resolutions'],
            matched_comparisons=sum(c['state']=='match' for c in row['comparisons']),
            compared_fields=len({c['field'] for c in row['comparisons'] if c['state']!='conditions_unknown'}),
            differences=[dict(c, resolution='conditions_unknown' if c['state']=='conditions_unknown' else 'adopted' if c['field'] in resolved else
                             'assignment_note' if c['field']=='skill_assignment' else 'pending',
                             adopted_value=resolved[c['field']]['value'] if c['field'] in resolved and c['state']!='conditions_unknown' else None)
                         for c in row['comparisons'] if c['state']!='match' or c['field'] in resolved or c['field'] in pending])
        if resolved:
            data['corrections'].append(dict(id=PREFIX+w['id'], name=w['name']+' · 面板来源纠错',
                before={key:next(c['primary'] for c in row['comparisons'] if c['field']==key) for key in resolved},
                after={key:r['value'] for key,r in resolved.items()},
                evidence='；'.join(key+'：'+r['reason'] for key,r in resolved.items()),
                source_refs=[dict(source_id=s,locator='字段纠错依据') for s in sorted({sid}|{s for r in resolved.values() for s in r['source_ids']})],
                verification_status='source_reported'))
    return data
