#!/usr/bin/env python3
"""H010 (research only): pre-race course demands x horse's own earlier stage behavior.

Official app Ability C / M3 / P10 is NEVER mutated. Reuses frozen H008-D market+M3
shadow and H008-E horse history, then separates own-stage main effects from
interactions with as-of inferred corner count / historic course lap demands.

Validation dates 2025-26 were already studied; this is an exploratory chronologic
stress test, NOT a pristine backtest or a profitable strategy.
"""
from __future__ import annotations
import os, sys, json, csv, math, pathlib, collections
import numpy as np
from scipy.optimize import minimize

ROOT=pathlib.Path('/mnt/data')
DIR=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'h008e_individual_response_20261123'))
# Installed GitHub research tree fallback: validation/h010 next to validation/h008e.
if (DIR.parent/'h008e'/'h008e_individual_response.py').exists():
    sys.path.insert(0,str(DIR.parent/'h008e'))
import h008e_individual_response as E
D=E.D
BASE_RES=ROOT/'h008d_full_lap_fit'/'H008D_results.json'
if not BASE_RES.exists():
    BASE_RES=DIR.parent/'h008d'/'H008D_AGGREGATE_RESULT_20261123.json'
OUT=DIR
# Prespecified feature design, no knowledge of validation labels.
# Only previous individual 3C position, own final 3F relative fastest, 4C -> finish.
# Course demands are statistics of STRICTLY EARLIER races from the same course.
FEATURES=['horse_past_c3_frontness','horse_past_relative_late3f','horse_past_c4_to_finish_gain',
          'horse_frontness_x_corner_load','horse_late3f_x_course_gear_shift','horse_gain_x_course_attrition']

def stage_from_prior(rec):
    """Horse stage metrics from HISTORICAL race only, no target outcomes."""
    n=rec['n'];c3=rec.get('c3');c4=rec.get('c4');fin=rec.get('fin')
    r=rec.get('own_response',np.array([np.nan]*4))
    return np.array([(n-c3)/(n-1) if c3 is not None else np.nan,
            float(r[1]) if np.isfinite(r[1]) else np.nan,
            (c4-fin)/(n-1) if c4 is not None else np.nan],float)

def past_stage_means(target,hist,min_obs=3):
    hh=[z for z in hist.get(target['name'],[]) if z['date']<target['date']][:10]
    if any(z['date']>=target['date'] for z in hh):raise AssertionError('future or same day history')
    # C3/C4 can reflect different physical corners for 2/3/4-turn courses; use as rank only.
    # Prefer same surface, but retain other surface with lower fixed weight.
    sums=np.zeros(3);ws=np.zeros(3);cnt=np.zeros(3,dtype=int)
    for i,z in enumerate(hh):
        w=.88**i*(1 if z['surface']==target['surface'] else .35)*math.exp(-abs(z['dist']-target['distance'])/850)
        a=stage_from_prior(z)
        for k in range(3):
            if np.isfinite(a[k]):sums[k]+=w*a[k];ws[k]+=w;cnt[k]+=1
    x=np.divide(sums,ws,out=np.zeros(3),where=ws>0)
    # Fixed evidence shrinkage; zero per target means neutral after within-race centering.
    conf=np.minimum(cnt/5.,1.)
    x=np.where(cnt>=min_obs,x*conf,np.nan)
    return x,cnt,len(hh)

def course_demand(h,course,coarse):
    """Source dates strictly before predicted race; no current-race pace labels."""
    shape,start,demand,n,src=D.course_template(h['date'],h['venue'],h['surface'],h['distance'],h['turn'],course,coarse)
    corners=float(np.clip((h['turn']-2)/2.,-1.,2.))
    if shape is None or demand is None:return np.array([corners,np.nan,np.nan]),n,src
    return np.array([corners,float(demand[2]),float(demand[4])]),n,src

