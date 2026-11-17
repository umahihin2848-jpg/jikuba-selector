# P3-61 | Ability C軸の複勝率改善：市場1番人気×Ability C Top3（2026-11-18）

**Research-only. Production main / Ability C / M3 / P10 / AxisAccessGate / BUY-PASS / partners: unchanged.**

## データ
P3-58で検証済みの2024–2026年10月4日まで、JRA平地G1–G3、12–18頭、**262R**。Cは本番モデルと902/910順位一致する**研究再構成**、市場は購入時ではなく**最終確定単勝人気/オッズ**。2025/26は既探索済みで独立な未知OOSではない。

| Year | C1 all races | Closing market favorite all races | Closing favorite also ranked C1–3 |
|---|---:|---:|---:|
| 2024 | 41/96 (42.7%) | 52/96 (54.2%) | 34/62 (54.8%) |
| 2025 | 41/93 (44.1%) | 50/93 (53.8%) | 35/54 (64.8%) |
| 2026 | 24/73 (32.9%) | 43/73 (58.9%) | 28/46 (60.9%) |
| Total | **106/262 (40.5%)** | **145/262 (55.3%)** | **97/162 (59.9%)** |

Closing favorite ranked C1–3 selects **162/262=61.8%** of races, with **44/162 wins, 76/162 Top2 (46.9%), 97/162 Top3 (59.9%)**; Wilson CI of Top3 **52.2–67.1%**. These are **different selection rates**: 59.9% is not a production-wide hit rate.

Within those exact 162 races, retaining C1 would yield **73/162 Top3**, versus favorite **97/162** (+24); 2025–26 same 100 races **42/100 vs 63/100** (+21pp), year-stratified 30k race bootstrap +11–31pp, paired McNemar nominal p=.000192. This shows closing-market horse preference, not proven independent Ability value.

Does C1–3 flag improve beyond closing market? Favorite C rank1–3 is **97/162** Top3; C rank4+ is **48/100**, raw Fisher two-sided p=.073. Closing favorite odds (log) and year-adjusted exploratory logistic: **OR 1.50, 95%CI 0.89–2.54, p=.132**. **Independent Ability uplift unconfirmed.**

Closing-odds hypothetical win ROI in favorite/C1–3 subset: **2024 62.4%, 2025 71.7%, 2026 114.8%, pooled 80.4%**; **not real purchase-time ROI**, not wide/quinella profitability. P3-58's C1 fixed selected-rate/market mismatch remains. Conditional probability and betting edge cannot be conflated.

Other diagnostic: C1 final market rank4+ Top3 **8/39 (2024), 10/38 (2025), 7/34 (2026)**. Treat as risk note only—not a blanket automatic skip or an EV veto. P10, Pair_A1, A2 and partners have no changed production status.

**Research candidate:** display `MARKET×ABILITY AGREEMENT` when the *contemporaneously entered* market 1st horse ranks C1–3, show win/Top2/Top3 separately, keep no automated BUY/PASS. Freeze future pre-race snapshots and compare to favorite-all baseline at same capture time and odds/pair-ticket budget.

Local user-facing report `P3-61_軸の複勝率改善_検証レポート.md` with `P3-61_軸ルール比較.csv` and `P3-61_同一レース比較.csv` produced from the original P3-58 262R ledger; no private full TARGET CSV committed.
