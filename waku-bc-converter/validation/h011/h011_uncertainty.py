import pandas as pd,numpy as np,json,pathlib
from sklearn.metrics import roc_auc_score
D=pathlib.Path('/mnt/data/H011_コース適性メカニズム診断_20261123')
d=pd.read_csv(D/'H011_過去走からの4角後方予測_v3_PRIVATE.csv');d=d[d.year>=2024]
# Race-average Brier difference, not wrongly independent horses
v=d.assign(delta=(d.actual_back4-d.gate_course_pback)**2-(d.actual_back4-d.p_back4_asof)**2).groupby('rid').delta.mean().to_numpy()
rng=np.random.default_rng(20261123);reps=12000
boot=v[rng.integers(0,len(v),(reps,len(v)))].mean(axis=1)
print('paired race Brier improvement',v.mean(),'CI',np.quantile(boot,[.025,.975]),'n',len(v))
# AUC bootstrap by cluster (1500 replicates), races may have different sizes
race_groups=[g[['actual_back4','p_back4_asof']].to_numpy() for _,g in d.groupby('rid')];auc=[]
for _ in range(1600):
 idx=rng.integers(0,len(race_groups),size=len(race_groups));x=np.vstack([race_groups[i] for i in idx]);auc.append(roc_auc_score(x[:,0],x[:,1]))
print('cluster auc',roc_auc_score(d.actual_back4,d.p_back4_asof),'CI',np.quantile(auc,[.025,.975]))
res={'test_races':len(v),'test_horses':len(d),'paired_brier_gain':float(v.mean()),'paired_race_bootstrap_ci95':np.quantile(boot,[.025,.975]).tolist(),
 'auc':float(roc_auc_score(d.actual_back4,d.p_back4_asof)),'race_cluster_auc_ci95':np.quantile(auc,[.025,.975]).tolist()}
(D/'H011_asof_uncertainty.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))