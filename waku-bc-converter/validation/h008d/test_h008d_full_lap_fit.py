import importlib.util, unittest, math
import numpy as np
from pathlib import Path
sp=importlib.util.spec_from_file_location('h008d',Path(__file__).with_name('h008d_full_lap_fit.py'))
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)

class TestFullLap(unittest.TestCase):
 def test_date_padded(self):
  self.assertEqual(m.date_val('2026.10. 4'),20261004)
  self.assertEqual(m.date_val('2026. 6. 7'),20260607)
  self.assertEqual(m.date_val('20261004'),20261004)
 def test_bad_date(self):self.assertIsNone(m.date_val('2026.13.02'))
 def test_valid_1800(self):
  z=m.lap_signature('12.4-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6',1800)
  self.assertIsNotNone(z)
  self.assertEqual(len(z['shape']),8)
  self.assertAlmostEqual(z['start'],12.4)
  self.assertEqual(len(z['demand5']),5)
 def test_start_100m(self):
  z=m.lap_signature('7.0-11.5-11.4-11.6-11.6-11.9-12.1-12.2-12.0',1700)
  self.assertEqual(z['firstm'],100);self.assertAlmostEqual(z['start'],7.)
  self.assertIsNone(z['facets']['start_delta'])
 def test_bad_segment_count(self):self.assertIsNone(m.lap_signature('12.0-11.0-11.0-11.0',1600))
 def test_other_segment_affects_shape(self):
  a='12.4-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6'
  b='12.4-10.9-12.0-12.3-12.4-11.8-11.1-11.2-11.6'
  aa=m.lap_signature(a,1800);bb=m.lap_signature(b,1800)
  self.assertGreater(np.max(np.abs(aa['shape']-bb['shape'])),.01)
 def test_start_not_ignored(self):
  a='12.4-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6'
  b='12.9-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6'
  aa=m.lap_signature(a,1800);bb=m.lap_signature(b,1800)
  self.assertTrue(np.allclose(aa['shape'],bb['shape']))
  self.assertNotEqual(aa['start'],bb['start'])
 def test_firstm_comparability(self):
  self.assertEqual(m.first_m(1500),100)
  self.assertEqual(m.first_m(1150),150)
  self.assertEqual(m.first_m(2000),200)
 def test_template_strict_asof(self):
  arr=np.array([20240101,20240102,20240103,20240104,20240105,20240106,20240107,20240108,20240109,20240110,20240111,20240112,20240113])
  shape=np.ones((13,8));shape[-1,:]=100
  cs=np.cumsum(shape,axis=0)
  cr={('東京','芝',1800,2):(arr,cs,np.arange(1,14),np.arange(1,14),np.cumsum(np.ones((13,5)),axis=0))}
  y=m.course_template(20240113,'東京','芝',1800,2,cr,{})
  self.assertEqual(y[3],12)
  self.assertTrue(np.allclose(y[0],np.ones(8)))
 def test_projected_top3(self):
  p=np.array([.6,.5,.4,.3,.2,.2,.15,.15,.1,.1,.1,.1])
  p*=3/p.sum()
  if max(p)>=1:p=np.array([.4,.3,.2,.1,.1,.1,.1,.1,.1,.1,.1,.1])*3/2.2
  p=np.array([.3]*12)
  f=np.random.default_rng(1).normal(size=(12,8))
  r=m.projected_prob(p,f,np.ones(8)*.3,np.array([0]),np.zeros(12,dtype=int))
  self.assertAlmostEqual(sum(r),3,places=8)
  self.assertTrue(np.all((r>0)&(r<1)))
 def test_pl(self):
  z=m.pl_top3(np.linspace(2,25,16))
  self.assertAlmostEqual(sum(z),3,places=8)
  self.assertTrue(np.all((z>=0)&(z<=1)))
 def test_future_and_same_day_ignored(self):
  sample=m.lap_signature('12.4-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6',1800)
  def h(dt,rid,v):return {'date':dt,'rid':rid,'surface':'芝','dist':1800,'turn':2,'result_residual':v,'lap':sample}
  arr=np.arange(20240101,20240114)
  cs=np.cumsum(np.vstack([sample['shape']]*13),axis=0)
  cumfirst=np.cumsum([sample['start']]*13)
  cd=np.cumsum(np.vstack([sample['demand5']]*13),axis=0)
  c={('東京','芝',1800,2):(arr,cs,cumfirst,np.arange(1,14),cd)}
  row={'date':20240201,'name':'TEST','venue':'東京','surface':'芝','distance':1800,'turn':2}
  base=[h(20240112,'a',.2),h(20240109,'b',-.1),h(20240104,'c',.2),h(20240102,'d',.1)]
  future=[h(20240201,'e',10),h(20240302,'f',10)]
  z1=m.horse_features(row,{'TEST':base},c,{})
  z2=m.horse_features(row,{'TEST':future+base},c,{})
  self.assertEqual(z1['general'],z2['general'])
  self.assertEqual(z1['lap_fit'],z2['lap_fit'])
  self.assertEqual(z1['demand_fits'],z2['demand_fits'])
 def test_all_labels(self):
  z=m.lap_signature('12.4-10.9-12.0-12.3-12.2-11.8-11.1-11.2-11.6',1800)
  self.assertEqual(len(z['facets']),7)
  self.assertTrue(np.all(np.isfinite(z['demand5'])))


 def test_turn_inference_no_future(self):
  cs={('東京','芝',1800):{2:np.asarray([20240101,20240201]),3:np.asarray([20250601])}}
  self.assertEqual(m.choose_turn_asof(20240115,'東京','芝',1800,cs),2)
  self.assertIsNone(m.choose_turn_asof(20260101,'東京','芝',1800,cs))
 def test_lap_signature_requires_expected_first_segment(self):
  self.assertIsNone(m.lap_signature('7.0-11.5-11.4-11.6-11.6-11.9-12.1-12.2-12.0',1800))

if __name__=='__main__':unittest.main()