#!/usr/bin/env python3
"""H016: Nationwide venue×surface×distance 4C rank-band danger diagnosis.

Previous H013 train-only thresholds are reused, NEVER tuned on test 2024-26.
The current-race 4C data is POST-race observation only. No live selection rule.
"""
from __future__ import annotations
import sys, json, math, re, csv
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path('/mnt/data')
OUT=ROOT/'H016_4角危険度_芝ダ別全国分析_20261123'
OUT.mkdir(parents=True,exist_ok=True)
H12=ROOT/'H012_全国4角と全ラップ_20261123'
H13=ROOT/'H013_全国4角危険位置_20261123'
sys.path.insert(0,str(H12))
from h012_national_stage import build
SEED=20261123
BANDS=['前25%','前中25-50%','後中50-75%','最後方25%']


def group_metrics(g):
    n=len(g); k=int(g.top3.sum()); exp=float(g.q.sum())
    return {'races':int(g.rid.nunique()),'horses':n,'top3':k,'rate_pct':round(100*k/n,2) if n else None,
            'market_expected':round(exp,3),'actual_over_market':round(k/exp,3) if exp>0 else None}


def bootstrap_ci_by_race(df, nreps=2400, seed=SEED):
    if len(df)==0:return [None,None]
    z=df.groupby('rid',sort=False).agg(k=('top3','sum'),n=('top3','size'))
    x=z[['k','n']].to_numpy(float);n=len(x)
    if n<6:return [None,None]
    rng=np.random.default_rng(seed)
    ix=rng.integers(0,n,size=(nreps,n))
    bt=x[ix].sum(axis=1)
    return [round(float(v),2) for v in np.quantile(100*bt[:,0]/bt[:,1],[.025,.975])]


def paired_surface_ci(a,b,reps=3000,seed=SEED):
    # independent resampling of races in each surface at same venue/distance
    if a.rid.nunique()<6 or b.rid.nunique()<6:return [None,None]
    x=a.groupby('rid').agg(k=('top3','sum'),n=('top3','size'))[['k','n']].to_numpy(float)
    y=b.groupby('rid').agg(k=('top3','sum'),n=('top3','size'))[['k','n']].to_numpy(float)
    rng=np.random.default_rng(seed)
    xa=x[rng.integers(len(x),size=(reps,len(x)))].sum(axis=1)
    yb=y[rng.integers(len(y),size=(reps,len(y)))].sum(axis=1)
    dif=100*(xa[:,0]/xa[:,1]-yb[:,0]/yb[:,1])
    return [round(float(z),2) for z in np.quantile(dif,[.025,.975])]


