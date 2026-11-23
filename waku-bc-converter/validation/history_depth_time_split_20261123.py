import numpy as np,pandas as pd,os
from pathlib import Path
p=Path(os.environ.get('RACE_STUDY_DIR','/mnt/data/history_depth_study_20261123'));d=pd.read_csv(p/'horse_predictions_private.csv',low_memory=False)
rows=[]
for metric in ['first','c4','gap']:
 a=d[(d[f'available_{metric}']>=10)].dropna(subset=[metric,f'{metric}_mean5',f'{metric}_mean10',f'{metric}_decay5',f'{metric}_decay10']).copy()
 # last 5, positions 6-10 have averages => full10 mean=(recent5+old5)/2.
 a['old_mean']=2*a[f'{metric}_mean10']-a[f'{metric}_mean5']
 train=a[a.year==2024]; test=a[a.year>=2025]
 alphas=np.linspace(.0,1.0,21)
 train_metrics=[]
 for alpha in alphas:
  pred=alpha*train[f'{metric}_mean5']+(1-alpha)*train.old_mean
  train_metrics.append(np.mean(np.abs(pred-train[metric])))
 alpha=float(alphas[np.argmin(train_metrics)])
 print('METRIC',metric,'train alpha',alpha,'training MAE',min(train_metrics))
 for group,b in [('train2024',train),('test2025',test[test.year==2025]),('test2026',test[test.year==2026]),('test2526',test)]:
  for method,pred in [('five_mean',b[f'{metric}_mean5']),('ten_mean',b[f'{metric}_mean10']),('five_decay80',b[f'{metric}_decay5']),('ten_decay80',b[f'{metric}_decay10']),('train_alpha_blend',alpha*b[f'{metric}_mean5']+(1-alpha)*b.old_mean)]:
   errs=abs(pred-b[metric]);m=pd.DataFrame({'rid':b.rid,'e':errs}).groupby('rid').e.mean()
   rows.append(dict(metric=metric,group=group,method=method,trainingAlpha=alpha,horseCount=len(b),raceCount=len(m),horseMAE=errs.mean(),raceMAE=m.mean()))
res=pd.DataFrame(rows);res.to_csv(p/'train2024_fixed_weight_test2526.csv',index=False,encoding='utf-8-sig');print(res.query('group=="test2526"').to_string(index=False))