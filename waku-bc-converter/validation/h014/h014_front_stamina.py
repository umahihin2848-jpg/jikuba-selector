#!/usr/bin/env python3
"""H014 research only. Pre-race historical pressure+front-run survival and post-race pace/4C diagnostics.
No current race actual lap, 3C/4C, result, odds for pre-race features; final odds ONLY for retrospective diagnostics.
"""
import sys, json, pathlib, re, collections, time
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import brier_score_loss,roc_auc_score
ROOT=pathlib.Path('/mnt/data'); OUT=ROOT/'H014_先行馬余力耐性_20261123';OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'H012_全国4角と全ラップ_20261123'))
from h012_national_stage import build,prepare_results
from h012_asof_4c_all_courses import norm_name
SEED=20261123


def history():
 cols=['日付','馬名','レースID(新・馬番無16桁)','異常コード','芝・ダート','距離','出走頭数','通過3','通過4','確定着順','上り3F','R最速上3F','場所','人気','上3F地点差']
 d=pd.read_csv(ROOT/'umadete.csv',encoding='cp932',usecols=cols,low_memory=False,dtype={'レースID(新・馬番無16桁)':str})
 p=d['日付'].astype(str).str.extract(r'^\s*(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*$')
 y=pd.to_numeric(p[0],errors='coerce');m=pd.to_numeric(p[1],errors='coerce');day=pd.to_numeric(p[2],errors='coerce')
 date=(y*10000+m*100+day).fillna(-1).astype('int64')
 rid=d['レースID(新・馬番無16桁)'].astype(str).str.strip()
 ok=rid.str.fullmatch(r'\d{16}') & date.astype(str).eq(rid.str[:8]) & m.between(1,12) & day.between(1,31)
 for col in ['距離','出走頭数','通過3','通過4','確定着順','上り3F','R最速上3F','人気']:
  d[col]=pd.to_numeric(d[col],errors='coerce')
 ok &= d['芝・ダート'].isin(['芝','ダ']) & d['異常コード'].fillna(0).astype(str).str.strip().isin(['','0','0.0'])
 ok &= d['出走頭数'].between(5,20) & d['距離'].between(800,3600)
 ok &= d['通過4'].between(1,d['出走頭数']) & d['確定着順'].between(1,d['出走頭数'])
 d=d.loc[ok].copy();d['date']=date.loc[ok];d['rid']=rid.loc[ok];d['name']=d['馬名'].map(norm_name)
 # Important: if contradictory duplicate horse+rID values exist, exclude conflicted keys rather than favor outcome.
 k=['name','rid'];cnt=d.groupby(k,sort=False)['確定着順'].nunique();bad=cnt[cnt>1].index
 if len(bad):d=d.loc[~pd.MultiIndex.from_frame(d[k]).isin(bad)]
 d=d.drop_duplicates(k,keep='first');d=d.sort_values(['name','date'],ascending=[True,False])
 n=d['出走頭数'];d['pos4']=d['通過4']/n;d['pos3']=d['通過3']/n
 d['retention']=((d['確定着順']<=3)&(d['通過4']/n<=.25)).astype(float)
 d['front4']=(d['pos4']<=.25).astype(float)
 d['fade']=(d['確定着順']-d['通過4'])/(n-1)
 d['late_gap']=d['上り3F']-d['R最速上3F'];d.loc[~d['late_gap'].between(0,7),'late_gap']=np.nan
 by={name:g[['date','rid','芝・ダート','距離','pos4','front4','fade','late_gap','確定着順']].to_dict('records') for name,g in d.groupby('name',sort=False)}
 stats={'read_rows':int(len(pd.read_csv(ROOT/'umadete.csv',encoding='cp932',usecols=['馬名']))),'valid_unique_horse_runs':len(d),'names':len(by),'date_rid_strict':True,'contradictory_keys_removed':len(bad)}
 return by,stats

