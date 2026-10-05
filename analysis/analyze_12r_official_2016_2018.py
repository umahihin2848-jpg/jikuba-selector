#!/usr/bin/env python3
"""Complete the 2016-2018 12R holdout from official JRA annual-result PDFs.

Primary question was fixed before looking at these years:
  turf / 12-16 runners / 2000m+ / 12R vs same-condition 9-11R.

We also print 1500-1800m as a secondary reference because it was the other
candidate found in 2021-2025. The script intentionally uses only 2016-2018.
"""
from __future__ import annotations

import csv
import io
import math
import re
import statistics
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

YEARS = (2016, 2017, 2018)
BASE = "https://www.jra.go.jp"
UA = {"User-Agent": "Mozilla/5.0 (compatible; research-validation/1.0)"}

@dataclass
class Race:
    year: int
    source_url: str
    race_no: int
    surface: str
    distance: int
    runners: int
    first_odds: float
    second_odds: float
    first_pop: int
    second_pop: int
    quinella_payout: int | None


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    return s.replace("，", ",").replace("．", ".").replace("（", "(").replace("）", ")")


def annual_pdf_urls(year: int) -> list[str]:
    url = f"{BASE}/datafile/seiseki/report/{year}.html"
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf") and f"/{year}/" in href:
            out.append(urljoin(url, href))
    # preserve order, remove dupes
    return list(dict.fromkeys(out))


def race_row_blocks(lines: list[str], stop_idx: int) -> list[str]:
    """Collect result-row text blocks before '(N頭)'.

    JRA PDFs sometimes merge frame+horse number (e.g. 711) and sometimes put
    the odds on a continuation line. We therefore accumulate continuation
    lines until the next row start, then take the last decimal value as win odds.
    """
    starts: list[int] = []
    # A row starts with frame(1-8), horse no(1-18), then horse name text.
    pat_spaced = re.compile(r"^\s*[1-8]\s+\d{1,2}\s+\D")
    pat_merged = re.compile(r"^\s*[1-8]\d{1,2}\s+\D")
    for i, ln in enumerate(lines[:stop_idx]):
        if pat_spaced.search(ln) or pat_merged.search(ln):
            starts.append(i)
    if not starts:
        return []

    # Course-record tables can occasionally look numeric; keep only the final
    # contiguous set of row starts leading into the runner-count line.
    filtered = []
    for i in starts:
        if i >= max(0, stop_idx - 80):
            filtered.append(i)
    starts = filtered or starts

    blocks = []
    for j, st in enumerate(starts):
        en = starts[j + 1] if j + 1 < len(starts) else stop_idx
        blocks.append(" ".join(x.strip() for x in lines[st:en] if x.strip()))
    return blocks


def extract_odds_from_row(row: str) -> float | None:
    # Exclude clock/race-time decimals such as 2:39.3 by rejecting ':' before.
    vals = re.findall(r"(?<![:\d])(\d{1,3}\.\d)(?!\d)", row)
    if not vals:
        return None
    try:
        return float(vals[-1])
    except ValueError:
        return None


def pop_rank(odds: list[float], target: float) -> int:
    # Displayed odds can tie after rounding; this is conservative rank-by-price.
    return 1 + sum(1 for x in odds if x < target - 1e-9)


