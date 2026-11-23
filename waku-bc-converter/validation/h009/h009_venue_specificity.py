#!/usr/bin/env python3
"""H009: frozen chronological diagnostic of Tokyo vs Nakayama horse-specific course preference.
Research only, target JRA turf 1600/1800/2000m, 3-win+, 12-18 starters.
All historical rows within this same base population; no hindsight course preference.
"""
import csv,collections,math, pathlib,json
from bisect import bisect_left
import numpy as np
from scipy.optimize import minimize_scalar
from scipy.special import expit,logit

ROOT=pathlib.Path('/mnt/data')
OUT=ROOT/'h009_tokyo_nakayama_20261123'
SOURCE=[ROOT/'2026_2025_seiseki.csv',ROOT/'2026seiseki.csv']
VENUES=('東京','中山'); DIST=(1600,1800,2000); GRADES={'67','115','131','163','179','195'}

def ii(s):
 try:return int(float(str(s).strip()))
 except:return None

def ff(s):
 try:v=float(str(s).strip());return v if math.isfinite(v) else None
 except:return None

def name(s):return str(s or '').replace(' ','').replace('　','').strip()

def date(y,m,d):
 y=ii(y);m=ii(m);d=ii(d)
 if y is None or m is None or d is None or not (1<=m<=12 and 1<=d<=31):return 0
 return (2000+y if y<100 else y)*10000+m*100+d

