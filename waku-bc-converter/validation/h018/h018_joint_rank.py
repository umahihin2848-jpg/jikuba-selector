#!/usr/bin/env python3
"""H018 research-only: project H017 as-of horse-wise four 4C zone probabilities to physically
consistent slot capacities; one-to-one MAP rank assignment and fixed 2016-23 course-zone
finishability sensitivity. NO test actual C4/finish/current laps/closing q in predictions.
H017 2024-26 evaluations were already repeatedly mined; this is not a pristine holdout.
The recorded TARGET 4C ranks can tie and are therefore not necessarily permutation ranks.
"""
from __future__ import annotations
import json, pathlib
import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from sklearn.metrics import roc_auc_score, log_loss

ROOT=pathlib.Path('/mnt/data'); O=pathlib.Path(__file__).resolve().parent; O.mkdir(exist_ok=True)
H17=(O/'H017_horse_diag_PRIVATE.csv') if (O/'H017_horse_diag_PRIVATE.csv').exists() else ROOT/'H017_4角4帯_終盤到達研究_20261123'/'H017_horse_diag_PRIVATE.csv'
H13=(O/'H013_87コース_4角4位置帯_過去と後期の比較.csv') if (O/'H013_87コース_4角4位置帯_過去と後期の比較.csv').exists() else ROOT/'H013_全国4角危険位置_20261123'/'H013_87コース_4角4位置帯_過去と後期の比較.csv'
H13HORSE=(O/'H013_危険馬_過去検証_PRIVATE.csv') if (O/'H013_危険馬_過去検証_PRIVATE.csv').exists() else ROOT/'H013_全国4角危険位置_20261123'/'H013_危険馬_過去検証_PRIVATE.csv'
PROB=[f'p_zone{k}_resilience' for k in range(1,5)]
BANDS=['前25%','前中25-50%','後中50-75%','最後方25%']; SEED=18024


def zone_for_rank(n:int)->np.ndarray:
    assert 12<=n<=18
    idx=np.arange(1,n+1)
    return np.where(idx/n<=.25,0,np.where(idx/n<=.5,1,np.where(idx/n<=.75,2,3))).astype(int)

def project_slots(p:np.ndarray,counts:np.ndarray, tol=1e-10, max_iter=3000):
    """KL I-projection preserving each row's unit budget and physically available positions.
    No real result, actual 4C, or market odds are used. Counts are solely field size."""
    a=np.asarray(p,dtype=float); c=np.asarray(counts,dtype=float)
    if a.ndim!=2 or a.shape[1]!=4 or np.any(a<0) or not np.isfinite(a).all():raise ValueError('invalid zone p')
    if a.shape[0]!=int(c.sum()) or np.any(c<=0):raise ValueError('capacity vs field')
    if not np.allclose(a.sum(1),1,atol=1e-6):raise ValueError('horse prob not normalized')
    q=np.maximum(a,1e-14).copy()
    for it in range(max_iter):
        q *= c/np.maximum(q.sum(axis=0),1e-300)
        q /= np.maximum(q.sum(axis=1)[:,None],1e-300)
        if (np.max(abs(q.sum(axis=0)-c)) <tol and np.max(abs(q.sum(axis=1)-1))<tol):break
    else:raise ArithmeticError('did not converge')
    return q,it+1

def rank_matrix(q:np.ndarray,zone_index:np.ndarray):
    capacities=np.bincount(zone_index,minlength=4)
    r=q[:,zone_index]/capacities[zone_index][None,:]
    if not np.allclose(r.sum(0),1,atol=1e-8) or not np.allclose(r.sum(1),1,atol=1e-8):
        raise ValueError('matrix not bistochastic')
    return r

def map_unique_order(rankprob):
    # Ties within a rank zone are broken by deterministic ordinal based on horse order;
    # NO evidence that the assigned exact intra-band rank is precise.
    rows,cols=linear_sum_assignment(-np.log(np.maximum(rankprob,1e-30)))
    ranks=np.empty(rankprob.shape[0],dtype=int);ranks[rows]=cols+1
    if sorted(ranks.tolist())!=list(range(1,len(ranks)+1)):raise AssertionError('duplicate MAP ranks')
    return ranks

