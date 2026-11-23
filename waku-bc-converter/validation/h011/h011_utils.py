"""Pure, side-effect-free guards for strictly pre-race 4th-corner history diagnostics."""
import numpy as np

def prior_unique(history, race_date, surface='芝', limit=5):
    """Use distinct verified prior races, never same-date/future, newest first.
    Record must have `date` YYYYMMDD integer, `rid` starts with exact YYYYMMDD.
    """
    seen=set();out=[]
    for r in sorted(history,key=lambda z:z['date'],reverse=True):
        rid=str(r.get('rid',''))
        date=int(r['date'])
        if len(rid)!=16 or not rid.isdigit() or int(rid[:8])!=date:
            continue
        if date>=race_date or r.get('surf')!=surface or rid in seen:continue
        seen.add(rid);out.append(r)
        if len(out)>=limit:break
    return out

def back_half(c4,n):
    if c4 is None or n is None or not(5<=n<=20) or not(1<=c4<=n):raise ValueError('invalid corner / field')
    return int(c4/n>.5)

def past_c4_mean(history,decay=.82):
    if not history:return .5
    a=np.array([r['c4frac'] for r in history],float)
    w=decay**np.arange(len(a))
    return float(np.dot(a,w)/w.sum())