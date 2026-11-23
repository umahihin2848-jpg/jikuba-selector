"""H005 synthetic guards: fixed model, strict history as-of, no outcomes as predictors."""
import unittest
from h005_depth_m3_shadow import F,B,SD,core_m3,predgap,decayed,horse_row

class H005(unittest.TestCase):
 def setUp(self):
  self.t={'rid':'20261124_東京_11','date':'20261124','year':2026,'name':'サンプル馬','no':8,'n':16,'surface':'芝','distance':1600,'fin':2,'pop':5}
  self.hist=[]
  for i in range(12):
   # Need dates before target, plus one current/future observation
   self.hist.append({'date':f'2026{(10-i//28):02d}{28-i%28:02d}', 'rid':f'R{i:015d}', 'surface':'芝' if i%3 else 'ダ', 'dist':1600,
                     'n':16,'front':(i+1)/16,'gap':i/10,'last3':35.5+i*.05,'pci':50.0+i/10,'rpci':49.0+i/10})
 def test_race_outcome_not_a_model_input(self):
  a=horse_row(self.t,{'サンプル馬':self.hist})
  b=horse_row({**self.t,'fin':12,'pop':12},{'サンプル馬':self.hist})
  self.assertEqual(a['pg'],b['pg']);self.assertEqual(a['score'],b['score'])
 def test_future_and_same_day_history_never_used(self):
  a=horse_row(self.t,{'サンプル馬':self.hist})
  extra={'date':'20261125','rid':'future','surface':'芝','dist':1600,'n':16,'front':1.0,'gap':5.0,'last3':45.,'pci':50.,'rpci':50.}
  same={**extra,'date':'20261124','rid':'samestart'}
  b=horse_row(self.t,{'サンプル馬':[extra,same]+self.hist})
  self.assertEqual(a['score'],b['score'])
 def test_five_vs_ten_equal_if_only_five_starts(self):
  a=horse_row(self.t,{'サンプル馬':self.hist[:5]})
  self.assertAlmostEqual(a['pg']['all5_decay'],a['pg']['all10_decay'],14)
 def test_model_only_predgap_changed(self):
  a=horse_row(self.t,{'サンプル馬':self.hist})
  dx=a['pg']['all10_decay']-a['pg']['all5_decay'];dy=a['score']['all10_decay']-a['score']['all5_decay']
  self.assertAlmostEqual(dy,dx*(1-B[0]/SD[0]),12)
 def test_weighted_mean(self):
  self.assertAlmostEqual(decayed([0,10],2,.5),10/3)
  self.assertEqual(len(F),19)
 def test_old_zero_history_fallback_does_not_leak_future(self):
  a=horse_row(self.t,{'サンプル馬':[]})
  self.assertEqual(a['n_gap_all'],0)
  self.assertAlmostEqual(a['pg']['all5_decay'],a['pg']['all10_decay'],12)

if __name__=='__main__':unittest.main()