def prior_features(h,by):
 old=[x for x in by.get(norm_name(h['name']),[]) if x['date']<h['date'] and x['芝・ダート']==h['surface']][:8]
 if any(x['date']>=h['date'] for x in old):raise AssertionError('future race lookahead')
 same=[x for x in old if abs(x['距離']-h['distance'])<=400]
 def avg(rows,key,default):
  vv=np.asarray([x[key] for x in rows if pd.notna(x[key])],float);return float(np.mean(vv)) if len(vv) else default
 c=old[:5];front=[x for x in old if x['front4']>0];
 # smoothed per-horse 4C front survivor rate conditional on actual being front, fallback 25% approximate prevalence prior
 hold=(sum(int(x['確定着順']<=3) for x in front)+.45*3)/(len(front)+3)
 fade=(sum(max(0,x['fade']) for x in front)+.12*3)/(len(front)+3)
 return dict(prior_top3=(sum(int(x['確定着順']<=3) for x in old)+.2*5)/(len(old)+5),prior4=avg(c,'pos4',.5),prior4_sim=avg(same[:5],'pos4',.5),nold=len(c),nfront=min(len(front),8),
             prior_hold=hold,prior_fade=fade,prior_late=avg(old,'late_gap',1.1),prior_change=avg(old,'fade',0.),
             front_intent= min(.95,max(.05,1.12-1.5*avg(c,'pos4',.5))))

def prepare():
 race,horse,cnt,lc=build()
 keys=set(race.rid)
 # results exact per-horse key, only use 4C/3C/finish/3F as outcome
 # Complete results in H012 deliberately omit own last3f, retrieve via exact race, saddlecloth identity.
 cols=['年','月','日','場所','レース番号','馬番','確定着順','通過順3','通過順4','上がり3Fタイム','人気順']
 raw=pd.concat([pd.read_csv(ROOT/f,encoding='cp932',usecols=cols,low_memory=False) for f in ['2026_2025_seiseki.csv','2026seiseki.csv']],ignore_index=True)
 for col in ['年','月','日','レース番号','馬番'] : raw[col]=pd.to_numeric(raw[col],errors='coerce')
 raw['rid']=((raw['年']+2000).astype('Int64').astype(str).str.cat(raw['月'].astype('Int64').astype(str).str.zfill(2)).str.cat(raw['日'].astype('Int64').astype(str).str.zfill(2)))+'_'+raw['場所'].astype(str)+'_'+raw['レース番号'].astype('Int64').astype(str).str.zfill(2)
 out=raw[raw.rid.isin(keys)].copy();out['no']=out['馬番'].astype(int);out=out.drop(columns=['年','月','日','場所','レース番号','馬番'])
 if out.duplicated(['rid','no']).any(): raise ValueError('Duplicate race+saddlecloth in actual results')
 z=horse.merge(out,on=['rid','no'],how='left',validate='one_to_one').merge(race[['rid','early2','late3','last200_fade_sec','lull','grade','going','start_length_m']],on='rid',validate='many_to_one')
 assert len(z)==len(horse) and z['上がり3Fタイム'].notna().mean()>.98
 z['c3']=pd.to_numeric(z['通過順3'],errors='coerce');z['c4']=z['通過順4'];z['finish']=z['確定着順'];z['late3f']=pd.to_numeric(z['上がり3Fタイム'],errors='coerce')
 z['c3_front']=(z.c3/z.n<=.25)&z.c3.between(1,z.n)
 z['c4_front']=z.c4/z.n<=.25
 z['collapse4']=z.c4_front & ((z.finish-z.c4)>=4)
 z['drop_from3']=z.c3_front & ((z.finish-z.c3)>=4)
 z['stay_top3']=z.c4_front & (z.top3==1)
 z['drop3to4']=z.c3_front & ((z.c4-z.c3)>=2)
 z['collapse3']=z.c3_front & ((z.finish-z.c3)>=4)
 z['late_vs_best']=z.late3f-z.groupby('rid').late3f.transform('min')
 by,audit=history()
 feats=[prior_features(h,by) for h in z[['name','date','surface','distance']].to_dict('records')]
 z=pd.concat([z.reset_index(drop=True),pd.DataFrame(feats)],axis=1)
 z['gate']=(z.no-.5)/z.n;z['front_pressure']=z.groupby('rid').front_intent.transform('sum')/z.n
 # normalized market expected q is only diagnostic / afterthefact controlled models, not actual as-of user available quote
 return z,audit

