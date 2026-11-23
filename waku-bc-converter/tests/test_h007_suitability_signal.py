import sys, unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).parent))
from h007_suitability_signal import normname,parse_dates,asof_prior,apply_score


def rec(date='20230101',venue='東京',surface='芝',dist=1600,resid=0.1):
    return {'date':date,'venue':venue,'surface':surface,'dist':dist,'resid':resid}

class H007Tests(unittest.TestCase):
    def test_date_parses_single_digit_month_day(self):
        dates=parse_dates(pd.Series(['2026.10. 4','2026. 1. 4','2025.12.28','2024. 7.11']))
        self.assertEqual(dates.tolist(),['20261004','20260104','20251228','20240711'])
    def test_asof_excludes_same_day_and_future(self):
        p=asof_prior([rec('20260101'),rec('20260102'),rec('20260103')],'20260102')
        self.assertEqual([r['date'] for r in p],['20260101'])
    def test_venue_contrast_two_on_each_side(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        hist=[rec(resid=.4),rec(resid=.2),rec(venue='中山',resid=-.3),rec(venue='京都',resid=-.1)]
        x,yes,na,nb=apply_score(hist,'venue',meta)
        self.assertTrue(yes);self.assertEqual((na,nb),(2,2));self.assertGreater(x,0)
    def test_same_track_not_sufficient_without_other_track(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        x,yes,na,nb=apply_score([rec()]*8,'venue',meta)
        self.assertFalse(yes);self.assertEqual(x,0.)
    def test_different_surface_does_not_count_for_venue(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        z=[rec(),rec(),rec(venue='中山',surface='ダ'),rec(venue='阪神',surface='ダ')]
        _,yes,_,_=apply_score(z,'venue',meta)
        self.assertFalse(yes)
    def test_course_control_requires_similar_distances(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        z=[rec(),rec(),rec(venue='中山',dist=2400),rec(venue='阪神',dist=2200)]
        _,yes,_,_=apply_score(z,'venue',meta)
        self.assertFalse(yes)
    def test_distance_requires_contrast(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        hist=[rec(dist=1600,resid=.3),rec(dist=1400,resid=.4),rec(dist=2000,resid=-.2),rec(dist=2400,resid=-.1)]
        x,yes,na,nb=apply_score(hist,'distance',meta)
        self.assertTrue(yes);self.assertGreater(x,0)
    def test_venue_last5_versus_last10_evidence(self):
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        hist=[rec() for _ in range(5)]+[rec(venue='中山') for _ in range(5)]
        _,ok5,_,_=apply_score(hist,'venue5',meta)
        _,ok10,_,_=apply_score(hist,'venue',meta)
        self.assertFalse(ok5);self.assertTrue(ok10)
    def test_market_adjusted_good_vs_unadjusted_finish(self):
        self.assertEqual(normname('テスト  馬'),'テスト馬')
        meta={'surface':'芝','distance':1600,'venue':'東京'}
        z=[rec(resid=-.2),rec(resid=-.4),rec(venue='中山',resid=.1),rec(venue='阪神',resid=.2)]
        x,yes,_,_=apply_score(z,'venue',meta)
        self.assertTrue(yes);self.assertLess(x,0)
if __name__=='__main__':unittest.main()