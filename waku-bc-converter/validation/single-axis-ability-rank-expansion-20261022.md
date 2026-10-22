# Single-axis structural route — Ability rank expansion audit

Date: 2026-10-22
Status: retrospective diagnostic / Shadow candidate only
Production change: none

## Question
The production single-structural route currently requires exactly one `M3 Top3 × Ability Top3` horse and additionally requires that horse to be **Ability #1**. This audit asks whether the axis eligibility should be widened to Ability #2 or #3.

This is specifically a test of the **single-structural route**. It does not modify M3, Ability rank, the double-structural route, Pair Survival, or any calibrated probability.

## Current production rule
For the single-structural route:
- exactly one structural horse (`M3 rank <=3 AND Ability v1 rank <=3`)
- structural horse must be Ability #1
- axis final/closing win-popularity must be 1–6
- Wide: axis × top two market opponents
- Quinella and Trio: only when the opponent #2 vs #3 win-odds boundary is >10%

The live product uses contemporaneous entered odds. Historical replay below necessarily uses final/closing win odds as a market proxy.

## Reconstruction
- Universe: JRA flat, field size >=12, 3-win class or higher
- Years: 2024–2026
- M3: production v1 reconstruction
- Ability: current `ability_model_v1` reconstruction from strictly-prior 3-win-or-higher histories
- Market: final/closing win odds and popularity proxy
- Payouts: historical payoff records
- Candidate base: replay races with exactly one structural horse

The current replay set contained 545 one-structural races. The available history export reproduced 534 of those as one-structural races under the streamlined current-Ability reconstruction. Eleven mismatched cases were excluded rather than forced into the audit. Coverage is therefore 534/545 (98.0%).

This is a close current-runtime reconstruction, not a pristine prospective experiment. It is suitable for deciding whether an Ability-rank expansion deserves a Shadow test, but not sufficient by itself for production promotion.

## Axis performance by exact Ability rank
Among the 534 reconstructed one-structural races:

| Exact Ability rank of structural horse | Races | Axis Top3 | Axis win |
|---|---:|---:|---:|
| #1 | 223 | 52.9% | 22.4% |
| #2 | 175 | 48.0% | 15.4% |
| #3 | 136 | 34.6% | 14.0% |

Approximate Wilson 95% intervals for axis Top3:
- Ability #1: 46.4%–59.4%
- Ability #2: 40.7%–55.4%
- Ability #3: 27.1%–42.9%

Two-proportion diagnostics for axis Top3:
- #1 vs #2: p≈0.33
- #2 vs #3: p≈0.017
- #1 vs #3: p≈0.00071

Interpretation: Ability #2 behaved much more like #1 than #3 did. The sample does not separate #1 and #2 clearly, while #3 shows a material decline in structural-axis Top3 performance.

## Ticket diagnostics by exact Ability rank
Market-qualified conditions:
- complete final win market
- axis popularity 1–6
- Wide whenever the market condition is met
- Quinella/Trio only when opponent #2 vs #3 odds boundary >10%
- ROI below is normalized to ¥100 per combination to compare route quality

| Exact Ability rank | Wide races | Wide hit | Wide ROI | Quinella races | Quinella hit | Quinella ROI | Trio races | Trio hit | Trio ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| #1 | 151 | 38.4% | 100.6% | 133 | 21.8% | 88.3% | 133 | 8.27% | 113.0% |
| #2 | 111 | 39.6% | 102.9% | 88 | 22.7% | 115.1% | 88 | 4.55% | 71.6% |
| #3 | 80 | 26.3% | 74.8% | 62 | 9.68% | 62.3% | 62 | 4.84% | 122.6% |

The #3 Trio point estimate is not interpreted as positive evidence: it is based on only three hits and is highly payout-sensitive.

## Year-by-year ROI
### Ability #1
- 2024 — Wide 85.3% (n=55), Quinella 81.1% (n=47), Trio 96.4% (n=47)
- 2025 — Wide 117.2% (n=70), Quinella 95.2% (n=61), Trio 128.2% (n=61)
- 2026 — Wide 88.1% (n=26), Quinella 84.8% (n=25), Trio 107.2% (n=25)

