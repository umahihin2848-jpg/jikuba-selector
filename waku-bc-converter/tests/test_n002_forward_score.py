import csv
import datetime as dt
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'validation'))
import n002_forward_score as n

COLS=['年','月','日','場所','レース番号','レース名','クラスコード','芝・ダ','距離','頭数','馬番','馬名','確定着順','通過順1','通過順2','通過順3','通過順4']

def create_csv(path,date='2026-11-29',tie=False,with_missing=False):
    date=dt.date.fromisoformat(date)
    with open(path,'w',encoding='cp932',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=COLS)
        writer.writeheader()
        for i in range(1,13):
            c3 = 1 if tie and i==2 else i
            if tie and i>2:c3=i
            row={'年':str(date.year%100),'月':str(date.month),'日':str(date.day),'場所':'東京',
                 'レース番号':'11','レース名':'合成OP','クラスコード':'131','芝・ダ':'芝','距離':'1600',
                 '頭数':'12','馬番':str(i),'馬名':'Synthetic'+str(i),'確定着順':str(i),
                 '通過順1':'0','通過順2':'0','通過順3':str(c3),'通過順4':str(i)}
            if with_missing and i==12:row['通過順4']='0'
            writer.writerow(row)

def rank(date='2026-11-29',ts='2026-11-28T13:00:00+09:00'):
    return {'schema':'rsa-rank-distribution-snapshot-v1','capturedAt':ts,'modelVersion':'race-position-competition-v1-20261123','metadata':{'date':date,'venue':'東京','raceName':'合成OP','field':12,'distance':1600,'surface':'芝'},
            'runners':[{'no':str(i),'name':'Synthetic'+str(i),'simulatedExpectedRank':i,'liveModelReference':{'m3':{'rank':i}}} for i in range(1,13)]}

def corner(date='2026-11-29',ts='2026-11-28T13:00:00+09:00'):
    rows=[]
    for i in range(1,13):
        idx=0 if i<=3 else 1 if i<=6 else 2 if i<=10 else 3
        p=[0.01]*4;p[idx]=0.97
        rows.append({'no':str(i),'name':'Synthetic'+str(i),'probabilities':p,'groupIndex':idx})
    return {'schema':'p3-71-three-stage-shadow-snapshot-v1','createdAt':ts,'stageModelVersion':'p3-70-20261123-a','parserVersion':'target-csv-cache-p363-history-dedup-shadow',
            'race':{'date':date,'venue':'東京','raceName':'合成OP','fieldSize':12,'distance':1600,'surface':'芝'},
            'virtualToActual':[{'actualNo':str(i),'virtualNo':str(i),'name':'Synthetic'+str(i)} for i in range(1,13)],
            'stagePredictions':{'c3':{'rows':[dict(x,probabilities=list(x['probabilities'])) for x in rows]},'c4':{'rows':[dict(x,probabilities=list(x['probabilities'])) for x in rows]}}}

class N002Tests(unittest.TestCase):
    def setUp(self):
        self.d=tempfile.TemporaryDirectory();self.addCleanup(self.d.cleanup)
        self.path=Path(self.d.name);self.csv=self.path/'synthetic.csv';create_csv(self.csv)
    def save(self,name,obj):
        x=self.path/name;x.write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8');return x
    def test_future_all_metrics_and_uniform_baseline(self):
        z=n.score([self.csv],[self.save('r.json',rank()),self.save('c.json',corner())])
        self.assertEqual(z['summary']['n_races'],1)
        self.assertEqual(z['summary']['m3_top3_hits'],3)
        self.assertEqual(z['summary']['first_corner_mae'],0.)
        self.assertEqual(z['summary']['c3_races'],1)
        self.assertLess(z['summary']['c3_brier4'],z['summary']['c3_uniform_baseline_brier4'])
        self.assertLess(z['summary']['c4_brier4'],z['summary']['c4_uniform_baseline_brier4'])
    def test_old_date_cannot_be_called_independent(self):
        x=rank(date='2026-10-04',ts='2026-10-03T13:00:00+09:00')
        z=n.score([self.csv],[self.save('old.json',x)])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'race_number_missing_nonunique_or_unmatched')
        create_csv(self.csv,'2026-10-04')
        z=n.score([self.csv],[self.save('old.json',x)])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'not_new_independent_race_date')
    def test_same_day_without_schedule_is_held_and_with_official_start_allowed(self):
        snap=rank(ts='2026-11-29T13:00:00+09:00')
        x=self.save('r.json',snap)
        self.assertEqual(n.score([self.csv],[x])['held'][0]['code'],'same_day_without_confirmed_official_post_time')
        sch={('2026-11-29','東京',11):{'post_time_jst':'2026-11-29T15:30:00+09:00','source':'fixture'}}
        z=n.score([self.csv],[x],official_schedule=sch)
        self.assertEqual(z['summary']['n_races'],1)
        sch[('2026-11-29','東京',11)]['post_time_jst']='2026-11-29T12:00:00+09:00'
        z=n.score([self.csv],[x],official_schedule=sch)
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'prediction_not_before_post_time')
    def test_wrong_runner_number_name_never_relabel_from_result(self):
        x=rank();x['runners'][0]['no']='13'
        z=n.score([self.csv],[self.save('bad.json',x)])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'roster_mismatch')
    def test_duplicate_snapshots_are_both_held(self):
        z=n.score([self.csv],[self.save('r1.json',rank()),self.save('r2.json',rank())])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertTrue(any(x['code']=='duplicate_prediction' for x in z['held']))
    def test_tie_across_boundary_soft_labels(self):
        create_csv(self.csv,tie=True)
        rows=n.result_index([self.csv])[0][('2026-11-29','東京',11)]
        labels=n.tie_soft_labels(rows,'通過順3')
        self.assertIsNotNone(labels)
        self.assertAlmostEqual(labels['1'][0],1)
        self.assertAlmostEqual(labels['2'][0],1)
    def test_missing_corner_stage_not_scored_as_loss(self):
        create_csv(self.csv,with_missing=True)
        z=n.score([self.csv],[self.save('corner.json',corner())])
        self.assertEqual(z['summary']['c4_races'],0)
        self.assertEqual(z['summary']['c3_races'],1)
        self.assertTrue(any(x['code']=='stage_corner_ties_or_missing' for x in z['held']))
    def test_bad_probabilities_are_held(self):
        x=corner();x['stagePredictions']['c3']['rows'][0]['probabilities']=[.9,.9,0,0]
        z=n.score([self.csv],[self.save('bad.json',x)])
        self.assertEqual(z['summary']['c3_races'],0)
        self.assertEqual(z['summary']['c4_races'],1)
    def test_version_change_is_held(self):
        x=corner();x['stageModelVersion']='future-unreviewed-v2'
        z=n.score([self.csv],[self.save('wrong_version.json',x)])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'wrong_stage_model_or_parser_version')
    def test_old_result_as_future_never_counts(self):
        create_csv(self.csv,'2026-10-04')
        z=n.score([self.csv],[])
        self.assertEqual(z['summary']['n_results_races'],1)
        self.assertEqual(z['summary']['historical_eligible_races_before_freeze'],1)
        self.assertEqual(z['summary']['eligible_target_races_after_freeze'],0)
    def test_race_name_mismatch_holds(self):
        x=corner();x['race']['raceName']='別レース'
        z=n.score([self.csv],[self.save('bad.json',x)])
        self.assertEqual(z['summary']['n_races'],0)
        self.assertEqual(z['held'][0]['code'],'race_number_missing_nonunique_or_unmatched')

if __name__=='__main__':unittest.main()