def bin_pace(z):
 # Early segment must be comparable within profile and first length; fit course/reference only from 2016-2023
 base=z[z.year<=2023].drop_duplicates('rid').groupby('profile').agg(early_med=('early2','median'),early_sd=('early2','std'),train_races=('rid','size'))
 glob=z[z.year<=2023].drop_duplicates('rid').groupby('surface').agg(med=('early2','median'),sd=('early2','std'))
 x=z.join(base,on='profile');xx=x.join(glob,on='surface');
 x['early_med']=x.early_med.where(x.train_races>=20,xx.med);x['early_sd']=x.early_sd.where((x.train_races>=20)&(x.early_sd>.15),xx.sd)
 x['early_z']=((x.early_med-x.early2)/x.early_sd).clip(-3,3)
 x['stress_high']=x.early_z>=.5
 return x

def summarize(z):
 b=z[(z.c4_front)&(z.year>=2024)&(z.year<=2026)].copy();b['market_strong']=b.q>=.25
 a={}
 for label,g in [('all_front4',b),('high_actual_early_stress',b[b.stress_high]),('low_actual_early_stress',b[~b.stress_high])]:
  a[label]={'horses':len(g),'races':g.rid.nunique(),'top3':int(g.top3.sum()),'top3_rate':float(g.top3.mean()),'fade_ge4_rate':float(g.collapse4.mean()),'late3f_gap_mean':float(g.late_vs_best.mean()),'market_top3_expected':float(g.q.sum())}
 # Earlier observable stage: 3C-front is not the same cohort as 4C-front.
 b3=z[(z.c3_front)&(z.year>=2024)&(z.year<=2026)].copy()
 for label,g in [('all_c3front',b3),('high_stress_c3front',b3[b3.stress_high]),('low_stress_c3front',b3[~b3.stress_high])]:
  a[label]={'horses':len(g),'races':int(g.rid.nunique()),'top3_rate':float(g.top3.mean()),
            'drop3to4_at_least_2_places_pct':float(100*g.drop3to4.mean()),
            'drop3tofinish_at_least_4_places_pct':float(100*g.collapse3.mean())}
 for key,g in b.groupby(['stress_high','market_strong']):
  a[f'stress{int(key[0])}_market_strong{int(key[1])}']={'horses':len(g),'top3':int(g.top3.sum()),'top3_rate':float(g.top3.mean()),'fade_ge4_rate':float(g.collapse4.mean()),'market_top3_expected':float(g.q.sum()),'market_top3_ratio':float(g.top3.sum()/g.q.sum())}
 return a

def fit_evaluate(z):
 """Hindsight actual front4 subset ONLY to study survival mechanism; not pre-race final classification."""
 rows=z[z.c4_front].copy();train=rows.year.between(2019,2023)&(rows.nold>=2);test=rows.year.between(2024,2026)&(rows.nold>=2)
 core=['gate','prior4','prior4_sim','nold','front_pressure']
 general=core+['prior_top3','prior_late','prior_change']
 specific=general+['prior_hold','prior_fade','nfront']
 modes={'stage':core,'general_ability':general,'front_resilience':specific,'market_general':general+['q'],'market_front_resilience':specific+['q']}
 cat=['surface','profile'];t=rows.loc[test].copy();y=t.top3.to_numpy()
 for mode,cols in modes.items():
  pre=ColumnTransformer([('numeric',StandardScaler(),cols),('profile',OneHotEncoder(handle_unknown='ignore',min_frequency=20),cat)])
  model=Pipeline([('pre',pre),('lr',LogisticRegression(C=.5,max_iter=600))])
  model.fit(rows.loc[train,cols+cat],rows.loc[train,'top3'])
  t['p_'+mode]=model.predict_proba(t[cols+cat])[:,1]
 # all scoring is among actual 4C-front horses known after race, so NOT a real pre-race 3rd-place prediction.
 def row_metrics(g):
  o={'horses':len(g),'races':int(g.rid.nunique()),'top3':int(g.top3.sum())}
  for name in modes:o['brier_'+name]=float(np.mean((g['p_'+name]-g.top3)**2))
  o['gain_front_over_general']=o['brier_general_ability']-o['brier_front_resilience']
  o['gain_front_over_market_general']=o['brier_market_general']-o['brier_market_front_resilience']
  return o
 met={str(k):row_metrics(g) for k,g in [('all',t),*list(t.groupby('year'))]}
 rand=np.random.default_rng(SEED)
 for key,a,b in [('increment_over_generic','p_general_ability','p_front_resilience'),('increment_over_market_diagnostic','p_market_general','p_market_front_resilience')]:
  gain=(t[a]-t.top3)**2-(t[b]-t.top3)**2
  v=t.assign(gain=gain).groupby('rid').gain.mean().to_numpy();N=len(v)
  boot=np.array([np.mean(v[rand.integers(0,N,size=N)]) for _ in range(3000)])
  met[key]={'race_mean_gain':float(v.mean()),'ci95':[float(x) for x in np.quantile(boot,[.025,.975])]}
 # separate diagnostics: pre-race prior strength and actual early lap stress; not causal or forecasted stress
 t['prior_strength_high']=t.prior_top3>=.20
 d=t.groupby(['stress_high','prior_strength_high']).agg(n=('top3','size'),top3=('top3','sum'),fade=('collapse4','mean'),actual_q=('q','sum'),late=('late_vs_best','mean')).reset_index()
 strong_tab=d.to_dict('records')
 # H013 back-of-field list is nearly disjoint from 4C leader cohort; no front-resilience cut should be applied there
 flagged=pd.read_csv(ROOT/'H013_全国4角危険位置_20261123'/'H013_危険馬_過去検証_PRIVATE.csv',encoding='utf-8-sig')
 flagged_key=set(zip(flagged['レースID'].astype(str),flagged['馬番'].astype(int)))
 x=z[z.year>=2024].copy();x['h013_flag']=[(r,int(no)) in flagged_key for r,no in zip(x.rid,x.no)]
 flagged_out={'flagged_horses':int(x.h013_flag.sum()),'flagged_actual4c_front':int((x.h013_flag&x.c4_front).sum()),'reason':'H013 flags are primarily predicted rear horses; evaluating a forward-holder risk score on them is a category mismatch.'}
 return met,strong_tab,flagged_out,t


