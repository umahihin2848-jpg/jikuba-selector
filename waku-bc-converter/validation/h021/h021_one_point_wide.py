#!/usr/bin/env python3
"""H021 offline study: fixed H018 research probabilities + retrospective TARGET wide quote/payoff.
Closing-wide odds are NOT pre-off time-stamped. Risk flag is H018 fixed; no outcome/price feature enters H018.
Only consider exactly ONE wide pair per race or PASS; compare same opportunity set.
"""
from __future__ import annotations
from collections import Counter
from pathlib import Path
import csv, json, itertools
import numpy as np
import pandas as pd

ROOT=Path('/mnt/data'); DST=ROOT/'H021_ワイド1点危険馬除外_20261124'
VENUE={'札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10'}
SOURCE=ROOT/'H018_全頭同時4角順位_20261124/H018_全頭同時4角位置_馬別PRIVATE.csv'
H020=ROOT/'H020_終盤救済と前残り_20261124/H020_HORSE_TEST_PRIVATE.csv'


def build():
    hist=pd.read_csv(SOURCE,encoding='utf-8-sig')
    recent=pd.read_csv(H020,encoding='utf-8-sig')
    d=hist[hist.year>=2025].merge(recent[['rid','no','h018_flag']],on=['rid','no'],validate='one_to_one').copy()
    assert len(d)==9464 and d.rid.nunique()==621 and d.h018_flag.sum()==123
    assert not d[['rid','no']].duplicated().any()
    d['rankp']=d.groupby('rid')['adjusted_finish_sensitivity'].rank(method='first',ascending=False).astype(int)
    assert d.loc[d.h018_flag==1,'rankp'].min()==10
    lookups={}
    valid_rids=set(d.rid)
    for nm in ('2026_2025_seiseki.csv','2026seiseki.csv'):
        for batch in pd.read_csv(ROOT/nm,encoding='cp932',dtype=str,chunksize=25000):
            for x in batch.itertuples(index=False,name=None):
                # same order as TARGET results: 0-... guaranteed by schema check below
                y,mon,day,meeting,venue,dayno,rc,_,_,_,_,_,_,_,_,_,_,_,_,horse=x[:20]
                y=int(y);y=y if y>=2000 else 2000+y
                if y<2025: continue
                rid=f'{y:04d}{int(mon):02d}{int(day):02d}_{venue}_{int(rc):02d}'
                if rid not in valid_rids:continue
                daycode=str(int(dayno)) if int(dayno)<=9 else 'ABC'[int(dayno)-10]
                key=f'{VENUE[venue]}{str(y)[-2:]}{int(meeting)}{daycode}{int(rc):02d}{int(horse):02d}'
                k=(rid,int(horse))
                if k in lookups:assert lookups[k]==key,(k,key,lookups[k])
                lookups[k]=key
    assert len(lookups)==len(d),(len(lookups),len(d))
    target_keys=set(lookups.values())
    quote={}
    for nm in ('2016_2025_odds.csv','2026_odds.csv'):
        with (ROOT/nm).open('r',encoding='cp932',newline='') as f:
            for cells in csv.reader(f):
                key=cells[0].strip()
                if key not in target_keys:continue
                assert len(cells)==227,(key,len(cells))
                # wide odds range for this horse paired with each of #1..18
                arr=[]
                for opponent in range(1,19):
                    a=float(cells[37+(opponent-1)*2].strip() or 0)
                    b=float(cells[38+(opponent-1)*2].strip() or 0)
                    arr.append((a,b))
                assert key not in quote
                quote[key]=arr
    if len(quote)!=len(d):
        missing_ids=set(lookups.values())-set(quote)
        reverse={v:k for k,v in lookups.items()}
        miss=pd.DataFrame([{'rid':reverse[k][0],'no':reverse[k][1],'odd_key':k} for k in missing_ids])
        print('MISSING ODDS',len(missing_ids),'RACES',miss.rid.nunique(),'YEARS',miss.rid.str[:4].value_counts().to_dict(),'SAMPLE',miss.head(12).to_dict('records'))
        miss.to_csv(DST/'H021_MISSING_ODDS_TMP.csv',index=False)
    # read fixed HR2 parsed layout exactly as P3-75 settlement core.
    pays={}
    for nm in ('haitou.txt','2026_haitou.txt'):
        with (ROOT/nm).open(encoding='utf-8-sig') as f:
            for raw in f:
                raw=raw.rstrip('\r\n')
                if not raw.startswith('HR2'):continue
                k=raw[11:19]+raw[19:21]+raw[25:27]
                assert k not in pays
                if raw[31:40]!='0'*9 or raw[40:49]!='0'*9:
                    continue
                w={}
                for j in range(7):
                    chunk=raw[293+16*j:293+16*(j+1)]
                    if chunk.strip() and chunk[:4]!='0000':
                        assert chunk[:4].isdigit() and chunk[4:13].isdigit(),(k,j,chunk)
                        n1,n2=int(chunk[:2]),int(chunk[2:4])
                        w[tuple(sorted((n1,n2)))]=int(chunk[4:13])
                pays[k]=w
    ref={}
    for rid,dd in d.groupby('rid'):
        date,ven,number=rid.split('_')
        k=date+VENUE[ven]+f'{int(number):02d}'
        assert k in pays and len(pays[k])==3,(rid,k,pays.get(k))
        winners=set(dd.loc[dd.top3==1,'no'].astype(int))
        assert len(winners)==3
        pairs={tuple(sorted(p)) for p in itertools.combinations(winners,2)}
        assert pairs==set(pays[k]),(rid,pairs,pays[k])
        ref[rid]=pays[k]
    sym_err=[];winner_range=[];missing_quote=[]
    for rid,dd in d.groupby('rid'):
        arr=dd[['no']].to_numpy().flatten().tolist()
        for a,b in itertools.combinations(arr,2):
            v1=quote[lookups[(rid,int(a))]][int(b)-1]
            v2=quote[lookups[(rid,int(b))]][int(a)-1]
            if v1!=v2:sym_err.append((rid,int(a),int(b),v1,v2))
            if not (v1[0]>0 and v1[1]>=v1[0]):missing_quote.append((rid,int(a),int(b),v1))
            actual=ref[rid].get(tuple(sorted((int(a),int(b)))),0)
            if actual and not (v1[0]*100-1<=actual<=v1[1]*100+1):winner_range.append((rid,int(a),int(b),v1,actual))
    print('quotes / symmetry errors',len(quote),len(sym_err),'missing',len(missing_quote),'payout beyond quote',len(winner_range),'samples',winner_range[:3])
    d['code']=d.apply(lambda x:lookups[(x.rid,int(x.no))],axis=1)
    return d,quote,ref,lookups,{'sym_err':len(sym_err),'missing_quote':len(missing_quote),'winning_payout_outside_quote':len(winner_range),'sample_outside':winner_range[:6]}


