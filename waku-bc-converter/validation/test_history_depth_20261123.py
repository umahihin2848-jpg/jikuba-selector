import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from history_depth_sensitivity_20261123 import date_iso,clean_horse,preds
class TestAsOfHistory(unittest.TestCase):
 def test_date_space(self):
  self.assertEqual(date_iso('2026. 2. 4'),'20260204')
  self.assertEqual(date_iso('2026.10. 4'),'20261004')
  self.assertEqual(date_iso('20251004'),'20251004')
 def test_weight_latest(self):
  a=[{'gap':0.0},{'gap':1.0},{'gap':2.0}]
  self.assertEqual(preds(a,2,'gap'),.5)
  self.assertAlmostEqual(preds(a,2,'gap',.8),.8/1.8)
 def test_depth_no_more_than_k(self):
  a=[{'gap':i} for i in range(15)]
  self.assertEqual(preds(a,5,'gap'),2)
  self.assertEqual(preds(a,10,'gap'),4.5)
 def test_missing_gap_not_zero(self):
  a=[{'gap':None},{'gap':.5}]
  self.assertEqual(preds(a,2,'gap'),.5)
if __name__=='__main__':unittest.main()