def prep_features(rows,hist,course,coarse):
    info=collections.Counter();coh=[]
    for r in rows:
        s,n,nh=past_stage_means(r,hist)
        demand,ncourse,src=course_demand(r,course,coarse)
        if ncourse<3:demand[1:]=np.nan
        r['h010_stages']=s
        r['h010_course']=demand
        r['h010_valid_hist']=int((n>=3).sum())
        r['h010_course_sample']=ncourse
        info['horse_total']+=1
        if nh>=5:info['horses_ge5_prior']+=1
        if ncourse>=12:info['course_ge12_prior']+=1
        if ncourse<3:info['course_unavailable']+=1
        coh.append(r)
    # Train-only scaling of course demands; 2025-26 data never changes training stats.
    training=[r for r in coh if r['year']==2024]
    if not training:raise RuntimeError('No 2024 training rows')
    C=np.asarray([r['h010_course'] for r in training])
    means=[];sds=[]
    for k in (1,2):
        z=C[:,k];v=z[np.isfinite(z)]
        if not len(v):raise RuntimeError('No training lap demands')
        means.append(float(v.mean()));sds.append(float(max(v.std(),.15)))
    stats={'mean':means,'std':sds}
    # Center horse stage response within each race, subtract field mean. Note that
    # the interaction uses a *course-wide* demand, but horse-specific stage.
    by=collections.defaultdict(list)
    for r in coh:by[r['rid']].append(r)
    for rid,rs in by.items():
        hor=np.array([r['h010_stages'] for r in rs]);valid=np.isfinite(hor)
        counts=valid.sum(axis=0);avg=np.divide(np.nansum(hor,axis=0),counts,out=np.zeros(3),where=counts>0)
        for r in rs:
            # Missing prior stage evidence = neutral, not an artificial fast closing score.
            centered=np.where(np.isfinite(r['h010_stages']),r['h010_stages']-avg,0.)
            d=r['h010_course']
            # Turn load: 2C->0, 3C->0.5, 4C->1, known from historical same-course records.
            # For late dynamics clip standardized earlier-course features, not current lap.
            gear=np.clip((d[1]-means[0])/sds[0],-2,2) if np.isfinite(d[1]) else 0.
            attr=np.clip((d[2]-means[1])/sds[1],-2,2) if np.isfinite(d[2]) else 0.
            inter=centered*np.array([d[0],gear,attr])
            r['h010_raw']=np.r_[centered,inter]
    return coh,stats,dict(info)

def make_arrays(rows):
    rs=sorted(rows,key=lambda x:(x['rid'],x['no']))
    start=np.array([i for i,r in enumerate(rs) if i==0 or r['rid']!=rs[i-1]['rid']],dtype=int)
    grp=np.searchsorted(start,np.arange(len(rs)),side='right')-1
    q=np.asarray([r['q'] for r in rs]);y=np.asarray([r['y'] for r in rs]);
    base=np.asarray([r['features'][:8] for r in rs])
    ext=np.asarray([r['h010_raw'] for r in rs]);return rs,start,grp,q,y,np.column_stack([base,ext])

def fit_group(q,y,x,start,grp,frozen,feature_slice,reg=.00018):
    """Fit a group jointly only on training rows. L2 to restrain 2024 overfitting."""
    ix=np.arange(feature_slice.start,feature_slice.stop)
    def obj(v):
        co=frozen.copy();co[ix]=v
        p=D.projected_prob(q,x,co,start,grp)
        return float(np.mean((p-y)**2)+reg*np.dot(v,v))
    op=minimize(obj,np.zeros(len(ix)),method='L-BFGS-B',bounds=[(-2.0,2.0)]*len(ix),
                options={'maxiter':160,'ftol':1e-14,'eps':1e-4})
    out=frozen.copy();out[ix]=op.x
    return out,{'success':bool(op.success),'objective':float(op.fun),'coef':op.x.tolist(),'message':str(op.message)}

