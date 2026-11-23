#!/usr/bin/env python3
"""H017 | Four predicted 4C quartiles x conditional 3rd-place probabilities, research-only.
Pre-race features come from H014/H015 strict horse+16-digit race ID histories.
All test current C4 and finish are labels ONLY. Never use closing odds for prediction.
Direct and two-stage models use identical features; test 2024-26 has been mined before.
Straight-track Niigata turf1000 excluded because 4C rank is not a real corner.
"""
import json, pathlib, sys
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, log_loss

ROOT=pathlib.Path('/mnt/data')
BASE=ROOT/'H015_二段階先行余力検証_20261123'
OUT=ROOT/'H017_4角4帯_終盤到達研究_20261123';OUT.mkdir(exist_ok=True)
PRIOR=ROOT/'H013_全国4角危険位置_20261123'/'H013_危険馬_過去検証_PRIVATE.csv'
SEED=20261123
CATS=['surface','profile']
G=['gate','prior4','prior4_sim','nold','front_pressure','prior_top3','prior_late','prior_change']
R=['prior_hold','prior_fade','nfront','front_intent','hold_x_pressure','fade_x_pressure']
FORBID={'c4','c3','finish','top3','q','early2','early_z','stress_high','late3f','late_vs_best','lull','last200_fade_sec','c4_front','date','year','rid','name','no','closing_odds','is_favorite'}
assert not set(G+R+CATS)&FORBID


def zone_from_c4(c4, n):
    q=np.asarray(c4,dtype=float)/np.asarray(n,dtype=float)
    if np.any(~np.isfinite(q)) or np.any((q<=0)|(q>1)): raise ValueError('invalid C4 relative rank')
    return np.where(q<=.25,0,np.where(q<=.5,1,np.where(q<=.75,2,3))).astype(int)

def load_data():
    z=pd.read_pickle(BASE/'h015_race_horse_lookback_PRIVATE.pkl').copy()
    assert not z.duplicated(['rid','no']).any()
    n_races=z.rid.nunique();n_horses=len(z)
    # No actual fourth corner on Niigata's straight 1000m course.
    no4=(z.venue=='新潟')&(z.surface=='芝')&(z.distance==1000)
    z=z.loc[~no4].copy().reset_index(drop=True)
    assert not z.duplicated(['rid','no']).any()
    assert (z.groupby('rid').top3.sum()==3).all()
    assert (z.groupby('rid').size()==z.groupby('rid').n.first()).all()
    z['hold_x_pressure']=(z.prior_hold-.35)*z.front_pressure*z.front_intent
    z['fade_x_pressure']=z.prior_fade*z.front_pressure*z.front_intent
    z['zone']=zone_from_c4(z.c4,z.n)
    assert all(z[c].notna().all() and np.isfinite(z[c]).all() for c in G+R)
    return z,{'original_races':int(n_races),'original_horses':int(n_horses),'excluded_straight_races':int(n_races-z.rid.nunique()),'excluded_straight_horses':int(n_horses-len(z)),'retained_profiles':int(z.profile.nunique()),'retained_races':int(z.rid.nunique()),'retained_horses':int(len(z))}

def pipe(num, multi=False):
    pre=ColumnTransformer([('num',StandardScaler(),num),('cat',OneHotEncoder(handle_unknown='ignore',min_frequency=20),CATS)])
    return Pipeline([('pre',pre),('lr',LogisticRegression(C=.4,max_iter=450))])

def race_budget_three(p,ids):
    p=np.clip(np.asarray(p,float),1e-7,1-1e-7)
    ids=np.asarray(ids)
    out=np.empty_like(p)
    logits=np.log(p/(1-p))
    for rid in pd.unique(ids):
        idx=np.flatnonzero(ids==rid)
        assert len(idx)>=12
        a=logits[idx];lo=-28.;hi=28.
        for _ in range(42):
            med=(lo+hi)/2
            rr=1/(1+np.exp(-np.clip(a+med,-50,50)))
            if rr.sum()<3:lo=med
            else:hi=med
        out[idx]=1/(1+np.exp(-np.clip(a+(lo+hi)/2,-50,50)))
    return out