def parse_race_block(block: str, year: int, source_url: str, race_no: int) -> Race | None:
    block = norm(block)
    lines = [ln for ln in block.splitlines() if ln.strip()]
    joined = "\n".join(lines)

    # Surface and distance should both appear before the result rows.
    if "(芝" in joined or "芝・" in joined:
        surface = "芝"
    elif "(ダート" in joined or "ダート・" in joined:
        surface = "ダート"
    else:
        return None

    header = joined[:2500]
    # Distance candidates 1000-4000, prefer values before 発走 / surface text.
    pre_surface = header.split("発走", 1)[0]
    candidates = []
    for m in re.finditer(r"(?<!\d)(\d{1,2}(?:,\d{3})|\d{4})(?!\d)", pre_surface):
        v = int(m.group(1).replace(",", ""))
        if 1000 <= v <= 4000 and v % 100 == 0:
            candidates.append(v)
    if not candidates:
        # Some PDFs place the distance immediately after the race header but
        # extraction ordering can move 発走; fall back to the early header.
        for m in re.finditer(r"(?<!\d)(\d{1,2}(?:,\d{3})|\d{4})(?!\d)", header[:1200]):
            v = int(m.group(1).replace(",", ""))
            if 1000 <= v <= 4000 and v % 100 == 0:
                candidates.append(v)
    if not candidates:
        return None
    distance = candidates[-1]

    rm = re.search(r"\((\d{1,2})頭\)", joined)
    if not rm:
        return None
    runners = int(rm.group(1))

    # Limit row parsing to text before the explicit runner count.
    stop_idx = next((i for i, ln in enumerate(lines) if re.search(r"\(\d{1,2}頭\)", ln)), len(lines))
    rows = race_row_blocks(lines, stop_idx)
    odds = [extract_odds_from_row(r) for r in rows]
    odds = [x for x in odds if x is not None and 1.0 <= x <= 999.9]
    if len(odds) < runners - 1 or len(odds) < 2:
        return None
    # In rare cases a false row is detected; the actual result rows are the last
    # 'runners' rows before the count.
    if len(odds) > runners:
        odds = odds[-runners:]
    if len(odds) < 2:
        return None

    first_odds, second_odds = odds[0], odds[1]
    first_pop = pop_rank(odds, first_odds)
    second_pop = pop_rank(odds, second_odds)

    # Quinella payout; search only after runner-count marker when possible.
    tail = joined[joined.find(rm.group(0)) :]
    pm = re.search(r"馬\s*連[^\n]{0,45}?([\d,]+)円", tail)
    payout = int(pm.group(1).replace(",", "")) if pm else None

    return Race(year, source_url, race_no, surface, distance, runners,
                first_odds, second_odds, first_pop, second_pop, payout)