def forecast_pace(z):
 """Can a historical all-entrants front-pressure score forecast ACTUAL early speed? Score racing events, no current lap in predictors."""
 x=z.drop_duplicates('rid').copy();x['year']=x.date//10000
 x['nold_mean']=z.groupby('rid').nold.transform('mean').loc[x.index].to_numpy()
 x['known3_share']=z.groupby('rid').nold.transform(lambda a:(a>=3).mean()).loc[x.index].to_numpy()
 x['front_pressure']=z.groupby('rid').front_intent.transform('sum').loc[x.index].to_numpy()/x.n.to_numpy()
 x['high']=x.stress_high.astype(int)
 train=x.year.between(2019,2023);test=x.year.between(2024,2026)
 cats=['surface','profile'];base=[];added=['front_pressure','known3_share']
 res={}
 for label,cols in [('course_only',base),('course_plus_field_front_pressure',added)]:
  tform=ColumnTransformer([('numeric',StandardScaler(),cols),('profile',OneHotEncoder(handle_unknown='ignore',min_frequency=10),cats)])
  mod=Pipeline([('transform',tform),('lr',LogisticRegression(max_iter=500,C=.5))]);mod.fit(x.loc[train,cols+cats],x.loc[train,'high'])
  p=mod.predict_proba(x.loc[test,cols+cats])[:,1];y=x.loc[test,'high'].to_numpy()
  res[label]={'races':int(test.sum()),'auc':float(roc_auc_score(y,p)),'brier':float(np.mean((p-y)**2))}
 return res


