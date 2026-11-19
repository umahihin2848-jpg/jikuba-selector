# OP/L production freeze: single structural axis only (2026-11-19)

Status: **production rule adopted at user's direction**. 3-win is **NOT promoted/changed by this release**.

## Scope
JRA flat OP and L, 12-18 starters. Ability v1 and actual M3 are the independent structural inputs. Graded G1-G3 continue with Ability C; no changes to their decision routes.

## OP/L single-axis purchase gate
1. The intersection of **Ability v1 Top3** and **M3 Top3** must contain **exactly one horse** (tied rank boundaries remain blocked).
2. The single horse's Ability must rank **#1 or #2**. Sole Ability #3 overlap is a stop.
3. The original win-popularity gate **#1-#6** remains; #6 with a #6-#7 odds gap <=10% remains marked conditional, not upgraded.
4. P10 >=50% triggers **win-only stop**; quinella/wide are assessed separately and are not bought automatically.
5. **Two overlaps (Pair) are now a production skip**, while research comparison of the two structural horses may remain visible; zero or >=3 overlaps are also a stop.
6. The G1-G3 **Ability C + market** partner-three selector is **not promoted into OP/L**. No empirical claim of a validated OP/L automatic partner-three model.
7. The research AxisSelection ranking must never substitute the frozen single production axis.

## Changed runtime
- `mobile-decision-core-v1.js`: explicit OP/L Pair -> neutral `no_auto_axis`, `kind:double`, no official `axis`.
- `race-skip-lock-v1.js`: OP/L structural gate requires exactly one Ability Top3 x M3 Top3 horse, Ability #1-#2; catches overlapping Pair even if core #1 is present.
- `v3.html`: cache bust `20261119opl1` for those two files.

## Historical evaluation caveat
2025-2026 OP/L proxy evaluation in `OP_L_過去検証と実装判断_20261119.md` gave 21/170 eligible single axes, axis Top3 12/21 and axis-plus-partner Top3 9/21. This uses *proxy M3 and final odds*, not true live M3 or T-15 odds. Thus the adopted policy does not carry a verified live hit rate.

## Separate 3-win research (not promoted)
2025-2026: 286 valid 3-win races; market-three 255/286; market+Ability v1 255/286; market+Ability v1+M3 proxy 256/286. Proxy single axis 33/286; axis Top3 16/33, with 2025 5/15 and 2026 11/18. These data do not support changing 3-win production today.

## Rollback
The OP/L Pair gate can be restored by undoing the additional `OP`/`L` `c.length===2` early-stop branch and restoring the matching RaceSkipLock overlap guard; keep the rest of the 2026-11-19 weekend freeze intact. This document is the policy record, not code.