def load_data():
 rows=[]; audit=collections.Counter(); dedup=set()
 for fn in SOURCE:
  with fn.open(encoding='cp932',newline='') as f:
   for x in csv.DictReader(f):
    audit['rows_seen']+=1
    if str(x['クラスコード']).strip() not in GRADES or x['芝・ダ']!='芝' or x['場所'] not in VENUES or ii(x['距離']) not in DIST:continue
    n=ii(x['頭数']);no=ii(x['馬番']);fin=ii(x['確定着順']);pop=ii(x['人気順']);odd=ff(x['単勝オッズ']);dt=date(x['年'],x['月'],x['日']);nm=name(x['馬名']);rn=ii(x['レース番号']);ab=str(x['異常コード']).strip()
    if not(n and 12<=n<=18 and no and 1<=no<=n and fin and 1<=fin<=n and pop and 1<=pop<=n and odd and odd>=1 and dt and nm and rn and ab in ('','0')):audit['invalid']+=1;continue
    rid=f'{dt:08d}_{x["場所"]}_{rn:02d}'
    k=(rid,no)
    if k in dedup:audit['dup']+=1;continue
    dedup.add(k)
    rows.append({'rid':rid,'date':dt,'year':dt//10000,'venue':x['場所'],'dist':ii(x['距離']),'no':no,'name':nm,'n':n,'fin':fin,'pop':pop,'odds':odd,'resid':(pop-fin)/(n-1)})
 by=collections.defaultdict(list)
 for r in rows:by[r['rid']].append(r)
 valid=[];errors=[]
 for rid,rs in by.items():
  nn=rs[0]['n']; pos=[z['no'] for z in rs]
  if len(rs)!=nn or len(set(pos))!=nn or len([x for x in rs if x['fin']<=3])!=3 or any(x['n']!=nn for x in rs):errors.append(rid);continue
  valid.extend(rs)
 valid=sorted(valid,key=lambda z:(z['date'],z['rid'],z['no']))
 audit.update(total_filtered=len(rows),clean_horse_rows=len(valid),clean_races=len(by)-len(errors),bad_races=len(errors))
 return valid,dict(audit)

def recency_mean(rs):
 """Weight latest same-distance race more; do not give a duplicate race twice."""
 a=np.array([r['resid'] for r in rs[:12]],dtype=float)
 if not len(a):return 0.
 w=np.power(.90,np.arange(len(a)))
 return float(np.dot(a,w)/w.sum())

def make_features(rows):
 byhorse=collections.defaultdict(list); targets=[]; cover=collections.Counter()
 for rid,group in _by_race(rows):
  day=group[0]['date']
  # snapshot history before this date, no same-day historical race leaked
  for r in group:
   prev=[z for z in byhorse[r['name']] if z['date']<day and z['dist']==r['dist']]
   recent=prev[-12:][::-1]
   tok=[z for z in recent if z['venue']=='東京']
   nak=[z for z in recent if z['venue']=='中山']
   general=recency_mean(recent)
   if tok and nak:
    diff=recency_mean(tok)-recency_mean(nak)
    # strong shrinkage, both sides evidence required
    k=min(len(tok),len(nak))
    venue_fit=(1 if r['venue']=='東京' else -1)*diff*k/(k+3)
    cover['matched1']+=1
    if k>=2:cover['matched2']+=1
   else:venue_fit=0.
   r['venue_signal']=venue_fit
   r['general']=general*(len(recent)/(len(recent)+3))
   r['ntok']=len(tok);r['nnak']=len(nak)
   r['history_n']=len(recent)
   r['y']=int(r['fin']<=3)
   targets.append(r)
  # Update histories AFTER features for all horses in the same race/date.
  for r in group:byhorse[r['name']].append(r)
 return targets,dict(cover)

def _by_race(rows):
 groups=collections.defaultdict(list)
 for x in rows:groups[x['rid']].append(x)
 for rid in sorted(groups,key=lambda z:(groups[z][0]['date'],z)):
  yield rid,groups[rid]

def pl_top3(odds):
 w=1/np.asarray(odds,float);w=w/w.sum();n=len(w)
 p=np.copy(w)
 for i in range(n):
  for j in range(n):
   if i==j:continue
   p2=w[i]*w[j]/(1-w[i]);p[j]+=p2
   rem=1-w[i]-w[j]
   for k in range(n):
    if k!=i and k!=j:p[k]+=p2*w[k]/rem
 return p

def prep(rows):
 cards=collections.defaultdict(list)
 for r in rows:cards[r['rid']].append(r)
 cards=dict(sorted(cards.items()))
 sorted_rows=[]; starts=[]
 for rid,card in cards.items():
  starts.append(len(sorted_rows))
  q=pl_top3([z['odds'] for z in card]);q=3/len(card)+.82264626*(q-3/len(card))
  for z,p in zip(card,q):z['q']=float(p)
  sorted_rows.extend(card)
 grp=np.searchsorted(starts,np.arange(len(sorted_rows)),side='right')-1
 x=np.array([[z['general'],z['venue_signal']] for z in sorted_rows]); y=np.array([z['y'] for z in sorted_rows]); q=np.array([z['q'] for z in sorted_rows])
 return sorted_rows,np.asarray(starts,dtype=int),grp,q,x,y

def project(q,x,coefs,starts,grp):
 logits=logit(np.clip(q,1e-6,1-1e-6))+x@coefs
 offsets=np.zeros(len(starts))
 for _ in range(20):
  p=expit(logits+offsets[grp]); totals=np.add.reduceat(p,starts); derivatives=np.add.reduceat(p*(1-p),starts)
  offsets+=np.clip((3-totals)/np.maximum(derivatives,1e-8),-1,1)
  if np.max(np.abs(totals-3))<1e-9:break
 return expit(logits+offsets[grp])

def fit(train,only_form=False):
 rows,s,g,q,x,y=prep(train)
 old=np.array([0.,0.]);coefs=[]
 for k in ([0] if only_form else [0,1]):
  def obj(beta):
   c=old.copy();c[k]=beta
   p=project(q,x,c,s,g)
   return float(np.mean((p-y)**2)+.00001*beta*beta)
  z=minimize_scalar(obj,bounds=(0,5) if k==1 else (-5,5),method='bounded',options={'xatol':.00001})
  old[k]=round(float(z.x),7)
 return old

def evaluate(rr,form,full):
 rows,s,g,q,x,y=prep(rr)
 if not len(rows):return {},[]
 pred={'market':q,'form':project(q,x,form,s,g),'venue':project(q,x,full,s,g)}
 metrics={};byrace=[]
 for label,p in pred.items():
  brier=[];hits=0;winners=0
  for i,a in enumerate(s):
   b=s[i+1] if i+1<len(s) else len(rows)
   pr=p[a:b];idx=np.argsort(-pr)[:3]
   hits+=int(y[a:b][idx].sum());winners+=int(any(rows[a+k]['fin']==1 for k in idx))
   brier.append(float(np.mean((pr-y[a:b])**2)))
   if label=='market':byrace.append({'rid':rows[a]['rid'],'year':rows[a]['year'],'distance':rows[a]['dist'],'venue':rows[a]['venue'],'horses':b-a,'matched':sum(z['ntok']>=1 and z['nnak']>=1 for z in rows[a:b])})
   byrace[i][label+'_brier']=brier[-1]
   byrace[i][label+'_hits']=int(y[a:b][idx].sum())
  metrics[label]={'brier':float(np.mean(brier)),'hits':int(hits),'winners':int(winners)}
 metrics['races']=len(s);metrics['horses']=len(rows)
 metrics['matched_horses']=sum(r['ntok']>=1 and r['nnak']>=1 for r in rows)
 metrics['matched_2each']=sum(r['ntok']>=2 and r['nnak']>=2 for r in rows)
 return metrics,byrace

def bootstrap(ds,seed=20261123):
 d=np.asarray(ds,dtype=float);rng=np.random.default_rng(seed);n=len(d)
 arr=np.mean(d[rng.integers(0,n,(4000,n))],axis=1)
 return {'gain':float(d.mean()),'ci95':np.quantile(arr,[.025,.975]).tolist(),'n':n}

def descriptive(rows):
 # Cross-course within-horse, same-exact distance, at least 2 starts at each track.
 dd=collections.defaultdict(lambda:collections.defaultdict(list))
 for r in rows:dd[(r['name'],r['dist'])][r['venue']].append(r)
 pairs=[]
 for (nm,dist),v in dd.items():
  t=v['東京'];n=v['中山']
  if min(len(t),len(n))<2:continue
  diff=np.mean([x['resid'] for x in t])-np.mean([x['resid'] for x in n]);
  pairs.append({'horse':nm,'distance':dist,'n_tokyo':len(t),'n_nakayama':len(n),'diff_tokyo_nakayama':float(diff)})
 rng=np.random.default_rng(20261123)
 ar=np.array([x['diff_tokyo_nakayama'] for x in pairs]); boot=np.mean(ar[rng.integers(0,len(ar),(5000,len(ar)))],axis=1)
 return {'both2_horse_distance_pairs':len(pairs),'counts':dict(collections.Counter(str(x['distance']) for x in pairs)),
  'mean_diff_tokyo_minus_nakayama':float(ar.mean()),'median_absolute_difference':float(np.median(np.abs(ar))),
  'ci95_mean_diff':np.quantile(boot,[.025,.975]).tolist(),
  'share_large_absolute_0.2':float(np.mean(np.abs(ar)>=.2))},pairs

def main():
 data,audit=load_data(); rows,cover=make_features(data)
 disc,pairs=descriptive(rows)
 train=[r for r in rows if 2019<=r['year']<=2023]
 test=[r for r in rows if 2024<=r['year']<=2026]
 form=fit(train,True);full=fit(train)
 print('FROZEN coefficients',form.tolist(),full.tolist())
 results={};allby=[]
 for k,rs in [('train_2019_23',train),('test_2024_26',test),('test_2024',[r for r in test if r['year']==2024]),('test_2025',[r for r in test if r['year']==2025]),('test_2026',[r for r in test if r['year']==2026])]:
  metric,by=evaluate(rs,form,full);results[k]=metric
  if k=='test_2024_26':allby=by
  print(k,metric)
 c=bootstrap([r['form_brier']-r['venue_brier'] for r in allby])
 print('paired bootstrap',c)
 # Evidence threshold only: subset of races with at least one runner who had BOTH prior venues at exact same distance.
 rr=[r for r in allby if r['matched']>=1]
 print('matched subset',len(rr),bootstrap([r['form_brier']-r['venue_brier'] for r in rr]))
 res={'research_id':'H009','audit':audit,'coverage':cover,'within_horse_same_exact_distance':disc,'market_interpretation':'PL three-place surrogate from post-race final win odds, not actual betting price','train_years':'2019-2023, all same-course 2016 onward strictly prior','test_years':'2024-2026/10/04 (previously explored)','coef_form':form.tolist(),'coef_with_venue':full.tolist(),'results':results,'paired_gain_ci':c,'matched_races':len(rr),'matched_races_ci':bootstrap([r['form_brier']-r['venue_brier'] for r in rr]) if rr else None,'limitations':['historical final odds, not T-15','previously explored test years','course/surface/distance official record only, no exact geometry/going matching','only higher class race histories in source, below-class histories not available from this extraction','many historical horses without both venue observations','model is market-only+simple form, not exact official Ability C or M3 browser parity']}
 OUT.mkdir(exist_ok=True)
 (OUT/'H009_RESULT.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
 with (OUT/'H009_RACE_AUDIT_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=allby[0].keys());w.writeheader();w.writerows(allby)
 with (OUT/'H009_PAIR_DESCRIPTIVE_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=pairs[0].keys());w.writeheader();w.writerows(pairs)
 print('written',OUT)

if __name__=='__main__':main()