def full_field_asof_test(z):
 """Proper executable all-horse pre-race score increment. Actual lap/4C never features."""
 rows=z[z.nold>=2].copy(); train=rows.year.between(2019,2023);test=rows.year.between(2024,2026)
 cat=['surface','profile'];core=['gate','prior4','prior4_sim','nold','front_pressure','prior_top3','prior_late','prior_change'];more=['prior_hold','prior_fade','nfront']
 rows['hold_x_front']=rows.prior_hold*rows.front_intent
 rows['hold_x_pressure']=rows.prior_hold*rows.front_intent*rows.front_pressure
 modes={'historical_generic':core,'plus_front_endurance':core+more+['hold_x_front','hold_x_pressure'],
        'market_generic_diagnostic':core+['q'],'market_plus_front_diagnostic':core+more+['hold_x_front','hold_x_pressure','q']}
 targets={'front_and_top3':(rows.c4_front & (rows.top3==1)).astype(int),'all_top3':rows.top3.astype(int)}
 result={}
 for label,y in targets.items():
  t=rows.loc[test].copy();t['y']=y.loc[test]
  for name,cols in modes.items():
   pre=ColumnTransformer([('numeric',StandardScaler(),cols),('profile',OneHotEncoder(handle_unknown='ignore',min_frequency=20),cat)])
   m=Pipeline([('pre',pre),('lr',LogisticRegression(C=.5,max_iter=550))]);m.fit(rows.loc[train,cols+cat],y.loc[train]);t['p_'+name]=m.predict_proba(t[cols+cat])[:,1]
  details={}
  for period,sub in [('all',t),*[(str(yr),g) for yr,g in t.groupby('year')]]:
   rr={'n':len(sub),'races':int(sub.rid.nunique()),'positives':int(sub.y.sum())}
   for mode in modes:rr[mode]=float(np.mean((sub['p_'+mode]-sub.y)**2))
   rr['gain_front_endurance']=rr['historical_generic']-rr['plus_front_endurance'];rr['gain_front_over_market']=rr['market_generic_diagnostic']-rr['market_plus_front_diagnostic']
   details[period]=rr
  random=np.random.default_rng(SEED+len(label));intervals={}
  for name,base,new in [('increment_history','historical_generic','plus_front_endurance'),('increment_market','market_generic_diagnostic','market_plus_front_diagnostic')]:
   race=((t['p_'+base]-t.y)**2-(t['p_'+new]-t.y)**2).groupby(t.rid).mean().to_numpy()
   N=len(race);bs=np.asarray([race[random.integers(0,N,size=N)].mean() for _ in range(2500)])
   intervals[name]={'gain_per_race':float(race.mean()),'ci95':[float(v) for v in np.quantile(bs,[.025,.975])]}
  result[label]={'performance':details,'interval':intervals}
 return result


def forecast_pace_extended(z):
 x=z.drop_duplicates('rid').copy();x['nold_mean']=z.groupby('rid').nold.transform('mean').loc[x.index].to_numpy()
 x['known3_share']=z.groupby('rid').nold.transform(lambda a:(a>=3).mean()).loc[x.index].to_numpy()
 x['front_pressure']=z.groupby('rid').front_intent.transform('sum').loc[x.index].to_numpy()/x.n.to_numpy()
 x['high']=x.stress_high.astype(int)
 train=x.year.between(2019,2023);test=x.year.between(2024,2026)
 cat=['surface','profile'];modes={'course_only':[],'course_plus_history_coverage':['known3_share'],
 'course_plus_front_pressure':['front_pressure'],'course_plus_pressure_and_coverage':['front_pressure','known3_share']}
 t=x.loc[test].copy();out={}
 for mode,cols in modes.items():
  pre=ColumnTransformer([('num',StandardScaler(),cols),('profile',OneHotEncoder(handle_unknown='ignore',min_frequency=10),cat)])
  m=Pipeline([('pre',pre),('lr',LogisticRegression(C=.5,max_iter=500))]);m.fit(x.loc[train,cols+cat],x.loc[train,'high']);t['p_'+mode]=m.predict_proba(t[cols+cat])[:,1]
 for period,g in [('all',t),*[(str(yr),v) for yr,v in t.groupby('year')]]:
  d={'races':len(g),'early_stress_pct':float(g.high.mean())}
  for mode in modes:d[mode]={'brier':float(np.mean((g['p_'+mode]-g.high)**2)),'auc':float(roc_auc_score(g.high,g['p_'+mode]))}
  out[period]=d
 r=((t.p_course_only-t.high)**2-(t.p_course_plus_front_pressure-t.high)**2).to_numpy();random=np.random.default_rng(SEED);N=len(r)
 bs=np.asarray([r[random.integers(0,N,size=N)].mean() for _ in range(3000)])
 out['ci_front_pressure_increment']=[float(a) for a in np.quantile(bs,[.025,.975])]
 return out


