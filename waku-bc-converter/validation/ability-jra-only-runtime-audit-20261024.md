# Ability v1 JRA-only runtime audit — 2026-10-24

## Decision

**ADOPT — JRA_ONLY_RUNTIME_HISTORY**

**Performance claim: MODEST / SUPPORTED BY 2026 HOLDOUT FOR CONTINUOUS SCORE QUALITY.**

Ability v1 was trained and validated on the JRA flat universe. Runtime history is therefore restricted to JRA central racing only. Local/NAR and overseas starts remain visible as reference metadata but do not enter Ability score, rank, projected top-3 probability, or axis logic.

This is primarily a population-consistency / data-hygiene correction. The 2026 holdout additionally shows statistically reliable improvement in AUC, Log Loss and Brier score. It does **not** establish a statistically significant improvement in Ability1 top-3 hit rate or Ability Top3 capture.

## Runtime policy

- Included venues: 札幌 / 函館 / 福島 / 新潟 / 東京 / 中山 / 中京 / 京都 / 阪神 / 小倉.
- TARGET shorthand such as `4東2`, `1京10`, `1函A` is recognized as JRA.
- Known NAR venues are tagged `local` and excluded from Ability.
- Any other non-empty venue is tagged `overseas` and excluded from Ability.
- Blank/unrecognized venue is excluded as `unknown` rather than silently treated as JRA.
- Class eligibility inside JRA remains Ability v1's existing 3-win-or-higher mapping.
- Runtime history remains the most recent five eligible JRA starts strictly before the target race.
- Rank tie-break is horse number, matching production behavior.

## Why this is a correction, not a new model

The frozen model metadata defines the universe as `JRA flat, field_size>=12, 3-win class or higher`. The previous runtime parser did not check venue and could feed local/overseas races into a model trained on JRA races. The new filter restores train/runtime population consistency. Model coefficients are unchanged and no foreign/local class conversion is introduced.

Frozen model reference metrics remain:

| Year | Races | AUC | Log Loss | Brier |
|---|---:|---:|---:|---:|
| 2025 | 403 | 0.68587 | 0.46446 | 0.14822 |
| 2026 | 297 | 0.68377 | 0.46209 | 0.14681 |
| 2025–26 pooled | 700 | 0.68495 | 0.46345 | 0.14762 |

The runtime replay below is a paired old-vs-new audit using the same frozen coefficients. Its old baseline is extremely close, but not byte-for-byte identical, to the historical frozen pipeline; paired deltas are therefore the intended inference.

## Validation protocol

Exact Ability universe reconstructed from results:

- 2025: **403 races**
- 2026: **297 races**
- total: **700 races / 10,623 runners**
- JRA flat only, field size >=12, 3-win-or-higher class codes
- all features use strictly prior history only
- max five eligible high-class starts
- old parser = venue-blind runtime behavior
- new parser = JRA-only runtime behavior
- same Ability v1 coefficients for both versions
- race-number tie break identical to production

Inference:

- paired comparisons at race level
- **5,000 race-cluster bootstrap resamples** for metric deltas and 95% confidence intervals
- McNemar exact test for paired Ability1 top-3 changes
- Wilcoxon signed-rank test for per-race Ability Top3 capture changes
- 2026 treated as the main untouched holdout for the runtime correction

### Replay fidelity

Reconstructed old raw Ability logit versus the prior saved runtime replay:

- n = **10,623 runners**
- mean absolute error = **0.000203**
- Pearson correlation = **0.999979**

This supports use of the replay for paired old-vs-new comparisons. The audit does not claim that the reconstructed old absolute metrics exactly replace the frozen published metrics.

## Contamination audit — `umadete.csv`

Rows audited: **371,343**.

| Venue class | All history rows | Rows matching old Ability class parser |
|---|---:|---:|
| JRA | 359,550 | 170,900 |
| Local/NAR | 10,488 | 3,412 |
| Overseas | 1,305 | 1,207 |

The previous venue-blind runtime could admit **4,619 non-JRA class-eligible rows**, involving **418 unique horses**. This is exposure count; not every row necessarily entered a particular horse's five-start window.

# 1. Ability standalone validation

## 2025 reference year — 403 races

| Metric | Old venue-blind | JRA-only | Delta new-old | 95% race-bootstrap CI |
|---|---:|---:|---:|---:|
| AUC | 0.68468 | 0.68372 | -0.00095 | [-0.00417, +0.00249] |
| Log Loss | 0.46470 | 0.46504 | +0.00034 | [-0.00067, +0.00128] |
| Brier | 0.14828 | 0.14840 | +0.00012 | [-0.00022, +0.00043] |
| Ability1 top3 | 43.92% | 43.42% | -0.50 pp | [-2.23, +1.24] pp |
| Ability Top3 overlap | 36.64% | 36.81% | +0.17 pp | [-0.66, +0.99] pp |

