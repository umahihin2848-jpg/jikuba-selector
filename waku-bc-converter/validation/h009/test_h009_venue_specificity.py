import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import h009_venue_specificity as h
import numpy as np
class TestH009(unittest.TestCase):
 def test_dates(self):
  self.assertEqual(h.date('24','01','5'),20240105)
  self.assertEqual(h.date('26','10','4'),20261004)
  self.assertEqual(h.date('2026','10','04'),20261004)
 def test_no_same_day_lookahead(self):
  # Twelve horses / two full races, one horse repeated, test only strictly earlier date allowed.
  a=[]
  for i in range(1,13):
   a.append(dict(rid='20240101_東京_01',date=20240101,year=2024,venue='東京',dist=1600,no=i,name=f'H{i}',n=12,fin=i,pop=13-i,odds=float(i+1),resid=((13-i)-i)/11))
  for i in range(1,13):
   a.append(dict(rid='20240101_中山_01',date=20240101,year=2024,venue='中山',dist=1600,no=i,name=f'H{i}',n=12,fin=i,pop=13-i,odds=float(i+1),resid=((13-i)-i)/11))
  b,_=h.make_features(a)
  self.assertTrue(all(x['history_n']==0 for x in b))
 def test_exact_distance_pair(self):
  a=[]
  for dt,loc,dist in [(20240101,'東京',1600),(20240201,'中山',2000),(20240301,'中山',1600),(20240401,'東京',1600)]:
   a.append(dict(rid=f'{dt}_{loc}_01',date=dt,year=2024,venue=loc,dist=dist,no=1,name='TestHorse',n=12,fin=1,pop=3,odds=3.,resid=2/11))
  b,_=h.make_features(a)
  self.assertEqual(b[-1]['nnak'],1)
  self.assertEqual(b[-1]['ntok'],1)
 def test_pl_total(self):
  p=h.pl_top3(np.linspace(3,80,16))
  self.assertAlmostEqual(sum(p),3.,places=10)
 def test_project_race_sum(self):
  q=h.pl_top3(np.linspace(3,80,16))
  x=np.array([[j/10,j/20] for j in range(16)])
  pred=h.project(q,x,np.array([1.,1.]),np.array([0]),np.zeros(16,dtype=int))
  self.assertAlmostEqual(sum(pred),3.,places=6)
if __name__=='__main__':unittest.main()