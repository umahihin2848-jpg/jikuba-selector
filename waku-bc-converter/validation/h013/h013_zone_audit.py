#!/usr/bin/env python3
"""Observed-position, train/test split 4C risk zone diagnostics, not as-of candidate screening."""
from pathlib import Path
import json,sys
import numpy as np
import pandas as pd
ROOT=Path('/mnt/data');OUT=ROOT/'H013_全国4角危険位置_20261123';sys.path.insert(0,str(OUT))
from h013_position_risk import make_models

def run():
    df,_,_=make_models(); train=df[df.year<=2023]; test=df[df.year>=2024]
    rows=[]
    for (p,b),gg in train.groupby(['profile','band'],observed=True):
        g=test[(test.profile==p)&(test.band==b)]
        r=gg.rid.nunique();n=len(gg);k=int(gg.top3.sum());q=float(gg.q.sum());
        N=len(g);K=int(g.top3.sum());Q=float(g.q.sum())
        rows.append({'コース':p,'4角順位帯':b,'学習レース数':r,'学習馬数':n,'学習3着内頭数':k,'学習3着内率%':round(100*k/n,2) if n else None,
                     '学習市場期待3着内頭数':round(q,2),'学習市場比率':round(k/q,3) if q else None,'事前期間に固定した縮小市場比率':round((k+15)/(q+15),3),
                     '診断信頼度':'一定' if r>=30 and n>=100 else '参考' if r>=15 and n>=40 else '少数',
                     '後期レース数':g.rid.nunique(),'後期馬数':N,'後期3着内頭数':K,'後期3着内率%':round(100*K/N,2) if N else None,'後期市場期待頭数':round(Q,2),
                     '後期市場比率':round(K/Q,3) if Q else None})
    z=pd.DataFrame(rows)
    # coarse position threshold: training only, hard criteria, no post-2023 adaptive selection
    criteria=[]
    for p,gg in z.groupby('コース'):
        rev=gg.set_index('4角順位帯')
        last=rev.loc['最後方25%'] if '最後方25%' in rev.index else None
        half=df[(df.profile==p)&(df.year<=2023)&(df.target_back4==1)]
        n=len(half);n_r=half.rid.nunique();k=int(half.top3.sum());q=float(half.q.sum())
        severe_half = n_r>=30 and n>=100 and (k+15)/(q+15)<=.8 and k/n<=.125
        severe_last = last is not None and last['学習レース数']>=30 and last['学習馬数']>=60 and last['事前期間に固定した縮小市場比率']<=.8 and last['学習3着内率%']<=7.5
        # if half severe, distinguish the harder 50% cutoff from trailing25%
        if severe_half:status='4角後方半分（16頭なら9番手以降）';mode='後方半分'
        elif severe_last:status='4角最後方25%（16頭なら13番手以降）';mode='最後方25%'
        else:status='明確な危険位置帯は未確定';mode='未確定'
        g=df[(df.profile==p)&(df.year>=2024)]
        if mode=='後方半分':sub=g[g.target_back4==1]
        elif mode=='最後方25%':sub=g[g.band=='最後方25%']
        else:sub=g.iloc[:0]
        criteria.append({'コース':p,'危険開始位置の目安':status,'採用区分':mode,'学習レース数':n_r,'学習後方馬数':n,'学習後方3着内率%':round(100*k/n,2) if n else None,'学習後方市場比率（縮小）':round((k+15)/(q+15),3),
                         '後期該当馬':len(sub),'後期3着内':int(sub.top3.sum()),'後期3着内率%':round(100*sub.top3.mean(),2) if len(sub) else None,'後期市場期待3着内':round(float(sub.q.sum()),2),
                         '後期市場比率':round(float(sub.top3.sum()/sub.q.sum()),3) if sub.q.sum() else None})
    c=pd.DataFrame(criteria).sort_values(['採用区分','コース']);z=z.sort_values(['コース','4角順位帯'])
    z.to_csv(OUT/'H013_87コース_4角4位置帯_過去と後期の比較.csv',index=False,encoding='utf-8-sig')
    c.to_csv(OUT/'H013_87コース_位置どり危険開始ライン.csv',index=False,encoding='utf-8-sig')
    print('Zones',z.shape,'courses',c.shape,'status',c.採用区分.value_counts().to_dict())
    print('severe half:',c[c.採用区分=='後方半分'][['コース','学習後方3着内率%','学習後方市場比率（縮小）','後期3着内率%','後期市場比率']].to_string(index=False))
    print('severe last:',c[c.採用区分=='最後方25%'][['コース','学習後方3着内率%','学習後方市場比率（縮小）','後期3着内率%','後期市場比率']].to_string(index=False))
    (OUT/'H013_位置帯サマリー.json').write_text(json.dumps({'n_4band_rows':len(z),'n_courses':len(c),'classification_counts':c.採用区分.value_counts().to_dict()},ensure_ascii=False,indent=2))
    return z,c
if __name__=='__main__':run()