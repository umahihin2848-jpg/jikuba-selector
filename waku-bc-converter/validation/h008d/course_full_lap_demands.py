#!/usr/bin/env python3
"""Descriptive 87 observed track×surface×distance profiles, full-lap decomposition.
H008-C end-race average lap data -> requirement side only; not target as-of input.
"""
import csv,collections,pathlib,sys,statistics
SRC=pathlib.Path('/mnt/data/H008C_全国全コースラップ分析_20261123/全87コース_平均区間ラップ_横.csv')
OUTPUT=pathlib.Path('/mnt/data/h008d_full_lap_fit/H008D_87コース_全ラップ要求分解.csv')
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from h008d_full_lap_fit import lap_signature
headers=['コース','競馬場','芝ダ','距離m','対象レース数','最初の区間m','最初の区間秒','序盤2F平均秒','中盤平均秒','最後4F平均秒','最後4F最速秒','最後4F最大加速秒','最後4FばらつきSD','最後200m減速秒','ラップ間変化量秒','8段階全ラップ形状','注記']
rows=[]
for r in csv.DictReader(open(SRC,encoding='utf-8-sig',newline='')):
    dist=int(r['distance']);n=int(r['n']);stage=[float(r[f'L{i}']) for i in range(1,int(r['n_segments'])+1)];
    info=lap_signature('-'.join(str(x) for x in stage),dist)
    if not info:raise ValueError('profile invalid '+r['profile'])
    mov=stage[1:];mid=mov[2:-3]
    row=dict(zip(headers,[r['profile'],r['venue'],r['surface'],dist,n,int(r['first_segment_m']),round(stage[0],3),
       round(statistics.mean(mov[:2]),3),round(statistics.mean(mid),3) if mid else '',
       round(statistics.mean(stage[-4:]),3),round(min(stage[-4:]),3),
       round(max(max(0,stage[i-1]-stage[i]) for i in range(len(stage)-3,len(stage))),3),
       round(statistics.pstdev(stage[-4:]),3),round(stage[-1]-statistics.mean(stage[-3:-1]),3),
       round(statistics.mean(abs(mov[i]-mov[i-1]) for i in range(1,len(mov))),3),
       '|'.join(f'{x:.2f}' for x in info['shape']),
       'これはレース全体の平均ラップから作った要求側の代理指標。個体の実測速度ではない。20R未満は参考値。' if n>=20 else '極少数・参考値。個体の能力ではない。']))
    rows.append(row)
assert len(rows)==87
with open(OUTPUT,'w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=headers);w.writeheader();w.writerows(rows)
print('rows',len(rows),'output',OUTPUT)
for x in rows:
 if x['コース'] in ('東京芝1800m','中山芝1800m','阪神芝1600m','東京芝2400m','中山ダ1800m'):
  print(x['コース'],{k:x[k] for k in headers[6:15]})