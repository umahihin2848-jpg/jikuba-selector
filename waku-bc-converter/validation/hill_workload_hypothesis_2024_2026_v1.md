# 坂路負荷 → 残600m以降の末脚 仮説検証（2024–2026）

Created: 2026-10-15

## 目的

TARGET `CK_DATA` の坂路調教履歴だけで、現行 M3 の Remaining600→finish 末脚予測誤差に追加情報があるかを検証する。

仮説は「総走行距離が多いほど強い」ではなく、**直近の坂路量・頻度・強度・回復間隔が当日の末脚持続力に関係する可能性**として検証した。

## データ

- `CK_DATA.7z`: 2003–2026 を収録、18,943 entries。
- 2023–2026 の HC（坂路）を固定長 DAT から直接抽出。
- 坂路レコード数: 2023=413,287 / 2024=505,023 / 2025=495,360 / 2026=383,396、合計 1,797,066。
- HC レコードは 47 桁固定長で、場所コード・年月日・時刻・血統登録番号・4F/3F/2F/1F時計と各ラップを復元。
- 2026-10-11 の `tyou.csv` と照合し、HC0/HC1 のレコード数・時計・血統登録番号が一致することを確認。

対象レースは既存監査と同じ JRA 平地・12頭以上・3勝クラス以上。

- 2024: 400 races / 6,046 runners
- 2025: 403 / 6,095
- 2026: 297 / 4,528
- 合計: 1,100 races / 16,669 runner-events

血統登録番号で坂路と結合。レース前90日以内に坂路履歴が1本以上ある割合は 2024=94.4%、2025=94.6%、2026=95.9%。

## 末脚ターゲットと M3 再現

現行 `scenario_component_validation_v2` の deployable Remaining600 formula と `finish600_model_v1` core M3 coefficients を、strictly-prior history のみで再計算。

ターゲットは現行モデルと同じ:

`realized_close = race median final3F - horse final3F`

`close_error = realized_close - M3 predicted_close`

M3 Top3 の実Top3捕捉率は再計算で 2025=29.70%、2026=29.48%（保存済み本番検証 30.19%、29.85% に近い）。2024 は development-year のため差がやや大きい。

## 坂路特徴量

strictly prior のみ。

### 量・頻度

- 7 / 14 / 30 / 60 / 90 日の坂路本数
- 同期間の active days
- 30日内の1日2本以上の日数
- 最終坂路からの日数
- 7日/30日の acute load ratio

### 強度

- 4F時計の当日・トレセン内 percentile（馬場日の時計差を軽減）
- 1F時計 percentile
- 7/14/30日の percentile 合計・平均・最大
- 4F <=55 / <=54 / <=53 秒の本数
- 4F<=55かつ1F<=13.0 の本数
- 4F<=54かつ1F<=12.5 の本数
- 最終強負荷からの日数
- Lap4-Lap1 の加速度

## 検証プロトコル

- 2024 のみで開発・ハイパーパラメータ選択。
- 2025 / 2026 は固定 OOS。
- 末脚誤差 correction を学習し、`pred_close + correction` として評価。
- Linear Ridge と nonlinear HistGradientBoosting を確認。
- 比較用 control は年齢・性別・距離・芝ダ・頭数・現 M3 predicted close・history coverage などで、坂路を含まない。
- race-cluster bootstrap で不確実性を確認。

## 結果

### 線形 Ridge

坂路を追加しても OOS の MAE / RMSE / Top3 順位は安定改善せず。**単純な「坂路本数や時計を足せばよい」線形関係は支持されない。**

### Nonlinear model: 坂路の追加情報

2025–26 pooled で control-only と control+hill を比較すると:

- close MAE: 0.60814 → **0.60558 sec**
- close RMSE: 0.98556 → **0.98250 sec**
- paired MSE difference (hill - control): **-0.00605 sec²**
- race-bootstrap 95% CI: **-0.01199 to -0.00030**
- paired MAE difference: **-0.00257 sec**
- race-bootstrap 95% CI: **-0.00500 to -0.00018**

つまり、坂路情報は **末脚の数値誤差を小さくする追加情報を少量持っている**。特に大外れを減らす方向は pooled で統計的に改善側。

ただし year-specific の hill-vs-control 改善 CI は 2025/2026 単独ではともに0をまたぎ、効果量は小さい。

## M3 順位への影響

2025–26 pooled:

- 元の M3 Top3 実Top3捕捉: **29.61%**
- control correction: 31.32%
- control + hill: **30.80%**

hill を control に追加した差は **-0.53 pt**、95% CI **-1.99 to +0.95 pt** で未確立。

元 M3 に対して control+hill は +1.20pt だが、95% CI **-0.29 to +2.71pt** で未確立。さらにこの改善には坂路以外の control correction も含まれるため、坂路単独の順位改善とは解釈しない。

## 量 vs 強度（探索的 ablation）

同一 nonlinear 設定で比較すると、2025–26 pooled の末脚誤差では:

- control only: MAE 0.60622 / RMSE 0.98185
- + 坂路量・頻度: **0.60506 / 0.98113**
- + 坂路強度のみ: 0.60651 / 0.98316
- + full hill: 0.60558 / 0.98250

**今回のデータでは「速い時計の本数」より、坂路に入った量・頻度・回復間隔の方がまだ有望。**

ただし volume-only の control 比 race-bootstrap CI は MSE/MAE とも0をまたぐため、これは探索的傾向に留める。

## 現時点の結論

### 支持できること

- CK_DATA は今回の研究に十分使える。血統登録番号で安全にレースデータへ結合できる。
- 坂路情報には、現行 M3 が説明しきれていない Remaining600→finish 誤差への小さな追加情報がある可能性がある。
- 単純な絶対時計より、**坂路量・頻度・休養間隔**の方が今回の仮説に合う。
- nonlinear 関係の可能性があり、「多ければ多いほど良い」という単調ルールではない。

### まだ支持できないこと

- 坂路補正で M3 Top3 捕捉が確実に改善するという主張。
- 勝率/馬券ロジックへの直接採用。
- 坂路量が心肺機能を因果的に高めたという生理学的主張。
- 4F時計の速さだけを仕上がり指数にすること。

## Decision

**CANDIDATE / PROSPECTIVE ONLY**

現行 M3 は変更しない。

今後の候補は、`坂路量・頻度・最終坂路からの日数` を小さな fitness/workload context として凍結し、未来レースで前向きログを取ること。2027など genuinely unseen sample で末脚誤差と M3 Top3 の両方が再現改善した場合のみ production correction を検討する。
