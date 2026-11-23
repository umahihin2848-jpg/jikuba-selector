"""Frozen 2021-23 market + predicted back-4C stage model evaluated 2024-26.
Exploratory historical diagnostic; year periods have been repeatedly mined; not a certified independent accuracy test.
Features are pre-race only; no actual CURRENT 4C in the modeling.
"""
import pathlib,sys,json
import numpy as np,pandas as pd
from scipy.optimize import minimize
ROOT=pathlib.Path('/mnt/data');O=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(ROOT/'h009_tokyo_nakayama_20261123'));import h009_venue_specificity as H
z=pd.read_csv(O/'H011_過去走からの4角後方予測_v3_PRIVATE.csv')
targets,_=H.load_data();dd=pd.DataFrame(targets)
v=dd.merge(z[['rid','no','p_back4_asof','gate_course_pback','history_n']],on=['rid','no'],how='inner',validate='one_to_one')
assert len(v)==len(dd) and v.rid.nunique()==dd.rid.nunique()
v=v.sort_values(['rid','no']);rr=[]
for race,rs in v.groupby('rid',sort=True):
 probs=H.pl_top3(rs.odds.to_numpy());probs=3/len(rs)+.8226462628846603*(probs-3/len(rs))
 cent=rs.p_back4_asof.to_numpy()-rs.p_back4_asof.mean();interaction=(rs.venue.iloc[0]=='東京') and (rs.dist.iloc[0] in [1600,1800])
 for j,rec in enumerate(rs.itertuples(index=False)):
  rr.append({'rid':race,'year':rec.year,'venue':rec.venue,'dist':rec.dist,'no':rec.no,'y':int(rec.fin<=3),
     'p':float(probs[j]),'c':float(cent[j]),'it':float(cent[j] if interaction else 0.),'n':len(rs)})
data=pd.DataFrame(rr);train=data[(data.year>=2021)&(data.year<=2023)];test=data[data.year>=2024]

def prep(df):
 df=df.sort_values(['rid','no']).copy();st=np.array([i for i,r in enumerate(df.rid) if i==0 or r!=df.rid.iloc[i-1]],dtype=int);grp=np.searchsorted(st,np.arange(len(df)),side='right')-1
 return df,st,grp,df.p.to_numpy(),df[['c','it']].to_numpy(),df.y.to_numpy()

a,s,g,q,x,y=prep(train)
def obj(b):
 p=H.project(q,x,np.asarray(b),s,g)
 return float(np.mean((p-y)**2)+.00030*np.dot(b,b))
base=obj([0,0]);opt=minimize(obj,[0,0],method='L-BFGS-B',bounds=[(-3,0),(0,3)],options={'ftol':1e-13,'maxiter':120});beta=np.asarray(opt.x)
print('fits',{'frozen_coeff':beta.tolist(),'brier_train_market':base,'brier_train_interaction':obj(beta),'success':opt.success})

def go(df):
 r,s,g,q,x,y=prep(df)
 p=H.project(q,x,beta,s,g)
 summary=[]
 for i,st in enumerate(s):
  end=s[i+1] if i+1<len(s) else len(r)
  z=r.iloc[st:end];b=np.argsort(-q[st:end])[:3];v=np.argsort(-p[st:end])[:3]
  summary.append({'rid':z.rid.iloc[0],'year':z.year.iloc[0],'dist':z.dist.iloc[0],'venue':z.venue.iloc[0],
  'brier_market':float(np.mean((q[st:end]-y[st:end])**2)),
  'brier_inter':float(np.mean((p[st:end]-y[st:end])**2)),
  'hits_market':int(y[st:end][b].sum()),'hits_inter':int(y[st:end][v].sum()),'changed':int(set(b)!=set(v))})
 v=pd.DataFrame(summary);return v
tr=go(train);te=go(test)
print('train',tr.agg({'brier_market':'mean','brier_inter':'mean','hits_market':'sum','hits_inter':'sum','changed':'sum'}).to_dict(),len(tr))
print('test',te.agg({'brier_market':'mean','brier_inter':'mean','hits_market':'sum','hits_inter':'sum','changed':'sum'}).to_dict(),len(te))
for (yr,venue),sub in te.groupby(['year','venue']):
 print('TEST_GROUP',yr,venue,len(sub),'improve',round(float((sub.brier_market-sub.brier_inter).mean()),7),'hitsDelta',int((sub.hits_inter-sub.hits_market).sum()))
# race bootstrap, exact same races
arr=(te.brier_market-te.brier_inter).to_numpy();n=len(arr);rng=np.random.default_rng(20261123)
boot=arr[rng.integers(0,n,(7000,n))].mean(axis=1)
res={'train':'2021-2023 n='+str(len(tr)),'test':'2024-2026 n='+str(len(te))+' already mined','beta':beta.tolist(),'train':tr[['brier_market','brier_inter','hits_market','hits_inter','changed']].agg({'brier_market':'mean','brier_inter':'mean','hits_market':'sum','hits_inter':'sum','changed':'sum'}).to_dict(),
 'test':te[['brier_market','brier_inter','hits_market','hits_inter','changed']].agg({'brier_market':'mean','brier_inter':'mean','hits_market':'sum','hits_inter':'sum','changed':'sum'}).to_dict(),
 'paired_brier_gain_ci95':np.quantile(boot,[.025,.975]).tolist(),
 'stage_only_model_caveat':'Pre-race predicted 4C made from old horse starts+gate+venue, but stage model fitted on same 2021-23 train as second-stage target; training stage in-sample not cross-fitted; test 2024-26 as-of and unmined claim prohibited',
 'method':'Logit of H002 closing odds-based PL shrunk 3-place proxy, adding centered predicted rear-half risk and Tokyo1600/1800 interaction, projected per race to total=3. Ridge penalty and signed constraints. All stage predictions use previous starts only.'}
(O/'H011_stage_to_market_results.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf8')
te.to_csv(O/'H011_予測4角を加えた市場比較_レース別.csv',index=False,encoding='utf-8-sig')