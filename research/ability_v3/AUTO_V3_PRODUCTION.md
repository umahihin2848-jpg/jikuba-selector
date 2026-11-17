# Ability C × V3 automatic production integration (P3-30, 2026-11-17)

## User flow

1. Open `waku-bc-converter/v3.html` from GitHub Pages.
2. Select race date, venue, turf/dirt, distance, grade (G1–3), horse count.
3. Upload the **normal 106-column TARGET past-race CSV once** using the existing `csvFile` input; assign today's horse numbers to the roster, then tap Analyze.
4. Enter **today's win odds for every runner separately** (old wins odds in the history CSV are NOT today's odds).
5. `Ability総合診断｜C × V3` automatically shows Ability C rank, V3 rank, Dynamic, Peak, M3, market+C and market+V3 axis candidates, and four partner candidates. **NO secondary V3 CSV needed.**

## Exact V3 feature, not a proxy

The 2026 production snapshot was computed with `export_v3_pre_race.py`'s JRA chronological network algorithm on the project's original 2016–2025 and 2026 result universe; it covers 10,883 horse×surface profiles and an as-of update date **2026-10-04**. An 18-runner synthetic *2026-11-17 Kyoto turf 1400m* card using the uploaded Swans S CSV roster was checked against an independent full-network calculation. Maximum Dynamic discrepancy 4.7e-9 and Peak discrepancy 3.6e-8 (rounding). This **fixture date/draw is an equality test, not an official Swans S card or betting prediction**.

## Safety and limits

- 2026 prediction models only; future 2027 models require fresh chronological training and evaluation.
- For an unfamiliar race **earlier than or on 2026-10-04**, the current snapshot must not be used (time leakage): frozen 271 reference cards can still be used if all conditions and runner numbers match exactly.
- For **post-2026-10-04** races, if the newly uploaded TARGET CSV contains any later past run for a prospective runner on the same surface, V3 declines to score that race until the all-JRA snapshot is refreshed; no silent stale score or fake V3 fallback.
- No ability data means `h730=0` and absent peak, as in the exact research prior; such horses have **low evidence**, not an invented high-confidence estimate.
- Historical snapshot model weights and as-of data are distinct: no results beyond the selected race may be used.
- C/M3 production selection logic, market Top2 and purchase/skip lock remain intact: V3 is a **first-class automatic ability/axis/opponent diagnostic**, not an unvalidated override of the betting algorithm. Actual probabilities are imperfectly calibrated, and cannot prove expected value by themselves.
- This fixture CSV includes histories only, not *today's* draw numbers or live odds. Set those values in the app.

## Future updates

Refresh the snapshot by supplying the complete JRA results including all recent race rivals (not merely horses in one TARGET history CSV):

```sh
python research/ability_v3/build_network_snapshot.py \
  --history 2026_2025_seiseki.csv 2026seiseki.csv \
  --cutoff 2026-10-05 \
  --out waku-bc-converter/data/ability_v3_network_snapshot_20261004.json
```

All-JRA `--history` file names in the command are examples. For a future cutoff, change the output filename and `DATA_SNAPSHOT` asset version together, then run the precise full-JRA parity regression. The 2026 V3 probabilistic model must not be reused for 2027 without retraining.
