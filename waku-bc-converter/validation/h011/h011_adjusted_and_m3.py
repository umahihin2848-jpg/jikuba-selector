"""Additional stage diagnostics; actual 4C is POST-RACE, never a predictive input.
Not a demonstration of horse-aptitude predictability or JRA payout ROI.
"""
import os,sys,pathlib,math,json,collections
import numpy as np,pandas as pd
ROOT=pathlib.Path('/mnt/data');OUT=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(OUT));sys.path.insert(0,str(ROOT/'h009_tokyo_nakayama_20261123'))
import h009_venue_specificity as H
# Since H011 stage audit is a standalone script with raw extraction, import to reuse prechecked dataframe
import h011_stage_audit as A
allrows=A.df.copy()
# closing odds market surrogate, NOT betting-time quotes; re-use same H002 calibrated alpha
pred={}
for rid,group in allrows.groupby('rid',sort=False):
 q=H.pl_top3(group.odds.to_numpy(dtype=float));q=3/len(group)+.8226462628846603*(q-3/len(group))
 for no,pr in zip(group.no,q):pred[(rid,no)]=pr
allrows['market_p3']=np.asarray([pred[(r.rid,r.no)] for r in allrows.itertuples(index=False)])
rows=[]
for rid,g in allrows.groupby('rid'):
 r=g.iloc[0];back=g[g.c4_bucket=='back_half']
 rows.append({'rid':rid,'year':r.year,'venue':r.venue,'dist':r.dist,'n':r.n,
              'top3_from_back':int(back.top3.sum()),'expected_top3_from_back':float(back.market_p3.sum()),
              'back_residual_per_race':float((back.top3.sum()-back.market_p3.sum())/3),
              'back_top3_share':float(back.top3.sum()/3),'back_field_fraction':float(len(back)/len(g)),
              'missed_back_pop_le4':int(((back.top3==1)&(back['pop']<=4)).sum()),
              'back_popularity_mean':float(back['pop'].mean()) if len(back) else np.nan})
r=pd.DataFrame(rows)
print('\nODDS ADJUSTED')
print(r.groupby(['dist','venue']).agg(races=('rid','size'),back_top3=('back_top3_share','mean'),exp_back_top3=('expected_top3_from_back',lambda x:x.mean()/3),excess_back_top3=('back_residual_per_race','mean'),half_field=('back_field_fraction','mean')).to_string())
# bootstrap venue DIFFERENCE of odds-adjusted back-stage residual, race cluster
rng=np.random.default_rng(271828);out={}
for dist in [1600,1800,2000]:
 a=r[(r.dist==dist)&(r.venue=='東京')];b=r[(r.dist==dist)&(r.venue=='中山')]
 ta=a.back_residual_per_race.to_numpy();nb=b.back_residual_per_race.to_numpy()
 v1=ta[rng.integers(0,len(ta),(8000,len(ta)))].mean(axis=1)
 v2=nb[rng.integers(0,len(nb),(8000,len(nb)))].mean(axis=1)
 out[str(dist)]={'tokyo_observed_back_pct':round(100*a.back_top3_share.mean(),3),'nakayama_observed_back_pct':round(100*b.back_top3_share.mean(),3),
  'tokyo_market_expected_back_pct':round(100*a.expected_top3_from_back.mean()/3,3),'nakayama_market_expected_back_pct':round(100*b.expected_top3_from_back.mean()/3,3),
 'venue_excess_diff_pp':round(100*(ta.mean()-nb.mean()),3),'venue_excess_ci95_pp':(100*np.quantile(v1-v2,[.025,.975])).round(3).tolist(),
  'n_tokyo':len(a),'n_nakayama':len(b)}
print('excess venue',json.dumps(out,ensure_ascii=False,indent=2))
# actual back top3 shares for different periods as robustness
print('PERIODS')
r['period']=np.where(r.year<=2020,'2016-20','2021-26')
print(r.groupby(['dist','venue','period']).agg(n=('rid','size'),observed_back=('back_top3_share','mean'),excess=('back_residual_per_race','mean')).to_string())
r.to_csv(OUT/'H011_オッズ基準4角診断.csv',encoding='utf-8-sig',index=False)
# H005 M3 shadow: observed M3 false negatives and their actual 4C position;2024-2026 vs raw result.
m3=pd.read_csv(ROOT/'h005_depth_to_m3_20261123'/'h005_horse_comparison_PRIVATE.csv');m3=m3[(m3.surface=='芝')&(m3.distance.isin([1600,1800,2000]))]
# score lower -> better, independent of target result; all5decay as historical shadow
m3=m3.assign(m3_rank=m3.groupby('rid')['score_all5_decay'].rank(method='first',ascending=True))
cm=m3.merge(allrows[['rid','no','venue','c4_bucket','fin','pop']],on=['rid','no'],how='inner',suffixes=('','_actual'))
# group only fully overlapping 4C  race same exact sample, avoiding partial cards
cm=cm.groupby('rid').filter(lambda g:len(g)>=12 and len(g)==g.no.nunique())
cm['actual_top3']=cm.fin_actual<=3
cm['pred_top3']=cm.m3_rank<=3
m3st=[]
for (venue,dist),v in cm.groupby(['venue','distance']):
 for bucket in ('front_half','back_half'):
  p=v[(v.c4_bucket==bucket)&v.actual_top3];m3st.append({'venue':venue,'dist':dist,'actual_stage':bucket,'actual_top3':len(p),'m3_captured':int(p.pred_top3.sum()),'capture_rate':float(p.pred_top3.mean()) if len(p) else np.nan,'races':v.rid.nunique()})
m3s=pd.DataFrame(m3st);m3s.to_csv(OUT/'H011_M3見逃し4角位置診断.csv',encoding='utf-8-sig',index=False)
print('M3 DIAG\n',m3s.to_string(index=False))
(OUT/'H011_market_adjusted.json').write_text(json.dumps({'stage_market_excess':out,'year_groups':r.groupby(['dist','venue','period']).agg(n=('rid','size'),observed_back=('back_top3_share','mean'),excess=('back_residual_per_race','mean')).reset_index().to_dict('records'),'m3_stage':m3st},ensure_ascii=False,indent=2,default=lambda x: x.item() if isinstance(x,np.generic) else str(x)),encoding='utf8')