def metrics(rs, start,y,p,group):
    result=[]
    for a,b in zip(start,list(start[1:])+[len(rs)]):
        order=np.argsort(-p[a:b])[:3]  # H008-D tie policy for exact baseline parity
        arr=rs[a:b]
        result.append({'rid':arr[0]['rid'],'year':arr[0]['year'],'venue':arr[0]['venue'],
          'surface':arr[0]['surface'],'distance':arr[0]['distance'],'n':len(arr),
          'brier':float(np.mean((p[a:b]-y[a:b])**2)),
          'hits':int(y[a:b][order].sum()),'winner':int(any(arr[k]['fin']==1 for k in order)),
          'top3':'-'.join(str(arr[k]['no']) for k in order)})
    return result,{'races':len(result),'horses':len(rs),'brier':float(np.mean([x['brier'] for x in result])),
                  'top3_hits':sum(x['hits'] for x in result),'winner_in_top3':sum(x['winner'] for x in result)}

def ci(d,seed=20261123,reps=4000):
    arr=np.asarray(d,float);n=len(arr)
    if n==0:return None
    rng=np.random.default_rng(seed);boot=np.array([arr[rng.integers(n,size=n)].mean() for _ in range(reps)])
    return {'n_races':n,'mean_gain':float(arr.mean()),'ci95':np.quantile(boot,[.025,.975]).tolist()}

