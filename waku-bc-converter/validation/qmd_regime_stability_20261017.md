# QMD regime stability validation (2026-10-17)

## Goal
Validate whether the previously retained Quinella Market Disagreement signal (QMD) remains directionally useful across pre-specified market regimes, without optimizing ROI.

QMD is the disagreement between:
- the quinella probability implied by the normalized single-win market under a coherent Plackett-Luce construction, and
- the quinella market's own normalized probability.

For pair i-j:

`R = q_single-win-implied / q_quinella-market`

Higher R means the single-win market rates the pair relatively more strongly than the quinella market.

The question here is not whether a subgroup is profitable. The question is:

> within each broad market regime, do higher-QMD pairs tend to realize more winning quinellas relative to the quinella market's own expectation?

---

## Data / reconstruction
- supplied TARGET closing win / quinella odds and payout files,
- 2021-2026,
- JRA flat,
- current class 3-win or higher,
- field size >=12 after active-horse reconstruction,
- all-2yo races excluded,
- dead-heat races with multiple winning quinella combinations excluded.

Current strict metadata-matched reconstruction:
- **2,159 races**
- **235,382 unordered quinella pairs**

Year race counts:
- 2021: 363
- 2022: 364
- 2023: 392
- 2024: 387
- 2025: 376
- 2026: 277

This count is slightly different from earlier QMD reports because this pass uses a stricter race-metadata join and active-runner reconstruction. The signal definition is unchanged.

All prices are final / closing prices. This remains a market-structure validation, not an executable T-15 backtest.

---

## Validation method
Four regime families were fixed before looking at outcomes:

1. **favorite concentration** = normalized win-market probability of the top two horses
   - low: <40%
   - middle: 40-50%
   - high: >=50%

2. **quinella market rank**
   - 1-10
   - 11-30
   - 31-60
   - 61+

3. **field size**
   - 12-13
   - 14-15
   - 16+

4. **class family**
   - G1/G2
   - G3
   - L/OP
   - 3-win

Within each year and regime category, pairs were sorted by raw QMD ratio R and split into five equal-count groups.

For each quintile:

`O/E = observed winning quinellas / sum(quinella-market probabilities)`

No payout or ROI enters the grouping.

Race-level bootstrap was used for the difference between highest-QMD and lowest-QMD quintiles.

---

# 1. Favorite concentration

| top-2 win-market concentration | QMD Q1 O/E | Q2 | Q3 | Q4 | Q5 O/E | rank trend | Q5>Q1 years | Q5>1 years |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| <40% | 0.801 | 0.967 | 1.017 | 0.988 | **1.056** | 0.90 | 4/6 | 4/6 |
| 40-50% | 0.798 | 0.794 | 0.923 | 1.096 | **1.033** | 0.80 | 3/6 | 4/6 |
| >=50% | **0.486** | 0.914 | 1.010 | 0.836 | **1.100** | 0.70 | 5/6 | **6/6** |

For the >=50% concentration regime:
- highest minus lowest quintile O/E bootstrap 95% CI: approximately **[+0.220, +0.954]**
- highest-QMD quintile O/E 95% CI: approximately **[1.033, 1.166]**

### Interpretation
QMD survives all three concentration regimes directionally, but the cleanest extreme separation is in races where the top two win-market horses hold at least half of normalized win probability.

This is **not** a new buy threshold. It means QMD is particularly credible as a diagnostic when the win market is concentrated.

---

# 2. Quinella market rank

| quinella rank | Q1 O/E | Q2 | Q3 | Q4 | Q5 O/E | rank trend | Q5>Q1 years | Q5>1 years |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1-10 | 0.900 | 0.885 | 1.080 | 0.956 | **1.129** | 0.80 | 5/6 | 5/6 |
| 11-30 | 0.802 | 0.907 | 1.074 | 1.042 | **1.093** | 0.90 | 5/6 | 5/6 |
| 31-60 | 0.775 | 1.199 | 0.991 | 1.186 | 1.009 | 0.30 | 4/6 | 4/6 |
| 61+ | **0.264** | 0.702 | 1.028 | 1.154 | 1.012 | 0.70 | **6/6** | 4/6 |

Highest-minus-lowest quintile bootstrap 95% CI:
- rank 1-10: **[+0.044, +0.422]**
- rank 11-30: **[+0.051, +0.534]**
- rank 31-60: **[-0.117, +0.574]**
- rank 61+: **[+0.304, +1.188]**

### Interpretation
The most useful probability-ordering evidence is in the **top 30 quinella ranks**. The tail also shows very strong overvaluation in the lowest-QMD group, but the winning-pair counts are sparse and the top-QMD tail itself is less precise.

