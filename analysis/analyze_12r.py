#!/usr/bin/env python3
import csv, io, math, statistics, urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE='https://raw.githubusercontent.com/keibamar/keiba_ai_ver2.0/master/data'
TRACKS=['01_sapporo','02_hakodate','03_fukushima','04_nigata','05_tokyo','06_nakayama','07_chukyo','08_kyoto','09_hanshin','10_kokura']
YEARS=range(2021,2026)

def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':'jikuba-selector-analysis'})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.read().decode('utf-8-sig')

def load_pair(track,year):
    ru=f'{BASE}/RaceResults/{track}/{year}_race_results.csv'
    pu=f'{BASE}/RaceReturns/{track}/{year}_race_returns.csv'
    try:
        rt=fetch(ru); pt=fetch(pu)
        return track,year,rt,pt,None
    except Exception as e:
        return track,year,None,None,str(e)

def to_num(s):
    try: return float(s)
    except: return None

def parse_result(text, race_map):
    rd=csv.DictReader(io.StringIO(text))
    for row in rd:
        rid=(row.get('') or '').strip()
        if not rid or not rid[-2:].isdigit(): continue
        rno=int(rid[-2:])
        rec=race_map.setdefault(rid,{'race_no':rno,'runners':0,'pops':{},'horses':{},'surface':row.get('race_type',''),'distance':to_num(row.get('course_len')),'class':row.get('class',''),'date':row.get('date','')})
        rec['runners']+=1
        try: finish=int(float(row.get('着順','')))
        except: finish=None
        if finish in (1,2):
            pop=to_num(row.get('人気'))
            horse=row.get('馬番','')
            rec['pops'][finish]=int(pop) if pop is not None else None
            rec['horses'][finish]=horse

def parse_returns(text, race_map):
    rd=csv.reader(io.StringIO(text))
    next(rd,None)
    for row in rd:
        if len(row)<5: continue
        rid=row[0].strip(); bet=row[1].strip()
        if bet!='馬連' or rid not in race_map: continue
        payout=to_num(row[3]); rank=to_num(row[4])
        race_map[rid]['quinella_payout']=payout
        race_map[rid]['quinella_rank']=int(rank) if rank is not None else None

def band(p):
    if p is None: return '欠損'
    if p<=4: return '1-4'
    if p<=9: return '5-9'
    return '10+'

def pair_band(a,b):
    x,y=band(a),band(b)
    order={'1-4':0,'5-9':1,'10+':2,'欠損':9}
    x,y=sorted((x,y),key=lambda z:order[z])
    return f'{x}×{y}'

def median(vals):
    vals=[v for v in vals if v is not None]
    return statistics.median(vals) if vals else None

def mean(vals):
    vals=[v for v in vals if v is not None]
    return statistics.mean(vals) if vals else None

def summarize(rows):
    rows=[r for r in rows if r.get('pops',{}).get(1) is not None and r.get('pops',{}).get(2) is not None]
    n=len(rows)
    c=Counter(pair_band(r['pops'][1],r['pops'][2]) for r in rows)
    payouts=[r.get('quinella_payout') for r in rows if r.get('quinella_payout') is not None]
    ranks=[r.get('quinella_rank') for r in rows if r.get('quinella_rank') is not None]
    maxp=[max(r['pops'][1],r['pops'][2]) for r in rows]
    return {
        'n':n,'bands':c,
        'top4_any':sum(1 for r in rows if min(r['pops'][1],r['pops'][2])<=4)/n if n else None,
        'both_top9':sum(1 for r in rows if max(r['pops'][1],r['pops'][2])<=9)/n if n else None,
        'both_top4':sum(1 for r in rows if max(r['pops'][1],r['pops'][2])<=4)/n if n else None,
        'median_max_pop':median(maxp),'mean_max_pop':mean(maxp),
        'median_payout':median(payouts),'mean_payout':mean(payouts),
        'payout_10k':sum(1 for x in payouts if x>=10000)/len(payouts) if payouts else None,
        'median_qrank':median(ranks),'mean_qrank':mean(ranks),
    }

