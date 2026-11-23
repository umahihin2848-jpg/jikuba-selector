import unittest,sys,csv,math,json,pathlib
HERE=pathlib.Path(__file__).parent
sys.path.insert(0,str(HERE))
from analyze_all_courses import dt_lap, splits_for_distance, first_len, analyze_splits, wilson

class TestNationalLapAtlas(unittest.TestCase):
 def test_dates_normalized_without_lookahead(self):
  self.assertEqual(dt_lap('2026.10. 4'),20261004)
  self.assertEqual(dt_lap('2026. 1. 4'),20260104)
  with self.assertRaises(ValueError):dt_lap('2026.13.4')
  with self.assertRaises(ValueError):dt_lap('2026.2.30')
 def test_regular_1800(self):
  s,why=splits_for_distance('12.7-11.2-11.8-12.1-12.0-11.9-11.4-11.3-11.7',1800)
  self.assertIsNone(why); self.assertEqual(len(s),9)
  z=analyze_splits(s,1800)
  self.assertEqual(z['lull'],1);self.assertEqual(z['middle_n'],3)
 def test_1200_not_false_negative_lull(self):
  s,why=splits_for_distance('12.1-10.7-11.0-11.6-11.8-12.1',1200)
  self.assertIsNone(why);z=analyze_splits(s,1200)
  self.assertIsNone(z['lull']);self.assertEqual(z['middle_n'],0)
 def test_1400_one_mid_not_lull(self):
  s,why=splits_for_distance('12.5-10.7-11.0-11.9-11.2-11.5-12.4',1400)
  self.assertIsNone(why);self.assertIsNone(analyze_splits(s,1400)['lull'])
 def test_1000_uses_disjoint_final400(self):
  s,why=splits_for_distance('12.2-10.3-11.0-11.3-12.7',1000)
  self.assertIsNone(why);z=analyze_splits(s,1000)
  self.assertEqual(z['late_fractions'],2);self.assertAlmostEqual(z['late'],12.0);self.assertAlmostEqual(z['early'],10.65)
 def test_1500_short_first_100m(self):
  s,why=splits_for_distance('6.9-11.8-12.4-12.6-12.7-12.3-11.7-11.8',1500)
  self.assertIsNone(why);self.assertEqual(first_len(1500),100);self.assertIsNotNone(analyze_splits(s,1500)['lull'])
 def test_1150_short_first_150m(self):
  s,why=splits_for_distance('9.6-10.4-10.8-11.6-12.2-12.6',1150)
  self.assertIsNone(why);self.assertEqual(first_len(1150),150);self.assertIsNone(analyze_splits(s,1150)['lull'])
 def test_1700_and_2500_first_100m(self):
  s,why=splits_for_distance('6.9-10.4-12.2-12.9-12.6-11.8-12.1-11.9-12.2',1700)
  self.assertIsNone(why); self.assertEqual(len(s),9)
  s,why=splits_for_distance('7.1-11.6-12.2-12.5-12.3-12.9-12.8-13.0-12.3-11.4-11.8-11.9-12.4',2500)
  self.assertIsNone(why); self.assertEqual(len(s),13)
 def test_wrong_fraction_count_rejected(self):
  _,why=splits_for_distance('12.1-11.4-11.5',1800)
  self.assertEqual(why,'fraction_count')
 def test_anomalous_fraction_rejected(self):
  _,why=splits_for_distance('12.2-0.1-11.7-12.1-12.0-11.9',1200)
  self.assertEqual(why,'200m_fraction_outlier')
 def test_wilson_small_n_safe(self):
  self.assertEqual(wilson(0,0),(None,None))
  lo,hi=wilson(4,65)
  self.assertLess(lo,4/65);self.assertGreater(hi,4/65)
 def test_h008a_parity_and_national_coverage(self):
  d=json.loads((HERE/'summary.json').read_text(encoding='utf-8'))
  self.assertEqual(d['metadata']['clean_lap_races'],3925)
  self.assertEqual(d['metadata']['all_observed_course_profiles'],87)
  self.assertEqual(d['metadata']['venue_count'],10)
  m={x['profile']:x for x in d['courses']}
  for name,n,k in [('東京芝1800m',80,41),('中山芝1800m',65,4),('東京芝1600m',109,41),('中山芝1600m',126,19)]:
   self.assertEqual((m[name]['n'],m[name]['lull_hits']),(n,k))
  self.assertEqual(sum(x['n'] for x in d['courses']),3925)
  self.assertEqual(sum(x['n']>=20 for x in d['courses']),65)
 def test_curve_distance_integrity(self):
  d=json.loads((HERE/'summary.json').read_text(encoding='utf-8'))
  for x in d['mean_lap_curves']:
   n=x['n_segments'];self.assertEqual(x['first_segment_m']+(n-1)*200,x['distance'])
   self.assertTrue(all(math.isfinite(x['L'+str(i)]) for i in range(1,n+1)))

if __name__=='__main__':unittest.main()