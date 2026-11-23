#!/usr/bin/env python3
"""Pure synthetic policy/integrity tests, no real race results stored."""
import unittest
from h006_conditional_depth import eligible_gates,rank,race_outcome,THRESHOLDS


def h(i,surface='芝',distance=1600,gap=0.4,front=.6,date=None):
    return {'date':date or f'202{4 if i>8 else 3}0101','rid':f'{i:016d}',
       'surface':surface,'dist':distance,'gap':gap,'front':front}

class TestDepth(unittest.TestCase):
    def setUp(self):
        self.meta={'date':'20250101','surface':'芝','distance':1600}

    def test_requires_10_distinct_valid_races(self):
        flags,attrs=eligible_gates([h(i) for i in range(1,10)],self.meta)
        self.assertFalse(any(flags.values()))
        self.assertEqual(attrs['prior_valid_gaps'],9)

    def test_duplicate_identity_does_not_increase_depth(self):
        history=[h(i) for i in range(1,10)]+[h(1) for _ in range(12)]
        flags,attrs=eligible_gates(history,self.meta)
        self.assertFalse(any(flags.values()))
        self.assertEqual(attrs['prior_valid_gaps'],9)

    def test_today_and_future_not_used(self):
        past=[h(i) for i in range(1,10)]
        poison=[h(i,date='20250101') for i in (10,11,12)]+[h(13,date='20260101')]
        flags,attrs=eligible_gates(past+poison,self.meta)
        self.assertEqual(attrs['prior_valid_gaps'],9)
        self.assertFalse(any(flags.values()))

    def test_return_to_same_distance(self):
        # 5 newest at 1200m; earlier >=2 at 1600m.
        a=[h(20-i,distance=1200) for i in range(5)]+[h(10-i,distance=1600) for i in range(5)]
        flags,attrs=eligible_gates(a,self.meta)
        self.assertTrue(flags['return_distance'])
        self.assertEqual(attrs['recent_dist_matches'],0)
        self.assertEqual(attrs['older_dist_matches'],5)

    def test_same_surface_running_style_stable(self):
        a=[h(20-i,front=.55) for i in range(5)]+[h(10-i,front=.65) for i in range(5)]
        flags,attrs=eligible_gates(a,self.meta)
        self.assertTrue(flags['consistent_running_style'])
        self.assertLessEqual(attrs['frontness5vsolder_change'],.12)

    def test_recent_volatility_only(self):
        a=[h(20-i,gap=2 if i==0 else 0) for i in range(5)]+[h(10-i,gap=.7) for i in range(5)]
        flags,attrs=eligible_gates(a,self.meta)
        self.assertTrue(flags['recent_gap_volatility'])
        self.assertGreaterEqual(attrs['recent_gap_sd_s'],.5)

    def test_rank_changes_only_when_gate_is_true(self):
        rows=[{'rid':'r','no':i,'fin':i,'year':2024,'surface':'芝',
            'score_all5_decay':float(i),'score_all10_decay':float(i)-2 if i==4 else float(i)} for i in range(1,5)]
        features={('r',i):{'gates':{'return_distance':i==4}} for i in range(1,5)}
        a=rank(rows,None,features)
        b=rank(rows,'return_distance',features)
        self.assertEqual([v['no'] for v in a],[1,2,3])
        self.assertEqual([v['no'] for v in b],[1,2,4])
        result=race_outcome(rows,'return_distance',features)
        self.assertTrue(result['changed'])
        self.assertEqual(result['hits_base'],3)
        self.assertEqual(result['hits_policy'],2)

if __name__=='__main__':unittest.main()