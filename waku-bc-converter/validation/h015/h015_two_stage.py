#!/usr/bin/env python3
"""H015 research: prior-only 4C-front/other mixture and conditional finishing, no production changes.
Uses pre-race features made by H014 via strict historical horse+rID, labels only from current race.
2022-23 model fit, 2024-26 historical exploratory test (viewed by earlier studies).
"""
import json, pathlib, sys, os
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
ROOT=pathlib.Path('/mnt/data')
DIR=ROOT/'H015_二段階先行余力検証_20261123'
DIR.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'H014_先行馬余力耐性_20261123'))
import h014_front_stamina as h014
SEED=20261123
# Never include target current 4C/lap/finish/market in predictors.
CATS=['surface','profile']
GENERIC=['gate','prior4','prior4_sim','nold','front_pressure','prior_top3','prior_late','prior_change']
ENDURANCE=['prior_hold','prior_fade','nfront','front_intent','hold_x_pressure','fade_x_pressure']
ASOF=set(CATS+GENERIC+ENDURANCE)
FORBIDDEN={'c4','c3','finish','top3','late3f','late_vs_best','stress_high','early2','early_z','q','closing_odds','c4_front','collapse4','stay_top3','year','date','rid','name','no'}
assert not ASOF & FORBIDDEN

def make_features(z):
    z=z.copy()
    z['hold_x_pressure']=(z.prior_hold-.35)*z.front_pressure*z.front_intent
    z['fade_x_pressure']=z.prior_fade*z.front_pressure*z.front_intent
    for k in GENERIC+ENDURANCE:
        assert np.isfinite(z[k]).all(),(k,int((~np.isfinite(z[k])).sum()))
    return z

def fit_model(z,mask,cols,target):
    pre=ColumnTransformer([('num',StandardScaler(),cols),('cats',OneHotEncoder(handle_unknown='ignore',min_frequency=20),CATS)])
    mod=Pipeline([('pre',pre),('lr',LogisticRegression(C=.4,max_iter=500))])
    x=z.loc[mask,cols+CATS]
    if len(x)<50 or z.loc[mask,target].nunique()<2:raise ValueError('Train class shortage '+target)
    mod.fit(x,z.loc[mask,target].astype(int))
    return mod

def calib_three_per_race(raw, ids, target_total=3):
    """Shift logit for each race so marginal top3 probabilities sum 3, no outcomes used."""
    p=np.clip(np.asarray(raw,dtype=float),1e-7,1-1e-7)
    ids=np.asarray(ids)
    q=np.empty(len(p),dtype=float)
    logit=np.log(p/(1-p))
    for rid in pd.unique(ids):
        ix=np.flatnonzero(ids==rid)
        li=logit[ix]
        lo,hi=-25.,25.
        for _ in range(44):
            t=(lo+hi)*.5
            vals=1/(1+np.exp(-np.clip(li+t,-50,50)))
            if vals.sum()<target_total:lo=t
            else:hi=t
        q[ix]=1/(1+np.exp(-np.clip(li+(lo+hi)*.5,-50,50)))
    return q

