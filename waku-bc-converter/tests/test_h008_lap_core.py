import unittest
import math
from h008_lap_core import parse_date, phase_metrics

class H008CoreTests(unittest.TestCase):
    def test_date_various_padding(self):
        self.assertEqual(parse_date('2026.10. 4'), 20261004)
        self.assertEqual(parse_date('2026. 1. 4'), 20260104)
    def test_invalid_date(self):
        with self.assertRaises(ValueError):parse_date('2026.99.88')
    def test_1800_has_middle_lull(self):
        x=phase_metrics('12.8-11.3-11.6-12.4-12.5-12.2-11.5-11.2-11.8',1800)
        self.assertEqual(x['lull_both_0p3'],1)
        self.assertAlmostEqual(x['middle'],(12.4+12.5+12.2)/3)
    def test_flat_1800_not_lull(self):
        x=phase_metrics('12.4-11.8-11.9-12.0-12.0-12.0-11.9-11.9-12.0',1800)
        self.assertEqual(x['lull_both_0p3'],0)
    def test_sprint_has_no_middle(self):
        x=phase_metrics('12.0-10.2-10.7-11.0-11.4-11.8',1200)
        self.assertTrue(math.isnan(x['lull_both_0p3']))
    def test_wrong_length_rejected(self):
        self.assertIsNone(phase_metrics('11.3-11.7-11.8',1800))
    def test_bogus_split_rejected(self):
        self.assertIsNone(phase_metrics('12-11-11-11-11-11-11-0-11',1800))
    def test_threshold_sensitivity(self):
        s='12.0-11.0-11.0-11.4-11.4-11.4-11.0-11.0-11.0'
        self.assertEqual(phase_metrics(s,1800,.3)['lull_both_0p3'],1)
        self.assertEqual(phase_metrics(s,1800,.5)['lull_both_0p3'],0)

if __name__=='__main__':unittest.main()