#!/usr/bin/env python3
"""H020: as-of historical late-200m proxy/rescue ability, C3-C4 advance,
other runners' front ability and joint 4C forecast. Research, NOT live betting.
Frozen H018 pre-race scores; train only 2024, test historical 2025-26.
Current C3,C4,finish,late3F and final odds ONLY retrospective labels/diagnostic.
"""
import pathlib, sys, json, warnings
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from scipy.special import expit,logit

ROOT=pathlib.Path('/mnt/data')
OUT=pathlib.Path(__file__).resolve().parent; OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'H019_道中位置と先行余力_20261124'))
sys.path.insert(0,str(OUT))  # bundled H019 helper allows cached reruns from extracted ZIP
import h019_stage_transition as h19
SEED=20261124

# Features only from previous, completed distinct horse-races. These names deliberately
# don't overlap the true-current-race fields.
HIST_FEATS=['hist_n5','hist_rear4_n','hist_rear4_late_gain','hist_rear4_fast_gap','hist_rear4_recover_top3',
 'hist_l3_fast_gap_all','hist_l3_gap_best5','hist_finish_gain_all','hist_front4_hold_top3','hist_front4_fade',
 'hist_rear3_to_front4','hist_early_turn_n','hist_early_to_c3_move']
CONTEXT=['rival_front_hold_LOO','rival_front_fade_LOO','rival_front_hold_dispersion_LOO','rival_front_pressure_LOO']
BASE=['adjusted_finish_sensitivity','hist_n5']
LATE=['hist_rear4_n','hist_rear4_late_gain','hist_rear4_fast_gap','hist_rear4_recover_top3','hist_l3_gap_best5']
EARLY=['hist_rear3_to_front4','hist_early_turn_n','hist_early_to_c3_move']
STAY=['hist_front4_hold_top3','hist_front4_fade']
VARIANTS={'baseline':BASE,'late_exception':BASE+LATE,'late_plus_stage':BASE+LATE+EARLY,
          'rival_stay':BASE+CONTEXT,'late_and_rival':BASE+LATE+CONTEXT,
          'all_sources':BASE+LATE+EARLY+STAY+CONTEXT}
# guarantee features constructed independently of this race's labels
FORBIDDEN={'top3','c3f','c4f','c3back','c4back','c3c4_move','c3c4_push2','c4finish_move',
           '上がり3Fタイム','確定着順','q','単勝オッズ','zone','trajectories','c4','c3','date','year','rid','no','name'}
assert not set(sum(VARIANTS.values(),[])) & FORBIDDEN


def prepare_targets():
    d=h19.load_target().sort_values(['rid','no']).reset_index(drop=True)
    assert len(d)==14876 and d.rid.nunique()==977
    d['year']=d.year.astype(int)
    d['date']=d.date.astype(int)
    return d


def get_history_by_day(d, hist):
    """Uses strict date less-than. No current horse/horse run reverse joining."""
    hist=hist.copy()
    hist['date']=hist['date'].astype(int)
    hist=hist.sort_values(['name','date','rid16']).drop_duplicates(['name','rid16'],keep='first')
    grouped={str(name):g for name,g in hist.groupby('name',sort=False)}
    feats=[]
    for name,day,surface,distance in d[['name','date','surface','距離']].itertuples(index=False,name=None):
        old=grouped.get(name)
        if old is None: old=hist.iloc[:0]
        old=old.loc[(old.date<int(day))&(old['芝・ダート']==surface)].tail(5)
        n=len(old)
        if n:
            r4=old.c4frac.to_numpy(float); r3=old.c3frac.to_numpy(float)
            num=old['出走頭数'].to_numpy(float)
            end=old['確定着順'].to_numpy(float)
            gain=(old['通過4'].to_numpy(float)-end)/np.maximum(num-1,1)
            gap=old.time3f_delta.to_numpy(float)
            gap=np.where((gap>=-.1)&(gap<=15),gap,np.nan)
            rear=r4>.5;front=r4<=.25
            rear_gain=gain[rear];rear_gap=gap[rear]
            recent=np.where(np.isfinite(gap),gap,np.nan)
            early=old['通過1'].to_numpy(float)
            early=np.where(early>0,early,np.nan)  # only actual first passing point; NOT all races
            # 1C missing means don't substitute 2C and call it a first corner
            have_early=np.isfinite(early)
            early_to3=(early-r3*num)/np.maximum(num-1,1)
            values=[n,int(rear.sum()),np.mean(rear_gain) if len(rear_gain) else np.nan,
                np.nanmean(rear_gap) if np.isfinite(rear_gap).any() else np.nan,
                np.mean((end[rear]<=3)) if rear.any() else np.nan,
                np.nanmean(gap) if np.isfinite(gap).any() else np.nan,
                np.nanmin(recent) if np.isfinite(recent).any() else np.nan,
                np.nanmean(gain) if np.isfinite(gain).any() else np.nan,
                np.mean(end[front]<=3) if front.any() else np.nan,
                np.mean(np.maximum(end[front]-old.loc[front,'通過4'].to_numpy(float),0)/np.maximum(num[front]-1,1)) if front.any() else np.nan,
                np.mean((r3>.5)&(r4<=.5)),int(have_early.sum()),
                np.nanmean(early_to3[have_early]) if have_early.any() else np.nan]
        else: values=[0]+[np.nan]*12
        feats.append(values)
    a=np.asarray(feats,dtype=float)
    for i,col in enumerate(HIST_FEATS):d[col]=a[:,i]
    assert (d.hist_n5.between(0,5)).all()
    return d


