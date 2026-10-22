# Candidate C × corrected M3 × ticket runtime revalidation

Date: 2026-10-23
Status: **research / shadow only**
Production rank switch: **NO**
Production ticket switch: **NO**

This report supersedes the earlier simplified Candidate C ticket/structure diagnostics for production-ticket decisions. The earlier report remains useful as research history, but the results below use a closer replay of the actual browser pipeline and should be treated as the current ticket-revalidation baseline.

## 1. Why this replay was redone

Several implementation details materially affect the structural gate and ticket routes:

- corner rank `0` is missing, not a real running position;
- `Remaining600Validated` uses the most recent **five valid corner records** for queue frontness;
- the M3 core `hist_front_mean` uses valid values within the most recent five history rows;
- TARGET compatibility removes obstacle and non-finish history rows before downstream parsing;
- live ticket execution uses **actual starters / market coverage**, not the pre-scratch declared field size;
- ticket routes have different stake ratios, so a flat ¥100-per-ticket ROI is not the same as the implemented bankroll policy.

The backtest was therefore rebuilt from the uploaded TARGET-style history and result/odds/payout files instead of forcing the old structural counts to match.

## 2. Primary evaluation universe

Frozen Ability research universe before final-race execution:

- 2025: 403 races / 6,095 runners
- 2026: 297 races / 4,528 runners
- total: 700 races / 10,623 runners

Final execution filters:

- two races had declared field size 12 but only 11 actual starters and are out of scope for the live `12+ runners` rule;
- one 2026-09-06 Hanshin 11R runner (`ファストネットワー`) is absent from the uploaded TARGET-history source, so that race is excluded from the primary exact-history replay rather than imputed.

**Primary exact replay: 697 races.**

Market-data integrity:

- final win-odds runner count matched actual starter count in all 700 research-universe races;
- wide payout was inside the stored final wide range in 2,088 / 2,108 checked winning pairs (99.05%); the exceptions were dead-heat races where the realized payout is reduced by the dead-heat split;
- large quinella odds/payout discrepancies were likewise traced to dead heats, not pair-index parsing errors.

## 3. Exact-M3 replay stability

Compared with the previous corrected-M3 reconstruction:

- exact individual M3 rank equality: 92.36%;
- mean absolute rank difference: 0.109;
- M3 Top3-set overlap: **98.24%**;
- actual horse number vs compressed 1..N horse-number sensitivity: M3 Top3 set was **identical in all 700 races**.

Interpretation: the exact queue/frontness distinction changes some lower-order ranks, but the structural M3 Top3 layer is highly stable.

## 4. Candidate C Ability replay stability

Candidate C was replayed two ways:

1. the prior frozen research/audit feature set;
2. a TARGET-history direct reconstruction after obstacle/non-finish filtering, using the same frozen Candidate C formula and the same frozen Elo term available in the prior audit data.

Candidate C rank equality between the two reconstructions was 83.55%, but the race-level Top3-set overlap was **95.48%** (2025: 95.45%, 2026: 95.51%).

Ticket results below therefore report the direct TARGET-history reconstruction as the primary runtime-like sensitivity and retain the audit reconstruction as a robustness check.

## 5. Structural quality — exact replay

Primary direct TARGET-history Candidate C vs direct v1, same exact M3, 697 races:

| Diagnostic | v1 direct | Candidate C direct |
|---|---:|---:|
| Structural horses | 791 | 736 |
| Structural Top3 | 43.24% | **44.97%** |
| Structural win | 16.69% | **16.98%** |
| Production-style single routes | 133 | 121 |
| Single-axis Top3 | 47.37% | 47.93% |
| Single-axis win | 21.05% | 20.66% |
| Pair Survival passes | 52 | 53 |
| Both pair horses Top3 | 32.69% | 30.19% |

Race-cluster bootstrap, 5,000 resamples, Candidate C minus v1:

| Metric | Point delta | 95% diagnostic interval |
|---|---:|---:|
| Structural Top3 | +1.74 pt | **-0.47 to +3.92 pt** |
| Structural win | +0.30 pt | -1.09 to +1.71 pt |
| Single-axis Top3 | +0.57 pt | -8.13 to +9.30 pt |
| Single-axis win | -0.39 pt | -6.71 to +6.03 pt |
| Pair both Top3 | -2.50 pt | -14.58 to +9.52 pt |
| Structural opportunity count | -55 horses | -87 to -23 |

