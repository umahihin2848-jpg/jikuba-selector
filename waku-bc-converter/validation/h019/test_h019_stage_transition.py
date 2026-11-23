import unittest, numpy as np, pandas as pd
from h019_stage_transition import extract_hist, feature_array, budget3, top3_hits, load_target
from prepare_h019_history import prepare

class H019Tests(unittest.TestCase):
 def test_exact_dataset_race_no_name_complete(self):
  d=load_target();self.assertEqual((len(d),d.rid.nunique()),(14876,977))
 def test_flags_203_10(self):
  d=load_target();self.assertEqual(int(d.h018_flag.sum()),203);self.assertEqual(int(d.loc[d.h018_flag.eq(1),'top3'].sum()),10)
 def test_corner_order_positive(self):
  d=load_target();self.assertTrue(((d['通過順3']>0)&(d['通過順4']>0)).all())
 def test_history_current_same_day_and_future_excluded(self):
  hh=pd.DataFrame({'date':[20240101,20240103,20240104,20240105], '芝・ダート':['芝']*4,'rid16':['a','b','c','d']})
  past=extract_hist(hh,'X',20240104,'芝');self.assertEqual(past.date.tolist(),[20240103,20240101])
 def test_history_surface_fence(self):
  hh=pd.DataFrame({'date':[20240101,20240102,20240103],'芝・ダート':['芝','ダ','芝'],'rid16':['a','b','c']})
  past=extract_hist(hh,'X',20240104,'芝');self.assertEqual(past.date.tolist(),[20240103,20240101])
 def test_max_prior5(self):
  hh=pd.DataFrame({'date':list(range(20230101,20230108)),'芝・ダート':['芝']*7,'rid16':list('abcdefg')})
  self.assertEqual(len(extract_hist(hh,'X',20240101,'芝')),5)
 def test_budget_exactly_three(self):
  d=pd.DataFrame({'rid':['a']*12+['b']*18});p=np.full(30,.12)
  out=budget3(d,p);self.assertAlmostEqual(out[:12].sum(),3,places=8);self.assertAlmostEqual(out[12:].sum(),3,places=8)
 def test_imputation_not_label_dependent(self):
  d=pd.DataFrame({'pre':[1.,np.nan,3.], 'top3':[1,0,0]});a,m=feature_array(d,['pre'])
  d['top3']=1-d.top3;b,n=feature_array(d,['pre']);self.assertTrue(np.array_equal(a,b))
 def test_history_dates_id_match_and_dedup(self):
  t=pd.DataFrame({'馬名':['a','a','a','b'],'日付':['2024. 1. 3','2024. 1. 3','2024. 1. 3','2024. 1. 5'],'レースID(新・馬番無16桁)':['2024010301010101','2024010301010101','2024010401010101','2024010501010101'],'出走頭数':[12]*4,'通過3':[8]*4,'通過4':[6]*4,'確定着順':[3]*4,'上り3F':[34.5]*4,'R最速上3F':[34]*4,'距離':[1600]*4,'芝・ダート':['芝']*4,'通過1':[0]*4,'通過2':[0]*4,'異常コード':[0]*4,'レースPCI':[52]*4,' PCI':[55]*4})
  import tempfile,pathlib
  with tempfile.TemporaryDirectory() as td:
   p=pathlib.Path(td)/'t.csv';t.to_csv(p,index=False,encoding='cp932');h=prepare(p)
  self.assertEqual(len(h),2)
 def test_data_market_3rd_only_evaluation(self):
  d=load_target();self.assertTrue(np.allclose(d.groupby('rid').q.sum().to_numpy(),3,atol=1e-8))

if __name__=='__main__':unittest.main()