Ability1 win rate: **19.35% -> 18.36%**.

Paired Ability1 top3 changes: old-only 7 races / new-only 5 races; McNemar exact **p=0.774**.

Interpretation: **no statistically reliable improvement or deterioration in 2025**. The filter was not adopted because 2025 happened to improve; it is an a-priori population-consistency correction.

## 2026 complete holdout — 297 races

| Metric | Old venue-blind | JRA-only | Delta new-old | 95% race-bootstrap CI |
|---|---:|---:|---:|---:|
| **AUC** | 0.67917 | **0.68408** | **+0.00491** | **[+0.00117, +0.00840]** |
| **Log Loss** | 0.46351 | **0.46200** | **-0.00151** | **[-0.00260, -0.00032]** |
| **Brier** | 0.14731 | **0.14678** | **-0.000527** | **[-0.000920, -0.000101]** |
| Ability1 top3 | 39.06% | 39.73% | +0.67 pp | [-1.35, +2.69] pp |
| Ability Top3 overlap | 35.24% | 35.80% | +0.56 pp | [-0.34, +1.46] pp |

Ability1 win rate: **17.17% -> 17.51%**.

Paired Ability1 top3 changes: old-only 3 / new-only 5; McNemar exact **p=0.727**. Per-race Top3 capture comparison: Wilcoxon **p=0.197**.

Interpretation:

- AUC, Log Loss and Brier all improve in the 2026 holdout, with 95% bootstrap intervals entirely on the favorable side of zero.
- Ability1 top3 and Top3 capture move slightly upward, but their intervals cross zero and paired tests are not significant.
- Therefore the supported claim is **better continuous score/ranking quality**, not a proven increase in axis hit rate.

## 2025–26 pooled — 700 races

| Metric | Old | JRA-only | Delta | 95% CI |
|---|---:|---:|---:|---:|
| AUC | 0.68233 | 0.68383 | +0.00150 | [-0.00080, +0.00399] |
| Log Loss | 0.46419 | 0.46375 | -0.00045 | [-0.00118, +0.00029] |
| Brier | 0.14787 | 0.14771 | -0.00016 | [-0.00042, +0.00010] |
| Ability1 top3 | 41.86% | 41.86% | 0.00 pp | — |
| Ability Top3 overlap | 36.05% | 36.38% | +0.33 pp | — |

Pooled deltas are not statistically decisive because 2025 and 2026 effects differ. The 2026 holdout is therefore reported separately rather than hiding the year heterogeneity inside one pooled number.

# 2. Does the filter work where contamination can actually matter?

A race is `affected` when at least one runner had a non-JRA class-eligible start available inside the old five-start Ability window.

## 2026 affected races — 146 races

| Metric | Old | JRA-only | Delta | 95% CI |
|---|---:|---:|---:|---:|
| **AUC** | 0.66842 | **0.67850** | **+0.01009** | **[+0.00293, +0.01723]** |
| **Log Loss** | 0.46590 | **0.46286** | **-0.00304** | **[-0.00526, -0.00082]** |
| **Brier** | 0.14836 | **0.14731** | **-0.00106** | **[-0.00185, -0.00027]** |
| Ability1 top3 | 33.56% | 34.93% | +1.37 pp | [-2.06, +5.48] pp |
| Ability Top3 overlap | 33.79% | 34.93% | +1.14 pp | [-0.69, +2.97] pp |

This is the strongest result in the audit: the continuous Ability score improves specifically in races where the old venue-blind parser could matter.

## 2026 unaffected races — 151 races — negative control

Old and JRA-only are **identical**:

- AUC **0.68993 vs 0.68993**
- Log Loss **0.46115 vs 0.46115**
- Brier **0.14626 vs 0.14626**
- Ability1 win **16.56% vs 16.56%**
- Ability1 top3 **44.37% vs 44.37%**
- Ability Top3 overlap **36.64% vs 36.64%**
- Ability rank changes: **0 races**

This negative control strongly supports that the filter is changing only the intended cases rather than perturbing the whole model.

## Rank-change frequency

| Year | Ability1 changed | Ability Top3 set changed | Affected races |
|---|---:|---:|---:|
| 2025 | 4.22% | 11.66% | 49.13% |
| 2026 | 5.72% | 9.09% | 49.16% |

# 3. Are strong local/overseas returners being discarded?

Top3 membership switches were inspected directly.

| Year | Group | n | Actual top3 | Win |
|---|---|---:|---:|---:|
| 2025 | Dropped from old Ability Top3 | 51 | 27.45% | 11.76% |
| 2025 | Entered new JRA-only Top3 | 51 | 31.37% | 17.65% |
| 2026 | Dropped from old Ability Top3 | 31 | 29.03% | 3.23% |
| 2026 | Entered new JRA-only Top3 | 31 | **45.16%** | **16.13%** |