def forecast_actual_front_collapse(z):
 """Ex-ante forecast of race event: >=50% observed 4C-front horses lose at least 4 ranks by finish.
 Entire current-race actual 4C and finish used ONLY as label, never feature. Proxies from past runner rows.
 """
 g=z.groupby('rid',sort=False)
 a=g.agg(year=('year','first'),profile=('profile','first'),surface=('surface','first'),distance=('distance','first'),
         n=('top3','size'),n_front_actual=('c4_front','sum'),n_collapsed_actual=('collapse4','sum'),
         expected_front_count=('front_intent','sum'),known_frac=('nold',lambda s:float((s>=2).mean())),
         mean_strength=('prior_top3','mean'),mean_late=('prior_late','mean'),mean_prior_hold=('prior_hold','mean'),
         mean_prior_fade=('prior_fade','mean'),mean_prior4=('prior4','mean'))
 a['collapse_rate']=a.n_collapsed_actual/a.n_front_actual
 a['collapse_event']=(a.collapse_rate>=.50).astype(int)
 weighted=z.assign(weight=z.front_intent,whold=z.front_intent*z.prior_hold,
                   wstrength=z.front_intent*z.prior_top3,wfade=z.front_intent*z.prior_fade,
                   wlate=z.front_intent*z.prior_late,front_confident=(z.front_intent>=.65).astype(int)).groupby('rid').agg(
                    whold=('whold','sum'),wstrength=('wstrength','sum'),wfade=('wfade','sum'),wlate=('wlate','sum'),
                    n_expected_strongfront=('front_confident','sum'))
 a=a.join(weighted)
 for k in ['whold','wstrength','wfade','wlate']:a[k]=a[k]/a.expected_front_count
 a['pressure']=a.expected_front_count/a.n
 train=a.year.between(2019,2023);test=a.year.between(2024,2026)
 modes={'course_only':[],'course_plus_front_congestion':['pressure','n_expected_strongfront','known_frac'],
        'course_plus_predicted_front_strength':['pressure','n_expected_strongfront','known_frac','wstrength','mean_late'],
        'course_plus_prior_front_endurance':['pressure','n_expected_strongfront','known_frac','wstrength','mean_late','whold','wfade']}
 t=a.loc[test].copy()
 for label,cols in modes.items():
  pre=ColumnTransformer([('numeric',StandardScaler(),cols),('profile',OneHotEncoder(handle_unknown='ignore',min_frequency=10),['profile'])])
  model=Pipeline([('pre',pre),('lr',LogisticRegression(C=.6,max_iter=550))]);model.fit(a.loc[train,cols+['profile']],a.loc[train,'collapse_event'])
  t['p_'+label]=model.predict_proba(t[cols+['profile']])[:,1]
 result={}
 for period,g in [('all',t),*[(str(yr),gg) for yr,gg in t.groupby('year')]]:
  d={'races':len(g),'event_rate':float(g.collapse_event.mean()),'mean_front_collapse_fraction':float(g.collapse_rate.mean())}
  for lab in modes:d[lab]={'auc':float(roc_auc_score(g.collapse_event,g['p_'+lab])),'brier':float(np.mean((g['p_'+lab]-g.collapse_event)**2))}
  result[period]=d
 rng=np.random.default_rng(SEED);ci={}
 for diff,base,added in [('congestion_gain','course_only','course_plus_front_congestion'),
    ('strength_gain','course_plus_front_congestion','course_plus_predicted_front_strength'),
    ('endurance_gain','course_plus_predicted_front_strength','course_plus_prior_front_endurance')]:
  arr=((t['p_'+base]-t.collapse_event)**2-(t['p_'+added]-t.collapse_event)**2).to_numpy();n=len(arr)
  samples=np.array([arr[rng.integers(0,n,size=n)].mean() for _ in range(3000)])
  ci[diff]={'mean':float(arr.mean()),'ci95':[float(v) for v in np.quantile(samples,[.025,.975])]}
 result['paired_cis']=ci
 a_out=a.reset_index()[['rid','year','profile','n','n_front_actual','n_collapsed_actual','collapse_rate','collapse_event','pressure','whold','wstrength','wfade','known_frac']]
 # output only anonymous condition x year aggregate, no individual names or current race predictions
 co=a_out.groupby(['profile','year']).agg(races=('rid','size'),collapse_event_rate=('collapse_event','mean'),collapse_mean=('collapse_rate','mean'),expected_pressure=('pressure','mean'),past_front_strength=('wstrength','mean'),past_front_survival=('whold','mean')).reset_index()
 co.to_csv(OUT/'H014_COURSE_FRONT_COLLAPSE_ANON.csv',index=False,encoding='utf-8-sig')
 return result


