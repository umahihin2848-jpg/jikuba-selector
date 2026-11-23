"""Small Tokyo/Nakayama same-distance 2024 training / 2025-26 historical evaluation.
Compare frozen M3 shadow rank vs as-of predicted4C probability increment, no final4C input.
"""
import pathlib,sys,json
import numpy as np,pandas as pd
from scipy.optimize import minimize
ROOT=pathlib.Path('/mnt/data');O=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(ROOT/'h009_tokyo_nakayama_20261123'));import h009_venue_specificity as H
h=pd.read_csv(ROOT/'h005_depth_to_m3_20261123'/'h005_horse_comparison_PRIVATE.csv')
h=h[(h.surface=='芝')&h.distance.isin([1600,1800,2000])].copy()
h['m3rank']=h.groupby('rid').score_all5_decay.rank(method='first',ascending=True)
cs=pd.read_csv(O/'H011_過去走からの4角後方予測_v3_PRIVATE.csv')
j=h.merge(cs,on=['rid','no'],how='inner',suffixes=('','_source'),validate='one_to_one')
# all 3win+ strict card already in H009 sample; do not partially keep cards
j=j.groupby('rid').filter(lambda g:len(g)==g.n.iloc[0] and g.no.nunique()==g.n.iloc[0])
print('coverage',len(j),j.rid.nunique(),j.year.value_counts().to_dict())
rows=[]
for rid,g in j.groupby('rid'):
 g=g.sort_values('no');q=H.pl_top3(g['pop'].to_numpy()*0+1) if False else None
 # Final odds join from primary H009 source rather than popularity invented odds
 # H009 restricted full card has same rid/no; exact join below.
obs,_=H.load_data();o=pd.DataFrame(obs)[['rid','no','odds','fin','venue','dist','n']]
j=j.merge(o,on=['rid','no'],how='left',suffixes=('','_ref'),validate='one_to_one')
assert len(j)>0 and j.odds.notna().all()
for rid,gr in j.groupby('rid'):
 g=gr.sort_values('no'); q=H.pl_top3(g.odds.to_numpy());q=3/len(g)+.8226462628846603*(q-3/len(g))
 mm=0.5-(g.m3rank.to_numpy()-.5)/len(g);mm-=mm.mean()
 pp=g.p_back4_asof.to_numpy();pp-=pp.mean()
 for i,rec in enumerate(g.itertuples(index=False)):
  rows.append({'rid':rid,'year':rec.year,'no':rec.no,'y':int(rec.fin<=3),'q':q[i], 'm3':mm[i],'pos':pp[i]})
data=pd.DataFrame(rows)

def arr(df):
 df=df.sort_values(['rid','no']);starts=np.array([i for i,z in enumerate(df.rid) if i==0 or z!=df.rid.iloc[i-1]],dtype=int);grp=np.searchsorted(starts,np.arange(len(df)),side='right')-1
 return df, starts, grp, df.q.to_numpy(),df[['m3','pos']].to_numpy(),df.y.to_numpy()
train=data[data.year==2024];test=data[data.year>=2025]
tr,st,gt,qt,xt,yt=arr(train)
def pred(q,x,s,g,c):return H.project(q,x,np.asarray(c),s,g)
def obj(coef):return float(np.mean((pred(qt,xt,st,gt,coef)-yt)**2)+.00018*np.dot(coef,coef))
fitM=minimize(lambda z:obj([z[0],0]),[0],bounds=[(-3,3)],method='L-BFGS-B').x[0]
fitS=minimize(lambda z:obj([fitM,z[0]]),[0],bounds=[(-3,0)],method='L-BFGS-B').x[0]
coefs={'market':[0,0],'market_M3':[fitM,0],'market_M3_position':[fitM,fitS]}
print('trained coeffs',coefs)

def evaluate(df):
 r,s,g,q,x,y=arr(df);metrics={};detail={}
 for name,c in coefs.items():
  p=pred(q,x,s,g,c);records=[]
  for i,a in enumerate(s):
   b=s[i+1] if i+1<len(s) else len(r);top=np.argsort(-p[a:b])[:3]
   records.append({'rid':r.rid.iloc[a],'year':r.year.iloc[a],'brier':float(np.mean((p[a:b]-y[a:b])**2)),'hits':int(y[a:b][top].sum()),'top3':','.join(map(str,r.no.iloc[a+top]))})
  detail[name]=pd.DataFrame(records)
  metrics[name]={'brier':float(detail[name].brier.mean()),'hits':int(detail[name].hits.sum()),'races':len(s)}
 return metrics,detail
mtr,_=evaluate(train);mte,detail=evaluate(test)
print('train',mtr);print('test',mte)
older=detail['market_M3'];new=detail['market_M3_position'];d=(older.brier-new.brier).to_numpy();rng=np.random.default_rng(20261123);boot=d[rng.integers(0,len(d),(6000,len(d)))].mean(axis=1)
print('paired improvement',float(d.mean()),'CI',np.quantile(boot,[.025,.975]),'switch',int(sum(older.top3!=new.top3)))
for yr in [2025,2026]:
 a=older[older.year==yr];b=new[new.year==yr];print('year',yr,'n',len(a),'brier_old',a.brier.mean(),'brier_new',b.brier.mean(),'hits_old',a.hits.sum(),'hits_new',b.hits.sum())
res={'train_races':int(len(train.groupby('rid'))),'test_races':int(len(test.groupby('rid'))),'coefficients':coefs,'training_results':mtr,'test_results':mte,
 'paired_gain_ci95':np.quantile(boot,[.025,.975]).tolist(),'paired_gain_mean':float(d.mean()),'switch_races':int(sum(older.top3!=new.top3)),
 'caveats':['H005 M3 Python shadow, no official browser parity','All final odds are final postrace price','Earlier 2024–26 viewed repeatedly','N131 Tokyo/Nakayama 1600/1800/2000m only, low precision','Derived 4C model frozen 2021-23, additional coefficient only trained 2024']}
(O/'H011_M3_position_incremental.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf8')