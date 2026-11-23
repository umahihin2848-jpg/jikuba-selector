#!/usr/bin/env python3
"""H007 exploratory suitability diagnosis: market-relative past finishing, within-horse condition contrasts.
Uses target-year closing market only as offline benchmark, not betting/live probability.
No target day/result feature leakage, no horse identifiers publicly exported.
"""
from __future__ import annotations
import os,csv,json,math,collections,re
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.isotonic import IsotonicRegression
ROOT=Path(os.environ.get('RACE_DATA_DIR','/mnt/data'))
OUT=Path(os.environ.get('RACE_OUTPUT_DIR','/mnt/data/h007_suitability_study_20261123'))
OUT.mkdir(parents=True,exist_ok=True)
COLS=['馬名','レースID(新・馬番無16桁)','日付','場所','芝・ダート','距離','馬場状態','頭数','出走頭数','確定着順','異常コード','人気','単勝オッズ','レースPCI','上3F地点差','通過4']

def normname(s):return str(s or '').strip().replace(' ','').replace('　','')
def parse_dates(series):
 # These are TARGET YYYY.M.D or YYYY.MM. DD strings; zfill of all digits would shift years.
 p=series.astype(str).str.extract(r'(\d{4})\D+(\d{1,2})\D+(\d{1,2})',expand=True)
 return p[0].fillna('')+p[1].fillna('').str.zfill(2)+p[2].fillna('').str.zfill(2)
def asof_prior(history,target_date):
 # All treatment features must exclude the current race and any same-day/future race.
 return [h for h in history if h['date']<target_date]

