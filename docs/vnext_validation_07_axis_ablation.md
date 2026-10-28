# vNext Validation 07 — Axis feature ablation

更新日: 2026-10-28

## 目的

AxisBaseに入れている情報ブロックを1つずつ外し、どの情報が本当に必要か確認する。

Validation 04の正本を再現し、L2 logistic `C=0.1`、Queue available universeを使用する。

Full AxisBase:

- Ability: `abp3_wf`, Ability rank percentile
- M3: M3 rank percentile, M3 score
- Market: Market Share logit
- Queue: validated `pred_front`
- Reliability: history amount
- Controls: field size, distance, grade, surface

2019–23は年抜きLOYO、2024–26は2019–23学習モデルで確認。

## 2024–26 runner-level performance

| Model | AUC | LogLoss | Brier | Top candidate Top3 |
|---|---:|---:|---:|---:|
| Full | 0.7735 | 0.4111 | 0.13065 | 53.5% |
| -Ability | 0.7751 | 0.4100 | 0.13026 | 55.8% |
| -M3 | 0.7734 | 0.4111 | 0.13070 | 54.5% |
| -Market | 0.7044 | 0.4487 | 0.14262 | 42.3% |
| -Queue | 0.7737 | 0.4109 | 0.13062 | 55.2% |
| -Reliability | 0.7732 | 0.4113 | 0.13076 | 54.2% |
| -Race controls | 0.7736 | 0.4110 | 0.13060 | 54.5% |
| -Grade/Surface | 0.7734 | 0.4112 | 0.13074 | 52.9% |
| Market only | 0.7743 | 0.4107 | 0.13057 | 55.5% |
| Market + Ability | 0.7735 | 0.4110 | 0.13067 | 53.9% |
| Market + M3 | **0.7752** | **0.4099** | **0.13024** | **56.5%** |

## Bootstrap vs Full (2024–26)

`full improvement` は Full の方が良い場合プラス。

- Remove Market: LogLossでFull +0.0377、95%CI +0.0270〜+0.0488。Top candidate +11.3pt、95%CI +4.8〜+18.1pt。Marketは必須。
- Remove Ability: FullはLogLossで -0.0012（Abilityなしが良い）、95%CI -0.0023〜-0.0001。Top candidateもFull -2.3pt、95%CI -4.2〜-0.3pt。
- Remove Queue: FullはLogLossで -0.0006、95%CI -0.0013〜ほぼ0。Top candidateもFull -1.6pt、95%CI -3.6〜0.0pt。
- Remove M3: 差はほぼ0、CIは0跨ぎ。
- Market + M3: FullはLogLossで -0.0017、95%CI -0.0031〜-0.0004。Top candidateもFull -2.9pt、95%CI -5.2〜-1.0pt。

## Tier separation

2019–23 OOF候補scoreの四分位を各モデルごとに固定して2024–26へ適用。

Full:

- A 75.5%
- B 64.8%
- C 53.1%
- D 32.2%
- A−D = +43.2pt

Market only:

- A 71.4%
- B 66.3%
- C 50.6%
- D 40.7%
- A−D = +30.8pt

Market + Ability:

- A 76.8%
- B 62.7%
- C 51.6%
- D 34.1%
- A−D = +42.7pt

Market + M3:

- A 76.8%
- B 61.8%
- C 58.9%
- D 34.9%
- A−D = +41.8pt

市場だけでも全体予測は強いが、A/Dの層分離は構造情報を足した方が大きい。

## Full model standardized coefficients (2019–23 fit)

主な係数:

- Market Share logit: +1.254
- Ability rank percentile: +0.131
- M3 rank percentile: +0.081
- pred_front: +0.049
- history amount: +0.044
- Ability P3: -0.198
- field size: -0.092

Marketが圧倒的に大きく、Abilityの2変数は符号が分かれている。Marketとの相関・多重共線性によりAbility P3が独立増分として機能していない可能性がある。

## 年別確認

Market + M3はFullに対して、runner-level LogLossが2019/2022/2024/2025/2026で改善、2020/2021/2023では小幅悪化。

2024–26の3年はすべてMarket + M3がFullと同等以上の方向。

ただし2024–26は既知確認期間であり、ここを見てProductionモデルを確定しない。

## 判断

- ✅ Market Share: Axisの必須コア。
- ⚠ Ability: 分析表示として重要だが、現在のFull Axisへの独立増分は確認できない。Axis入力として再検討。
- ⚠ Queue `pred_front`: 隊列表示には重要だが、AxisBaseへの直接入力は増分が乏しい。P10/FPSとの二重計上防止も考え、Axis本体から外す候補。
- ⚠ M3: 単独ablationでは差小だが、Market + M3の簡素モデルが最も良い方向。構造認証として残す候補。
- 👁 Reliability / controls: 予測増分は小さい。較正・欠損対応用のcontrolとして扱い、主役と解釈しない。

## Productionへの扱い

この検証だけでFullをMarket+M3へ置換しない。

理由: 簡素モデル候補の比較には2024–26を使用しており、完全な未知OOSではない。

vNextでは以下を候補として固定し、追加の年別/条件別安定性と2027 Forwardで比較する。

1. Full AxisBase（Validation 04 reference）
2. Simplified Axis candidate = Market + M3 + reliability/controls

新しい特徴量探索は行わない。
