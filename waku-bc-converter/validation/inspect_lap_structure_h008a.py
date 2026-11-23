import numpy as np, pandas as pd, re, json
from h008_lap_core import parse_date, phase_metrics
from pathlib import Path
p=Path(__file__).parent
L=pd.read_csv('/mnt/data/lap2016_2026(1).csv',encoding='cp932',low_memory=False)
S=pd.concat([pd.read_csv('/mnt/data/2026_2025_seiseki.csv',encoding='cp932',low_memory=False),pd.read_csv('/mnt/data/2026seiseki.csv',encoding='cp932',low_memory=False)],ignore_index=True)
def dt(x):
    try: return parse_date(x)
    except ValueError: return -1
L['race_date']=L['日付'].map(dt)
S['race_date']=20000000+S['年'].astype(int)*10000+S['月'].astype(int)*100+S['日'].astype(int)
venue_map=dict(zip('札函福新東中名京阪小','札幌 函館 福島 新潟 東京 中山 中京 京都 阪神 小倉'.split()))
L['venue']=L['開催'].astype(str).str.extract(r'([札函福新東中名京阪小])')[0].map(venue_map)
key=['race_date','venue','レース名']
S['venue']=S['場所']
R=S.drop_duplicates(['race_date','venue','レース名'],keep='first').copy()
J=L.merge(R,on=key,how='inner',suffixes=('_lap','_result'))
J['dist']=pd.to_numeric(J['距離'],errors='coerce');J['field']=pd.to_numeric(J['頭数_result'],errors='coerce');J['cls']=pd.to_numeric(J['クラスコード'],errors='coerce');J['surface']=J['芝・ダ'].astype(str)
J['year']=J['race_date']//10000
J=J.loc[J['cls'].isin([67,115,131,163,179,195])&(J['field'].between(12,18)) & J['surface'].eq('芝') & J['dist'].isin([1200,1600,1800,2000])].copy()
def parse(row):
    return phase_metrics(row['ラップタイム'],row['dist'])
metrics=[];good=[]
for _,r in J.iterrows():
    f=parse(r)
    if f is None: continue
    metrics.append({k:v for k,v in f.items() if k!='splits'});good.append(r)
A=pd.DataFrame(good).reset_index(drop=True);A=pd.concat([A,pd.DataFrame(metrics)],axis=1)
A['profile']=A['venue']+'芝'+A['dist'].astype(str)
A['tier']=np.where(A['cls'].isin([131,163,179,195]),'graded','3win_open_L')
profiles=['東京芝1600','東京芝1800','東京芝2000','中山芝1200','中山芝1600','中山芝1800','中山芝2000']
O=A[A['profile'].isin(profiles)].copy()
assert not O.duplicated(['race_date','venue','レース名']).any(), 'Duplicate race keys in selected course set'
means={profile:np.mean(np.stack([[float(q) for q in z.split('-')] for z in g['ラップタイム']]),axis=0).round(4).tolist() for profile,g in O[O.dist==1800].groupby('profile')}
G=O.groupby('profile',sort=False).agg(races=('profile','size'),mean_middle_over_early=('middle_over_early','mean'),mean_middle_over_late=('middle_over_late','mean'),mean_lull_index=('lull_index','mean'),lull_fraction=('lull_both_0p3','mean'),early2=('early2_no_start','mean'),middle=('middle','mean'),late3=('late3','mean'),final_furlong_slow=('final_furlong_slower','mean')).reindex(profiles)
print('source lap rows',len(L),'result races',len(R),'exact matched',len(L.merge(R,on=key,how='inner')),'eligible filtered',len(J),'valid clean split',len(A))
print('\nMAIN PROFILES:\n',G.to_string(float_format=lambda v:f'{v:.3f}'))
for tier in ['graded','3win_open_L']:
    g=O[(O['tier']==tier)&(O['dist']==1800)&(O['venue'].isin(['東京','中山']))].groupby('profile').agg(n=('profile','size'),lull=('lull_index','mean'),rate=('lull_both_0p3','mean'),middle_over_early=('middle_over_early','mean'),middle_over_late=('middle_over_late','mean'))
    print('\n1800 '+tier+'\n',g.to_string(float_format=lambda v:f'{v:.3f}'))
print('\n1800 race yearly fractions:\n',O[O['dist']==1800].groupby(['year','profile']).agg(n=('profile','size'),lull=('lull_index','mean'),rate=('lull_both_0p3','mean')).round(3).to_string())
# Race-level bootstrap diff to avoid horse pseudo-replication
B=6000;rng=np.random.default_rng(20261123)
def bootstrap_diff(col,subset):
    x=subset.loc[subset.profile=='東京芝1800',col].dropna().to_numpy();y=subset.loc[subset.profile=='中山芝1800',col].dropna().to_numpy()
    if len(x)<15 or len(y)<15:return None
    dif=x.mean()-y.mean(); bs=[]
    for _ in range(B):bs.append(rng.choice(x,len(x),replace=True).mean()-rng.choice(y,len(y),replace=True).mean())
    return {'Tokyo_minus_Nakayama':float(dif),'CI95':list(map(float,np.quantile(bs,[.025,.975]))),'nTokyo':len(x),'nNakayama':len(y)}
bootstrap={tier:{col:bootstrap_diff(col,O[(O['dist']==1800)&(O['tier'].eq(tier) if tier!='all' else O['dist']==1800)]) for col in ['lull_index','lull_both_0p3','middle_over_late']} for tier in ['all','graded','3win_open_L']}
print('\nBOOTSTRAP DIFFS:\n',json.dumps(bootstrap,ensure_ascii=False,indent=2))
# empirical fractions showing existence within any course (not deterministic)
print('\nSpeed group month:\n',O.groupby(['profile','馬場状態_result']).size().head(40).to_string())
G.to_csv(p/'course_lap_summary.csv',encoding='utf-8-sig');O[['race_date','venue','dist','surface','cls','tier','field','profile','馬場状態_result','early2_no_start','middle','late3','middle_over_early','middle_over_late','lull_index','lull_both_0p3']].to_csv(p/'race_lap_audit_local.csv',index=False,encoding='utf-8-sig')
(p/'lap_shape_result.json').write_text(json.dumps({'coverage':{'lap_rows':len(L),'result_unique_races':len(R),'joined_exact':len(L.merge(R,on=key,how='inner')),'eligible_matched':len(J),'valid_splits':len(A),'main_profiles_races':len(O)},'table':G.replace({np.nan:None}).reset_index().to_dict(orient='records'),'bootstrap':bootstrap,'lap_1800_mean_200m_seconds':means},ensure_ascii=False,indent=2),encoding='utf-8')