"""Historical-depth sensitivity: trailing distinct starts, strict as-of, never production model."""
import csv,re,collections,datetime,math,random,statistics,json,os
from pathlib import Path
import pandas as pd
import numpy as np
ROOT=Path(os.environ.get('RACE_DATA_DIR','/mnt/data'));OUT=Path(os.environ.get('RACE_OUTPUT_DIR',str(ROOT/'history_depth_study_20261123')));OUT.mkdir(parents=True,exist_ok=True)
CLASS={'67':'3勝','115':'L','131':'OP','163':'G3','179':'G2','195':'G1'}
def date_iso(s):
 parts=re.findall(r'\d+',str(s or ''));return f'{int(parts[0]):04d}{int(parts[1]):02d}{int(parts[2]):02d}' if len(parts)==3 and len(parts[0])==4 else (parts[0][:8] if len(parts)==1 and len(parts[0])>=8 else '')
def ni(x):
 try:return int(str(x).strip())
 except:return None
def nf(x):
 try:
  f=float(str(x).strip());return f if math.isfinite(f) else None
 except:return None
def clean_horse(x):return str(x).strip().replace(' ','').replace('　','')
def read_hist():
 by={};stats=collections.Counter();bad=collections.Counter()
 with open(ROOT/'umadete.csv',encoding='cp932',newline='') as f:
  reader=csv.DictReader(f)
  for row in reader:
   stats['raw_rows']+=1;name=clean_horse(row['馬名']);rid=row['レースID(新・馬番無16桁)'].strip()
   date=date_iso(row['日付']);sur=row['芝・ダート'].strip();ab=row['異常コード'].strip();distance=ni(row['距離']);n=ni(row['出走頭数']) or ni(row['頭数']);fin=ni(row['確定着順'])
   if not name or len(rid)!=16 or not date or not n:stats['invalid_id_date_n']+=1;continue
   key=(name,rid)
   if key in by:stats['duplicates']+=1;continue
   if ab not in ('0','') or sur not in ('芝','ダ') or not fin or fin<1 or fin>n or n<5 or n>20 or distance is None:
    stats['bad_history_status']+=1;continue
   cors=[ni(row[f'通過{i}']) for i in range(1,5)]
   first=next((c for c in cors if c and 1<=c<=n),None)
   c4=cors[3] if cors[3] and 1<=cors[3]<=n else None
   gap=nf(row['上3F地点差']);gap=gap if gap is not None and 0<=gap<=5 else None
   rec={'name':name,'rid':rid,'date':date,'surface':sur,'distance':distance,'n':n,'first':(first-1)/(n-1) if first else None,'c4':(c4-1)/(n-1) if c4 else None,'gap':gap,'fin':fin}
   by[key]=rec
 for v in by.values():stats['unique_valid']+=1
 groups=collections.defaultdict(list)
 for rec in by.values():groups[rec['name']].append(rec)
 for v in groups.values():v.sort(key=lambda x:(x['date'],x['rid']))
 return groups,stats

