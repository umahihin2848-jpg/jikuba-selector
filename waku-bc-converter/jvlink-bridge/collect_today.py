#!/usr/bin/env python3
"""JV-Link -> Race Scanner live bridge (Windows).

This collector is intentionally split into two layers:
1. JV-Link adapter: reads raw JV-Data records from the local COM control.
2. Normalizer: converts parsed RA/SE/O1/O2 records into scanner today.json.

The scanner contract is stable even if the JV-Link SDK/record parser changes.
Requires Windows + JRA-VAN Data Lab + JV-Link. For real use, install the
official SDK and provide a parser module named `jvdata_parser.py` beside this
file (see README). The parser keeps byte offsets/SDK-version-specific record
layout out of the web app.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "today.json"


def jst_now():
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))


def race_key(x):
    return (str(x.get("date", "")), str(x.get("venueCode", x.get("venue", ""))), int(x.get("raceNo", 0)))


def pair_key(a, b):
    a, b = int(a), int(b)
    return f"{min(a,b)}-{max(a,b)}"


def normalize(records, snapshot="live"):
    races = {}
    horses = defaultdict(dict)
    frame_odds = defaultdict(dict)
    quinella_odds = defaultdict(dict)

    for rec in records:
        kind = rec.get("type")
        key = race_key(rec)
        if kind == "RA":
            races[key] = {
                "date": rec.get("date", ""),
                "venue": rec.get("venue", rec.get("venueCode", "")),
                "raceNo": int(rec.get("raceNo", 0)),
                "raceName": rec.get("raceName", ""),
                "startTime": rec.get("startTime", ""),
                "runners": int(rec.get("runners", 0) or 0),
            }
        elif kind == "SE":
            no = int(rec.get("horseNo", 0) or 0)
            if no:
                horses[key][no] = {
                    "horseNo": no,
                    "frame": int(rec.get("frame", 0) or 0),
                    "name": rec.get("name", ""),
                    "winOdds": float(rec.get("winOdds", 0) or 0),
                }
        elif kind == "O1":
            # O1 contains win/place/frame-quinella odds. Parser emits only the
            # fields this app needs so SDK byte-layout details stay isolated.
            for item in rec.get("winOdds", []):
                no, odds = int(item[0]), float(item[1])
                if no in horses[key] and odds > 0:
                    horses[key][no]["winOdds"] = odds
            for item in rec.get("frameOdds", []):
                a, b, odds = int(item[0]), int(item[1]), float(item[2])
                if odds > 0:
                    frame_odds[key][pair_key(a, b)] = odds
        elif kind == "O2":
            for item in rec.get("quinellaOdds", []):
                a, b, odds = int(item[0]), int(item[1]), float(item[2])
                if odds > 0:
                    quinella_odds[key][pair_key(a, b)] = odds

    out = []
    for key, race in sorted(races.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2])):
        hs = sorted(horses[key].values(), key=lambda h: h["horseNo"])
        # Scanner needs win odds + frame odds. Quinella is carried forward so
        # detailed analysis can reuse it without another manual entry.
        if len(hs) < 4 or len(frame_odds[key]) < 3:
            continue
        race = dict(race)
        race["horses"] = hs
        race["runners"] = race.get("runners") or len(hs)
        race["frameOdds"] = dict(sorted(frame_odds[key].items()))
        race["quinellaOdds"] = dict(sorted(quinella_odds[key].items()))
        out.append(race)

    return {
        "generatedAt": jst_now().isoformat(timespec="seconds"),
        "source": "JRA-VAN Data Lab / JV-Link",
        "snapshot": snapshot,
        "races": out,
    }


def collect_with_jvlink(target_date):
    if os.name != "nt":
        raise RuntimeError("JV-Link collector runs on Windows only")
    try:
        from jvdata_parser import parse_record
    except Exception as e:
        raise RuntimeError(
            "jvdata_parser.py がありません。公式JRA-VAN SDKのJV-Data仕様に合わせた parser を配置してください。"
        ) from e
    try:
        import win32com.client  # pywin32
    except Exception as e:
        raise RuntimeError("pywin32 が必要です: py -m pip install pywin32") from e

    # JV-Link is an ActiveX COM control. ProgID differs by installed SDK build;
    # allow an explicit environment override instead of silently guessing.
    progid = os.environ.get("JVLINK_PROGID")
    if not progid:
        raise RuntimeError(
            "JVLINK_PROGID を設定してください（JRA-VAN公式SDK/検証ツールでインストール済みJV-LinkのProgIDを確認）。"
        )
    jv = win32com.client.Dispatch(progid)

    # Service key is configured by the user's installed JV-Link. We do not put
    # credentials in GitHub or today.json.
    rc = jv.JVInit("JIKUBA_SCANNER")
    if rc != 0:
        raise RuntimeError(f"JVInit error: {rc}")

    # RACE provides RA/SE. O1/O2 are the official odds record families. Exact
    # realtime/open calls can vary with SDK generation; the adapter first uses
    # JVOpen and lets the parser ignore unrelated records.
    from_time = target_date.strftime("%Y%m%d") + "000000"
    records = []
    try:
        for spec in ("RACE", "O1", "O2"):
            try:
                # COM out-parameter marshalling differs by generated wrapper.
                # A local SDK wrapper can expose `open_records`; prefer it when
                # supplied by jvdata_parser.
                try:
                    from jvdata_parser import open_records
                except ImportError:
                    open_records = None
                if open_records:
                    raw_iter = open_records(jv, spec, from_time)
                else:
                    raise RuntimeError(
                        "jvdata_parser.open_records(jv, spec, from_time) を実装してください。"
                    )
                for raw in raw_iter:
                    parsed = parse_record(raw)
                    if parsed:
                        if isinstance(parsed, list):
                            records.extend(parsed)
                        else:
                            records.append(parsed)
            except Exception as e:
                raise RuntimeError(f"{spec} read failed: {e}") from e
    finally:
        try:
            jv.JVClose()
        except Exception:
            pass
    return records


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD; default JST today")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--snapshot", default="live")
    ap.add_argument("--fixture", help="parsed RA/SE/O1/O2 JSON for bridge testing")
    args = ap.parse_args()
    target = dt.date.fromisoformat(args.date) if args.date else jst_now().date()
    if args.fixture:
        records = json.loads(pathlib.Path(args.fixture).read_text(encoding="utf-8"))
    else:
        records = collect_with_jvlink(target)
    feed = normalize(records, args.snapshot)
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    tmp.write_text(json.dumps(feed, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(out)
    print(f"wrote {len(feed['races'])} races -> {out}")
    if not feed["races"]:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
