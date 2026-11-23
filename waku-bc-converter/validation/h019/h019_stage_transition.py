#!/usr/bin/env python3
"""H019 as-of 3C->4C transition signal / retrospective H018 flag audit.
Uses frozen H018 predicted probabilities, joined 2024-26 result labels, strictly older
per-horse histories. NEVER uses this race's 3C/4C/finish/market to predict.
H017/H018 test years repeatedly explored in preceding studies, not pristine holdout.
"""
import json, pathlib, re
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from scipy.special import expit, logit
ROOT=pathlib.Path('/mnt/data');DIR=pathlib.Path(__file__).parent
SRC=ROOT/'H018_全頭同時4角順位_20261124';TEST=(SRC/'H018_全頭同時4角位置_馬別PRIVATE.csv')
RISK=(SRC/'H013_危険馬_過去検証_PRIVATE.csv')
HIST=ROOT/'h019_history_clean.pkl'


def load_target():
 a=pd.read_csv(TEST,encoding='utf-8-sig');a['name']=a.name.astype(str).str.strip();a['rid']=a.rid.astype(str)
 res=[]
 for fn in ['2026_2025_seiseki.csv','2026seiseki.csv']:
  res.append(pd.read_csv(ROOT/fn,encoding='cp932',low_memory=False))
 r=pd.concat(res,ignore_index=True)
 date=20000000+r['年'].astype(int)*10000+r['月'].astype(int)*100+r['日'].astype(int)
 r['date']=date
 r['rid']=r['date'].astype(str)+'_'+r['場所'].astype(str).str.strip()+'_'+r['レース番号'].astype(int).astype(str).str.zfill(2)
 r['no']=r['馬番'].astype(int);r['name_r']=r['馬名'].astype(str).str.strip()
 r['fullprofile']=r['場所'].astype(str).str.strip()+r['芝・ダ'].astype(str).str.strip()+r['距離'].astype(int).astype(str)+'m'
 cols=['rid','no','date','name_r','fullprofile','確定着順','通過順1','通過順2','通過順3','通過順4','頭数','上がり3Fタイム','単勝オッズ','人気順','異常コード','距離']
 assert not r.duplicated(['rid','no']).any() and not a.duplicated(['rid','no']).any()
 d=a.merge(r[cols],on=['rid','no'],how='left',validate='one_to_one',indicator=True)
 assert (d._merge=='both').all() and (d.name==d.name_r).all() and (d.profile==d.fullprofile).all()
 assert (d.top3==(d['確定着順']<=3).astype(int)).all()
 assert len(d)==14876 and d.rid.nunique()==977
 flags=pd.read_csv(RISK,encoding='utf-8-sig')[['レースID','馬番']].rename(columns={'レースID':'rid','馬番':'no'}).assign(h013=1)
 d=d.merge(flags,on=['rid','no'],how='left',validate='one_to_one');d['h013']=d.h013.fillna(0).astype(int)
 d['h018_flag']=((d.h013==1)&(d.p_zone4_joint>=.5)&(d.adjusted_finish_sensitivity<=.1)).astype(int)
 assert d.h018_flag.sum()==203 and d.loc[d.h018_flag.eq(1),'top3'].sum()==10
 d['c3f']=d['通過順3']/d['頭数'];d['c4f']=d['通過順4']/d['頭数']
 d['early_obs']=d['通過順1'].where(d['通過順1']>0,d['通過順2'].where(d['通過順2']>0,np.nan))
 d['earlyf']=d['early_obs']/d['頭数']
 d['c3back']=d.c3f>.5;d['c4back']=d.c4f>.5
 d['c3c4_move']=d['通過順3']-d['通過順4'];d['c3c4_push2']=(d.c3c4_move>=2).astype(int)
 d['c4finish_move']=d['通過順4']-d['確定着順']
 d['trajectory']=np.select([~d.c3back&~d.c4back,~d.c3back&d.c4back,d.c3back&~d.c4back,d.c3back&d.c4back],['前→前','前→後','後→前','後→後'],default='不明')
 return d


def extract_hist(h,name,raceday,surface,maxstarts=5):
 """Restrict to past unique RID, same surface; no current and future race even if same date."""
 old=h[(h.date<raceday)&(h['芝・ダート']==surface)]
 return old.sort_values(['date','rid16'],ascending=False).head(maxstarts)


