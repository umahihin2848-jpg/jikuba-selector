#!/usr/bin/env python3
"""H017 fixed sensitivity: predicted rival front reserve (strict pre-race).
Pair model holds identical fit split, base parameters, history; no current actual pace/positions.
Extra features computed using leave-one-out expected front horses (prior-only).
"""
import pathlib,json,sys
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import h017_four_zone as h
OUT=h.OUT
CTX=['rival_front_hold','rival_front_fade']
assert not set(CTX) & h.FORBID

def add_rival(z):
    d=z.copy()
    w=d.front_intent.to_numpy(dtype=float)
    # Multiply by historical front-resilience, never current 4C/finish
    s=np.asarray(d.prior_hold,dtype=float)*w
    f=np.asarray(d.prior_fade,dtype=float)*w
    d['_w']=w; d['_s']=s;d['_f']=f
    sumw=d.groupby('rid')['_w'].transform('sum').to_numpy()-w
    sums=d.groupby('rid')['_s'].transform('sum').to_numpy()-s
    sumf=d.groupby('rid')['_f'].transform('sum').to_numpy()-f
    d['rival_front_hold']=np.where(sumw>0,sums/np.maximum(sumw,1e-9),.45)
    d['rival_front_fade']=np.where(sumw>0,sumf/np.maximum(sumw,1e-9),.12)
    d.drop(columns=['_w','_s','_f'],inplace=True)
    assert np.isfinite(d[CTX].to_numpy()).all()
    # Actual own past feature affects rivals, but each horse's own value excluded by LOO.
    return d

def train_context(z,train):
    cols=h.G+h.R+CTX
    fit={'direct':h.pipe(cols).fit(z.loc[train,cols+h.CATS],z.loc[train,'top3'])}
    fit['zone']=h.pipe(cols).fit(z.loc[train,cols+h.CATS],z.loc[train,'zone'])
    for k in range(4):
        mask=train & (z.zone==k)
        fit[k]=h.pipe(cols).fit(z.loc[mask,cols+h.CATS],z.loc[mask,'top3'])
    return fit

def predict_context(fit,z,test):
    d=z.loc[test].copy().reset_index(drop=True)
    cols=h.G+h.R+CTX
    p=fit['direct'].predict_proba(d[cols+h.CATS])[:,1]
    direct=h.race_budget_three(p,d.rid)
    zones=fit['zone'].predict_proba(d[cols+h.CATS])
    cond=np.array([fit[k].predict_proba(d[cols+h.CATS])[:,1] for k in range(4)]).T
    mixture=h.race_budget_three((zones*cond).sum(axis=1),d.rid)
    assert np.allclose(zones.sum(axis=1),1.)
    return direct,mixture,zones

def main():
    z,coverage=h.load_data();z=add_rival(z)
    tr=z.year.between(2022,2023);te=z.year.between(2024,2026)
    baseline=pd.read_pickle(OUT/'H017_eval_horses_PRIVATE.pkl')
    assert (z.loc[te,'rid'].to_numpy()==baseline.rid.to_numpy()).all()
    assert (z.loc[te,'no'].to_numpy()==baseline.no.to_numpy()).all()
    fit=train_context(z,tr)
    a,b,zones=predict_context(fit,z,te)
    vals=baseline.copy();vals['direct_with_rival_reserve']=a;vals['four_zone_with_rival_reserve']=b
    rng=np.random.default_rng(h.SEED)
    comparison={}
    for old,new in [('direct_resilience','direct_with_rival_reserve'),('four_zone_resilience','four_zone_with_rival_reserve')]:
        yc=vals.top3.to_numpy(float);p0=vals[old].to_numpy();p1=vals[new].to_numpy()
        delta=pd.Series((p0-yc)**2-(p1-yc)**2).groupby(vals.rid).mean().to_numpy()
        ix=rng.integers(0,len(delta),size=(3500,len(delta)))
        comp={'races':int(vals.rid.nunique()),'horses':len(vals),'before_brier':float(np.mean((p0-yc)**2)),'after_brier':float(np.mean((p1-yc)**2)),'race_mean_gain':float(delta.mean()),'ci95':[float(x) for x in np.quantile(delta[ix].mean(axis=1),[.025,.975])]}
        for s in [old,new]:
            comp[s+'_hits']=int(vals.sort_values(['rid',s,'no'],ascending=[True,False,True],kind='stable').groupby('rid').head(3).top3.sum())
        comparison[old+'_vs_'+new]=comp
    by_year={}
    for year,g in vals.groupby('year'):
        by_year[str(year)]={key:float(((g[key]-g.top3)**2).mean()) for key in ['direct_resilience','direct_with_rival_reserve','four_zone_resilience','four_zone_with_rival_reserve']}
    stage_ref=baseline[[f'p_zone{k}_resilience' for k in range(1,5)]].to_numpy()
    stage_diff=np.abs(stage_ref-zones)
    out={'study':'H017B rival front hypothetical staying power, strictly as-of','features':CTX,'comparison':comparison,'year':by_year,'zone_stage_prediction_change_mean_abs':float(stage_diff.mean()),'limitations':['historical exploration only; no live M4 input','front_intent from past4C, not direct first-turn sprint','past front hold/fade may proxy class/abilities rather than physiological stamina','as-of rival features exclude horse own contribution and target actual pace/finish','No proof of live betting EV']}
    # Outcome labels may change but predictions must be identical.
    perm=z.copy();perm.loc[te,'top3']=1-perm.loc[te,'top3'];perm.loc[te,'zone']=3-perm.loc[te,'zone'];perm.loc[te,'c4']=1
    aa,bb,zz=predict_context(fit,perm,te)
    assert np.array_equal(a,aa) and np.array_equal(b,bb) and np.array_equal(zones,zz), 'Test leakage'
    out['lookahead_test']='PASS outcome swap under frozen model'
    (OUT/'H017_rival_reserve_aggregate.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(out,ensure_ascii=False,indent=2))
    return out
if __name__=='__main__':main()