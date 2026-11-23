#!/usr/bin/env python3
"""H005 historical research: change only remaining600 positional input to fixed M3.

Reconstructed research shadow, not live browser or historical full official M3.
TARGET raw history and full-field results stay local. No forward holdout claim.
"""
from __future__ import annotations
import csv, math, re, json, collections, statistics, hashlib, os
from pathlib import Path
import numpy as np

ROOT=Path(os.environ.get('RACE_DATA_DIR','/mnt/data'))
OUT=Path(os.environ.get('RACE_OUTPUT_DIR',str(ROOT/'h005_depth_to_m3_20261123')))
OUT.mkdir(exist_ok=True)
GRA={'67','115','131','163','179','195'}

# Frozen coefficients from main/data/finish600_model_v1.json, SHA 7539949515b072ea69c87486385235e83fd8fd94
F=['pred_gap','hist_gap_med','hist_pci_med','hist_rpci_med','hist_last3f_med','hist_last3f_mean','hist_last3f_sd','hist_front_mean','hist_pr_diff_med','hist_pr_diff_mean','hist_pr_diff_sd','same_surface_pr_diff_med','same_surface_last3f_med','same_surface_n','hist_n','field_size','gate_frac','distance','surface_dirt']
IMP=[.797786320948686,.7,50,49.6,35.5,35.5,1,.5528647823,.7999999999999972,.7800000000000011,2,.8000000000000043,35.5,4,5,16,.5,1600,0]
MU=[.8009913697723552,.6950060711188204,50.34520381613183,49.29724718126626,35.79724024284475,35.87817773923099,1.0600985855604037,.550266104938603,.9948083261058108,.9414941890719861,2.306645407598657,1.0226088464874241,35.80333044232437,3.432263660017346,3.6882220294882915,15.52031222896791,.5000021754005735,1652.3365134431917,.39618386816999135]
SD=[.27569679232170413,.39699515875842306,4.131501344865089,3.666460651036228,1.410129849056195,1.3809409298612996,.5815798360411006,.23193172948759888,2.258271453772687,2.2713916601179185,1.1877630609990424,2.2912807374226536,1.4398423744983704,1.878753206140019,1.8071751698922693,1.6018241681718497,.3080951158187918,400.4721903248424,.48910347654852576]
B=[.049732744573153145,-.08289977750207511,.11231952848195836,.06719838059596264,.07696745183452211,.038308036231480574,.005640841948449358,-.11444674364783447,-.055574877467047784,.2072070531202821,.001827546294217872,.1334453192391468,-.007842650952832451,.17884245073484067,-.19778879781953312,-.024989230933576707,-.004612686327623297,-.10566221047331242,.022392370361463697]
INTER=-.15512055507372105
REMG={'intercept':.5560463792,'hist_gap_median_last5':.2174501265,'hist_frontness_mean_last5':-.8403902528,'field_size':.03463418921,'gate_fraction':.03744118348}
assert len(F)==len(IMP)==len(MU)==len(SD)==len(B)==19

def ni(v):
 try:return int(str(v).strip())
 except:return None

def nf(v):
 try:
  z=float(str(v).strip());return z if math.isfinite(z) else None
 except:return None

def normname(s):return str(s or '').strip().replace(' ','').replace('　','')
def normdate(s):
 a=re.findall(r'\d+',str(s or ''))
 if len(a)>=3 and len(a[0])==4:return f'{int(a[0]):04d}{int(a[1]):02d}{int(a[2]):02d}'
 return a[0][:8] if len(a)==1 and len(a[0])>=8 else ''

def median(v,default):return statistics.median(v) if v else default

def mean(v,default):return statistics.fmean(v) if v else default

def sd(v,default):
 if not v:return default
 if len(v)==1:return 0.
 m=sum(v)/len(v);return math.sqrt(sum((x-m)**2 for x in v)/len(v))

def decayed(v,k,alpha=.8):
 v=v[:k]
 if not v:return None
 ww=[alpha**i for i in range(len(v))];return sum(x*w for x,w in zip(v,ww))/sum(ww)

def predgap(gap,front,field,gate):
 return max(0.,min(3.5,REMG['intercept']+REMG['hist_gap_median_last5']*gap+REMG['hist_frontness_mean_last5']*front+REMG['field_size']*field+REMG['gate_fraction']*gate))

def core_m3(features):
 vv=[]
 for i,k in enumerate(F):
  v=features.get(k)
  vv.append(IMP[i] if v is None or not math.isfinite(v) else v)
 return INTER+sum(B[i]*(vv[i]-MU[i])/SD[i] for i in range(19))