def ticket(rid,axis,opponent,quote,ref,lookups):
    a,b=int(axis.no),int(opponent.no)
    mn,mx=quote[lookups[(rid,a)]][b-1]
    actual=ref[rid].get(tuple(sorted((a,b))),0)
    return {'rid':rid,'year':int(axis.year),'surface':axis.surface,'course':axis.profile,'axis_no':a,'axis_name':axis['name'],'axis_pred3':float(axis.adjusted_finish_sensitivity),'opp_no':b,'opp_name':opponent['name'],'opp_rank':int(opponent.rankp),'opp_pred3':float(opponent.adjusted_finish_sensitivity),'opp_q_close':float(opponent.q),'opp_flag':int(opponent.h018_flag),'wide_quote_min':mn,'wide_quote_max':mx,'hit':int(actual>0),'payout_yen_100':actual,'staked':100}


def stats(tickets):
    if not tickets:return {'bets':0,'hits':0,'spend_yen':0,'return_yen':0,'roi':None,'hit_rate':None}
    n=len(tickets);wins=sum(x['hit'] for x in tickets);total=sum(x['payout_yen_100'] for x in tickets)
    return {'bets':n,'hits':wins,'spend_yen':100*n,'return_yen':total,'roi':total/(100*n),'hit_rate':wins/n,'max_win_payout_yen':max(x['payout_yen_100'] for x in tickets),'positive_payment_share_max':max(x['payout_yen_100'] for x in tickets)/total if total else 0}


