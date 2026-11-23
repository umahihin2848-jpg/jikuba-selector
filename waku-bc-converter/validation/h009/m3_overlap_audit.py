import pandas as pd, numpy as np, json
from pathlib import Path
out=Path('/mnt/data/h009_tokyo_nakayama_20261123')
e=pd.read_csv('/mnt/data/h008e_individual_response_20261123/H008E_HORSE_INDEX_PRIVATE.csv',encoding='utf-8-sig')
m=pd.read_csv('/mnt/data/h005_depth_to_m3_20261123/h005_horse_comparison_PRIVATE.csv',encoding='utf-8-sig')
a=e.merge(m[['rid','no','score_all5_decay','pg_all5_decay']].rename(columns={'rid':'race_id','no':'horse_no'}),on=['race_id','horse_no'],how='inner',validate='one_to_one')
if len(a)!=8454:raise AssertionError('H008-E/H005 horse cards not identical')
for k in ['score_all5_decay','late_response_generic','late_response_lap_fit']:
 a[k+'_demeaned']=a[k]-a.groupby('race_id')[k].transform('mean')
res={'races':int(a.race_id.nunique()),'horses':int(len(a)),
'generic_own_response_vs_m3_within_race_pearson':float(a['late_response_generic_demeaned'].corr(a['score_all5_decay_demeaned'])),
'lap_conditioned_increment_vs_m3_within_race_pearson':float(a['late_response_lap_fit_demeaned'].corr(a['score_all5_decay_demeaned'])),
'generic_signal_SD':float(a['late_response_generic'].std()),
'conditional_signal_SD':float(a['late_response_lap_fit'].std()),
'note':'M3 lower is better, own response higher better. Correlation is redundancy evidence, not causal attribution of M3 features or incremental performance proof.'}
(out/'H009_M3_OVERLAP.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
print(res)