def history():
 data={};seen=set();stats=collections.Counter()
 with (ROOT/'umadete.csv').open(encoding='cp932',newline='') as f:
  for row in csv.DictReader(f):
   stats['raw_rows']+=1;name=normname(row['馬名']);rid=row['レースID(新・馬番無16桁)'].strip();date=normdate(row['日付']);fin=ni(row['確定着順']);n=ni(row['出走頭数']) or ni(row['頭数']);sur=row['芝・ダート'].strip();dis=ni(row['距離']);ab=row['異常コード'].strip()
   if len(rid)!=16 or not name or not date:stats['bad_id_date_name']+=1;continue
   key=(name,rid)
   if key in seen:stats['duplicate_rows']+=1;continue
   seen.add(key)
   if ab not in ('','0') or sur not in ('芝','ダ') or not n or not 5<=n<=20 or fin is None or fin<1 or fin>n or dis is None:stats['bad_history']+=1;continue
   cs=[ni(row['通過'+str(i)]) for i in range(1,5)];first=next((x for x in cs if x is not None and 1<=x<=n),None)
   front=(n-first)/(n-1) if first is not None else None
   gap=nf(row['上3F地点差']);gap=gap if gap is not None and 0<=gap<=5 else None
   last3=nf(row['上り3F']);last3=last3 if last3 is not None and 28<=last3<=50 else None
   pci=nf(row[' PCI']);rpci=nf(row['レースPCI'])
   data.setdefault(name,[]).append({'date':date,'rid':rid,'surface':sur,'dist':dis,'n':n,'front':front,'gap':gap,'last3':last3,'pci':pci,'rpci':rpci})
 for rr in data.values():rr.sort(key=lambda z:(z['date'],z['rid']),reverse=True)
 stats['unique_valid']=sum(map(len,data.values()))
 return data,stats

def targets():
 races=collections.defaultdict(list);st=collections.Counter()
 for path in ['2026_2025_seiseki.csv','2026seiseki.csv']:
  with (ROOT/path).open(encoding='cp932',newline='') as f:
   for r in csv.DictReader(f):
    y=ni(r['年']);y=2000+y if y is not None and y<100 else y
    if y not in (2024,2025,2026):continue
    st['2024_2026_rows']+=1
    if str(ni(r['クラスコード'])) not in GRA or r['芝・ダ'].strip() not in ('芝','ダ'):continue
    n=ni(r['頭数']);no=ni(r['馬番']);fin=ni(r['確定着順']);ab=r['異常コード'].strip();dist=ni(r['距離']);name=normname(r['馬名'])
    if not n or not 12<=n<=18 or no is None or dist is None:continue
    if ab not in ('','0') or fin is None or not 1<=fin<=n:continue
    date=f'{y:04d}{int(r["月"]):02d}{int(r["日"]):02d}'
    rid=f'{date}_{r["場所"].strip()}_{int(r["レース番号"]):02d}'
    races[rid].append({'rid':rid,'date':date,'year':y,'name':name,'no':no,'n':n,'fin':fin,'surface':r['芝・ダ'].strip(),'distance':dist,'pop':ni(r['人気順']),'odds':nf(r['単勝オッズ'])})
 filtered={}
 for rid,rows in races.items():
  n=rows[0]['n']
  if len(rows)!=n or len({r['no'] for r in rows})!=n or len({r['name'] for r in rows})!=n or len({r['date'] for r in rows})!=1 or len({r['distance'] for r in rows})!=1 or len({r['surface'] for r in rows})!=1:st['incomplete_cards']+=1;continue
  if sum(r['fin']<=3 for r in rows)!=3 or sum(r['fin']==1 for r in rows)!=1:st['tie_or_bad_result']+=1;continue
  filtered[rid]=sorted(rows,key=lambda r:r['no'])
 st['full_races']=len(filtered)
 return filtered,st

def to_features(prior,metric_sur,meta,predGap,gate):
 a=prior[:5];same=[h for h in a if h['surface']==metric_sur]
 gap=[h['gap'] for h in a if h['gap'] is not None]
 pci=[h['pci'] for h in a if h['pci'] is not None];rpci=[h['rpci'] for h in a if h['rpci'] is not None];l3=[h['last3'] for h in a if h['last3'] is not None]
 front=[h['front'] for h in a if h['front'] is not None]
 prd=[h['pci']-h['rpci'] for h in a if h['pci'] is not None and h['rpci'] is not None]
 sprd=[h['pci']-h['rpci'] for h in same if h['pci'] is not None and h['rpci'] is not None]
 sl3=[h['last3'] for h in same if h['last3'] is not None]
 medprd=median(prd,0)
 x=dict(pred_gap=predGap,hist_gap_med=median(gap,.7),hist_pci_med=median(pci,50),hist_rpci_med=median(rpci,50),hist_last3f_med=median(l3,35.5),hist_last3f_mean=mean(l3,35.5),hist_last3f_sd=sd(l3,1),hist_front_mean=mean(front,.5528647823),hist_pr_diff_med=medprd,hist_pr_diff_mean=mean(prd,0),hist_pr_diff_sd=sd(prd,2),same_surface_pr_diff_med=median(sprd,medprd),same_surface_last3f_med=median(sl3,median(l3,35.5)),same_surface_n=len(same),hist_n=len(a),field_size=meta['n'],gate_frac=gate,distance=meta['distance'],surface_dirt=int(metric_sur=='ダ'))
 assert len(x)==len(F)
 return x