def train_and_predict(z,train,test):
    """All race-current C4 values are labels for training, never chosen at inference."""
    # target only derived from actual4C used to supervise the conditional estimators
    d=z.copy()
    d['label_front']=d.c4_front.astype(int)
    d['label_top3']=d.top3.astype(int)
    d['front_top3']=((d.label_front==1)&(d.label_top3==1)).astype(int)
    d['back_top3']=((d.label_front==0)&(d.label_top3==1)).astype(int)
    generic=GENERIC
    allf=GENERIC+ENDURANCE
    out=z.loc[test,['rid','year','profile','surface','name','no','n','top3','c4_front','prior_hold','nfront','front_pressure','q']].copy()
    for label,cols in [('direct_generic',generic),('direct_endurance',allf)]:
        fit=fit_model(d,train,cols,'label_top3')
        out[label+'_raw']=fit.predict_proba(z.loc[test,cols+CATS])[:,1]
    # position stage and conditional outcome stages. Conditional actual front labels are ONLY TRAIN labels.
    for label,cols in [('generic',generic),('endurance',allf)]:
        front=fit_model(d,train,cols,'label_front')
        pfront=front.predict_proba(z.loc[test,cols+CATS])[:,1]
        out[f'frontprob_{label}']=pfront
        for front_state in [1,0]:
            subset=train & (d.label_front==front_state)
            m=fit_model(d,subset,cols,'label_top3')
            out[f'conditional_top3_{front_state}_{label}']=m.predict_proba(z.loc[test,cols+CATS])[:,1]
        out[f'mixture_{label}_raw']=(pfront*out[f'conditional_top3_1_{label}']+(1-pfront)*out[f'conditional_top3_0_{label}'])
    models=['direct_generic','direct_endurance','mixture_generic','mixture_endurance']
    for name in models:
        out[name]=calib_three_per_race(out[name+'_raw'],out.rid)
    if not np.allclose(out.groupby('rid')[models].sum().to_numpy(),3.,atol=1e-7):
        raise AssertionError('race budget broken')
    return out,models

def evaluate(out,models):
    def metrics(g):
        results={'races':int(g.rid.nunique()),'horses':len(g),'top3_actual':int(g.top3.sum()),'front4_horses':int(g.c4_front.sum())}
        yt=g.top3.to_numpy(dtype=float)
        # fixed final-market calibrated PL proxy only for retrospective reference; not real as-of price
        results['market_final_only_proxy']={'brier':float(np.mean((g.q-yt)**2)), 'top3_hits':int(g.sort_values(['rid','q'],ascending=[True,False]).groupby('rid').head(3).top3.sum())}
        for name in models:
            values=g[name].to_numpy(float)
            top=g.sort_values(['rid',name],ascending=[True,False],kind='stable').groupby('rid').head(3)
            results[name]={'brier':float(np.mean((values-yt)**2)),'top3_hits':int(top.top3.sum()),'winner_in_top3':None}
        for lab in ['generic','endurance']:
            results[f'front_{lab}']={'auc':float(roc_auc_score(g.c4_front.astype(int),g['frontprob_'+lab])),'brier':float(np.mean((g['frontprob_'+lab]-g.c4_front.astype(int))**2))}
        return results
    v={'overall':metrics(out)}
    for yr,g in out.groupby('year'):v[str(int(yr))]=metrics(g)
    # Race mean Brier gain, paired cluster bootstrap no horse-independent resampling.
    comparisons=[('direct_generic','direct_endurance'),('direct_generic','mixture_generic'),('mixture_generic','mixture_endurance'),('direct_generic','mixture_endurance'),('direct_endurance','mixture_endurance')]
    rng=np.random.default_rng(SEED)
    for ref,other in comparisons:
        delta=((out[ref]-out.top3)**2-(out[other]-out.top3)**2).groupby(out.rid).mean().to_numpy()
        n=len(delta);ix=rng.integers(0,n,size=(4500,n))
        b=delta[ix].mean(axis=1)
        v[ref+'_to_'+other]={'race_mean_gain':float(delta.mean()),'ci95':[float(q) for q in np.quantile(b,[.025,.975])], 'races_positive':int((delta>0).sum()),'races_negative':int((delta<0).sum())}
    v['market_proxy_caution']='Retrospective closing odds q, not as-of buyable prices, reported for same horses only.'
    return v

def diagnostic(out):
    # As-of predicted front and resilience bins; flag candidates only, no automatic elimination.
    x=out.copy()
    x['front_bin']=pd.cut(x.frontprob_endurance,bins=[-1,.25,.5,.75,2],labels=['<25%','25-50%','50-75%','>=75%'])
    x['prior_hold_bin']=pd.cut(x.prior_hold,bins=[-1,.25,.40,.55,2],labels=['<25%','25-40%','40-55%','>=55%'])
    rows=[]
    for (f,h),g in x.groupby(['front_bin','prior_hold_bin'],observed=True):
        if len(g)<30:continue
        rows.append({'front_probability_band':str(f),'prior_front_hold_band':str(h),'horses':int(len(g)),'races':int(g.rid.nunique()),'actual_front_pct':float(g.c4_front.mean()),'top3_pct':float(g.top3.mean()),'expected_top3_pct':float(g.q.mean()),'pred_top3_pct':float(g.mixture_endurance.mean())})
    return rows

