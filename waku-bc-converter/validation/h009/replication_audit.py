from h009_venue_specificity import load_data,descriptive
import collections,numpy as np,json
from pathlib import Path
rows,a=load_data()
groups=collections.defaultdict(lambda:collections.defaultdict(list))
for r in rows:groups[(r['name'],r['dist'])][r['venue']].append(r)
pairs=[]; raw_groups=[]
for k,g in groups.items():
 t=sorted(g['東京'],key=lambda x:x['date']);n=sorted(g['中山'],key=lambda x:x['date']);
 if len(t)<2 or len(n)<2:continue
 first=t[0]['resid']-n[0]['resid']
 last=t[-1]['resid']-n[-1]['resid']
 pairs.append((first,last,k[1],len(t),len(n)))
 raw_groups.append((np.array([x['resid'] for x in t]+[x['resid'] for x in n]),len(t)))
p=np.array([x[:2] for x in pairs])
pearson=float(np.corrcoef(p.T)[0,1]);sign=np.mean(np.sign(p[:,0])==np.sign(p[:,1]))
mask=(p[:,0]!=0)&(p[:,1]!=0)
print('pairs',len(p),'corr',pearson,'equal sign all',sign,'nonzero',mask.sum(),'nonzero same',np.mean(np.sign(p[mask,0])==np.sign(p[mask,1])))
rng=np.random.default_rng(20261123)
boot=[]
for _ in range(5000):
 x=p[rng.integers(0,len(p),len(p))]
 boot.append(np.corrcoef(x.T)[0,1])
print('corr CI',np.quantile(boot,[.025,.975]))
# Pair-specific exact distance observed differentiation vs within-horse randomized venue labels
observed=np.mean([abs(x[:n].mean()-x[n:].mean()) for x,n in raw_groups])
null=[]
for b in range(1500):
 diffs=[]
 for x,n in raw_groups:
  s=rng.permutation(x)
  diffs.append(abs(s[:n].mean()-s[n:].mean()))
 null.append(np.mean(diffs))
print('obs mean abs contrast',observed,'null',np.mean(null),'null CI',np.quantile(null,[.025,.975]),'excess',observed-np.mean(null),'p_upper',np.mean(np.array(null)>=observed))
# stable all comparisons: >=2+2; exact-distance 3 classes; 2-block check
out={'paired_horse_distance_n':len(p),'pearson_first_vs_last':pearson,'pearson_bootstrap95':np.quantile(boot,[.025,.975]).tolist(),'early_late_sign_same_nonzero_n':int(mask.sum()),'early_late_sign_same_nonzero_rate':float(np.mean(np.sign(p[mask,0])==np.sign(p[mask,1]))),'observed_average_abs_venue_residual_difference':float(observed),'within_horse_venue_shuffle_null_mean_abs_difference':float(np.mean(null)),'null95':np.quantile(null,[.025,.975]).tolist(),'permutation_p_ge_observed':float(np.mean(np.array(null)>=observed)),'method':'For horse×exact turf distance >=2 each, earlier and later venue residual differences; exchangeability shuffle ignores sequence and course field covariates; descriptive only.'}
Path('/mnt/data/h009_tokyo_nakayama_20261123/H009_REPLICATION.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(out)