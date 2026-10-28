# Structural Watch display policy v1

Date: 2026-10-28
Status: display-only / manual race-dissection layer
Production betting impact: none

## Purpose

The `穴・構造注目` section is not a longshot prediction score and does not create tickets. Its purpose is to prevent structurally unusual horses from disappearing when the user compares the market, Ability, M3, position risk and current-condition fit.

The section must answer four questions for each displayed horse:

1. Why is this horse visible?
2. What structural type is it?
3. What is the main weakness / uncertainty?
4. How does the current market view it?

## No composite score

Do not add Ability, M3, P10, Condition Edge, current-condition fit or popularity into a new weighted score.

Do not create A/B/C grades, confidence points, automatic buy flags, ticket counts or a fixed opponent order from this section.

## Structural types

### 1. 地力×構造一致

Current Ability top 3 and current M3 top 3 overlap.

This is an agreement label. It is not a calibrated probability and is not automatically an axis or opponent purchase.

### 2. 地力残し

Ability rank <= 3 and M3 rank >= 7.

Interpretation: historical-result strength remains high while the current finish-structure model is cautious. M3 disagreement is not used as a veto against the Ability signal.

### 3. 構造浮上

M3 rank <= 3 and Ability rank >= 7.

Interpretation: current finish structure is favorable while historical-result strength is lower. M3 alone must not be interpreted as proving that the Ability weakness is erased.

### 4. 候補漏れ防止

The existing opponent-candidate pool may expose one `structureBest` horse from Ability + M3 + P10 structural rescue logic when it is outside the market base set.

This remains a recall / review aid only. It is not a validated opponent buying order.

## Ordering policy

Cross-type ranking is prohibited.

For compact mobile display only:

- show all non-axis `地力×構造一致` horses available from the top-3 overlap;
- show at most one representative `地力残し` horse, ordered first by Ability rank and then M3 rank;
- show at most one representative `構造浮上` horse, ordered first by M3 rank and then Ability rank;
- show the existing `structureBest` only when it is distinct from the horses already shown.

This is a layout rule, not a probability or betting rank.

## Weakness / uncertainty display

Use observed existing fields only. Examples:

- the opposite-model rank that defines `地力残し` / `構造浮上`;
- raw P10 percentage when available;
- limited high-class history when the Ability history count is below 3;
- current-condition fit labels already produced by the fit module;
- existing research caution tags from the veto-shadow module.

Do not invent a new penalty score.

## Market relationship

Popularity and win odds are shown only as a separate market layer after they are available.

Neutral labels:

- popularity 1-4: `市場上位と一致`
- popularity 5-6: `市場中位（5–6人気）`
- popularity 7-9: `人気外寄り（7–9人気）`
- popularity 10+: `大穴域（10人気以下）`

These labels describe price / attention position only. They do not mean buy, value, or expected profit.

Condition Edge may be shown alongside the market relation when already available, but it must not be added to the structural rules.

## Evidence boundary

`地力残し` and `構造浮上` have no validated fixed ordering. In the saved 2025-2026 role comparison, popularity-adjusted Top3 rates were approximately 27.6% and 25.1%; the difference was about +2.5 percentage points and the race-cluster 95% interval crossed zero. Therefore they remain parallel review types.

Longshot / structural-scout historical diagnostics are retrospective and the combined scout was frozen only on 2026-10-19. They support continued display and prospective logging, not an automatic bet rule.

## UI wording

Preferred heading: `⑥ 穴・構造注目`

Preferred explanation:

> 人気薄を当てる点数ではありません。AbilityとM3の一致・不一致から、見落としたくない馬を理由付きで並べます。並び順は買い順ではありません。

Each card should show:

- structural type
- horse number / name
- `なぜ注目`
- `弱点・不確実性`
- `市場とのズレ`

## Decision

**ADOPT_DISPLAY_POLICY_ONLY**

No probability, Ability, M3, P10, opponent pool, Condition Edge, bankroll or ticket calculation is changed by this policy.
