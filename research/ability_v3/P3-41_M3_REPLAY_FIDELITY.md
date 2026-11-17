# P3-41 | M3 history replay input fidelity: date contract (research draft)

Date: 2026-11-17

## Basis and scope
P3-40 reported 271 graded flat races (2024 to 2026-10-04), 4,250 runners. Recomputed M3 rank equaled the saved research rank for only 290/4,250 (6.8%). This is a **rank-replay mismatch**, not evidence of a finished production backtest or M4 improvement.

This change does **not** claim to resolve the 6.8% mismatch, nor does it modify AxisAccessGate, skip locks, M3 model weights, M4, or betting criteria.

## Confirmed input-path issue
The raw user-supplied `umadete.csv` contains 439,416 rows. Reading the `日付` field (CP932 source) produced:
- 8 digits after removing punctuation: 87,138 (19.83%)
- 7 digits: 263,035 (59.86%)
- 6 digits: 89,243 (20.31%)
- **6 or 7 digits: 352,278 / 439,416 (80.17%)**

Deduplicating by **horse name + race ID** (the same key as P3-40) yields **74,724 unique historical runs**. Their date lengths are 7 digits: 45,430; 6 digits: 15,081; 8 digits: 14,213. In this exact normalized universe, **60,511 / 74,724 (80.98%)** would require padding if a raw-date parser were used. No literal zero corner positions were observed in these deduplicated runs.

Examples: `2026.10. 4`, `2026. 6. 7`, `2025.11.30`.

Old `ShapeCore.dateVal` stripped punctuation and, for six digits, prefixed `20` to an already four-digit year (e.g. `2026. 6. 7` became `20202667`); for seven digits it could return `Date.parse` **milliseconds** (e.g. `2026.10. 4` produced `1791072000000`). Mixing milliseconds with integer `YYYYMMDD` makes history ordering and strictly-prior filters invalid **if untransformed raw data reaches the date parser**.

The existing `target-csv-compat-v1.js` normalizes TARGET date strings before the common parser in the normal UI upload path. Therefore the raw-file defect is a *confirmed vulnerability in the date function* but **its contribution to the P3-40 Python proxy mismatch is not established**. The proxy scripts/row-level saved ranks must be inspected to diagnose that discrepancy.

## Corner-position audit
In the supplied `umadete.csv` sample, `通過1..4` contained **zero literal '0' positions**. An earlier separate repo audit documented a zero-as-missing issue in other TARGET/JV histories. That issue is relevant to production input fidelity but is **not evidenced as a cause in this particular CSV**. Current `target-csv-compat-v1.js` and `finish600-simulator-v2.js` normalize or ignore zero corner positions.

## Research-only patch
`shape-core-v2.js`: parse padded, unpadded, compact YYMMDD, compact YYYYMMDD, and timestamp-prefixed digit dates into consistent calendar-validated `YYYYMMDD` integers. Return 0 for invalid dates. Do not use `Date.parse()` milliseconds for comparisons.

`tests/p3-41-m3-date-compat-smoke.cjs`: 14 date contracts plus a sample race verifying that five strictly-prior starts are ordered correctly, with race-day results excluded.

## Still required before production adoption
1. Access P3-40 `horse4250_m4_input_proxy.csv`, `race271_anchored_proxy.csv`, the original `parse_history.py`, `replay_pace_m4.py`, and frozen historical M3 ranks.
2. For each runner compare `hist_n`, original five dates/race IDs, `pred_gap`, `hist_front_mean`, each M3 feature, final `score`, M3 rank, and Top3 membership against a frozen **same-day browser** receipt.
3. Report rank agreement **and** Spearman/Kendall, top-3 overlap, top-1 agreement, year-wise and input-fidelity cohort performance; do not overinterpret 6.8% exact-rank equality alone.
4. Hold out race dates not used to choose thresholds. Compare conditional M4 opponent-vs-market+C opponent on discordant races only, paired, then verify fixed-stake ROI from pre-race odds.
5. Keep production gates unchanged until browser-versus-replay parity is demonstrated.

Status: **DATE PARSER HARDENED IN UNMERGED RESEARCH BRANCH; P3-40 271-RACE PARITY NOT YET ESTABLISHED.**


## P3-41 follow-up: actual frozen-source probe (17 November 2026)

Additional previously exported research sources were reopened: `horse_m3_p10.csv` (P3-22b) and P3-22b README. The P3-22b report states that the original Node VM ran *unmodified* M3 JavaScript against all **271 races / 4,250 horses** in the preserved 2026-11-13 runtime. The currently accessible indexed text from its `horse_m3_p10.csv` exposes **955 rows across 61 races from January–August 2024**; this is an accessible excerpt, **not** the full archived CSV. Within the excerpt: saved `m3_score = pred_remaining600_gap - pred_closing` holds for **955/955 horses**, and sorting scores ascending reproduces `m3_rank` for **955/955 horses**.

To isolate core M3 from the upstream remaining600 queue, the preserved `pred_remaining600_gap` values for **17 runners of the 2024-01-06 Nakayama Kimpai (rid 2024010606010111)** were injected unchanged. Five strictly prior unique history runs per horse were reconstructed from the currently attached `umadete.csv` (CP932). Core close prediction was recomputed against `finish600_model_v1.json` feature coefficients:
- Exact M3 rank: **2/17 runners**.
- Top3 overlap: **2/3**.
- M3 rank Spearman rho: **0.434**.
- Predicted closing MAE vs saved: **~0.31 sec**.
- On the **unfiltered** 5-run-history extraction, `hist_front_mean` agrees with archived `validated_frontness5` to < 1e-10 for **16/17** horses. On the obstacle/nonfinish-filtered replay candidate, **15/17** match (notably an obstacle start in one runner's unfiltered prior five starts). The two quantities are related but not guaranteed to be strictly identical in all runtimes.

This strongly directs the *investigation* toward features or historical input-version differences before rank sorting. It does **not** establish what was present in the exact P3-22b synthetic per-race fixtures. A sensitivity-only experiment setting PCI- or RPCI-derived features to model fallback values lowered 17-runner closing MAE to about **0.12 sec**, but neither simulated input omission matched the whole frozen output. **Do not claim missing PCI/RPCI as a confirmed cause.**

Important: the protected P3-40 ZIP and P3-22b raw full CSV fixtures were not available as extractable raw bytes in this session. This cannot be escalated to all 4,250 horses or to point-in-time browser parity, and the original 6.8% remains unresolved.

Next high-yield step: compare the exact `P3-22b_research/inputs/fixtures/2024010606010111.csv` with the original `umadete.csv` values **feature by feature**, including `PCI`, `RPCI`, surface, date, frontness, late-3F, `same_surface_n`; and compare P3-22b runtime's `Finish600State.rows[].x` against the new reconstruction. Then replay all 271 races using the **same** exact JS and input snapshots. No changes to production gates or model coefficients.