The 2026 direction favors the new Top3, but the sample is small; Fisher exact for top3 is approximately **p=0.293**, so this is not presented as a significant standalone effect.

Conclusion: **there is no evidence in this audit that excluding local/overseas history systematically removes stronger horses**. The data are compatible with the opposite in 2026, but uncertainty remains.

# 4. M3 × Ability axis logic

A secondary replay of the **current lean M3 core** was also run. This is useful descriptively, but it is **not treated as the primary inferential test** because the current M3 replay does not reproduce an older saved M3 audit closely enough (historical M3 corrections/version drift exist).

Descriptive single-intersection results:

| Year | Version | Single axes | Top3 rate |
|---|---|---:|---:|
| 2025 | old Ability | 196 | 41.33% |
| 2025 | JRA-only | 194 | 41.24% |
| 2026 | old Ability | 134 | 42.54% |
| 2026 | JRA-only | 135 | 45.19% |

By Ability rank in 2026 current-core replay:

- A1: old 46.15% (n=52) -> new 46.30% (n=54)
- A2: old 44.90% (n=49) -> new 45.65% (n=46)
- A3: old 33.33% (n=33) -> new 42.86% (n=35)

These numbers are **descriptive only** until the M3 historical version is frozen and replayed exactly. They are not used to justify adoption of the JRA filter.

# 5. Betting / ROI layer

Historical T-15 snapshots are not available, so any market test here uses final odds as a proxy. The current app also leaves quinella/wide opponent selection to the user, so a clean automatic quinella/wide ROI cannot be causally assigned to the Ability filter.

For a simple descriptive current-core single-axis win proxy only:

| Year | Version | A1+A2 axes | Win ROI | Pop 1–6 ROI |
|---|---|---:|---:|---:|
| 2025 | old | 146 | 80.1% | 92.0% |
| 2025 | JRA-only | 141 | 84.7% | 99.5% |
| 2026 | old | 101 | 101.5% | 101.3% |
| 2026 | JRA-only | 100 | 99.5% | 100.1% |

These are noisy descriptive values, use final-odds proxy, omit the full production P10/frontness/T-15 gates, and **must not be used as a buy-rule claim**.

No new quinella/wide ROI threshold is adopted from this audit.

# Race-level regression examples

## 神無月S

Old Ability Top5:
1. #13 リュウノフライト
2. #2 メリディアンスター
3. #7 ヨリノレジェンド
4. #5 ノーブルロジャー
5. #3 バトゥーキ

JRA-only Ability Top5:
1. #2 メリディアンスター
2. #7 ヨリノレジェンド
3. #5 ノーブルロジャー
4. #3 バトゥーキ
5. #4 ベルジュロネット

#13 changes **Ability #1 -> #9**. Its corrected JRA high-class history count is **0**; the previous runtime had class-eligible local stakes/G3 history available. The old #13 Ability1-based high-confidence interpretation is therefore invalid.

With the current lean M3 Top3 (#13, #7, #3), the corrected Ability Top3 (#2, #7, #5) has a single intersection: **#7 ヨリノレジェンド**, which is Ability2 Shadow / conditional under current DecisionCore.

## カノープスS

Old Top5: #3, #6, #9, #13, #10  
JRA-only Top5: #3, #6, #9, #13, #1

Top2 remains unchanged (#3 / #6).

## ルミエールOD

Ability order is unchanged. This is a useful negative-control example.

## 長岡京S

Old Top5: #8, #10, #12, #7, #14  
JRA-only Top5: #8, #10, #12, #14, #2

#7 had substantial local history and is a useful contamination example.

## 菊花賞

Ability order is unchanged, another negative-control example.

# Final interpretation

1. **Adopt JRA-only runtime history in production.** It restores the training/runtime population match.
2. The 2026 complete holdout provides statistically reliable evidence that AUC, Log Loss and Brier improve, especially in races actually exposed to local/overseas contamination.
3. The filter leaves unaffected 2026 races exactly unchanged, an important negative control.
4. **Do not claim a statistically proven increase in Ability1 top3 hit rate.** That metric improved only slightly and its CI crosses zero.
5. **Do not claim a statistically proven increase in Ability Top3 capture.** The direction is favorable in 2026 but not significant.
6. 2025 is essentially neutral/slightly unfavorable; year heterogeneity is real and should be reported rather than hidden by pooling.
7. No JRA-equivalent conversion for NAR/Jpn or overseas G1/G2/G3 is justified by this audit. Those runs remain reference-only until a separately trained and frozen transfer model exists.
8. Keep forward validation for local/overseas returners and axis decisions.
9. M3-axis historical comparison should be re-audited only after freezing one exact M3 version; current-core descriptive results are not used as primary evidence.
10. No new win/quinella/wide betting threshold is adopted from this audit.
