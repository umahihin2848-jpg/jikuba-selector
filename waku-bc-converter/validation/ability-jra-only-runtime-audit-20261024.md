# Ability v1 JRA-only runtime audit — 2026-10-24

## Decision

**ADOPT — JRA_ONLY_RUNTIME_HISTORY**

Ability v1 is trained and validated on the JRA flat universe. Runtime history is therefore restricted to JRA central racing only. Local/NAR and overseas starts are retained as reference metadata but do not enter Ability score, rank, projected top-3 probability, or axis logic.

## Runtime policy

- Included venues: 札幌 / 函館 / 福島 / 新潟 / 東京 / 中山 / 中京 / 京都 / 阪神 / 小倉.
- TARGET shorthand such as `4東2`, `1京10`, `1函A` is recognized as JRA.
- Known NAR venues are tagged `local` and excluded from Ability.
- Any other non-empty venue is tagged `overseas` and excluded from Ability.
- Blank/unrecognized venue is excluded as `unknown` rather than silently treated as JRA.
- Class eligibility inside JRA remains Ability v1's existing 3-win-or-higher mapping.
- Runtime history remains the most recent five eligible JRA starts.

## Why this is a correction, not a new model

The frozen model metadata defines the universe as `JRA flat, field_size>=12, 3-win class or higher`. The previous runtime parser did not check venue and could feed local/overseas races into a model trained on JRA races. The new filter restores train/runtime population consistency. Model coefficients are unchanged and no foreign/local class conversion is introduced.

Frozen OOS reference remains:

| Year | Races | AUC | Log Loss | Brier |
|---|---:|---:|---:|---:|
| 2025 | 403 | 0.68587 | 0.46446 | 0.14822 |
| 2026 | 297 | 0.68377 | 0.46209 | 0.14681 |
| 2025–26 pooled | 700 | 0.68495 | 0.46345 | 0.14762 |

These are JRA-universe OOS metrics. They are not newly re-estimated by this runtime audit.

## Contamination audit — `umadete.csv`

Rows audited: **371,343**.

| Venue class | All history rows | Rows matching old Ability class parser |
|---|---:|---:|
| JRA | 359,550 | 170,900 |
| Local/NAR | 10,488 | 3,412 |
| Overseas | 1,305 | 1,207 |

Old runtime could therefore admit **4,619 non-JRA class-eligible rows**. They involved **418 unique horses**. This is an exposure count, not the number actually used in a particular five-start window.

## Race-level regression audit

The same frozen Ability v1 formula was replayed with the old venue-blind parser and the corrected JRA-only parser.

### 神無月S

Old Ability Top5:
1. 13 リュウノフライト
2. 2 メリディアンスター
3. 7 ヨリノレジェンド
4. 5 ノーブルロジャー
5. 3 バトゥーキ

JRA-only Ability Top5:
1. 2 メリディアンスター
2. 7 ヨリノレジェンド
3. 5 ノーブルロジャー
4. 3 バトゥーキ
5. 4 ベルジュロネット

13 リュウノフライト changes **Ability #1 → #9**. Its corrected JRA high-class history count is **0**; the prior runtime had class-eligible local stakes/G3 history available to it. The previous #13 Ability1-based axis interpretation is therefore invalid after the correction.

With the current lean M3 Top3 (#13, #7, #3), the corrected Ability Top3 (#2, #7, #5) has a single intersection: **#7 ヨリノレジェンド**. Under current DecisionCore this is **Ability2 Shadow / conditional**, not a #13 high-confidence axis.

### カノープスS

Old Top5: #3, #6, #9, #13, #10  
JRA-only Top5: #3, #6, #9, #13, #1

Top2 stays unchanged (#3 / #6). Seven runners change rank; largest absolute shift is 6 ranks.

### ルミエールOD

Ability order is unchanged in the regression replay. This is a negative-control result: when relevant local/overseas history does not affect the five-start Ability window, the new filter does not perturb ranking.

### 長岡京S

Old Top5: #8, #10, #12, #7, #14  
JRA-only Top5: #8, #10, #12, #14, #2

Seven runners change rank; largest absolute shift is 3 ranks. #7 had substantial local history and is a useful contamination example.

### 菊花賞

Ability order is unchanged in the regression replay, another negative-control result.

## Interpretation

1. The old parser could materially distort Ability in races containing local/overseas returnees.
2. The corrected filter changes affected races and leaves unaffected control races stable.
3. The change aligns runtime data with the frozen model's stated JRA training/OOS universe.
4. Local/overseas results should remain visible as context, but no JRA-equivalent G1/G2/G3 conversion should be introduced without a separately trained and frozen validation model.
5. A new OOS AUC is **not** claimed by this audit. A full 700-race raw-feature replay would be required to publish a newly recomputed metric; the model's existing OOS numbers remain the appropriate frozen reference because their universe was already JRA-only.
