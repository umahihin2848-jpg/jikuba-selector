# M3 × Position Risk 増分検証 v1

作成日: 2026-10-16

## 目的

既存の M3 に、事前に判定できる `Position Risk`（二桁位置取り傾向）を加えたとき、Top3 予測の Brier / LogLoss が改善するかを確認する。

今回の判定ルールは前検証 `double_digit_position_risk_2017_2026_v1` から変更していない。

- 当該レースより前の最大3走のみ使用
- 最低2走の有効な序盤通過位置が必要
- 過去最大3走の「最初に取得できる通過順位」の中央値が 10番手以上なら `PositionRisk=1`
- 2走未満では補正を発動しない (`PositionRisk=0`)
- 当該レースの通過順、着順、オッズは PositionRisk 作成に使わない

## データと再構成

Position Risk の元検証と同じ `2026_2025_seiseki.csv` / `2026seiseki.csv` と PCI/RPCI 対応データを使用し、3勝クラス以上・12頭立て以上の完全レースで M3 を再構成した。

M3 は現在の `finish600_model_v1` とランタイムの仕様に合わせ、

`M3 score = 残600m予測差 - 追い上げ力予測`

で計算した。履歴は発走日より前の最大5走のみ。

今回の M3 × PositionRisk の共通評価集合は 2019-2026 で 2,818レース / 42,936頭。

- 2024: 371レース / 5,628頭
- 2025: 373レース / 5,651頭
- 2026: 274レース / 4,195頭

これは M3 本体の公式検証集合より小さい「M3 と PositionRisk の再構成可能な共通部分」である。したがって M3 本体の公式成績を置き換える検証ではない。

再構成の妥当性確認として Top3 overlap は、

- 2024: 0.31896
- 2025: 0.30652
- 2026: 0.30170

となり、`finish600_model_v1` に保存された公式値（2024 0.3175 / 2025 0.3019 / 2026 0.2985）に近い。

## Protocol

Top3 を目的変数に、まず M3 だけから確率較正する baseline を作った。

Baseline:

- raw M3 score
- レース内 M3 rank fraction
- field size

Candidate:

- Baseline 3変数
- `PositionRisk`

両モデルとも **2019-2023 だけで係数を学習**し、そのまま固定して 2024 / 2025 / 2026 に適用した。最終単勝オッズは使用していない。

PositionRisk 自体は本プロジェクトで 2025/2026 を含むデータを既に観察して発見した特徴なので、今回の 2024-2026 は厳密な pristine OOS ではなく **retrospective sensitivity / frozen replay** として扱う。

## 1. M3 Top3 確率への増分効果

### 2024

| model | Brier | LogLoss | AUC |
|---|---:|---:|---:|
| M3 baseline | 0.153974 | 0.482865 | 0.62156 |
| + PositionRisk | **0.152391** | **0.477881** | **0.64008** |

差:

- ΔBrier = **-0.001583**
- ΔLogLoss = **-0.004984**
- ΔAUC = **+0.01852**

race-cluster bootstrap 95% CI:

- ΔBrier: **[-0.00218, -0.00097]**
- ΔLogLoss: **[-0.00688, -0.00301]**

### 2025

| model | Brier | LogLoss | AUC |
|---|---:|---:|---:|
| M3 baseline | 0.154748 | 0.484793 | 0.61692 |
| + PositionRisk | **0.153546** | **0.480980** | **0.63143** |

差:

- ΔBrier = **-0.001202**
- ΔLogLoss = **-0.003813**
- ΔAUC = **+0.01451**

race-cluster bootstrap 95% CI:

- ΔBrier: **[-0.00172, -0.00065]**
- ΔLogLoss: **[-0.00544, -0.00212]**

### 2026

| model | Brier | LogLoss | AUC |
|---|---:|---:|---:|
| M3 baseline | 0.154024 | 0.484066 | 0.60435 |
| + PositionRisk | **0.152615** | **0.479235** | **0.62513** |

差:

- ΔBrier = **-0.001409**
- ΔLogLoss = **-0.004831**
- ΔAUC = **+0.02078**

race-cluster bootstrap 95% CI:

- ΔBrier: **[-0.00217, -0.00065]**
- ΔLogLoss: **[-0.00719, -0.00243]**

### 2025-2026 pooled

| model | Brier | LogLoss | AUC |
|---|---:|---:|---:|
| M3 baseline | 0.154440 | 0.484483 | 0.61164 |
| + PositionRisk | **0.153149** | **0.480237** | **0.62883** |

差:

- ΔBrier = **-0.001290**
- ΔLogLoss = **-0.004247**
- ΔAUC = **+0.01720**

race-cluster bootstrap 95% CI:

- ΔBrier: **[-0.00172, -0.00085]**
- ΔLogLoss: **[-0.00562, -0.00287]**

Brier / LogLoss は 2024・2025・2026 の3年すべて同方向に改善し、各年の paired race-cluster bootstrap でも 95% CI が0を跨がなかった。

## 2. 較正形式への感度

