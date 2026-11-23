#!/usr/bin/env python3
"""H012-A: full national course x 4C position x 200m race lap *descriptive* audit.
Post-race 4C and CURRENT race lap are only explanatory labels, never proposed as as-of predictors.
Original user-owned TARGET CSVs stay local; do not publish horse-level results.
"""
from __future__ import annotations
import sys, math, json, csv, re, collections, datetime, pathlib
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests

ROOT=pathlib.Path('/mnt/data')
OUT=ROOT/'H012_全国4角と全ラップ_20261123'; OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'H008C_全国全コースラップ分析_20261123'))
from analyze_all_courses import dt_lap,splits_for_distance,analyze_splits,VENUE_MAP,CLASSES
def pl_top3(weights):
    """Exact Plackett-Luce top3 marginal from normalized inverse final win odds."""
    p=np.asarray(weights,dtype=float);p=p/p.sum();n=len(p)
    idx=np.arange(n);i=idx[:,None,None];j=idx[None,:,None];k=idx[None,None,:]
    noncoll=(i!=j)&(i!=k)&(j!=k)
    den=(1-p[None,:,None])*(1-p[None,:,None]-p[None,None,:])
    third=np.where(noncoll,p[None,:,None]*p[None,None,:]/np.maximum(den,1e-12),0).sum(axis=(1,2))*p
    second=p*((1-np.eye(n))*(p[None,:]/np.maximum(1-p[None,:],1e-12))).sum(axis=1)
    out=p+second+third
    if abs(out.sum()-3)>1e-7 or (out>1).any() or (out<0).any():raise ValueError('invalid PL top3')
    return out
ALPHA=.8226462628846603
SEED=20261123
FIELDS=['年','月','日','場所','レース番号','レース名','クラスコード','芝・ダ','コースコード','距離','馬場状態','頭数','馬番','馬名','確定着順','人気順','単勝オッズ','通過順1','通過順2','通過順3','通過順4','異常コード']

def prepare_results():
    a=[pd.read_csv(ROOT/f,encoding='cp932',usecols=FIELDS,low_memory=False) for f in ('2026_2025_seiseki.csv','2026seiseki.csv')]
    df=pd.concat(a,ignore_index=True)
    for col in ['年','月','日','レース番号','クラスコード','距離','頭数','馬番','確定着順','人気順','単勝オッズ','通過順4']:
        df[col]=pd.to_numeric(df[col],errors='coerce')
    df=df[df['クラスコード'].isin([67,115,131,163,179,195]) & df['頭数'].between(12,18) & df['芝・ダ'].isin(['芝','ダ'])].copy()
    df['date']=(df['年']+2000).astype(int)*10000+df['月'].astype(int)*100+df['日'].astype(int)
    df['racekey']=df['date'].astype(str)+'_'+df['場所']+'_'+df['レース番号'].astype(int).map(lambda x:f'{x:02d}')
    groups=[];keys={};counter=collections.Counter()
    for key,g in df.groupby('racekey',sort=False):
        counter['eligible_races']+=1
        n=int(g['頭数'].iloc[0]); consistent=all(g[c].nunique(dropna=False)==1 for c in ['頭数','レース名','場所','芝・ダ','距離','クラスコード','コースコード','日','月','年'])
        full=consistent and len(g)==n and g['馬番'].nunique()==n and (g['馬番'].between(1,18)).all()
        if not full:counter['not_complete_card']+=1;continue
        if not (g['確定着順'].between(1,3).sum()==3 and (g['人気順']==1).sum()==1):counter['not_exact_3_top3_fav']+=1;continue
        if not g['通過順4'].between(1,n).all():counter['c4_missing']+=1;continue
        if not ((g['単勝オッズ']>1)&g['単勝オッズ'].notna()).all():counter['bad_odds']+=1;continue
        if (g['確定着順']==1).sum()!=1:counter['winner_missing']+=1;continue
        k=(int(g['date'].iloc[0]),str(g['場所'].iloc[0]),str(g['レース名'].iloc[0]))
        if k in keys:counter['ambiguous_name_day_venue']+=1;keys[k]=None;continue
        keys[k]=g.copy()
        counter['strict_before_lap']+=1
    return keys,counter

