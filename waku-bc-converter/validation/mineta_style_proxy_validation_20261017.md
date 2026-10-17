# Mineta-style proxy validation (2026-10-17)

## Purpose
Test two ideas inspired by publicly described betting concepts:
1. a single high-expectation axis horse plus high-expectation partners,
2. races containing a dangerous favorite.

This is **not an exact reproduction of Mineta's proprietary definitions**. The public material does not disclose a fully operational rule for "high-expectation horse" or "dangerous favorite". Therefore the test below uses explicit, reproducible proxies built only from the project's frozen market-independent layers and closing market prices.

No production betting rule is deployed from this report.

## Data / protocol
- Universe: same reconstructed 2025 / 2026 high-class universe used in the recent EV work.
- 2025: 401 races / 6,060 runners.
- 2026: 297 races / 4,526 runners.
- Ability/PL win probability: existing coherent Plackett-Luce layer.
- M3: frozen market-independent structural top-3 ranking/probability.
- P10: deployed `position-risk-runtime-v2` reconstruction.
- Price / settlement: historical closing odds and payout files.
- 2025 is the selection/development year. 2026 is evaluated after rule families are fixed.
- Closing-price caveat: this is not yet a T-15 executable backtest.

---

# 1. Proxy: one high-expectation axis + high-expectation partner

## Operational definition
The goal was to avoid using raw `p x odds` as the horse definition, because the previous EV validation showed that very large odds amplify small probability-model errors.

A race has a candidate **axis** when exactly one non-favorite horse satisfies a consensus-ranking rule:
- market rank between 2 and a fixed maximum,
- Ability/PL win-probability rank inside a fixed top-N,
- M3 rank inside a fixed top-N.

A candidate **partner** must also satisfy fixed Ability/PL rank, M3 rank, and market-rank limits.

A coarse grid was searched on 2025 only:
- axis PL rank: <=2 / <=3 / <=4
- axis M3 rank: <=2 / <=3 / <=4
- axis market rank max: 6 / 8
- partner PL rank: <=4 / <=6 / <=8
- partner M3 rank: <=4 / <=6 / <=8
- partner market rank max: 8 / 10
- ticket: quinella / wide

2025 robustness screen:
- >=100 bets,
- >=5 hits,
- full-year ROI >=120%,
- H1 ROI >=100%,
- H2 ROI >=100%,
- top-3 winning payouts <=65% of total return.

This screen produced 94 distinct selected-bet sets:
- 91 quinella sets,
- 3 wide sets.

## 2026 holdout family result
### Quinella
Across the 91 distinct 2025-qualified quinella sets:
- median 2026 ROI: **99.3%**
- mean 2026 ROI: **98.3%**
- 43 / 91 remained above 100%
- 13 / 91 remained above 120%
- **0 / 91 remained above 150%**
- best 2026 point estimate: **149.1%**

The best 2026 point-estimate rule in this family had:
- 2025: 275 bets / 19 hits / ROI 158.5%
- 2026: 176 bets / 14 hits / ROI 149.1%

However, its 2026 second-half-to-date ROI was only about 53.6%, so even the best point estimate is not a stable 150% rule.

### Wide
Only 3 distinct wide sets passed the 2025 robustness screen.
Their 2026 ROIs were approximately:
- 90.6%
- 82.6%
- 98.7%

None stayed above 100%.

## Interpretation
The **concept has some signal for quinella**, because many 2025-selected sets did not collapse completely in 2026 and the best rules remained near 150%.

But the family as a whole regressed to approximately break-even in 2026. Therefore the current Ability+M3 consensus proxy is **not sufficient to reproduce a stable 150% "one axis + high-expectation partner" strategy**.

It is promising as a structural shortlist, not yet as an automatic buy rule.

---

# 2. Proxy: dangerous favorite

## Fixed definition
Use the already-fixed P10 strong-caution band rather than tuning a new threshold:

**Dangerous favorite proxy = market favorite with P10 >=65%.**

This tests whether a heavily backed horse that is structurally likely to be 10th-or-worse at the first valid passage underperforms its market price.

## Favorite itself
### 2025
- 146 races
- favorite wins: 31 / 146 = **21.23%**
- market-implied expected win rate: **26.62%**
- favorite closing win ROI: **58.6%**

### 2026
- 74 races
- favorite wins: 15 / 74 = **20.27%**
- market-implied expected win rate: **25.03%**
- favorite closing win ROI: **66.9%**

### Pooled
- 220 dangerous-favorite races
- observed favorite wins: 46
- market-implied expected wins: about 57.4
- observed win rate: **20.91%**
- average market-implied win probability: **26.08%**
- favorite closing win ROI: **61.4%**

The direction repeats in both years: high-P10 favorites underperform both the market-implied win rate and the already-poor average favorite return.

This is useful as an **avoid / caution signal**, but sample size is still insufficient to claim a standalone exploitable edge.

## Does the value automatically move to other horses?
Not enough.

For quinella tickets excluding the favorite, raw closing ROI was higher in dangerous-favorite races than in ordinary races:
- 2025 dangerous-favorite races, no-favorite quinellas: about **77.3%**
- 2025 ordinary races, no-favorite quinellas: about **61.8%**
- 2026 dangerous-favorite races, no-favorite quinellas: about **80.2%**
- 2026 ordinary races, no-favorite quinellas: about **61.1%**

The direction is consistent, which suggests that a vulnerable favorite may create a more favorable price environment elsewhere in the race.

But these broad pools are still below 100% ROI. Therefore "dangerous favorite exists -> buy other horses" is not a valid rule by itself.

---

# 3. Interaction: dangerous favorite + one-axis strategy

The consensus-axis family was also restricted to races where the favorite had P10 >=65%.

Only two wide-rule sets passed even a relaxed 2025 robustness screen.
Their 2026 ROIs were approximately:
- 92.2%
- 60.2%

No stable positive edge appeared.

Therefore the two ideas should **not** currently be multiplied together mechanically.

---

# Decision
## What survives
1. **Dangerous favorite is the stronger finding.**
   - P10 >=65% favorite underperformed market expectation in both 2025 and 2026.
   - Keep as a visible warning / race-context feature.

2. **One-axis + high-expectation partner remains interesting for quinella.**
   - The 2025-selected family regressed toward 100% in 2026.
   - No 2025-selected rule remained above 150% in 2026.
   - Do not deploy as a 150% strategy yet.

3. The public Mineta-style concept cannot be fairly rejected from this proxy test, because the exact "high-expectation horse" construction is not public and may contain information not represented by current Ability/M3/P10 layers.

## Recommended next step
Instead of further threshold-tuning the current models, build an **empirical condition-return layer** closer to the public philosophy:
- define horse conditions using only information available pre-race,
- group historical runners by course / distance / class / age / prior-race pattern / position style / market rank,
- estimate shrunk historical win and top-3 return by condition,
- create a horse-level "historical condition edge" independent of M3/Ability,
- then test:
  - exactly one strong condition-edge horse in the race,
  - condition-edge partners,
  - dangerous-favorite presence,
  - 2025 development -> 2026 untouched confirmation.

This is materially different from asking the current probability model to beat the market. It tests whether repeatable **historical condition patterns** create value, which is much closer to the public betting philosophy being investigated.
