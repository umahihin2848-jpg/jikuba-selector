#!/usr/bin/env python3
"""Verify H020 scores from stored strictly-asof features, without raw TARGET 280MB."""
import pathlib,json
import numpy as np,pandas as pd
import h020_asof_rescue as h
BASE=pathlib.Path(__file__).resolve().parent

def main():
 d=pd.read_csv(BASE/'H020_TRAIN_TEST_ASOF_FEATURES_PRIVATE.csv',encoding='utf-8-sig')
 d=d.sort_values(['rid','no']).reset_index(drop=True)
 tr=d[d.year==2024].copy();te=d[d.year>=2025].copy()
 scores={}
 for name,cols in h.VARIANTS.items():
  p,_,_=h.fit_predict(tr,te,cols)
  scores[name]=h.score(te,p)
 ref=json.loads((BASE/'H020_RESULTS.json').read_text(encoding='utf-8'))['metrics']
 for k,v in scores.items():
  assert abs(v['brier']-ref[k]['brier'])<1e-9,(k,v,ref[k])
  assert v['top3_hits']==ref[k]['top3_hits'],(k,v,ref[k])
 assert len(te)==9464 and te.rid.nunique()==621
 print('H020 cached verification PASS: 6 variants × 621R × 9464 runners')
 return scores

if __name__=='__main__':main()