#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2021-2025 JRA flat graded races backtest for quinella-range v2.20 / win market spread v2.27.
Sources:
- JRA official yearly graded-race list
- keibamar/keiba_ai_ver2.0 public historical race-result CSVs
"""
from __future__ import annotations

import io
import json
import math
import re
import time
import unicodedata
from pathlib import Path
from statistics import median

import pandas as pd
import requests
from bs4 import BeautifulSoup

YEARS = range(2021, 2026)
OUT = Path("analysis/output")
OUT.mkdir(parents=True, exist_ok=True)

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
VENUE_CODES = {k: v[:2] for k, v in VENUES.items()}
RAW_BASE = "https://raw.githubusercontent.com/keibamar/keiba_ai_ver2.0/master/data/RaceResults"
JRA_URL = "https://www.jra.go.jp/datafile/seiseki/replay/{year}/jyusyo.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}

def norm(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(s or ""))).strip()

def get(url, session, tries=4):
    last = None
    for i in range(tries):
        try:
            r = session.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last

def parse_jra_year(year, session):
    r = get(JRA_URL.format(year=year), session)
    r.encoding = r.apparent_encoding or "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")
    table = soup.find("table")
    if table is None:
        raise RuntimeError(f"JRA table not found: {year}")
    rows = []
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) < 7:
            continue
        date_text = tds[0].get_text(" ", strip=True)
        m = re.search(r"(\d{1,2})月(\d{1,2})日", date_text)
        if not m:
            continue
        race_cell = tds[1]
        race_text = norm(race_cell.get_text(" ", strip=True))
        # grade icon text is usually included in the cell; normalize Roman numerals too.
        grade = None
        if re.search(r"G(?:Ⅰ|I)(?!I)", race_text):
            grade = "G1"
        if re.search(r"G(?:Ⅱ|II)", race_text):
            grade = "G2"
        if re.search(r"G(?:Ⅲ|III)", race_text):
            grade = "G3"
        # Exclude J-G and any obstacle race by course below.
        place = norm(tds[2].get_text(" ", strip=True))
        course = norm(tds[4].get_text(" ", strip=True))
        if course.startswith("障") or "障害" in course or race_text.startswith("J・G") or race_text.startswith("JG"):
            continue
        if grade not in {"G1", "G2", "G3"}:
            continue
        surf = "芝" if course.startswith("芝") else ("ダート" if course.startswith("ダ") else "")
        dm = re.search(r"([\d,]+)", course)
        dist = int(dm.group(1).replace(",", "")) if dm else None

        # Winner cell can have dead-heat entries separated by br.
        winners = []
        cur = []
        for child in tds[5].children:
            if getattr(child, "name", None) == "br":
                x = norm("".join(cur))
                if x:
                    winners.append(x)
                cur = []
            elif getattr(child, "name", None) == "strong":
                continue
            else:
                cur.append(child.get_text(strip=True) if hasattr(child, "get_text") else str(child))
        x = norm("".join(cur))
        if x:
            winners.append(x)
        if not winners:
            winners = [norm(tds[5].get_text(" ", strip=True))]

        # Strip grade prefix from race name for readability.
        race_name = race_text
        race_name = re.sub(r"^(?:G(?:Ⅰ|Ⅱ|Ⅲ|I|II|III))", "", race_name)
        date = pd.Timestamp(year=year, month=int(m.group(1)), day=int(m.group(2))).date().isoformat()
        rows.append({
            "year": year, "race_date": date, "grade": grade, "race_name": race_name,
            "venue": place, "surface": surf, "distance": dist, "winners": winners
        })
    return rows

def read_results(year, venue_slug, session):
    url = f"{RAW_BASE}/{venue_slug}/{year}_race_results.csv"
    try:
        r = get(url, session)
    except Exception as e:
        # Kyoto was closed in 2021-2022; missing venue/year files are acceptable.
        print("WARN result csv", year, venue_slug, e)
        return pd.DataFrame()
    # GitHub raw is UTF-8 for this repo.
    df = pd.read_csv(io.BytesIO(r.content))
    if df.empty:
        return df
    first = df.columns[0]
    df = df.rename(columns={first: "race_id"})
    df["race_id"] = df["race_id"].astype(str).str.replace(r"\.0$", "", regex=True)
    df["horse_norm"] = df["馬名"].map(norm)
    df["finish_num"] = pd.to_numeric(df["着順"], errors="coerce")
    df["odds_num"] = pd.to_numeric(df["単勝"], errors="coerce")
    df["pop_num"] = pd.to_numeric(df["人気"], errors="coerce")
    df["horse_no"] = pd.to_numeric(df["馬番"], errors="coerce")
    # Repo date form: 2025年06月01日
    ds = df["date"].astype(str).str.extract(r"(\d{4})年(\d{1,2})月(\d{1,2})日")
    ok = ds.notna().all(axis=1)
    df["date_iso"] = None
    df.loc[ok, "date_iso"] = [
        f"{int(y):04d}-{int(m):02d}-{int(d):02d}" for y,m,d in ds[ok].itertuples(index=False, name=None)
    ]
    return df

def clamp01(x):
    return max(0.0, min(1.0, x))

def boundary_score(runners, min_k=3, max_k=8, share_floor=.55, share_target=.88, threshold=57):
    n = len(runners)
    if n < 2:
        return None, []
    inv = [1.0 / x["odds"] for x in runners]
    total = sum(inv)
    p = [x / total for x in inv]
    def share(k): return sum(p[:min(k,n)])
    def wall(k): return runners[k]["odds"] / runners[k-1]["odds"] if 1 <= k < n else None
    min_k = max(2, min(int(min_k), n-1))
    max_k = max(min_k, min(int(max_k), n-1))
    cands = []
    for k in range(min_k, max_k+1):
        ratio = wall(k)
        near = []
        for j in range(max(1,k-2), min(n-1,k+2)+1):
            if j != k:
                w = wall(j)
                if w is not None: near.append(w)
        base = median(near) if near else 1.0
        prom = ratio/base if base > 0 else 1
        cum = share(k)
        share_score = clamp01((cum-share_floor)/(share_target-share_floor))
        wall_score = clamp01((ratio-1.04)/(1.58-1.04))
        prom_score = clamp01((prom-1.00)/(1.40-1.00))
        compact = 1 if max_k == min_k else clamp01(1-(k-min_k)/(max_k-min_k))
        score = 100*(.40*share_score+.30*wall_score+.20*prom_score+.10*compact)
        eligible = cum >= share_floor and score >= threshold and (ratio >= 1.10 or prom >= 1.08)
        cands.append({"k":k,"share":cum,"wall":ratio,"prominence":prom,"score":score,"eligible":eligible})
    elig = sorted([x for x in cands if x["eligible"]], key=lambda x:(-x["score"],x["k"]))
    return (elig[0] if elig else None), cands

def first_range(runners):
    selected, _ = boundary_score(runners)
    n = len(runners)
    if not selected:
        return {"boundary": False, "end": min(10,n), "target_end":10, "level":"stop"}
    k = selected["k"]
    return {"boundary": True, "end":min(k,n), "target_end":k, "level":"go" if k <= 6 else "caution"}

def market_spread(candidates):
    n = len(candidates)
    if not n:
        return {"effective_n":0.0,"ratio":0.0,"label":"判定不可","level":"flat"}
    inv = [1.0/x["odds"] for x in candidates]
    s = sum(inv)
    q = [v/s for v in inv]
    hhi = sum(v*v for v in q)
    eff = 1/hhi if hhi else n
    ratio = eff/n
    if ratio <= .65:
        label, level = "集中", "focus"
    elif ratio <= .82:
        label, level = "やや分散", "mid"
    else:
        label, level = "横並び", "flat"
    return {"effective_n":eff,"ratio":ratio,"label":label,"level":level}

def runners_from_race(g):
    rows = g.copy()
    rows = rows[rows["odds_num"].notna() & (rows["odds_num"] > 0) & rows["horse_no"].notna()]
    rr = [
        {"horse_no":int(r.horse_no),"odds":float(r.odds_num),"reported_pop":(int(r.pop_num) if pd.notna(r.pop_num) else None),
         "finish":(int(r.finish_num) if pd.notna(r.finish_num) else None), "horse_name":r.馬名}
        for r in rows.itertuples()
    ]
    rr.sort(key=lambda x:(x["odds"],x["horse_no"]))
    for i,x in enumerate(rr,1):
        x["app_pop"] = i
    return rr

def discover_netkeiba_race_ids(meta, session):
    ymd = meta["race_date"].replace("-", "")
    url = f"https://db.netkeiba.com/race/list/{ymd}/"
    r = get(url, session)
    ids = sorted(set(re.findall(r"/race/(\\d{12})/", r.text)))
    code = VENUE_CODES.get(meta["venue"])
    return [rid for rid in ids if code and rid[4:6] == code]

def parse_netkeiba_result(race_id, session):
    url = f"https://db.netkeiba.com/race/{race_id}/"
    r = get(url, session)
    r.encoding = r.apparent_encoding or "EUC-JP"
    try:
        tables = pd.read_html(io.StringIO(r.text))
    except ValueError:
        return []
    target = None
    for t in tables:
        cols = []
        for col in t.columns:
            if isinstance(col, tuple):
                parts = [str(x) for x in col if "Unnamed" not in str(x)]
                name = "".join(parts)
            else:
                name = str(col)
            cols.append(norm(name))
        t = t.copy()
        t.columns = cols
        if any("着順" in x for x in cols) and any("馬名" in x for x in cols) and any("単勝" in x for x in cols) and any("人気" in x for x in cols):
            target = t
            break
    if target is None:
        return []
    def col_like(key):
        return next((x for x in target.columns if key in x), None)
    c_fin, c_no, c_name, c_odds, c_pop = [col_like(x) for x in ("着順","馬番","馬名","単勝","人気")]
    if not all([c_fin,c_no,c_name,c_odds,c_pop]):
        return []
    rr = []
    for _, row in target.iterrows():
        m = re.match(r"\\d+", str(row[c_fin]))
        if not m:
            continue
        fin = int(m.group())
        try:
            horse_no = int(float(row[c_no]))
            odds = float(row[c_odds])
        except Exception:
            continue
        try:
            pop = int(float(row[c_pop]))
        except Exception:
            pop = None
        if not (odds > 0):
            continue
        rr.append({"horse_no":horse_no,"odds":odds,"reported_pop":pop,"finish":fin,"horse_name":str(row[c_name])})
    rr.sort(key=lambda x:(x["odds"],x["horse_no"]))
    for i,x in enumerate(rr,1):
        x["app_pop"] = i
    return rr

def fallback_netkeiba(meta, session):
    winner_norms = {norm(w) for w in meta["winners"]}
    try:
        ids = discover_netkeiba_race_ids(meta, session)
    except Exception as e:
        print("WARN fallback list", meta["race_date"], meta["venue"], e)
        return None
    for rid in ids:
        try:
            rr = parse_netkeiba_result(rid, session)
        except Exception as e:
            print("WARN fallback race", rid, e)
            continue
        if any(x["finish"] == 1 and norm(x["horse_name"]) in winner_norms for x in rr):
            print("FALLBACK", meta["race_date"], meta["race_name"], rid, len(rr))
            return rid, rr
    return None

def main():
    sess = requests.Session()
    jra = []
    for y in YEARS:
        ys = parse_jra_year(y, sess)
        print("JRA", y, len(ys))
        jra.extend(ys)

    # Cache yearly/venue results only where official table says we need them.
    cache = {}
    needed = sorted({(r["year"], r["venue"]) for r in jra})
    for y, venue in needed:
        slug = VENUES.get(venue)
        if not slug:
            print("WARN unknown venue", venue)
            continue
        df = read_results(y, slug, sess)
        cache[(y,venue)] = df
        print("RESULT", y, venue, len(df))

    race_rows = []
    unmatched = []
    used_ids = set()
    for meta in jra:
        df = cache.get((meta["year"],meta["venue"]), pd.DataFrame())
        if df.empty:
            unmatched.append({**meta, "reason":"no_result_file"})
            continue
        d = df[df["date_iso"] == meta["race_date"]]
        winner_norms = {norm(w) for w in meta["winners"]}
        wmatch = d[(d["finish_num"] == 1) & d["horse_norm"].isin(winner_norms)]
        ids = list(dict.fromkeys(wmatch["race_id"].astype(str).tolist()))
        if len(ids) != 1:
            # fallback: date + surface + distance, then require an Open race and unique group
            surf_vals = ["芝"] if meta["surface"] == "芝" else ["ダート","ダ"]
            d2 = d[
                d["race_type"].astype(str).isin(surf_vals)
                & (pd.to_numeric(d["course_len"], errors="coerce") == meta["distance"])
                & (d["class"].astype(str) == "オープン")
            ]
            ids2 = list(dict.fromkeys(d2["race_id"].astype(str).tolist()))
            if len(ids2) == 1:
                ids = ids2
        source = "public_csv"
        if len(ids) != 1:
            fb = fallback_netkeiba(meta, sess)
            if fb is None:
                unmatched.append({**meta, "reason":f"match_count={len(ids)}", "candidate_ids":ids})
                continue
            rid, rr = fb
            source = "netkeiba_fallback"
        else:
            rid = ids[0]
            g = df[df["race_id"].astype(str)==rid]
            rr = runners_from_race(g)
        if rid in used_ids:
            # dead heat produced multiple JRA rows; skip duplicate race.
            continue
        used_ids.add(rid)
        if len(rr) < 5:
            unmatched.append({**meta, "reason":"too_few_valid_odds", "race_id":rid})
            continue
        fr = first_range(rr)
        end = fr["end"]
        cands = rr[:end] if fr["boundary"] else rr[:min(end,len(rr))]
        sp = market_spread(cands)
        winner = next((x for x in rr if x["finish"] == 1), None)
        if not winner:
            unmatched.append({**meta, "reason":"winner_missing", "race_id":rid})
            continue
        race_rows.append({
            "race_id":rid,"source":source,"year":meta["year"],"race_date":meta["race_date"],"grade":meta["grade"],
            "race_name":meta["race_name"],"venue":meta["venue"],"surface":meta["surface"],"distance":meta["distance"],
            "field_size":len(rr),"winner":winner["horse_name"],"winner_app_pop":winner["app_pop"],
            "winner_reported_pop":winner["reported_pop"],"winner_odds":winner["odds"],
            "range_boundary":fr["boundary"],"range_end":end,"range_level":fr["level"],
            "winner_in_range":bool(fr["boundary"] and winner["app_pop"] <= end),
            "effective_n":sp["effective_n"],"effective_ratio":sp["ratio"],
            "spread_label":sp["label"],"spread_level":sp["level"],
            "top1_odds":rr[0]["odds"],"top4_odds":rr[min(3,len(rr)-1)]["odds"],
        })

    races = pd.DataFrame(race_rows)
    if races.empty:
        raise RuntimeError("No races matched")
    races.to_csv(OUT/"graded_race_market_structure.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(unmatched).to_csv(OUT/"unmatched.csv", index=False, encoding="utf-8-sig")

    # Aggregate helpers.
    def agg(group):
        n = len(group)
        return pd.Series({
            "races":n,
            "boundary_rate_pct":100*group["range_boundary"].mean(),
            "winner_capture_pct":100*group.loc[group["range_boundary"],"winner_in_range"].mean() if group["range_boundary"].any() else math.nan,
            "avg_range_end":group.loc[group["range_boundary"],"range_end"].mean() if group["range_boundary"].any() else math.nan,
            "avg_effective_n":group["effective_n"].mean(),
            "avg_effective_ratio_pct":100*group["effective_ratio"].mean(),
            "winner_top1_pct":100*(group["winner_app_pop"]<=1).mean(),
            "winner_top4_pct":100*(group["winner_app_pop"]<=4).mean(),
            "winner_top6_pct":100*(group["winner_app_pop"]<=6).mean(),
            "winner_top8_pct":100*(group["winner_app_pop"]<=8).mean(),
        })
    def summarize_groups(frame, cols):
        out = []
        for key, group in frame.groupby(cols, sort=False, dropna=False):
            if not isinstance(key, tuple):
                key = (key,)
            rec = {col: val for col, val in zip(cols, key)}
            rec.update(agg(group).to_dict())
            out.append(rec)
        return pd.DataFrame(out)
    spread_summary = summarize_groups(races, ["spread_label"])
    grade_summary = summarize_groups(races, ["grade"])
    range_summary = summarize_groups(races, ["range_boundary","range_end"])
    spread_grade = summarize_groups(races, ["spread_label","grade"])
    spread_summary.to_csv(OUT/"summary_by_spread.csv",index=False,encoding="utf-8-sig")
    grade_summary.to_csv(OUT/"summary_by_grade.csv",index=False,encoding="utf-8-sig")
    range_summary.to_csv(OUT/"summary_by_range.csv",index=False,encoding="utf-8-sig")
    spread_grade.to_csv(OUT/"summary_by_spread_grade.csv",index=False,encoding="utf-8-sig")

    # Equal 100-yen win bet on each popularity rank 1-8, segmented by spread.
    roi_rows = []
    for spread, g in races.groupby("spread_label", sort=False):
        for pop in range(1,9):
            stake = len(g)*100
            returns = g.apply(lambda r: r["winner_odds"]*100 if int(r["winner_app_pop"])==pop else 0, axis=1).sum()
            roi_rows.append({"spread_label":spread,"popularity":pop,"races":len(g),"wins":int((g["winner_app_pop"]==pop).sum()),"roi_pct":100*returns/stake if stake else math.nan})
        # Equal stake on every horse inside the selected range (only races with an actual boundary).
        gb = g[g["range_boundary"]].copy()
        total_stake = (gb["range_end"]*100).sum()
        total_ret = gb.apply(lambda r:r["winner_odds"]*100 if r["winner_in_range"] else 0, axis=1).sum()
        roi_rows.append({"spread_label":spread,"popularity":"range_all","races":len(gb),"wins":int(gb["winner_in_range"].sum()),"roi_pct":100*total_ret/total_stake if total_stake else math.nan})
    roi = pd.DataFrame(roi_rows)
    roi.to_csv(OUT/"single_win_roi_by_spread_and_popularity.csv",index=False,encoding="utf-8-sig")

    # Overall popularity distribution and ROI.
    pop_rows = []
    for pop in range(1,9):
        stake = len(races)*100
        returns = races.apply(lambda r:r["winner_odds"]*100 if int(r["winner_app_pop"])==pop else 0, axis=1).sum()
        pop_rows.append({"popularity":pop,"races":len(races),"wins":int((races["winner_app_pop"]==pop).sum()),"win_rate_pct":100*(races["winner_app_pop"]==pop).mean(),"roi_pct":100*returns/stake})
    pd.DataFrame(pop_rows).to_csv(OUT/"single_win_by_popularity.csv",index=False,encoding="utf-8-sig")

    summary = {
        "period":"2021-2025",
        "source_jra_rows":len(jra),
        "matched_flat_graded_races":len(races),
        "fallback_races":int((races["source"]=="netkeiba_fallback").sum()),
        "unmatched_rows":len(unmatched),
        "years":{str(y):int((races["year"]==y).sum()) for y in YEARS},
        "grades":races["grade"].value_counts().to_dict(),
        "spread_counts":races["spread_label"].value_counts().to_dict(),
        "boundary_rate_pct":round(100*races["range_boundary"].mean(),2),
        "capture_when_boundary_pct":round(100*races.loc[races["range_boundary"],"winner_in_range"].mean(),2),
        "winner_top8_pct":round(100*(races["winner_app_pop"]<=8).mean(),2),
        "unmatched_preview":unmatched[:20],
        "spread_summary":spread_summary.round(3).to_dict(orient="records"),
        "grade_summary":grade_summary.round(3).to_dict(orient="records"),
        "roi_by_spread":roi.round(3).to_dict(orient="records"),
    }
    (OUT/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__ == "__main__":
    main()