### Ability #2
- 2024 — Wide 105.2% (n=44), Quinella 84.1% (n=35), Trio 92.6% (n=35)
- 2025 — Wide 117.8% (n=37), Quinella 177.4% (n=33), Trio 56.4% (n=33)
- 2026 — Wide 81.0% (n=30), Quinella 66.3% (n=20), Trio 60.0% (n=20)

### Ability #3
- 2024 — Wide 95.4% (n=23), Quinella 80.8% (n=19), Trio 245.3% (n=19)
- 2025 — Wide 36.5% (n=26), Quinella 0.0% (n=20), Trio 0.0% (n=20)
- 2026 — Wide 91.6% (n=31), Quinella 101.1% (n=23), Trio 127.8% (n=23)

Ability #3 is clearly unstable. Ability #2 is directionally interesting for Wide/Quinella but its Quinella improvement is not year-stable.

## Cumulative policy if the allowed Ability rank is widened

| Maximum allowed Ability rank | Wide races | Wide ROI | Quinella races | Quinella ROI | Trio races | Trio ROI |
|---|---:|---:|---:|---:|---:|---:|
| #1 only | 151 | 100.6% | 133 | 88.3% | 133 | 113.0% |
| #1–2 | 262 | 101.5% | 221 | 98.9% | 221 | 96.5% |
| #1–3 | 342 | 95.3% | 283 | 90.9% | 283 | 102.2% |

Adding #2 preserved/slightly improved Wide and lifted Quinella toward break-even, but degraded Trio. Adding #3 degraded Wide and Quinella and only lifted the Trio point estimate through unstable high-payout outcomes.

## Race-day clustered bootstrap uncertainty
Approximate 95% intervals for ROI by exact rank:

### Ability #1
- Wide: 100.6%, CI ~76.3–127.0%
- Quinella: 88.3%, CI ~56.5–123.4%
- Trio: 113.0%, CI ~50.1–194.2%

### Ability #2
- Wide: 102.9%, CI ~74.7–133.5%
- Quinella: 115.1%, CI ~65.0–169.9%
- Trio: 71.6%, CI ~12.3–155.2%

### Ability #3
- Wide: 74.8%, CI ~43.3–113.1%
- Quinella: 62.3%, CI ~17.5–117.3%
- Trio: 122.6%, CI ~0–283.3%

Payout distributions are heavy-tailed and every ROI interval is wide. These retrospective point estimates must not be treated as proof of profitability.

## Decision
### Production
**Keep the current Ability #1-only single-axis rule unchanged.**

### Shadow candidate
Ability #2 is worth a prospective Shadow test, but only for the ticket types supported by the retrospective direction:
- **Wide:** Ability #2 single-axis Shadow = ON
- **Quinella:** Ability #2 single-axis Shadow = ON, using the same 1–6 popularity and >10% opponent-boundary rules
- **Trio:** Ability #2 expansion = OFF
- **Ability #3:** all single-axis expansions = OFF

The Shadow layer must not alter production tickets, bankroll, M3 rank, Ability rank, Pair Survival, or the double-structural route.

A useful display is:
`単独構造 Ability #2｜SHADOW候補（Wide / Quinella）｜本番判定には不使用`

## Forward policy
From the freeze date onward, log every qualifying Ability #2 single-structural opportunity before the result is known. Record:
- race/date
- axis horse and M3/Ability ranks
- market popularity and entered odds snapshot
- two Wide opponents
- opponent #2/#3 boundary and Quinella eligibility
- hypothetical Wide/Quinella tickets and stakes
- post-race hit/return

Review descriptively at 100 Shadow opportunities, but do not promote from that interim alone. A production change should require a larger prospective sample / multi-period stability and no material deterioration in risk metrics.

## Caveats
1. Historical market ordering uses final/closing odds, not true T-15 snapshots.
2. The reconstruction reproduces 534/545 one-structural replay races; 11 mismatches were excluded.
3. The rule family is being inspected after seeing retrospective outcomes; p-values and bootstrap intervals are diagnostics, not clean confirmatory inference.
4. The older `m3-v2-ticket-impact-wide-quinella-trio-20261022.md` used an `ability_minimal_v1` reconstruction and therefore its single-route ROI is not expected to numerically match this current-Ability audit.
5. The motivating Oct 2026 live example should not be used as an additional independent validation point after it helped prompt this audit.
