#!/usr/bin/env python3
"""Regenerate H019 distinct horse history from user-supplied TARGET umadete.csv.
Strict 16-digit RID date match; date, same-horse same-race dedup. Only prior runs
are used at prediction time by h019_stage_transition.py. No current race leakage.
"""
import pathlib
import pandas as pd
import numpy as np
ROOT=pathlib.Path('/mnt/data')
COLS=['馬名','日付','レースID(新・馬番無16桁)','芝・ダート','距離','出走頭数','通過1','通過2','通過3','通過4','確定着順','異常コード','上り3F','R最速上3F','レースPCI',' PCI']

def prepare(path=ROOT/'umadete.csv'):
 h=pd.read_csv(path,encoding='cp932',usecols=COLS,low_memory=False)
 h['name']=h['馬名'].astype(str).str.strip()
 h['rid16']=h['レースID(新・馬番無16桁)'].astype(str).str.extract(r'^(\d{16})$')[0]
 bits=h['日付'].astype(str).str.extract(r'^\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*$')
 h['date']=(pd.to_numeric(bits[0],errors='coerce')*10000+pd.to_numeric(bits[1],errors='coerce')*100+pd.to_numeric(bits[2],errors='coerce')).astype('Int64')
 h=h[h.rid16.notna()&(h.date.astype(str)==h.rid16.str[:8])].copy()
 for c in ['出走頭数','通過3','通過4','確定着順','上り3F','R最速上3F']:
  h[c]=pd.to_numeric(h[c],errors='coerce')
 h=h[(h['出走頭数']>=8)&h['通過3'].between(1,h['出走頭数'])&h['通過4'].between(1,h['出走頭数'])]
 h=h.sort_values(['name','date','rid16']).drop_duplicates(['name','rid16'],keep='first').copy()
 h['move34']=(h['通過3']-h['通過4'])/(h['出走頭数']-1)
 h['push34']=(h['通過3']-h['通過4'])>=2
 h['c3frac']=h['通過3']/h['出走頭数'];h['c4frac']=h['通過4']/h['出走頭数']
 h['move3F']=(h['通過3']-h['確定着順'])/(h['出走頭数']-1)
 h['time3f_delta']=h['上り3F']-h['R最速上3F']
 return h
if __name__=='__main__':
 h=prepare();out=ROOT/'h019_history_clean.pkl';h.to_pickle(out)
 print(f'Validated unique horse-runs: {len(h):,}, horses: {h.name.nunique():,}. Local private pickle: {out}')