def analyze(d,quote,ref,lookups):
    policy={}
    rows=[]
    for rid,g in d.groupby('rid',sort=False):
        g=g.sort_values('rankp').copy()
        axis=g.iloc[0];candidates=g.iloc[1:]
        assert axis.h018_flag==0 and axis.rankp==1
        def get(picks):
            if not len(picks):return None
            return ticket(rid,axis,picks.iloc[0],quote,ref,lookups)
        base=get(candidates)
        # Pair selection is deterministic, informed by asof independent horse p and retrospective wide odds quotes.
        def value_rank(odds_floor, use_risk=False):
            pairs=[]
            for _,opp in candidates.iterrows():
                if use_risk and opp.h018_flag:continue
                z=ticket(rid,axis,opp,quote,ref,lookups)
                if z['wide_quote_min']<odds_floor or z['wide_quote_min']<=0:continue
                # Scores are not calibrated one-point wide probabilities: deliberately sensitivity-only.
                z['_score']=axis.adjusted_finish_sensitivity*opp.adjusted_finish_sensitivity*z['wide_quote_min']
                pairs.append(z)
            if not pairs:return None
            pairs.sort(key=lambda x:(-x['_score'], -x['opp_pred3'], x['opp_no']))
            z=pairs[0];del z['_score'];return z
        opts={'max_p':base,'rank10':get(candidates[candidates.rankp==10]),
              'worst_rank':get(candidates.sort_values('rankp',ascending=False)),
              'flag_best':get(candidates[candidates.h018_flag==1]),
              'flag_skip':None if candidates.iloc[0].h018_flag else base}
        for floor in [1.0,4.5,9.0,15.0]:
            opts[f'value_min{floor:g}']=value_rank(floor,False)
            opts[f'value_min{floor:g}_veto_pass']=value_rank(floor,False)
            opts[f'value_min{floor:g}_veto_replace']=value_rank(floor,True)
            if opts[f'value_min{floor:g}_veto_pass'] and opts[f'value_min{floor:g}_veto_pass']['opp_flag']:
                opts[f'value_min{floor:g}_veto_pass']=None
        # Bounded ranges avoid unrealistically massive 'value' quote multipliers.
        for minq,maxq,limit_rank in [(4.5,30,99),(9,30,99),(9,50,99),(9,100,99),(9,30,9),(9,50,9)]:
            eligible=[]
            for _,opp in candidates.iterrows():
                if opp.rankp>limit_rank: continue
                z=ticket(rid,axis,opp,quote,ref,lookups)
                if not (minq<=z['wide_quote_min']<=maxq):continue
                z['_score']=axis.adjusted_finish_sensitivity*opp.adjusted_finish_sensitivity*z['wide_quote_min']
                eligible.append(z)
            eligible.sort(key=lambda x:(-x['_score'], -x['opp_pred3'], x['opp_no']))
            k=f'bounded_{minq:g}_{maxq:g}_rank{limit_rank}'
            baseline=eligible[0].copy() if eligible else None
            if baseline: baseline.pop('_score')
            cleaned=[z for z in eligible if not z['opp_flag']]
            alternative=cleaned[0].copy() if cleaned else None
            if alternative: alternative.pop('_score')
            opts[k]=baseline
            opts[k+'_veto_pass']=None if baseline and baseline['opp_flag'] else baseline
            opts[k+'_veto_replace']=alternative
        for k,z in opts.items():
            if z is not None:rows.append({'strategy':k,**z})
    T=pd.DataFrame(rows)
    perstrategy={k:stats(T.loc[T.strategy==k].to_dict('records')) for k in T.strategy.unique()}
    # Compute which strategy has changed after risk; compare on same races incl PASS as no bet.
    compare_labels=[f'value_min{f:g}' for f in [1,4.5,9,15]] + [f'bounded_{mn:g}_{mx:g}_rank{rank}' for mn,mx,rank in [(4.5,30,99),(9,30,99),(9,50,99),(9,100,99),(9,30,9),(9,50,9)]]
    for k in compare_labels:
        x=T[T.strategy==k]
        r=T[T.strategy==k+'_veto_replace']
        after=T[T.strategy==k+'_veto_pass']
        base_sel=x.set_index('rid')
        rep_sel=r.set_index('rid')
        eff=x[x.opp_flag==1]
        perstrategy[k+'_comparisons']={
           'baseline_bets':len(x),'baseline_hit':int(x.hit.sum()),
           'flagged_selected':len(eff),'flagged_hits':int(eff.hit.sum()),
           'flagged_payout_yen':int(eff.payout_yen_100.sum()),
           'all_nonflag_pairs_selected_without_veto':len(x)-len(eff),
           'veto_pass_bets':len(after),'veto_pass_roi':stats(after.to_dict('records'))['roi'],
           'replace_changed_count':sum(bool(rid in rep_sel.index and int(base_sel.loc[rid,'opp_no'])!=int(rep_sel.loc[rid,'opp_no'])) for rid in eff.rid),
           'veto_replace_bets':len(r),'veto_replace_roi':stats(r.to_dict('records'))['roi'],
           'veto_replace_hit':int(r.hit.sum()),
        }
    return T,perstrategy

if __name__=='__main__':
    d,q,p,lk,checks=build()
    t,ss=analyze(d,q,p,lk)
    print('qa',checks)
    for k,v in ss.items():
        print(k,v)
    # keep private tickets and aggregates privately; public summary strips horse IDs/names.
    t.to_csv(DST/'H021_TICKET_DETAIL_PRIVATE.csv',index=False,encoding='utf-8-sig')
    with (DST/'H021_RESULTS.json').open('w',encoding='utf-8') as f:
        json.dump({'population':{'races':d.rid.nunique(),'horses':len(d),'flags':int(d.h018_flag.sum()),'risk_rank_min':int(d[d.h018_flag==1].rankp.min()),'years':d.year.value_counts().sort_index().to_dict(),'payout_matched_races':len(p)},'qa':checks,'strategies':ss},f,ensure_ascii=False,indent=2)
    print('done',len(t))