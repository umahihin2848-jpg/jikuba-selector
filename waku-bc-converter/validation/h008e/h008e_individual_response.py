#!/usr/bin/env python3
"""H008-E: Individual-horse *historical* response to race-wide full-lap demands.

Research-only. Imports H008-D baseline and holds its 2024-calibrated market+M3
coefficients fixed. The only new target-known attributes are horse's own past
actual final3F, -3F leader gap, 3C/4C/finish places (never present race ones).
Actual 200m horse sectionals, position lanes and intervention effects are NOT observed.
"""
from __future__ import annotations
import sys, csv, math, json, pathlib, collections
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit

ROOT=pathlib.Path('/mnt/data')
DIR=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'h008d_full_lap_fit'))
# Repo checkout fallback (requires H008-D sibling script).
repo_dep=DIR.parent/'h008d'
if (repo_dep/'h008d_full_lap_fit.py').exists():sys.path.insert(0,str(repo_dep))
import h008d_full_lap_fit as D

OUT=DIR
EARLIER=ROOT/'umadete.csv'
H008D_RESULT=ROOT/'h008d_full_lap_fit'/'H008D_results.json'
if not H008D_RESULT.exists():H008D_RESULT=DIR.parent/'h008d'/'H008D_AGGREGATE_RESULT_20261123.json'
MAX_STARTS=15


def positive_position(v,n):
    x=D.inum(v)
    return x if x is not None and n is not None and 1<=x<=n else None


def own_old_response(record):
    """Only a prior result record; direction higher = stronger late response.

    The race fastest3F is not a horse's own 200m interval. 3C->4C movement and
    4C->finish movement are relative *positions*, not exact velocity.
    """
    n=record['n']; finish=record['fin']; c3=record.get('c3');c4=record.get('c4')
    last=record.get('last3f');fast=record.get('fastest3f');gap=record.get('gap600')
    # 1. Change in rank from 4th corner to finish in fraction of field
    close=(c4-finish)/(n-1) if c4 is not None else np.nan
    # 2. Time deficit to fastest *historical* closing runner: never own 200m segments
    last3= np.clip((fast-last)/3.,-1,0) if last is not None and fast is not None and 28<=last<=50 and 28<=fast<=50 else np.nan
    # 3. Actual historical distance behind leader at -600m, sign reversed
    g= -np.clip(gap,0,4)/3. if gap is not None and 0<=gap<=15 else np.nan
    # 4. Relative positional gain 3C to 4C during past race
    mid= (c3-c4)/(n-1) if c3 is not None and c4 is not None else np.nan
    return np.array([close,last3,g,mid],dtype=float)


def load_history_with_actual_response():
    hist,course,coarse,audit,years=D.load_history()
    refs={(h['name'],h['rid']):h for hh in hist.values() for h in hh}
    hit=set(); counts=collections.Counter()
    # Exact source headers, not subjective time-series approximations
    with EARLIER.open(encoding='cp932',newline='') as f:
        for r in csv.DictReader(f):
            name=D.normalize_name(r['馬名']);rid=str(r['レースID(新・馬番無16桁)']).strip()
            key=(name,rid)
            if key not in refs or key in hit:continue
            # H008-D has already checked date=rid[:8] and valid previous race.
            if D.date_val(r['日付']) != refs[key]['date'] or str(refs[key]['date'])!=rid[:8]:
                raise RuntimeError('historical date ID mismatch; reject leak')
            hit.add(key);h=refs[key]
            n=h['n'];last=D.fnum(r['上り3F']);fast=D.fnum(r['R最速上3F']);gap=D.fnum(r['上3F地点差'])
            h.update(last3f=last,fastest3f=fast,gap600=gap,
                     c3=positive_position(r['通過3'],n),c4=positive_position(r['通過4'],n))
            h['own_response']=own_old_response(h)
            counts['attached']+=1
            for i,k in enumerate(('c4_to_finish','last3f_vs_fastest','actual_gap600','c3_to_c4')):
                if np.isfinite(h['own_response'][i]):counts['valid_'+k]+=1
    if len(hit)!=len(refs):raise RuntimeError('Not all valid unique source history rows were joined')
    return hist,course,coarse,dict(audit),dict(years),dict(counts)


def weighted_response(x,weight):
    good=np.isfinite(x)&np.isfinite(weight)&(weight>0)
    if good.sum()<2:return np.nan,0.,0
    w=weight[good];z=x[good]
    if w.sum()<1e-9:return np.nan,0.,int(good.sum())
    eff=w.sum()**2/np.dot(w,w)
    return float(np.dot(w,z)/w.sum()),float(eff),int(good.sum())