改善が「M3 score と rank fraction を両方入れた baseline」に依存していないか確認した。

- rank fraction + field のみ
- raw M3 score + field のみ
- raw M3 score + rank fraction + field

の3仕様すべてで、PositionRisk 追加後の Brier / LogLoss は 2024・2025・2026 の全年度で改善した。

したがって、今回の増分効果は特定の較正式だけに依存した結果ではない。

## 3. M3上位馬でも Position Risk は残るか

### M3 rank 1-6 の Top3率

| 年 | PositionRiskなし | PositionRiskあり |
|---|---:|---:|
| 2024 | 29.59% (n=1,612) | **18.73% (n=614)** |
| 2025 | 28.65% (n=1,672) | **18.55% (n=566)** |
| 2026 | 27.81% (n=1,212) | **19.21% (n=432)** |

### M3 rank 1-3 の Top3率

| 年 | PositionRiskなし | PositionRiskあり |
|---|---:|---:|
| 2024 | 36.05% | **20.79%** |
| 2025 | 33.37% | **22.73%** |
| 2026 | 32.44% | **24.23%** |

M3が高評価した馬の中でも、二桁位置取り傾向がある馬は一貫してTop3率が低かった。

2019-2023学習データで M3 score / M3 rank fraction / field size を調整した PositionRisk の係数は、Top3 に対して OR 約 **0.62**（95% CI 約 **0.58-0.67**）。M3本体が持つ位置取り情報だけでは完全には吸収されていない。

## 4. M3順位そのものへ減点するとどうなるか

次に `adjusted M3 score = M3 score + λ × PositionRisk` として、M3順位を直接下げる案を検証した。

λ は 2024 のみで 0-0.50秒を探索し、Top3 overlap を主基準に選択。選ばれた λ は **+0.25秒**。

### 2024（選択年）

- Top3 overlap: 0.31896 -> **0.33872**
- Top6 capture: 0.53190 -> **0.56065**
- winner Top1: 0.14016 -> **0.15364**

Top3 overlap の差 +0.01977、race bootstrap 95% CI **[+0.00180, +0.03774]**。

### 2025

- Top3 overlap: 0.30652 -> **0.32261**
- Top6 capture: 0.52189 -> **0.53262**
- winner Top1: 0.13137 -> **0.14745**

Top3 overlap 差 +0.01609、95% CI **[-0.00179, +0.03396]**。

### 2026

- Top3 overlap: **0.30170 -> 0.29927**
- Top6 capture: 0.51095 -> **0.52920**
- winner Top1: 0.12044 -> 0.12409

Top3 overlap 差 -0.00243、95% CI **[-0.02311, +0.01703]**。

2026では Top6 capture は改善したが Top3 overlap は僅かに悪化した。

## 5. Interpretation

今回の結果は2つに分ける必要がある。

### A. PositionRisk を M3 の「追加リスク情報」として使う

**支持される。**

M3 score / M3順位を知った後でも、PositionRisk は Top3 の確率較正を改善した。2024・2025・2026で方向が揃い、Brier / LogLoss の改善も race-cluster bootstrap で安定している。

### B. PositionRisk を M3 core score に固定減点して順位を直接変更する

**まだ支持不足。**

2024で選んだ +0.25秒ペナルティは2025では改善したが、2026のTop3 overlapは改善しなかった。固定の順位減点まで進めるには再現性不足。

つまり「二桁位置取り傾向は重要」だが、M3の能力・追い上げ順位そのものを機械的に下げるより、**M3とは別の届きにくさ / Position Risk レイヤーとして扱う方が現在の証拠に合う**。

## Production decision v1

- M3 core score: **変更しない**
- M3順位: **変更しない**
- PositionRisk の直接 +0.25秒ペナルティ: **不採用**
- PositionRisk の研究表示: **採用候補として強い**
- M3由来Top3確率の較正補助: **統計的には採用候補。ただし現在は未実装**
- 馬券判定: **まだ変更しない**

表示候補:

`POSITION RISK / 後方配置注意`

- 過去最大3走・最低2走の序盤位置中央値 >=10: `⚠ 二桁位置取り傾向`
- かつ後方30%条件も満たす場合: `⚠ 強い後方配置傾向`

## Prospective freeze

今回までに 2024-2026 を含むデータを観察しているため、これ以上この期間で閾値やペナルティを調整しない。

2026-10-16 時点で以下を固定候補とする。

- history window: 最大3走
- minimum history: 2走
- primary threshold: 序盤位置中央値 >=10
- M3 rank を直接変更しない

真の確認はこの freeze 後の新規レースで行う。少なくとも20-30レース程度では方向確認に留め、十分な件数が蓄積するまで core M3 は変更しない。

## 結論

**Position Risk は M3 に対して独立した増分情報を持つ可能性が高い。**

ただし、証拠が強いのは「Top3確率の較正改善」であり、「M3順位を固定ペナルティで下げる」ことではない。

したがって現段階では、M3順位を壊さずに Position Risk を別レイヤーで表示・記録し、freeze後の prospective 検証へ進めるのが妥当。