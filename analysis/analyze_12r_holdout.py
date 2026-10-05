#!/usr/bin/env python3
"""Pre-specified holdout check for the 12R turf hypotheses discovered on 2021-2025.

Holdout period is fixed to 2016-2020. Primary conditions are intentionally limited to:
  A) turf, 12-16 runners, 1500-1800m
  B) turf, 12-16 runners, >=2000m
Each 12R sample is compared with 9-11R under the same conditions.
"""
import csv, io, math, statistics, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE='https://raw.githubusercontent.com/keibamar/keiba_ai_ver2.0/master/data'
TRACKS=['01_sapporo','02_hakodate','03_fukushima','04_nigata','05_tokyo','06_nakayama','07_chukyo','08_kyoto','09_hanshin','10_kokura']
YEARS=range(2016,2021)


def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':'jikuba-selector-holdout'})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.read().decode('utf-8-sig')


def load_pair(track,year):
    ru=f'{BASE}/RaceResults/{track}/{year}_race_results.csv'
    pu=f'{BASE}/RaceReturns/{track}/{year}_race_returns.csv'
    try:
        return track,year,fetch(ru),fetch(pu),None
    except Exception as e:
        return track,year,None,None,str(e)


def to_num(s):
    try:return float(s)
    except:return None


def parse_result(text,race_map):
    rd=csv.DictReader(io.StringIO(text))
    for row in rd:
        rid=(row.get('') or '').strip()
        if not rid or not rid[-2:].isdigit():continue
        rno=int(rid[-2:])
        rec=race_map.setdefault(rid,{
            'race_no':rno,'runners':0,'pops':{},'surface':row.get('race_type',''),
            'distance':to_num(row.get('course_len')),'class':row.get('class',''),'date':row.get('date','')
        })
        rec['runners']+=1
        try:finish=int(float(row.get('着順','')))
        except:finish=None
        if finish in (1,2):
            pop=to_num(row.get('人気'))
            rec['pops'][finish]=int(pop) if pop is not None else None


def parse_returns(text,race_map):
    rd=csv.reader(io.StringIO(text)); next(rd,None)
    for row in rd:
        if len(row)<5:continue
        rid=row[0].strip(); bet=row[1].strip()
        if bet!='馬連' or rid not in race_map:continue
        race_map[rid]['quinella_payout']=to_num(row[3])
        qrank=to_num(row[4])
        race_map[rid]['quinella_rank']=int(qrank) if qrank is not None else None


def band(p):
    if p is None:return '欠損'
    if p<=4:return '1-4'
    if p<=9:return '5-9'
    return '10+'


def pair_band(a,b):
    order={'1-4':0,'5-9':1,'10+':2,'欠損':9}
    x,y=sorted((band(a),band(b)),key=lambda z:order[z])
    return f'{x}×{y}'


def usable(rows):
    return [r for r in rows if r.get('pops',{}).get(1) is not None and r.get('pops',{}).get(2) is not None]


def prop(rows,kind):
    rs=usable(rows); n=len(rs)
    if kind=='payout10k':
        rs=[r for r in rs if r.get('quinella_payout') is not None]; n=len(rs)
        k=sum(1 for r in rs if r['quinella_payout']>=10000)
    elif kind=='top4x10':
        k=sum(1 for r in rs if pair_band(r['pops'][1],r['pops'][2])=='1-4×10+')
    elif kind=='both_top4':
        k=sum(1 for r in rs if max(r['pops'][1],r['pops'][2])<=4)
    elif kind=='both_top9':
        k=sum(1 for r in rs if max(r['pops'][1],r['pops'][2])<=9)
    else:raise ValueError(kind)
    return k,n,(k/n if n else None)


def diff_ci(a,c,kind):
    k1,n1,p1=prop(a,kind); k0,n0,p0=prop(c,kind)
    if not n1 or not n0:return None
    d=p1-p0
    se=math.sqrt(p1*(1-p1)/n1+p0*(1-p0)/n0)
    return d,d-1.96*se,d+1.96*se,n1,n0,p1,p0


def payouts(rows):
    return [r['quinella_payout'] for r in usable(rows) if r.get('quinella_payout') is not None]


def med(rows):
    xs=payouts(rows)
    return statistics.median(xs) if xs else None


def mean(rows):
    xs=payouts(rows)
    return statistics.mean(xs) if xs else None


