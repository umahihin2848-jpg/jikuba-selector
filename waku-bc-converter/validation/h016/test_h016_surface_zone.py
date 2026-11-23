import unittest,json
from pathlib import Path
import pandas as pd
from h016_surface_zone_audit import group_metrics,paired_surface_ci
ROOT=Path(__file__).parent
D=json.loads((ROOT/'H016_surface_zone_results.json').read_text())
class TestH016(unittest.TestCase):
 def test_coverage(self):
  self.assertEqual(len(D['courses']),87)
  self.assertEqual(len(D['venues_surfaces']),80)
  self.assertEqual(len(D['h013_asof_screen_surface']),20)
  self.assertEqual(D['cohort']['evaluation_races'],990)
 def test_all_four_bands(self):
  for r in D['courses']:
   self.assertEqual([z['band'] for z in r['zones']],['前25%','前中25-50%','後中50-75%','最後方25%'])
 def test_each_course_no_double_count(self):
  self.assertEqual(sum(sum(z['test']['horses'] for z in c['zones']) for c in D['courses']),15089)
  self.assertEqual(sum(sum(z['test']['top3'] for z in c['zones']) for c in D['courses']),990*3)
 def test_surface_aggregates(self):
  s={k:sum(v['test']['top3'] for v in D['venues_surfaces'] if v['surface']==k) for k in ('芝','ダ')}
  self.assertEqual(sum(s.values()),990*3)
 def test_h013_frozen_risk_anchors(self):
  r=[x for x in D['courses'] if x['risky_from_H013_train_only']!='未確定']
  self.assertEqual(len(r),15);self.assertEqual(sum(x['risk_test']['horses'] for x in r),1706)
  self.assertEqual(sum(x['risk_test']['top3'] for x in r),147)
 def test_asof_screen_preserved(self):
  s=D['h013_asof_screen_surface'];self.assertEqual(sum(x['summary']['horses'] for x in s),598)
  self.assertEqual(sum(x['summary']['top3'] for x in s),61)
  nak_turf=next(x for x in s if x['venue']=='中山' and x['surface']=='芝')
  nak_dirt=next(x for x in s if x['venue']=='中山' and x['surface']=='ダ')
  self.assertEqual([nak_turf['summary']['horses'],nak_turf['summary']['top3']],[188,12])
  self.assertEqual([nak_dirt['summary']['horses'],nak_dirt['summary']['top3']],[81,16])
 def test_matched_distance(self):
  matches=D['matched_same_venue_distance_turf_dirt']
  self.assertEqual(len(matches),15)
  x=next(z for z in matches if z['venue']=='東京' and z['distance']==1600)
  self.assertEqual((x['turf']['horses'],x['dirt']['horses']),(100,111))
  self.assertEqual((x['turf']['top3'],x['dirt']['top3']),(5,13))
 def test_synthetic_metrics(self):
  x=pd.DataFrame({'rid':['A','A','B'],'top3':[0,1,1],'q':[.2,.3,.6]})
  y=group_metrics(x)
  self.assertEqual(y['top3'],2);self.assertEqual(y['horses'],3)
  self.assertAlmostEqual(y['rate_pct'],66.67,places=1)
 def test_bootstrap_sparse_guard(self):
  a=pd.DataFrame({'rid':['A'],'top3':[1]});b=pd.DataFrame({'rid':['B'],'top3':[0]})
  self.assertEqual(paired_surface_ci(a,b),[None,None])
if __name__=='__main__':unittest.main()