#!/usr/bin/env python3
"""H006: fixed-rule historically conditional 6-10 history evidence, research only.

Historical 2024 train, 2025/26 diagnostic period already exposed to earlier studies.
Input is H005's frozen per-horse M3 shadow for identical lineup/rank and the
user's ORIGINAL deduplicated histories strictly prior to every target date.

Only the pre-specified three gates are assessed. We cannot alter main app.
"""
from __future__ import annotations
import collections, csv, json, math, sys, os
from pathlib import Path
import numpy as np
ROOT=Path(os.environ.get('RACE_DATA_DIR','/mnt/data'))
BASE=ROOT/'h005_depth_to_m3_20261123'
OUT=Path(os.environ.get('RACE_OUTPUT_DIR',ROOT/'h006_conditional_history_20261123'))
OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(BASE))
from h005_depth_m3_shadow import history, normname
ALPHA=0.8
POLICIES=('return_distance','consistent_running_style','recent_gap_volatility')
# Fix gates before reading this cohort's outcome labels. Values represent physical margins.
THRESHOLDS={
 'return_distance':{'distance_tolerance_m':200,'older_matching_min':2,'recent_matching_max':1},
 'consistent_running_style':{'same_surface_last10_min':8,'min_valid_front_each_half':3,'frontness_mean_change_max':0.12},
 'recent_gap_volatility':{'recent5_gap_pop_sd_min_s':0.50},
}

def eligible_gates(hist,meta):
    """Decide all gates from as-of prior records only, never target fin/odds/score."""
    # As-of strictly prior dates, stable race-ID dedup and descending chronology.
    unique={}
    for h in hist:
        if h['date']>=meta['date'] or h['gap'] is None or not 0<=h['gap']<=5:continue
        rid=str(h.get('rid',''))
        if len(rid)!=16:continue
        unique.setdefault(rid,h)
    rr=sorted(unique.values(),key=lambda x:(x['date'],x['rid']),reverse=True)
    if len(rr)<10:return {k:False for k in POLICIES}, {'prior_valid_gaps':len(rr)}
    recent=rr[:5];older=rr[5:10];surface=meta['surface'];dist=int(meta['distance'])
    same=lambda x: x['surface']==surface and abs(x['dist']-dist)<=200
    prevmatch=sum(bool(same(x)) for x in recent)
    oldmatch=sum(bool(same(x)) for x in older)
    longsurf=sum(x['surface']==surface for x in rr[:10])
    rfront=[x['front'] for x in recent if x['front'] is not None]
    ofront=[x['front'] for x in older if x['front'] is not None]
    frontdelta=abs(np.mean(rfront)-np.mean(ofront)) if len(rfront)>=3 and len(ofront)>=3 else None
    gap_sd=float(np.std([x['gap'] for x in recent],ddof=0))
    flags={
      'return_distance':(oldmatch>=2 and prevmatch<=1),
      'consistent_running_style':(longsurf>=8 and frontdelta is not None and frontdelta<=0.12),
      'recent_gap_volatility':gap_sd>=0.50,
    }
    attrs={'prior_valid_gaps':len(rr),'recent_dist_matches':prevmatch,'older_dist_matches':oldmatch,
         'same_surface10':longsurf,'frontness5vsolder_change':float(frontdelta) if frontdelta is not None else None,
         'recent_gap_sd_s':gap_sd}
    return flags,attrs


def read_h005():
    p=BASE/'h005_horse_comparison_PRIVATE.csv'
    assert p.exists(),p
    races=collections.defaultdict(list)
    with p.open(encoding='utf-8-sig',newline='') as f:
      for row in csv.DictReader(f):
        r={k:row[k] for k in ('rid','name','surface')}
        for k in ('year','no','fin','distance','pop','n_all','n_gap_all'):
            r[k]=int(row[k]) if row[k] else None
        for k in ('score_all5_decay','score_all10_decay','score_same5_decay','score_same10_decay'):
            r[k]=float(row[k])
        races[r['rid']].append(r)
    for rid,rows in races.items():
        assert len({r['no'] for r in rows})==len(rows)
        assert all(r['year']==rows[0]['year'] for r in rows)
    return races


def rank(rows,pol=None,features=None):
    def score(r):
        if pol and features[(r['rid'],r['no'])]['gates'][pol]:
            return r['score_all10_decay']
        return r['score_all5_decay']
    return sorted(rows,key=lambda r:(score(r),r['no']))[:3]


def race_outcome(rows,policy,features):
    aa=rank(rows,None,features);bb=rank(rows,policy,features)
    hit=lambda picked:sum(x['fin']<=3 for x in picked)
    win=lambda picked:any(x['fin']==1 for x in picked)
    flags=[features[(r['rid'],r['no'])]['gates'][policy] for r in rows]
    return {'rid':rows[0]['rid'],'year':rows[0]['year'],'n':len(rows),'surface':rows[0]['surface'],
            'policy':policy,'eligible_horses':sum(flags),'changed':{x['no'] for x in aa}!={x['no'] for x in bb},
            'hits_base':hit(aa),'hits_policy':hit(bb),'wins_base':int(win(aa)),'wins_policy':int(win(bb)),
            'selected_base':[x['no'] for x in aa],'selected_policy':[x['no'] for x in bb]}