def fmt_ci(x):
    if x is None:return '—'
    d,lo,hi,n1,n0,p1,p0=x
    sig='YES' if (lo>0 or hi<0) else 'NO'
    return f'12R {p1*100:.1f}% vs 9-11R {p0*100:.1f}% | 差 {d*100:+.2f}pt | 95%CI {lo*100:+.2f}〜{hi*100:+.2f} | CI excludes 0: {sig}'


def show(label,a,c):
    a=usable(a); c=usable(c)
    print(f'\n### {label}')
    print(f'n: 12R {len(a)} / 9-11R {len(c)}')
    print('上位4同士:',fmt_ci(diff_ci(a,c,'both_top4')))
    print('9人気以内同士:',fmt_ci(diff_ci(a,c,'both_top9')))
    print('上位4×10人気以下:',fmt_ci(diff_ci(a,c,'top4x10')))
    print('万馬券率:',fmt_ci(diff_ci(a,c,'payout10k')))
    print(f'馬連払戻中央値: 12R {med(a):,.0f}円 / 9-11R {med(c):,.0f}円' if med(a) is not None and med(c) is not None else '馬連払戻中央値: —')
    print(f'馬連払戻平均: 12R {mean(a):,.0f}円 / 9-11R {mean(c):,.0f}円' if mean(a) is not None and mean(c) is not None else '馬連払戻平均: —')


pairs=[]
with ThreadPoolExecutor(max_workers=8) as ex:
    futs=[ex.submit(load_pair,t,y) for t in TRACKS for y in YEARS]
    for f in as_completed(futs):pairs.append(f.result())

race_map={}; ok=[]; missing=[]
for track,year,rt,pt,err in sorted(pairs,key=lambda x:(x[1],x[0])):
    if err:
        missing.append((track,year,err)); continue
    parse_result(rt,race_map); ok.append((track,year,pt))
for track,year,pt in ok:parse_returns(pt,race_map)

rows=[r for r in race_map.values() if r['race_no'] in (9,10,11,12)]
r12=[r for r in rows if r['race_no']==12]
r911=[r for r in rows if r['race_no'] in (9,10,11)]

print('# 12R 完全ホールドアウト再検証')
print('発見期間: 2021-2025（このスクリプトでは不使用）')
print('検証期間: 2016-2020（固定）')
print('事前固定条件: 芝 / 12-16頭 / 1500-1800m または 2000m以上 / 12R vs 同条件9-11R')
print(f'取得成功: {len(ok)}/{len(TRACKS)*len(YEARS)} ファイル組 / 9-12R対象レース: {len(rows)}')
if missing:print('取得失敗:',[(t,y,e[:80]) for t,y,e in missing])

base=lambda r:r['surface']=='芝' and 12<=r['runners']<=16
c1500=lambda r:base(r) and r.get('distance') is not None and 1500<=r['distance']<=1800
c2000=lambda r:base(r) and r.get('distance') is not None and r['distance']>=2000

show('PRIMARY A: 芝・12-16頭・1500-1800m',[r for r in r12 if c1500(r)],[r for r in r911 if c1500(r)])
show('PRIMARY B: 芝・12-16頭・2000m以上',[r for r in r12 if c2000(r)],[r for r in r911 if c2000(r)])

# Pre-declared year-by-year stability check, not used to redefine the primary hypothesis.
print('\n## 年別安定性（方向確認のみ）')
for y in YEARS:
    ys=str(y)
    def same_year(r):
        # date may be YYYY/MM/DD or YYYY-MM-DD depending source; race IDs start with year.
        d=str(r.get('date',''))
        return d.startswith(ys)
    print(f'\n## {y}')
    show('1500-1800m',[r for r in r12 if c1500(r) and same_year(r)],[r for r in r911 if c1500(r) and same_year(r)])
    show('2000m以上',[r for r in r12 if c2000(r) and same_year(r)],[r for r in r911 if c2000(r) and same_year(r)])

print('\n## 判定ルール')
print('・2021-2025で見つけた方向が2016-2020でも同じなら「再現候補」。')
print('・95%CIが0をまたがなければ、単純な偶然だけでは説明しにくいシグナルとして扱う。')
print('・ただしこれは結果分布の検証であり、発走前オッズの割安を証明しない。')
print('・再現した条件だけを、次段階の発走前全馬連オッズを使う回収率検証へ進める。')
