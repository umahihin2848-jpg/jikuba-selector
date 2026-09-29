from pathlib import Path
import json, math, statistics
import pandas as pd
import numpy as np

DATA=Path("source-data/data")
OUT=Path("research-output")
OUT.mkdir(exist_ok=True)

def clamp01(x): return max(0.0,min(1.0,float(x)))

def boundary_score(odds,min_k=3,max_k=8,share_floor=.55,share_target=.88,threshold=57):
    odds=[float(x) for x in odds if pd.notna(x) and float(x)>0]
    n=len(odds)
    if n<2: return None,[]
    inv=np.array([1/x for x in odds],dtype=float)
    p=inv/inv.sum()
    def share(k): return float(p[:min(k,n)].sum())
    def wall(k): return odds[k]/odds[k-1] if 1<=k<n else None
    min_k=max(2,min(int(min_k),n-1)); max_k=max(min_k,min(int(max_k),n-1))
    cand=[]
    for k in range(min_k,max_k+1):
        ratio=wall(k); near=[]
        for j in range(max(1,k-2),min(n-1,k+2)+1):
            if j!=k:
                w=wall(j)
                if w is not None: near.append(w)
        baseline=float(statistics.median(near)) if near else 1.0
        prominence=ratio/baseline if baseline>0 else 1.0
        cum=share(k)
        share_score=clamp01((cum-share_floor)/(share_target-share_floor))
        wall_score=clamp01((ratio-1.04)/(1.58-1.04))
        prom_score=clamp01((prominence-1.00)/(1.40-1.00))
        compact=1.0 if max_k==min_k else clamp01(1-(k-min_k)/(max_k-min_k))
        score=100*(.40*share_score+.30*wall_score+.20*prom_score+.10*compact)
        eligible=cum>=share_floor and score>=threshold and (ratio>=1.10 or prominence>=1.08)
        cand.append(dict(k=k,share=cum,wall=ratio,baseline=baseline,prominence=prominence,score=score,eligible=eligible))
    eligible=sorted([x for x in cand if x["eligible"]],key=lambda x:(-x["score"],x["k"]))
    return (eligible[0] if eligible else None),cand

def first_range(odds):
    b,_=boundary_score(odds,3,8,.55,.88,57)
    return int(b["k"]) if b else None

def spread(odds):
    odds=np.array([float(x) for x in odds if pd.notna(x) and float(x)>0],dtype=float)
    n=len(odds)
    if n==0: return dict(neff=np.nan,ratio=np.nan,label="判定不可")
    q=(1/odds); q=q/q.sum()
    neff=float(1/(q*q).sum()); ratio=neff/n
    label="集中" if ratio<=.65 else ("やや分散" if ratio<=.82 else "横並び")
    return dict(neff=neff,ratio=ratio,label=label)

def norm_grade(x):
    s=str(x).upper().replace("Ｇ","G").replace("Ⅰ","I").replace("Ⅱ","II").replace("Ⅲ","III")
    if s in {"G1","GI"}: return "G1"
    if s in {"G2","GII"}: return "G2"
    if s in {"G3","GIII"}: return "G3"
    return None

def numeric_finish(x):
    try:
        s=str(x).strip()
        return int(float(s)) if s not in {"","nan","None"} else None
    except: return None

race_parts=[]; result_parts=[]
for y in range(2021,2026):
    for m in range(1,13):
        rp=DATA/f"year={y}"/f"month={m:02d}"/"races.parquet"
        xp=DATA/f"year={y}"/f"month={m:02d}"/"results.parquet"
        if rp.exists(): race_parts.append(pd.read_parquet(rp))
        if xp.exists(): result_parts.append(pd.read_parquet(xp))

races=pd.concat(race_parts,ignore_index=True) if race_parts else pd.DataFrame()
results=pd.concat(result_parts,ignore_index=True) if result_parts else pd.DataFrame()

# normalize likely columns
races.columns=[str(c) for c in races.columns]
results.columns=[str(c) for c in results.columns]
if "grade" not in races.columns: raise RuntimeError(f"grade missing: {list(races.columns)}")
races["grade_norm"]=races["grade"].map(norm_grade)
races=races[races["grade_norm"].isin(["G1","G2","G3"])].copy()
if "surface" in races.columns:
    races=races[races["surface"].astype(str).isin(["芝","ダート","turf","dirt"])].copy()

# de-dupe and limit years
races["race_id"]=races["race_id"].astype(str)
races=races.drop_duplicates("race_id")
results["race_id"]=results["race_id"].astype(str)
valid=set(races["race_id"])
results=results[results["race_id"].isin(valid)].copy()

odds_col=next((c for c in ["odds_win","単勝","win_odds"] if c in results.columns),None)
pop_col=next((c for c in ["popularity","人気"] if c in results.columns),None)
fin_col=next((c for c in ["finish_pos","着順","finish"] if c in results.columns),None)
if not (odds_col and pop_col and fin_col):
    raise RuntimeError(f"required cols missing results={list(results.columns)}")

