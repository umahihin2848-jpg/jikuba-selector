import unittest,sys,pathlib
import numpy as np
import pandas as pd
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import h017_four_zone as h
import h017_rival_reserve as rr

class TestH017(unittest.TestCase):
 def test_four_band_boundaries(self):
  np.testing.assert_array_equal(h.zone_from_c4([1,4,5,8,9,12,13,16],[16]*8),[0,0,1,1,2,2,3,3])
 def test_variable_field_band(self):
  np.testing.assert_array_equal(h.zone_from_c4([3,4,6,7,9,10,12],[12]*7),[0,1,1,2,2,3,3])
 def test_zero_invalid(self):
  with self.assertRaises(ValueError):h.zone_from_c4([0],[16])
 def test_overflow_invalid(self):
  with self.assertRaises(ValueError):h.zone_from_c4([17],[16])
 def test_feature_list_excludes_hindsight(self):
  self.assertFalse(set(h.G+h.R+h.CATS+rr.CTX).intersection(h.FORBID))
 def test_race_budget(self):
  p=np.array([.2]*16+[.5]*12)
  ids=['a']*16+['b']*12
  got=h.race_budget_three(p,ids)
  self.assertTrue(np.all(np.isfinite(got)))
  self.assertTrue(np.all((got>0)&(got<1)))
  self.assertAlmostEqual(got[:16].sum(),3,6)
  self.assertAlmostEqual(got[16:].sum(),3,6)
 def test_leave_one_out_own_history(self):
  a=pd.DataFrame({'rid':['r']*3,'front_intent':[.5,.5,.5],'prior_hold':[.2,.4,.8],'prior_fade':[.5,.3,.1]})
  b=rr.add_rival(a)
  self.assertAlmostEqual(b.rival_front_hold.iloc[0],.6)
  self.assertAlmostEqual(b.rival_front_hold.iloc[1],.5)
  self.assertAlmostEqual(b.rival_front_hold.iloc[2],.3)
  self.assertAlmostEqual(b.rival_front_fade.iloc[0],.2)
  # Changing a horse's own data does not change its own LOO estimate.
  a.loc[0,'prior_hold']=.99;new=rr.add_rival(a)
  self.assertAlmostEqual(new.rival_front_hold.iloc[0],b.rival_front_hold.iloc[0])
 def test_straight_exclusion_and_race_integrity(self):
  z,meta=h.load_data()
  self.assertEqual(meta['excluded_straight_races'],49)
  self.assertEqual(meta['excluded_straight_horses'],796)
  self.assertEqual(meta['retained_profiles'],86)
  self.assertEqual(meta['retained_races'],3517)
  self.assertEqual(meta['retained_horses'],53587)
  self.assertFalse(((z.venue=='新潟')&(z.surface=='芝')&(z.distance==1000)).any())
  self.assertTrue((z.groupby('rid').top3.sum()==3).all())

if __name__=='__main__':unittest.main()