The 31-60 region is the weakest: QMD ordering is noisy and does not show a clean gradient.

Again, this is a reliability map for QMD, not a ticket-ranking cutoff optimized for return.

---

# 3. Field size

| field | Q1 O/E | Q2 | Q3 | Q4 | Q5 O/E | rank trend | Q5>Q1 years | Q5>1 years |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 12-13 | 1.008 | 0.940 | 0.832 | 1.011 | 1.077 | 0.60 | 3/6 | 4/6 |
| 14-15 | **0.539** | 0.916 | 0.981 | 1.004 | **1.066** | **1.00** | 5/6 | 5/6 |
| 16+ | 0.745 | 0.814 | 1.013 | 1.008 | **1.060** | 0.90 | **6/6** | 5/6 |

Highest-minus-lowest quintile bootstrap 95% CI:
- 12-13: **[-0.499, +0.609]**
- 14-15: **[+0.155, +0.822]**
- 16+: **[+0.017, +0.615]**

### Interpretation
QMD is materially more stable in **14+ runner fields**.

The 12-13 runner group is too noisy to claim reliable separation. This does not mean QMD is false there; it means the current evidence is weaker.

---

# 4. Class family

| class | Q1 O/E | Q2 | Q3 | Q4 | Q5 O/E | rank trend | Q5>Q1 years | Q5>1 years |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 3-win | **0.609** | 0.939 | 1.011 | 0.923 | **1.093** | 0.70 | **6/6** | 5/6 |
| G1/G2 | 0.861 | 0.980 | 0.898 | 1.004 | **1.072** | 0.90 | 5/6 | 4/6 |
| G3 | 0.916 | 1.019 | 1.036 | 0.920 | 1.050 | 0.70 | 4/6 | 3/6 |
| L/OP | 0.827 | 0.716 | 0.946 | 1.086 | 1.057 | 0.80 | 4/6 | 3/6 |

Highest-minus-lowest quintile bootstrap 95% CI:
- 3-win: **[+0.178, +0.759]**
- G1/G2: **[-0.587, +0.837]**
- G3: **[-0.465, +0.665]**
- L/OP: **[-0.196, +0.581]**

### Interpretation
The cleanest class-family replication is **3-win**, where the highest-QMD group beat the lowest-QMD group in all six years and the bootstrap difference stays above zero.

G1/G2 also points in the expected direction, but the smaller race count makes uncertainty much wider. G3 and L/OP are directionally positive in pooled data but less stable by year.

Do not conclude that QMD should only be used in 3-win races. The correct conclusion is that current evidence strength differs by class.

---

# Overall decision

## QMD survives the regime stress test
The signal does **not** show perfect five-bin monotonicity in every subgroup, which would be unrealistic given winning-pair sparsity.

However, the important directional structure survives across the four pre-specified regime families:
- high-QMD groups are generally above low-QMD groups,
- the strongest separations occur in several logically distinct regimes,
- no ROI threshold or payout information was used to create those regimes.

This supports keeping **QMD as a core quinella-market diagnostic**.

## Evidence-strength map
The current data provide the strongest QMD evidence in:
- top-two win-market concentration >=50%,
- quinella ranks 1-30,
- field size 14+,
- 3-win class.

Weaker / noisier evidence:
- 12-13 runner races,
- quinella ranks 31-60,
- G3 and L/OP when examined separately.

These are **confidence/context labels**, not hard buy / skip rules.

---

# App implication
A clean implementation would keep the QMD number unchanged and add only a small reliability/context label, for example:

- `QMD +9% | evidence: strong` when the pair is in a regime with stronger replication,
- `QMD +9% | evidence: standard` in ordinary regimes,
- `QMD +9% | evidence: limited` in regimes where the historical ordering is currently noisy.

Do not change the QMD formula based on the regime. Do not multiply QMD by class / field / rank coefficients at this stage.

This preserves the main statistical lesson: **the market-disagreement signal is real enough to retain, while regime tests should describe confidence rather than create a new overfit composite score.**

---

# Next clean validation
The next step should no longer search more historical subgroups.

Priority:
1. freeze QMD formula and the regime reliability map,
2. validate on purchase-time snapshots (T-15 / T-10 / T-5) when available,
3. compare closing-QMD versus earlier-QMD stability,
4. test whether the direction survives when only information actually available at bet time is used.

If purchase-time QMD retains the same ordering, QMD can move from a research diagnostic toward a production quinella-shortlist feature.
