#!/usr/bin/env python3
"""Export exact P4-2b V3 Dynamic730 + Peak730 PRE-RACE feature card from JRA result data.

No current race finish labels used. Implements the published P4-2b network chronology,
including 2016-2021 age drift fit and same-day delayed race updates.

Requires the full historical JRA result universe (not just competing horses' history).
Use a card CSV (date, venue, surface, distance, no, name, age), one race 12-18 horses.
Legacy identity name×surface is intentionally preserved for research parity; name
collisions and prior-history gaps may affect results. No automatic bet decisions.
"""
import argparse
from collections import defaultdict
from pathlib import Path
import csv
import numpy as np
import pandas as pd

V='P3-27-v1/P4-2b-h730-peak730';
COLUMNS=['年','月','日','場所','レース番号','クラスコード','芝・ダ','馬名','頭数','馬番','確定着順','異常コード','走破タイム','距離','年齢','血統登録番号','単勝オッズ','回次','日次','コースコード']
RENAMED=['year','month','day','venue','rn','grade','surf','name','n','no','fin','ab','time','dist','age','horseid','odds','meet','meetday','course']
VENUES={'札幌':1,'函館':2,'福島':3,'新潟':4,'東京':5,'中山':6,'中京':7,'京都':8,'阪神':9,'小倉':10}


def load_card(file):
    d=pd.read_csv(file,encoding='utf-8-sig',dtype={'no':str})
    required=['date','venue','surface','distance','no','name','age']
    missing=[c for c in required if c not in d.columns]
    if missing:raise ValueError('Card missing columns: '+', '.join(missing))
    if not 12<=len(d)<=18:raise ValueError('Card must contain 12–18 starters, exactly one race')
    d.date=pd.to_datetime(d.date,errors='raise')
    d['venue']=d.venue.str.strip();d['surface']=d.surface.str.strip().replace({'ダート':'ダ'})
    d['name']=d.name.str.strip()
    d['age']=pd.to_numeric(d.age,errors='raise')
    d['distance']=pd.to_numeric(d.distance,errors='raise')
    d['no']=pd.to_numeric(d.no,errors='raise').astype(int)
    for key in ['date','venue','surface','distance']:
        if d[key].nunique()!=1:raise ValueError('Card mixes multiple '+key)
    if d.no.duplicated().any() or d.name.eq('').any() or not d.age.between(2,14).all():raise ValueError('Card invalid horse numbers/names/ages')
    if not d.no.between(1,18).all() or not d.surface.isin(['芝','ダ']).all() or not d.venue.isin(VENUES).all():raise ValueError('Card surface/venue/number invalid')
    return d.sort_values('no').reset_index(drop=True)


def load_history(files, cutoff):
    frames=[]
    for path in files:
        df=pd.read_csv(path,encoding='cp932',usecols=COLUMNS).rename(columns=dict(zip(COLUMNS,RENAMED)))
        frames.append(df)
    r=pd.concat(frames,ignore_index=True)
    r['date']=pd.to_datetime(dict(year=r.year+2000,month=r.month,day=r.day));r.year+=2000
    r['name']=r.name.str.strip();r['surf']=r.surf.str.strip()
    r.time=pd.to_numeric(r.time,errors='coerce');r.fin=pd.to_numeric(r.fin,errors='coerce')
    r=r[r.date.lt(cutoff)&r.surf.isin(['芝','ダ'])&r.ab.eq(0)&r.fin.between(1,r.n)&r.time.between(40,400)&r.dist.between(1000,3600)].copy()
    r=r[r.course.isin([0,1,8])].copy()
    r=r.sort_values(['date','venue','rn','no']).drop_duplicates(['date','venue','rn','no'])
    r['rid']=r.date.dt.strftime('%Y%m%d')+r.venue.map(VENUES).astype(int).astype(str).str.zfill(2)+r.meet.astype(str).str.zfill(2)+r.meetday.astype(str).str.zfill(2)+r.rn.astype(str).str.zfill(2)
    groups=defaultdict(list)
    for (day,rid),g in r.groupby(['date','rid'],sort=True):
        if len(g)>=8 and len(g)>=.85*g.n.iloc[0]:groups[day].append((rid,g))
    return groups


def fvec(birth,last,day):
    t0=(last-pd.Timestamp(year=birth,month=1,day=1)).days/365.25
    t1=(day-pd.Timestamp(year=birth,month=1,day=1)).days/365.25
    return np.array([max(0,min(t1,hi)-max(t0,lo)) for lo,hi in [(0,3),(3,4),(4,5),(5,6),(6,30)]] + [min(max((day-last).days-90,0),365)/365.])