def descriptive_course(z):
 x=z[(z.year>=2024)&(z.c4_front)].copy()
 co=x.groupby('profile').agg(venue=('venue','first'),surface=('surface','first'),distance=('distance','first'),
                              races=('rid','nunique'),front_horses=('top3','size'),front_top3=('top3','sum'),
                              drop4=('collapse4','mean'),late_vs_fastest=('late_vs_best','mean'),
                              high_stress_n=('stress_high','sum'),high_stress_top3=('top3',lambda v:int(v[x.loc[v.index,'stress_high']].sum())),
                              low_stress_top3=('top3',lambda v:int(v[~x.loc[v.index,'stress_high']].sum()))).reset_index()
 co['top3_rate']=co.front_top3/co.front_horses
 co['high_stress_top3_rate']=co.high_stress_top3/co.high_stress_n.where(co.high_stress_n>0)
 co['low_stress_top3_rate']=co.low_stress_top3/(co.front_horses-co.high_stress_n).where(co.front_horses>co.high_stress_n)
 co['sample_quality']=np.select([co.races>=30,co.races>=15],['30R+','15-29R'],default='<15R reference only')
 co.to_csv(OUT/'H014_87_COURSE_OBSERVED_FRONT_RESILIENCE.csv',index=False,encoding='utf-8-sig')
 # Distinguish descriptive high-pace group from trained forecast; cluster-resampled effect by actual race
 ra=x.groupby('rid').agg(high=('stress_high','first'),n=('top3','size'),s=('top3','sum'),drop=('collapse4','sum')).reset_index()
 v=ra[['high','n','s','drop']].to_numpy(dtype=float);rng=np.random.default_rng(SEED)
 boots=[]
 for _ in range(3000):
  r=v[rng.integers(0,len(v),size=len(v))];hi=r[r[:,0]>0];lo=r[r[:,0]==0]
  boots.append((hi[:,2].sum()/hi[:,1].sum()-lo[:,2].sum()/lo[:,1].sum(),
                hi[:,3].sum()/hi[:,1].sum()-lo[:,3].sum()/lo[:,1].sum()))
 ci=np.quantile(boots,[.025,.975],axis=0)
 return {'profiles':int(co.profile.nunique()),'profiles_ge15r':int((co.races>=15).sum()),
 'actual_front_top3_high_minus_low_ci95':[float(ci[0,0]),float(ci[1,0])],
 'actual_front_drop4_high_minus_low_ci95':[float(ci[0,1]),float(ci[1,1])]}

def run():
 t0=time.time();z,audit=prepare();z=bin_pace(z)
 descriptive=summarize(z);metrics,tab,flagged,evalrows=fit_evaluate(z);pace_test=forecast_pace_extended(z);end_to_end=full_field_asof_test(z);front_collapse=forecast_actual_front_collapse(z);course_detail=descriptive_course(z)
 counts={'courses':z.profile.nunique(),'races':z.rid.nunique(),'horses':len(z),'old_data':audit,'history_2plus':int((z.nold>=2).sum()),'front4_horses':int(z.c4_front.sum()),'front3_horses':int(z.c3_front.sum()),'elapsed_seconds':time.time()-t0}
 result={'coverage':counts,'descriptive_2024_26':descriptive,'predict_front4_top3_given_actual_front4':metrics,'prior_sustain_group_diagnostics':tab,'h013_flag_diagnostics':flagged,'predict_actual_high_early_stress':pace_test,'full_field_prior_only_prediction':end_to_end,'race_level_front_fade_prediction':front_collapse,'course_descriptive_summary':course_detail,
 'warnings':['Current lap stress and current 3C/4C used ONLY for descriptive labels; actual front4 membership conditions the front-retention test; cannot infer pre-race front4 membership from these metrics','Past 4C survival proxy from previous 8 starts is sparse in 2019-23 training; 2024-26 previously explored; not unseen evidence','Final closing market q used only for retrospective calibration comparison, not truly available before start','No horse-level complete section times / physiological energy reserves observable, so no direct proof of loss of stamina.']}
 (OUT/'H014_AGGREGATE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,default=lambda o:float(o) if isinstance(o,np.floating) else int(o)),encoding='utf-8')
 evalrows.drop(columns=['name','rid']).groupby(['profile','year']).agg(n=('top3','size'),top3=('top3','sum'),brier_stage=('p_stage',lambda s:float(np.mean((s-evalrows.loc[s.index,'top3'])**2))),brier_stamina=('p_front_resilience',lambda s:float(np.mean((s-evalrows.loc[s.index,'top3'])**2)))).reset_index().to_csv(OUT/'H014_COURSE_ANON.csv',index=False,encoding='utf-8-sig')
 print(json.dumps(result,ensure_ascii=False,indent=2)[:14000]);return result
if __name__=='__main__':run()