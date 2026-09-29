#!/usr/bin/env python3
from __future__ import annotations
import io, json, math, re, sys, time
from pathlib import Path

import pandas as pd
import requests

YEARS = range(2021, 2026)
JRA_URL = "https://www.jra.go.jp/datafile/seiseki/replay/{year}/jyusyo.html"
RAW_BASE = "https://raw.githubusercontent.com/keibamar/keiba_ai_ver2.0/master/data/RaceResults"
VENUES = {
    "札幌": "01_sapporo",
    "函館": "02_hakodate",
    "福島": "03_fukushima",
    "新潟": "04_nigata",
    "東京": "05_tokyo",
    "中山": "06_nakayama",
    "中京": "07_chukyo",
    "京都": "08_kyoto",
    "阪神": "09_hanshin",
    "小倉": "10_kokura",
}
UA = {"User-Agent": "Mozilla/5.0 (compatible; graded-neff-analysis/1.0)"}
OUT = Path("analysis/output")
OUT.mkdir(parents=True, exist_ok=True)

def norm(s):
    return re.sub(r"[\s　・･]+", "", str(s or ""))

def clamp01(x):
    return max(0.0, min(1.0, x))

def median(xs):
    ys = sorted(float(x) for x in xs if x is not None and math.isfinite(float(x)))
    if not ys:
        return 1.0
    n = len(ys)
    return ys[n//2] if n % 2 else (ys[n//2-1] + ys[n//2]) / 2

def boundary_score(runners, min_k=3, max_k=8, share_floor=.55, share_target=.88, threshold=57):
    n = len(runners)
    if n < 2:
        return None, []
    inv = [1.0 / r["odds"] for r in runners]
    total = sum(inv)
    p = [x/total for x in inv]
    def share(k): return sum(p[:min(k,n)])
    def wall(k):
        return runners[k]["odds"] / runners[k-1]["odds"] if 1 <= k < n else None
    min_k = max(2, min(int(min_k), n-1))
    max_k = max(min_k, min(int(max_k), n-1))
    candidates = []
    for k in range(min_k, max_k+1):
        ratio = wall(k)
        near = []
        for j in range(max(1,k-2), min(n-1,k+2)+1):
            if j != k:
                w = wall(j)
                if w is not None:
                    near.append(w)
        baseline = median(near)
        prominence = ratio / baseline if baseline > 0 else 1
        cum = share(k)
        share_score = clamp01((cum-share_floor)/(share_target-share_floor))
        wall_score = clamp01((ratio-1.04)/(1.58-1.04))
        prominence_score = clamp01((prominence-1.00)/(1.40-1.00))
        compact_score = 1 if max_k == min_k else clamp01(1-(k-min_k)/(max_k-min_k))
        score = 100*(.40*share_score + .30*wall_score + .20*prominence_score + .10*compact_score)
        eligible = cum >= share_floor and score >= threshold and (ratio >= 1.10 or prominence >= 1.08)
        candidates.append({
            "k": k, "share": cum, "wall": ratio, "baseline": baseline,
            "prominence": prominence, "score": score, "eligible": eligible
        })
    eligible = sorted([x for x in candidates if x["eligible"]], key=lambda x:(-x["score"],x["k"]))
    selected = eligible[0] if eligible else None
    if selected:
        runner_up = eligible[1] if len(eligible)>1 else None
        margin = selected["score"] - runner_up["score"] if runner_up else selected["score"]
        selected["margin"] = margin
        selected["confidence"] = "high" if selected["score"]>=72 and margin>=8 else "mid" if selected["score"]>=62 and margin>=4 else "low"
    return selected, candidates

def first_range(runners):
    selected, candidates = boundary_score(runners)
    if not selected:
        return {"boundary": False, "end": min(10,len(runners)), "target_end":10, "level":"stop"}
    k = selected["k"]
    return {"boundary": True, "end": min(k,len(runners)), "target_end": k, "level":"go" if k<=6 else "caution", "boundary_data": selected}

def market_spread(runners, end):
    cand = runners[:end]
    inv = [1/r["odds"] for r in cand]
    s = sum(inv)
    q = [x/s for x in inv]
    hhi = sum(x*x for x in q)
    neff = 1/hhi if hhi else len(cand)
    ratio = neff/len(cand) if cand else 1
    if ratio <= .65:
        label = "集中"
    elif ratio <= .82:
        label = "やや分散"
    else:
        label = "横並び"
    return neff, ratio, label

def parse_jra_table(year, session):
    url = JRA_URL.format(year=year)
    r = session.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    tables = pd.read_html(io.StringIO(r.text))
    target = None
    for t in tables:
        cols = [str(c) for c in t.columns]
        if {"月日","レース名","競馬場","優勝馬"}.issubset(set(cols)):
            target = t.copy()
            break
    if target is None:
        raise RuntimeError(f"JRA table not found for {year}")
    out = []
    for _, row in target.iterrows():
        race_name = str(row["レース名"])
        if race_name.startswith("J・"):
            continue
        m_grade = re.match(r"^(G[ⅠⅡⅢ])", race_name)
        if not m_grade:
            continue
        m_date = re.search(r"(\d+)月(\d+)日", str(row["月日"]))
        if not m_date:
            continue
        grade = {"GⅠ":"G1","GⅡ":"G2","GⅢ":"G3"}[m_grade.group(1)]
        course = str(row.get("コース",""))
        dist_m = re.search(r"([\d,]+)メートル", course)
        surface = "芝" if course.startswith("芝") else "ダート" if course.startswith("ダ") else None
        out.append({
            "year": year,
            "date": f"{year}-{int(m_date.group(1)):02d}-{int(m_date.group(2)):02d}",
            "grade": grade,
            "race_name": re.sub(r"^G[ⅠⅡⅢ]", "", race_name),
            "venue": str(row["競馬場"]).strip(),
            "course": course,
            "surface": surface,
            "distance": int(dist_m.group(1).replace(",","")) if dist_m else None,
            "winner_cell": str(row["優勝馬"]),
        })
    return out

def load_venue_year(year, venue, slug, session):
    url = f"{RAW_BASE}/{slug}/{year}_race_results.csv"
    r = session.get(url, headers=UA, timeout=45)
    if r.status_code == 404:
        return pd.DataFrame()
    r.raise_for_status()
    df = pd.read_csv(io.BytesIO(r.content), encoding="utf-8-sig")
    first = df.columns[0]
    df = df.rename(columns={first:"race_id"})
    df["race_id"] = df["race_id"].astype(str)
    df["date_key"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["odds_num"] = pd.to_numeric(df["単勝"], errors="coerce")
    df["finish_num"] = pd.to_numeric(df["着順"], errors="coerce")
    df["horse_no"] = pd.to_numeric(df["馬番"], errors="coerce")
    df["pop_num"] = pd.to_numeric(df["人気"], errors="coerce")
    df["course_num"] = pd.to_numeric(df["course_len"], errors="coerce")
    df["venue"] = venue
    return df

def build_race_groups(year, session):
    groups = {}
    for venue, slug in VENUES.items():
        try:
            df = load_venue_year(year, venue, slug, session)
        except Exception as e:
            print(f"[warn] {year} {venue}: {e}", file=sys.stderr)
            continue
        if df.empty:
            continue
        for rid, g in df.groupby("race_id", sort=False):
            valid = g[g["horse_no"].notna()].copy()
            if valid.empty:
                continue
            winners = [norm(x) for x in valid.loc[valid["finish_num"]==1,"馬名"].tolist()]
            groups[rid] = {
                "race_id": rid,
                "date": str(valid["date_key"].iloc[0]),
                "venue": venue,
                "race_no": int(rid[-2:]),
                "surface": str(valid["race_type"].iloc[0]),
                "distance": int(valid["course_num"].iloc[0]) if pd.notna(valid["course_num"].iloc[0]) else None,
                "winner_names": winners,
                "df": valid,
            }
        time.sleep(.1)
    return groups

def match_race(meta, groups):
    candidates = [g for g in groups.values() if g["date"]==meta["date"] and g["venue"]==meta["venue"]]
    if not candidates:
        return None, "no_date_venue"
    by_course = [g for g in candidates if (meta["distance"] is None or g["distance"]==meta["distance"]) and (meta["surface"] is None or (meta["surface"]=="芝" and str(g["surface"]).startswith("芝")) or (meta["surface"]=="ダート" and str(g["surface"]).startswith("ダ")))]
    if by_course:
        candidates = by_course
    wcell = norm(meta["winner_cell"])
    by_winner = [g for g in candidates if any(w and w in wcell for w in g["winner_names"])]
    if len(by_winner)==1:
        return by_winner[0], "winner"
    if len(candidates)==1:
        return candidates[0], "unique_course"
    if by_winner:
        return by_winner[0], "winner_multi"
    return None, "ambiguous"

def analyze_one(meta, grp):
    df = grp["df"].copy()
    df = df[df["odds_num"].notna() & (df["odds_num"]>0) & df["horse_no"].notna()].copy()
    df = df.sort_values(["odds_num","horse_no"], ascending=[True,True])
    runners = [{"horse_no":int(r.horse_no),"odds":float(r.odds_num),"finish":int(r.finish_num) if pd.notna(r.finish_num) else None,"horse_name":str(r["馬名"])} for _,r in df.iterrows()]
    if len(runners)<5:
        return None
    fr = first_range(runners)
    winner_rows = [r for r in runners if r["finish"]==1]
    winner_pops = [i+1 for i,r in enumerate(runners) if r["finish"]==1]
    favorite = runners[0]
    favorite_win = favorite["finish"]==1
    favorite_return = favorite["odds"]*100 if favorite_win else 0
    base = {
        **{k:meta[k] for k in ["year","date","grade","race_name","venue","surface","distance"]},
        "race_id": grp["race_id"],
        "runners": len(runners),
        "winner_popularity_min": min(winner_pops) if winner_pops else None,
        "winner_popularities": "/".join(map(str,winner_pops)),
        "favorite_odds": favorite["odds"],
        "favorite_win": int(favorite_win),
        "favorite_return_100": favorite_return,
        "range_boundary": int(fr["boundary"]),
        "first_range_end": fr["end"],
        "first_range_level": fr["level"],
        "winner_any_in_range": int(bool(winner_pops) and any(p<=fr["end"] for p in winner_pops)),
        "winner_all_in_range": int(bool(winner_pops) and all(p<=fr["end"] for p in winner_pops)),
    }
    if fr["boundary"] and fr["end"]<=8:
        neff, ratio, label = market_spread(runners, fr["end"])
        base.update({"neff":neff,"neff_ratio":ratio,"spread":label})
    else:
        base.update({"neff":None,"neff_ratio":None,"spread":"レンジなし"})
    return base

def pct(n,d):
    return round(100*n/d,1) if d else None

def summarize(df):
    rows=[]
    for label, g in df.groupby("spread", dropna=False):
        n=len(g)
        rows.append({
            "spread":label,
            "races":n,
            "favorite_win_rate":pct(int(g["favorite_win"].sum()),n),
            "favorite_roi":round(float(g["favorite_return_100"].sum())/n,1) if n else None,
            "winner_top3_rate":pct(int((g["winner_popularity_min"]<=3).sum()),n),
            "winner_top4_rate":pct(int((g["winner_popularity_min"]<=4).sum()),n),
            "winner_5to8_rate":pct(int(((g["winner_popularity_min"]>=5)&(g["winner_popularity_min"]<=8)).sum()),n),
            "winner_9plus_rate":pct(int((g["winner_popularity_min"]>=9).sum()),n),
            "range_capture_rate":pct(int(g["winner_any_in_range"].sum()),n),
            "avg_winner_popularity":round(float(g["winner_popularity_min"].mean()),2),
            "avg_neff":round(float(g["neff"].dropna().mean()),2) if g["neff"].notna().any() else None,
            "avg_neff_ratio":round(float(g["neff_ratio"].dropna().mean()),3) if g["neff_ratio"].notna().any() else None,
        })
    return pd.DataFrame(rows)

def main():
    session=requests.Session()
    all_meta=[]
    for y in YEARS:
        rows=parse_jra_table(y,session)
        print(f"[jra] {y}: {len(rows)} flat graded races")
        all_meta.extend(rows)
    details=[]
    unmatched=[]
    for y in YEARS:
        groups=build_race_groups(y,session)
        metas=[m for m in all_meta if m["year"]==y]
        print(f"[csv] {y}: {len(groups)} races loaded")
        for m in metas:
            grp, how=match_race(m,groups)
            if grp is None:
                unmatched.append({**m,"reason":how})
                continue
            row=analyze_one(m,grp)
            if row:
                row["match_method"]=how
                details.append(row)
    df=pd.DataFrame(details)
    if df.empty:
        raise RuntimeError("No races matched")
    df.to_csv(OUT/"graded_neff_2021_2025.csv",index=False,encoding="utf-8-sig")
    summary=summarize(df)
    summary.to_csv(OUT/"summary_by_spread.csv",index=False,encoding="utf-8-sig")
    grade_summary=[]
    for (grade,spread),g in df.groupby(["grade","spread"]):
        n=len(g)
        grade_summary.append({
            "grade":grade,"spread":spread,"races":n,
            "favorite_win_rate":pct(int(g["favorite_win"].sum()),n),
            "favorite_roi":round(float(g["favorite_return_100"].sum())/n,1),
            "winner_top4_rate":pct(int((g["winner_popularity_min"]<=4).sum()),n),
            "range_capture_rate":pct(int(g["winner_any_in_range"].sum()),n),
            "avg_winner_popularity":round(float(g["winner_popularity_min"].mean()),2),
        })
    pd.DataFrame(grade_summary).to_csv(OUT/"summary_by_grade_spread.csv",index=False,encoding="utf-8-sig")
    pd.DataFrame(unmatched).to_csv(OUT/"unmatched.csv",index=False,encoding="utf-8-sig")
    payload={
        "period":"2021-2025",
        "source_races":len(all_meta),
        "matched_races":len(df),
        "unmatched_races":len(unmatched),
        "summary_by_spread":summary.to_dict(orient="records"),
        "range_end_counts":df["first_range_end"].value_counts().sort_index().to_dict(),
        "spread_counts":df["spread"].value_counts().to_dict(),
        "overall":{
            "favorite_win_rate":pct(int(df["favorite_win"].sum()),len(df)),
            "favorite_roi":round(float(df["favorite_return_100"].sum())/len(df),1),
            "range_capture_rate":pct(int(df["winner_any_in_range"].sum()),len(df)),
            "winner_top4_rate":pct(int((df["winner_popularity_min"]<=4).sum()),len(df)),
        }
    }
    (OUT/"summary.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(payload,ensure_ascii=False,indent=2))
    if len(unmatched)>10:
        print(f"[warn] unmatched {len(unmatched)} races",file=sys.stderr)

if __name__=="__main__":
    main()