def run():
    # Fully historical data read twice by inherited H008E loader, preserving exact IDs.
    history,course,coarse,audit,yrs,coverage=E.load_history_with_actual_response()
    turnset=collections.defaultdict(dict)
    for (v,s,d,t),values in course.items():turnset[(v,s,d)][t]=values[0]
    cards,ta=D.load_targets();reject=collections.Counter();rows=[]
    for rid,card in sorted(cards.items()):
        c=card[0];opts=turnset.get((c['venue'],c['surface'],c['distance']),{})
        known={t for t,ds in opts.items() if np.searchsorted(ds,c['date'],side='left')>=1}
        if len(known)!=1:reject['course_ambiguous_or_missing']+=1;continue
        turn=next(iter(known))
        for h in card:
            h['turn']=turn
            h.update(D.horse_features(h,history,course,coarse))
            h['y']=int(h['fin']<=3)
        q=D.pl_top3([h['odds'] for h in card]);q=3/len(card)+.82264626*(q-3/len(card))
        m=np.asarray([h['m3'] for h in card]);ord=np.argsort(np.argsort(m))
        for i,h in enumerate(card):
            h['q']=float(q[i]);h['features']=np.asarray([h['general'],.5-(ord[i]+.5)/len(card),h['lap_fit']]+h['demand_fits'])
            rows.append(h)
    rows,scales,cov=prep_features(rows,history,course,coarse)
    train=[r for r in rows if r['year']==2024];test=[r for r in rows if r['year']>=2025]
    arr_t=make_arrays(train);trows,st,gt,qt,yt,xt=arr_t
    frozen=json.loads(BASE_RES.read_text())['coefficients_2024_fixed']['market_plus_M3_proxy']
    baseline=np.r_[np.asarray(frozen,float),np.zeros(6)]
    # Main effects added first to remove generic horse-stage signal from interaction.
    horse,fit_h=fit_group(qt,yt,xt,st,gt,baseline,slice(8,11),reg=.00012)
    structure,fit_s=fit_group(qt,yt,xt,st,gt,horse,slice(11,14),reg=.00018)
    # Explicit baseline/no-effect if 2024 does not justify activation. All signed fits
    # are research diagnostics, never auto-written to production JS or weights.
    models={'market_only':np.zeros(14),'market_plus_M3_shadow':baseline,
            'plus_horse_stage_main_effects':horse,'plus_course_structure_interactions':structure}
    output={'schema':'H010_course_horse_interactions_v1','run_date':'2026-11-23',
     'feature_definitions':FEATURES,'training':'2024 only (previously explored)',
     'test':'2025-2026/10/04 (previously explored, NOT pristine)',
     'freeze':'2024 normalize course-demand means/scales, M3 baseline from H008-D frozen coefficients',
     'pre_race_input':'strictly prior horse performance and prior same course-average lap/turn, not current race actuals',
     'sample_audit':{'hist_unique':audit.get('valid_unique'), 'target_rejected':dict(reject),
       'train_races':len({r['rid'] for r in train}),'test_races':len({r['rid'] for r in test}),**cov},
     'frozen_scaler':scales,'fit_stage_main':fit_h,'fit_structure':fit_s,
     'coefficients':{k:v.tolist() for k,v in models.items()},'results':{},'paired':{},'strata':{},
     'caveats':['no official Ability C / live JS M3 parity','not untouched test years',
     'final closing win odds are post-race (not T-15)','course turn inferred from old records, not full inner-outer lane/first-turn geometry',
     'aggregate leader laps not individual 200m times','horse own 3C index for 2C/4C courses not same physical point']}
    rdetail=[]
    for segment,subset in [('train2024',train),('test2025_26',test),('test2025',[r for r in test if r['year']==2025]),('test2026',[r for r in test if r['year']==2026])]:
        rs,start,grp,q,y,x=make_arrays(subset)
        stats={};allrace={}
        for k,coef in models.items():
            prob=D.projected_prob(q,x,coef,start,grp)
            race,summary=metrics(rs,start,y,prob,grp);stats[k]=summary;allrace[k]=race
        output['results'][segment]=stats
        if segment=='test2025_26':
            for b,c in [('market_plus_M3_shadow','plus_horse_stage_main_effects'),('plus_horse_stage_main_effects','plus_course_structure_interactions'),('market_plus_M3_shadow','plus_course_structure_interactions'),('market_only','plus_course_structure_interactions')]:
                old=allrace[b];new=allrace[c];assert [r['rid'] for r in old]==[r['rid'] for r in new]
                output['paired'][b+'_to_'+c]={**ci([a['brier']-b0['brier'] for a,b0 in zip(old,new)]),
                    'changed_top3_races':sum(a['top3']!=b0['top3'] for a,b0 in zip(old,new)),
                    'delta_top3_hits':sum(b0['hits']-a['hits'] for a,b0 in zip(old,new)),
                    'better_brier_races':sum(a['brier']>b0['brier'] for a,b0 in zip(old,new)),
                    'worse_brier_races':sum(a['brier']<b0['brier'] for a,b0 in zip(old,new))}
            for label,predicate in [('turf',lambda z:z['surface']=='芝'),('dirt',lambda z:z['surface']=='ダ'),
                  ('Tokyo_Nakayama_turf',lambda z:z['venue'] in ('東京','中山') and z['surface']=='芝'),
                  ('Tokyo_Nakayama_turf1600_1800_2000',lambda z:z['venue'] in ('東京','中山') and z['surface']=='芝' and z['distance'] in (1600,1800,2000))]:
                older=[z for z in allrace['plus_horse_stage_main_effects'] if predicate(z)]
                after=[z for z in allrace['plus_course_structure_interactions'] if predicate(z)]
                assert [z['rid'] for z in older]==[z['rid'] for z in after]
                output['strata'][label]={**ci([a['brier']-b['brier'] for a,b in zip(older,after)],reps=2500),
                   'hits_before':sum(z['hits'] for z in older),'hits_after':sum(z['hits'] for z in after)}
            for a,b,c in zip(allrace['market_plus_M3_shadow'],allrace['plus_horse_stage_main_effects'],allrace['plus_course_structure_interactions']):
                rdetail.append({'rid':a['rid'],'year':a['year'],'venue':a['venue'],'distance':a['distance'],
                 'surface':a['surface'],'brier_m3':a['brier'],'brier_stage_main':b['brier'],'brier_interaction':c['brier'],
                 'm3_hits':a['hits'],'stage_main_hits':b['hits'],'interaction_hits':c['hits'],'m3_top3':a['top3'],
                 'interaction_top3':c['top3']})
    (OUT/'H010_RESULT_AGGREGATE.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf8')
    with (OUT/'H010_RACE_DETAIL_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rdetail[0]));w.writeheader();w.writerows(rdetail)
    print(json.dumps({'audit':output['sample_audit'],'fitted_coefs':output['coefficients'],'results':output['results'],
        'paired':output['paired'],'strata':output['strata']},ensure_ascii=False,indent=2),flush=True)
    return output

if __name__=='__main__':run()