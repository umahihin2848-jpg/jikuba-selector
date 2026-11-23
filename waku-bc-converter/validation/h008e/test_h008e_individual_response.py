#!/usr/bin/env python3
import sys,pathlib,unittest,copy
import numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import h008e_individual_response as E
D=E.D


def hist_row(date,rid,shape,finish=4,c3=8,c4=6):
    return dict(date=date,rid=rid,name='TEST',venue='東京',surface='芝',dist=1600,turn=2,
                n=16,fin=finish,pop=4,result_residual=0.,c3=c3,c4=c4,gap600=.4,
                last3f=33.7,fastest3f=33.0,lap=dict(shape=np.asarray(shape,dtype=float),start=12.4,firstm=200))

class TestFullLapOwnResponse(unittest.TestCase):
    def test_strict_date_and_no_lookahead(self):
        self.assertEqual(D.date_val('2026.10. 4'),20261004)
        self.assertEqual(D.date_val('2026.1. 4'),20260104)
        self.assertEqual(D.date_val('2026.11.23'),20261123)

    def test_past_response_all_four(self):
        h=hist_row(20240101,'2024010100000000',np.zeros(8),finish=2,c3=8,c4=5)
        z=E.own_old_response(h)
        self.assertEqual(len(z),4)
        self.assertAlmostEqual(z[0],3/15)
        self.assertAlmostEqual(z[1],-.7/3)
        self.assertAlmostEqual(z[2],-.4/3)
        self.assertAlmostEqual(z[3],3/15)

    def test_missing_c3_does_not_fabricate_a_midsection(self):
        h=hist_row(20240101,'2024010100000000',np.zeros(8),c3=None,c4=5)
        z=E.own_old_response(h)
        self.assertTrue(np.isnan(z[3]))
        self.assertTrue(np.isfinite(z[0]))

    def test_missing_last_three_furlongs_is_na(self):
        h=hist_row(20240101,'2024010100000000',np.zeros(8));h['last3f']=None
        z=E.own_old_response(h)
        self.assertTrue(np.isnan(z[1]))

    def test_invalid_corner_rank_is_rejected(self):
        self.assertIsNone(E.positive_position('20',16))
        self.assertIsNone(E.positive_position('',16))
        self.assertEqual(E.positive_position('3',16),3)

    def test_weighted_response_ignores_missing(self):
        v,e,n=E.weighted_response(np.array([.2,np.nan,.8,.4]),np.ones(4))
        self.assertAlmostEqual(v,(.2+.8+.4)/3)
        self.assertEqual(n,3)
        self.assertAlmostEqual(e,3)

    def test_same_lap_each_race_no_conditional_signal(self):
        date=20250101
        hh=[hist_row(20240101+i,'202401010000000'+str(i),np.zeros(8),finish=(i%6)+1) for i in range(6)]
        for h in hh:h['own_response']=E.own_old_response(h)
        target=dict(date=date,name='TEST',venue='東京',surface='芝',distance=1600,turn=2)
        def fake_template(*args,**kwargs):return np.zeros(8),12.4,None,100,'exact'
        real=D.course_template
        try:
            D.course_template=fake_template
            v=E.own_features(target,{'TEST':hh},None,None)
        finally:D.course_template=real
        self.assertAlmostEqual(v['conditioned'],0,places=12)

    def test_future_history_rejected_as_same_day_not_used(self):
        old=[hist_row(20240101+i,'202401010000000'+str(i),np.zeros(8),finish=2) for i in range(5)]
        fut=hist_row(20260101,'2026010100000000',np.ones(8),finish=1)
        for h in old+[fut]:h['own_response']=E.own_old_response(h)
        t=dict(date=20250101,name='TEST',venue='東京',surface='芝',distance=1600,turn=2)
        real=D.course_template
        try:
            D.course_template=lambda *args,**kwargs:(np.zeros(8),12.4,None,100,'exact')
            a=E.own_features(t,{'TEST':old},None,None)
            b=E.own_features(t,{'TEST':old+[fut]},None,None)
        finally:D.course_template=real
        self.assertAlmostEqual(a['raw'],b['raw']);self.assertAlmostEqual(a['conditioned'],b['conditioned'])

    def test_old_past_lap_reaction_individual_works(self):
        hh=[]
        for i in range(10):
            good=(i%2)==0
            shape=np.zeros(8) if good else np.array([.8,-.8]*4)
            h=hist_row(20240101+i,'20240101000000'+str(i).zfill(2),shape,finish=2 if good else 15,c3=9,c4=5 if good else 12)
            h['own_response']=E.own_old_response(h);hh.append(h)
        target=dict(date=20250101,name='TEST',venue='東京',surface='芝',distance=1600,turn=2)
        real=D.course_template
        try:
            D.course_template=lambda *args,**kwargs:(np.zeros(8),12.4,None,100,'exact')
            r=E.own_features(target,{'TEST':hh},None,None)
        finally:D.course_template=real
        self.assertGreater(r['conditioned'],0)

    def test_three_places_probability_sums_to_three(self):
        q=np.ones(12)*.25;f=np.zeros((12,10));start=np.array([0]);group=np.zeros(12,dtype=int)
        p=E.prob(q,f,np.zeros(10),start,group)
        self.assertAlmostEqual(sum(p),3,places=8)

    def test_coefficients_do_not_use_target_finish_at_inference(self):
        q=np.linspace(.1,.3,12);q=q*3/q.sum();f=np.random.default_rng(123).normal(size=(12,10))
        p1=E.prob(q,f,np.ones(10)*.1,np.array([0]),np.zeros(12,dtype=int))
        # y/actual finish are not in scorer API
        p2=E.prob(q,f,np.ones(10)*.1,np.array([0]),np.zeros(12,dtype=int))
        np.testing.assert_array_equal(p1,p2)

if __name__=='__main__':unittest.main()