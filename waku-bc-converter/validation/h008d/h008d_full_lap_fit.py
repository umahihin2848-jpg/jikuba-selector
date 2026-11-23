#!/usr/bin/env python3
"""H008-D exploratory full-lap × horse-condition interaction (strict as-of).
Research-only; no production predictors or market payoffs changed.
All racing history remains local. This experiment does not reproduce official Ability C.
"""
from __future__ import annotations
import csv, re, math, json, pathlib, bisect, collections, statistics, hashlib
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit, logit
ROOT=pathlib.Path('/mnt/data')
OUT=ROOT/'h008d_full_lap_fit'
OUT.mkdir(exist_ok=True)
GRA={'67','115','131','163','179','195'}
H005=ROOT/'h005_depth_to_m3_20261123/h005_horse_comparison_PRIVATE.csv'
if not H005.exists():H005=pathlib.Path(__file__).resolve().parent/'deps/H005_horse_comparison_PRIVATE.csv'
HIST=ROOT/'umadete.csv'
YEAR_RESULT=[ROOT/'2026_2025_seiseki.csv',ROOT/'2026seiseki.csv']

# Standard full-profile: piecewise-linear 8-value, start-free shape + explicit standing start.
def date_val(raw):
    parts=re.findall(r'\d+',str(raw))
    if len(parts)>=3 and len(parts[0])==4:
        import datetime
        try:d=datetime.date(int(parts[0]),int(parts[1]),int(parts[2]))
        except ValueError:return None
        return d.year*10000+d.month*100+d.day
    if len(parts)==1 and len(parts[0])==8:
        import datetime
        try:d=datetime.datetime.strptime(parts[0],'%Y%m%d').date()
        except ValueError:return None
        return d.year*10000+d.month*100+d.day
    return None

def fnum(v):
    try:
        x=float(str(v).strip());return x if math.isfinite(x) else None
    except Exception:return None

def inum(v):
    try:return int(str(v).strip())
    except Exception:return None

def first_m(dist):return dist%200 or 200

def lap_signature(raw,dist):
    try:s=np.asarray([float(v) for v in str(raw).split('-')],dtype=float)
    except:return None
    if dist is None or dist<1000 or dist>3600 or first_m(dist) not in (100,150,200):return None
    if len(s)!=1+(dist-first_m(dist))//200 or len(s)<5 or not np.all(np.isfinite(s)):return None
    a=first_m(dist)
    if not ((4 if a==100 else 6.5 if a==150 else 9)<s[0]<(9.5 if a==100 else 12.5 if a==150 else 17)):return None
    if np.any(s[1:]<9) or np.any(s[1:]>17):return None
    # Resample EVERY mobile 200m fraction (not only middles) on comparable normalized progress.
    moving=s[1:]; n=len(moving)
    curve=np.interp((np.arange(8)+0.5)/8,(np.arange(n)+0.5)/n,moving)
    # Relative to race-wide (all moving 200m fractions), not dependent on total speed.
    shape=curve-np.mean(moving)
    # First segment included, but comparisons require the same start segment length.
    start=float(s[0])  # preserve the measured standing-start fraction, same-length comparisons only
    late_fade=float(s[-1]-np.mean(s[-3:-1]))
    sprint=float(np.max(s[-4:-1]-s[-3:])) if len(s)>=5 else 0.0
    # Dashboard facets describe race-level demands, NOT actual horse-specific acceleration.
    facets={
       'early_pressure':float(np.mean(moving[:2])-np.mean(moving)),
       'middle_load':float(np.mean(moving[2:-3])-np.mean(moving)) if len(moving[2:-3])>=1 else None,
       'gear_shift':float(max(0,sprint)),
       'late_speed':float(np.mean(s[-3:])-np.mean(moving)),
       'last200_fade':late_fade,
       'lap_variability':float(np.mean(np.abs(np.diff(moving)))),
       'start_delta':float(s[0]-s[1]) if a==200 else None,
    }
    # Five race-level demand proxies; do NOT label these as measured individual horse abilities.
    late4=s[-4:]
    demand5=np.asarray([ -float(np.mean(late4)), -float(np.min(late4)),
      float(max([max(0,s[i-1]-s[i]) for i in range(len(s)-3,len(s)) if s[i]<11.8] or [0])),
      -float(np.std(late4)),
      float(np.mean(s[-3:])-np.mean(s[1:3])+max(0,s[-1]-np.mean(s[-3:-1]))) ],dtype=float)
    return {'shape':shape,'start':start,'firstm':a,'facets':facets,'demand5':demand5,
      'surface_speed':float(np.mean(moving)), 'segments':len(s), 'full_sum':float(np.sum(s))}

