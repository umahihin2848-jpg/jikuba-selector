"""Pair same horse/race, compare 5/10 starts, time-decay, and course-distance match.
Exploratory 2024-26 (previously researched); not production or market betting proof.
"""
import pandas as pd,numpy as np,collections,json,os
from pathlib import Path
p=Path(os.environ.get('RACE_STUDY_DIR','/mnt/data/history_depth_study_20261123'))
a=pd.read_csv(p/'horse_predictions_private.csv',low_memory=False)
rows=[]
for year in ['2024','2025','2026','2025_2026']:
 for surf in ['all','芝','ダ']:
  d=a[(a.year==int(year)) if year!='2025_2026' else (a.year>=2025)]
  if surf!='all':d=d[d.surface==surf]
  for metric in ['first','c4','gap']:
   d0=d[d[f'available_{metric}']>=10].dropna(subset=[metric,f'{metric}_mean5',f'{metric}_decay5',f'{metric}_mean10',f'{metric}_decay10']).copy()
   if len(d0)<20:continue
   for left,right,tag in [('mean5','mean10','5mean_minus_10mean'),('mean5','decay10','5mean_minus_10decay'),('decay5','decay10','5decay_minus_10decay'),('mean5','mean8','5mean_minus_8mean'),('mean5','decay8','5mean_minus_8decay')]:
    errs=pd.DataFrame({'rid':d0.rid,'a':(d0[f'{metric}_{left}']-d0[metric]).abs(),'b':(d0[f'{metric}_{right}']-d0[metric]).abs()});b=errs.groupby('rid')[['a','b']].mean().to_numpy()
    rng=np.random.default_rng(20261123);n_boot=6000
    ix=rng.integers(0,len(b),(n_boot,len(b)))
    boot=(b[ix,0]-b[ix,1]).mean(axis=1)
    rows.append(dict(year=year,surface=surf,metric=metric,compare=tag,horses=len(d0),races=len(b),a_mae=b[:,0].mean(),b_mae=b[:,1].mean(),improvement=(b[:,0]-b[:,1]).mean(),lo=np.quantile(boot,.025),hi=np.quantile(boot,.975)))
res=pd.DataFrame(rows).round(6)
res.to_csv(p/'isolated_history_gain_race_bootstrap.csv',index=False,encoding='utf-8-sig')
print('2025-26 all')
print(res.query('year=="2025_2026" and surface=="all"').to_string(index=False))
print('2026 all')
print(res.query('year=="2026" and surface=="all"').to_string(index=False))
print('2025-26 by surface')
print(res.query('year=="2025_2026" and surface!="all" and compare=="5decay_minus_10decay"').to_string(index=False))