def report(rows,seed=20261123,boot=9000):
    n=len(rows)
    dif=np.array([r['hits_policy']-r['hits_base'] for r in rows],dtype=float)
    rng=np.random.default_rng(seed)
    # memory-bounded cluster/bootstrap at race level, 1000 repeats per block
    batch=[]
    for start in range(0,boot,1000):
      i=rng.integers(0,n,(min(1000,boot-start),n))
      batch.extend(dif[i].mean(axis=1).tolist())
    ci=np.quantile(batch,[.025,.975]).tolist()
    changed=[r for r in rows if r['changed']]
    return {'races':n,'eligible_horses':sum(r['eligible_horses'] for r in rows),
      'eligible_races':sum(r['eligible_horses']>0 for r in rows),
      'changed_races':len(changed),
      'base_hits':sum(r['hits_base'] for r in rows),'policy_hits':sum(r['hits_policy'] for r in rows),
      'delta_hits':int(sum(dif)),'delta_per_race':float(dif.mean()),'ci95_delta_per_race':[float(x) for x in ci],
      'improved_races':int(sum(dif>0)),'worse_races':int(sum(dif<0)),
      'wins_base':sum(r['wins_base'] for r in rows),'wins_policy':sum(r['wins_policy'] for r in rows),
      'change_only_base_hits':sum(r['hits_base'] for r in changed),
      'change_only_policy_hits':sum(r['hits_policy'] for r in changed)}


def main():
    races=read_h005()
    hist,stats=history()
    print('history:',sum(map(len,hist.values())),'races:',len(races),flush=True)
    features={}
    for rid,rows in races.items():
      date=rid[:8]
      for row in rows:
        m={'date':date,'surface':row['surface'],'distance':row['distance']}
        f,a=eligible_gates(hist.get(normname(row['name']),[]),m)
        features[(rid,row['no'])]={'gates':f,'attributes':a}
    assert len(features)==sum(map(len,races.values()))
    res=[]
    for p in POLICIES:
      for rid,rs in races.items():res.append(race_outcome(rs,p,features))
    by={(r['policy'],r['rid']):r for r in res}
    years={'train2024':[r for r in races.values() if r[0]['year']==2024],
           'eval2025':[r for r in races.values() if r[0]['year']==2025],
           'eval2026':[r for r in races.values() if r[0]['year']==2026],
           'eval2025_2026':[r for r in races.values() if r[0]['year']>=2025],
           'all':[r for r in races.values()]}
    summary={}
    for pol in POLICIES:
        summary[pol]={}
        for year,cards in years.items():
            rr=[by[(pol,rows[0]['rid'])] for rows in cards]
            summary[pol][year]=report(rr)
    # Predeclared go/no-go: for a candidate to be promoted to 2025/26, it must
    # change >=10 races in 2024 and improve >=3 caught Top3s in 2024.
    # If multiple satisfy, pick best positive 2024 delta; ties lexicographic.
    eligible=[p for p in POLICIES if summary[p]['train2024']['changed_races']>=10 and summary[p]['train2024']['delta_hits']>=3]
    chosen=sorted(eligible,key=lambda p:(-summary[p]['train2024']['delta_hits'],p))[0] if eligible else None
    if chosen is not None:
      choice={k:summary[chosen][k] for k in years}
    else:
      choice={k:{'races':len(cards),'delta_hits':0,'changed_races':0,
         'base_hits':sum(r['fin']<=3 for rows in cards for r in rank(rows)),'policy_hits':sum(r['fin']<=3 for rows in cards for r in rank(rows))} for k,cards in years.items()}
    # cache private output details for replication; don't commit to public github.
    with (OUT/'H006_race_level_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
      keys=['rid','year','surface','policy','n','eligible_horses','changed','hits_base','hits_policy','wins_base','wins_policy','selected_base','selected_policy'];w=csv.DictWriter(f,keys);w.writeheader()
      for row in res:w.writerow({k:','.join(map(str,row[k])) if isinstance(row[k],list) else row[k] for k in keys})
    # Public aggregates only
    aggregate={'schema':'rsa-h006-conditional-history-depth-v1','predeclared_thresholds':THRESHOLDS,
      'method':'Only historical prior race records strictly before as-of race date, unique name+16-digit rid per H005; hold M3 18 inputs and coefficients constant; all5_decay vs conditional all10_decay with alpha .8.',
      'source':'H005 private horse-level score CSV from frozen coefficients and umadete historical raw valid dates',
      'selection_training_year':2024,'diagnostic_evaluation_years':[2025,2026],
      'training_gate':'2024 >=10 changed races and >=3 additional captured top3 horses; otherwise select none, no fallback optimization',
      'chosen_by_training':chosen,'chosen_evaluation':choice,
      'policy_diagnostics':summary,'source_history_stats':dict(stats),
      'limitations':['2024-2026 already repeatedly explored, not untouched prospective holdout',
        'shadow M3 reconstructed Python not complete browser runtime parity',
        'not a horse independent model, selection evaluated clustered by race','no probability, payout, T-15 odds, or ROI claim']}
    (OUT/'H006_results.json').write_text(json.dumps(aggregate,ensure_ascii=False,indent=2,default=lambda x:x.item() if hasattr(x,'item') else str(x)),encoding='utf-8')
    print(json.dumps({p:{y:{k:s[k] for k in ['races','eligible_horses','eligible_races','changed_races','base_hits','policy_hits','delta_hits','ci95_delta_per_race','wins_base','wins_policy']} for y,s in summary[p].items() if y in ['train2024','eval2025','eval2026','eval2025_2026']} for p in POLICIES},ensure_ascii=False,indent=2,default=lambda x:x.item() if hasattr(x,'item') else str(x)))
    print('selected policy by training:',chosen,'selected test:',choice.get('eval2025_2026'),flush=True)

if __name__=='__main__':main()