def shape_weights(target,hh,template):
    """Pre-fixed H008-D distance, surface, turn & full 200m phase match.
    Never looks at target date race lap.
    """
    age=np.asarray([.9**i for i in range(len(hh))],dtype=float)
    base=age*np.asarray([(1 if h['surface']==target['surface'] else .30)
             *math.exp(-abs(h['dist']-target['distance'])/750)
             *(1 if h['turn']==target['turn'] else .78) for h in hh])
    curve=template[0]
    if curve is None:return base, np.zeros_like(base)
    curves=np.vstack([h['lap']['shape'] for h in hh]);rms=np.sqrt(np.mean((curves-curve)**2,axis=1))
    sim=np.exp(-.5*(rms/.50)**2)
    start_expected=template[1]
    if start_expected is not None:
        for i,h in enumerate(hh):
            if h['lap']['firstm']==D.first_m(target['distance']):
                sim[i]*=math.exp(-.5*((h['lap']['start']-start_expected)/1.4)**2)
    return base,base*sim


def own_features(target,hist,course,coarse):
    hh=[h for h in hist.get(target['name'],[]) if h['date']<target['date']][:MAX_STARTS]
    if any(h['date']>=target['date'] for h in hh):raise AssertionError('leakage: future own response')
    template=D.course_template(target['date'],target['venue'],target['surface'],target['distance'],target['turn'],course,coarse)
    if len(hh)<4 or template[0] is None:
        return {'raw':0.,'conditioned':0.,'own_n':len(hh),'usable':0,'eff':0.,'stage_diffs':[0.]*4,'stage_n':[0]*4,'neutral_reason':'low_history_or_course'}
    base,matched=shape_weights(target,hh,template)
    m=np.vstack([h.get('own_response',np.full(4,np.nan)) for h in hh])
    # Value is improvement for same horse in lap-matched historical scenarios
    # relative to its *own* generic past performance under matching surface/distance.
    generic=np.zeros(4);dif=np.zeros(4);nobs=[];neff=[]
    for k in range(4):
        a,ea,na=weighted_response(m[:,k],base)
        b,eb,nb=weighted_response(m[:,k],matched)
        nobs.append(nb)
        if not np.isfinite(a) or not np.isfinite(b) or na<3 or nb<3:continue
        generic[k]=a
        eff=min(ea,eb)
        neff.append(eff)
        shrink=eff/(eff+5)*template[3]/(template[3]+20)
        dif[k]=np.clip((b-a)*shrink,-.30,.30)
    # Pre-specify weights (not tuned to 2025/26 results). 4C-to-finish and
    # last3F get largest weights, -600m and 3C->4C provide location context.
    w=np.array([.4,.3,.2,.1]);
    # Generic response proxy for historical finishing/mid-course behavior,
    # independent from present-race position and terminal times.
    raw=float(np.dot(w,generic))
    cond=float(np.dot(w,dif))
    return {'raw':raw,'conditioned':cond,'own_n':len(hh),'usable':sum(v>=3 for v in nobs),
            'eff':float(min(neff)) if neff else 0.,'stage_diffs':dif.tolist(),'stage_n':nobs,
            'neutral_reason':None if neff else 'no_matched_effective_obs'}


def full_rows():
    hist,course,coarse,audit,years,coverage=load_history_with_actual_response()
    cards,target_audit=D.load_targets()
    turnsets=collections.defaultdict(dict)
    for (venue,surface,distance,turn),items in course.items():
        turnsets[(venue,surface,distance)][turn]=items[0]
    reject=collections.Counter();out=[]
    for rid,card in sorted(cards.items()):
        a=card[0]
        options=turnsets.get((a['venue'],a['surface'],a['distance']),{})
        known={t for t,dates in options.items() if np.searchsorted(dates,a['date'],side='left')>=1}
        if len(known)!=1:
            reject['missing_or_mixed_turn']+=1;continue
        turn=next(iter(known))
        for h in card:
            h['turn']=turn
            h.update(D.horse_features(h,hist,course,coarse))
            h['y']=int(h['fin']<=3)
            h['own']=own_features(h,hist,course,coarse)
        q=D.pl_top3([h['odds'] for h in card]);q=3/len(card)+.82264626*(q-3/len(card))
        m3=np.array([h['m3'] for h in card]); ranks=np.argsort(np.argsort(m3))
        for i,h in enumerate(card):
            h['q']=float(q[i])
            h['base_features']=np.asarray([h['general'],.5-(ranks[i]+.5)/len(card),h['lap_fit']]+h['demand_fits'])
            # PRE-SPECIFIED additional horse-individual features, generic and
            # course-lap-conditional response, no current-race result columns.
            h['features']=np.r_[h['base_features'],h['own']['raw'],h['own']['conditioned']]
            out.append(h)
    return out,{'history':audit,'history_years':years,'own_coverage':coverage,'target_issues':dict(target_audit),'rejected':dict(reject)}


