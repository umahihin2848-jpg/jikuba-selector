"""H011 pre-race 'which horses get stuck back at 4C' diagnostic.
Research 2016-2026. Exactly past distinct race IDs only. No current race running position in predictors.
Deliberately distinct from H009 venue mean result bias / H010 course-interaction on M3.
"""
import pathlib,pickle,collections,sys,json
import numpy as np,pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,brier_score_loss,log_loss
ROOT=pathlib.Path('/mnt/data');OUT=ROOT/'H011_コース適性メカニズム診断_20261123'
sys.path.insert(0,str(ROOT/'h009_tokyo_nakayama_20261123'));import h009_venue_specificity as H
sys.path.insert(0,str(OUT));import h011_stage_audit as A
from h011_utils import prior_unique,past_c4_mean
rows=A.df.copy(); raw=pickle.load(open(ROOT/'history_unique_tmp.pkl','rb'))
by=collections.defaultdict(list);aud=collections.Counter()
for x in raw:
 nm=H.name(x.get('馬名'));rid=str(x.get('レースID(新・馬番無16桁)','')).strip();date=str(x.get('date','')).replace('-','')
 if not nm or len(rid)!=16 or not rid.isdigit() or date!=rid[:8]:aud['bad_rid_date']+=1;continue
 n=H.ii(x.get('出走頭数') or x.get('頭数'));c4=H.ii(x.get('通過4'))
 if n is None or c4 is None or not(5<=n<=20 and 1<=c4<=n):aud['invalid_c4']+=1;continue
 if str(x.get('異常コード','')).strip() not in ('','0'):aud['abnormal']+=1;continue
 surf=str(x.get('芝・ダート',''))
 by[nm].append({'date':int(date),'rid':rid,'surf':surf,'c4frac':(c4-.5)/n,'dist':H.ii(x.get('距離')),'venue':x.get('場所')})
for nm,ls in by.items():
 ls.sort(key=lambda x:x['date'],reverse=True); dedup=set();ls[:]=[v for v in ls if not(v['rid'] in dedup or dedup.add(v['rid']))]
print('History distinct horses',len(by),'valid observations',sum(map(len,by.values())),'audit',dict(aud))
F=[];blank=0
for r in rows.itertuples(index=False):
 a=prior_unique(by.get(r.name,[]),r.date,'芝',5)
 if not a:blank+=1
 if any(x['date']>=r.date for x in a):raise RuntimeError('Future leak')
 pref=past_c4_mean(a,.82)
 dist_near=[z for z in a if abs((z['dist'] or 0)-r.dist)<=200]
 same=float(np.mean([z['c4frac'] for z in dist_near])) if len(dist_near)>=2 else pref
 x=np.array([pref-.5,same-.5,(r.no-1)/(r.n-1)-.5,min(len(a),5)/5,1 if r.venue=='東京' else 0,1 if r.dist==2000 else 0],dtype=float)
 F.append({'rid':r.rid,'year':r.year,'venue':r.venue,'dist':r.dist,'no':r.no,'name':r.name,'fin':r.fin,'pop':r.pop,'n':r.n,'actual_back4':int(r.c4_bucket=='back_half'),'x':x,'history_n':len(a)})
print('covered',len(F)-blank,'/',len(F),'missing',blank)
assert len(F)==len(rows)
X=np.stack([z['x'] for z in F]); y=np.array([z['actual_back4'] for z in F]);
years=np.array([z['year'] for z in F]); train=(years>=2021)&(years<=2023);test=years>=2024
# all pre-2021 era for stage model, then fixed evaluation 2021-26; prior c4 from past date only
m=LogisticRegression(C=2.0, max_iter=350).fit(X[train],y[train]);p=m.predict_proba(X)[:,1]
# Baseline before looking at horse-specific past: gate + Tokyo indicator + 2000m
gate_cols=[2,4,5];g=LogisticRegression(C=2.0,max_iter=350).fit(X[train][:,gate_cols],y[train]);p_gate=g.predict_proba(X[:,gate_cols])[:,1]
# Fair comparison: baseline course/distance train historical rear frequency without horse history
risk={(v,d):float(y[train & np.array([(r['venue'],r['dist'])==(v,d) for r in F])].mean()) for v in H.VENUES for d in H.DIST}
base=np.array([risk[(r['venue'],r['dist'])] for r in F])
for metric,subset in [('TRAIN_2021_2023',train),('TEST_2024_2026',test)]:
 print(metric,{'n':int(subset.sum()),'races':len({z['rid'] for z,yes in zip(F,subset) if yes}),
  'auc':roc_auc_score(y[subset],p[subset]),'brier':brier_score_loss(y[subset],p[subset]),'course_only_brier':brier_score_loss(y[subset],base[subset]),
  'gate_course_auc':roc_auc_score(y[subset],p_gate[subset]),'gate_course_brier':brier_score_loss(y[subset],p_gate[subset]),
  'old_position_only_coverage':float(np.mean(np.array([z['history_n'] for z in F])[subset]>=2))})
 # by course
 for (v,d) in [(v,d) for v in H.VENUES for d in H.DIST]:
  sub=subset & (np.array([z['venue'] for z in F])==v) & (np.array([z['dist'] for z in F])==d)
  if sub.sum()>100:print(v,d,int(sub.sum()),'AUC',round(roc_auc_score(y[sub],p[sub]),3),'Brier',round(brier_score_loss(y[sub],p[sub]),4))
res={'training':'2021-2023','test':'2024-2026/10/4 historical period previously explored','history_audit':dict(aud),'history_distinct_horses':len(by),'coverage':{'horses_with_past':len(F)-blank,'target_horse_rows':len(F)},
 'coefficients':m.coef_[0].tolist(),'intercept':m.intercept_[0],
 'train_auc':float(roc_auc_score(y[train],p[train])),'test_auc':float(roc_auc_score(y[test],p[test])),
 'test_brier':float(brier_score_loss(y[test],p[test])),'course_only_test_brier':float(brier_score_loss(y[test],base[test])),'gate_course_test_auc':float(roc_auc_score(y[test],p_gate[test])),'gate_course_test_brier':float(brier_score_loss(y[test],p_gate[test]))}
(OUT/'H011_asof_c4_model_v3.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf8')
# Per-horse row private for offline paired predictive stress test; do not publish
pd.DataFrame([{k:(float(v) if isinstance(v,np.floating) else v) for k,v in f.items() if k!='x'} | {'p_back4_asof':p[i],'base_back4':base[i],'gate_course_pback':p_gate[i]} for i,f in enumerate(F)]).to_csv(OUT/'H011_過去走からの4角後方予測_v3_PRIVATE.csv',index=False,encoding='utf-8-sig')