#!/usr/bin/env python3
"""Rebuild private as-of historical 4C source from user's TARGET CSV. Do not publish output.
Requires local /mnt/data/umadete.csv (CP932). Deduplicates horse+16-digit race ID.
"""
from __future__ import annotations
import csv,collections,datetime,os,pickle,pathlib,re
ROOT=pathlib.Path(os.getenv('RACE_DATA_DIR','/mnt/data'))
OUT=ROOT/'H012_全国4角と全ラップ_20261123'

def normalize_date(text):
    m=re.match(r'^\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})\s*$',str(text))
    if not m:return None
    try:d=datetime.date(*map(int,m.groups()))
    except ValueError:return None
    return d.strftime('%Y%m%d')

def prepare_history(src=None,dest=None):
    src=pathlib.Path(src or ROOT/'umadete.csv');dest=pathlib.Path(dest or OUT/'h012_history_private.pkl');dest.parent.mkdir(parents=True,exist_ok=True)
    rows={};counts=collections.Counter()
    need=['馬名','レースID(新・馬番無16桁)','芝・ダート','距離','出走頭数','通過4','異常コード','場所']
    with src.open(encoding='cp932',newline='') as f:
        for row in csv.DictReader(f):
            counts['original_rows']+=1
            rid=str(row.get('レースID(新・馬番無16桁)','')).strip()
            date=normalize_date(row.get('日付'))
            name=str(row.get('馬名','')).strip()
            if not name or len(rid)!=16 or not rid.isdigit() or date is None:
                counts['invalid_name_rid_or_date']+=1;continue
            if rid[:8]!=date:
                counts['rid_date_mismatch']+=1;continue
            key=(name,rid)
            if key in rows:counts['duplicate_same_horse_race']+=1;continue
            out={k:str(row.get(k,'')).strip() for k in need};out['date']=f'{date[:4]}-{date[4:6]}-{date[6:8]}'
            rows[key]=out
    with dest.open('wb') as f:pickle.dump(list(rows.values()),f,protocol=5)
    counts['valid_unique_rows']=len(rows)
    return dict(counts)

if __name__=='__main__':print(prepare_history())