def read_laps(keys):
    meta={};count=collections.Counter();unusable=set()
    with (ROOT/'lap2016_2026(1).csv').open(encoding='cp932',newline='') as f:
      for row in csv.DictReader(f):
        try:
          dt=dt_lap(row['日付']);venmatch=re.search('[札函福新東中名京阪小]',row['開催'])
          ven=VENUE_MAP[venmatch.group()] if venmatch else None
          k=(dt,ven,row['レース名'])
        except (KeyError,ValueError):count['date_or_venue_error']+=1;continue
        if k not in keys or keys[k] is None:continue
        count['matched_lap_rows']+=1
        g=keys[k];dist=int(g['距離'].iloc[0]);s,reason=splits_for_distance(row['ラップタイム'],dist)
        if reason:count['invalid_lap_'+reason]+=1;unusable.add(k);continue
        if k in meta:count['duplicate_lap_key']+=1;unusable.add(k);continue
        d=analyze_splits(s,dist)
        meta[k]={**d,'sections':s}
    for k in unusable:meta.pop(k,None)
    count['valid_lap_strict_races']=len(meta)
    return meta,count

def build():
    keys,cnt=prepare_results()
    lap,lc=read_laps(keys)
    race_records=[];horse_records=[]
    for k, lm in lap.items():
        g=keys[k];n=int(g['頭数'].iloc[0]);dt,ven,name=k
        nback=(g['通過順4']/n > .5).sum()
        back=(g['通過順4']/n > .5).to_numpy()
        top=(g['確定着順']<=3).to_numpy()
        odds=g['単勝オッズ'].to_numpy(float)
        pl=pl_top3(1/odds); q=3/n+ALPHA*(pl-3/n)
        assert abs(q.sum()-3)<1e-7 and len(q)==n and top.sum()==3
        back3=int((back&top).sum());expback=float(q[back].sum());racesum=int(top.sum())
        row={
          'rid':f'{dt}_{ven}_{int(g["レース番号"].iloc[0]):02d}', 'date':dt,'year':dt//10000,
          'venue':ven,'surface':str(g['芝・ダ'].iloc[0]),'distance':int(g['距離'].iloc[0]),
          'course_code':str(int(g['コースコード'].iloc[0])), 'profile':f'{ven}{g["芝・ダ"].iloc[0]}{int(g["距離"].iloc[0])}m',
          'n':n,'back_n':int(nback),'back_top3':back3,'front_top3':3-back3,
          'back_share':back3/3,'back_opportunity':float(nback/n),
          'back_market_expected':expback,'back_market_actual_minus_expected':(back3-expback)/3,
          'back_top3_rate':back3/nback if nback else None,
          'front_top3_rate':(3-back3)/(n-nback) if n>nback else None,
          'lull':lm['lull'],'final_fade05':lm['fatigue05'],'accel06':lm['accel06'],
          'early2':lm['early'],'late3':lm['late'],'middle':lm['middle'],
          'lull_index':lm['lull_index'],'late_minus_early':lm['early_late'],
          'last200_fade_sec':lm['fatigue'],'max_final_accel_sec':lm['accel'],
          'start_length_m':lm['first_fraction_m'],
          'grade':'G1-G3' if int(g['クラスコード'].iloc[0]) in (163,179,195) else '3win-OP-L',
          'going':str(g['馬場状態'].iloc[0]),
          'back_expected_share_of_three':expback/3,
          'market_surprise_back':back3-expback
        }
        race_records.append(row)
        for i,x in enumerate(g.itertuples(index=False)):
            horse_records.append({'rid':row['rid'],'date':dt,'name':str(g['馬名'].iloc[i]),'no':int(g['馬番'].iloc[i]),'n':n,'profile':row['profile'],'venue':ven,'surface':row['surface'],'distance':row['distance'],'year':row['year'],
                'c4_norm':float(g['通過順4'].iloc[i]/n),'back':int(back[i]),'top3':int(top[i]),'q':float(q[i]),'closing_odds':float(odds[i]),'is_favorite':int(g['人気順'].iloc[i]==1),
                'c4_gain':float((g['通過順4'].iloc[i]-g['確定着順'].iloc[i])/(n-1))})
    rf=pd.DataFrame(race_records).sort_values(['date','venue','rid']).reset_index(drop=True)
    hf=pd.DataFrame(horse_records)
    assert len(rf)==rf.rid.nunique()
    return rf,hf,cnt,lc

def ci_mean(values,rng,reps=3500):
    a=np.asarray(values,float);n=len(a)
    if n<5:return (float('nan'),float('nan'))
    samples=a[rng.integers(0,n,size=(reps,n))].mean(axis=1)
    return tuple(float(x) for x in np.quantile(samples,[.025,.975]))

