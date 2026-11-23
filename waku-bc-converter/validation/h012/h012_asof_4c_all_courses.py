#!/usr/bin/env python3
"""H012-B: nationwide as-of historical 4C back-half prediction. Research only.
No current-race 4C or lap timings in features; no model/ability/bet modification.
"""
from __future__ import annotations
import sys, pickle, collections, pathlib, json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score,brier_score_loss,log_loss
ROOT=pathlib.Path('/mnt/data');OUT=ROOT/'H012_全国4角と全ラップ_20261123';sys.path.insert(0,str(OUT))
from h012_national_stage import build,ci_mean
SEED=20261123

def norm_name(x):return str(x).replace(' ','').replace('　','').strip()

def parse_hist():
    histpath=OUT/'h012_history_private.pkl'
    if histpath.exists():
        src=pickle.load(open(histpath,'rb'))
    elif (ROOT/'history_unique_tmp.pkl').exists():
        src=pickle.load(open(ROOT/'history_unique_tmp.pkl','rb'))
    else:
        from h012_prepare_history import prepare_history
        prepare_history()
        src=pickle.load(open(histpath,'rb'))
    by=collections.defaultdict(list);aud=collections.Counter()
    for rec in src:
        name=norm_name(rec.get('馬名',''));rid=str(rec.get('レースID(新・馬番無16桁)','')).strip();date=str(rec.get('date','')).replace('-','')
        if not name or len(rid)!=16 or not rid.isdigit() or date!=rid[:8]:aud['bad_rid_or_date']+=1;continue
        try:n=int(rec.get('出走頭数') or rec.get('頭数'));c4=int(rec.get('通過4'));dist=int(rec.get('距離'))
        except:aud['invalid_numbers']+=1;continue
        if not (5<=n<=20 and 1<=c4<=n and 800<=dist<=3600):aud['invalid_range']+=1;continue
        if str(rec.get('異常コード','')).strip() not in ('','0'):aud['abnormal']+=1;continue
        by[name].append({'rid':rid,'date':int(date),'surface':str(rec.get('芝・ダート','')),'dist':dist,'venue':str(rec.get('場所','')),'c4rel':(c4-.5)/n})
    for name,v in by.items():
        v.sort(key=lambda x:x['date'],reverse=True)
        seen=set();ded=[]
        for x in v:
            if x['rid'] in seen:aud['duplicate_rid']+=1;continue
            seen.add(x['rid']);ded.append(x)
        by[name]=ded
    aud['names']=len(by);aud['unique_hist_entries']=sum(map(len,by.values()))
    return by,aud

def create_features(df,by):
    feat=[];coverage=collections.Counter()
    for row in df.itertuples(index=False):
        # Full actual 4C in row is used ONLY in target, never in predictor.
        history=[x for x in by.get(norm_name(row.name),[]) if x['date']<int(row.date) and x['surface']==row.surface][:5]
        if any(x['date']>=int(row.date) for x in history):raise RuntimeError('Future race leaked')
        vals=np.asarray([x['c4rel'] for x in history])
        median=float(np.median(vals)) if len(vals) else .5
        weights=np.power(.82,np.arange(len(vals)))
        w=float(np.average(vals,weights=weights)) if len(vals) else .5
        close=[x['c4rel'] for x in history if abs(x['dist']-row.distance)<=200]
        similar=float(np.mean(close)) if len(close)>=2 else w
        feat.append({'rid':row.rid,'year':row.year,'profile':row.profile,'surface':row.surface,
            'gate':(row.no-.5)/row.n,'hist_c4_last':float(vals[0]) if len(vals) else .5,
            'hist_c4_recency':w,'hist_c4_median':median,
            'hist_c4_similar':similar,'hist_sd':float(vals.std()) if len(vals)>1 else .25,
            'history_n':len(vals)/5,'target_back4':int(row.back), 'actual_top3':int(row.top3),'closing_odds':row.closing_odds,
            'horse_label':row.name})
        coverage['with_any']+=bool(len(history));coverage['with_3']+=len(history)>=3
    z=pd.DataFrame(feat)
    return z,dict(coverage)

