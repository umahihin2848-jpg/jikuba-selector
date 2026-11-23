#!/usr/bin/env python3
"""H013 exploratory, fixed-rule historical-risk audit for course-specific 4C traps.
Strictly as-of horse history and retrospective, final-odds market reference.
No current-race actual 4C used as predictor; no live Ability/M3 edits.
"""
import sys, pathlib, json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler,OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score,brier_score_loss
ROOT=pathlib.Path('/mnt/data')
OUT=ROOT/'H013_全国4角危険位置_20261123';OUT.mkdir(exist_ok=True)
H12=ROOT/'H012_全国4角と全ラップ_20261123';sys.path.insert(0,str(H12))
from h012_asof_4c_all_courses import build,parse_hist,create_features
SEED=20261123

def draw_bootstrap_ci(df, col, reps=2500):
    rng=np.random.default_rng(SEED)
    # race cluster, stable, race-level sum; use number of races as denominator
    g=df.groupby('rid')[col].sum().to_numpy(dtype=float);n=len(g)
    return [float(v) for v in np.quantile(g[rng.integers(0,n,size=(reps,n))].sum(axis=1),[.025,.975])] if n else [None,None]

def metric_summary(df, label):
    q=float(df.q.sum()); k=int(df.top3.sum()); num=int(len(df)); nr=df.rid.nunique()
    return {'label':label,'horses':num,'races':int(nr),'actual_top3':k,'expected_market_top3':round(q,4),'actual_minus_expected':round(k-q,4),'actual_rate':round(k/num,4) if num else None,'expected_rate':round(q/num,4) if num else None,'ratio_actual_to_expected':round(k/q,4) if q else None,'race_cluster_residual_sum_ci95':draw_bootstrap_ci(df.assign(residual=df.top3-df.q),'residual') if num else [None,None]}

def make_models():
    _,horse,_,_=build(); by,hist_audit=parse_hist(); features,coverage=create_features(horse,by)
    # Need actual fixed market q in same exact order; build() horse order matches feature creation
    assert len(features)==len(horse) and (features['rid'].to_numpy()==horse['rid'].to_numpy()).all()
    assert (features['horse_label'].to_numpy()==horse['name'].to_numpy()).all()
    features['q']=horse.q.to_numpy(); features['top3']=horse.top3.to_numpy();features['c4norm']=horse.c4_norm.to_numpy()
    features['n']=horse.n.to_numpy();features['no']=horse.no.to_numpy();features['date']=horse.date.to_numpy();features['name']=horse.name.to_numpy()
    features['venue']=horse.venue.to_numpy();features['surface']=horse.surface.to_numpy();features['distance']=horse.distance.to_numpy()
    features['is_fav']=horse.is_favorite.to_numpy()
    features['band']=pd.cut(features.c4norm,bins=[-0.001,.25,.50,.75,1.001],labels=['前25%','前中25-50%','後中50-75%','最後方25%'],include_lowest=True).astype(str)
    train=features.year.between(2019,2023);test=features.year.between(2024,2026)
    numeric=['gate','hist_c4_last','hist_c4_recency','hist_c4_median','hist_c4_similar','hist_sd','history_n']
    m=Pipeline([('col',ColumnTransformer([('num',StandardScaler(),numeric),('profile',OneHotEncoder(handle_unknown='ignore'),['profile'])])),('lr',LogisticRegression(C=2,solver='lbfgs',max_iter=320))]);m.fit(features.loc[train,numeric+['profile']],features.loc[train,'target_back4'])
    features['pback']=m.predict_proba(features[numeric+['profile']])[:,1]
    return features,hist_audit,coverage

