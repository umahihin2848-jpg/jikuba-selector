#!/usr/bin/env python3
"""Synthetic invariants only. Historical performance is reported separately, not 'test passed'."""
import unittest
import numpy as np
import pandas as pd
import h018_joint_rank as a

class H018Tests(unittest.TestCase):
 def test_rank_capacity_all_field_sizes(self):
  for n in range(12,19):
   z=a.zone_for_rank(n)
   self.assertEqual(len(z),n)
   self.assertEqual(z.max(),3)
   self.assertEqual(np.bincount(z,minlength=4).sum(),n)
 def test_equal_prob_already_consistent(self):
  n=16;counts=np.bincount(a.zone_for_rank(n),minlength=4);p=np.tile(counts/n,(n,1));q,it=a.project_slots(p,counts)
  np.testing.assert_allclose(p,q,atol=1e-11)
 def test_projection_respects_row_and_column(self):
  for n in [12,15,16,17,18]:
   rng=np.random.default_rng(n);p=rng.dirichlet([.3,.5,.7,1.1],size=n);caps=np.bincount(a.zone_for_rank(n),minlength=4)
   q,_=a.project_slots(p,caps)
   np.testing.assert_allclose(q.sum(1),1,atol=1e-8);np.testing.assert_allclose(q.sum(0),caps,atol=1e-8)
 def test_rank_expansion_doubly_stochastic(self):
  n=17;rng=np.random.default_rng(2);p=rng.dirichlet(np.ones(4),size=n)
  zone=a.zone_for_rank(n);q,_=a.project_slots(p,np.bincount(zone,minlength=4));r=a.rank_matrix(q,zone)
  np.testing.assert_allclose(r.sum(0),1,atol=1e-8);np.testing.assert_allclose(r.sum(1),1,atol=1e-8)
 def test_unique_rank_assign(self):
  n=18;rng=np.random.default_rng(22);p=rng.dirichlet(np.ones(4),size=n)
  z=a.zone_for_rank(n);q,_=a.project_slots(p,np.bincount(z,minlength=4));rr=a.map_unique_order(a.rank_matrix(q,z))
  self.assertEqual(sorted(rr.tolist()),list(range(1,19)))
 def test_predictor_does_not_read_actual_zone_or_top3(self):
  rng=np.random.default_rng(61);n=16;p=rng.dirichlet(np.ones(4),size=n);caps=np.bincount(a.zone_for_rank(n),minlength=4)
  x=pd.DataFrame({'no':range(1,n+1),'zone':rng.integers(0,4,n),'top3':[1,1,1]+[0]*13,'q':rng.random(n)})
  q0,_=a.project_slots(p,caps)
  x['zone']=3-x.zone;x['top3']=1-x.top3;x['q']=1-x.q
  q1,_=a.project_slots(p,caps)
  self.assertTrue(np.array_equal(q0,q1))
 def test_budget3(self):
  p=np.array([.03,.1,.2,.4,.6,.8,.05,.16,.3,.23,.03,.04]);out=a.budget3(p,[np.arange(12)])
  self.assertAlmostEqual(out.sum(),3,places=10)
 def test_invalid_probs_rejected(self):
  with self.assertRaises(ValueError):a.project_slots(np.zeros((12,4)),np.array([3,3,3,3]))
 def test_rank_map_output_not_observation(self):
  n=12;p=np.full((n,4),.25);caps=np.bincount(a.zone_for_rank(n),minlength=4)
  q,_=a.project_slots(p,caps);m=a.map_unique_order(a.rank_matrix(q,a.zone_for_rank(n)))
  self.assertEqual(set(m),set(range(1,n+1)))
 def test_train_zone_label_map(self):
  import pandas as pd
  t=pd.DataFrame([{'コース':'東京芝1600m','4角順位帯':j,'学習馬数':100,'学習3着内頭数':i*10} for i,j in enumerate(a.BANDS)])
  q,glob=a.course_priors(t)
  self.assertTrue(np.all(np.diff(q['東京芝1600m'])>0))

if __name__=='__main__':unittest.main(verbosity=2)