def arrays(rows):
    rows=sorted(rows,key=lambda x:(x['rid'],x['no']))
    start=np.asarray([i for i,r in enumerate(rows) if i==0 or r['rid']!=rows[i-1]['rid']],dtype=np.int64)
    group=np.searchsorted(start,np.arange(len(rows)),side='right')-1
    q=np.asarray([r['q'] for r in rows]);y=np.asarray([r['y'] for r in rows]);f=np.asarray([r['features'] for r in rows]);
    return rows,q,y,f,start,group


def prob(q,f,coefs,start,group):
    return D.projected_prob(q,f,coefs,start,group)


def metric(rows,q,y,f,start,group,coefs):
    p=prob(q,f,coefs,start,group)
    data=[];same=0
    for a,b in zip(start, list(start[1:])+[len(rows)]):
        ix=np.argsort(-p[a:b],kind='stable')[:3]
        before=rows[a:b]
        data.append({'rid':before[0]['rid'],'year':before[0]['year'],'n':b-a,
                    'brier':float(np.mean((p[a:b]-y[a:b])**2)),
                    'hits':int(y[a:b][ix].sum()),'winner':int(any(before[int(i)]['fin']==1 for i in ix)),
                    'top3nos':'-'.join(str(before[int(i)]['no']) for i in ix)})
    return data,{'races':len(data),'horses':len(rows),'brier':float(np.mean([x['brier'] for x in data])),
                 'top3_hits':int(sum(x['hits'] for x in data)),'winner_in_top3':int(sum(x['winner'] for x in data))},p


def fit_one(q,f,y,start,group,old,col,reg=.000045):
    def obj(v):
        x=old.copy();x[col]=float(v[0])
        return float(np.mean((prob(q,f,x,start,group)-y)**2)+reg*(x[col]**2))
    r=minimize(obj,[0.],bounds=[(-4,4)],method='L-BFGS-B',options={'ftol':1e-14,'maxiter':200,'eps':.00015})
    out=old.copy();out[col]=float(r.x[0]);return out


def ci_by_race(a,b,seed=20261123):
    assert all(x['rid']==y['rid'] for x,y in zip(a,b))
    rng=np.random.default_rng(seed)
    dif=np.asarray([x['brier']-y['brier'] for x,y in zip(a,b)])
    N=len(dif);boot=np.mean(dif[rng.integers(0,N,(5000,N))],axis=1)
    ha=np.asarray([x['hits'] for x in a]);hb=np.asarray([x['hits'] for x in b])
    hdiff=hb-ha;hbts=np.sum(hdiff[rng.integers(0,N,(5000,N))],axis=1)
    return {'gain_brier':float(dif.mean()),'CI95_gain_brier':np.quantile(boot,[.025,.975]).tolist(),
            'hit_gain':int(hdiff.sum()),'CI95_total_hit_gain_boot':np.quantile(hbts,[.025,.975]).tolist(),
            'changed_candidate_races':sum(x['top3nos']!=y['top3nos'] for x,y in zip(a,b)),
            'better_races':int(sum(hdiff>0)),'worse_races':int(sum(hdiff<0))}


