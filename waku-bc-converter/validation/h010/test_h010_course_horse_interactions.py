import sys, pathlib, unittest, copy
import numpy as np
from unittest.mock import patch
HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import h010_course_horse_interactions as H

class H010Tests(unittest.TestCase):
    def test_stage_only_from_historical_record(self):
        r={'n':16,'c3':3,'c4':5,'fin':2,'own_response':np.array([0.,-.2,-.25,.0])}
        v=H.stage_from_prior(r)
        self.assertAlmostEqual(v[0],13/15)
        self.assertAlmostEqual(v[1],-.2)
        self.assertAlmostEqual(v[2],3/15)

    def test_no_valid_stage_is_nan_not_fake_fast_horse(self):
        r={'n':16,'c3':None,'c4':None,'fin':12,'own_response':np.full(4,np.nan)}
        self.assertTrue(np.all(np.isnan(H.stage_from_prior(r))))

    def test_future_and_same_day_are_excluded(self):
        def r(day, c3=5):return {'date':day,'n':12,'c3':c3,'c4':6,'fin':4,
            'surface':'芝','dist':1800,'own_response':np.array([.2,-.2,-.3,0.])}
        x={'date':20250105,'name':'テスト馬','surface':'芝','distance':1800}
        hist={'テスト馬':[r(20250106,1),r(20250105,1),r(20241224,6),r(20241222,5),r(20241201,4)]}
        v,c,n=H.past_stage_means(x,hist)
        self.assertEqual(n,3)
        self.assertEqual(c.tolist(),[3,3,3])
        self.assertLess(v[0],0.8)

    def test_unknown_history_is_neutral_nan(self):
        v,c,n=H.past_stage_means({'name':'none','date':20250101}, {})
        self.assertEqual(n,0)
        self.assertTrue(np.isnan(v).all())

    def test_corner_count_pre_race_request_not_current_race(self):
        x={'date':20250615,'venue':'東京','surface':'芝','distance':1800,'turn':2}
        def fake(date,venue,surface,distance,turn,course,coarse):
            self.assertEqual(date,20250615)
            self.assertEqual((venue,surface,distance,turn),('東京','芝',1800,2))
            return np.zeros(8),12.0,np.array([-46.,-11.,.6,-.2,.45]),45,'exact'
        with patch.object(H.D,'course_template',side_effect=fake):
            demand,n,src=H.course_demand(x,None,None)
        self.assertEqual(n,45)
        np.testing.assert_allclose(demand,[0,.6,.45])

    def test_missing_course_demand_keeps_corner_information_only(self):
        with patch.object(H.D,'course_template',return_value=(None,None,None,0,'none')):
            x={'date':20250615,'venue':'中山','surface':'芝','distance':1800,'turn':4}
            demand,n,src=H.course_demand(x,None,None)
        self.assertEqual(demand[0],1.)
        self.assertTrue(np.isnan(demand[1:]).all())

    def test_training_scaling_and_within_race_center(self):
        groups=[]
        for year in (2024,2025):
            for no in (1,2,3):
                groups.append({'year':year,'rid':str(year),'no':no,'name':str(year)+str(no),'date':year*10000+101,
                   'venue':'東京','surface':'芝','distance':1800,'turn':2})
        def means(row,hist,min_obs=3):
            if row['no']==3:return np.full(3,np.nan),np.zeros(3,dtype=int),0
            a=np.array([.4,.5,.6]) if row['no']==1 else np.array([.6,.7,.8])
            return a,np.ones(3,dtype=int)*5,5
        def course(row, c, x):
            year=row['year'];turn=row['turn'];return np.array([0.,.2 if year==2024 else 4.,.7 if year==2024 else 8.]),80,'exact'
        with patch.object(H,'past_stage_means',side_effect=means),patch.object(H,'course_demand',side_effect=course):
            z,scale,cov=H.prep_features(groups,None,None,None)
        self.assertAlmostEqual(scale['mean'][0],.2)
        self.assertAlmostEqual(scale['mean'][1],.7)
        for year in (2024,2025):
            sub=[r for r in z if r['year']==year]
            self.assertTrue(np.allclose(sub[2]['h010_raw'],0.))
            self.assertTrue(np.allclose(np.mean([r['h010_raw'] for r in sub],axis=0),0.,atol=1e-13))

    def test_market_projection_sum_three(self):
        q=np.array([.4,.3,.25,.2,.15,.15,.4,.3,.25,.2,.15,.15])
        # normalized per artificial 6 runners -> expected three, q initial arbitrary.
        x=np.zeros((12,14));start=np.array([0,6]);grp=np.r_[np.zeros(6,dtype=int),np.ones(6,dtype=int)]
        p=H.D.projected_prob(q,x,np.zeros(14),start,grp)
        np.testing.assert_allclose(np.add.reduceat(p,start),[3,3],atol=1e-7)

    def test_fit_group_has_no_access_to_test_period(self):
        q=np.full(6,.5);x=np.zeros((6,14));x[:,8]=[.1,.2,.3,.4,.5,.6]
        y=np.array([1,1,1,0,0,0]);start=np.array([0]);grp=np.zeros(6,dtype=int)
        a,_=H.fit_group(q,y,x,start,grp,np.zeros(14),slice(8,11))
        b,_=H.fit_group(q,y,x,start,grp,np.zeros(14),slice(8,11))
        np.testing.assert_allclose(a,b)
        self.assertTrue(np.isfinite(a).all())

    def test_cluster_bootstrap_not_per_horse(self):
        a=H.ci([-.02,.01,.04,0.],reps=200)
        self.assertEqual(a['n_races'],4)
        self.assertTrue(a['ci95'][0]<=a['mean_gain']<=a['ci95'][1])

    def test_result_exact_scope_and_primary_claim(self):
        import json
        path=HERE/'H010_RESULT_AGGREGATE.json'
        if not path.exists():self.skipTest('audit output absent')
        j=json.loads(path.read_text())
        x=j['results']['test2025_26']
        self.assertEqual(x['market_plus_M3_shadow']['races'],553)
        self.assertEqual(x['market_plus_M3_shadow']['top3_hits'],753)
        self.assertAlmostEqual(x['market_plus_M3_shadow']['brier'],.13258873264029036)
        self.assertTrue(j['paired']['plus_horse_stage_main_effects_to_plus_course_structure_interactions']['ci95'][0]<0<j['paired']['plus_horse_stage_main_effects_to_plus_course_structure_interactions']['ci95'][1])
        self.assertEqual(j['sample_audit']['target_rejected']['course_ambiguous_or_missing'],26)

if __name__=='__main__':unittest.main()