# 重賞Pair型：Ability v1で1頭軸に絞って通常判定へ進む（2026-11-20）

## 最新の採用仕様
ユーザーの追加要望により、前の「研究用の1頭を表示するがPairは一律見送り」を変更。

1. G1/G2/G3・12〜18頭・Ability C適用済みで、C Top3 ∩ 実M3 Top3が正確に2頭一致、C1位を含む場合を対象とする。
2. その **Pair2頭だけ** のAbility v1元スコア `v1Logit` を比較する。差が1e-12より大きければ高い1頭を `pair_v1` 軸にする。
3. 両馬それぞれのJRA対象過去走3走以上が必要。同点・スコア欠損・履歴不足・Ability C未成立時は1頭を強制選定しない。
4. 選ばれた `pair_v1` 軸は **構造上の軸候補** として `DecisionShellV2State.structure.axis` に保存し、既存の全馬単勝オッズ入力、1〜6番人気、人気6/7位境界、市場・P10の判定に進める。
5. 市場条件を通過した場合は `AxisAccessGateV1State.status='pass'`, `betEligible=true`、最終パイプラインは `conditional` に進める。**Pair型という理由だけでは見送らない。**
6. P10が50%以上の場合は **単勝のみ停止**、馬連・ワイドの相手は従来通り手動選択。
7. オッズ不足時は購入保留、選定軸が7番人気以下は市場条件外として購入ロック維持。券種別の正の期待値や購入金額は自動保証しない。
8. 通常のA1/A2、OP・L・3勝クラス、Ability C未成立、C1位を含まないPairは変更しない。

## 実装ファイル
- `grade-pair-v1-axis-v1.js`：純粋な比較ロジック。単体の戻り値に `betEligible:false` が残るのは**この関数自体が購入ゲートではない**ためで、最終購入可否はAxisAccessGateが決定する。
- `mobile-decision-core-v1.js`：Pair成立→v1軸候補化 `kind='pair_v1'`, `code='pair_v1_axis'`、元の2頭は `sourcePairCandidates` に保存。
- `axis-access-gate-v1.js`：`pair_v1` を通常の1頭軸と同じ市場・安全ゲートに通す。
- `production-decision-pipeline-v1.js`：Pair専用の研究・購入見送り分岐を通さず、正規の軸・相手選定・券種別判定を利用する。
- `mobile-final-summary-v1.js`, `mobile-focused-3tabs-v1.js`, `mobile-product-ui-v1.js`：軸として表示。
- `v3.html`：スクリプト順とキャッシュ識別子更新。

## 検証・限界
- `grade-pair-v1-production-flow.test.cjs`：実際の意思決定＋アクセスゲート＋最終パイプラインを使用した6テスト（Pair軸、P10 50%以上、市場オッズ欠損、7番人気以下、C未成立、非重賞Pair、同点・短履歴）に合格。
- 旧 `grade-pair-v1-axis-v1.test.cjs` は比較関数の単体テスト。モジュール単体からはBUYの直接許可は行わない。
- **Ability C＋M3の過去再構成29Rと元の32Rに誤差が残る**。このv1軸再判定が利益を生むかは未実証であり、同一条件・発走前価格による前向き検証が必要。
- GitHubの最新コード反映とJS模擬テストは確認したが、GitHub Pages配信の完全E2E・iPhone Safari実機でのCSV→Pair→購入判定は未確認。

## URL
https://umahihin2848-jpg.github.io/jikuba-selector/waku-bc-converter/v3.html?v=20261120pairv1prod1