def main():
    rows,audit=full_rows()
    frozen=json.load(open(H008D_RESULT))['coefficients_2024_fixed']
    baseline=np.r_[np.asarray(frozen['market_plus_M3_proxy']),0.,0.]
    old_lap=np.r_[np.asarray(frozen['plus_full_lap_fit']),0.,0.]
    train=[r for r in rows if r['year']==2024]
    tests={'2025_26':[r for r in rows if r['year']>=2025], '2025':[r for r in rows if r['year']==2025],'2026':[r for r in rows if r['year']==2026]}
    trs,tq,ty,tf,ts,tg=arrays(train)
    # Fit generic personal actual-response and lap-conditioned increment *only* in 2024.
    raw=fit_one(tq,tf,ty,ts,tg,baseline,8)
    conditioned=fit_one(tq,tf,ty,ts,tg,raw,9)
    # Also ask whether individual response adds anything beyond H008-D's full-lap fit.
    conditioned_plus_lap=fit_one(tq,tf,ty,ts,tg,old_lap,9)
    models={'market_M3_baseline':baseline,'H008D_lap_fit_baseline':old_lap,
            'plus_generic_horse_response':raw,'plus_generic_and_lap_conditioned_horse_response':conditioned,
            'H008D_plus_lap_conditioned_horse_response':conditioned_plus_lap}
    result={'schema':'h008e_individual_response_v1','run_date':'2026-11-23',
      'hypothesis':'Individual past 3F and c3/c4/finish movement conditioned on as-of race-wide full lap shape predict today better than generic response alone.',
      'definition':{'lookback_unique_starts':15,'stage_weights':{'c4_to_finish':.4,'own_last3f_vs_historical_race_fastest':.3,'minus600_actual_leader_gap':.2,'c3_to_c4':.1},
         'lap_match_bandwidth_sec_per200m':.5,'half_life_factor_per_older_start':.9,'minimum_observations':3,
         'no_horse_individual_200m_sectional_claim':True,'train':'2024','evaluate':'2025-2026-10-04 historically used (not pristine)'},
      'audit':audit,'coefficients':{k:v.tolist() for k,v in models.items()},'results':{},'paired':{},'coverage':{},
      'caveats':['H008-D 2025-26 cohort is not unused; exploratory only','Uses final closing win odds (not T-15)',
                 'Ability C and full browser JS not reproduced','Horse own last3F is historical actual 600m interval, never eight 200m individual splits',
                 'Some historical 3C/4C/gap/3F are missing; per-coordinate missingness and shrinking audited',
                 'Current target race actual gap/laps/individual finishing3F are not input','No production model change']}
    for key,subset in [('train2024',train)]+list(tests.items()):
        sr,q,y,f,s,g=arrays(subset)
        out={};measure={}
        for k,v in models.items():
            per,stats,pr=metric(sr,q,y,f,s,g,v);out[k]=per;measure[k]=stats
        result['results'][key]=measure
        result['paired'][key]={
          'raw_over_market_M3':ci_by_race(out['market_M3_baseline'],out['plus_generic_horse_response']),
          'condition_over_generic':ci_by_race(out['plus_generic_horse_response'],out['plus_generic_and_lap_conditioned_horse_response']),
          'conditional_over_lap_fit':ci_by_race(out['H008D_lap_fit_baseline'],out['H008D_plus_lap_conditioned_horse_response'])}
        result['coverage'][key]={
          'rows':len(sr), 'has_4_responses':sum(h['own']['usable']==4 for h in sr),
          'has_2plus_responses':sum(h['own']['usable']>=2 for h in sr),
          'no_response':sum(h['own']['usable']==0 for h in sr),
          'own_n_ge10':sum(h['own']['own_n']>=10 for h in sr),
          'raw_std':float(np.std([h['own']['raw'] for h in sr])),
          'condition_std':float(np.std([h['own']['conditioned'] for h in sr]))}
        if key=='2025_26':
            # Local only. Do NOT upload horse-level predictions or identities to GitHub.
            with (OUT/'H008E_HORSE_INDEX_PRIVATE.csv').open('w',newline='',encoding='utf-8-sig') as fh:
                fields=['race_id','date','venue','surface','distance','horse_no','horse_name','prev_race_count','n_valid_response_types','late_response_generic','late_response_lap_fit','conditional_delta_c4_to_finish','conditional_delta_own_last3f_fastest','conditional_delta_past_gap600','conditional_delta_c3_to_c4','market_3place_proxy_POSTRACE','fin_POSTRACE']
                w=csv.DictWriter(fh,fieldnames=fields);w.writeheader()
                for h in sr:
                    w.writerow(dict(zip(fields,[h['rid'],h['date'],h['venue'],h['surface'],h['distance'],h['no'],h['name'],h['own']['own_n'],h['own']['usable'],
                      round(h['own']['raw'],6),round(h['own']['conditioned'],6),*[round(x,6) for x in h['own']['stage_diffs']],round(h['q'],6),h['fin']])))
            with (OUT/'H008E_RACE_AUDIT_PRIVATE.csv').open('w',newline='',encoding='utf-8-sig') as fh:
                fields=['race_id','year','market_M3_brier','generic_response_brier','generic_conditional_brier','lap_fit_brier','lap_fit_conditional_brier','baseline_hits','generic_hits','conditional_hits','lapfit_hits','lapfit_conditional_hits']
                w=csv.DictWriter(fh,fieldnames=fields);w.writeheader()
                for p0,p1,p2,p3,p4 in zip(*(out[k] for k in models)):
                    w.writerow(dict(zip(fields,[p0['rid'],p0['year'],p0['brier'],p2['brier'],p3['brier'],p1['brier'],p4['brier'],p0['hits'],p2['hits'],p3['hits'],p1['hits'],p4['hits']])))
    with (OUT/'H008E_RESULTS.json').open('w',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print(json.dumps({'coefs':result['coefficients'],'metrics':result['results'],'paired':result['paired']['2025_26'], 'coverage':result['coverage']['2025_26'],'hist_coverage':audit['own_coverage']},ensure_ascii=False,indent=2),flush=True)
    return result

if __name__=='__main__':main()