def normalize_name(s):return str(s or '').strip().replace(' ','').replace('　','')

def load_history():
    seen=set(); hist=collections.defaultdict(list); course=collections.defaultdict(dict)
    audit=collections.Counter(); yearcounts=collections.Counter(); profile_examples={}
    for r in csv.DictReader(open(HIST,encoding='cp932',newline='')):
        audit['raw']+=1
        name=normalize_name(r['馬名']);rid=str(r['レースID(新・馬番無16桁)']).strip();d=date_val(r['日付'])
        if not name or len(rid)!=16 or not rid.isdigit() or d is None or str(d)!=rid[:8]:
            audit['bad_id_or_date']+=1;continue
        key=(name,rid)
        if key in seen:audit['duplicate']+=1;continue
        seen.add(key)
        if r['芝・ダート'] not in ('芝','ダ') or str(r['異常コード']).strip() not in ('','0'):audit['nonflat_or_abnormal']+=1;continue
        n=inum(r['出走頭数']) or inum(r['頭数']); fin=inum(r['確定着順']);pop=inum(r['人気']);dist=inum(r['距離']);turn=inum(r['コーナー数'])
        if not (n and 5<=n<=20 and fin and 1<=fin<=n and pop and 1<=pop<=n and dist and turn is not None):audit['invalid_result_or_conditions']+=1;continue
        sig=lap_signature(r['レースラップタイム'],dist)
        if not sig:audit['no_valid_lap']+=1;continue
        venue=r['場所'].strip();sur=r['芝・ダート'].strip()
        # Raw percentile result relative to rank expectations in that HISTORICAL race only.
        residual=(n-fin)/(n-1)-(n-pop)/(n-1)
        z={'date':d,'rid':rid,'name':name,'venue':venue,'surface':sur,'dist':dist,'turn':turn,
            'result_residual':residual,'pop':pop,'fin':fin,'n':n,'lap':sig}
        hist[name].append(z)
        # Unique-race full-lap course training observations.
        course[(venue,sur,dist,turn)][rid]=z
        audit['valid_unique']+=1;yearcounts[d//10000]+=1
    for a in hist.values():a.sort(key=lambda z:(z['date'],z['rid']),reverse=True)
    racecourse={};broad=collections.defaultdict(dict)
    for key,mp in course.items():
        rows=sorted(mp.values(),key=lambda z:(z['date'],z['rid']))
        dates=np.asarray([z['date'] for z in rows],dtype=np.int64)
        shapes=np.vstack([z['lap']['shape'] for z in rows])
        starts=np.asarray([z['lap']['start'] if z['lap']['start'] is not None else np.nan for z in rows])
        racecourse[key]=(dates,np.cumsum(shapes,axis=0),np.cumsum(np.isfinite(starts)*np.nan_to_num(starts)),np.cumsum(np.isfinite(starts)),np.cumsum([z['lap']['demand5'] for z in rows],axis=0))
        for z in rows:broad[(z['surface'],z['dist'],z['turn'])][z['rid']]=z
    coarse={}
    for key,mp in broad.items():
        rows=sorted(mp.values(),key=lambda z:(z['date'],z['rid']))
        coarse[key]=(np.asarray([z['date'] for z in rows],dtype=np.int64),np.cumsum([z['lap']['shape'] for z in rows],axis=0),np.cumsum([z['lap']['start'] for z in rows]),np.cumsum([z['lap']['demand5'] for z in rows],axis=0))
    return hist,racecourse,coarse,audit,yearcounts

def course_template(date,venue,surface,dist,turn,course,coarse):
    key=(venue,surface,dist,turn)
    acc=course.get(key)
    n1=0;mode='none'
    if acc:
        dates,cum,*_=acc
        n1=int(np.searchsorted(dates,date,side='left'))
        if n1>=12:return cum[n1-1]/n1,acc[2][n1-1]/n1,acc[4][n1-1]/n1,n1,'exact'
    broad=coarse.get((surface,dist,turn))
    if broad:
        dates,cum,startcum,dcum=broad
        n2=int(np.searchsorted(dates,date,side='left'))
        if n2>=15:
            p2=cum[n2-1]/n2
            if n1>=3:
                # Empirical-Bayes pool actual same track and same surface+distance+turn.
                return (acc[1][n1-1]+12*p2)/(n1+12),(acc[2][n1-1]+12*(startcum[n2-1]/n2))/(n1+12),(acc[4][n1-1]+12*dcum[n2-1]/n2)/(n1+12),n1,'shrunk'
            return p2,startcum[n2-1]/n2,dcum[n2-1]/n2,n2,'cross_venue'
    if n1>=3:return acc[1][n1-1]/n1,acc[2][n1-1]/n1,acc[4][n1-1]/n1,n1,'low_exact'
    return None,None,None,0,'no_template'

def choose_turn_asof(date,venue,surface,distance,turnsets):
    # Pre-race layout inference from strictly prior course race history only.
    vals=turnsets.get((venue,surface,distance),{})
    known={t for t,ds in vals.items() if np.searchsorted(ds,date,side='left')>=1}
    return next(iter(known)) if len(known)==1 else None

def horse_features(row,hist,course,coarse):
    # Strict as-of. Race date is target date; current race lap never referenced.
    hh=[h for h in hist.get(row['name'],[]) if h['date']<row['date']]
    if any(h['date']>=row['date'] for h in hh):raise AssertionError('future history')
    hh=hh[:15]
    coursevec,expected_start,expected_demand5,ncourse,src=course_template(row['date'],row['venue'],row['surface'],row['distance'],row['turn'],course,coarse)
    if not hh:return {'general':0.0,'lap_fit':0.0,'n_hist':0,'n_course':ncourse,'source':src,'n_eff':0.0,'same_surface':0,'demand_fits':[0.]*5}
    recency=np.asarray([0.9**i for i in range(len(hh))]);res=np.asarray([h['result_residual'] for h in hh])
    # H007-like general past residual, exposed separately to avoid laundering generic form into fit.
    general=float(np.dot(res,recency)/recency.sum())
    samen=sum(h['surface']==row['surface'] for h in hh)
    if coursevec is None or len(hh)<4:return {'general':general,'lap_fit':0.,'n_hist':len(hh),'n_course':ncourse,'source':src,'n_eff':0.,'same_surface':samen,'demand_fits':[0.]*5}
    # Conditional on race surface/distance/turn, isolate full 200m lap shape deviation.
    base=np.asarray([(1 if h['surface']==row['surface'] else 0.30)*math.exp(-abs(h['dist']-row['distance'])/750)* (1 if h['turn']==row['turn'] else 0.78) for h in hh]);base*=recency
    vec=np.vstack([h['lap']['shape'] for h in hh]);rms=np.sqrt(np.mean((vec-coursevec)**2,axis=1))
    # Fixed bandwidth, NOT optimized against target outcomes; prevents massive single-race nearest neighbor impact.
    similarity=np.exp(-.5*(rms/.50)**2)
    # The FIRST fraction is scored separately as a whole-start-section deviation.
    # No 100/150m fraction is treated as a 200m lap; same firstm is ensured by distance penalty and explicit check.
    startdev=np.asarray([abs(h['lap']['start']-expected_start) if h['lap']['firstm']==first_m(row['distance']) else np.nan for h in hh])
    similarity*=np.where(np.isfinite(startdev),np.exp(-.5*(np.nan_to_num(startdev,nan=0)/1.4)**2),1.0)
    # Start-lap comparability: first segment only as 200m and if within same type.
    # Start demand is included in descriptive profile, but it is NOT an exact as-of horse speed estimate.
    shaped=base*similarity
    if sum(base)<.15 or sum(shaped)<.05:return {'general':general,'lap_fit':0.,'n_hist':len(hh),'n_course':ncourse,'source':src,'n_eff':0.,'same_surface':samen,'demand_fits':[0.]*5}
    generic=float(np.dot(base,res)/base.sum())
    matched=float(np.dot(shaped,res)/shaped.sum())
    neff=float(shaped.sum()**2/np.dot(shaped,shaped))
    trust=neff/(neff+4)*ncourse/(ncourse+20)
    fit=float(np.clip((matched-generic)*trust,-.3,.3))
    # Fixed five demand facets, all from whole-race section times (reference theory proxies).
    # For each factor compare exposure-conditional result with same-surface/distance/turn historic form.
    dmat=np.vstack([h['lap']['demand5'] for h in hh])
    factor_band=np.asarray([.75,.65,.45,.60,1.0])
    factor_similarity=np.exp(-.5*((dmat-expected_demand5)/factor_band)**2)
    fit5=np.zeros(5)
    for j in range(5):
        ww=base*factor_similarity[:,j]
        if ww.sum()>.05:
            eff=ww.sum()**2/max(np.dot(ww,ww),1e-10)
            shr=eff/(eff+4)*ncourse/(ncourse+20)
            fit5[j]=float(np.clip((np.dot(ww,res)/ww.sum()-generic)*shr,-.30,.30))
    return {'general':general,'lap_fit':fit,'n_hist':len(hh),'n_course':ncourse,'source':src,'n_eff':neff,'same_surface':samen,'demand_fits':fit5.tolist()}

def load_targets():
    m3={}; audit=collections.Counter()
    for r in csv.DictReader(open(H005,encoding='utf-8-sig',newline='')):
        m3[(r['rid'],inum(r['no']))]=r
    races=collections.defaultdict(list)
    for fp in YEAR_RESULT:
        for r in csv.DictReader(open(fp,encoding='cp932',newline='')):
            year=inum(r['年']);year=2000+year if year and year<100 else year
            if year not in (2024,2025,2026) or str(r['クラスコード']).strip() not in GRA or r['芝・ダ'] not in ('芝','ダ'):continue
            date=date_val(f'{year}.{int(r["月"])}.{int(r["日"])}')
            n=inum(r['頭数']);no=inum(r['馬番']);fin=inum(r['確定着順']);od=fnum(r['単勝オッズ'])
            if date is None or n is None or not 12<=n<=18 or no is None or fin is None or not 1<=fin<=n or od is None or od<=1 or str(r['異常コード']).strip() not in ('','0'):continue
            rid=f'{date}_{r["場所"].strip()}_{int(r["レース番号"]):02d}'
            xx=m3.get((rid,no))
            if xx is None:continue
            name=normalize_name(r['馬名'])
            if name!=normalize_name(xx['name']):audit['h005_name_mismatch']+=1;continue
            z={'rid':rid,'date':date,'year':year,'name':name,'venue':r['場所'].strip(),'surface':r['芝・ダ'], 'distance':inum(r['距離']),
               'turn':None, 'n':n,'no':no,'fin':fin,'odds':od, 'm3':float(xx['score_all5_decay']), 'pop':inum(r['人気順'])}
            races[rid].append(z)
    # N.B. use only TARGET pre-start course turn data: map course code from historic track/surface/distance,
    # if multiple turn counts then unresolved race is excluded; no post-race corner order.
    result={}
    for rid,hs in races.items():
        n=hs[0]['n']
        if len(hs)!=n or len({h['no'] for h in hs})!=n or len({h['name'] for h in hs})!=n or sum(h['fin']<=3 for h in hs)!=3:
            audit['invalid_or_incomplete']+=1;continue
        result[rid]=sorted(hs,key=lambda z:z['no'])
    return result,audit

def pl_top3(odds):
    w=1/np.asarray(odds,dtype=float);w=w/w.sum();n=len(w)
    out=np.copy(w)
    for i in range(n):
        for j in range(n):
            if i==j:continue
            p2=w[i]*w[j]/(1-w[i]);out[j]+=p2
            rem=1-w[i]-w[j]
            for k in range(n):
                if k!=i and k!=j:out[k]+=p2*w[k]/rem
    assert abs(out.sum()-3)<1e-9
    return out

def projected_prob(q,features,coeff,start,group):
    zz=logit(np.clip(q,1e-6,1-1e-6))+features@coeff
    offsets=np.zeros(len(start));idx=np.arange(len(start))
    # Each race has exactly 3 expected top3 positions by design.
    for _ in range(12):
        pp=expit(zz+offsets[group]);tot=np.add.reduceat(pp,start);der=np.add.reduceat(pp*(1-pp),start)
        offsets+=np.clip((3-tot)/np.maximum(der,1e-7),-1.0,1.0)
        if max(abs(tot-3))<1e-10:break
    pp=expit(zz+offsets[group]);assert np.max(np.abs(np.add.reduceat(pp,start)-3))<1e-7
    return pp

def fit_coeff(q,features,y,start,group,old,ix,lam=.000025):
    def fun(v):
        coeff=old.copy();coeff[ix]=v
        p=projected_prob(q,features,coeff,start,group)
        return np.mean((p-y)**2)+lam*float(np.sum(coeff**2))
    r=minimize(lambda x:fun(float(x[0])),[0.],bounds=[(-5,5)],method='L-BFGS-B',options={'ftol':1e-13,'maxiter':160,'eps':2e-4})
    old[ix]=float(r.x[0])
    return old

def per_race_results(rows,coefs,label):
    sortedrows=sorted(rows,key=lambda x:(x['rid'],x['no']))
    starts=[i for i,x in enumerate(sortedrows) if i==0 or x['rid']!=sortedrows[i-1]['rid']]
    group=np.searchsorted(starts,np.arange(len(sortedrows)),side='right')-1
    q=np.asarray([x['q'] for x in sortedrows]);y=np.asarray([x['y'] for x in sortedrows]);features=np.asarray([x['features'] for x in sortedrows]);
    pred=projected_prob(q,features,coefs,np.asarray(starts),group)
    out={};rdata=[]
    for i,j in zip(starts,starts[1:]+[len(sortedrows)]):
        h=sortedrows[i:j];yp=y[i:j];p=pred[i:j]; brier=float(np.mean((p-yp)**2));rank=np.argsort(-p)[:3]
        rdata.append({'rid':h[0]['rid'],'year':h[0]['year'],'brier':brier,'hits':int(np.sum(yp[rank])),'winner_hit':int(1 in [h[k]['fin'] for k in rank]),'n':len(h), 'old_lap_effect_spread':float(np.std([x['features'][2] for x in h]))})
    return rdata,dict(all_race_brier=float(np.mean([x['brier'] for x in rdata])),top3_hits=int(sum(x['hits'] for x in rdata)),winner_in_top3=int(sum(x['winner_hit'] for x in rdata)),races=len(rdata),horses=len(sortedrows)),pred

def paired_ci(a,b,seed=20261123):
    dif=np.asarray([x['brier']-y['brier'] for x,y in zip(a,b)]);assert all(x['rid']==y['rid'] for x,y in zip(a,b))
    rng=np.random.default_rng(seed);N=len(dif);boot=[]
    for _ in range(6000):boot.append(float(np.mean(dif[rng.integers(0,N,size=N)])))
    return {'brier_gain':float(dif.mean()),'race_boot95':[float(x) for x in np.quantile(boot,[.025,.975])], 'improved_races':int(np.sum(dif>0)), 'worse_races':int(np.sum(dif<0)), 'equal_races':int(np.sum(dif==0))}

def main():
    hist,course,coarse,audit,years=load_history()
    print('history',dict(audit),'historical races',sum(len(x[0]) for x in course.values()),'horses',len(hist),flush=True)
    cards,ta=load_targets();print('target',len(cards),'audit',dict(ta),flush=True)
    # Race turn count must be established from historic condition, not current result position.
    turn_sets=collections.defaultdict(dict)
    for (venue,surf,dist,turn),items in course.items():
        turn_sets[(venue,surf,dist)][turn]=items[0]
    good=[];reject=collections.Counter();last=[]
    for rid,card in sorted(cards.items()):
        a=card[0]
        # Turn count is an as-of known course property. The local proxy may infer it
        # only from earlier race records, NEVER from later course history.
        versions=turn_sets.get((a['venue'],a['surface'],a['distance']),{})
        known={turn for turn,dates in versions.items() if np.searchsorted(dates,a['date'],side='left')>=1}
        if not known:reject['unknown_turn_asof']+=1;continue
        if len(known)!=1:reject['mixed_turns_asof']+=1;continue
        turn=choose_turn_asof(a['date'],a['venue'],a['surface'],a['distance'],turn_sets)
        assert turn is not None
        for h in card:
            h['turn']=turn
            h.update(horse_features(h,hist,course,coarse))
            h['y']=int(h['fin']<=3)
        q=pl_top3([h['odds'] for h in card]);q=3/len(card)+.82264626*(q-3/len(card))
        # Market q sums to 3 and is locked H002 parameter. M3 rank contribution independent from market.
        m3=np.asarray([h['m3'] for h in card]);rank=np.argsort(np.argsort(m3))
        for i,h in enumerate(card):
            h['q']=float(q[i]);h['features']=[h['general']-.0, 0.5-(rank[i]+.5)/len(card), h['lap_fit']]+h['demand_fits']
        good.extend(card)
    print('rejected',dict(reject),'good races',len({x['rid'] for x in good}),flush=True)
    allmods={};train=[x for x in good if x['year']==2024];test=[x for x in good if x['year']>=2025]
    if len(train)<600 or len(test)<600:raise RuntimeError('insufficient matched races')
    def arrays(rows):
        sr=sorted(rows,key=lambda x:(x['rid'],x['no']));start=np.array([i for i,x in enumerate(sr) if i==0 or x['rid']!=sr[i-1]['rid']]);group=np.searchsorted(start,np.arange(len(sr)),side='right')-1
        return np.array([x['q'] for x in sr]),np.array([x['features'] for x in sr]),np.array([x['y'] for x in sr]),start,group
    qt,ft,yt,st,gt=arrays(train)
    coeff=np.zeros(8);coeff=fit_coeff(qt,ft,yt,st,gt,coeff,0);general=coeff.copy()
    coeff=fit_coeff(qt,ft,yt,st,gt,coeff,1);base=coeff.copy()
    coeff=fit_coeff(qt,ft,yt,st,gt,coeff,2);extra=coeff.copy()
    # Five-axis model is a secondary exploratory proposal, not a clean holdout after H008-D exploration.
    # Train all five together with a regularized joint objective (no 2025/26 tuning).
    def factor_objective(v):
        cv=base.copy();cv[3:]=v
        p=projected_prob(qt,ft,cv,st,gt)
        return float(np.mean((p-yt)**2)+.00009*np.sum(np.square(cv)))
    opt=minimize(factor_objective,np.zeros(5),bounds=[(-5,5)]*5,method='L-BFGS-B',options={'maxiter':150,'ftol':1e-13,'eps':.00015})
    five=base.copy();five[3:]=opt.x
    
    models={'market_only':np.zeros(8),'market_plus_general':general,'market_plus_M3_proxy':base,'plus_full_lap_fit':extra,'plus_five_lap_demand_proxies':five}
    report={'schema':'H008D_20261123_full_lap_suitability_shadow_v1','scope':'market closing odds + reconstructed M3 research-only, no true production Ability C',
      'sources':{'unique_history':dict(audit),'historical_years':dict(years),'target_issues':dict(ta),'rejected':dict(reject),'target_races':len({x['rid'] for x in good}), 'train':len({x['rid'] for x in train}),'test':len({x['rid'] for x in test})},
      'features':['past15_form_residual','historical_M3_rank_proxy','race_full_lap_shape_affinity_conditioned_vs_generic','speed_requirement_fit','ultra_speed_requirement_fit','gearchange_requirement_fit','sustained_speed_requirement_fit','attrition_requirement_fit'],
      'coefficients_2024_fixed':{k:v.tolist() for k,v in models.items()},'results':{},'paired':{},'feature_availability':{
        'test_nhorses':len(test),'n_hist_ge10':int(sum(h['n_hist']>=10 for h in test)),
        'template_exact':int(sum(h['source']=='exact' for h in test)),
        'template_low_or_missing':int(sum(h['source'] in ('low_exact','no_template') for h in test)),
        'lapfit_mean':float(np.mean([h['lap_fit'] for h in test])),
        'lapfit_sd':float(np.std([h['lap_fit'] for h in test])),
        'lapfit_p05_p50_p95':[float(z) for z in np.percentile([h['lap_fit'] for h in test],[5,50,95])],
        'facet_fit_sd':[float(z) for z in np.std([h['demand_fits'] for h in test],axis=0)],
      },'caveats':['all 2024-2026 years historically explored; non-pristine time test','final closing odds not pre-race T-15','model uses pretrained historical M3 Python proxy; no official C parity','horse response is popularity-relative finish proxy, not individual acceleration trace','first 100/150m stationary lap kept separate; not converted to pseudo-200m','no same-day or future past history']}
    cohorts={'train2024':train,'test2025_26':test,'test2025':[x for x in test if x['year']==2025],'test2026':[x for x in test if x['year']==2026]}
    detail={};gather={}
    for group,cohort in cohorts.items():
        rd={};pd={}
        for name,weights in models.items():
            rec,stats,preds=per_race_results(cohort,weights,name);rd[name]=stats;pd[name]=rec
        report['results'][group]=rd
        report['paired'][group]={
          'lap_over_market_M3':paired_ci(pd['market_plus_M3_proxy'],pd['plus_full_lap_fit']),
          'five_requirement_over_market_M3':paired_ci(pd['market_plus_M3_proxy'],pd['plus_five_lap_demand_proxies']),
          'M3_over_general':paired_ci(pd['market_plus_general'],pd['market_plus_M3_proxy']),
          'general_over_market':paired_ci(pd['market_only'],pd['market_plus_general'])
        }
        if group=='test2025_26':detail=pd
    with (OUT/'H008D_results.json').open('w',encoding='utf8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
    with (OUT/'H008D_test_race_diagnostics_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
        fields=['rid','year','n','market_brier','general_brier','market_M3_brier','full_lap_brier','five_lap_brier','market_hits','M3_hits','full_lap_hits','five_lap_hits']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for a,b,c,d,e in zip(*(detail[k] for k in ['market_only','market_plus_general','market_plus_M3_proxy','plus_full_lap_fit','plus_five_lap_demand_proxies'])):
            w.writerow(dict(rid=a['rid'],year=a['year'],n=a['n'],market_brier=a['brier'],general_brier=b['brier'],market_M3_brier=c['brier'],full_lap_brier=d['brier'],five_lap_brier=e['brier'],market_hits=a['hits'],M3_hits=c['hits'],full_lap_hits=d['hits'],five_lap_hits=e['hits']))
    # Research-only individual horse as-of indicators. Do not publish this to GitHub.
    with (OUT/'H008D_test_horse_index_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
        fields=['race_id','date','venue','surface','distance','turn','no','name','prior_starts','course_prior_races','historical_course_source','recent_form','lap_fit','lap_index_50neutral','speed_fit','ultraspeed_fit','accel_fit','sustain_fit','attrition_fit','final_odds_POSTRACE','actual_finish_POSTRACE']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for h in sorted(test,key=lambda a:(a['rid'],a['no'])):
            v={'race_id':h['rid'],'date':h['date'],'venue':h['venue'],'surface':h['surface'],'distance':h['distance'],'turn':h['turn'],'no':h['no'],'name':h['name'],
             'prior_starts':h['n_hist'],'course_prior_races':h['n_course'],'historical_course_source':h['source'],
             'recent_form':round(h['general'],6),'lap_fit':round(h['lap_fit'],6),'lap_index_50neutral':round(50+100*h['lap_fit'],3),
             'speed_fit':round(h['demand_fits'][0],6),'ultraspeed_fit':round(h['demand_fits'][1],6),
             'accel_fit':round(h['demand_fits'][2],6),'sustain_fit':round(h['demand_fits'][3],6),'attrition_fit':round(h['demand_fits'][4],6),
             'final_odds_POSTRACE':h['odds'],'actual_finish_POSTRACE':h['fin']}
            w.writerow(v)
    # No private individual horse data committed publicly. Local extract for examples only, last chronological race.
    last_race=max((x['rid'] for x in test),key=lambda s:s.split('_')[0]);example=sorted([h for h in test if h['rid']==last_race],key=lambda h:h['lap_fit'],reverse=True)
    with (OUT/'H008D_example_last_race_PRIVATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
        fields=['rid','no','name','n_hist','n_course','source','n_eff','general','lap_fit','speed_fit','ultraspeed_fit','accel_fit','sustain_fit','attrition_fit','shadow_lap_index_50neutral','market_odds','actual_finish']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for h in example:
            dd={**h,'speed_fit':h['demand_fits'][0],'ultraspeed_fit':h['demand_fits'][1],
                'accel_fit':h['demand_fits'][2],'sustain_fit':h['demand_fits'][3],'attrition_fit':h['demand_fits'][4],
                'shadow_lap_index_50neutral':50+100*h['lap_fit'],'market_odds':h['odds'],'actual_finish':h['fin']}
            w.writerow({k:dd.get(k) for k in fields})
    print(json.dumps({'train':report['sources'],'coefficients':report['coefficients_2024_fixed'], 'test':report['results']['test2025_26'],'paired':report['paired']['test2025_26'],'year2025':report['results']['test2025'],'year2026':report['results']['test2026']},ensure_ascii=False,indent=2),flush=True)
    return report
if __name__=='__main__':main()