def aggregate(rf):
    rng=np.random.default_rng(SEED)
    raw=[]
    for prof,g in rf.groupby('profile',sort=False):
        n=len(g);b=int(g.back_top3.sum());B=int(g.back_n.sum());N=int(g.n.sum());
        share=float(g.back_share.mean());opp=float(B/N);market=float(g.back_market_expected.sum()/(3*n));resid=float(g.back_market_actual_minus_expected.mean());
        ci=ci_mean(g.back_share.to_numpy(),rng);rci=ci_mean(g.back_market_actual_minus_expected.to_numpy(),rng)
        periods={}
        for period,hh in [('2016-2020',g[g.year<=2020]),('2021-2026',g[g.year>=2021])]:
            periods[period]={'races':len(hh),'share':None if not len(hh) else float(hh.back_share.mean())}
        # 'Value' is a descriptive back-4C top3 incidence relative to chance of encountering that back status, not a purchase value.
        edge=share-opp
        row={'profile':prof,'venue':g.venue.iloc[0],'surface':g.surface.iloc[0],'distance':int(g.distance.iloc[0]),
             'course_codes':','.join(map(str,sorted(g.course_code.unique()))),'n_races':n,'n_horses':N,
             'back_4c_n_horses':B,'back_top3_horses':b,'back_top3_share_pct':100*share,
             'back_top3_share_ci_low_pct':100*ci[0],'back_top3_share_ci_high_pct':100*ci[1],
             'back_horse_fraction_pct':100*opp,'back_share_minus_opportunity_pp':100*edge,
             'back_top3_rate_pct':100*b/B if B else None,
             'front_top3_rate_pct':100*(3*n-b)/(N-B) if N>B else None,
             'back_market_expected_top3':float(g.back_market_expected.sum()),
             'back_market_expected_share_pct':100*market,
             'back_actual_minus_market_pp':100*resid,'back_market_residual_ci_low_pp':100*rci[0],'back_market_residual_ci_high_pp':100*rci[1],
             'mid_lull_races':int(g.lull.notna().sum()),'mid_lull_pct':100*float(g.lull.dropna().mean()) if g.lull.notna().any() else None,
             'final_fade05_pct':100*float(g.final_fade05.mean()),'final_accel06_pct':100*float(g.accel06.mean()),
             'early_to_late_200m_sec':float(g.late_minus_early.mean()),
             'period_2016_2020_races':periods['2016-2020']['races'],'period_2016_2020_back_share_pct':None if periods['2016-2020']['share'] is None else 100*periods['2016-2020']['share'],
             'period_2021_2026_races':periods['2021-2026']['races'],'period_2021_2026_back_share_pct':None if periods['2021-2026']['share'] is None else 100*periods['2021-2026']['share'],
             'coverage':'多い(50R+)' if n>=50 else '一定(30-49R)' if n>=30 else '参考(15-29R)' if n>=15 else '少数(<15R)'}
        raw.append(row)
    full=pd.DataFrame(raw).sort_values(['surface','venue','distance']).reset_index(drop=True)
    # Nested post-race pace comparison, descriptive only; require >=10 races per subgroup.
    pace=[]
    for profile,g in rf.groupby('profile'):
       if len(g)<30:continue
       for feature in ('lull','final_fade05','accel06'):
          a=g[g[feature]==1];b=g[g[feature]==0]
          if len(a)<10 or len(b)<10:continue
          diff=float(a.back_share.mean()-b.back_share.mean())
          ci_a=ci_mean(a.back_share.to_numpy(),rng,2200);ci_b=ci_mean(b.back_share.to_numpy(),rng,2200)
          d=np.asarray(a.back_share,float);e=np.asarray(b.back_share,float)
          replicates=2200
          sample_d=d[rng.integers(0,len(d),(replicates,len(d)))].mean(1)-e[rng.integers(0,len(e),(replicates,len(e)))].mean(1)
          ci=np.quantile(sample_d,[.025,.975])
          t,p=stats.ttest_ind(d,e,equal_var=False)
          pace.append({'profile':profile,'venue':g.venue.iloc[0],'surface':g.surface.iloc[0],'distance':int(g.distance.iloc[0]),'feature':feature,'positive_races':len(a),'negative_races':len(b),
                       'back_top3_pct_feature_yes':100*float(a.back_share.mean()),'back_top3_pct_feature_no':100*float(b.back_share.mean()),
                       'yes_minus_no_pp':100*diff,'ci95_low_pp':100*ci[0],'ci95_high_pp':100*ci[1], 'exploratory_p_welch':float(p) if np.isfinite(p) else None})
    pc=pd.DataFrame(pace)
    if len(pc):
      ok=pc.exploratory_p_welch.notna()
      pc['fdr_bh_q']=np.nan
      pc.loc[ok,'fdr_bh_q']=multipletests(pc.loc[ok,'exploratory_p_welch'].to_numpy(),method='fdr_bh')[1]
      pc=pc.sort_values(['fdr_bh_q','positive_races'],ascending=[True,False]).reset_index(drop=True)
    # Exact surface/distance comparisons n>=30 independently per venue pair, avoid pretending an explicit rank.
    pairs=[]
    for (surface,distance),v in full.groupby(['surface','distance']):
      gg=v[v.n_races>=30]
      if len(gg)<2:continue
      for i in range(len(gg)):
       for j in range(i+1,len(gg)):
        left,right=gg.iloc[i],gg.iloc[j]
        a=rf[rf.profile==left.profile].back_share.to_numpy(); b=rf[rf.profile==right.profile].back_share.to_numpy();
        d=float(a.mean()-b.mean());se=math.sqrt(a.var(ddof=1)/len(a)+b.var(ddof=1)/len(b))
        z=d/se if se>0 else 0
        p=float(2*stats.norm.sf(abs(z)))
        sample=a[rng.integers(0,len(a),(2500,len(a)))].mean(1)-b[rng.integers(0,len(b),(2500,len(b)))].mean(1)
        ci=np.quantile(sample,[.025,.975]);
        pairs.append({'surface':surface,'distance':int(distance),'course_a':left.profile,'course_b':right.profile,'n_a':int(len(a)),'n_b':int(len(b)),
                      'back_share_a_pct':100*float(a.mean()),'back_share_b_pct':100*float(b.mean()),
                      'difference_pp_a_minus_b':100*d,'ci95_low_pp':100*ci[0],'ci95_high_pp':100*ci[1],
                      'p_welch_approx':p})
    pr=pd.DataFrame(pairs)
    if len(pr):
      pr['fdr_bh_q']=multipletests(pr['p_welch_approx'].to_numpy(),method='fdr_bh')[1]
      pr=pr.sort_values('fdr_bh_q').reset_index(drop=True)
    return full,pc,pr

