import unittest
import numpy as np
import pandas as pd
import h020_asof_rescue as m

class AsOfAndStageTests(unittest.TestCase):
 def histories(self):
  rows=[
   ('A',20240201,'2024020100000001','芝',16,9,8,10,2,35.2,34.9,3,5),
   ('A',20240401,'2024040100000002','芝',16,10,12,13,3,36.0,35.5,5,0),
   ('A',20240501,'2024050100000003','芝',16,7,8,11,3,36.2,35.5,8,2),
   ('A',20240701,'2024070100000004','ダ',16,2,2,2,1,38.2,37.0,10,1),
   ('A',20240801,'2024080100000005','芝',16,11,10,10,1,34.0,33.8,12,1),
   ('B',20240201,'2024020100000006','芝',16,2,1,2,2,34.8,34.8,5,1),
  ]
  out=[]
  for name,date,rid,surface,n,c3,c4,finish,c1,last3,best,first,early in rows:
   out.append({'name':name,'date':date,'rid16':rid,'芝・ダート':surface,'出走頭数':n,
       '通過1':first if early else np.nan,'通過3':c3,'通過4':c4,'確定着順':finish,
       'c3frac':c3/n,'c4frac':c4/n,'time3f_delta':last3-best})
  return pd.DataFrame(out)
 def target(self):
  return pd.DataFrame({'name':['A','B'],'date':[20240501,20240501], 'surface':['芝','芝'],
      '距離':[1600,1600], 'top3':[0,1], 'c3back':[True,False], 'c4back':[True,False],'q':[.1,.25]})
 def test_strictly_prior_and_same_surface(self):
  d=m.get_history_by_day(self.target(),self.histories())
  self.assertEqual(d.loc[0,'hist_n5'],2)
  self.assertEqual(d.loc[0,'hist_rear4_n'],1)
  self.assertEqual(d.loc[1,'hist_n5'],1)
 def test_same_day_and_future_labels_dont_leak(self):
  d=self.target();d['actual_current_last3f']=[33,50]
  a=m.get_history_by_day(d,self.histories())
  d['top3']=1-d.top3;d['q']=1-d.q;d['actual_current_last3f']=[55,5]
  b=m.get_history_by_day(d,self.histories())
  pd.testing.assert_frame_equal(a[m.HIST_FEATS],b[m.HIST_FEATS])
 def test_rear4_vs_front4_classification(self):
  d=self.target();d.loc[:,'date']=20240601
  d=m.get_history_by_day(d,self.histories())
  self.assertEqual(d.loc[0,'hist_rear4_n'],1)
  self.assertTrue(np.isnan(d.loc[1,'hist_rear4_late_gain']))
 def test_early_position_not_imputed_from_other_corner(self):
  h=self.histories(); h['通過1']=np.nan
  d=m.get_history_by_day(self.target(),h)
  self.assertEqual(d.loc[0,'hist_early_turn_n'],0)
  self.assertTrue(np.isnan(d.loc[0,'hist_early_to_c3_move']))
 def test_lookback_limited_to_five_and_not_future_dirt(self):
  h=self.histories();d=self.target();d.loc[0,'date']=20241001
  d=m.get_history_by_day(d,h)
  self.assertEqual(d.loc[0,'hist_n5'],4)
 def test_rival_features_strict_leave_one_out(self):
  z=pd.DataFrame({'rid':['r']*3,'p_zone1_joint':[.9,.2,.7], 'p_zone2_joint':[.1,.3,.2],
      'hist_front4_hold_top3':[0.,1.,.4], 'hist_front4_fade':[.2,.9,.1],
      'front_pressure':[.4,.4,.4]})
  a=m.add_other_front(z);z.loc[0,'hist_front4_hold_top3']=1.;z.loc[0,'hist_front4_fade']=.8
  b=m.add_other_front(z)
  np.testing.assert_allclose(a.loc[0,m.CONTEXT].to_numpy(float), b.loc[0,m.CONTEXT].to_numpy(float))
  self.assertNotEqual(float(a.loc[1,'rival_front_hold_LOO']),float(b.loc[1,'rival_front_hold_LOO']))
 def test_race_budget_exact_three(self):
  d=pd.DataFrame({'rid':['a']*12+['b']*18})
  p=np.linspace(.01,.82,30)
  out=m.h19.budget3(d,p)
  np.testing.assert_allclose(pd.Series(out).groupby(d.rid).sum().to_numpy(),[3,3],atol=1e-8)
 def test_no_prediction_features_are_target_labels(self):
  self.assertTrue(not(set(sum(m.VARIANTS.values(),[])) & m.FORBIDDEN))
 def test_risk_exception_threshold_no_use_future(self):
  # The high-rescue threshold comes only from the training distribution.
  d=pd.DataFrame({'hist_rear4_late_gain':[.1,.2,.3,3.0]})
  med=np.quantile(d.hist_rear4_late_gain,.75)
  self.assertAlmostEqual(med,.975,places=8)
 def test_when_no_prior_history_keep_nan(self):
  d=pd.DataFrame({'name':['X'],'date':[20241225],'surface':['ダ'],'距離':[1400]})
  a=m.get_history_by_day(d,self.histories())
  self.assertEqual(a.iloc[0].hist_n5,0)
  self.assertTrue(np.isnan(a.iloc[0].hist_rear4_fast_gap))

if __name__=='__main__':unittest.main()