def horse_row(t,hist):
 # Non-race target inputs are exactly dated prior normal non-duplicate starts.
 prior=[h for h in hist.get(t['name'],[]) if h['date']<t['date']]
 surf=t['surface'];same=[h for h in prior if h['surface']==surf]
 n=t['n'];gate=(t['no']-1)/(n-1)
 # baseline historical 5 DISTINCT races, not current-main potentially duplicated 5 RAW rows
 gap5=median([x['gap'] for x in prior[:5] if x['gap'] is not None],.7)
 front5=mean([x['front'] for x in prior[:5] if x['front'] is not None],.5528647823)
 pg0=predgap(gap5,front5,n,gate)
 f0=to_features(prior,surf,t,pg0,gate)
 # Isolate history depth alone: both 5 and 10 use fixed alpha .8, identical all-surface gap semantics.
 allgap=[x['gap'] for x in prior if x['gap'] is not None]
 sgap=[x['gap'] for x in same if x['gap'] is not None]
 delta5=decayed(allgap,5);delta10=decayed(allgap,10)
 gap5dec=delta5 if delta5 is not None else gap5
 gap10dec=delta10 if delta10 is not None else gap5dec
 pg5=predgap(gap5dec,front5,n,gate)
 pg10=predgap(gap10dec,front5,n,gate)
 # Same-surface only alternative H004-like depth, valid when same-surface history>=10
 s5=decayed(sgap,5);s10=decayed(sgap,10)
 pg5s=predgap(s5 if s5 is not None else gap5,front5,n,gate)
 pg10s=predgap(s10 if s10 is not None else s5 if s5 is not None else gap5,front5,n,gate)
 # H005 variants preserve the same closing model feature vector f0; only pred_gap input changes.
 pg={'old5_med':pg0,'all5_decay':pg5,'all10_decay':pg10,'same5_decay':pg5s,'same10_decay':pg10s}
 for v in pg.values():assert 0<=v<=3.5
 scores={k:v-core_m3({**f0,'pred_gap':v}) for k,v in pg.items()}
 return {'rid':t['rid'],'year':t['year'],'no':t['no'],'name':t['name'],'fin':t['fin'],'surface':surf,'distance':t['distance'],'pop':t['pop'],'n_all':len(prior),'n_gap_all':len(allgap),'n_gap_same':len(sgap),'pg':pg,'score':scores,'fixed_close':core_m3(f0),'features_checksum':hashlib.sha256(json.dumps({k:v for k,v in f0.items() if k!='pred_gap'},sort_keys=True).encode()).hexdigest()[:12]}

def compare(rankrows,a,b):
 rowA=sorted(rankrows,key=lambda h:(h['score'][a],h['no']))[:3]
 rowB=sorted(rankrows,key=lambda h:(h['score'][b],h['no']))[:3]
 ids_a={r['no'] for r in rowA};ids_b={r['no'] for r in rowB}
 return {'hits_a':sum(r['fin']<=3 for r in rowA),'hits_b':sum(r['fin']<=3 for r in rowB),'match_a':ids_a,'match_b':ids_b,'changed':ids_a!=ids_b,'win_a':any(r['fin']==1 for r in rowA),'win_b':any(r['fin']==1 for r in rowB)}

def stats(rows):
 out={}
 for group,groupf in {'2024':lambda r:r['year']==2024,'2025':lambda r:r['year']==2025,'2026':lambda r:r['year']==2026,'2025_2026':lambda r:r['year']>=2025}.items():
  sub=[r for r in rows if groupf(r)]
  if not sub:continue
  d={'races':len(sub),'horses':sum(r['n'] for r in sub)}
  for scenario in [('old5_med','all10_decay'),('all5_decay','all10_decay'),('same5_decay','same10_decay')]:
   a,b=scenario;key=a+'__'+b
   for x in sub:
    z=x['paired'][key]; assert 0<=z['hits_a']<=3 and 0<=z['hits_b']<=3
   ch=[r for r in sub if r['paired'][key]['changed']]
   dif=np.array([r['paired'][key]['hits_b']-r['paired'][key]['hits_a'] for r in sub]);
   rng=np.random.default_rng(20261123);nboot=6000
   bs=np.mean(dif[rng.integers(0,len(dif),(nboot,len(dif)))],axis=1)
   d[key]={'races':len(sub),'switch_races':len(ch),'old_hits':int(sum(r['paired'][key]['hits_a'] for r in sub)),'new_hits':int(sum(r['paired'][key]['hits_b'] for r in sub)),'hit_difference':int(sum(dif)),'delta_per_race':float(np.mean(dif)),'ci95_delta_per_race':[float(np.quantile(bs,.025)),float(np.quantile(bs,.975))], 'improved_races':int(sum(v>0 for v in dif)),'worse_races':int(sum(v<0 for v in dif)),'equal_races':int(sum(v==0 for v in dif)),'candidate_win_in_top3_old':int(sum(r['paired'][key]['win_a'] for r in sub)),'candidate_win_in_top3_new':int(sum(r['paired'][key]['win_b'] for r in sub))}
  d['all10_gap_horses']=sum(r['n_all10'] for r in sub);d['same10_gap_horses']=sum(r['n_same10'] for r in sub)
  out[group]=d
 return out

