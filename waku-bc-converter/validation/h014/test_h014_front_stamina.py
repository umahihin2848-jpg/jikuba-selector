import unittest
import numpy as np
import pandas as pd
from h014_front_stamina import prior_features,bin_pace

class H014Tests(unittest.TestCase):
 def row(self,name='A',date=20250101,surface='芝',distance=1600):
  return {'name':name,'date':date,'surface':surface,'distance':distance}
 def old(self,dt,c4,fin,surface='芝',dist=1600):
  return {'date':dt,'rid':str(dt)+'00101010','芝・ダート':surface,'距離':dist,
          'pos4':c4,'front4':float(c4<=.25),'fade':(fin-1)/15,'late_gap':1.1,'確定着順':fin}
 def test_same_day_excluded(self):
  f=prior_features(self.row(),{'A':[self.old(20250101,.1,1),self.old(20241231,.3,4)]})
  self.assertEqual(f['nold'],1)
  self.assertAlmostEqual(f['prior4'],.3)
 def test_future_date_excluded(self):
  f=prior_features(self.row(),{'A':[self.old(20260101,.1,1),self.old(20230101,.7,9)]})
  self.assertEqual(f['nold'],1);self.assertAlmostEqual(f['prior4'],.7)
 def test_surface_mismatch_excluded(self):
  f=prior_features(self.row(),{'A':[self.old(20241231,.1,1,'ダ'),self.old(20231231,.6,7)]})
  self.assertEqual(f['nold'],1);self.assertAlmostEqual(f['prior4'],.6)
 def test_empty_default(self):
  f=prior_features(self.row(),{})
  self.assertEqual(f['nold'],0);self.assertEqual(f['nfront'],0);self.assertAlmostEqual(f['prior_hold'],.45);self.assertAlmostEqual(f['prior_top3'],.2)
 def test_prior_front_survival_higher_if_own_past_front_top3(self):
  a=prior_features(self.row(),{'A':[self.old(20241231,.1,1),self.old(20231231,.13,2)]})
  b=prior_features(self.row(),{'A':[self.old(20241231,.1,12),self.old(20231231,.13,14)]})
  self.assertGreater(a['prior_hold'],b['prior_hold'])
 def test_front_intent_increases_with_more_front_position(self):
  a=prior_features(self.row(),{'A':[self.old(20231231,.1,1)]})
  b=prior_features(self.row(),{'A':[self.old(20231231,.8,1)]})
  self.assertGreater(a['front_intent'],b['front_intent'])
 def test_course_pace_reference_fitted_before_2024(self):
  rows=[]
  for i in range(25):rows.append({'profile':'東京芝1600m','surface':'芝','year':2020,'rid':f'tr{i}','early2':11.+.01*(i%3)})
  rows.append({'profile':'東京芝1600m','surface':'芝','year':2025,'rid':'holdout','early2':10.0})
  x=bin_pace(pd.DataFrame(rows));r=x[x.rid=='holdout'].iloc[0]
  self.assertTrue(r.stress_high)
  self.assertGreater(r.early_z,1.0)
 def test_current_horse_position_not_used_in_prior_features(self):
  a=self.row();a.update({'c4':1,'top3':1,'actual_lap':9.,'finish':1})
  b=self.row();b.update({'c4':16,'top3':0,'actual_lap':14.,'finish':15})
  history={'A':[self.old(20240201,.2,5)]}
  self.assertEqual(prior_features(a,history),prior_features(b,history))

if __name__=='__main__':unittest.main()