def train_models(z,trainmask,models=('direct_general','direct_resilience','four_zone_general','four_zone_resilience')):
    fit={}
    for tag,cols in [('general',G),('resilience',G+R)]:
        x=z.loc[trainmask,cols+CATS]
        fit['direct_'+tag]=pipe(cols).fit(x,z.loc[trainmask,'top3'].astype(int))
        fit['zone_'+tag]=pipe(cols,multi=True).fit(x,z.loc[trainmask,'zone'].astype(int))
        for k in range(4):
            mask=trainmask&(z.zone==k)
            if mask.sum()<100 or z.loc[mask,'top3'].nunique()<2:raise AssertionError('no samples for zone '+str(k))
            fit[f'conditional_{k}_'+tag]=pipe(cols).fit(z.loc[mask,cols+CATS],z.loc[mask,'top3'].astype(int))
    return fit

def predict_models(fit,z,testmask):
    d=z.loc[testmask].copy().reset_index(drop=True)
    for tag,cols in [('general',G),('resilience',G+R)]:
        x=d[cols+CATS]
        d['direct_'+tag]=race_budget_three(fit['direct_'+tag].predict_proba(x)[:,1],d.rid)
        stage=fit['zone_'+tag].predict_proba(x)
        order=fit['zone_'+tag].named_steps['lr'].classes_
        if not np.array_equal(order,np.arange(4)):raise AssertionError('zone classes mismatched')
        assert np.allclose(stage.sum(axis=1),1,atol=1e-8)
        conditional=[]
        for k in range(4):
            d[f'p_zone{k+1}_'+tag]=stage[:,k]
            pk=fit[f'conditional_{k}_'+tag].predict_proba(x)[:,1]
            d[f'p_top3_given_zone{k+1}_'+tag]=pk
            conditional.append(pk)
        mix=(stage*np.array(conditional).T).sum(axis=1)
        d['four_zone_'+tag]=race_budget_three(mix,d.rid)
    assert np.allclose(d.groupby('rid')[['direct_general','direct_resilience','four_zone_general','four_zone_resilience']].sum().to_numpy(),3,atol=1e-7)
    return d

def metrics(d,models):
    def score(df):
        ans={'races':int(df.rid.nunique()),'horses':len(df),'actual_top3':int(df.top3.sum())}
        for m in models:
            y=df.top3.to_numpy(float);p=df[m].to_numpy(float)
            top=df.sort_values(['rid',m,'no'],ascending=[True,False,True],kind='stable').groupby('rid').head(3)
            ans[m]={'brier_horse_weighted':float(np.mean((p-y)**2)),'top3_hits':int(top.top3.sum()),'winner_in_top3':int((top.finish==1).sum())}
        y=df.top3.to_numpy(float)
        ans['closing_market_reference']={'brier_horse_weighted':float(np.mean((df.q-y)**2)),'top3_hits':int(df.sort_values(['rid','q','no'],ascending=[True,False,True],kind='stable').groupby('rid').head(3).top3.sum())}
        for tag in ('general','resilience'):
            prob=np.stack([df[f'p_zone{k+1}_'+tag].to_numpy() for k in range(4)],axis=1)
            yy=df.zone.to_numpy(int)
            one=np.eye(4)[yy]
            ans['four_zone_'+tag+'_stage']={'multi_brier':float(np.mean(np.sum((prob-one)**2,axis=1)/4)), 'multinomial_logloss':float(log_loss(yy,prob,labels=[0,1,2,3])), 'accuracy':float(np.mean(prob.argmax(axis=1)==yy)), 'backhalf_auc':float(roc_auc_score(yy>=2,prob[:,2]+prob[:,3]))}
        return ans
    output={'overall':score(d)}
    for year,g in d.groupby('year'):output[str(year)]=score(g)
    for surface,g in d.groupby('surface'):output[surface]=score(g)
    # Race-paired bootstrap for the model comparisons
    rng=np.random.default_rng(SEED)
    output['paired_race_bootstrap_95ci']={}
    contrasts=[('direct_general','direct_resilience'),('direct_general','four_zone_general'),('direct_resilience','four_zone_resilience'),('four_zone_general','four_zone_resilience'),('direct_general','four_zone_resilience')]
    for base,new in contrasts:
        delta=(((d[base]-d.top3)**2)-((d[new]-d.top3)**2)).groupby(d.rid).mean().to_numpy()
        ix=rng.integers(0,len(delta),size=(3500,len(delta)))
        bs=delta[ix].mean(axis=1)
        output['paired_race_bootstrap_95ci'][base+'_vs_'+new]={'race_mean_gain':float(delta.mean()),'ci95':[float(x) for x in np.quantile(bs,[.025,.975])],'races_positive':int(np.sum(delta>0)),'races_negative':int(np.sum(delta<0))}
    return output