def main():
    path=DIR/'h015_race_horse_lookback_PRIVATE.pkl'
    if path.exists():z=pd.read_pickle(path)
    else:
        z,history_audit=h014.prepare();z=h014.bin_pace(z)
    z=make_features(z)
    full_train=z.year.between(2019,2023)
    best_train=z.year.between(2022,2023)
    evalmask=z.year.between(2024,2026)
    result={'study':'H015 two-stage pre-race 4C front & conditional persistence diagnostic',
       'population':{'races':int(z.rid.nunique()),'horses':len(z),'train2019_23_races':int(z.loc[full_train,'rid'].nunique()),'train2019_23_horses':int(full_train.sum()),'train2022_23_races':int(z.loc[best_train,'rid'].nunique()),'train2022_23_horses':int(best_train.sum()),'test2024_26_races':int(z.loc[evalmask,'rid'].nunique()),'test2024_26_horses':int(evalmask.sum()),'test_all_horses':int(z.year.between(2024,2026).sum()),'test_with2_history':int((evalmask&(z.nold>=2)).sum())},
       'model_source':'As-of features from H014 strict TARGET dedup; NOT exact browser M4/P10/M3 prediction states',
       'features_used':{'generic':GENERIC,'additional_endurance':ENDURANCE,'categorical':CATS},
       'target_labels_only':['c4_front','top3'],
       'warnings':['Historic 2024-26 dates already repeatedly inspected by prior research; exploratory results only','Train2019-23 sparse old history; two training windows are sensitivity, do not cherry-pick better test performance','Current race actual4C, current race lap, and closing-market q never used as predictive feature','Horse specific 200m/physiological reserve cannot be observed','M4/P10/M3 browser exact parity not demonstrated; proxy test must not be called live accuracy','Pre-race history rows selected from TARGET umadete may be survivor/censoring-biased.']}
    for label,mask in [('main_2022_23',best_train),('sensitivity_2019_23',full_train)]:
        out,models=train_and_predict(z,mask,evalmask)
        result[label]=evaluate(out,models)
        if label=='main_2022_23':
            x=out.drop(columns=['name','no']).copy()
            x['rid_anonymous']=pd.factorize(x.rid)[0]
            # only anonymous per-course / per-year; NEVER export horse name/rid or market individual q
            diagnostic(out) and (DIR/'H015_risk_band_anon.csv').write_text(pd.DataFrame(diagnostic(out)).to_csv(index=False),encoding='utf-8')
            g=out.groupby(['year','profile']).agg(horses=('top3','size'),races=('rid','nunique'),actual_top3=('top3','sum'),pred4c_front=('frontprob_endurance','mean'),actual4c_front=('c4_front','mean')).reset_index()
            g.to_csv(DIR/'H015_年度コース別の二段階診断.csv',index=False,encoding='utf-8-sig')
    (DIR/'H015_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    for label in ['main_2022_23','sensitivity_2019_23']:
        x=result[label]
        print(label,'n',x['overall']['horses'],'races',x['overall']['races'])
        for m in ['direct_generic','direct_endurance','mixture_generic','mixture_endurance','market_final_only_proxy']:
            print(' ',m,x['overall'][m])
        print(' front',x['overall']['front_generic'],x['overall']['front_endurance'])
        for k in ['direct_generic_to_direct_endurance','direct_generic_to_mixture_generic','mixture_generic_to_mixture_endurance','direct_generic_to_mixture_endurance']:
            print(' ',k,x[k])
    print('Saved',DIR/'H015_results.json')
    return result
if __name__=='__main__':main()