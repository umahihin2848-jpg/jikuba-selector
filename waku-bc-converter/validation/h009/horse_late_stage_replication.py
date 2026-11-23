"""Sensitivity only: historical private umadete course-specific own closing3F vs same-race fastest and 3C/4C/finish rank change. Not certified individual 200m splits."""
import pandas as pd,numpy as np,json
from pathlib import Path
p=Path('/mnt/data/umadete.csv')
cols=['馬名','日付','レースID(新・馬番無16桁)','芝・ダート','距離','場所','異常コード','出走頭数','確定着順','人気','上り3F','R最速上3F','通過3','通過4']
d=pd.read_csv(p,encoding='cp932',usecols=cols,low_memory=False,dtype=str).fillna('')
d=d[(d['場所'].isin(['東京','中山']))&(d['芝・ダート']=='芝')&(d['距離'].isin(['1600','1800','2000']))].copy()
d['horse']=d['馬名'].str.replace(' ','',regex=False).str.replace('　','',regex=False)
d['rid']=d['レースID(新・馬番無16桁)'].str.strip()
# Date must match 16-digit ID, and calendar must be valid.
parts=d['日付'].str.extract(r'^\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})\s*$')
keys=parts[0].fillna('')+parts[1].fillna('').str.zfill(2)+parts[2].fillna('').str.zfill(2)
d=d[d['rid'].str.fullmatch(r'\d{16}') & d['rid'].str[:8].eq(keys)].copy()
d=d.drop_duplicates(['horse','rid'],keep='first');d=d[d['異常コード'].isin(['','0'])]
for c in ['出走頭数','確定着順','人気','上り3F','R最速上3F','通過3','通過4']:
 d[c]=pd.to_numeric(d[c],errors='coerce')
d=d[d['出走頭数'].between(5,20) & d['確定着順'].between(1,20)].copy()
d['finish_response']=(d['出走頭数']-d['確定着順'])/(d['出走頭数']-1)
d['market_residual']=(d['人気']-d['確定着順'])/(d['出走頭数']-1)
d['late_relative']=d['R最速上3F']-d['上り3F']
d.loc[~d['late_relative'].between(-10,0.5),'late_relative']=np.nan
d['c4_to_fin']=(d['通過4']-d['確定着順'])/(d['出走頭数']-1)
d.loc[~d['通過4'].between(1,20),'c4_to_fin']=np.nan
d['date']=pd.to_numeric(d['rid'].str[:8],errors='coerce').astype(int)
results={}
for feature in ['finish_response','market_residual','late_relative','c4_to_fin']:
 pairs=[]; counts={}
 for (horse,dist),grp in d.groupby(['horse','距離']):
  t=grp[grp['場所']=='東京'].sort_values('date')[feature].dropna().to_numpy()
  n=grp[grp['場所']=='中山'].sort_values('date')[feature].dropna().to_numpy()
  if len(t)<2 or len(n)<2:continue
  pairs.append([float(t[0]-n[0]),float(t[-1]-n[-1])]);counts[str(dist)]=counts.get(str(dist),0)+1
 v=np.asarray(pairs)
 correlation=float(np.corrcoef(v.T)[0,1]);notzero=np.prod(v!=0,axis=1).astype(bool)
 rng=np.random.default_rng(20261123)
 boots=[]
 for _ in range(2500):
  x=v[rng.integers(0,len(v),len(v))];boots.append(np.corrcoef(x.T)[0,1])
 results[feature]={'pairs':len(v),'dist_pairs':counts,'first_last_venue_diff_correlation':correlation,'CI95':np.quantile(boots,[.025,.975]).tolist(), 'same_sign_nonzero':float(np.mean(np.sign(v[notzero,0])==np.sign(v[notzero,1]))),'nonzero':int(sum(notzero))}
 print(feature,results[feature])
Path('/mnt/data/h009_tokyo_nakayama_20261123/H009_INDIVIDUAL_STAGE_REPLICATION.json').write_text(json.dumps({'source':'umadete.csv CP932, 2026 active-horse history (selection bias), all historical classes, strict unique as-of race date sanity','valid_starts':len(d),'results':results},ensure_ascii=False,indent=2),encoding='utf-8')