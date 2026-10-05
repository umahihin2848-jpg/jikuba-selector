#!/usr/bin/env python3
"""Exploratory follow-up for 12R: where does the turf/final-race effect concentrate?"""
import math
from collections import Counter
import analyze_12r as b

TRACK_NAMES={'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'}

def usable(rows):
    return [r for r in rows if r.get('pops',{}).get(1) is not None and r.get('pops',{}).get(2) is not None]

def prop(rows, kind):
    rs=usable(rows); n=len(rs)
    if not n: return 0,0,None
    if kind=='top4x10':
        k=sum(1 for r in rs if b.pair_band(r['pops'][1],r['pops'][2])=='1-4×10+')
    elif kind=='both_top4':
        k=sum(1 for r in rs if max(r['pops'][1],r['pops'][2])<=4)
    elif kind=='both_top9':
        k=sum(1 for r in rs if max(r['pops'][1],r['pops'][2])<=9)
    elif kind=='payout10k':
        rs=[r for r in rs if r.get('quinella_payout') is not None]; n=len(rs)
        k=sum(1 for r in rs if r['quinella_payout']>=10000)
    else: raise ValueError(kind)
    return k,n,k/n if n else None

def diff_ci(a,c,kind):
    k1,n1,p1=prop(a,kind); k0,n0,p0=prop(c,kind)
    if not n1 or not n0: return None
    d=p1-p0
    se=math.sqrt(p1*(1-p1)/n1+p0*(1-p0)/n0)
    return d,d-1.96*se,d+1.96*se,n1,n0,p1,p0

def fmt_ci(x):
    if x is None:return '—'
    d,lo,hi,n1,n0,p1,p0=x
    return f'12R {p1*100:.1f}% vs 9-11R {p0*100:.1f}% | 差 {d*100:+.2f}pt (95%CI {lo*100:+.2f}〜{hi*100:+.2f}) | n={n1}/{n0}'

def medpay(rows):
    return b.summarize(rows)['median_payout']

def compare(label,a,c):
    sa,sc=b.summarize(a),b.summarize(c)
    if sa['n']<25 or sc['n']<25:return
    print(f'\n### {label}')
    print(f'n: 12R {sa["n"]} / 9-11R {sc["n"]}')
    print('上位4×10人気以下:',fmt_ci(diff_ci(a,c,'top4x10')))
    print('上位4同士:',fmt_ci(diff_ci(a,c,'both_top4')))
    print('9人気以内同士:',fmt_ci(diff_ci(a,c,'both_top9')))
    print('万馬券率:',fmt_ci(diff_ci(a,c,'payout10k')))
    print(f'馬連中央値: 12R {b.yen(sa["median_payout"])} / 9-11R {b.yen(sc["median_payout"])}')

allrows=list(b.race_map.values())
r12=[r for r in allrows if r['race_no']==12]
r911=[r for r in allrows if r['race_no'] in (9,10,11)]

# Primary controlled sample: turf, 12-16 runners.
T=lambda r:r['surface']=='芝' and 12<=r['runners']<=16
r12t=[r for r in r12 if T(r)]
r911t=[r for r in r911 if T(r)]
print('\n\n# 12R 深掘り: 芝 × 12〜16頭を中心に比較')
print('探索的分析。多数の部分集団を後から見るため、95%CIは「候補抽出用」であって確証ではありません。')
compare('芝・12〜16頭（主比較）',r12t,r911t)

# Distance buckets; keep broad enough to avoid tiny samples.
def dist_bucket(r):
    d=r.get('distance')
    if d is None:return '不明'
    if d<=1400:return '1200-1400'
    if d<=1800:return '1500-1800'
    return '2000+'
print('\n## 距離帯別：芝・12〜16頭')
for bucket in ['1200-1400','1500-1800','2000+']:
    compare(bucket,[r for r in r12t if dist_bucket(r)==bucket],[r for r in r911t if dist_bucket(r)==bucket])

# Exact class labels in the source; only compare categories with useful sample in both groups.
print('\n## クラス別：芝・12〜16頭')
classes=sorted(set(r.get('class','') for r in r12t+r911t))
for cls in classes:
    a=[r for r in r12t if r.get('class','')==cls]
    c=[r for r in r911t if r.get('class','')==cls]
    if len(usable(a))>=30 and len(usable(c))>=30:
        compare(cls or 'クラス空欄',a,c)

# Venue comparison on turf 12-16.
print('\n## 競馬場別：芝・12〜16頭')
def venue(r):
    # Race ID format YYYYTT...; TT is track code.
    rid=next((rid for rid,x in b.race_map.items() if x is r),None)
    return TRACK_NAMES.get(rid[4:6],'不明') if rid else '不明'
# Build id lookup once to avoid repeated identity scans.
id_by_obj={id(v):k for k,v in b.race_map.items()}
def v2(r):
    rid=id_by_obj.get(id(r),'')
    return TRACK_NAMES.get(rid[4:6],'不明') if len(rid)>=6 else '不明'
for vn in TRACK_NAMES.values():
    a=[r for r in r12t if v2(r)==vn]; c=[r for r in r911t if v2(r)==vn]
    if len(usable(a))>=25 and len(usable(c))>=25:
        compare(vn,a,c)

# Stability: primary turf 12-16 effect by year.
print('\n## 年別安定性：芝・12〜16頭')
def yr(r):
    rid=id_by_obj.get(id(r),'')
    return rid[:4]
for y in map(str,b.YEARS):
    a=[r for r in r12t if yr(r)==y]; c=[r for r in r911t if yr(r)==y]
    compare(y,a,c)

print('\n## 読み方')
print('・「差」が複数年/複数条件で同じ方向なら再現性候補。単一セルだけ大きい場合は偶然の可能性が高い。')
print('・この分析は実着順人気と的中馬連払戻の比較であり、発走前の全馬連オッズがないため、割安/過剰購入を直接測定してはいない。')
print('・実際の歪み検証は、アプリで保存する発走前スナップショット（単勝・枠連・馬連全候補）と実結果を結びつける前向き検証が必要。')
