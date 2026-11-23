#!/usr/bin/env python3
"""H008-C: race-level descriptive JRA track+surface+distance 200m lap audit.
Research only: outcome race laps must never be fed as pre-start model features.
Only builtin csv/stats + numpy (for Wilson not necessary); no original TARGET raw data redistributed.
"""
import csv, collections, re, math, json, statistics, pathlib, datetime, random
ROOT=pathlib.Path('/mnt/data')
OUT=ROOT/'H008C_全国全コースラップ分析_20261123'
CLASSES={'67','115','131','163','179','195'}
VENUE_MAP=dict(zip('札函福新東中名京阪小',('札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉')))
VENUE_ORDER=list(VENUE_MAP.values())
SRC_RESULTS=(ROOT/'2026_2025_seiseki.csv',ROOT/'2026seiseki.csv')
SRC_LAP=ROOT/'lap2016_2026(1).csv'

def dt_lap(text):
    tokens=re.findall(r'\d+',str(text))
    if len(tokens)!=3:raise ValueError('date components')
    y,m,d=map(int,tokens)
    dt=datetime.date(y,m,d)
    return dt.year*10000+dt.month*100+dt.day

def dt_result(r):
    y=2000+int(r['年']);m=int(r['月']);d=int(r['日'])
    dt=datetime.date(y,m,d)
    return dt.year*10000+dt.month*100+dt.day

def first_len(dist):
    length=dist%200
    return length if length else 200

def splits_for_distance(raw,dist):
    """JRA first segment: 100m/150m (odd distances), otherwise 200m. Rest 200m.
    For 1000m, early window and final2 window separated; for 1200m final3.
    """
    try: splits=[float(s.strip()) for s in raw.split('-')]
    except (ValueError,AttributeError): return None,'non_numeric'
    if any(not math.isfinite(x) for x in splits):return None,'non_numeric'
    first=first_len(dist)
    expected=1+(dist-first)//200
    if len(splits)!=expected:return None,'fraction_count'
    bounds={100:(4,9.5),150:(6.5,12.5),200:(9,17)}
    if first not in bounds:return None,'unknown_start_length'
    low,high=bounds[first]
    if not low<splits[0]<high:return None,'start_fraction_outlier'
    if any(not 9<x<17 for x in splits[1:]):return None,'200m_fraction_outlier'
    if len(splits)<5:return None,'too_short'
    return splits,None

def analyze_splits(s,dist):
    # 200m lanes only after start; half-lap is not used in averages.
    early=sum(s[1:3])/2
    if len(s)==5:late=sum(s[-2:])/2;late_n=2
    else:late=sum(s[-3:])/3;late_n=3
    middle_list=s[3:-3]
    mid_count=len(middle_list)
    mid=sum(middle_list)/mid_count if mid_count else None
    # 1600m+ style 2+ independent mid 200m sectors. 1500m with shortened first works too.
    valid_mid=mid_count>=2
    lull=(mid-early>=.3 and mid-late>=.3) if valid_mid else None
    # Near finish 0.6s within 200m transition, entire race lap not each horse's speed.
    accel=max((s[i-1]-s[i]) for i in range(max(1,len(s)-3),len(s)))
    finale=s[-1]-sum(s[-3:-1])/2
    return dict(early=early,late=late,late_fractions=late_n,middle=mid,
        middle_n=mid_count,lull=int(lull) if lull is not None else None,
        lull_index=(mid-(early+late)/2) if valid_mid else None,
        early_late=late-early,accel=accel,accel06=int(accel>=.6),
        fatigue=finale,fatigue05=int(finale>=.5),
        fraction_count=len(s),first_fraction_m=first_len(dist),race_laps=s)

def wilson(k,n):
    if n<1:return (None,None)
    z=1.95996398454;p=k/n;den=1+z*z/n
    center=(p+z*z/(2*n))/den
    spread=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return (max(0,center-spread),min(1,center+spread))

def mean(xs):return sum(xs)/len(xs) if xs else None

def agg(group):
    n=len(group); lull=[r['lull'] for r in group if r['lull'] is not None]
    nmid=len(lull); hit=sum(lull); low,high=wilson(hit,nmid)
    accel=[r['accel06'] for r in group]; fatigue=[r['fatigue05'] for r in group]
    e=mean([r['early_late'] for r in group]);
    return dict(n=n,n_lull=nmid,lull_hits=hit,lull_pct=100*hit/nmid if nmid else None,
      lull_ci_low=100*low if low is not None else None,
      lull_ci_high=100*high if high is not None else None,
      lull_index=mean([r['lull_index'] for r in group if r['lull_index'] is not None]),
      early2=mean([r['early'] for r in group]),late=mean([r['late'] for r in group]),
      late_minus_early=e,late_minus_early_sd=statistics.pstdev([r['early_late'] for r in group]) if n>1 else None,
      accel06_pct=100*sum(accel)/n,accel_max=mean([r['accel'] for r in group]),
      final_fade05_pct=100*sum(fatigue)/n,final_fade_avg=mean([r['fatigue'] for r in group]),
      status=('十分(30R+)' if n>=30 else '参考(20-29R)' if n>=20 else '少数(10-19R)' if n>=10 else '不足(<10R)'),
      period_last3=sum(1 for r in group if r['year']>=2024))

