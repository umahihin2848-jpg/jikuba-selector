# 2026-11-20｜重賞Pair型のAbility v1再判定（研究専用）

## 変更内容
- G1/G2/G3かつ本番Ability Cが有効、Ability C Top3∩M3 Top3が正確に2頭でC1位を含むときのみ適用。
- 重なる2頭の **Ability v1の未補正logit（`v1Logit`）** を比較し、高い方1頭を「研究用1頭軸候補」とする。C補正後スコアをv1として扱わない。
- どちらかのJRA対象高位過去走が3走未満／スコア欠損／差が1e-12以下なら軸を選ばず保留。馬番順の強制タイブレークをしない。
- `ProductionDecisionPipelineV1State.stages.axis.pairV1` に研究判定を保持し、スマホ「軸馬情報」と「軸馬の結論」に選抜馬を1頭表示する。
- **本番◎・PairのBUY/PASS・単勝/馬連/ワイド券種の購入ロックを変更しない**。Pairの`stages.axis.no`は空欄、最終`neutral`、`betEligible=false`を維持。
- A1/A2の単独軸、OP/L、3勝クラス、Ability C未成立時にこの選択器を適用しない。

## ソース
- `grade-pair-v1-axis-v1.js`：純粋な候補選択関数
- `grade-pair-v1-axis-v1.test.cjs`：5ケース回帰テスト
- `production-decision-pipeline-v1.js`：研究判定の保持。購入ロック不変
- `mobile-focused-3tabs-v1.js`、`mobile-final-summary-v1.js`：スマホ表示
- `v3.html`：スクリプト読込・キャッシュ識別子

## 検証
- GitHub最新JSソースの構文検査と、純粋関数・モックパイプラインの16アサーションが通過。
- リポジトリ内の5ケースの回帰テストを同一JSソースに対して実行し全通過。テストファイルは`node --test waku-bc-converter/grade-pair-v1-axis-v1.test.cjs`で再実行可能。
- モックDOMでスマホ最終サマリーに候補馬番と研究/購入ロック文言が表示されることを確認。

## 残る確認
- GitHub Pages配信済みHTMLの検証、iPhone Safari実機のCSV取込→Pair成立→画面表示のE2Eは未完了。
- 過去Ability Cの研究用再構成29Rと元研究32Rの不一致は解消しておらず、v1を使った単独軸の実運用利益は未証明。
- 本番購入への昇格は別途、固定ルールによる前向き検証後に判断する。