def attach_history(d,h):
 h=h.copy();h['date']=h.date.astype(int);h['dist']=pd.to_numeric(h['距離'],errors='coerce')
 grouped={nm:v for nm,v in h.groupby('name',sort=False)}
 # pre-race 5 latest completed same-surface distinct RID; no target outcome variables
 columns=['hist_n','hist_c3_mean','hist_c4_mean','hist_move34_mean','hist_push2_rate','hist_move34_sd','hist_late_3f_delta','hist_c3c4_rescue_rate','hist_back_c3_rate','hist_prev3c_last','hist_prev_move_last','hist_distance_delta']
 arr=[]
 for x in d[['name','date','surface','距離']].itertuples(index=False,name=None):
  name,day,surf,dist=x;hh=grouped.get(name)
  if hh is None:
   arr.append([0]+[np.nan]*(len(columns)-1));continue
  hh=extract_hist(hh,name,int(day),surf)
  if len(hh)==0:
   arr.append([0]+[np.nan]*(len(columns)-1));continue
  m=hh.move34.to_numpy(float);p=hh.push34.to_numpy(float);c3=hh.c3frac.to_numpy(float);c4=hh.c4frac.to_numpy(float)
  rescue=np.mean((c3>.5)&(c4<=.5));t=hh.time3f_delta.to_numpy(float)
  dist_hist=pd.to_numeric(hh.dist,errors='coerce').to_numpy(float)
  arr.append([len(hh),np.mean(c3),np.mean(c4),np.mean(m),np.mean(p),np.std(m),np.nanmean(t) if np.isfinite(t).any() else np.nan,rescue,np.mean(c3>.5),c3[0],m[0],np.nanmean(abs(dist_hist-dist)/max(float(dist),1))])
 for j,col in enumerate(columns):d[col]=np.asarray(arr,float)[:,j]
 for col in columns[1:]:d[col]=d[col].astype(float)
 return d


def feature_array(d,cols,medians=None):
 x=d[cols].to_numpy(float)
 if medians is None:medians=np.nanmedian(x,axis=0)
 meds=np.where(np.isfinite(medians),medians,0)
 x=np.where(np.isfinite(x),x,meds)
 return x,meds


def budget3(d,prob):
 output=np.zeros(len(d))
 for rid,ids in d.groupby('rid',sort=False).indices.items():
  ids=np.asarray(ids);p=np.clip(prob[ids],1e-6,1-1e-6);z=logit(p)
  lo,hi=-25.,25.
  for _ in range(60):
   m=(lo+hi)/2
   if expit(z+m).sum()<3:lo=m
   else:hi=m
  output[ids]=expit(z+(lo+hi)/2)
 return output


def race_bootstrap(df,pa,pb,seed=19024,draws=3000):
 y=df.top3.to_numpy(float)
 gains=(pa-y)**2-(pb-y)**2
 rr=df.rid.to_numpy();means=pd.Series(gains).groupby(rr).mean().to_numpy()
 rng=np.random.default_rng(seed);boots=np.mean(means[rng.integers(0,len(means),(draws,len(means)))],axis=1)
 return {'race_mean_gain':float(means.mean()),'ci95':np.quantile(boots,[.025,.975]).tolist(), 'races':len(means)}


def top3_hits(df,p):
 return int(df.assign(p=p).sort_values(['rid','p','no'],ascending=[True,False,True]).groupby('rid').head(3).top3.sum())


def metrics(df,p):
 y=df.top3.to_numpy(float)
 return {'horses':len(df),'races':df.rid.nunique(),'brier':float(np.mean((p-y)**2)), 'top3_hits':top3_hits(df,p)}


