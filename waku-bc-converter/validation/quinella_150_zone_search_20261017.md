# Quinella 150% ROI zone search (2026-10-17)

## Goal
Search for quinella candidate regions that could plausibly support a long-run ROI target around 150%, using the already-built coherent probability layer plus closing odds, while testing P10 / front-pressure as filters.

This is a validation report only. No production buy rule is deployed from this result.

## Data / protocol
- Candidate tickets: historical quinella combinations from the reconstructed 2025 / 2026 high-class universe.
- Probability `p`: coherent ticket probability from the existing Ability/Plackett-Luce layer.
- Price: historical closing quinella odds.
- EV: `p * odds`.
- P10: deployed `position-risk-runtime-v2` reconstruction using strictly prior history.
- Front pressure: leave-one-out mean of each rival's recent `front5_mean`, with the already-fixed bands low <=0.533 / high >=0.620.
- Search variables on 2025 only: probability band, odds band, EV band, max pair P10, and pressure band.
- Coarse pre-defined grids were used; minimum 80 bets per 2025 rule.
- To reduce obvious overfit, a 2025 candidate was called "robust" only when:
  - full-year ROI >=150%,
  - both 2025 H1 and H2 ROI >=100%,
  - at least 5 hits,
  - top-3 winning payouts <=65% of total return,
  - at least 100 bets.
- After that family was frozen, 2026 was evaluated.
- Closing-price caveat remains: this is not yet a T-15 executable backtest.

## Family-level result
52 parameter rows passed the 2025 robustness screen, representing **36 distinct selected-bet sets** after deduplication.

On 2026:
- only **2 / 36** distinct 2025 candidate sets remained above ROI 100%,
- only **1 / 36** remained above ROI 150%.

Therefore most apparent 2025 "150% zones" did **not** replicate.

## The only 150% zone that replicated
One effective candidate set survived:

- model quinella probability: **2.5% to <5.0%**
- closing odds: **50x to <80x**
- model EV: **1.10 to <2.00**
- P10: **no cutoff**
- front pressure: **no cutoff**

Several neighboring grid rows map to the same effective ticket set, so this is one candidate island, not six independent findings.

### 2025
- 158 bets / 125 races
- 5 hits
- ROI **171.7%**
- H1 ROI **218.6%**
- H2 ROI **127.2%**
- mean model probability 2.86%
- mean odds 58.6x
- mean model EV 1.67
- top-3 winners contributed 62.0% of return
- race-bootstrap 95% ROI interval approximately **34% to 338%**

At 500 yen per ticket:
- invested 79,000 yen
- returned 135,650 yen
- profit +56,650 yen

### 2026
- 111 bets / 91 races
- 4 hits
- ROI **205.1%**
- 2026 H1 ROI 316.3%; H2 through the available data had 0 hits
- mean model probability 2.89%
- mean odds 58.9x
- mean model EV 1.69
- top-3 winners contributed 76.9% of return
- race-bootstrap 95% ROI interval approximately **47% to 426%**

At 500 yen per ticket:
- invested 55,500 yen
- returned 113,850 yen
- profit +58,350 yen

### Combined 2025+2026
- 269 bets / 216 races
- 9 hits
- ROI **185.5%**
- invested 134,500 yen at 500 yen each
- returned 249,500 yen
- profit +115,000 yen
- combined top-1 payout concentration 12.7%
- combined top-3 payout concentration 35.9%
- race-bootstrap 95% ROI interval approximately **78% to 312%**

The point estimate clears 150%, but the uncertainty interval still includes below 100% because only 9 winning tickets were observed.

## Broader neighboring zone
A broader version was also examined:

- probability 2.0% to <5.0%
- odds 50x to <80x
- EV 1.10 to <2.00
- no P10 / pressure cutoff

Results:
- 2025: 430 bets / 11 hits / ROI **153.2%**
- 2026: 308 bets / 6 hits / ROI **115.8%**
- combined: 738 bets / 17 hits / ROI **137.6%**

This broader, higher-sample rule does **not** meet the 150% target on 2026 and is a useful warning that the narrow 2.5% floor may be a fragile boundary.

## P10 result for quinella
The earlier single-win finding "high P10 is a useful caution brake" does **not** transfer cleanly to quinella pairs.

Inside the surviving 2.5-5% / 50-80x / EV<2 island:
- 2025: pairs with both horses P10<50% had 21 bets and 0 hits; all 5 winners were in pairs where at least one horse had P10>=65%.
- 2026: both-horses-P10<50% had 18 bets / 2 hits / very high ROI, while max-P10>=65% had 82 bets / 2 hits / ROI 141.6%.

The direction flips and sample sizes are tiny. Therefore:

**Do not apply the single-win P10>=50% brake to quinella pairs.**

P10 remains a useful single-horse structural risk display and possible win-ticket caution, but not a validated quinella cutoff.

## Front-pressure result
Pressure filtering was also unstable.

For the surviving island:
- 2025 low-pressure ROI was high, mid-pressure had 0 hits, high-pressure was high.
- 2026 low-pressure had 0 hits, mid-pressure was high, high-pressure had 0 hits.

No direction replicates. Do not use low / mid / high pressure as a quinella buy filter yet.

## Decision
### Interesting candidate, not production-ready
The 2.5-5% probability / 50-80x odds / EV 1.10-2.00 quinella island is the first narrow region in this sequence to clear 150% in both 2025 and 2026 point estimates.

However it is **not yet validated as a 150% strategy**, because:
- only 9 total winners,
- very wide race-bootstrap intervals,
- 2026 second half currently has no hits,
- the rule emerged from a multi-condition search,
- all prices are closing prices rather than executable T-15 prices.

### Production policy
- Do not deploy as an automatic buy signal yet.
- Keep this exact rule frozen as a **forward candidate**.
- Do not tune the 2.5%, 5%, 50x, 80x, or EV boundaries against future outcomes.
- Do not add P10 or pressure filters to this quinella candidate based on current evidence.

## Next required validation
1. Re-run this exact frozen candidate on T-15 quinella odds when enough snapshots are available.
2. Continue collecting future races without changing thresholds.
3. Require materially more hits / bets before calling 150% established.
4. Compare fixed 500 yen staking vs portfolio exposure limits only after the edge itself survives.
