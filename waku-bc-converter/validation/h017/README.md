# H017 研究出力（2026-11-23）

全国10競馬場・芝ダ・距離86条件の4角4位置帯分布と位置帯条件付き3着内確率、先行馬の余力耐性の研究用影響を集計しました。

- 研究報告 `H017_REPORT_20261123.md` に方法・数値・制約・結果を記載。
- `H017_全国86条件_4角4帯と到達実績.csv` は2024-26年の実測4角帯に基づく事後分析であり、発走前の予測結果そのものではない。
- `H017_全国86条件_予測モデル診断.csv` は86条件のモデル精度。少数レースを安全/危険と断定しない。
- `H017_予測最後方×低好走確率_帯別診断.csv` は発走前の予測確率による匿名区分。
- `H017_result_aggregate.json`, `H017_rival_reserve_aggregate.json` に集約した年度別/芝ダ別/比較信頼区間等。
- `H017_horse_diag_PRIVATE.csv` には提供された馬名とレースIDを含むため研究用・公開禁止。
- `h017_four_zone.py`, `h017_rival_reserve.py`, `test_h017.py` は計算・試験用。

## 再現コマンド

```
OPENBLAS_NUM_THREADS=1 python -m unittest -q test_h017.py
OPENBLAS_NUM_THREADS=1 python h017_four_zone.py
OPENBLAS_NUM_THREADS=1 python h017_rival_reserve.py
python build_h017_report.py
```

このコードはユーザー提供のTARGET元CSVから抽出されたH014/H015歴史的検証キャッシュ `H015_二段階先行余力検証_20261123/h015_race_horse_lookback_PRIVATE.pkl` を読みます。キャッシュは個体情報が含まれるので公開GitHubには載せず、元から再作成する場合はH014/H015の既存コード・ユーザー提供CSVが必要です。

**過去2024-26を既に何度も研究していること、M3/Ability Cの本番JS完全パリティが未完了なこと、最終オッズ由来の市場基準が実購入時点とは違うことから、研究仮説を本番馬券自動消しに利用しないでください。**