def code_summary(g):
    cs=collections.Counter(r['course_code'] for r in g)
    return ','.join(f'{k}:{v}' for k,v in sorted(cs.items()))

def write_csv(filename, rows, header):
    with (OUT/filename).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=header,extrasaction='ignore');w.writeheader();w.writerows(rows)

def main():
    results={}; ambiguous=set(); all_result=collections.Counter()
    for path in SRC_RESULTS:
      with path.open(encoding='cp932',newline='') as f:
       for r in csv.DictReader(f):
        try:d=dt_result(r)
        except:continue
        k=(d,r['場所'],r['レース名']);all_result[k]+=1
        if k in results:
            z=results[k]
            # Same race must agree on surface/distance/class/field/course_code. Else quarantine.
            if any(z[c]!=r[c] for c in ('芝・ダ','距離','クラスコード','頭数','コースコード')):ambiguous.add(k)
        else:results[k]={c:r[c] for c in ('芝・ダ','距離','クラスコード','頭数','コースコード','馬場状態','レース番号')}
    laps=[]; seen_keys=set();bad_keys=set();reasons=collections.Counter();matched=0;eligible_keys=set()
    with SRC_LAP.open(encoding='cp932',newline='') as f:
     for lap in csv.DictReader(f):
      try:
       d=dt_lap(lap['日付']);found=re.search('[札函福新東中名京阪小]',lap['開催']);venue=VENUE_MAP[found.group()] if found else None
      except (ValueError,KeyError):reasons['lap_date_or_venue_invalid']+=1;continue
      k=(d,venue,lap['レース名'])
      if k not in results:reasons['no_exact_result_name_match']+=1;continue
      matched+=1
      res=results[k]
      if res['クラスコード'] not in CLASSES or res['芝・ダ'] not in ('芝','ダ'):
       reasons['not_3win_open_graded_flat']+=1;continue
      try: dist=int(res['距離']);field=int(res['頭数'])
      except ValueError:reasons['distance_or_field_invalid']+=1;continue
      if not 12<=field<=18:reasons['out_of_12_18']+=1;continue
      eligible_keys.add(k)
      if k in ambiguous:reasons['race_key_conflicting_metadata']+=1;continue
      if k in seen_keys:bad_keys.add(k);reasons['duplicate_lap_key']+=1;continue
      seen_keys.add(k)
      spl,reason=splits_for_distance(lap['ラップタイム'],dist)
      if reason:reasons[reason]+=1;continue
      data=analyze_splits(spl,dist)
      row={'date':d,'year':d//10000,'venue':venue,'surface':res['芝・ダ'],'distance':dist,'course_code':res['コースコード'],
       'field_size':field,'class_code':res['クラスコード'],'going':res['馬場状態'],
       'grade_type':('G1-3' if res['クラスコード'] in ('131','163','179','195') else '3win-OP-L'),
       'race_label':lap['レース名'],**data}
      laps.append(row)
    if bad_keys:laps=[x for x in laps if (x['date'],x['venue'],x['race_label']) not in bad_keys]
    assert len(laps)==len(set((r['date'],r['venue'],r['race_label']) for r in laps))
    groups=collections.defaultdict(list)
    for r in laps:groups[(r['venue'],r['surface'],r['distance'])].append(r)
    rows=[]
    for k in sorted(groups,key=lambda k:(VENUE_ORDER.index(k[0]),0 if k[1]=='芝' else 1,k[2])):
      g=groups[k];z=agg(g);ven,surf,dist=k
      z.update(venue=ven,surface=surf,distance=dist,profile=f'{ven}{surf}{dist}m',first_segment_m=first_len(dist),
          pace_class=('中緩み比較可能' if z['n_lull'] else '短距離：中緩み非対象'),course_codes=code_summary(g))
      rows.append(z)
    allgroup=collections.defaultdict(list)
    for r in laps:allgroup[(r['surface'],r['distance'])].append(r)
    distance_rows=[]
    for (s,d),g in sorted(allgroup.items(),key=lambda z:(z[0][0],z[0][1])):
      z=agg(g);z.update(surface=s,distance=d,profile=f'{s}{d}m');distance_rows.append(z)
    venue_rows=[]
    for v in VENUE_ORDER:
      gg=[r for r in laps if r['venue']==v]
      for s in ('芝','ダ'):
        q=[r for r in gg if r['surface']==s]
        if q:
          z=agg(q);z.update(venue=v,surface=s,profiles=sum(1 for p in rows if p['venue']==v and p['surface']==s));venue_rows.append(z)
    # Reproduce entire average lap curve for every observed race course, with variable first section.
    # A shortened start section (100/150m) is raw seconds and never treated as a standard 200m interval.
    lap_curves=[];lap_long=[]
    maxsplits=max(len(x['race_laps']) for x in laps)
    for z in rows:
      k=(z['venue'],z['surface'],z['distance'])
      g=groups[k]; l=len(g[0]['race_laps']); assert all(len(x['race_laps'])==l for x in g)
      row={'venue':z['venue'],'surface':z['surface'],'distance':z['distance'],'profile':z['profile'],'n':len(g),
           'first_segment_m':z['first_segment_m'],'n_segments':l}
      start=0
      for i in range(l):
        ds=z['first_segment_m'] if i==0 else 200
        avg=mean([q['race_laps'][i] for q in g]);row['L'+str(i+1)]=round(avg,5)
        lap_long.append({'profile':z['profile'],'venue':z['venue'],'surface':z['surface'],
          'distance':z['distance'],'n':len(g),'segment':i+1,'start_m':start,'finish_m':start+ds,'length_m':ds,'avg_seconds':round(avg,5)})
        start+=ds
      assert start==z['distance']
      lap_curves.append(row)
    lapcols=['venue','surface','distance','profile','n','first_segment_m','n_segments']+['L'+str(j) for j in range(1,maxsplits+1)]
    write_csv('全87コース_平均区間ラップ_横.csv',lap_curves,lapcols)
    write_csv('全87コース_平均区間ラップ_縦.csv',lap_long,['profile','venue','surface','distance','n','segment','start_m','finish_m','length_m','avg_seconds'])
    # race-level data are user-provided private dataset; release only aggregate data and one sample anonymous 200m array per profile maybe not needed
    # Block accidental user race names export.
    base_cols=['venue','surface','distance','profile','n','status','pace_class','n_lull','lull_hits','lull_pct','lull_ci_low','lull_ci_high','lull_index','early2','late','late_minus_early','accel06_pct','accel_max','final_fade05_pct','final_fade_avg','period_last3','first_segment_m','course_codes']
    write_csv('全87コース_ラップ構造.csv',rows,base_cols)
    write_csv('距離別_芝ダ_比較.csv',distance_rows,['surface','distance','profile','n','status','n_lull','lull_pct','lull_ci_low','lull_ci_high','lull_index','early2','late','late_minus_early','accel06_pct','final_fade05_pct'])
    write_csv('競馬場別_芝ダ_比較.csv',venue_rows,['venue','surface','profiles','n','n_lull','lull_pct','lull_index','late_minus_early','accel06_pct','final_fade05_pct'])
    by_year=[]
    for v,s,d in sorted(groups):
      for seg,lo,hi in [('2016-2020',2016,2020),('2021-2023',2021,2023),('2024-2026',2024,2026)]:
        sub=[r for r in groups[(v,s,d)] if lo<=r['year']<=hi]
        if sub:
          z=agg(sub);z.update(venue=v,surface=s,distance=d,period=seg,profile=f'{v}{s}{d}m');by_year.append(z)
    write_csv('コース別_期間安定性.csv',by_year,['venue','surface','distance','profile','period','n','status','n_lull','lull_pct','lull_index','late_minus_early','accel06_pct','final_fade05_pct'])
    coverage={'results_unique_race_keys':len(results),'lap_rows':sum(reasons.values())+len(laps),
      'exact_lap_result_join_rows':matched,'eligible_exact_join_races':len(eligible_keys),'clean_lap_races':len(laps),
      'all_observed_course_profiles':len(groups),'profiles_30_plus':sum(x['n']>=30 for x in rows),
      'profiles_20_plus':sum(x['n']>=20 for x in rows),'profiles_10_plus':sum(x['n']>=10 for x in rows),
      'venue_count':len(set(x['venue'] for x in rows)),'turf_races':sum(r['surface']=='芝' for r in laps),
      'dirt_races':sum(r['surface']=='ダ' for r in laps),'midlull_valid_races':sum(r['lull'] is not None for r in laps),
      'date_min':min(r['date'] for r in laps),'date_max':max(r['date'] for r in laps),
      'reasons':dict(reasons),
      'start_length_by_profile':{f'{r["venue"]}{r["surface"]}{r["distance"]}':r['first_segment_m'] for r in rows if r['first_segment_m']<200},
      'by_venue':{v:{'races':sum(x['n'] for x in rows if x['venue']==v),'profiles':sum(1 for x in rows if x['venue']==v)} for v in VENUE_ORDER}}
    # H008A parity independent of H008C (when primary metrics are the same).
    by={r['profile']:r for r in rows}
    for name,n0,k0 in [('東京芝1800m',80,41),('中山芝1800m',65,4),('東京芝1600m',109,41),('中山芝1600m',126,19)]:
      z=by[name]
      assert z['n']==n0 and z['lull_hits']==k0, (name,z['n'],z['lull_hits'],n0,k0)
    # Cross-check all observed eligible Lap profiles; no missing one from groups.
    (OUT/'集計メタデータ.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'summary.json').write_text(json.dumps({'metadata':coverage,'courses':rows,'distance':distance_rows,'mean_lap_curves':lap_curves},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'coverage':coverage,'profiles':rows},ensure_ascii=False,indent=2))

if __name__=='__main__':main()