def pct(x): return '—' if x is None else f'{100*x:.1f}%'
def num(x,d=1): return '—' if x is None else f'{x:.{d}f}'
def yen(x): return '—' if x is None else f'{x:,.0f}円'

def show_summary(label,s):
    print(f'\n### {label}')
    print(f'n={s["n"]} / 両方1-4人気 {pct(s["both_top4"])} / 少なくとも片方1-4人気 {pct(s["top4_any"])} / 両方9人気以内 {pct(s["both_top9"])}')
    print(f'馬連払戻 中央値 {yen(s["median_payout"])} / 平均 {yen(s["mean_payout"])} / 万馬券率 {pct(s["payout_10k"])} / 的中馬連人気中央値 {num(s["median_qrank"])}位')
    total=s['n'] or 1
    for k in ['1-4×1-4','1-4×5-9','1-4×10+','5-9×5-9','5-9×10+','10+×10+']:
        print(f'{k}: {s["bands"].get(k,0):4d} ({100*s["bands"].get(k,0)/total:5.1f}%)')

pairs=[]
with ThreadPoolExecutor(max_workers=8) as ex:
    futs=[ex.submit(load_pair,t,y) for t in TRACKS for y in YEARS]
    for f in as_completed(futs): pairs.append(f.result())

race_map={}; ok=[]; missing=[]
for track,year,rt,pt,err in sorted(pairs,key=lambda x:(x[1],x[0])):
    if err: missing.append((track,year,err)); continue
    parse_result(rt,race_map); ok.append((track,year,pt))
for track,year,pt in ok: parse_returns(pt,race_map)
rows=list(race_map.values())
rows=[r for r in rows if r['race_no'] in (9,10,11,12)]
print('# JRA 12R vs 9-11R 人気帯・馬連払戻 集計')
print('対象年: 2021-2025 / 10競馬場 / 平地・障害を含む元データから9-12Rを抽出')
print(f'取得成功: {len(ok)}/{len(TRACKS)*len(YEARS)} ファイル組 / 対象レース: {len(rows)}')
if missing:
    print('取得失敗:',[(t,y,e[:70]) for t,y,e in missing])

r12=[r for r in rows if r['race_no']==12]
r911=[r for r in rows if r['race_no'] in (9,10,11)]
show_summary('12R 全体',summarize(r12))
show_summary('9-11R 全体',summarize(r911))

print('\n## 12〜16頭に限定')
show_summary('12R 12〜16頭',summarize([r for r in r12 if 12<=r['runners']<=16]))
show_summary('9-11R 12〜16頭',summarize([r for r in r911 if 12<=r['runners']<=16]))

print('\n## 芝・ダート別')
for surf in ['芝','ダート']:
    show_summary(f'12R {surf}',summarize([r for r in r12 if r['surface']==surf]))
    show_summary(f'9-11R {surf}',summarize([r for r in r911 if r['surface']==surf]))

print('\n## 12R 年別')
for y in YEARS:
    ys=[r for rid,r in race_map.items() if rid.startswith(str(y)) and r['race_no']==12]
    show_summary(str(y),summarize(ys))

print('\n## 12R 人気帯の9-11Rとの差（pt）')
s12=summarize(r12); s9=summarize(r911)
for k in ['1-4×1-4','1-4×5-9','1-4×10+','5-9×5-9','5-9×10+','10+×10+']:
    a=s12['bands'].get(k,0)/(s12['n'] or 1); b=s9['bands'].get(k,0)/(s9['n'] or 1)
    print(f'{k}: {(a-b)*100:+.2f}pt')
print(f'万馬券率: {(s12["payout_10k"]-s9["payout_10k"])*100:+.2f}pt' if s12['payout_10k'] is not None and s9['payout_10k'] is not None else '万馬券率: —')
print('\n注: これは実際の1-2着人気と的中馬連払戻の分布比較。全組合せの発走前馬連オッズを含まないため、「人気薄が過剰購入された」こと自体を直接証明する集計ではありません。')