def add_other_front(d):
    """Other runners' historical front tenacity, leave this horse out, using only
    frozen joint rank probabilities as weights. No future or target labels."""
    x=d.copy()
    w=np.asarray(x.p_zone1_joint+.5*x.p_zone2_joint,dtype=float)
    hold=np.where(np.isfinite(x.hist_front4_hold_top3),x.hist_front4_hold_top3,.25)
    fade=np.where(np.isfinite(x.hist_front4_fade),x.hist_front4_fade,.22)
    pressure=x.front_pressure.to_numpy(float)
    # keep historical feature count and individual weight; LOO pressure part uses only other horse weights.
    x['_w']=w;x['_wh']=w*hold;x['_wf']=w*fade;x['_wf2']=w*fade*fade
    agg={col:x.groupby('rid')[col].transform('sum').to_numpy(float) for col in ['_w','_wh','_wf','_wf2']}
    ww=np.maximum(agg['_w']-w,1e-9)
    x['rival_front_hold_LOO']=(agg['_wh']-x['_wh'].to_numpy(float))/ww
    x['rival_front_fade_LOO']=(agg['_wf']-x['_wf'].to_numpy(float))/ww
    variance=np.maximum((agg['_wf2']-x['_wf2'].to_numpy(float))/ww-x['rival_front_fade_LOO']**2,0)
    x['rival_front_hold_dispersion_LOO']=np.sqrt(variance)
    x['rival_front_pressure_LOO']=agg['_w']-w
    x.drop(columns=['_w','_wh','_wf','_wf2'],inplace=True)
    assert np.isfinite(x[CONTEXT]).all().all()
    return x


def impute_fit(train, test, cols):
    a=train[cols].to_numpy(float).copy();b=test[cols].to_numpy(float).copy()
    meds=np.nanmedian(a,axis=0);meds=np.where(np.isfinite(meds),meds,0)
    a=np.where(np.isfinite(a),a,meds);b=np.where(np.isfinite(b),b,meds)
    # fixed pre-race H018 probability should be transformed in logit, not raw
    if 'adjusted_finish_sensitivity' in cols:
        k=cols.index('adjusted_finish_sensitivity')
        a[:,k]=logit(np.clip(a[:,k],1e-6,1-1e-6))
        b[:,k]=logit(np.clip(b[:,k],1e-6,1-1e-6))
    sc=StandardScaler().fit(a)
    return sc.transform(a),sc.transform(b),meds


def fit_predict(train, test, cols, C=.2):
    a,b,meds=impute_fit(train,test,cols)
    m=LogisticRegression(C=C,max_iter=400).fit(a,train.top3.to_numpy(int))
    raw=m.predict_proba(b)[:,1]
    return h19.budget3(test,raw),dict(zip(cols,[float(t) for t in m.coef_[0]])),meds