def evaluate():
    df,audit,coverage=make_models()
    # Course-level severity use 2016-2023 previous races, distinct from 2024+ diagnostic.
    train=df.year<=2023;test=df.year>=2024
    # Pooled estimated actual-to-expected ratio (historical hindsight location) based on back half
    hist=df.loc[train & (df.target_back4==1)]
    course=hist.groupby('profile').agg(n_horses=('q','size'),n_races=('rid','nunique'),actual=('top3','sum'),expected=('q','sum')).reset_index()
    course['raw_ratio']=course.actual/course.expected
    # shrunk toward 1 using 15 equivalent market-expected successes, not tuned
    course['shrunk_ratio']=(course.actual+15)/(course.expected+15)
    course['severity']=1-course.shrunk_ratio
    course['course_severe']=(course.n_races>=30)&(course.n_horses>=100)&(course.shrunk_ratio<=.80)
    course['coverage']=np.select([course.n_races>=50,course.n_races>=30,course.n_races>=15],['50R以上','30-49R','15-29R'],default='少数例')
    # Pre-registered fixed criteria: poor back-half conversion and high probability of being back at 4C
    d=df.loc[test].merge(course[['profile','n_horses','n_races','shrunk_ratio','severity','course_severe']],on='profile',how='left')
    d['course_severe']=d.course_severe.fillna(False).astype(bool)
    d['predicted_risk']=d.course_severe & (d.pback>=.7)
    # Strong prospects have at least ~15% market-derived probability 3rd+, value is retrospective
    d['strong_market_candidate']=d.q>=.15
    d['risk_strong']=d.predicted_risk & d.strong_market_candidate
    d['risk_pop_top4']=d.predicted_risk & (d.closing_odds<=12.0) # optional diagnostics, not official popularity
    d['score']=d.pback*d.severity.fillna(0).clip(lower=0)
    metrics={
      'train_n_races':int(df.loc[train].rid.nunique()),'test_n_races':int(d.rid.nunique()),'test_n_horses':int(len(d)),
      'severe_course_count':int(course.course_severe.sum()),'severe_courses':course.loc[course.course_severe,'profile'].tolist(),
      'actual_back_4c':metric_summary(d[d.target_back4==1],'actual_back4_OBSERVATIONAL_POSTRACE'),
      'predicted_risk_all':metric_summary(d[d.predicted_risk],'high_pback_course_severe_all'),
      'predicted_risk_strong':metric_summary(d[d.risk_strong],'high_pback_course_severe_market_q>=.15'),
      'nonrisk_strong_same_severe_courses':metric_summary(d[d.course_severe & d.strong_market_candidate & ~d.predicted_risk],'nonrisk_strong_on_same_severe_courses'),
      'all_strong':metric_summary(d[d.strong_market_candidate],'all_market_q>=.15'),
      'risk_top4_odds_proxy':metric_summary(d[d.risk_pop_top4],'risk_odds<=12.0'),
      'coverage':coverage,'history_audit':audit}
    # Year splits separate, graded condition
    metrics['by_year']={str(k):{'flagged_strong':metric_summary(v[v.risk_strong],str(k)), 'flagged_all':metric_summary(v[v.predicted_risk],str(k))} for k,v in d.groupby('year')}
    # Avoid introducing circular market true final odds as feature: risk uses only pback severity train.
    assert d.predicted_risk.equals(d.course_severe & (d.pback>=.7))
    assert (d.n>=12).all() and d.rid.nunique()==990
    # Exports PRIVATE horses: risk flagged, historical as-of score. Exclude current race 4C/actual in usable version.
    v=d[d.predicted_risk].sort_values(['date','rid','score'],ascending=[False,True,False]).copy()
    v['判定']='4角後方に置かれやすい＋同コースの後方実績が低い（研究版）'
    keep=['date','rid','profile','no','name','pback','shrunk_ratio','score','history_n','closing_odds','q','top3','c4norm','n_races']
    v[keep].rename(columns={'date':'日付','rid':'レースID','profile':'コース','no':'馬番','name':'馬名','pback':'予測4角後方確率','shrunk_ratio':'過去後方の市場対比好走比率','score':'危険スコア','history_n':'過去5走充足割合','closing_odds':'確定単勝オッズ※予測入力なし','q':'最終市場基準3着内確率※後付比較','top3':'実際の3着内※事後評価','c4norm':'実際の4角相対位置※事後評価','n_races':'後方リスク推定に使用した過去レース数'}).to_csv(OUT/'H013_危険馬_過去検証_PRIVATE.csv',index=False,encoding='utf-8-sig')
    # Anonymized course-level heldout diagnostic
    cc=d.groupby('profile').agg(test_races=('rid','nunique'),test_horses=('top3','size'),risk_flagged=('predicted_risk','sum'),risk_strong=('risk_strong','sum')).reset_index()
    cc=cc.merge(course,on='profile',how='left')
    cc.to_csv(OUT/'H013_全国コース別_後方危険判定.csv',index=False,encoding='utf-8-sig')
    metrics['note']='All severity scores are past-course diagnostic post-4C outcome ratios to closing market proxy, NOT causal proof; risk flagged pre-race using past-only horse C4. 2024-26 historically mined years; no exact live M3 Ability comparison. Strong group market q based on postrace closing odds used only to audit value, NOT a usable T-15 filter.'
    (OUT/'H013_概要結果.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in metrics.items() if k not in ('history_audit','coverage','by_year')},ensure_ascii=False,indent=2))
    print('by_year',json.dumps(metrics['by_year'],ensure_ascii=False))
    return d,course,metrics
if __name__=='__main__':evaluate()