rows=[]
for _,race in races.iterrows():
    rid=str(race["race_id"])
    rr=results[results["race_id"]==rid].copy()
    rr[odds_col]=pd.to_numeric(rr[odds_col],errors="coerce")
    rr[pop_col]=pd.to_numeric(rr[pop_col],errors="coerce")
    rr=rr[(rr[odds_col]>0)&rr[pop_col].notna()].copy()
    rr=rr.sort_values([pop_col,odds_col],kind="stable")
    if len(rr)<3: continue
    rr["_finish"]=rr[fin_col].map(numeric_finish)
    winners=rr[rr["_finish"]==1]
    if winners.empty: continue
    winner_pop=int(winners[pop_col].min())
    winner_odds=float(winners.sort_values(pop_col).iloc[0][odds_col])
    odds=rr[odds_col].astype(float).tolist()
    k=first_range(odds)
    top8_n=min(8,len(odds))
    sp8=spread(odds[:top8_n])
    spr=spread(odds[:k]) if k else dict(neff=np.nan,ratio=np.nan,label="境界なし")
    row={
        "race_id":rid,
        "race_date":str(race.get("race_date","")),
        "course":str(race.get("course","")),
        "race_no":race.get("race_no",np.nan),
        "name":str(race.get("name","")),
        "grade":race["grade_norm"],
        "surface":str(race.get("surface","")),
        "distance_m":race.get("distance_m",np.nan),
        "n_runners":len(rr),
        "winner_popularity":winner_pop,
        "winner_odds":winner_odds,
        "v220_range_end":k if k else np.nan,
        "v220_has_boundary":bool(k),
        "v220_range_hit":bool(k and winner_pop<=k),
        "v220_neff":spr["neff"],
        "v220_neff_ratio":spr["ratio"],
        "v220_spread":spr["label"],
        "top8_n":top8_n,
        "top8_neff":sp8["neff"],
        "top8_neff_ratio":sp8["ratio"],
        "top8_spread":sp8["label"],
        "fav_win":winner_pop==1,
        "top4_win":winner_pop<=4,
        "top6_win":winner_pop<=6,
        "top8_win":winner_pop<=8,
        "fav_return_factor":winner_odds if winner_pop==1 else 0.0,
    }
    rows.append(row)

df=pd.DataFrame(rows)
if df.empty: raise RuntimeError("No races collected")

def pct(s): return round(100*float(pd.Series(s).mean()),1) if len(s) else None

def summarize(g):
    return pd.Series({
        "races":len(g),
        "fav_win_pct":pct(g["fav_win"]),
        "top4_win_pct":pct(g["top4_win"]),
        "top6_win_pct":pct(g["top6_win"]),
        "top8_win_pct":pct(g["top8_win"]),
        "fav_win_roi_pct":round(100*float(g["fav_return_factor"].mean()),1),
        "avg_winner_pop":round(float(g["winner_popularity"].mean()),2),
    })

# All races using fixed top-8 spread
top8_summary=df.groupby("top8_spread",dropna=False).apply(summarize,include_groups=False).reset_index()
# Current v2.20 selectable subset only
sel=df[df["v220_has_boundary"]].copy()
v220_summary=sel.groupby("v220_spread",dropna=False).apply(lambda g: pd.Series({
    "races":len(g),
    "avg_range_end":round(float(g["v220_range_end"].mean()),2),
    "range_hit_pct":pct(g["v220_range_hit"]),
    "fav_win_pct":pct(g["fav_win"]),
    "top4_win_pct":pct(g["top4_win"]),
    "top6_win_pct":pct(g["top6_win"]),
    "top8_win_pct":pct(g["top8_win"]),
    "fav_win_roi_pct":round(100*float(g["fav_return_factor"].mean()),1),
    "avg_winner_pop":round(float(g["winner_popularity"].mean()),2),
}),include_groups=False).reset_index()
grade_spread=sel.groupby(["grade","v220_spread"],dropna=False).apply(lambda g: pd.Series({
    "races":len(g),
    "range_hit_pct":pct(g["v220_range_hit"]),
    "fav_win_pct":pct(g["fav_win"]),
    "top4_win_pct":pct(g["top4_win"]),
    "top6_win_pct":pct(g["top6_win"]),
    "top8_win_pct":pct(g["top8_win"]),
}),include_groups=False).reset_index()
year_counts=df.assign(year=df["race_id"].str[:4]).groupby("year").agg(
    races=("race_id","size"),
    v220_boundary=("v220_has_boundary","sum"),
    v220_hit=("v220_range_hit","sum"),
).reset_index()
year_counts["v220_hit_pct"]=np.where(year_counts["v220_boundary"]>0,100*year_counts["v220_hit"]/year_counts["v220_boundary"],np.nan).round(1)

# range end distribution
range_dist=sel.groupby("v220_range_end").apply(lambda g: pd.Series({
    "races":len(g),"range_hit_pct":pct(g["v220_range_hit"]),"avg_winner_pop":round(float(g["winner_popularity"].mean()),2)
}),include_groups=False).reset_index()

for name,obj in [
    ("races_detail.csv",df),("top8_spread_summary.csv",top8_summary),
    ("v220_spread_summary.csv",v220_summary),("grade_spread_summary.csv",grade_spread),
    ("year_counts.csv",year_counts),("range_distribution.csv",range_dist)
]:
    obj.to_csv(OUT/name,index=False,encoding="utf-8-sig")

payload={
  "source_rows":{"races_parquet":len(races),"results_rows":len(results),"analyzed_races":len(df)},
  "years":year_counts.to_dict(orient="records"),
  "top8_spread":top8_summary.to_dict(orient="records"),
  "v220":{"eligible_races":len(sel),"eligible_pct":round(100*len(sel)/len(df),1),"spread":v220_summary.to_dict(orient="records"),"range_distribution":range_dist.to_dict(orient="records")},
  "grade_spread":grade_spread.to_dict(orient="records"),
  "columns":{"races":list(races.columns),"results":list(results.columns)}
}
(OUT/"summary.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2,default=str),encoding="utf-8")
print(json.dumps(payload,ensure_ascii=False,indent=2,default=str))