def cluster_delta(df,base,new,draws=5000,seed=SEED):
    diff=(base-df.top3.to_numpy())**2-(new-df.top3.to_numpy())**2
    per=pd.Series(diff).groupby(df.rid).mean().to_numpy()
    rng=np.random.default_rng(seed)
    ix=rng.integers(0,len(per),size=(draws,len(per)))
    bs=per[ix].mean(axis=1)
    return {'race_mean_gain':float(per.mean()),'ci95':[float(x) for x in np.quantile(bs,[.025,.975])],
            'positive_races':int((per>0).sum()),'negative_races':int((per<0).sum())}


def score(df,p):
    return {'brier':float(np.mean((p-df.top3.to_numpy())**2)),
            'top3_hits':h19.top3_hits(df,p), 'races':int(df.rid.nunique()), 'horses':len(df)}


def model_diagnostic(test, predictions, vals, train):
    from scipy.stats import beta
    test=test.copy()
    for k,p in predictions.items():test['p_'+k]=p
    f=test.loc[test.h018_flag.eq(1)].copy()
    assert len(f)==123 and f.top3.sum()==9
    # rank rescue potential by residual vs fixed H018. No training on test labels.
    # median q of 2024 train flagged only for descriptive threshold, no tunings.
    threshold=float(np.quantile(train.loc[train.h018_flag.eq(1),'hist_rear4_late_gain'].dropna(),.5))
    f['prior_rear_gain_above_2024_median']=f.hist_rear4_late_gain>threshold
    contrasts={}
    for k,g in f.groupby('prior_rear_gain_above_2024_median'):
        contrasts[str(bool(k))]={'n':len(g),'top3':int(g.top3.sum()),'closing_market_expected':float(g.q.sum()),
             'mean_prior_rear_gain':float(g.hist_rear4_late_gain.mean())}
    # Fixed top quartile *prediction uplift* in held-out test is diagnostic, not vetted action
    d=f['p_all_sources']-f['p_baseline']
    threshold2=float(np.quantile(train.hist_rear4_late_gain.dropna(),.75))
    f['high_past_rear_finish']=f.hist_rear4_late_gain>=threshold2
    high={}
    for k,g in f.groupby('high_past_rear_finish'):
        high[str(bool(k))]={'n':len(g),'top3':int(g.top3.sum()),'market_expected':float(g.q.sum()),
        'mean_p_h018':float(g.adjusted_finish_sensitivity.mean()),'mean_p_all':float(g.p_all_sources.mean())}
    return f,{'2025_26_flag_count':len(f),'top3':int(f.top3.sum()),'market_expected':float(f.q.sum()),
       '2024_med_train_prior_rear_finish_gain':threshold,'prior_rear_gain_groups':contrasts,
       '2024_train_upper_quartile_rear_finish_gain':threshold2,'high_prior_rear_gain_groups':high,
       'model_delta_top3':{k:score(f,p.to_numpy()) for k,p in f[[f'p_{name}' for name in predictions]].items()}}


