import unittest
from h011_utils import prior_unique,back_half,past_c4_mean

class TestAsOfHistory(unittest.TestCase):
    def make(self,date,rid,surf='芝',c4frac=.3):return dict(date=date,rid=rid,surf=surf,c4frac=c4frac)
    def test_future_and_same_day_excluded(self):
        x=[self.make(20260101,'2026010104010111'),self.make(20261123,'2026112304010111'),self.make(20261201,'2026120104010111')]
        self.assertEqual([x['date'] for x in prior_unique(x,20261123)],[20260101])
    def test_date_id_mismatch_excluded(self):
        a=[self.make(20260102,'2026010104010111'),self.make(20260103,'2026010304010111')]
        self.assertEqual(len(prior_unique(a,20261123)),1)
    def test_dedup_same_race_id(self):
        a=[self.make(20260103,'2026010304010111'),self.make(20260103,'2026010304010111')]
        self.assertEqual(len(prior_unique(a,20261123)),1)
    def test_surface_filter(self):
        a=[self.make(20260103,'2026010304010111','ダ'),self.make(20260102,'2026010204010111','芝')]
        self.assertEqual(prior_unique(a,20261123)[0]['date'],20260102)
    def test_last_five_really_different(self):
        a=[self.make(20260101+i,f'{20260101+i:08d}04010111') for i in range(8)]
        self.assertEqual([r['date'] for r in prior_unique(a,20261123)],list(range(20260108,20260103,-1)))
    def test_half_boundary_and_invalid(self):
        self.assertEqual(back_half(8,16),0);self.assertEqual(back_half(9,16),1)
        with self.assertRaises(ValueError):back_half(0,16)
    def test_decay_weight(self):
        a=[dict(c4frac=.2),dict(c4frac=.8)]
        self.assertAlmostEqual(past_c4_mean(a,.5),.4)
        self.assertEqual(past_c4_mean([]),.5)
if __name__=='__main__':unittest.main()