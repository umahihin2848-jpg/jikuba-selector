import sys,unittest
from pathlib import Path
import numpy as np
import pandas as pd
P=Path(__file__).parent
sys.path.insert(0,str(P))
from h013_position_risk import metric_summary
from h013_zone_audit import run

class TestH013(unittest.TestCase):
 def test_market_residual_label_count(self):
  d=pd.DataFrame([{'rid':'a','q':.2,'top3':1},{'rid':'a','q':.4,'top3':0}])
  a=metric_summary(d,'toy');self.assertEqual(a['actual_top3'],1);self.assertAlmostEqual(a['expected_market_top3'],.6)
 def test_no_false_poor_hit(self):
  d=pd.DataFrame([{'rid':'a','q':.4,'top3':1}]);a=metric_summary(d,'toy');self.assertEqual(a['horses'],1);self.assertEqual(a['races'],1)
 def test_band_edges(self):
  z=pd.cut([.25,.50,.75,1.0],bins=[-.001,.25,.5,.75,1.001],labels=['F','FM','BM','B'],include_lowest=True)
  self.assertEqual(list(z),['F','FM','BM','B'])
 def test_course_level_only_history(self):
  s=(P/'h013_position_risk.py').read_text(encoding='utf8')
  self.assertIn('df.year<=2023',s)
  self.assertIn('pback>=.7',s)
  self.assertIn('d.course_severe & (d.pback>=.7)',s)
 def test_no_current_fourth_corner_in_model(self):
  s=(P/'h013_position_risk.py').read_text(encoding='utf8')
  features=s.split('numeric=')[1].split('\n',1)[0]
  self.assertNotIn('c4norm',features)
 def test_scoring_past_not_current_label(self):
  s=(P/'h013_position_risk.py').read_text(encoding='utf8')
  key=s.split("d['predicted_risk']=")[1].split('\n',1)[0]
  self.assertNotIn('target_back4',key)
  self.assertNotIn('top3',key)
 def test_course_zone_count(self):
  import csv
  with open(P/'H013_87コース_位置どり危険開始ライン.csv',encoding='utf-8-sig') as f: a=list(csv.DictReader(f))
  self.assertEqual(len(a),87)
  self.assertEqual(sum(x['採用区分']!='未確定' for x in a),15)
 def test_private_horses_count(self):
  import csv
  with open(P/'H013_危険馬_過去検証_PRIVATE.csv',encoding='utf-8-sig') as f:a=list(csv.DictReader(f))
  self.assertEqual(len(a),598)
  self.assertEqual(sum(x['実際の3着内※事後評価']=='1' for x in a),61)
if __name__=='__main__':unittest.main()