def main():
    d=prepare_targets()
    hist=pd.read_pickle(ROOT/'h019_history_clean.pkl')
    d=get_history_by_day(d,hist)
    d=add_other_front(d)
    assert d.rid.nunique()==977 and (d.groupby('rid').top3.sum()==3).all()
    train=d[d.year.eq(2024)].copy().reset_index(drop=True)
    test=d[d.year.ge(2025)].copy().reset_index(drop=True)
    preds={};coeff={};medians={}
    for name,cols in VARIANTS.items():
        p,c,m=fit_predict(train,test,cols);preds[name]=p;coeff[name]=c;medians[name]=m.tolist()
    stats={name:score(test,p) for name,p in preds.items()}
    stats['frozen_H018']=score(test,test.adjusted_finish_sensitivity.to_numpy(float))
    stats['market_closing_only']=score(test,test.q.to_numpy(float))
    comps={name:cluster_delta(test,preds['baseline'],p) for name,p in preds.items() if name!='baseline'}
    byyear={str(yr):{name:score(g,preds[name][g.index.to_numpy()]) for name in preds}
            for yr,g in test.groupby('year')}
    flags,flag_diag=model_diagnostic(test,preds,stats,train)
    # Hypothesis: expected 4C back staying ability, separate actual 4C post-race pathways
    actual_groups={}
    for tag,g in d.loc[d.h018_flag.eq(1)].groupby('trajectory'):
       actual_groups[tag]={'n':len(g),'top3':int(g.top3.sum()),'market_expected':float(g.q.sum())}
    features={'history_any5':float((d.hist_n5>0).mean()),'history_ge3':float((d.hist_n5>=3).mean()),
        'rear_history_any5':float((d.hist_rear4_n>0).mean()),'front_early1_observed_in_past':float((d.hist_early_turn_n>0).mean()),
        'test_rear_hist_any':float((test.hist_rear4_n>0).mean())}
    result={'name':'H020 – horse-specific past C4-rear closing response and LOO rival front hold conditioning, evaluated against H019',
       'train':{'races':int(train.rid.nunique()),'horses':len(train),'year':2024},
       'test':{'races':int(test.rid.nunique()),'horses':len(test),'years':'2025–2026/10/04'},
       'feature_coverage':features,'variant_columns':VARIANTS,'metrics':stats,'vs_baseline_race_cluster_bootstrap':comps,
       'by_year':byyear,'model_coefficients':coeff,'train_feature_medians':medians,
       'H018_flag_203_posterior':{'all_977_races_203':int(d.h018_flag.sum()),
               'all_203_top3':int(d.loc[d.h018_flag.eq(1),'top3'].sum()),
               'actual_paths_POSTRACE_only':actual_groups,'test_only':flag_diag},
       'limitations':['Predictions use H018/H017 research shadow, not JS production M3/M4/P10 parity',
       '2019–2023 old history source has much poorer availability than 2025–26',
       '2024–2026 years were heavily mined by H004–H019; CI do not correct the research-selection process',
       'Final odds market q only retrospective, NOT pre-race price',
       'Horse individual 200m/gps energy reserve unavailable; past leading/finish ranks proxy not causality',
       'Current 3C/4C/finish/last3F labels must NEVER be prediction inputs',
       'H018 203 risk group is already selected on 2024–26 pre-existing research decisions; 2024 one successful sample insufficient to fit subgroup rescue rule',
       'Straight Niigata turf1000 excluded; C1 available only on subset, not imputed by C2',
       'No production app and auto exclusion modification'],
       'code_version':'1.0'}
    (OUT/'H020_RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    # record per-horse test in local private, NOT public repository
    export_cols=['rid','year','profile','surface','no','name','top3','q','h018_flag','c3back','c4back','trajectory',
        'adjusted_finish_sensitivity']+HIST_FEATS+CONTEXT
    for k,p in preds.items():test['p_'+k]=p;export_cols.append('p_'+k)
    # Full fixed as-of feature matrix for byte-for-byte reproducible cached-model checks.
    feat_cols=['rid','year','profile','surface','no','name','date','top3','q','h018_flag','adjusted_finish_sensitivity'] + HIST_FEATS + CONTEXT
    d[feat_cols].to_csv(OUT/'H020_TRAIN_TEST_ASOF_FEATURES_PRIVATE.csv',index=False,encoding='utf-8-sig')
    test[export_cols].to_csv(OUT/'H020_HORSE_TEST_PRIVATE.csv',index=False,encoding='utf-8-sig')
    flags[export_cols].to_csv(OUT/'H020_H018_123_RISK_PRIVATE.csv',index=False,encoding='utf-8-sig')
    # No leakage invariance test: labels altered AFTER feature construction, never passed to fit pipeline
    test_flipped=test.copy();test_flipped['top3']=1-test_flipped['top3']
    test_flipped['c3back']=~test_flipped['c3back'];test_flipped['c4back']=~test_flipped['c4back']
    test_flipped['q']=1-test_flipped['q']
    for name,cols in VARIANTS.items():
        a,b,_=impute_fit(train,test,cols);aa,bb,_=impute_fit(train,test_flipped,cols)
        assert np.array_equal(a,aa) and np.array_equal(b,bb), 'Current results leak into inputs'
    print(json.dumps({'model_metrics':stats,'paired_CI':comps,'coverage':features,'risk_diag':flag_diag},ensure_ascii=False,indent=2))
    return result

if __name__=='__main__':main()