def risk_diagnostics(d):
    # Avoid tuning any rule on 2024-26 labels. Fixed threshold examples are *diagnostic only*.
    d=d.copy()
    d['p_last25']=d['p_zone4_resilience']
    d['p_back50']=d['p_zone3_resilience']+d['p_zone4_resilience']
    d['hypothetical_last25_high']=d.p_last25>=.50
    d['hypothetical_predicted_low_finish']=d.four_zone_resilience<=.10
    d['hypothetical_both']=d.hypothetical_last25_high & d.hypothetical_predicted_low_finish
    risk=pd.read_csv(PRIOR,encoding='utf-8-sig')
    risk['rid']=risk['レースID'].astype(str)
    risk['no']=pd.to_numeric(risk['馬番'],errors='raise').astype(int)
    assert not risk.duplicated(['rid','no']).any()
    flagged=d.merge(risk[['rid','no','予測4角後方確率','危険スコア']],on=['rid','no'],how='inner',validate='one_to_one')
    if len(flagged)!=len(risk.loc[risk['rid'].isin(d.rid)]):raise AssertionError('flagged match missed')
    out={'flagged_h013_total_original':len(risk),'flagged_h013_after_excluding_straight':len(flagged), 'flagged_total_3rd':int(flagged.top3.sum()),'flagged_expected_market_sum':float(flagged.q.sum())}
    def agg(g):
        return {'horses':len(g),'races':int(g.rid.nunique()),'top3':int(g.top3.sum()),'top3_rate':float(g.top3.mean()) if len(g) else None,'closing_market_expected':float(g.q.sum()),'predicted_last25_mean':float(g.p_last25.mean()) if len(g) else None,'actual_last25_count':int((g.zone==3).sum()),'mean_model_top3_prob':float(g.four_zone_resilience.mean()) if len(g) else None}
    for lab,cond in [('all_previous_flagged',np.ones(len(flagged),bool)),('flagged_p_last25_ge_50',flagged.p_last25>=.50),('flagged_low_top3_le_10',flagged.four_zone_resilience<=.10),('flagged_both', (flagged.p_last25>=.50)&(flagged.four_zone_resilience<=.10))]:out[lab]=agg(flagged.loc[cond])
    out['all_test_predicted_both']=agg(d.loc[d.hypothetical_both])
    # Pre-defined probability bins, no outcome-optimized split.
    d['p_last25_bucket']=pd.cut(d.p_last25,bins=[-1,.15,.30,.50,1.01],labels=['<15%','15–30%','30–50%','>=50%'])
    d['pred_risk10_bucket']=pd.cut(d.four_zone_resilience,bins=[-.001,.05,.10,.20,1.01],labels=['<=5%','5–10%','10–20%','>20%'])
    tab=d.groupby(['p_last25_bucket','pred_risk10_bucket'],observed=True).agg(horses=('top3','size'),races=('rid','nunique'),top3=('top3','sum'),actual_lastquarter=('zone',lambda s:int((s==3).sum())),model_top3_mean=('four_zone_resilience','mean'),closing_market_expected=('q','sum')).reset_index()
    tab=tab[tab.horses>=20].copy()
    tab.to_csv(OUT/'H017_予測最後方×低好走確率_帯別診断.csv',index=False,encoding='utf-8-sig')
    return out