def read_targets():
 out=[];stats=collections.Counter();seen=set();by_rid=collections.defaultdict(list)
 for p in ['2026_2025_seiseki.csv','2026seiseki.csv']:
  with open(ROOT/p,encoding='cp932',newline='') as f:
   for row in csv.DictReader(f):
    y=int(row['年']); y=y+2000 if y<100 else y
    if y<2024 or y>2026:continue
    date=f"{y:04d}{int(row['月']):02d}{int(row['日']):02d}"
    cid=str(ni(row['クラスコード']) or '');n=ni(row['頭数']);no=ni(row['馬番']);fin=ni(row['確定着順']);sur=row['芝・ダ'].strip();name=clean_horse(row['馬名']);ab=row['異常コード'].strip();distance=ni(row['距離'])
    stats['source_horses']+=1
    if cid not in CLASS or sur not in ('芝','ダ') or n is None or not 12<=n<=18 or no is None or fin is None or ab not in ('0',''):
     stats['out_of_scope_or_abnormal']+=1;continue
    rid=date+'_'+row['場所'].strip()+'_'+str(ni(row['レース番号']))
    key=(rid,no)
    if key in seen:stats['dup_target_no']+=1;continue
    seen.add(key)
    cs=[ni(row[f'通過順{i}']) for i in range(1,5)]
    first=next((c for c in cs if c is not None and 1<=c<=n),None)
    c4=cs[3] if cs[3] and 1<=cs[3]<=n else None
    rec={'rid':rid,'name':name,'date':date,'year':y,'n':n,'no':no,'surface':sur,'distance':distance,'first':(first-1)/(n-1) if first else None,'c4':(c4-1)/(n-1) if c4 else None,'fin':fin,'class':cid}
    out.append(rec);by_rid[rid].append(rec)
 for r in out:
  others=by_rid[r['rid']];r['card_count']=len(others);r['full_field']=len(others)==r['n'] and len({v['no'] for v in others})==r['n']
 stats['eligible_horses']=len(out);stats['eligible_races']=len(by_rid)
 return out,stats

def preds(hist,K,field,alpha=1.0):
 vals=[];wts=[]
 for i,x in enumerate(hist[:K]):
  v=x[field]
  if v is None:continue
  vals.append(v);wts.append(alpha**i)
 if not vals:return None
 return sum(v*w for v,w in zip(vals,wts))/sum(wts)

