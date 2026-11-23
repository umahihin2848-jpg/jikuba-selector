#!/usr/bin/env python3
"""N002: strictly forward-only scoring of frozen horse-position and M3 JSON.

Only scores immutable pre-race data, never trains/refits. A single outcome
record is constructed from CP932 TARGET CSV, and paired by verified horse NO +
name, not a fuzzy horse-name join. No external timestamp attestations supplied.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

FREEZE_DATE = dt.date(2026, 11, 23)
MIN_DATE = FREEZE_DATE + dt.timedelta(days=1)
CLASS_CODES = {'67':'3勝','115':'L','131':'OP','163':'G3','179':'G2','195':'G1'}
RANK_MODEL_VERSION = 'race-position-competition-v1-20261123'
CORNER_MODEL_VERSION = 'p3-70-20261123-a'
CORNER_PARSER_VERSION = 'target-csv-cache-p363-history-dedup-shadow'


def fail(code, msg):
    return {'status':'held','code':code,'reason':msg}


def date_string(s):
    if not isinstance(s, str):
        raise ValueError('date_not_string')
    try:
        return dt.date.fromisoformat(s.strip())
    except Exception as e:
        raise ValueError('invalid_date') from e


def normal_name(s):
    import unicodedata
    return unicodedata.normalize('NFKC', str(s or '')).strip().replace(' ', '').replace('\u3000', '')


def nint(s):
    if s is None or str(s).strip() == '':
        return None
    x = str(s).strip()
    return int(x) if x.isdecimal() else None


def prob4(p):
    if not isinstance(p, list) or len(p) != 4:
        return None
    try:
        z = [float(v) for v in p]
    except (ValueError, TypeError):
        return None
    if any(not math.isfinite(v) or v < 0 or v > 1 for v in z) or abs(sum(z)-1) > 1e-5:
        return None
    return z


def result_index(csv_files):
    grouped = defaultdict(list)
    bad = []
    for src in csv_files:
        with open(src, encoding='cp932', newline='') as f:
            reader = csv.DictReader(f)
            required = {'年','月','日','場所','レース番号','レース名','クラスコード','芝・ダ','距離','頭数','馬番','馬名','確定着順','通過順1','通過順2','通過順3','通過順4'}
            if not required.issubset(reader.fieldnames or []):
                bad.append({'file':Path(src).name, 'error':'unsupported_target_columns'})
                continue
            for row in reader:
                try:
                    yy = nint(row['年'])
                    year = 2000+yy if yy is not None and yy < 100 else yy
                    date = dt.date(year, int(row['月']), int(row['日']))
                    venue = normal_name(row['場所'])
                    race_num = nint(row['レース番号'])
                except (ValueError, TypeError):
                    bad.append({'file':Path(src).name,'error':'invalid_race_date_or_number'})
                    continue
                if not race_num or not venue:
                    continue
                key = (date.isoformat(), venue, race_num)
                grouped[key].append(row)
    return grouped, bad


def validate_race(rows, meta):
    if not rows:
        return None, 'race_not_found'
    first = rows[0]
    cl = str(first['クラスコード']).strip()
    n = nint(first['頭数'])
    if cl not in CLASS_CODES or n is None or not 12 <= n <= 18:
        return None, 'scope_mismatch'
    if any(str(x['クラスコード']).strip() != cl or nint(x['頭数']) != n for x in rows):
        return None, 'inconsistent_race_rows'
    if len(rows) != n:
        return None, 'outcome_field_incomplete'
    if len({nint(x['馬番']) for x in rows}) != n:
        return None, 'outcome_duplicate_numbers'
    if len({normal_name(x['馬名']) for x in rows}) != n:
        return None, 'outcome_duplicate_names'
    if str(first['芝・ダ']).strip() not in ('芝','ダ','ダート'):
        return None, 'nonflat_or_surface_unknown'
    if nint(first['距離']) != nint(meta.get('distance')):
        return None, 'distance_mismatch'
    if nint(meta.get('fieldSize',meta.get('field'))) != n:
        return None, 'field_mismatch'
    if normal_name(first['レース名']) != normal_name(meta.get('raceName',meta.get('name'))):
        return None, 'race_name_mismatch'
    grade = str(meta.get('grade','')).strip().upper()
    if grade and grade != CLASS_CODES[cl].upper():
        return None, 'grade_mismatch'
    surf = str(meta.get('surface','')).strip()
    if surf and (surf=='芝') != (str(first['芝・ダ']).strip()=='芝'):
        return None, 'surface_mismatch'
    return rows, None


def tie_soft_labels(rows, column):
    """Convert equal printed corner positions to fractional seat-occupation.

    For a tie at raw rank r spanning t horses, each gets 1/t of seats r..r+t-1.
    Fail closed when the printed ranks cannot be reconciled with N ranked seats.
    """
    n = len(rows)
    counts = defaultdict(list)
    for row in rows:
        k = nint(row.get(column))
        if k is None or k < 1 or k > n:
            return None
        counts[k].append(str(nint(row['馬番'])))
    occupied = []
    for k, names in sorted(counts.items()):
        occupied.append((k,len(names)))
    expected = 1
    for rank, size in occupied:
        if rank != expected:
            return None
        expected += size
    if expected != n+1:
        return None
    cuts = [0, math.ceil(n*.25), math.ceil(n*.5), math.ceil(n*.8), n]
    out={}
    for rank, nos in counts.items():
        v = [0.0]*4
        for seat in range(rank,rank+len(nos)):
            idx = next(i for i in range(4) if cuts[i] < seat <= cuts[i+1])
            v[idx] += 1/len(nos)
        for no in nos:
            out[no]=v
    return out


def match_roster(pred_rows, actual_rows, no_field='no'):
    if not isinstance(pred_rows,list) or len(pred_rows)!=len(actual_rows):
        return fail('roster_field_incomplete','出走全頭の予測が揃っていません')
    actual={str(nint(x['馬番'])):normal_name(x['馬名']) for x in actual_rows}
    observed={}
    for x in pred_rows:
        no=nint(x.get(no_field))
        name=normal_name(x.get('name'))
        if no is None or not name or str(no) in observed:
            return fail('invalid_prediction_roster','予測馬番・馬名の欠損・重複')
        observed[str(no)]=name
    if actual!=observed:
        return fail('roster_mismatch','予想馬番・馬名と確定結果の対応が不一致。結果から自動的に番号を振り直しません')
    return None


def get_meta(snapshot):
    schema=snapshot.get('schema')
    if schema=='rsa-rank-distribution-snapshot-v1':
        return snapshot.get('metadata') or {}
    if schema=='p3-71-three-stage-shadow-snapshot-v1':
        return snapshot.get('race') or {}
    return None


def snapshot_key(snap, result_idx):
    meta=get_meta(snap)
    if not meta:
        return None,'unrecognized_snapshot_schema'
    try:
        date=date_string(meta.get('date')).isoformat()
    except ValueError:
        return None,'invalid_snapshot_date'
    venue=normal_name(meta.get('venue'))
    rn=nint(meta.get('raceNumber',meta.get('raceNo')))
    if not venue:
        return None,'missing_venue'
    if rn:
        return (date,venue,rn),None
    # No race number in current saved model JSON; require one unique exact name,
    # never fuzzy-match to results or guess from next nearest race.
    keys=[key for key,rows in result_idx.items() if key[0]==date and key[1]==venue and normal_name(rows[0]['レース名'])==normal_name(meta.get('raceName',meta.get('name'))) and nint(rows[0]['距離'])==nint(meta.get('distance'))]
    if len(keys)!=1:
        return None,'race_number_missing_nonunique_or_unmatched'
    return keys[0],None


def freeze_valid(snapshot, min_date=MIN_DATE, official_post_time_jst=None):
    meta=get_meta(snapshot) or {}
    try:
        race_date=date_string(meta.get('date'))
    except ValueError:
        return 'invalid_date'
    if race_date < min_date:
        return 'not_new_independent_race_date'
    stamp=snapshot.get('capturedAt',snapshot.get('createdAt'))
    if not isinstance(stamp,str) or not stamp.strip():
        return 'no_prediction_creation_timestamp'
    try:
        captured=dt.datetime.fromisoformat(stamp.replace('Z','+00:00'))
        if captured.tzinfo is None:
            return 'creation_timestamp_without_timezone'
    except (ValueError, TypeError):
        return 'invalid_prediction_creation_timestamp'
    # Date-only cutoff is conservative; avoids relying on missing official start time.
    # A same-day capture cannot be independently proven before post time.
    capture_jst = captured.astimezone(dt.timezone(dt.timedelta(hours=9)))
    if capture_jst.date() > race_date:
        return 'prediction_after_race_date'
    if capture_jst.date() == race_date:
        # Current P3-71 / rank JSON does not include official post time.
        # An optional N002 sidecar may supply it; do not invent a post time.
        official = official_post_time_jst or snapshot.get('officialPostTimeJST')
        if not official:
            return 'same_day_without_confirmed_official_post_time'
        try:
            post = dt.datetime.fromisoformat(str(official).replace('Z','+00:00'))
            if post.tzinfo is None or post.astimezone(dt.timezone(dt.timedelta(hours=9))).date()!=race_date:
                return 'invalid_official_post_time'
        except (ValueError,TypeError):
            return 'invalid_official_post_time'
        if captured >= post:
            return 'prediction_not_before_post_time'
    if capture_jst.date()<FREEZE_DATE:
        return 'prediction_before_manifest_model_freeze'
    return None


def decode_rank(snap, rows):
    horses=snap.get('runners') or []
    error=match_roster(horses,rows)
    if error:return error
    truths={str(nint(r['馬番'])):r for r in rows}
    report={'status':'evaluated','horses':len(horses),'first_corner_mae_sum':0.0,'first_corner_mae_n':0,'m3_top3_correct':0,'m3_expected_count':3,'m3_available':False,'m3_top3_n':0,'notes':['最初に記録されたコーナーは発馬直後の実測ではありません']}
    ranks=[]
    for p in horses:
        no=str(nint(p['no']));truth=truths[no];observed=next((i for k in range(1,5) if (i:=nint(truth.get(f'通過順{k}'))) is not None and i>0),None)
        pred=p.get('simulatedExpectedRank')
        if observed and pred is not None:
            try:
                pred=float(pred)
                if math.isfinite(pred) and 1<=pred<=len(horses):
                    report['first_corner_mae_sum']+=abs(pred-observed)
                    report['first_corner_mae_n']+=1
            except (ValueError,TypeError):pass
        m3=((p.get('liveModelReference') or {}).get('m3') or {}).get('rank')
        if m3 is not None:
            try:
                v=int(m3)
                if 1<=v<=len(horses):ranks.append((v,no))
            except (ValueError,TypeError):pass
    if len(ranks)==len(horses):
        ranks.sort()
        if len({i for i,_ in ranks})==len(horses):
            report['m3_top3_n']=3
            report['m3_top3_correct']=sum(1 for _,no in ranks[:3] if nint(truths[no]['確定着順']) in (1,2,3))
            report['m3_available']=True
        else:
            report['notes'].append('M3同順位があり上位3頭を厳密選定できない')
    else:
        report['notes'].append('M3全頭順位欠損')
    if report['first_corner_mae_n'] == 0 and not report['m3_available']:
        return fail('rank_targets_unavailable','初位置の数値とM3順位がありません')
    return report


def decode_corner(snap, rows):
    out={'status':'evaluated','horses':len(rows)}
    metadata=snap.get('race') or {}
    entries=snap.get('virtualToActual') or []
    actualnos=[{'no':x.get('actualNo'),'name':x.get('name')} for x in entries]
    error=match_roster(actualnos,rows)
    if error:return error
    for stage,col in [('c3','通過順3'),('c4','通過順4')]:
        data=((snap.get('stagePredictions') or {}).get(stage) or {}).get('rows') or []
        error=match_roster(data,rows)
        if error:
            out[stage]={'status':'held','code':'stage_'+error['code']}
            continue
        actual=tie_soft_labels(rows,col)
        if actual is None:
            out[stage]={'status':'held','code':'stage_corner_ties_or_missing'}
            continue
        total=0.0;baseline=0.0;logloss=0.0;accurate=0.0;valid=True
        n=len(rows);seatcounts=[math.ceil(n*.25),math.ceil(n*.5)-math.ceil(n*.25),math.ceil(n*.8)-math.ceil(n*.5),n-math.ceil(n*.8)]
        uniform=[seats/n for seats in seatcounts]
        for entry in data:
            no=str(nint(entry['no']));ps=prob4(entry.get('probabilities'))
            ix=nint(entry.get('groupIndex'))
            if ps is None or ix is None or not 0<=ix<=3:
                valid=False;break
            a=actual[no]
            total+=sum((ps[i]-a[i])**2 for i in range(4))
            baseline+=sum((uniform[i]-a[i])**2 for i in range(4))
            logloss+=-sum(a[i]*math.log(max(ps[i],1e-15)) for i in range(4))
            accurate+=a[ix]
        out[stage]= {'status':'evaluated', 'brier4_sum':total,'uniform_brier4_sum':baseline,'brier4_improvement_sum':baseline-total,'logloss_sum':logloss,'soft_accuracy_sum':accurate,'n':len(rows)} if valid else {'status':'held','code':'invalid_stage_predictions'}
    return out


def score(results, snapshot_paths, min_date=MIN_DATE, official_schedule=None):
    index, malformed=result_index(results)
    accepted=defaultdict(dict)
    held=[]
    found=0
    schemas={'rsa-rank-distribution-snapshot-v1':'initial_and_m3','p3-71-three-stage-shadow-snapshot-v1':'c3_c4'}
    for file in snapshot_paths:
        try:
            raw=Path(file).read_bytes();obj=json.loads(raw)
        except (OSError,ValueError,UnicodeError) as e:
            held.append({'file':Path(file).name,**fail('json_read_error',str(e))});continue
        if not isinstance(obj,dict) or obj.get('schema') not in schemas:
            held.append({'file':Path(file).name,**fail('unsupported_schema','対象の予測JSON形式ではない')});continue
        found+=1
        if obj['schema']=='rsa-rank-distribution-snapshot-v1':
            if obj.get('modelVersion') != RANK_MODEL_VERSION:
                held.append({'file':Path(file).name,**fail('wrong_rank_model_version','保存したモデル版が凍結版と一致しない')});continue
        if obj['schema']=='p3-71-three-stage-shadow-snapshot-v1':
            if obj.get('stageModelVersion')!=CORNER_MODEL_VERSION or obj.get('parserVersion')!=CORNER_PARSER_VERSION:
                held.append({'file':Path(file).name,**fail('wrong_stage_model_or_parser_version','コーナーモデルと重複除去版CSVパーサーが凍結版と一致しない')});continue
        k,err=snapshot_key(obj,index)
        if err:
            held.append({'file':Path(file).name,**fail(err,'RIDが一意に照合できない')});continue
        post_time = (official_schedule or {}).get(k,{}).get('post_time_jst')
        er=freeze_valid(obj,min_date,post_time)
        if er:
            held.append({'file':Path(file).name,'key':k,**fail(er,'予測の固定時点／新規期間を保証できない')});continue
        kind=schemas[obj['schema']]
        if kind in accepted[k]:
            accepted[k][kind]['duplicates']=True
            held.append({'file':Path(file).name,'key':k,**fail('duplicate_prediction','同一レースに同形式の予測が複数。どちらも保留')})
            continue
        accepted[k][kind]={'snapshot':obj,'sha256':hashlib.sha256(raw).hexdigest(),'file':Path(file).name}
    summary={'n_races':0,'n_snapshots':found,'n_results_races':len(index),'eligible_target_races_after_freeze':0,'first_corner_mae':None,'first_corner_n':0,'m3_top3_hits':None,'m3_races':0,'c3_brier4':None,'c4_brier4':None,'c3_uniform_baseline_brier4':None,'c4_uniform_baseline_brier4':None,'c3_races':0,'c4_races':0,'held_items':0,'historical_eligible_races_before_freeze':0,'result_earliest_date':min((k[0] for k in index),default=None),'result_latest_date':max((k[0] for k in index),default=None)}
    total={'init_sum':0.0,'init_n':0,'m3_hits':0,'m3_n':0,'c3_sum':0,'c3_n':0,'c3_base_sum':0,'c4_sum':0,'c4_n':0,'c4_base_sum':0}
    for k,rr in index.items():
        try:d=date_string(k[0])
        except ValueError:continue
        eligible = str(rr[0].get('クラスコード')).strip() in CLASS_CODES and 12<=(nint(rr[0].get('頭数')) or 0)<=18
        if eligible and d>=min_date:
            summary['eligible_target_races_after_freeze']+=1
        if eligible and d<min_date:
            summary['historical_eligible_races_before_freeze']+=1
    race_rows=[]
    for key,bundles in sorted(accepted.items()):
        if any(x.get('duplicates') for x in bundles.values()):
            for item in bundles.values(): held.append({'file':item['file'],'key':key,**fail('duplicate_prediction','同じ種類の予測に重複があるため全件除外')})
            continue
        present={}
        for kind,item in bundles.items():
            rowset,err=validate_race(index.get(key),get_meta(item['snapshot']))
            if err:
                held.append({'file':item['file'],'key':key,**fail(err,'結果・予想の完全一致が必要')});continue
            x=decode_rank(item['snapshot'],rowset) if kind=='initial_and_m3' else decode_corner(item['snapshot'],rowset)
            if x.get('status')=='held':
                held.append({'file':item['file'],'key':key,**x});continue
            present[kind]={'file':item['file'],'sha256':item['sha256'],'metrics':x}
            if kind=='initial_and_m3':
                total['init_sum']+=x['first_corner_mae_sum'];total['init_n']+=x['first_corner_mae_n']
                if x['m3_available']:
                    total['m3_hits']+=x['m3_top3_correct'];total['m3_n']+=1
            else:
                for stage in ['c3','c4']:
                    y=x[stage]
                    if y['status']=='evaluated':
                        total[f'{stage}_sum']+=y['brier4_sum'];total[f'{stage}_base_sum']+=y['uniform_brier4_sum'];total[f'{stage}_n']+=y['n'];summary[f'{stage}_races']+=1
                    else:
                        held.append({'file':item['file'],'key':key,**fail(y['code'],'角の正解が欠損・同順位の処理不可')})
        if present:race_rows.append({'race':key,'snapshots':present})
    summary['n_races']=len(race_rows)
    summary['first_corner_n']=total['init_n'];summary['first_corner_mae']=total['init_sum']/total['init_n'] if total['init_n'] else None
    summary['m3_races']=total['m3_n'];summary['m3_top3_hits']=total['m3_hits'] if total['m3_n'] else None
    summary['c3_brier4']=total['c3_sum']/total['c3_n'] if total['c3_n'] else None
    summary['c4_brier4']=total['c4_sum']/total['c4_n'] if total['c4_n'] else None
    summary['c3_uniform_baseline_brier4']=total['c3_base_sum']/total['c3_n'] if total['c3_n'] else None
    summary['c4_uniform_baseline_brier4']=total['c4_base_sum']/total['c4_n'] if total['c4_n'] else None
    summary['held_items']=len(held)
    return {'schema':'rsa-n002-forward-score-v1', 'analysis_cutoff_after':(min_date-dt.timedelta(days=1)).isoformat(),
            'frozen_model_date':FREEZE_DATE.isoformat(), 'evidence_level':'self-reported snapshot timestamps only, not externally attested',
            'schedule_entries':len(official_schedule or {}),
            'primary_claim':'Only dates after model freeze; prior explored years are not validation',
            'summary':summary,'races':race_rows,'held':held,'result_file_errors':malformed}


def load_official_schedule(csvfile):
    if not csvfile:
        return {}
    d={}
    with open(csvfile,encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f)
        need={'date','venue','race_number','post_time_jst','source'}
        if not need.issubset(reader.fieldnames or []):
            raise ValueError('post_times_csv_required_columns: '+','.join(sorted(need)))
        for row in reader:
            key=(date_string(row['date']).isoformat(),normal_name(row['venue']),nint(row['race_number']))
            if key in d or not key[1] or not key[2]:
                raise ValueError('post_times_duplicate_or_invalid_race_key')
            if not str(row['source']).strip():
                raise ValueError('post_times_missing_source')
            try:
                post=dt.datetime.fromisoformat(row['post_time_jst'].replace('Z','+00:00'))
                if post.tzinfo is None or post.astimezone(dt.timezone(dt.timedelta(hours=9))).date()!=date_string(row['date']):
                    raise ValueError('post_times_timezone_or_date_invalid')
            except (TypeError,ValueError) as ex:
                raise ValueError('invalid_official_post_time') from ex
            d[key]={'post_time_jst':row['post_time_jst'],'source':row['source']}
    return d


def main(argv=None):
    p=argparse.ArgumentParser(description='Score strictly prospective N002 frozen predictions, without model refitting.')
    p.add_argument('--results',nargs='+',required=True,help='TARGET result CSV files, CP932')
    p.add_argument('--snapshots',nargs='*',default=[],help='pre-race JSON prediction snapshots')
    p.add_argument('--snapshot-dir',help='directory containing candidate *.json snapshots')
    p.add_argument('--post-times',help='external official scheduled-post times CSV; supplied separately so snapshots remain unchanged')
    p.add_argument('--out',required=True)
    args=p.parse_args(argv)
    ss=list(args.snapshots)
    if args.snapshot_dir:ss.extend(sorted(Path(args.snapshot_dir).rglob('*.json')))
    res=score(args.results,ss,official_schedule=load_official_schedule(args.post_times))
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'summary':res['summary'],'out':str(out),'result_file_errors':res['result_file_errors']},ensure_ascii=False,indent=2))
    return 0 if not res['result_file_errors'] else 2

if __name__=='__main__':
    raise SystemExit(main())