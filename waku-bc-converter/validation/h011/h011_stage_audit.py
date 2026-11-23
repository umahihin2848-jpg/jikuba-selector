import sys,collections,json,pathlib,math
import numpy as np,pandas as pd
ROOT=pathlib.Path('/mnt/data');OUT=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(ROOT/'h009_tokyo_nakayama_20261123'))
import h009_venue_specificity as H

def safe_int(x):
 try:
  z=int(str(x).strip());return z if z>0 else np.nan
 except:return np.nan

races, audit=H.load_data()
print('clean',audit)
# maintain original result entries with same exact race key for 4C stage lookup
rids={r['rid'] for r in races}
extra={}
for fp in H.SOURCE:
 for chunk in pd.read_csv(fp,encoding='cp932',usecols=['年','月','日','場所','レース番号','馬番','通過順1','通過順2','通過順3','通過順4','上がり3Fタイム','馬場状態','単勝オッズ'],chunksize=70000,low_memory=False):
  dt=pd.to_numeric(chunk['年'],errors='coerce').fillna(-1).astype(int)+2000
  md=pd.to_numeric(chunk['月'],errors='coerce').fillna(-1).astype(int)
  dd=pd.to_numeric(chunk['日'],errors='coerce').fillna(-1).astype(int)
  rn=pd.to_numeric(chunk['レース番号'],errors='coerce').fillna(-1).astype(int)
  chunk['rid']=dt.astype(str)+md.map(lambda x:f'{x:02d}')+dd.map(lambda x:f'{x:02d}')+'_'+chunk['場所']+'_'+rn.map(lambda x:f'{x:02d}')
  chunk=chunk[chunk['rid'].isin(rids)]
  for c in ['通過順1','通過順2','通過順3','通過順4','馬番','上がり3Fタイム']:
   chunk[c]=pd.to_numeric(chunk[c],errors='coerce')
  for rr in chunk.itertuples(index=False):
   k=(getattr(rr,'rid'),int(rr.馬番))
   if k not in extra:extra[k]={'c1':rr.通過順1,'c2':rr.通過順2,'c3':rr.通過順3,'c4':rr.通過順4,'last3f':rr._asdict().get('上がり3Fタイム'), 'going':rr.馬場状態}
# Note itertuples unicode fields sometimes named positional _ fields; use indexing safer for last3F later
for r in races:
 z=extra.get((r['rid'],r['no']),{})
 for c in ('c1','c2','c3','c4'):
  v=z.get(c,np.nan)
  r[c]=int(v) if pd.notna(v) and 1<=v<=r['n'] else np.nan
 r['c4_gain']=(r['c4']-r['fin'])/(r['n']-1) if np.isfinite(r['c4']) else np.nan
 r['c4_frontness']=(r['n']-r['c4'])/(r['n']-1) if np.isfinite(r['c4']) else np.nan
 r['c4_bucket']=('front_half' if r['c4']/r['n']<=.5 else 'back_half') if np.isfinite(r['c4']) else 'missing'
 r['top3']=int(r['fin']<=3)
df=pd.DataFrame(races)
# Labels: recorded 4C is after event begins, used for diagnostic *only*
tr=df[df.c4_bucket!='missing'].copy()
print('valid c4',len(tr),'by',tr.groupby(['venue','dist']).agg(races=('rid','nunique'),horses=('name','size')).to_string())
# race grouped distribution for different venues & distances
res=[]
for (dist,venue),g in tr.groupby(['dist','venue']):
 rcount=g.rid.nunique()
 for bucket in ('front_half','back_half'):
  sub=g[g.c4_bucket==bucket]
  # All observed top3; gives horse actual well-defined outcomes.
  res.append(dict(dist=dist,venue=venue,group=bucket,races=rcount,horses=len(sub),top3_horses=int(sub.top3.sum()),top3_rate=float(sub.top3.mean()),top3_share=float(sub.top3.sum()/(3*rcount)),mean_c4_gain=float(sub.c4_gain.mean()),mean_pop=float(sub['pop'].mean())))
print(pd.DataFrame(res).to_string(index=False))
pd.DataFrame(res).to_csv(OUT/'H011_コース別4角以降の分解.csv',encoding='utf-8-sig',index=False)
# Paired race-level fraction of top3 running back half (top3 0..3 / 3)
rb=[]
for rid,g in tr.groupby('rid'):
 c=g.iloc[0]
 rb.append({'rid':rid,'date':c.date,'year':c.year,'dist':c.dist,'venue':c.venue,'racesize':c.n,'back3_horses':int(((g.top3==1)&(g.c4_bucket=='back_half')).sum()),
   'back3_frac':float(((g.top3==1)&(g.c4_bucket=='back_half')).sum()/3),
   'back_rank_expected':float((g.c4_bucket=='back_half').mean()),
   'avg_closing_gain_top3':float(g[g.top3==1].c4_gain.mean()),
   'all_top3_c4_avg':float(g[g.top3==1].c4.mean())})
rf=pd.DataFrame(rb)
print('by race')
print(rf.groupby(['dist','venue']).agg(n=('rid','size'),back_top3=('back3_frac','mean'),avg_c4_top3=('all_top3_c4_avg','mean')).to_string())
rf.to_csv(OUT/'H011_レース別4角診断.csv',encoding='utf-8-sig',index=False)
# Compare equal distances, resample racing events
rng=np.random.default_rng(20261123);stats={}
for d in H.DIST:
 a=rf[(rf.dist==d)&(rf.venue=='東京')];b=rf[(rf.dist==d)&(rf.venue=='中山')]
 av=a.back3_frac.to_numpy();bv=b.back3_frac.to_numpy()
 if not len(av) or not len(bv):continue
 reps=7000;ba=av[rng.integers(0,len(av),(reps,len(av)))].mean(axis=1);bb=bv[rng.integers(0,len(bv),(reps,len(bv)))].mean(axis=1);diff=ba-bb
 stats[str(d)]={'tokyo_races':len(av),'nakayama_races':len(bv),'tokyo_back4_top3_share':float(av.mean()),'nakayama_back4_top3_share':float(bv.mean()),'diff':float(av.mean()-bv.mean()),'ci95':np.quantile(diff,[.025,.975]).tolist()}
print('DIFF',json.dumps(stats,ensure_ascii=False,indent=2))
(OUT/'H011_stage_results.json').write_text(json.dumps({'input':audit,'all_clean_venue_distance':tr.groupby(['venue','dist']).rid.nunique().to_dict().__str__(),'course_diffs':stats},ensure_ascii=False,indent=2),encoding='utf8')