This is weaker evidence than the earlier simplified reconstruction. In particular, the previously reported positive-only interval for structural Top3 does **not** survive the closer runtime replay and must not be used as promotion evidence.

## 6. Ticket replay rules

The current `structural-ticket-engine-v3.0` rules were preserved rather than tuned to Candidate C.

Single-structure route:

- exactly one `M3 Top3 × Ability Top3` horse;
- it must be Ability #1;
- axis must be win-popularity 1–6;
- if #6, the #6→#7 win-odds gap must exceed 10%;
- Wide: axis × top two win-popularity opponents, both final stored wide-low odds >= 4.0;
- Quinella: same two pairs, opponent #2→#3 boundary >10%, both quinella odds >=7.0;
- Trio: axis + top two opponents, opponent boundary >10%, no price hard gate.

Double-structure route:

- exactly two structural horses;
- Ability #1 must be included;
- Wide: structural pair;
- Quinella: Ability #1 structural axis × best Ability-ranked non-structural challenger;
- Trio: field <=15 and M3 #1 included, structural pair × top four win-popularity third horses.

No threshold was changed after viewing Candidate C results.

## 7. Primary ticket results — implemented fixed ¥50,000 base stake ratios

The policy-weighted replay uses the engine’s base stake ratios rather than equal ¥100 bets:

- Double: Wide 2%, Quinella 1%, Trio total 1.6%;
- Single: Wide 1% per ticket, Quinella 0.4% per ticket, Trio 0.4%.

### Candidate C direct — year split

| Year | Ticket | Bet races | ROI | Hit rate | Max losing streak | Max DD (fixed-policy P/L) |
|---|---|---:|---:|---:|---:|---:|
| 2025 | Wide | 107 | 63.18% | 17.76% | 13 | ¥48,600 |
| 2025 | Quinella | 115 | 132.48% | 13.04% | 21 | ¥12,800 |
| 2025 | Trio | 95 | 143.04% | 9.47% | 22 | ¥13,920 |
| 2026 | Wide | 79 | 75.70% | 18.99% | 12 | ¥29,000 |
| 2026 | Quinella | 83 | **39.90%** | 3.61% | 66 | ¥32,960 |
| 2026 | Trio | 53 | 246.03% | 15.09% | 10 | ¥5,120 |

### Candidate C direct — pooled

| Ticket | Bet races | Stake | Return | ROI | Race-bootstrap 95% interval |
|---|---:|---:|---:|---:|---:|
| Wide | 186 | ¥186,000 | ¥127,400 | **68.49%** | **44.94–94.54%** |
| Quinella | 198 | ¥93,200 | ¥87,180 | **93.54%** | 40.00–161.61% |
| Trio | 148 | ¥61,400 | ¥111,720 | **181.95%** | 69.81–324.51% |

Interpretation:

- Wide is negative in both years and its pooled diagnostic interval remains below 100%.
- Quinella is unstable: strong 2025 but a severe 2026 collapse.
- Trio has a large positive point estimate, but uncertainty is wide and the 95% interval still includes 100%.

## 8. Route decomposition

Candidate C direct, pooled fixed-policy replay:

| Ticket | Route | Races | ROI | Hit rate | 95% bootstrap interval |
|---|---|---:|---:|---:|---:|
| Wide | Single | 46 | 68.26% | 21.74% | 30.76–112.17% |
| Wide | Double | 140 | 68.57% | 17.14% | 39.93–100.07% |
| Quinella | Single | 58 | 99.48% | 18.97% | 47.76–158.71% |
| Quinella | Double | 140 | 91.57% | 5.00% | 21.71–177.79% |
| Trio | Single | 95 | **43.89%** | 3.16% | **0.00–98.84%** |
| Trio | Double | 53 | **243.82%** | 26.42% | 87.92–445.19% |

The current combined Trio result is therefore not one homogeneous edge. It is the sum of a very weak single-axis Trio route and a high-variance double-structure Trio route.

Year split for double-structure Trio:

- 2025: 32 races, ROI 189.06%;
- 2026: 21 races, ROI 327.26%.

Both are positive point estimates, but the sample is only 53 races pooled and the interval still crosses 100%.

## 9. High-payout sensitivity

Candidate C direct pooled fixed-policy ROI after setting the largest winning event(s) to zero while retaining their stakes:

| Ticket | Baseline | Largest 1 removed | Largest 2 removed | Largest 3 removed |
|---|---:|---:|---:|---:|
| Wide | 68.49% | 62.42% | 57.15% | 53.06% |
| Quinella | 93.54% | 71.22% | 57.97% | 45.10% |
| Trio | 181.95% | 137.36% | **97.17%** | 73.84% |

Double-structure Trio only:

- baseline: 243.82%;
- largest one removed: 179.25%;
- largest two removed: 121.04%;
- largest three removed: **87.26%**.

Return concentration for Candidate C direct:

- Wide: top 3 winning events = 22.5% of total return;
- Quinella: top 3 = 51.8%;
- Trio: top 3 = **59.4%**.

Thus the Trio result is materially high-payout dependent.

## 10. Candidate C vs v1 ticket comparison

Using the direct TARGET-history reconstruction for both models and the same exact M3:

Pooled fixed-policy ROI:

| Ticket | v1 direct | Candidate C direct |
|---|---:|---:|
| Wide | 75.54% | 68.49% |
| Quinella | 115.24% | 93.54% |
| Trio | 155.10% | 181.95% |

Paired race-bootstrap Candidate C minus v1 ROI difference:

| Ticket | Median delta | 95% interval | P(delta > 0) diagnostic |
|---|---:|---:|---:|
| Wide | about -7 pt | -30.4 to +16.9 pt | 0.28 |
| Quinella | about -22 pt | -66.5 to +22.4 pt | 0.16 |
| Trio | about +21 pt | -53.0 to +140.0 pt | 0.67 |

No ticket type shows statistically resolved Candidate C superiority over v1 in this research-touched sample.

## 11. Bankroll-path diagnostic

Starting each ticket type from a separate ¥50,000 bank and applying the engine’s percentage/rounding stake function sequentially gives the following Candidate C direct path:

- Wide final bank: ¥14,110; max drawdown about ¥45,380;
- Quinella final bank: ¥39,370; max drawdown about ¥37,190;
- Trio final bank: ¥104,810; max drawdown about ¥21,620.

Same-day cross-venue ordering is only approximate in this historical replay, so these bankroll-path figures are risk diagnostics, not exact accounting.

## 12. Statistical caveats

1. **2025–2026 are research-touched.** Candidate-family ideas and diagnostics have already been inspected on these years. Bootstrap intervals here are diagnostic, not pristine confirmatory inference.
2. **Final odds are used as the historical market snapshot.** The live process may use T-15 / T-5 odds, so popularity boundaries and price gates can differ prospectively. This backtest cannot prove live T-15 execution ROI.
3. Multiple model/ticket diagnostics have been inspected. Do not interpret one favorable route as a classical unadjusted significance claim.
4. The 53-race double-Trio sample is small and payout-heavy; two large winners are enough to move the ROI near 100%.
5. Candidate C is intentionally not recalibrated or retuned on 2025–2026 after these results were opened.

## 13. Decision

### Ability Rank

- Candidate C remains **semantically preferable** to v1 for an interpretable Ability ranking.
- In the closer runtime replay, its structural-quality improvement is smaller and not statistically resolved.
- Keep Candidate C as a **frozen Shadow rank**.
- Do **not** switch the production structural/ticket engine to Candidate C yet.

### Tickets

- Wide: **do not promote** under Candidate C; current evidence is negative.
- Quinella: **do not promote**; year instability is severe.
- Single-axis Trio: **negative diagnostic**, but do not post-hoc rewrite production rules and then claim the same 2025–2026 data as validation.
- Double-structure Trio: **most promising research signal**, but high variance / payout concentration prevents production promotion from this sample alone.

### Next prospective protocol

Freeze without further 2025–2026 tuning:

1. Legacy v1 production/comparison path remains unchanged.
2. Candidate C rank is logged in parallel as Shadow.
3. Log ticket outcomes separately for:
   - Wide single / double;
   - Quinella single / double;
   - Trio single / double.
4. Pre-register one shadow policy before new races arrive: **double-structure Trio only** is the primary candidate; single-axis Trio is tracked but not used as supporting evidence for the double route.
5. Use actual T-15/T-5 odds snapshots prospectively, not final odds.
6. Preserve 2027 as the clean promotion holdout.
7. Promotion requires acceptable year/period stability, race-cluster CI, drawdown, and payout-concentration checks — not ROI point estimate alone.

Current conclusion: **Candidate C is worth continuing as a Shadow Ability rank, but the automatic ticket engine should not be switched yet. Double-structure Trio is the only route that merits focused prospective validation.**