def evaluate():
 hist,hs=read_hist();target,ts=read_targets();print('history stats',hs,'target stats',ts,flush=True)
 data=[];ds=collections.Counter()
 for t in target:
  if not t['full_field']:ds['card_incomplete_horses']+=1;continue
  original=hist.get(t['name'],[])
  old=[h for h in original if h['date']<t['date']]
  old=[h for h in old if h['surface']==t['surface']]
  if not old:ds['no_past_same_surface']+=1;continue
  old.sort(key=lambda x:(x['date'],x['rid']),reverse=True)
  # Semantically same target has stronger generalization when older than 1 year? use timestamps only
  rec={k:t[k] for k in ('rid','name','date','year','n','no','surface','distance','fin','first','c4')};rec['nHist']=len(old)
  rec['nHist400']=sum(abs(h['distance']-t['distance'])<=400 for h in old)
  for m in ['first','c4','gap']:
   available=[h for h in old if h[m] is not None]
   rec['available_'+m]=len(available)
   for k in [1,3,5,8,10,12]:
    rec[f'{m}_mean{k}']=preds(available,k,m)
    rec[f'{m}_decay{k}']=preds(available,k,m,0.80)
   # as-of same surface + near distance
   near=[h for h in old if abs(h['distance']-t['distance'])<=400 and h[m] is not None]
   rec[f'{m}_nearN']=len(near)
   for k in [5,8,10]:rec[f'{m}_nearmean{k}']=preds(near,k,m)
  data.append(rec)
 print('matched target',len(data),'notmatched',ds,flush=True)
 # The only true label for gap comes from source historical records for same target if available
 # To avoid accidentally using target gap as input, current recorded history gap is used solely for label when ID/date match
 for r in data:
  matches=[h for h in hist.get(r['name'],[]) if h['date']==r['date']]
  r['gap']=next((h['gap'] for h in matches if h['gap'] is not None),None)
  r['gap_matchcount']=len(matches)
 pd.DataFrame(data).to_csv(OUT/'horse_predictions_private.csv',index=False,encoding='utf-8-sig')
 metrics=[]
 for metric in ['first','c4','gap']:
  for period,sub in [('2024',data),('2025',data),('2026',data),('2025_2026',data)]:
   sub=[r for r in sub if (r['year']==int(period) if period!='2025_2026' else r['year']>=2025)]
   for group,label in [('matched10','same_cohort_ge10'),('matched5','same_cohort_ge5'),('all','varying_coverage')]:
    target10=[r for r in sub if r[metric] is not None and ((r['available_'+metric]>=10) if group=='matched10' else (r['available_'+metric]>=5 if group=='matched5' else r['available_'+metric]>=1))]
    if not target10:continue
    for k in [1,3,5,8,10,12]:
     for method in ['mean','decay']:
      name=f'{metric}_{method}{k}';avail=[r for r in target10 if r[name] is not None];
      if not avail:continue
      ae=np.array([abs(r[name]-r[metric]) for r in avail]);se=np.array([(r[name]-r[metric])**2 for r in avail]);
      metrics.append({'metric':metric,'period':period,'cohort':label,'method':method,'k':k,'horses':len(avail),'races':len(set(r['rid'] for r in avail)),'mae':round(ae.mean(),6),'rmse':round(np.sqrt(se.mean()),6),'nHistoryMean':round(np.mean([r['available_'+metric] for r in avail]),2)})
 pd.DataFrame(metrics).to_csv(OUT/'comparison_aggregate.csv',index=False,encoding='utf-8-sig')
 # paired race-level MAE difference of K5 vs K10 in fixed 10 historical group
 pairs=[]
 for metric in ['first','c4','gap']:
  for period in ['2024','2025','2026','2025_2026']:
   sub=[r for r in data if (str(r['year'])==period if period!='2025_2026' else r['year']>=2025) and r['available_'+metric]>=10 and r[metric] is not None]
   if not sub:continue
   # compare 5,8,10,12 same cohort with 10+; 12 requires subset, compare 5 v 12 separately
   byrace=collections.defaultdict(list)
   for r in sub:byrace[r['rid']].append(r)
   for test in ['mean8','mean10','decay10','mean12','decay12']:
    k=int(''.join(x for x in test if x.isdigit()))
    if k==12:rs=[r for r in sub if r['available_'+metric]>=12]
    else:rs=sub
    if not rs:continue
    br=collections.defaultdict(list)
    for r in rs:br[r['rid']].append((abs(r[f'{metric}_mean5']-r[metric]),abs(r[f'{metric}_{test}']-r[metric])))
    arr=np.array([[np.mean([a for a,b in vv]),np.mean([b for a,b in vv])] for vv in br.values()]);meanDiff=float((arr[:,0]-arr[:,1]).mean())
    rng=np.random.default_rng(20261123);b=5000;ix=rng.integers(0,len(arr),(b,len(arr)));bs=(arr[ix,0]-arr[ix,1]).mean(axis=1)
    pairs.append({'metric':metric,'period':period,'test':test,'races':len(br),'horses':len(rs),'baselineMAE':round(arr[:,0].mean(),6),'testMAE':round(arr[:,1].mean(),6),'improvement':round(meanDiff,6),'ci_low':round(np.quantile(bs,.025),6),'ci_high':round(np.quantile(bs,.975),6)})
 pd.DataFrame(pairs).to_csv(OUT/'paired_race_bootstrap.csv',index=False,encoding='utf-8-sig')
 # 3/5/8/10 coverage and first-corner profile
 report={'history':dict(hs),'target':dict(ts),'matching':{'matched_horses':len(data),'misses':dict(ds)},'hist_available_for_first':{str(k):sum(r['available_first']>=k for r in data) for k in [1,3,5,8,10,12]},'hist_available_for_c4':{str(k):sum(r['available_c4']>=k for r in data) for k in [1,3,5,8,10,12]},'hist_available_for_gap':{str(k):sum(r['available_gap']>=k for r in data) for k in [1,3,5,8,10,12]}}
 (OUT/'meta.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 print('SUMMARY',json.dumps(report,ensure_ascii=False),flush=True)
 print('MATCHED PAIR RESULTS',pd.DataFrame(pairs).to_string(index=False),flush=True)
 print('COHORT DETAIL',pd.DataFrame(metrics).query('period=="2025_2026" and cohort=="same_cohort_ge10"').to_string(index=False),flush=True)
if __name__=='__main__':evaluate()