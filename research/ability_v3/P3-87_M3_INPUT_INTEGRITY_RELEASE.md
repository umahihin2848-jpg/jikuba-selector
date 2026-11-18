# P3-87｜M3入力整合性の本番反映候補（2026-11-18）

## 対応する再現済み欠陥

- TARGETの同一過去走が繰り返されるため、直近5**行**ではなく異なる直近5**レース**を抽出。馬名＋16文字レースIDで重複除去し、内容に矛盾する重複はカウントする。ID未取得時に日付だけで勝手に重複除去しない。
- TARGETの日付（例：2026.10. 4）を厳密なYYYYMMDD整数に変換。発走当日／未来のレース結果を履歴へ使わない。
- 馬自身のPCIとレースPCI/PCI3を混同しないよう、馬PCIは完全一致列のみ。必須列の欠損時に古いM3順位を破棄して停止。
- 履歴ロード前にM3を表示しない。上流の残600m位置がnull/空文字のとき0秒と解釈しない。
- iOSのキャッシュに古いコードが残らないよう、v3.htmlとmobile/desktop loaderのバージョンを更新。

## スコープと未解決

- M3の19特徴量、学習済み係数、M4係数、Ability、P10、軸選定、BUY/PASS判定の数式は変更しない。
- TARGET共有アップロード変換を変更するため、M3以外の利用箇所へも影響し得る。回帰テストとSafariでの動作確認が必須。
- P3-47の4,250頭のJS/Python**同一正規化入力での一致**と、旧P3-22b凍結出力との**不一致**は別事項。旧CSV/旧JSの完全復元に至っておらず、過去の旧順位と一致する保証はない。
- 正しく計算できることと、人気・Abilityを上回る予測精度を証明することは別。未知期間の事前スナップショットと好走率の対照が必要。
- このPRは修復と検証専用。**CI・実機の確認まで自動マージしない。**

## Tests

node tests/p3-41-m3-date-compat-smoke.cjs
node tests/p3-42-target-history-dedup-smoke.cjs
node tests/p3-43-m3-missing-upstream-smoke.cjs
node tests/p3-45-m3-pci-column-contract.cjs
node tests/p3-46-m3-required-schema-guard.cjs
node tests/p3-47-m3-feature-contract.cjs
node tests/p3-87-cache-busting-smoke.cjs