def train_eval():
    _,hf,cnt,lc=build();by,history_audit=parse_hist();df,coverage=create_features(hf,by)
    train=df.year.between(2019,2023);test=df.year.between(2024,2026)
    assert (train & test).sum()==0 and train.sum()>5000 and test.sum()>4000
    numeric_basic=['gate'];numeric_more=['gate','hist_c4_last','hist_c4_recency','hist_c4_median','hist_c4_similar','hist_sd','history_n']
    cats=['profile']
    def model(num):
      ct=ColumnTransformer([('num',StandardScaler(),num),('profile',OneHotEncoder(handle_unknown='ignore'),cats)])
      return Pipeline([('col',ct),('lr',LogisticRegression(C=2,solver='lbfgs',max_iter=320))])
    preds={}
    for label,num in [('course_gate',numeric_basic),('course_gate_prior4c',numeric_more)]:
      m=model(num);m.fit(df.loc[train,num+cats],df.loc[train,'target_back4']);preds[label]=m.predict_proba(df[num+cats])[:,1]
    year_rows=[]
    for k,sub in [('train_2019_2023',train),('test_2024_2026',test),('test_2024',df.year==2024),('test_2025',df.year==2025),('test_2026',df.year==2026)]:
      d=df.loc[sub];y=d.target_back4.to_numpy()
      row={'period':k,'races':int(d.rid.nunique()),'horses':len(d),'history_any_rate':float((d.history_n>0).mean()),'history_3plus_rate':float((d.history_n>=.6).mean())}
      for label,p in preds.items():
        p=p[sub.to_numpy()]
        row[label+'_auc']=float(roc_auc_score(y,p)) if y.min()!=y.max() else None
        row[label+'_brier']=float(brier_score_loss(y,p))
      row['brier_gain_prior4c']=row['course_gate_brier']-row['course_gate_prior4c_brier']
      year_rows.append(row)
    year_table=pd.DataFrame(year_rows)
    df['q_base']=preds['course_gate'];df['q_hist']=preds['course_gate_prior4c']
    test_df=df[test].copy()
    test_df['brier_gain']=(test_df.q_base-test_df.target_back4)**2-(test_df.q_hist-test_df.target_back4)**2
    race=test_df.groupby('rid',sort=False).agg(gain=('brier_gain','mean'),year=('year','first'))
    rng=np.random.default_rng(SEED);vals=race.gain.to_numpy();ci=ci_mean(vals,rng,reps=6000)
    # report general across course diversity and yearly cohort
    profiles=test_df.groupby('profile').agg(n_races=('rid','nunique'),n_horses=('target_back4','size'),actual_back_pct=('target_back4','mean'),gain=('brier_gain','mean'),history3plus=('history_n',lambda x:float((x>=.6).mean())))
    profiles=profiles.reset_index();profiles['actual_back_pct']*=100;profiles['history3plus']*=100
    year_table.to_csv(OUT/'H012_全国4角_過去走予測_年度別.csv',index=False,encoding='utf-8-sig')
    profiles.to_csv(OUT/'H012_全国4角_事前予測_コース別精度.csv',index=False,encoding='utf-8-sig')
    # prevent public leakage of horse names or race identifiers
    public={'train_2019_2023_test_2024_2026_exploratory':year_rows,
      'strict_asof_history_audit':history_audit,
      'coverage':coverage,'paired_race_mean_brier_gain_test':float(vals.mean()),
      'paired_race_cluster_ci95':list(ci),
      'note':'Only true past starts of same horse+surface used in features. Current result 4C is target only. Evaluations use previously explored years and are not independent confirmations. No individual sectional pace inferred, no purchase recommendation.'}
    (OUT/'H012_全国4角_事前予測結果.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(public,ensure_ascii=False,indent=2))
    return df
if __name__=='__main__':train_eval()