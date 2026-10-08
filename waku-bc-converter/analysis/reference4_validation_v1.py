import pandas as pd, numpy as np, unicodedata
import scipy.stats as st
import statsmodels.api as sm
import statsmodels.formula.api as smf
from sklearn.metrics import roc_auc_score

UMADE='umade.csv'
HAITOU='2026_haitou.txt'
CUT=pd.Timestamp('2026-03-15')

def numcol(s):
    return pd.to_numeric(s.astype(str).map(lambda x: unicodedata.normalize('NFKC',x).strip()),errors='coerce')

def distbin(x):
    if x<=1400:return '<=1400'
    if x<=1800:return '1401-1800'
    if x<=2200:return '1801-2200'
    if x<=2600:return '2201-2600'
    return '>=2601'

def parse_hr(line):
    line=line.rstrip('\r\n'); key=line[11:27]
    def blocks(start,n):
        out=[]
        for i in range(n):
            b=line[start+i*16:start+(i+1)*16]
            if len(b)<16: continue
            combo=b[:4].strip(); pay=b[4:13].strip(); pop=b[13:16].strip()
            if combo and combo!='0000': out.append((combo,int(pay or 0),int(pop or 0)))
        return out
    return key,blocks(245,3),blocks(293,7)

df=pd.read_csv(UMADE,encoding='cp932',low_memory=False,dtype={'日付':str,'レースID(新)':str})
df['date']=pd.to_datetime('20'+df['日付'].str.zfill(6),format='%Y%m%d')
df['race_key']=df['レースID(新)'].str[:-2]
for c in ['着順','人気','頭数','距離.1','4角']:
    df[c+'_n']=numcol(df[c])
df=df.sort_values(['馬名','date','race_key'])
df['prev4c']=df.groupby('馬名')['4角_n'].shift(1)
df['year']=df.date.dt.year

g=df[df['クラス名'].isin(['Ｇ１','Ｇ２','Ｇ３'])].copy()
g['finish']=g['着順_n']; g['pop']=g['人気_n']; g['field_size']=g['頭数_n']; g['distance']=g['距離.1_n']
g['pre_front_last']=g['prev4c']<=3
meta=g.groupby('race_key').first().reset_index()
w=g[g.finish==1][['race_key','pop']].rename(columns={'pop':'winner_pop'})
t3=g[g.finish<=3].groupby('race_key').agg(any_longshot_top3=('pop',lambda x:int((x>=7).any()))).reset_index()
r=meta.merge(w,on='race_key').merge(t3,on='race_key')
r['longshot_win']=(r.winner_pop>=7).astype(int)
r['venue']=r['場所']; r['going']=r['馬場状態']; r['surface']=r['芝・ダ']; r['grade']=r['クラス名']
r['dist_bin']=r.distance.map(distbin); r['field_bin']=pd.cut(r.field_size,[0,11,14,99],labels=['<=11','12-14','>=15'])

# 1) structure validation, comparable to Reference 4 period
rv=r[(r.year>=2020)&(r.date<=CUT)].copy()
terms=['C(venue)','C(dist_bin)','C(field_bin)','C(going)','C(surface)','C(grade)','C(year)']
for outcome in ['longshot_win','any_longshot_top3']:
    full=smf.glm(outcome+' ~ '+'+'.join(terms),rv,family=sm.families.Binomial()).fit()
    print('\n',outcome,'n=',len(rv),'events=',rv[outcome].sum())
    for term in terms:
        red=smf.glm(outcome+' ~ '+'+'.join([x for x in terms if x!=term]),rv,family=sm.families.Binomial()).fit()
        lr=2*(full.llf-red.llf); d=int(full.df_model-red.df_model)
        print(term,'LRT p=',st.chi2.sf(lr,d))

# 2) Chukyo longshot + previous-start 4C<=3
ls=g[(g.year>=2020)&(g.date<=CUT)&(g['pop']>=7)].copy(); ls['place3']=(ls.finish<=3).astype(int)
ch=ls[ls['場所']=='中京'].copy(); ch['pop_band']=pd.cut(ch['pop'],[6,9,12,99],labels=['7-9','10-12','13+']); ch['dist_bin']=ch.distance.map(distbin)
mod=smf.glm('place3 ~ pre_front_last + C(pop_band)+C(dist_bin)+field_size+C(馬場状態)+C(芝・ダ)+C(クラス名)+C(year)',ch,family=sm.families.Binomial()).fit(cov_type='cluster',cov_kwds={'groups':ch.race_key})
term='pre_front_last[T.True]'; print('\nChukyo OR=',np.exp(mod.params[term]),'p=',mod.pvalues[term],'CI=',np.exp(mod.conf_int().loc[term].values))

# 3) correct jockey denominator
j=ls.groupby('騎手').agg(starts=('place3','size'),places=('place3','sum')); j['rate']=j.places/j.starts
print('\nJockeys >=50 longshot starts')
print(j[j.starts>=50].sort_values('rate',ascending=False).head(20))

# 4) true temporal OOS structural model: train 2020-25, test 2026
train=r[(r.year>=2020)&(r.year<=2025)].copy(); test=r[r.year==2026].copy()
wave=smf.glm('any_longshot_top3 ~ C(venue)+C(dist_bin)+C(field_bin)+C(going)+C(surface)+C(grade)',train,family=sm.families.Binomial()).fit()
train['p_wave']=wave.predict(train); test['p_wave']=wave.predict(test); thr=train.p_wave.quantile(.75); test['high_wave']=test.p_wave>=thr
print('\n2026 AUC=',roc_auc_score(test.any_longshot_top3,test.p_wave),'threshold=',thr)
print(test.groupby('high_wave').any_longshot_top3.agg(['mean','sum','count']))

# Parse 2026 HR payout file and run one-point exploratory combo rule
hrs={}
with open(HAITOU,encoding='cp932',errors='ignore') as f:
    for line in f:
        k,q,w=parse_hr(line); hrs[k]={'q':q,'w':w}
def payout(pair,arr):
    key=''.join(f'{int(x):02d}' for x in sorted(pair))
    for c,p,_ in arr:
        if c==key:return p
    return 0

g26=g[g.year==2026].copy(); wave_map=test.set_index('race_key')['high_wave'].to_dict(); bets=[]
for rk,x in g26.groupby('race_key'):
    fav=x[x['pop']==1].head(1); cand=x[(x['pop']>=7)&x.pre_front_last].sort_values(['pop','馬番']).head(1)
    if fav.empty or cand.empty: continue
    a=int(fav.iloc[0]['馬番']); b=int(cand.iloc[0]['馬番']); h=hrs[rk]
    bets.append((rk,wave_map[rk],payout((a,b),h['q']),payout((a,b),h['w'])))
b=pd.DataFrame(bets,columns=['race_key','high_wave','qpay','wpay'])
for name,x in [('all',b),('high',b[b.high_wave]),('low',b[~b.high_wave])]:
    print(name,len(x),'quinella ROI',x.qpay.sum()/(100*len(x)),'wide ROI',x.wpay.sum()/(100*len(x)),'combo ROI',(x.qpay.sum()+x.wpay.sum())/(200*len(x)))
