import sys,unittest, numpy as np,pandas as pd
sys.path.insert(0,'/mnt/data/H015_二段階先行余力検証_20261123')
import h015_two_stage as M

class TwoStageTests(unittest.TestCase):
 def synthetic(self):
  r=np.random.default_rng(12044);N=50;members=12;cnt=N*members
  frame=pd.DataFrame({'rid':np.repeat(['r'+str(i) for i in range(N)],members),
                      'year':np.repeat([2022]*40+[2024]*10,members),
                      'name':['horse'+str(i) for i in range(cnt)],
                      'no':np.tile(np.arange(1,members+1),N),
                      'n':members,'surface':'芝','profile':'東京芝1600m',
                      'gate':np.tile((np.arange(members)+.5)/members,N)})
  frame['prior4']=np.clip(.1+.7*frame.gate+ r.normal(0,.12,cnt),0,1)
  frame['prior4_sim']=frame.prior4+r.normal(0,.05,cnt)
  frame['nold']=r.integers(0,6,cnt)
  frame['front_pressure']=.35+r.normal(0,.02,cnt)
  frame['prior_top3']=.1+.1*r.random(cnt)
  frame['prior_late']=.5+r.random(cnt)
  frame['prior_change']=r.normal(0,.1,cnt)
  frame['prior_hold']=.2+.5*r.random(cnt)
  frame['prior_fade']=.05+.3*r.random(cnt)
  frame['nfront']=r.integers(0,5,cnt)
  frame['front_intent']=1-frame.prior4
  frame['c4_front']=frame.groupby('rid').gate.transform(lambda x: x<=.25).to_numpy()
  frame['top3']=frame.no.isin([1,5,8]).astype(int)
  frame['q']=3/members
  return M.make_features(frame)
 def test_sum_three(self):
  p=M.calib_three_per_race(np.asarray([.001,.2,.4,.9,.1,.03,.3,.4]),np.repeat(['a','b'],4),target_total=3)
  self.assertTrue(np.allclose([p[:4].sum(),p[4:].sum()],[3,3],atol=1e-6))
 def test_keeps_rank_order(self):
  pp=np.asarray([.01,.25,.95,.4,.05]);q=M.calib_three_per_race(pp,['a']*5)
  self.assertEqual(list(np.argsort(pp)),list(np.argsort(q)))
 def test_no_contemporaneous_inputs(self):
  self.assertFalse(M.ASOF & M.FORBIDDEN)
  for k in ['c4','top3','stress_high','q','early2','late3f','closing_odds']:
   self.assertNotIn(k,M.GENERIC+M.ENDURANCE+M.CATS)
 def test_current_4c_outcomes_cannot_change_pred(self):
  s=self.synthetic();tr=s.year==2022;te=s.year==2024
  orig,_=M.train_and_predict(s,tr,te)
  modified=s.copy();modified.loc[te,'c4_front']=~modified.loc[te,'c4_front'];modified.loc[te,'top3']=1-modified.loc[te,'top3']
  alt,_=M.train_and_predict(modified,tr,te)
  for k in ['frontprob_generic','frontprob_endurance','direct_endurance','mixture_endurance']:
   np.testing.assert_allclose(orig[k].to_numpy(),alt[k].to_numpy(),atol=1e-12,err_msg=k)
 def test_output_is_3_per_race(self):
  s=self.synthetic();o,m=M.train_and_predict(s,s.year==2022,s.year==2024)
  for col in m:self.assertTrue(np.allclose(o.groupby('rid')[col].sum().to_numpy(),3,atol=1e-7))
 def test_risk_features_finite(self):
  z=self.synthetic();self.assertTrue(np.isfinite(z[M.GENERIC+M.ENDURANCE].to_numpy(float)).all())
 def test_extreme_stable(self):
  p=M.calib_three_per_race(np.asarray([0.,0.,1.,1.,.1]),['a']*5)
  self.assertTrue(np.isfinite(p).all())
  self.assertAlmostEqual(p.sum(),3.,places=6)

if __name__=='__main__':unittest.main()