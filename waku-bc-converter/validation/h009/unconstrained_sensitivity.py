import h009_venue_specificity as m, numpy as np,json
from scipy.optimize import minimize_scalar
from pathlib import Path
rows,_=m.load_data();rows,_=m.make_features(rows)
train=[r for r in rows if 2019<=r['year']<=2023];test=[r for r in rows if r['year']>=2024]
frozen=m.fit(train,True)
rr,starts,group,q,x,y=m.prep(train)
def obj(b):
  cc=frozen.copy();cc[1]=float(b)
  return np.mean((m.project(q,x,cc,starts,group)-y)**2)+.00001*b*b
z=minimize_scalar(obj,bounds=(-5,5),method='bounded',options={'xatol':.000001})
free=frozen.copy();free[1]=float(z.x)
base_metrics,rb=m.evaluate(test,frozen,frozen)
free_metrics,rf=m.evaluate(test,frozen,free)
gain=m.bootstrap([a['form_brier']-b['venue_brier'] for a,b in zip(rb,rf)])
res={'2019_23_free_signed_beta':float(free[1]),'2024_26_form_brier':base_metrics['form']['brier'],'2024_26_free_venue_brier':free_metrics['venue']['brier'],'gain_ci':gain,
'explanation':'Unconstrained signed coefficient is only a sensitivity check. A negative alpha would mean reversal of historical venue preference, not positive repeatable track preference; it worsened later years.'}
Path('/mnt/data/h009_tokyo_nakayama_20261123/H009_NEGATIVE_CONTROL.json').write_text(json.dumps(res,ensure_ascii=False,indent=2));print(res)