def main():
 hist,hs=history();target,ts=targets()
 print('history',dict(hs),'targets',dict(ts),flush=True)
 full=[];races=[]
 for rid,card in target.items():
  hsrow=[horse_row(t,hist) for t in card]
  # Only races where at least 1 runner has 10 usable historical gap observations.
  # H005 uses 5/10 *valid gaps* and keeps all other fixed 19 source features.
  n10=sum(h['n_gap_all']>=10 for h in hsrow)
  if n10<1:continue
  paired={}
  for a,b in [('old5_med','all10_decay'),('all5_decay','all10_decay'),('same5_decay','same10_decay')]:
   paired[a+'__'+b]=compare(hsrow,a,b)
  full.extend(hsrow)
  races.append({'rid':rid,'year':card[0]['year'],'n':len(card),'surface':card[0]['surface'],'distance':card[0]['distance'],'n_all10':n10,'n_same10':sum(h['n_gap_same']>=10 for h in hsrow),'paired':paired})
 print('cohort',len(races),'races',len(full),'horses',flush=True)
 summary=stats(races);print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
 # publish private horse-and-race detail CSV ONLY locally; PUBLIC only aggregate findings.
 with (OUT/'h005_race_comparison_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
  fields=['rid','year','n','surface','distance','n_all10','n_same10']
  for a,b in [('old5_med','all10_decay'),('all5_decay','all10_decay'),('same5_decay','same10_decay')]:fields+=['change_'+a+'_'+b,'hits_old_'+a+'_'+b,'hits_new_'+a+'_'+b]
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
  for r in races:
   o={k:r[k] for k in fields[:7]}
   for a,b in [('old5_med','all10_decay'),('all5_decay','all10_decay'),('same5_decay','same10_decay')]:
    z=r['paired'][a+'__'+b];o['change_'+a+'_'+b]=int(z['changed']);o['hits_old_'+a+'_'+b]=z['hits_a'];o['hits_new_'+a+'_'+b]=z['hits_b']
   w.writerow(o)
 with (OUT/'h005_horse_comparison_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
  fields=['rid','year','no','name','fin','surface','distance','pop','n_all','n_gap_all','n_gap_same','features_checksum','pg_old5_med','pg_all5_decay','pg_all10_decay','pg_same5_decay','pg_same10_decay','score_old5_med','score_all5_decay','score_all10_decay','score_same5_decay','score_same10_decay']
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
  for h in full:
   o={k:h[k] for k in fields if k in h}
   o.update({'pg_'+k:v for k,v in h['pg'].items()});o.update({'score_'+k:v for k,v in h['score'].items()});w.writerow(o)
 manifest={'schema':'rsa-h005-20261123-shadow-v1','as_of_rule':'strict_date_before_target_and_name_16char_rid_dedup','source_main_finish600_model_sha':'7539949515b072ea69c87486385235e83fd8fd94','source_main_finish600_js_sha':'1f1178e3003b6162243ea7286a2d859325ff9d9a','baseline':'5 distinct valid prior starts, direct formula reconstruction','intervention':'remaining600 pred_gap scalar only','constant':'core_m3 19 feature values, coefficients, field, gate, prior 5 rows, and M3 rank logic','candidate':'0.8 decay all/same-surface gap over 5 vs 10 distinct dated starts; no model refit','eval_years':'2024 through 2026-10-04, previously researched','prediction_outcome':'M3 top3 membership 3-place actual, not price/probability/ROI','browser_parity':'NOT TESTED, JS production parser uses rows until PR7; Python as-of reconstruction','summary':summary,'source_rows':dict(hs),'target_stats':dict(ts)}
 (OUT/'H005_result_aggregate.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print('result',OUT/'H005_result_aggregate.json',flush=True)

if __name__=='__main__':main()