def main():
    z,coverage=load_data()
    train=z.year.between(2022,2023)
    test=z.year.between(2024,2026)
    print('loaded',coverage,'trainR',z.loc[train].rid.nunique(),'testR',z.loc[test].rid.nunique(),flush=True)
    fit=train_models(z,train)
    out=predict_models(fit,z,test)
    names=['direct_general','direct_resilience','four_zone_general','four_zone_resilience']
    vals=metrics(out,names)
    risk=risk_diagnostics(out)
    # As-of contract: changing test current labels cannot change predicted outcomes.
    messed=z.copy()
    idx=messed.year.between(2024,2026)
    messed.loc[idx,'c4']=1
    messed.loc[idx,'zone']=0
    messed.loc[idx,'top3']=1-messed.loc[idx,'top3']
    messed.loc[idx,'finish']=1
    re=predict_models(fit,messed,idx)
    check=['direct_general','direct_resilience','four_zone_general','four_zone_resilience']+[f'p_zone{k}_resilience' for k in range(1,5)]
    for col in check:
        assert np.array_equal(out[col].to_numpy(),re[col].to_numpy()), 'lookahead leakage:'+col
    assert out.rid.nunique()==977, 'Unexpected post-exclusion evaluation race count'
    results={'study':'H017 four 4C zones -> finishability + pre-race front resilience',
      'scope':'retrospective exploratory; 2024-26 repeatedly mined; NO production change',
      'eligibility':coverage,
      'train':{'years':'2022–2023','races':int(z.loc[train].rid.nunique()),'horses':int(train.sum()),'history_2plus_share':float((z.loc[train,'nold']>=2).mean())},
      'test':{'years':'2024–2026/10/04','races':int(out.rid.nunique()),'horses':len(out),'history_2plus_share':float((out.nold>=2).mean())},
      'features_asof_general':G+CATS,
      'features_asof_additional_resilience':R,
      'forbidden_prediction_inputs':sorted(FORBID),
      'measures':vals,
      'risk':risk,
      'leakage_contract_test':'PASS: replacing current test 4C zone, finish and top3 does not change ANY 4-zone or 3rd predictions',
      'limitations':['H014 cached strict history: historical sample biased/missing before 2023','4C rank bands include tied position slots, normalized c4/n; no track GPS','Course profiles venue/surface/distance may hide inner/outer variants','Prediction features are H014 research proxies, not full real-browser M4/P10/M3 or Ability C','Actual first 2F pace, current last 3F and current 4C are after-race labels ONLY','Final market q is closing-time proxy, not T-minus-15 odds nor a buyable price','Previously studied 2024-26 years: confidence intervals are conditional on explored hypothesis and no untouched test','Scientific finding does not justify automatically discarding horses or claim ROI']}
    (OUT/'H017_result_aggregate.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    # Records with identifiers are PRIVATE, include measured labels for after-race diagnosis.
    out.to_pickle(OUT/'H017_eval_horses_PRIVATE.pkl')
    out[['rid','year','profile','surface','no','name','zone','top3','q','p_zone1_resilience','p_zone2_resilience','p_zone3_resilience','p_zone4_resilience','direct_general','direct_resilience','four_zone_general','four_zone_resilience','prior_late','prior_hold','front_pressure']].to_csv(OUT/'H017_horse_diag_PRIVATE.csv',index=False,encoding='utf-8-sig')
    print(json.dumps({'train':results['train'],'test':results['test'],'overall':vals['overall'],'contrast':vals['paired_race_bootstrap_95ci'],'risk':risk},ensure_ascii=False,indent=2),flush=True)
    return results
if __name__=='__main__':main()