def compute():
    _,hf,_,_=build()
    assert len(hf)==54383 and hf.rid.nunique()==3566
    hf=hf.copy()
    # replicate H013: quarter bins from c4/n, so with 16 starters last quarter = 13..16.
    hf['band']=pd.cut(hf.c4_norm,bins=[-0.001,.25,.5,.75,1.001],labels=BANDS,include_lowest=True).astype(str)
    assert not hf.band.isna().any() and hf.band.isin(BANDS).all()
    hh=hf[hf.year<=2023]; t=hf[hf.year>=2024]
    assert t.rid.nunique()==990 and len(t)==15089
    old=pd.read_csv(H13/'H013_87コース_位置どり危険開始ライン.csv')
    old=old.set_index('コース')
    outrows=[]
    for (v,s),gg in hf.groupby(['venue','surface'],sort=False):
        train=gg[gg.year<=2023]; test=gg[gg.year>=2024]
        for band in BANDS:
            a=train[train.band==band];b=test[test.band==band]
            one={'venue':v,'surface':s,'band':band,'train':group_metrics(a),'test':group_metrics(b),'test_ci95_pct':bootstrap_ci_by_race(b)}
            outrows.append(one)
    course_rows=[]
    for (v,s,d),g in hf.groupby(['venue','surface','distance'],sort=False):
        prof=f'{v}{s}{d}m';prev=old.loc[prof];a=g[g.year<=2023]; b=g[g.year>=2024];zones=[]
        for zone in BANDS:
            x=a[a.band==zone];y=b[b.band==zone]
            zones.append({'band':zone,'train':group_metrics(x),'test':group_metrics(y),
                          'test_ci95_pct':bootstrap_ci_by_race(y,nreps=1000)})
        risk=str(prev['採用区分']);risk_zone=('後方50%' if risk=='後方半分' else '最後方25%' if risk=='最後方25%' else '未確定')
        if risk=='後方半分':selected=b[b.band.isin(['後中50-75%','最後方25%'])]
        elif risk=='最後方25%':selected=b[b.band=='最後方25%']
        else:selected=b.iloc[:0]
        selected_stats=group_metrics(selected)
        course_rows.append({'course':prof,'venue':v,'surface':s,'distance':int(d),
                            'races_train':int(a.rid.nunique()),'races_test':int(b.rid.nunique()),
                            'risky_from_H013_train_only':risk_zone,'risk_test':selected_stats,
                            'risk_test_low_sample':int(len(selected)<50),'zones':zones})
    matched=[]
    # Same venue & exact distance turf-vs-dirt isolates distance to some degree.
    vc={(v,int(d)) for v,d in zip(t.venue,t.distance)}
    for v,d in sorted(vc):
        a=t[(t.venue==v)&(t.distance==d)&(t.surface=='芝')&(t.band=='最後方25%')]
        b=t[(t.venue==v)&(t.distance==d)&(t.surface=='ダ')&(t.band=='最後方25%')]
        if len(a)==0 or len(b)==0:continue
        ar=group_metrics(a);br=group_metrics(b)
        matched.append({'venue':v,'distance':d,'turf':ar,'dirt':br,'turf_minus_dirt_rate_pp':round(ar['rate_pct']-br['rate_pct'],2),
                        'ci95_pp':paired_surface_ci(a,b),
                        'usable_both_10plus_races':bool(ar['races']>=10 and br['races']>=10)})
    comparisons=[]
    for v in sorted(t.venue.unique()):
      for label,locs in [('last25',lambda x:x.band=='最後方25%'),('back50',lambda x:x.band.isin(['後中50-75%','最後方25%']))]:
        a=t[(t.venue==v)&(t.surface=='芝') & locs(t)]
        b=t[(t.venue==v)&(t.surface=='ダ') & locs(t)]
        if len(a)==0 or len(b)==0:continue
        ar=group_metrics(a);br=group_metrics(b)
        comparisons.append({'venue':v,'zone':label,'turf':ar,'dirt':br,'difference_turf_minus_dirt_pp':round(ar['rate_pct']-br['rate_pct'],2),
                            'ci95_pp':paired_surface_ci(a,b),'caution':'距離構成差あり、同条件の芝ダ因果差ではない'})
    # As-of screen from H013 is horse-level PRIVATE; aggregate publicly without horse/race ID.
    flag_rows=[]
    with (H13/'H013_危険馬_過去検証_PRIVATE.csv').open(encoding='utf-8-sig',newline='') as f:
        for x in csv.DictReader(f):
            ma=re.fullmatch(r'(.+?)(芝|ダ)(\d+)m',x['コース'])
            if not ma:raise AssertionError('bad course '+x['コース'])
            flag_rows.append({'venue':ma.group(1),'surface':ma.group(2),'course':x['コース'],
                              'rid':x['レースID'],'top3':int(x['実際の3着内※事後評価']),
                              'q':float(x['最終市場基準3着内確率※後付比較'])})
    assert len(flag_rows)==598 and sum(x['top3'] for x in flag_rows)==61
    flagdf=pd.DataFrame(flag_rows)
    screen=[]
    for v in sorted(hf.venue.unique()):
      for s in ['芝','ダ']:
        z=flagdf[(flagdf.venue==v)&(flagdf.surface==s)]
        summary=group_metrics(z) if len(z) else {'races':0,'horses':0,'top3':0,'rate_pct':None,'market_expected':0.0,'actual_over_market':None}
        screen.append({'venue':v,'surface':s,'summary':summary,'n_courses':int(z.course.nunique())})
    assert sum(x['summary']['horses'] for x in screen)==598
    # Check exact consistency with source H013 disjoint band cells
    old_bands=pd.read_csv(H13/'H013_87コース_4角4位置帯_過去と後期の比較.csv')
    for r in course_rows:
      src=old_bands[old_bands['コース']==r['course']]
      for z in r['zones']:
        chk=src[src['4角順位帯']==z['band']]
        assert len(chk)==1,(r['course'],z['band'])
        assert z['test']['horses']==int(chk['後期馬数'].iloc[0])
        assert z['test']['top3']==int(chk['後期3着内頭数'].iloc[0])
    assert len(course_rows)==87 and len(outrows)==80
    risk_courses=[r for r in course_rows if r['risky_from_H013_train_only']!='未確定']
    n=len(risk_courses);expected=0
    for r in risk_courses: expected+=r['risk_test']['market_expected']
    result={'title':'H016 track × surface × distance × 4C band retrospective risk audit',
     'cohort':{'all_races':3566,'all_horses':54383,'evaluation_races':990,'evaluation_horses':15089,
               'train_ends':2023,'eval_period':'2024-01 to 2026-10-04','4c_normalized_bins':BANDS},
     'cautions':['Current 4C position is observed only after the race; cannot use this result to automatically remove a horse before start.',
                 'Course-level danger category is frozen from H013 2016-23, not tuned to 2024-26.',
                 'Closing odds PL probability is retrospective market reference, not bettable quote.',
                 'Same venue turf vs dirt comparisons include different distances, race conditions and field composition.',
                 'Prior studies repeatedly examined evaluation years, thus these are historical exploration, not independent future validation.'],
     'venues_surfaces':outrows,'courses':course_rows,'h013_asof_screen_surface':screen,'matched_same_venue_distance_turf_dirt':matched,'venue_surface_comparisons':comparisons,
     'source_H013_risk_course_count':n,'source_H013_risk_evaluation_aggregate':{'n':sum(x['risk_test']['horses'] for x in risk_courses),'k':sum(x['risk_test']['top3'] for x in risk_courses),'q_approx':round(expected,1)}}
    (OUT/'H016_surface_zone_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    # Public report-friendly aggregates in UTF-8 w/BOM; no personal race or horse identifiers
    vrows=[]
    for r in outrows:
        vrows.append({'競馬場':r['venue'],'芝ダート':r['surface'],'4角位置帯':r['band'],
                      '学習該当馬':r['train']['horses'],'学習3着内率%':r['train']['rate_pct'],'学習市場比率':r['train']['actual_over_market'],
                      '検証該当馬':r['test']['horses'],'検証3着内':r['test']['top3'],'検証3着内率%':r['test']['rate_pct'],
                      '検証市場比率':r['test']['actual_over_market'],
                      '検証3着内率CI下限%':r['test_ci95_pct'][0],'検証3着内率CI上限%':r['test_ci95_pct'][1]})
    pd.DataFrame(vrows).to_csv(OUT/'全国10競馬場_芝ダ別_4角4位置帯.csv',index=False,encoding='utf-8-sig')
    crows=[]
    for r in course_rows:
        for z in r['zones']:
            crows.append({'コース':r['course'],'競馬場':r['venue'],'芝ダート':r['surface'],'距離m':r['distance'],
                           '学習レース数':r['races_train'],'検証レース数':r['races_test'],'H013学習のみ危険帯':r['risky_from_H013_train_only'],
                           '位置帯':z['band'],'学習該当馬数':z['train']['horses'],'学習3着内率%':z['train']['rate_pct'],
                           '検証該当馬数':z['test']['horses'],'検証3着内頭数':z['test']['top3'],'検証3着内率%':z['test']['rate_pct'],
                           '検証市場比率':z['test']['actual_over_market'],
                           '検証3着内率CI下限%':z['test_ci95_pct'][0],'検証3着内率CI上限%':z['test_ci95_pct'][1]})
    pd.DataFrame(crows).to_csv(OUT/'全国87コース_芝ダ距離別_4角危険帯.csv',index=False,encoding='utf-8-sig')
    pd.DataFrame([{'競馬場':r['venue'],'芝ダート':r['surface'],'危険候補頭数':r['summary']['horses'],
        '危険候補3着内':r['summary']['top3'],'危険候補3着内率%':r['summary']['rate_pct'],
        '市場期待3着内頭数※事後':r['summary']['market_expected'],'該当危険コース数':r['n_courses']}
        for r in screen]).to_csv(OUT/'H013予測危険候補_競馬場芝ダ別の実績.csv',index=False,encoding='utf-8-sig')
    pd.DataFrame([{**{'競馬場':r['venue'],'距離m':r['distance'],'芝−ダ_3着内率差pp':r['turf_minus_dirt_rate_pp'],
                      '芝−ダ_CI下限pp':r['ci95_pp'][0],'芝−ダ_CI上限pp':r['ci95_pp'][1],'10R以上両方':r['usable_both_10plus_races']},
                  **{'芝該当馬数':r['turf']['horses'],'芝3着内率%':r['turf']['rate_pct'],'ダ該当馬数':r['dirt']['horses'],'ダ3着内率%':r['dirt']['rate_pct']}} for r in matched]).to_csv(OUT/'同場同距離_芝ダ_最後方25比較.csv',index=False,encoding='utf-8-sig')
    print(json.dumps({'courses':len(course_rows),'venue_surf_pos_rows':len(outrows),'matched_surface_pairs':len(matched),
       'risk_c':n,'risk_n':sum(x['risk_test']['horses'] for x in risk_courses),
       'sample_venue':[{x:y for x,y in r.items() if x!='zones'} for r in course_rows if r['course'] in ['東京芝1600m','中山芝1600m','中山ダ1800m']]},ensure_ascii=False,indent=2))
    return result
if __name__=='__main__':compute()