def budget3(p,groups):
    # Same three-per-race logistic offset as H017. Applies only to predicted probabilities.
    x=np.asarray(p,float);x=np.clip(x,1e-7,1-1e-7)
    out=np.zeros(len(x));logits=np.log(x/(1-x))
    for ix in groups:
        z=logits[ix];lo,hi=-30.,30.
        for _ in range(55):
            m=(lo+hi)/2
            s=np.sum(1/(1+np.exp(-np.clip(z+m,-50,50))))
            if s<3:lo=m
            else:hi=m
        out[ix]=1/(1+np.exp(-np.clip(z+(lo+hi)/2,-50,50)))
    return out

def course_priors(table):
    # ONLY H013 fixed 2016–2023 rows used to create course-specific zone finishing propensity.
    # 30 pseudo horses from national 2016–23 rate per band to temper sparse tracks.
    t=table.copy(); conv={k:i for i,k in enumerate(BANDS)}
    t['k']=t['4角順位帯'].map(conv)
    assert not t.k.isna().any() and not t.duplicated(['コース','k']).any()
    count=t.groupby('k')['学習馬数'].sum().reindex(range(4)).to_numpy()
    win=t.groupby('k')['学習3着内頭数'].sum().reindex(range(4)).to_numpy()
    globalrate=win/np.maximum(count,1)
    out={}
    for cr,g in t.groupby('コース'):
        g=g.set_index('k').reindex(range(4))
        n=g['学習馬数'].fillna(0).to_numpy(float);s=g['学習3着内頭数'].fillna(0).to_numpy(float)
        out[cr]=(s+30*globalrate)/(n+30)
    return out,globalrate


def metric_summary(d, raw, joint, ranks, top_base, top_adj):
    yy=d.zone.to_numpy(int);top=d.top3.to_numpy(float)
    a=np.eye(4)[yy]
    result={}
    for label,p in [('independent',raw),('joint_capacity',joint)]:
        result[label]={'multi_brier':float(np.mean(np.sum((p-a)**2,axis=1)/4)),
            'log_loss':float(log_loss(yy,np.clip(p,1e-10,1),labels=np.arange(4))),
            'zone_argmax_accuracy':float(np.mean(p.argmax(axis=1)==yy)),
            'backhalf_auc':float(roc_auc_score(yy>=2,p[:,2:].sum(1)))}
    result['joint_map_band_accuracy']=float(np.mean(zone_from_rank_for_vector(d, ranks)==yy))
    result['top3_baseline_brier']=float(np.mean((top_base-top)**2))
    result['top3_course_fixed_sensitivity_brier']=float(np.mean((top_adj-top)**2))
    result['top3_baseline_hits']=hits(d,top_base)
    result['top3_course_fixed_sensitivity_hits']=hits(d,top_adj)
    result['top3_original_fourzone_brier']=float(np.mean((d.four_zone_resilience.to_numpy(float)-top)**2))
    result['top3_original_fourzone_hits']=hits(d,d.four_zone_resilience.to_numpy(float))
    return result

def zone_from_rank_for_vector(d,ranks):
    n=d.groupby('rid',sort=False).no.transform('size').to_numpy()
    fr=ranks/n
    return np.where(fr<=.25,0,np.where(fr<=.5,1,np.where(fr<=.75,2,3)))

def hits(d,p):
    z=d[['rid','no','top3']].copy();z['p']=p
    return int(z.sort_values(['rid','p','no'],ascending=[True,False,True],kind='stable').groupby('rid').head(3).top3.sum())