def run_network(groups, half, coef=None, collect_fit=False):
    state={}; hist=defaultdict(list);fits=[]
    def prior(key,day,birth):
        if key not in state:return 0.,2.,0,0,np.zeros(6)
        m,v,n,last=state[key];gap=(day-last).days;rho=2**(-gap/half);x=fvec(birth,last,day)
        m=m*rho;v=min(2.,v*rho*rho+2*(1-rho*rho))
        if coef is not None and day.year>=2022:m+=float(x@coef)
        if coef is not None and day.year>=2022:v=min(2.,v+.40*min(max(gap-90,0),365)/365)
        return m,v,n,gap,x
    for day in sorted(groups):
        if collect_fit and day.year>2021:break
        updates=[]
        for rid,g in groups[day]:
            surf=g.surf.iloc[0];keys=list(zip(g.name,[surf]*len(g)))
            ages=g.age.to_numpy();birth=day.year-ages;ps=[prior(k,day,int(b)) for k,b in zip(keys,birth)]
            pri=np.array([x[:3] for x in ps]);tm=g.time.to_numpy()*1000/g.dist.to_numpy();n=len(g);known=pri[:,2]>=2
            for i,key in enumerate(keys):
                mask=np.arange(n)!=i;valid=mask&known;strong=valid.sum()>=3;valid=valid if strong else mask
                w=1/(pri[valid,1]+.75);raw=pri[valid,0]+np.clip(tm[valid]-tm[i],-5,5)
                obs=np.average(raw,weights=w);noise=1.2+np.average((raw-obs)**2,weights=w)+(0 if strong else 1.5)
                m,v,count=pri[i];gain=v/(v+noise);gap=ps[i][3];xx=ps[i][4]
                if collect_fit and strong and count>=2 and 0<gap<=730:fits.append(np.r_[xx,obs-m])
                updates.append((key,m+gain*(obs-m),max(.12,(1-gain)*v),int(count)+1,obs,int(g.dist.iloc[0]),strong))
        # Updates from same day become visible only AFTER all race estimates of that day.
        for key,m,v,count,obs,di,strong in updates:
            state[key]=(m,v,count,day)
            if strong:hist[key].append((day,di,obs))
    return state,hist,np.array(fits),prior


def export_features(card,history,out):
    day=card.date.iloc[0]; groups=load_history(history,day)
    basegroups={d:g for d,g in groups.items() if d.year<=2021}
    _,_,fits,_=run_network(basegroups,730,collect_fit=True)
    if len(fits)<100:raise ValueError('Insufficient pre-2022 baseline races to reproduce V3 network')
    X=fits[:,:6];y=fits[:,6];coefs=np.linalg.solve(X.T@X+100*np.eye(6),X.T@y)
    state,hist,_,prior=run_network(groups,730,coef=coefs)
    rows=[]
    for x in card.itertuples():
        key=(x.name,x.surface);m,v,n,gap,_=prior(key,day,day.year-int(x.age))
        observations=[p for dt,dist,p in hist[key] if (day-dt).days<=730 and abs(dist-x.distance)<=400]
        nn=len(observations)
        if nn:
            peak=np.mean(sorted(observations)[-2:]);avg=np.mean(observations);peak=avg+(peak-avg)*nn/(nn+3)
        else:peak=np.nan
        rows.append({'date':day.strftime('%Y-%m-%d'),'venue':x.venue,'surface':x.surface,'distance':int(x.distance),
                     'rid':str(x.rid).strip() if 'rid' in card.columns and pd.notna(x.rid) else '',
                     'no':int(x.no),'name':x.name,'h730':float(m),'h730_peak':float(peak) if np.isfinite(peak) else '',
                     'h730_n':int(n),'h730_gap':int(gap),'h730_peak_n':nn})
    pd.DataFrame(rows).to_csv(out,index=False,encoding='utf-8-sig')
    return len(groups),sum(len(v) for v in groups.values()),len(fits),coefs


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--history',nargs='+',type=Path,required=True,help='Full 2016–present JRA result universe in cp932')
    ap.add_argument('--card',type=Path,required=True,help='One future race card (date,venue,surface,distance,no,name,age[,rid])')
    ap.add_argument('--out',type=Path,required=True,help='Output imported V3 pre-race CSV')
    a=ap.parse_args();card=load_card(a.card)
    if any(not p.is_file() for p in a.history):raise SystemExit('One or more historical files missing')
    years=set();
    # Explicit consent for retrospective card generation: no post-race data enters predictions.
    print('Running network for card',card.date.iloc[0],card.venue.iloc[0],card.distance.iloc[0],flush=True)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    nday,nr,nfit,coef=export_features(card,a.history,a.out)
    print(f'OK {len(card)} starters, {nday} earlier days, {nr} earlier races, {nfit} pre-2022 fit records. Saved: {a.out}',flush=True)

if __name__=='__main__':main()