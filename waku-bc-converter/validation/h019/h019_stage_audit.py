import numpy as np,pandas as pd,json,pathlib
DIR=pathlib.Path(__file__).parent
f=pd.read_csv(DIR/'H019_H018_203_cohort_POSTRACE_PRIVATE.csv',encoding='utf-8-sig')
allrace=pd.read_csv(DIR/'H019_test_horses_PRIVATE.csv',encoding='utf-8-sig')
# The 2025-26 test file alone cannot define full 2024 race-fastest, so use original strict 2024-26 result files.
raw=[]
for path in ['/mnt/data/2026_2025_seiseki.csv','/mnt/data/2026seiseki.csv']:
 r=pd.read_csv(path,encoding='cp932',usecols=['年','月','日','場所','レース番号','上がり3Fタイム','馬番']);r['rid']=(20000000+r.年.astype(int)*10000+r.月.astype(int)*100+r.日.astype(int)).astype(str)+'_'+r['場所'].str.strip()+'_'+r['レース番号'].astype(str).str.zfill(2)
 raw.append(r)
r=pd.concat(raw,ignore_index=True);r['no']=r['馬番'].astype(int)
r['last3']=pd.to_numeric(r['上がり3Fタイム'],errors='coerce');r.loc[~r.last3.between(25,60),'last3']=np.nan
s=r.groupby('rid')['last3'].min().rename('fastest3')
f=f.merge(s,on='rid',validate='many_to_one')
f['last3gap']=f['上がり3Fタイム']-f.fastest3
f['c4_rear']=f.c4f>.5
f['actual_push_rear_to_front']=f.c3back&(~f.c4back)
# rear at C4 group: within race, relative 3F gap of actual top3 vs failed
stats={}
for typ,g in f.groupby('trajectory'):
 stats[typ]={'n':len(g),'top3':int(g.top3.sum()),'market_exp':float(g.q.sum()),'avg_late3_gap':float(g.last3gap.mean()),'top3_mean_late3_gap':float(g.loc[g.top3.eq(1),'last3gap'].mean()) if g.top3.sum()>0 else None}
# 203 cohort expectation bootstrap at race level, not horse iid
byrace=f.assign(diff=f.top3-f.q).groupby('rid').agg(n=('top3','size'),actual=('top3','sum'),expect=('q','sum'),diff=('diff','sum'))
rng=np.random.default_rng(19024);z=byrace['diff'].to_numpy();b=z[rng.integers(0,len(z),size=(5000,len(z)))].sum(axis=1)
stats['H018_flag_market_gap']={'actual':int(f.top3.sum()),'expected':float(f.q.sum()),'actual_minus_expected':float(f.top3.sum()-f.q.sum()),'bootstrap_race95':np.quantile(b,[.025,.975]).tolist(),'races':int(len(byrace))}
# 3C->4C push2 risk cohort vs current odds to show surprise
for key,selector in [('actual_3c_to_4c_push2',f.c3c4_push2.astype(bool)),('actual_c4_rear',f.c4_rear),('observed_3c_rear_c4_front',f.actual_push_rear_to_front)]:
 g=f[selector];stats[key]={'n':len(g),'top3':int(g.top3.sum()),'market_expected':float(g.q.sum()),'late3f_to_racefastest_sec':float(g.last3gap.mean())}
(DIR/'H019_COARSE_AUDIT.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False,indent=2))