def evaluate():
 d=load_target();h=pd.read_pickle(HIST)
 d=attach_history(d,h)
 assert (d.hist_n.between(0,5)).all()
 assert d.loc[d.h018_flag.eq(1)].shape[0]==203
 d.sort_values(['rid','no'],inplace=True);d.reset_index(drop=True,inplace=True)
 # H018 frozen model, no new model training for 4C probabilities. Train only transition rescues on 2024
 # to avoid choosing importance weights based on 2025/26 (already-explored historical period).
 train=d[d.year.eq(2024)].copy();test=d[d.year.ge(2025)].copy()
 base=['hist_n','p_zone1_joint','p_zone2_joint','p_zone3_joint','p_zone4_joint','front_pressure','prior_late','prior_hold']
 added=['hist_move34_mean','hist_push2_rate','hist_move34_sd','hist_c3c4_rescue_rate','hist_prev_move_last','hist_c3_mean','hist_prev3c_last']
 models={};s_train={};s_test={}
 for variant,cols in [('baseline',base),('plus_prior_stage',base+added)]:
  xt,med=feature_array(train,cols);xv,_=feature_array(test,cols,med)
  scaler=StandardScaler().fit(xt);xt=scaler.transform(xt);xv=scaler.transform(xv)
  model=LogisticRegression(C=.3,max_iter=500).fit(xt,train.c3c4_push2.to_numpy(int))
  pred=model.predict_proba(xv)[:,1]
  s_test[variant]=pred
  actual=test.c3c4_push2.to_numpy(int)
  models[variant]={'auc':float(roc_auc_score(actual,pred)),'brier':float(np.mean((actual-pred)**2)), 'mean_pred':float(pred.mean()),'observed':float(actual.mean()),'coeff':dict(zip(cols,map(float,model.coef_[0])))}
 # Fit small incremental stacked finish model based on as-of H018 output + prior stage measurements, 2024 only.
 # Define control logit as fixed H018 top3 forecast (no retraining on test). New data features correlate with prior
 # 4C forecast; compare new signals and calibration to base refit for fair comparison.
 outcome_cols_base=['adjusted_finish_sensitivity','hist_n']
 outcome_cols_extra=['hist_move34_mean','hist_push2_rate','hist_c3c4_rescue_rate','hist_c3_mean','hist_prev_move_last']
 for variant,cols in [('refit_base',outcome_cols_base),('add_stage',outcome_cols_base+outcome_cols_extra)]:
  tr,med=feature_array(train,cols);te,_=feature_array(test,cols,med)
  tr[:,0]=logit(np.clip(tr[:,0],1e-6,1-1e-6));te[:,0]=logit(np.clip(te[:,0],1e-6,1-1e-6))
  std=StandardScaler().fit(tr);mdl=LogisticRegression(C=.3,max_iter=500).fit(std.transform(tr),train.top3)
  pred=budget3(test,mdl.predict_proba(std.transform(te))[:,1]);s_test[variant]=pred
  models[variant]=metrics(test,pred)
  models[variant]['coeff']=dict(zip(cols,map(float,mdl.coef_[0])))
 s_test['frozen_h018']=test.adjusted_finish_sensitivity.to_numpy(float)
 models['frozen_h018']=metrics(test,s_test['frozen_h018'])
 models['final_market_retrospective']=metrics(test,test.q.to_numpy(float))
 models['stage_v_refit_ci']=race_bootstrap(test,s_test['refit_base'],s_test['add_stage'])
 models['stage_v_frozen_ci']=race_bootstrap(test,s_test['frozen_h018'],s_test['add_stage'])
 # stage mechanics full 977R (post-race C3->C4) for H018 flagged cohort
 f=d[d.h018_flag.eq(1)].copy()
 stage={}
 for k,g in f.groupby('trajectory'):
  stage[k]={'n':len(g),'top3':int(g.top3.sum()),'rate':float(g.top3.mean()),'market_expected':float(g.q.sum()),'c3_to_c4_gain_mean':float(g.c3c4_move.mean())}
 year={}
 for yr,g in d.groupby('year'):
  fg=g[g.h018_flag.eq(1)];year[str(yr)]={'races':int(g.rid.nunique()),'horses':len(g),'h018_flags':len(fg),'flag_top3':int(fg.top3.sum()),'expected_by_final_market':float(fg.q.sum()),'c3c4_push2_actual_rate':float(g.c3c4_push2.mean())}
 # prior signal conditional on flagged 203: train-only median threshold, not optimized for flag.
 med_train=float(train['hist_move34_mean'].median())
 f['past_34_push_above_train_median']=f.hist_move34_mean>med_train
 groups={}
 for key,g in f.groupby('past_34_push_above_train_median'):
  groups[str(bool(key))]={'n':len(g),'top3':int(g.top3.sum()),'expected':float(g.q.sum()),'mean_move34':float(g.hist_move34_mean.mean()),'actually_c3_to_c4_rear_to_front':int(((g.c3back)&(~g.c4back)).sum())}
 # plot period only 2025/26 last cohort, estimated push probability as-of (2024 train)
 test=test.copy();test['estimated_push34']=s_test['plus_prior_stage'];test['push_pred_baseline']=s_test['baseline'];test['top3_h019_asof']=s_test['add_stage'];test['top3_refit_base']=s_test['refit_base']
 test.to_csv(DIR/'H019_test_horses_PRIVATE.csv',index=False,encoding='utf-8-sig')
 f.to_csv(DIR/'H019_H018_203_cohort_POSTRACE_PRIVATE.csv',index=False,encoding='utf-8-sig')
 # anonymous stage course outcome summary, mark insufficient n
 rows=[]
 for prof,g in d.groupby('profile'):
  ff=g[g.h018_flag.eq(1)]
  rows.append({'course':prof,'surface':g.surface.iloc[0],'races':int(g.rid.nunique()),'horses':len(g),
   'observed_C3rear_to_C4front':int(((g.c3back)&(~g.c4back)).sum()),
   'C3rear_C4front_3rd':int(g.loc[g.c3back&~g.c4back,'top3'].sum()),
   'observed_C3rear_C4rear':int(((g.c3back)&(g.c4back)).sum()),
   'C3rear_C4rear_3rd':int(g.loc[g.c3back&g.c4back,'top3'].sum()),
   'H018_flagged':len(ff),'flag_top3':int(ff.top3.sum()),'flag_final_market_expected':float(ff.q.sum())})
 pd.DataFrame(rows).sort_values(['surface','course']).to_csv(DIR/'H019_評価対象83コース_3角4角遷移_匿名.csv',index=False,encoding='utf-8-sig')
 result={
 'study':'H019 observed stage transition and strictly earlier horse-specific ability to push from 3C to 4C; retrospective H018 203 risk cohort',
 'population':{'historical_horses':int(h.name.nunique()),'historical_distinct_horse_runs':len(h),'target_races':d.rid.nunique(),'target_horses':len(d),'2024_train_races':train.rid.nunique(),'2025_26_test_races':test.rid.nunique()},
 'join':{'exact_rid_no_matches':len(d),'horse_name_and_course_matched':True,'c1_available':int(d.early_obs.notna().sum()),'real_C1_available':int(d['通過順1'].gt(0).sum()),'C3_C4_available':int((d['通過順3'].gt(0)&d['通過順4'].gt(0)).sum())},
 'H018_flag':{'horses':len(f),'races':int(f.rid.nunique()),'actual_top3':int(f.top3.sum()),'closing_market_expected':float(f.q.sum()),'mean_closing_market_q':float(f.q.mean()),'trajectories':stage,'by_year':{str(k):v for k,v in year.items()}},
 'asof_history':{'avg_available_history5':float(d.hist_n.mean()),'fraction_history_ge3':float((d.hist_n>=3).mean()),'mean_movement_prior':float(d.hist_move34_mean.mean()),'H018_flag_prior_stage_groups':groups,'group_split_threshold_2024_train_median':med_train},
 'models_2025_26_test':models,
 'data_limits':['C1 only 4corner race classes, C2 as earliest for some; these are PASSING ORDER not velocities','Individual horse 200m sectional pace/physiological reserve not observed','Older horse historic races are only those in provided umadete sample and incomplete in 2016–2023','H018 risk 203 chosen on prior explored 2024–26, so 203 subgroup results are descriptive, not new prospective test','Training 2024 & test 2025–26 are previously explored periods and do not furnish independent evidence','Closing odds used only retrospective benchmark, not predictive features','Actual current C3,C4,finish,3F excluded from all as-of predictor features','M3/P10/M4 exact runtime output parity not confirmed','No profit or betting EV conclusion'],
 'production':'NO code or exclusion gate changes'}
 (DIR/'H019_RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,default=float),encoding='utf-8')
 print(json.dumps({'population':result['population'],'flag':result['H018_flag'],'history':result['asof_history'],'models':{k:v for k,v in models.items() if k not in ('baseline','plus_prior_stage')}},ensure_ascii=False,indent=2,default=float))
 return result

if __name__=='__main__':evaluate()