def read_history():
 x=pd.read_csv(ROOT/'umadete.csv',encoding='cp932',usecols=COLS,dtype=str,low_memory=False,keep_default_na=False)
 before=len(x)
 for c in ['頭数','出走頭数','確定着順','人気','距離','単勝オッズ','レースPCI']:
  x[c]=pd.to_numeric(x[c].str.strip(),errors='coerce')
 x['name']=x['馬名'].map(normname)
 x['rid16']=x['レースID(新・馬番無16桁)'].str.strip()
 x['date']=parse_dates(x['日付'])
 x=x.loc[x['rid16'].str.fullmatch(r'\d{16}',na=False) & x['date'].str.fullmatch(r'\d{8}',na=False)]
 # Race-ID first 8 chars must match the date; abort rather than silently misdating.
 invalid=(x['rid16'].str[:8]!=x['date'])
 if invalid.any(): raise ValueError(f'{int(invalid.sum())} race-id/date mismatches; stop before evaluating')
 x=x.drop_duplicates(['name','rid16'],keep='first')
 x=x.loc[x['芝・ダート'].isin(['芝','ダ']) & x['場所'].isin(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']) & x['異常コード'].str.strip().isin(['0',''])]
 x=x.loc[x['出走頭数'].between(5,20) & x['確定着順'].between(1,20) & (x['確定着順']<=x['出走頭数']) & x['人気'].between(1,20) & (x['人気']<=x['出走頭数'])]
 x=x.rename(columns={'芝・ダート':'surface','場所':'venue','距離':'dist','出走頭数':'n','確定着順':'fin','人気':'pop','馬場状態':'going','レースPCI':'rpci'})
 x['actual']=(x['n']-x['fin'])/(x['n']-1)
 x['pop_frac']=(x['pop']-0.5)/x['n']
 # market expected relative finishing rank: fixed mapping learned pre-2024, monotone, no target contamination
 tr=x.loc[x['date']<'20240101']
 iso=IsotonicRegression(increasing=False,y_min=0,y_max=1,out_of_bounds='clip')
 iso.fit(tr['pop_frac'].values,tr['actual'].values)
 x['resid']=x['actual']-iso.predict(x['pop_frac'].values)
 x.sort_values(['name','date','rid16'],ascending=[True,False,False],inplace=True)
 keep=['date','venue','surface','dist','going','fin','n','pop','actual','resid','rpci']
 groups={k:d[keep].to_dict('records') for k,d in x.groupby('name',sort=False)}
 return groups,{'raw_rows':before,'filtered_unique_valid':len(x),'horses':len(groups),'pre2024_train_hist':len(tr),'market_expected_train_rmse':float(np.sqrt(np.mean((x.loc[x['date']<'20240101','resid'])**2)))}

def target_market():
 d={}
 path=ROOT/'競馬_過去母集団監査_20261123'/'market_horses_test2023_2026.csv'
 with path.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):d[(r['rid'],int(r['horse_no']))]=(float(r['shrunk']),int(r['top3']))
 return d

def target_horses():
 p=ROOT/'h005_depth_to_m3_20261123'/'h005_horse_comparison_PRIVATE.csv'
 d=[]
 with p.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   d.append({'rid':r['rid'],'date':r['rid'][:8],'year':int(r['year']),'no':int(r['no']),'name':normname(r['name']), 'surface':r['surface'],'distance':int(r['distance']),'fin':int(r['fin'])})
 return d

def apply_score(prior,kind,meta):
 # Strictly within past ten starts, condition-contrasts only if both sides have at least two starts
 p=prior[:5] if kind=='venue5' else prior[:10]
 if kind=='overall':
  if len(p)<5:return 0.,False,len(p),0
  return float(np.mean([x['resid'] for x in p])*len(p)/(len(p)+4)),True,len(p),0
 if kind=='distance':
  # Same surface, +/-200m vs other distance on same surface
  h=[x for x in p if x['surface']==meta['surface']]
  aa=[x for x in h if abs(x['dist']-meta['distance'])<=200]
  bb=[x for x in h if abs(x['dist']-meta['distance'])>200]
 elif kind in ('venue','venue5'):
  # Match course location while holding surface and <=400m distance approx constant
  h=[x for x in p if x['surface']==meta['surface'] and abs(x['dist']-meta['distance'])<=400]
  aa=[x for x in h if x['venue']==meta['venue']]
  bb=[x for x in h if x['venue']!=meta['venue']]
 elif kind=='surface':
  aa=[x for x in p if x['surface']==meta['surface']]
  bb=[x for x in p if x['surface']!=meta['surface']]
 else:raise AssertionError(kind)
 if len(aa)<2 or len(bb)<2: return 0.,False,len(aa),len(bb)
 # Difference in performance relative to popularity-based expected finishing rank.
 delta=np.mean([x['resid'] for x in aa])-np.mean([x['resid'] for x in bb])
 shrink=(len(aa)/(len(aa)+3))*(len(bb)/(len(bb)+3))
 return float(delta*shrink),True,len(aa),len(bb)

def eval_group(group,feature):
 y=np.array([z['y'] for z in group]);p=np.array([z['p'] for z in group]);x=np.array([z['x'][feature] for z in group])
 by=collections.defaultdict(list)
 for k,r in enumerate(group):by[r['rid']].append(k)
 for idx in by.values():x[idx]-=np.mean(x[idx])
 return y,p,x,by

def run():
 hist,info=read_history();mkt=target_market();trg=target_horses();data=[];q=collections.Counter()
 for row in trg:
  key=(row['rid'],row['no']);b=mkt.get(key)
  if not b:q['missing_market']+=1;continue
  actualY=int(row['fin']<=3)
  if actualY!=b[1]:q['target_market_top3_mismatch']+=1;continue
  past=asof_prior(hist.get(row['name'],[]),row['date'])
  venue=row['rid'].split('_')[1]
  meta={**row,'venue':venue}
  d={'rid':row['rid'],'year':row['year'],'surface':row['surface'],'venue':venue,'y':actualY,'p':b[0],'n_prior':len(past)}
  d['x']={};d['counts']={}
  for kind in ['overall','distance','venue','venue5','surface']:
   score,ok,nmatch,nother=apply_score(past,kind,meta)
   d['x'][kind]=score;d['counts'][kind]=[nmatch,nother,ok]
   if ok:q[f'eligible_{kind}_{row["year"]}']+=1
  data.append(d)
 assert len(data)>5000
 train=[r for r in data if r['year']==2024];test=[r for r in data if r['year']>=2025]
 summary={'schema':'H007_asof_suitability_market_residual_exploratory_v1','source':info,'target_rows':len(trg),'join_rows':len(data),'train2024_races':len(set(z['rid'] for z in train)),'test2025_26_races':len(set(z['rid'] for z in test)),'train2024_horses':len(train),'test2025_26_horses':len(test),'conditions':{},'limit':'historical reused years, closing market, not real pre-race price; not exact Ability/M3'}
 for kind in ['overall','distance','venue','venue5','surface']:
  y,p,x,by=eval_group(train,kind); yt,pt,xt,byt=eval_group(test,kind)
  # Closed-form single nonnegative coefficient trained on 2024 only.
  denom=float(np.dot(x,x))
  b=float(np.clip(np.dot(x,y-p)/denom if denom>1e-15 else 0,0,.5))
  def condition_probs(p,x,by,b):
   a=p+b*x
   for idx in by.values():
    raw=a[idx]
    if np.min(raw)<.0001 or np.max(raw)>.9999:
     lo,hi=-2.,2.
     for _ in range(43):
      mid=(lo+hi)/2
      if np.sum(np.clip(raw+mid,.0001,.9999))<3:lo=mid
      else:hi=mid
     a[idx]=np.clip(raw+(lo+hi)/2,.0001,.9999)
   return a
  new=condition_probs(pt,xt,byt,b)
  train_new=condition_probs(p,x,by,b)
  assert abs(sum(new[byt[next(iter(byt))]])-3)<1e-7
  # Race-weighted Brier: each race mean, all full cards same bet rule
  rids=sorted(byt)
  baseline=np.array([np.mean((pt[byt[r]]-yt[byt[r]])**2) for r in rids]);inter=np.array([np.mean((new[byt[r]]-yt[byt[r]])**2) for r in rids]);diff=baseline-inter
  rng=np.random.default_rng(20261123)
  bs=np.mean(diff[rng.integers(0,len(diff),(6000,len(diff)))],axis=1)
  conf=[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]
  coverage={y:sum(z['counts'][kind][2] for z in rows) for y,rows in [(2024,train),(2025,[z for z in test if z['year']==2025]),(2026,[z for z in test if z['year']==2026])]}
  # effect by selected eligible only, but current market is adjusted for all horses via centered score
  summary['conditions'][kind]={'eligible_horses':coverage,'train_coefficient':b,'train_baseline_brier':float(np.mean((p-y)**2)),'train_corrected_brier':float(np.mean((train_new-y)**2)),'test_baseline_race_mean_brier':float(baseline.mean()),'test_corrected_race_mean_brier':float(inter.mean()),'test_delta_brier':float(diff.mean()),'test_delta_ci95':conf,'test_changed_races':int(sum(any(abs(b*xt[byt[r]])>1e-10) for r in rids)),'test_score_nonzero_horses':int(sum(abs(xt)>1e-12)),'test_mean_score_eligible':float(np.mean([z['x'][kind] for z in test if z['counts'][kind][2]])) if coverage[2025]+coverage[2026]>0 else None}
 # Additional-value check: venue over market + generic same-horse last10 residual.
 def matrix(rows,keys):
  cols=[]; by=None
  for kind in keys:
   y,p,x,by=eval_group(rows,kind)
   cols.append(x)
  return y,p,np.column_stack(cols),by
 yt,pt,Xt,bytrain=matrix(train,['overall','venue'])
 ye,pe,Xe,bye=matrix(test,['overall','venue'])
 # Fit overall first, then condition-specific improvement only from residual.
 a=float(np.clip(np.dot(Xt[:,0],yt-pt)/max(1e-12,np.dot(Xt[:,0],Xt[:,0])),0,.5))
 v=float(np.clip(np.dot(Xt[:,1],yt-pt-a*Xt[:,0])/max(1e-12,np.dot(Xt[:,1],Xt[:,1])),0,.5))
 def proj(base,vals,by):
  result=base+vals
  for idx in by.values():
   raw=result[idx]
   if raw.min()<.0001 or raw.max()>.9999:
    lo,hi=-2.,2.
    for _ in range(43):
     mid=(lo+hi)/2
     if np.clip(raw+mid,.0001,.9999).sum()<3:lo=mid
     else:hi=mid
    result[idx]=np.clip(raw+(lo+hi)/2,.0001,.9999)
  return result
 general=proj(pe,a*Xe[:,0],bye)
 joint=proj(pe,a*Xe[:,0]+v*Xe[:,1],bye)
 base=pe
 out={'trained2024_coeff_overall':a,'trained2024_coeff_venue_given_overall':v,'tests':{}}
 for year in [2025,2026,'2025_26']:
  race_ids=sorted(rid for rid,ii in bye.items() if year=='2025_26' or test[ii[0]]['year']==year)
  b0=np.array([np.mean((base[bye[r]]-ye[bye[r]])**2) for r in race_ids]);b1=np.array([np.mean((general[bye[r]]-ye[bye[r]])**2) for r in race_ids]);b2=np.array([np.mean((joint[bye[r]]-ye[bye[r]])**2) for r in race_ids]);gain=b1-b2
  rng=np.random.default_rng(20261123)
  bs=np.mean(gain[rng.integers(0,len(gain),(6000,len(gain)))],axis=1)
  out['tests'][str(year)]={'races':len(race_ids),'baseline_brier':float(b0.mean()),'overall_brier':float(b1.mean()),'overall_plus_venue_brier':float(b2.mean()),'venue_incremental_delta':float(gain.mean()),'venue_incremental_ci95':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]}
 summary['general_then_venue']=out

 # Fixed evaluation of venue last5 and last10 after generic history correction.
 yy,pp,X5,_=matrix(train,['overall','venue5'])
 yt2,pt2,X5t,by5=matrix(test,['overall','venue5'])
 # Same 2024-only sequential fitting, no use of target test labels for selection.
 b5=float(np.clip(np.dot(X5[:,1],yy-pp-a*X5[:,0])/max(1e-12,np.dot(X5[:,1],X5[:,1])),0,.5))
 joint5=proj(pt2,a*X5t[:,0]+b5*X5t[:,1],by5)
 for year in [2025,2026,'2025_26']:
  k=str(year);ids=sorted(r for r,idx in bye.items() if year=='2025_26' or test[idx[0]]['year']==year)
  ids5=sorted(r for r,idx in by5.items() if year=='2025_26' or test[idx[0]]['year']==year)
  assert ids==ids5
  per5=np.array([np.mean((joint5[by5[r]]-ye[by5[r]])**2) for r in ids])
  per10=np.array([np.mean((joint[bye[r]]-ye[bye[r]])**2) for r in ids])
  d=per5-per10
  rng=np.random.default_rng(20261123);bs=np.mean(d[rng.integers(0,len(d),(6000,len(d)))],axis=1)
  out['tests'][k].update({'overall_plus_venue5_brier':float(per5.mean()),'venue10_minus_venue5_brier_gain':float(d.mean()),'venue10_minus_venue5_ci95':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]})
 out['trained2024_coeff_venue5_given_overall']=b5
 # Ablation: adjust for distance within horse before venue to separate coarse course from distance.
 y3,p3,X3,btr3=matrix(train,['overall','distance','venue'])
 ye3,pe3,X3t,bte3=matrix(test,['overall','distance','venue'])
 bdist=float(np.clip(np.dot(X3[:,1],y3-p3-a*X3[:,0])/max(1e-12,np.dot(X3[:,1],X3[:,1])),0,.5))
 bven=float(np.clip(np.dot(X3[:,2],y3-p3-a*X3[:,0]-bdist*X3[:,1])/max(1e-12,np.dot(X3[:,2],X3[:,2])),0,.5))
 bd=proj(pe3,a*X3t[:,0]+bdist*X3t[:,1],bte3)
 bvd=proj(pe3,a*X3t[:,0]+bdist*X3t[:,1]+bven*X3t[:,2],bte3)
 diag={}
 for year in [2025,2026,'2025_26']:
  ids=sorted(r for r,idx in bte3.items() if year=='2025_26' or test[idx[0]]['year']==year)
  de=np.array([np.mean((bd[bte3[r]]-ye3[bte3[r]])**2)-np.mean((bvd[bte3[r]]-ye3[bte3[r]])**2) for r in ids]);rng=np.random.default_rng(20261123);bs=np.mean(de[rng.integers(0,len(de),(6000,len(de)))],axis=1)
  diag[str(year)]={'venue_incremental_vs_overall_plus_distance':float(de.mean()),'ci95':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]}
 summary['general_distance_venue_ablation']={'coeff_distance2024':bdist,'coeff_venue2024_given_other':bven,'results':diag}
 # Split by surface: same coefficient for both surfaces; not reoptimized per surface
 split={}
 for sf in ['芝','ダ']:
  rids=sorted(r for r,idx in bye.items() if test[idx[0]]['surface']==sf)
  if not rids:continue
  dif=np.array([np.mean((general[bye[r]]-ye[bye[r]])**2)-np.mean((joint[bye[r]]-ye[bye[r]])**2) for r in rids]);rng=np.random.default_rng(20261123);bs=np.mean(dif[rng.integers(0,len(dif),(6000,len(dif)))],axis=1)
  split[sf]={'races':len(rids),'venue_incremental_vs_overall':float(dif.mean()),'ci95':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]}
 summary['venue_by_surface']=split
 # Per-year venue only, fixed 2024 coefficient, never refit in evaluation years
 y,p,x,by=eval_group(train,'venue');ye,pe,xe,bye=eval_group(test,'venue')
 b=summary['conditions']['venue']['train_coefficient'];full=proj(pe,b*xe,bye)
 year_stats={}
 for year in [2025,2026]:
  ids=sorted(r for r,idx in bye.items() if test[idx[0]]['year']==year)
  original=np.array([np.mean((pe[bye[r]]-ye[bye[r]])**2) for r in ids]);news=np.array([np.mean((full[bye[r]]-ye[bye[r]])**2) for r in ids]);diff=original-news
  rng=np.random.default_rng(20261123);bs=np.mean(diff[rng.integers(0,len(diff),(6000,len(diff)))],axis=1)
  year_stats[str(year)]={'races':len(ids),'delta':float(diff.mean()),'ci95':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))]}
 summary['venue_by_year']=year_stats
 # no horse-level data shared, even in ZIP. summary only
 (OUT/'H007_result_aggregate.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__':run()