def bootstrap_by_race(d,raw,joint,before,after,ns=4000):
    # Race equal-weight change: log loss, multinomial Brier and downstream Brier.
    y=d.zone.to_numpy(int);top=d.top3.to_numpy(float)
    a=np.eye(4)[y]
    changes={
      'stage_multi_brier':(np.sum((raw-a)**2,axis=1)-np.sum((joint-a)**2,axis=1))/4,
      'stage_logloss':np.log(np.maximum(joint[np.arange(len(y)),y],1e-15))-np.log(np.maximum(raw[np.arange(len(y)),y],1e-15)),
      'downstream_top3_brier':(before-top)**2-(after-top)**2,
    }
    rng=np.random.default_rng(SEED);out={}
    for label,deltas in changes.items():
        per=pd.Series(deltas).groupby(d.rid).mean().to_numpy()
        bs=np.mean(per[rng.integers(len(per),size=(ns,len(per)))],axis=1)
        out[label]={'race_mean_gain':float(per.mean()),'ci95':[float(v) for v in np.quantile(bs,[.025,.975])],
                    'positive_races':int((per>0).sum()),'negative_races':int((per<0).sum()),'races':len(per)}
    return out

def run():
    d=pd.read_csv(H17,encoding='utf-8-sig');d['rid']=d.rid.astype(str)
    if d.duplicated(['rid','no']).any():raise AssertionError('repeated horse within race')
    if '新潟芝1000m' in d.profile.unique():raise AssertionError('straight race should be excluded')
    assert d.rid.nunique()==977 and len(d)==14876
    assert (d.groupby('rid').top3.sum()==3).all()
    train=pd.read_csv(H13,encoding='utf-8-sig')
    prior, globalrate=course_priors(train)
    missing=set(d.profile)-set(prior)
    if missing:raise ValueError('Missing strictly earlier course priors:'+str(missing))
    groups=[i.to_numpy() for _,i in d.reset_index().groupby('rid',sort=False)['index']]
    raw=d[PROB].to_numpy(float);joint=np.zeros_like(raw)
    assigned=np.zeros(len(d),dtype=int);itercounts=[]
    phys_inconsistent=0;raw_viol1=0;raw_viol2=0;sumabs=0.;raw_max=0.
    rows=[]
    slot_stats=[]
    for rid,grp in d.groupby('rid',sort=False):
        ix=grp.index.to_numpy();n=len(ix);zrank=zone_for_rank(n);cnt=np.bincount(zrank,minlength=4)
        p=raw[ix];p0=p.sum(axis=0);q,it=project_slots(p,cnt)
        rr=rank_matrix(q,zrank);mapr=map_unique_order(rr)
        joint[ix]=q;assigned[ix]=mapr;itercounts.append(it)
        rawdev=np.abs(p0-cnt);raw_max=max(raw_max,rawdev.max());sumabs+=rawdev.sum()/4
        raw_viol1+=int(rawdev.max()>1);raw_viol2+=int(rawdev.max()>2)
        obs=grp.zone.value_counts().reindex(range(4),fill_value=0).to_numpy()
        phys_inconsistent+=int(np.any(obs!=cnt))
        slot_stats.append({'rid':rid,'year':int(grp.year.iloc[0]),'profile':str(grp.profile.iloc[0]),
          'surface':str(grp.surface.iloc[0]),'field':n,'raw_max_slot_deviation':float(rawdev.max()),
          'observed_recorded_zone_count_mismatch':bool(np.any(obs!=cnt)),
          'raw_zone_expected':[float(v) for v in p0], 'joint_capacity_counts':cnt.tolist(),
          'recorded_zone_counts':obs.tolist()})
    assert np.allclose(joint.sum(1),1,atol=2e-9)
    assert np.max([np.max(abs(joint[ix].sum(0)-np.bincount(zone_for_rank(len(ix)),minlength=4))) for ix in groups])<1e-8
    assert all(sorted(assigned[ix].tolist())==list(range(1,len(ix)+1)) for ix in groups)
    # Reweight *original H017 four-zone conditional finish prediction* with fixed earlier course zone success rates.
    # This is a sensitivity only, not the exact H017 learned P(top3|zone), unavailable in the saved CSV.
    per=np.vstack([prior[p] for p in d.profile])
    delta=((joint-raw)*per).sum(axis=1)
    pred0=d.four_zone_resilience.to_numpy(float)
    pred_adj=budget3(np.clip(pred0+delta,1e-5,.99999),groups)
    d['predicted_4c_MAP_rank']=assigned
    d['predicted_4c_MAP_zone']=zone_from_rank_for_vector(d,assigned)
    for k in range(4):d[f'p_zone{k+1}_joint']=joint[:,k]
    d['adjusted_finish_sensitivity']=pred_adj
    result={'study':'H018 simultaneous 4C four-band occupancy and bijective rank assignment, strictly predicted past history',
       'status':'RETROSPECTIVE_RESEARCH_ONLY / predictions from H017 as-of scores; no test-time refit',
       'inputs':['H017_horse_diag_PRIVATE.csv predictions from 2022-23 fits','H013 2016-23 fixed 4C band finishing rates ONLY'],
       'train_time':'All fitted H017 horse models 2022-23, fixed H013 course marginal success rates 2016-23; NOT refit with 2024+ outcomes',
       'test':{'races':int(d.rid.nunique()),'horses':len(d),'years':'2024–2026-10-04','profiles':int(d.profile.nunique()),'stages':4},
       'constraints':{'independent_races_exceed_one_slot_in_any_zone':raw_viol1,'exceed_two_slots':raw_viol2,
          'mean_abs_expected_slot_deviation_per_race_per_zone':sumabs/d.rid.nunique(),
          'max_expected_slot_deviation':raw_max,'joint_races_violate_zone_capacity':0,
          'joint_races_with_duplicate_MAP_rank':0,'recorded_4c_band_occupancy_inconsistent_with_permutation':phys_inconsistent,
          'note':'Official corner passing order may contain same ranks for parallel runners. Strict 1–N is a latent ordered finish-at-corner approximation; do not equate exactly with recorded corner ranks.'},
       'overall':metric_summary(d,raw,joint,assigned,pred0,pred_adj),
       'paired_race_bootstrap_95ci':bootstrap_by_race(d,raw,joint,pred0,pred_adj),
       'by_year':{},'by_surface':{},'clean_no_tie_race_subset':{},'H013_danger':{},
       'constraints_method':'KL / iterative-proportional-fitting projection onto row sum 1, band-column sums exact available slots, expand equally within band to doubly stochastic individual rank matrix; unique-rank MAP by Hungarian assignment. No fitted parameters.',
       'downstream_method':'Fixed 2016-23 course-zone smoothed marginal success rate (30 horses national shrink) to transfer change in predicted band probabilities to existing H017 four_zone_resilience; race-rebudget 3. SENSITIVITY ONLY, not exact H017 horse-specific conditional probabilities.',
       'statistical_caveats':['2024-26 historical period heavily used in H004-H017; confidence intervals are conditional on extensive exploration and not independent validation',
         'H017 probabilities use research proxies, not exact live M3/P10/M4/Ability C','Current race true 4C positions, actual pace, top3, final odds not used for projection; current labels used for evaluation only',
         'Recorded 4C passing rank ties mean capacity forced model and historical bands are not always literally comparable',
         'H013 prior rates and H017 predictions trained on overlapping history 2016-23, but no contemporary test fitting',
         'No simulation of actual jockey actions, individual 200m sectional times or lane paths','No threshold optimization on 2024-26, no EV or betting exclusion proof']}
    for what,col in [('by_year','year'),('by_surface','surface')]:
        for val,gr in d.groupby(col):
            ix=gr.index.to_numpy()
            result[what][str(val)]=metric_summary(gr,raw[ix],joint[ix],assigned[ix],pred0[ix],pred_adj[ix])
    clean_rids={r['rid'] for r in slot_stats if not r['observed_recorded_zone_count_mismatch']}
    dc=d.loc[d.rid.isin(clean_rids)]
    if len(dc):
        ii=dc.index.to_numpy()
        result['clean_no_tie_race_subset']={'races':dc.rid.nunique(),'horses':len(dc),'metrics':metric_summary(dc,raw[ii],joint[ii],assigned[ii],pred0[ii],pred_adj[ii])}
    # H013 flags: all historical flagged horses, not postrace selection.
    flag=pd.read_csv(H13HORSE,encoding='utf-8-sig')[['レースID','馬番']].rename(columns={'レースID':'rid','馬番':'no'})
    flag.rid=flag.rid.astype(str);flag.no=flag.no.astype(int)
    assert not flag.duplicated(['rid','no']).any()
    f=d.merge(flag,on=['rid','no'],how='inner',validate='one_to_one')
    def inspect(g):
        return {'horses':len(g),'races':int(g.rid.nunique()),'actual_top3':int(g.top3.sum()),'actual_3rd_rate':float(g.top3.mean()) if len(g) else None,
                'closing_market_expected':float(g.q.sum()),'mean_pred_3rd_sensitivity':float(g.adjusted_finish_sensitivity.mean()),
                'actual_last25':int((g.zone==3).sum())}
    result['H013_danger']={'all':inspect(f),
         'H017_last25_p_ge50_and_model_top3_le10':inspect(f[(f.p_zone4_resilience>=.5)&(f.four_zone_resilience<=.1)]),
         'H018_joint_last25_p_ge50_and_model_top3_le10':inspect(f[(f.p_zone4_joint>=.5)&(f.adjusted_finish_sensitivity<=.1)]),
         'joint_last25_p_ge50':inspect(f[f.p_zone4_joint>=.5])}
    (O/'H018_AGGREGATE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    pd.DataFrame(slot_stats).drop(columns=['rid']).to_csv(O/'H018_レース別の順位整合性_匿名.csv',index=False,encoding='utf-8-sig')
    # NO actual outcome/actual position used in pre-race exported joint rank; private file separates labels by naming.
    exports=['rid','year','profile','surface','no','name','predicted_4c_MAP_rank','predicted_4c_MAP_zone','zone','top3','q',
            *PROB,*[f'p_zone{k+1}_joint' for k in range(4)],'direct_resilience','four_zone_resilience','adjusted_finish_sensitivity','prior_late','prior_hold','front_pressure']
    d[exports].to_csv(O/'H018_全頭同時4角位置_馬別PRIVATE.csv',index=False,encoding='utf-8-sig')
    courses=[]
    for pr,g in d.groupby('profile'):
        idx=g.index.to_numpy();cnt=len(g);yy=g.zone.to_numpy(int)
        courses.append({'course':pr,'surface':str(g.surface.iloc[0]),'races':int(g.rid.nunique()),'horses':cnt,
           'original_multi_brier':float(np.mean((raw[idx]-np.eye(4)[yy])**2)),
           'joint_multi_brier':float(np.mean((joint[idx]-np.eye(4)[yy])**2)),
           'original_back_auc':float(roc_auc_score(yy>=2,raw[idx,2:].sum(1))) if len(np.unique(yy>=2))==2 else None,
           'joint_back_auc':float(roc_auc_score(yy>=2,joint[idx,2:].sum(1))) if len(np.unique(yy>=2))==2 else None,
           'observed_top3':int(g.top3.sum()),'risk_mean_original_p_zone4':float(raw[idx,3].mean()),'risk_mean_joint_p_zone4':float(joint[idx,3].mean())})
    pd.DataFrame(courses).to_csv(O/'H018_86コース別_予測位置補正効果.csv',index=False,encoding='utf-8-sig')
    # Independent-of-current-labels invariant: label mutation, including market/actual zone, does not affect output.
    flipped=d.copy();flipped['top3']=1-flipped['top3'];flipped['zone']=3-flipped['zone'];flipped['q']=1-flipped['q']
    copied=flipped[PROB].to_numpy(float);assert np.array_equal(copied,raw)
    for rid,g in flipped.groupby('rid',sort=False):
        ix=g.index.to_numpy();k=np.bincount(zone_for_rank(len(ix)),minlength=4)
        assert np.array_equal(project_slots(copied[ix],k)[0],joint[ix]),'projection changed by outcome'
    result['label_mutation_no_leakage']='PASS: as-of joint projection identical after test labels/market changed; course priors are 2016–23 only'
    (O/'H018_AGGREGATE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result

if __name__=='__main__':
    ret=run();print(json.dumps({k:ret[k] for k in ['constraints','overall','paired_race_bootstrap_95ci','clean_no_tie_race_subset','H013_danger']},ensure_ascii=False,indent=2))