def parse_pdf(url: str, year: int) -> tuple[list[Race], str | None]:
    try:
        r = requests.get(url, headers=UA, timeout=45)
        r.raise_for_status()
        reader = PdfReader(io.BytesIO(r.content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        text = norm(text)
        # Locate headers for races 9-12 only.
        hits = list(re.finditer(r"第\s*(\d{1,2})\s*競走", text))
        out = []
        for i, h in enumerate(hits):
            rn = int(h.group(1))
            if rn not in (9, 10, 11, 12):
                continue
            end = hits[i + 1].start() if i + 1 < len(hits) else len(text)
            race = parse_race_block(text[h.start():end], year, url, rn)
            if race:
                out.append(race)
        return out, None
    except Exception as e:
        return [], f"{url}: {type(e).__name__}: {e}"


def ci_diff(k1, n1, k0, n0):
    if not n1 or not n0:
        return None
    p1, p0 = k1/n1, k0/n0
    d = p1-p0
    se = math.sqrt(p1*(1-p1)/n1 + p0*(1-p0)/n0)
    return d, d-1.96*se, d+1.96*se


def prop(rows: list[Race], key: str):
    n = len(rows)
    if not n:
        return 0, 0, None
    if key == "top4":
        k = sum(max(r.first_pop, r.second_pop) <= 4 for r in rows)
    elif key == "top9":
        k = sum(max(r.first_pop, r.second_pop) <= 9 for r in rows)
    elif key == "top4x10":
        k = sum(min(r.first_pop, r.second_pop) <= 4 and max(r.first_pop, r.second_pop) >= 10 for r in rows)
    elif key == "p10k":
        rs = [r for r in rows if r.quinella_payout is not None]
        n = len(rs)
        k = sum(r.quinella_payout >= 10000 for r in rs)
    else:
        raise ValueError(key)
    return k, n, k/n if n else None


def yen(x):
    return "—" if x is None else f"{int(round(x)):,}円"


def summarize(label: str, a: list[Race], c: list[Race]):
    print(f"\n### {label}")
    print(f"n: 12R {len(a)} / 9-11R {len(c)}")
    for key, name in [("top4", "上位4同士"), ("top9", "9人気以内同士"), ("top4x10", "上位4×10人気以下"), ("p10k", "万馬券率")]:
        k1,n1,p1 = prop(a,key); k0,n0,p0 = prop(c,key)
        ci = ci_diff(k1,n1,k0,n0)
        if ci:
            d,lo,hi=ci
            print(f"{name}: 12R {p1*100:.1f}% vs 9-11R {p0*100:.1f}% | 差 {d*100:+.2f}pt | 95%CI {lo*100:+.2f}〜{hi*100:+.2f}")
        else:
            print(f"{name}: —")
    pa=[r.quinella_payout for r in a if r.quinella_payout is not None]
    pc=[r.quinella_payout for r in c if r.quinella_payout is not None]
    print(f"馬連払戻中央値: 12R {yen(statistics.median(pa) if pa else None)} / 9-11R {yen(statistics.median(pc) if pc else None)}")


def main():
    urls=[]
    for y in YEARS:
        ys=annual_pdf_urls(y)
        print(f"{y}: annual PDFs {len(ys)}")
        urls.extend((y,u) for u in ys)
    print(f"PDF total: {len(urls)}")

    races=[]; errors=[]
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs={ex.submit(parse_pdf,u,y):(y,u) for y,u in urls}
        for idx,f in enumerate(as_completed(futs),1):
            rs,err=f.result()
            races.extend(rs)
            if err: errors.append(err)
            if idx % 50 == 0:
                print(f"processed {idx}/{len(futs)} PDFs; races={len(races)} errors={len(errors)}")
            time.sleep(0.01)

    # Deduplicate by source/race no in case annual page has duplicate links.
    uniq={(r.source_url,r.race_no):r for r in races}
    races=list(uniq.values())
    print(f"Parsed 9-12R races: {len(races)}; PDF errors: {len(errors)}")
    if errors:
        print("First errors:")
        for e in errors[:10]: print(" -",e)

    with open("analysis/results/12r_official_2016_2018.csv","w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=list(asdict(races[0]).keys()) if races else ["year"])
        w.writeheader()
        for r in sorted(races,key=lambda z:(z.year,z.source_url,z.race_no)):
            w.writerow(asdict(r))

    def cond(r: Race, lo: int, hi: int | None):
        return r.surface=="芝" and 12<=r.runners<=16 and r.distance>=lo and (hi is None or r.distance<=hi)

    print("\n# OFFICIAL JRA HOLDOUT 2016-2018")
    print("Fixed primary: turf / 12-16 runners / 2000m+ / 12R vs 9-11R")
    for lo,hi,label in [(1500,1800,"SECONDARY 1500-1800m"),(2000,None,"PRIMARY 2000m+")]:
        a=[r for r in races if r.race_no==12 and cond(r,lo,hi)]
        c=[r for r in races if r.race_no in (9,10,11) and cond(r,lo,hi)]
        summarize(label,a,c)
        print("year stability:")
        for y in YEARS:
            ay=[r for r in a if r.year==y]; cy=[r for r in c if r.year==y]
            k1,n1,p1=prop(ay,"top9"); k0,n0,p0=prop(cy,"top9")
            q1,m1,v1=prop(ay,"p10k"); q0,m0,v0=prop(cy,"p10k")
            print(f"  {y}: n={len(ay)}/{len(cy)} top9={('—' if p1 is None else f'{p1*100:.1f}%')}/{('—' if p0 is None else f'{p0*100:.1f}%')} 10k={('—' if v1 is None else f'{v1*100:.1f}%')}/{('—' if v0 is None else f'{v0*100:.1f}%')}")

if __name__ == "__main__":
    main()
