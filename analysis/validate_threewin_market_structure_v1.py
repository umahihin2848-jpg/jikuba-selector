#!/usr/bin/env python3
import sys,re,unicodedata
import numpy as np
import pandas as pd
from scipy.stats import fisher_exact,chi2_contingency
from statsmodels.stats.proportion import proportion_confint
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,brier_score_loss,log_loss

CSV=sys.argv[1] if len(sys.argv)>1 else 'umade.csv'
df=pd.read_csv(CSV,encoding='cp932')

def finish(x):
    s=unicodedata.normalize('NFKC',str(x)).strip();m=re.match(r'^(\d+)',s)
    return int(m.group(1)) if m else np.nan

d=df[df['クラス名'].astype(str).eq('3勝')].copy()
d['race_id']=d['レースID(新)'].astype(str).str[:-2]
d['finish']=d['着順'].map(finish)
d['pop']=pd.to_numeric(d['人気'],errors='coerce')
ds=d['日付'].astype(str).str.zfill(6);d['year']=2000+pd.to_numeric(ds.str[:2],errors='coerce')
g=d.groupby('race_id',sort=False)
r=g.agg(year=('year','first'),venue=('場所','first'),distance_raw=('距離','first'),surface=('芝・ダ','first'),going=('馬場状態','first'),field=('頭数','first')).reset_index()
r['event']=r['race_id'].map(g.apply(lambda x:int(((x['pop']>=7)&(x['finish']<=3)).any()),include_groups=False))
r['field']=pd.to_numeric(r['field'],errors='coerce')
r['distance']=pd.to_numeric(r['distance_raw'].astype(str).str.extract(r'(\d+)')[0],errors='coerce')
r=r[(r.year>=2020)&(r.year<=2026)].copy()
r['field_bin']=np.select([r.field<=11,r.field<=14],['<=11','12-14'],default='>=15')
r['dist_bin']=np.select([r.distance<=1400,r.distance<=1800,r.distance<=2200,r.distance<=2600],['<=1400','1401-1800','1801-2200','2201-2600'],default='>=2601')
train=r[r.year<=2023].copy();test=r[r.year>=2024].copy()
print('development',len(train),int(train.event.sum()),train.event.mean())
print('oos',len(test),int(test.event.sum()),test.event.mean())
assert len(train)==841 and len(test)==587
for b in ['<=11','12-14','>=15']:
    a=train[train.field_bin==b];o=test[test.field_bin==b]
    lo,hi=proportion_confint(int(o.event.sum()),len(o),method='wilson')
    print(b,'train',len(a),int(a.event.sum()),a.event.mean(),'oos',len(o),int(o.event.sum()),o.event.mean(),'CI',lo,hi)
ct=pd.crosstab(test.field_bin,test.event)
print('chi2_p',chi2_contingency(ct).pvalue)
for a,b in [('<=11','12-14'),('<=11','>=15'),('12-14','>=15')]:
    x=test[test.field_bin==a].event;y=test[test.field_bin==b].event
    print(a,b,'fisher_p',fisher_exact([[int(x.sum()),len(x)-int(x.sum())],[int(y.sum()),len(y)-int(y.sum())]]).pvalue)
for name,fs in {'field_only':['field_bin'],'full':['venue','dist_bin','field_bin','going','surface']}.items():
    m=Pipeline([('pre',ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore',drop='first'),fs)])),('lr',LogisticRegression(C=1e6,max_iter=5000))])
    m.fit(train[fs],train.event);p=m.predict_proba(test[fs])[:,1]
    print(name,'AUC',roc_auc_score(test.event,p),'Brier',brier_score_loss(test.event,p),'LogLoss',log_loss(test.event,p))
print(test.groupby(['year','field_bin'],observed=True).event.agg(['count','sum','mean']))