def json_dump(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2,default=lambda x:x.item() if hasattr(x,'item') else str(x)),encoding='utf-8')

def main():
    rf,hf,cnt,lc=build();co,pace,pairs=aggregate(rf)
    rf.drop(columns=['rid']).to_csv(OUT/'H012_レース別_4角と全ラップ_匿名.csv',index=False,encoding='utf-8-sig')
    co.to_csv(OUT/'H012_全国全コース_4角到達構造.csv',index=False,encoding='utf-8-sig')
    pace.to_csv(OUT/'H012_ラップ条件別_4角後方到達.csv',index=False,encoding='utf-8-sig')
    pairs.to_csv(OUT/'H012_同距離異競馬場_差の比較.csv',index=False,encoding='utf-8-sig')
    counts={'all_result_eligible':cnt,'lap_matched_strict':lc,'strict_lap_races':len(rf),'strict_lap_horses':len(hf),'profiles':len(co),
            'profiles_with_30_plus_races':int((co.n_races>=30).sum()),'races_turf':int((rf.surface=='芝').sum()),'races_dirt':int((rf.surface=='ダ').sum()),'laps_with_mid':int(rf.lull.notna().sum()),'pairs_tested':len(pairs),'pace_tests':len(pace)}
    # Public only aggregated results, excluding race identifiers and horse names.
    strongest=co[co.n_races>=30].sort_values('back_top3_share_pct')
    counts['lowest_back_share_n30'] = strongest.head(8)[['profile','n_races','back_top3_share_pct','back_horse_fraction_pct','back_actual_minus_market_pp']].round(3).to_dict('records')
    counts['highest_back_share_n30']=strongest.tail(8)[['profile','n_races','back_top3_share_pct','back_horse_fraction_pct','back_actual_minus_market_pp']].round(3).to_dict('records')
    counts['strong_pairs_fdr_5pct']=pairs[pairs.fdr_bh_q<.05].head(30).round(4).to_dict('records') if len(pairs) else []
    counts['strong_pace_fdr_5pct']=pace[pace.fdr_bh_q<.05].head(30).round(4).to_dict('records') if len(pace) else []
    json_dump(OUT/'H012_匿名集計_結果.json',counts)
    print(json.dumps(counts,ensure_ascii=False,indent=2,default=str))

if __name__=='__main__':main()