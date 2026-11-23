"""Post-race race-lap × actual 4C-to-finish stage diagnostic.
Exact race identity via date + venue + TARGET race name + race number; no fantasy exact horse sectionals.
This uses current race actual laps and current 4C deliberately AFTER THE FACT; never as predictor.
"""
from __future__ import annotations
import pathlib,sys,csv,collections,json,numpy as np,pandas as pd
ROOT=pathlib.Path('/mnt/data');O=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(ROOT/'H008C_全国全コースラップ分析_20261123'));import analyze_all_courses as L
# stage observed race keys from prevalidated 479 clean full-card races
q=pd.read_csv(O/'H011_オッズ基準4角診断.csv');target=set(q.rid)
record={};bad=set()
for fn in L.SRC_RESULTS:
 with fn.open(encoding='cp932',newline='') as f:
  for row in csv.DictReader(f):
   try:dt=L.dt_result(row)
   except:continue
   rid=f'{dt}_{row["場所"]}_{int(row["レース番号"]):02d}'
   if rid not in target:continue
   key=(dt,row['場所'],row['レース名']); old=record.get(key)
   if old is None:record[key]={'rid':rid,'distance':int(row['距離']),'surface':row['芝・ダ'],'coursecode':row['コースコード'],'going':row['馬場状態']}
   elif old['rid']!=rid:bad.add(key)
laps={};duplicate=set();issues=collections.Counter()
with L.SRC_LAP.open(encoding='cp932',newline='') as f:
 for row in csv.DictReader(f):
  try:
   dt=L.dt_lap(row['日付']);import re
   x=re.search('[札函福新東中名京阪小]',row['開催']);ven=L.VENUE_MAP[x.group()] if x else None
  except:continue
  k=(dt,ven,row['レース名'])
  if k not in record or k in bad:continue
  rec=record[k]
  if rec['rid'] in laps:duplicate.add(rec['rid']);continue
  s,reason=L.splits_for_distance(row['ラップタイム'],rec['distance'])
  if reason:issues[reason]+=1;continue
  a=L.analyze_splits(s,rec['distance'])
  laps[rec['rid']]={'rid':rec['rid'],'going':rec['going'],'coursecode':rec['coursecode'],
    'lull':a['lull'],'lull_index':a['lull_index'],'accel':a['accel'],'finale':a['fatigue'],'early_late':a['early_late'],'late':a['late']}
for rid in duplicate:laps.pop(rid,None)
joined=q.merge(pd.DataFrame(laps.values()),on='rid',how='inner',validate='one_to_one')
print('Joined lap-to-clean-stage',len(joined),'of',len(q),'duplicate',len(duplicate),'badnames',len(bad),'issues',dict(issues))
joined.to_csv(O/'H011_実測全ラップと4角位置の連結.csv',encoding='utf-8-sig',index=False)
print('LULL by venue/dist (rates back top3):')
print(joined.groupby(['dist','venue','lull'],dropna=False).agg(races=('rid','count'),backshare=('back_top3_share','mean'),excess=('back_residual_per_race','mean')).to_string())
# compare visible two-track course difference within races with NO mid-lull, as most Nak 1800 is such
res=[]; rng=np.random.default_rng(114514)
for dist in (1600,1800,2000):
 for filt,label in [(joined.lull==0,'no_mid_lull'),(joined.lull==1,'mid_lull'),(joined.going=='良','good_going')]:
  a=joined[(joined.dist==dist)&(joined.venue=='東京')&filt]
  b=joined[(joined.dist==dist)&(joined.venue=='中山')&filt]
  if len(a)<8 or len(b)<8:continue
  xx=a.back_top3_share.to_numpy();yy=b.back_top3_share.to_numpy()
  boot=xx[rng.integers(len(xx),size=(5000,len(xx)))].mean(axis=1)-yy[rng.integers(len(yy),size=(5000,len(yy)))].mean(axis=1)
  res.append({'distance':dist,'subgroup':label,'tokyo_races':len(a),'nakayama_races':len(b),'tokyo_backshare':float(xx.mean()),'nakayama_backshare':float(yy.mean()),'difference':float(xx.mean()-yy.mean()),'ci95':np.quantile(boot,[.025,.975]).tolist()})
print(json.dumps(res,ensure_ascii=False,indent=2))
(O/'H011_lap_stage_diagnostics.json').write_text(json.dumps({'matched_lap_races':len(joined),'total_clean_stage_races':len(q),'by_lull':joined.groupby(['dist','venue','lull'],dropna=False).agg(races=('rid','count'),backshare=('back_top3_share','mean'),excess=('back_residual_per_race','mean')).reset_index().to_dict('records'),'robustness':res,'prohibition':'Current race recorded lap and 4C both POSTRACE diagnostics, never feed into pre-race predictions'},ensure_ascii=False,indent=2),encoding='utf8')