#!/usr/bin/env python3
"""
lap_ability_validation_v1.py

Build race-level lap-demand features from TARGET "タイム分析・レース一覧" CSV
(or a compatible 1F-lap CSV), merge them onto umade.csv, and create
strictly pre-race horse capacity features for later M3 ablation testing.

This script intentionally stops before changing FinishScore. It writes
feature tables that can be joined to the existing formal OOS pipeline.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


def read_csv_auto(path: str | Path) -> pd.DataFrame:
    last = None
    for enc in ("cp932", "shift_jis", "utf-8-sig", "utf-8"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except Exception as e:
            last = e
    raise RuntimeError(f"Could not read {path}: {last}")


def norm(s: str) -> str:
    return re.sub(r"[\s_　・\-]+", "", str(s)).upper()


def find_col(cols: Iterable[str], names: Iterable[str]) -> str | None:
    cols = list(cols)
    nn = {norm(x) for x in names}
    for c in cols:
        if norm(c) in nn:
            return c
    for c in cols:
        nc = norm(c)
        if any(n in nc or nc in n for n in nn):
            return c
    return None


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(
        s.astype(str)
         .str.normalize("NFKC")
         .str.replace(",", "", regex=False)
         .str.replace("秒", "", regex=False)
         .str.strip(),
        errors="coerce",
    )


def parse_target_lap_csv(df: pd.DataFrame) -> pd.DataFrame:
    cols = list(df.columns)
    out = pd.DataFrame(index=df.index)
    aliases = {
        "race_id": ["レースID", "RACEID"],
        "date": ["年月日", "日付", "レース日付"],
        "venue": ["場所名", "場所", "競馬場名"],
        "track_code": ["トラックコード", "芝ダート区分"],
        "distance": ["距離", "距離(M)"],
        "going": ["馬場状態コード", "馬場状態", "馬場状態1"],
        "race_class": ["クラスコード", "クラス名", "競争条件"],
        "field_size": ["頭数", "出走頭数"],
        "front5f": ["前5F通過ラップタイム", "前5F"],
        "back5f": ["後5F上がりタイム", "後5F"],
        "front3f": ["前3F通過ラップタイム", "前3F"],
        "back3f": ["後3F上がりタイム", "後3F"],
    }
    for k, names in aliases.items():
        c = find_col(cols, names)
        if c is not None:
            out[k] = df[c]

    lap_cols = []
    for i in range(1, 19):
        c = find_col(cols, [f"ラップ{i}", f"ラップタイム{i}", f"LAP{i}", f"LAPTIME{i}"])
        if c is not None:
            lap_cols.append((i, c))
    if len(lap_cols) < 4:
        raise ValueError("Need at least 4 lap columns (ラップ1..).")

    for i, c in lap_cols:
        out[f"lap{i}"] = to_num(df[c])
    for k in ("distance", "field_size", "front5f", "back5f", "front3f", "back3f"):
        if k in out:
            out[k] = to_num(out[k])
    out["date"] = out.get("date", "").astype(str).str.replace(r"\D", "", regex=True)
    out["venue"] = out.get("venue", "").astype(str).str.strip()
    out["race_id"] = out.get("race_id", "").astype(str).str.replace(r"\D", "", regex=True)
    return out


def last_valid_laps(row: pd.Series, n: int = 4) -> list[float]:
    vals = []
    for i in range(1, 19):
        v = row.get(f"lap{i}", np.nan)
        if pd.notna(v) and 7.0 <= float(v) <= 20.0:
            vals.append(float(v))
    return vals[-n:] if len(vals) >= n else []


def race_features(laps: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in laps.iterrows():
        last4 = last_valid_laps(r, 4)
        if len(last4) < 4:
            continue
        diffs = [last4[i] - last4[i + 1] for i in range(3)]
        max_accel = max(diffs)
        accel_from = last4[int(np.argmax(diffs))]
        peak = min(last4)
        mean4 = float(np.mean(last4))
        sd4 = float(np.std(last4, ddof=0))
        late_fade = last4[-1] - peak
        front5 = r.get("front5f", np.nan)
        back5 = r.get("back5f", np.nan)
        distance = r.get("distance", np.nan)
        back5_push = np.nan
        if pd.notna(front5) and pd.notna(back5) and pd.notna(distance) and float(distance) >= 2000:
            back5_push = float(front5) - float(back5)
        rows.append({
            "race_id": r.get("race_id", ""),
            "date": r.get("date", ""),
            "venue": r.get("venue", ""),
            "track_code": r.get("track_code", ""),
            "distance": distance,
            "going": r.get("going", ""),
            "race_class": r.get("race_class", ""),
            "field_size": r.get("field_size", np.nan),
            "last4_mean": mean4,
            "last4_sd": sd4,
            "max_accel_raw": max_accel,
            "accel_from_split": accel_from,
            "peak_split_raw": peak,
            "late_fade_raw": late_fade,
            "back5_push_raw": back5_push,
        })
    return pd.DataFrame(rows)


def rolling_condition_standardize(rf: pd.DataFrame) -> pd.DataFrame:
    x = rf.copy()
    x["_date_num"] = pd.to_numeric(x["date"], errors="coerce").fillna(0)
    x = x.sort_values(["_date_num", "race_id"]).reset_index(drop=True)
    group_cols = ["venue", "distance", "track_code"]
    metrics = ["max_accel_raw", "peak_split_raw", "last4_sd", "late_fade_raw", "back5_push_raw"]
    for m in metrics:
        zs = np.full(len(x), np.nan)
        for _, gidx in x.groupby(group_cols, dropna=False).groups.items():
            hist = []
            for i in list(gidx):
                v = x.at[i, m]
                if len(hist) >= 20 and pd.notna(v):
                    a = np.asarray(hist, dtype=float)
                    mu = float(np.mean(a))
                    sd = float(np.std(a, ddof=0))
                    if sd > 1e-8:
                        zs[i] = (float(v) - mu) / sd
                if pd.notna(v):
                    hist.append(float(v))
        x[m.replace("_raw", "_z")] = zs
    x["peak_speed_z"] = -x["peak_split_z"]
    x["sustain_z"] = -x["last4_sd_z"]
    x["deceleration_resistance_z"] = -x["late_fade_z"]

    resid = np.full(len(x), np.nan)
    for _, gidx in x.groupby(group_cols, dropna=False).groups.items():
        hx, hy = [], []
        for i in list(gidx):
            a = x.at[i, "accel_from_split"]
            y = x.at[i, "max_accel_raw"]
            if len(hx) >= 30 and pd.notna(a) and pd.notna(y):
                X = np.c_[np.ones(len(hx)), np.asarray(hx)]
                beta, *_ = np.linalg.lstsq(X, np.asarray(hy), rcond=None)
                pred = beta[0] + beta[1] * float(a)
                rr = np.asarray(hy) - X @ beta
                s = float(np.std(rr, ddof=0))
                if s > 1e-8:
                    resid[i] = (float(y) - pred) / s
            if pd.notna(a) and pd.notna(y):
                hx.append(float(a))
                hy.append(float(y))
    x["acceleration_z"] = resid
    return x.drop(columns=["_date_num"])


def load_umade(path: str | Path) -> pd.DataFrame:
    u = read_csv_auto(path).copy()
    required = ["馬名", "日付", "着順", "頭数", "上り3F", "レースID(新)"]
    missing = [c for c in required if c not in u.columns]
    if missing:
        raise ValueError(f"umade missing columns: {missing}")
    u["date8"] = u["日付"].astype(str).str.replace(r"\D", "", regex=True).map(lambda s: ("20" + s) if len(s) == 6 else s)
    u["horse_name"] = u["馬名"].astype(str).str.strip()
    u["finish"] = to_num(u["着順"])
    u["field_size_h"] = to_num(u["頭数"])
    u["last3f_h"] = to_num(u["上り3F"])
    u["race_horse_id"] = u["レースID(新)"].astype(str).str.replace(r"\D", "", regex=True)
    u["race_key16"] = u["race_horse_id"].str.slice(0, 16)
    u["finish_pct"] = (u["finish"] - 1) / (u["field_size_h"] - 1).replace(0, np.nan)
    med3 = u.groupby("race_key16")["last3f_h"].transform("median")
    u["rel_last3f"] = med3 - u["last3f_h"]
    return u


def attach_race_features(u: pd.DataFrame, rf: pd.DataFrame) -> pd.DataFrame:
    out = u.copy()
    rf = rf.copy()
    rf["race_id"] = rf["race_id"].astype(str)
    map16 = rf[rf["race_id"].str.len() == 16].drop_duplicates("race_id").set_index("race_id")
    if len(map16):
        return out.join(map16, on="race_key16", rsuffix="_lap")
    out.attrs["lap_merge_status"] = "needs_explicit_race_id_mapping"
    return out


def build_horse_capacity_table(merged: pd.DataFrame) -> pd.DataFrame:
    demand_cols = ["acceleration_z", "sustain_z", "back5_push_z", "peak_speed_z"]
    available = [c for c in demand_cols if c in merged.columns]
    if not available:
        return pd.DataFrame()
    x = merged.copy()
    x["_date_num"] = pd.to_numeric(x["date8"], errors="coerce").fillna(0)
    x = x.sort_values(["horse_name", "_date_num"])
    rows = []
    for name, g in x.groupby("horse_name", sort=False):
        hist = []
        for _, r in g.iterrows():
            feats = {"horse_name": name, "target_date": r["date8"], "race_key16": r["race_key16"], "hist_n": min(5, len(hist))}
            h5 = hist[-5:]
            for c in available:
                vals = [h[c] for h in h5 if pd.notna(h.get(c))]
                feats[f"hist_{c}_mean5"] = float(np.mean(vals)) if vals else np.nan
                good = [h[c] for h in h5 if pd.notna(h.get(c)) and pd.notna(h.get("finish_pct")) and h["finish_pct"] <= 0.5]
                feats[f"hist_{c}_best_good5"] = float(np.max(good)) if good else np.nan
                pw = [h[c] * (0.5 - h["finish_pct"]) for h in h5 if pd.notna(h.get(c)) and pd.notna(h.get("finish_pct"))]
                feats[f"hist_{c}_perfweighted5"] = float(np.mean(pw)) if pw else np.nan
            rows.append(feats)
            hist.append({**{c: r.get(c, np.nan) for c in available}, "finish_pct": r.get("finish_pct", np.nan), "rel_last3f": r.get("rel_last3f", np.nan)})
    return pd.DataFrame(rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lap", required=True, help="TARGET Time Analysis CSV")
    ap.add_argument("--umade", required=True, help="umade.csv")
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    lap_raw = read_csv_auto(args.lap)
    lap = parse_target_lap_csv(lap_raw)
    rf = rolling_condition_standardize(race_features(lap))
    rf.to_csv(outdir / "lap_race_features_v1.csv", index=False, encoding="utf-8-sig")

    u = load_umade(args.umade)
    merged = attach_race_features(u, rf)
    if merged.attrs.get("lap_merge_status"):
        summary = {"status": merged.attrs["lap_merge_status"], "message": "Race IDs differ. Create an explicit TARGET race-id -> umade race_key16 mapping before model validation.", "lap_rows": int(len(rf)), "umade_rows": int(len(u))}
        (outdir / "lap_merge_status_v1.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return

    cap = build_horse_capacity_table(merged)
    cap.to_csv(outdir / "lap_horse_capacity_features_v1.csv", index=False, encoding="utf-8-sig")
    summary = {"status": "ok", "lap_races": int(len(rf)), "horse_target_rows": int(len(cap)), "feature_columns": [c for c in cap.columns if c.startswith("hist_")]}
    (outdir / "lap_feature_build_summary_v1.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
