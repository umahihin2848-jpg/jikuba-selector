#!/usr/bin/env python3
"""Rebuild a date-frozen, all-JRA network snapshot for automatic Ability V3.

Usage:
    python research/ability_v3/build_network_snapshot.py \
      --history 2026_2025_seiseki.csv 2026seiseki.csv \
      --cutoff 2026-10-05 --out waku-bc-converter/data/ability_v3_network_snapshot_20261004.json

Do not use results at/after cutoff. Snapshot V3 compute only supports target
races after last recorded race day. Model coefficient per prediction year is
separate in ability_v3_research_models_2026.json; re-train for later years.
"""
import argparse, sys, json
from pathlib import Path
import numpy as np
import pandas as pd
this=Path(__file__).resolve().parent
sys.path.insert(0,str(this))
from export_v3_pre_race import load_history, run_network

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--history',nargs='+',type=Path,required=True)
 p.add_argument('--cutoff',type=str,required=True,help='Exclusive YYYY-MM-DD')
 p.add_argument('--out',type=Path,required=True)
 a=p.parse_args();cutoff=pd.Timestamp(a.cutoff)
 groups=load_history(a.history,cutoff)
 if not groups:raise SystemExit('No eligible races')
 _,_,fits,_=run_network({day:g for day,g in groups.items() if day.year<=2021},730,collect_fit=True)
 if len(fits)<100:raise SystemExit('Insufficient 2016–2021 baseline')
 X,y=fits[:,:6],fits[:,6]
 coefs=np.linalg.solve(X.T@X+100*np.eye(6),X.T@y)
 state,hist,_,_=run_network(groups,730,coef=coefs)
 birth={}
 for day,races in groups.items():
  for _,g in races:
   surf=g.surf.iloc[0]
   for name,age in zip(g.name,g.age):
    if pd.notna(age):birth[(name,surf)]=int(day.year-int(age))
 recent=max(groups)-pd.Timedelta(days=733)
 rows=[]
 for (name,surf),(m,v,n,last) in sorted(state.items()):
  obs=[[int(day.strftime('%Y%m%d')),int(dist),round(float(value),7)] for day,dist,value in hist.get((name,surf),[]) if day>=recent]
  rows.append([name,surf,int(last.strftime('%Y%m%d')),round(float(m),8),round(float(v),8),int(n),obs,birth.get((name,surf))])
 out={'version':'P3-30-v1','cutoff_date':max(groups).strftime('%Y-%m-%d'),'half_life_days':730,'coef':list(map(float,coefs)),'rows':rows}
 a.out.parent.mkdir(parents=True,exist_ok=True)
 a.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print(f'Snapshot {a.out}; {len(rows)} horse/surface profiles; {out["cutoff_date"]}; {sum(len(x[6]) for x in rows)} recent observations')

if __name__=='__main__':main()
