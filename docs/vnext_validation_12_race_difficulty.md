# vNext Validation 12 — レース難易度（初期設計）

更新日: 2026-10-28

## 目的

「軸が強いか」だけでなく、相手の曖昧さ・市場分散・隊列不確実性・データ完全性を分けて表示し、レース全体の難しさを説明できるようにする。

単一の難易度点数はまだ作らない。

## 初期候補コンポーネント

1. Axis tier: A/B/C/D
2. Market dispersion: 単勝市場Entropy / Neff ratio
3. Opponent clarity: pair predictionのtop1-top2 gap
4. FPS: Front Pack Separation
5. Data reliability: Queue Full / Fallback、履歴量

## 初期確認

既存pair walk-forward集合（2020–26、305レース）で方向性を確認。
ここで使ったAxisは旧pair研究時のAxisであり、vNext Axisそのものではないため、Production確定ではなくcomponent screeningとする。

### Market dispersion

2019–23で固定したquartileを2024–26へ適用すると、市場が集中する側でAxis 3着内率が高い方向。

Market entropy 2024–26:
- Q1（最も集中）: 78.6%
- Q2: 60.0%
- Q3: 51.2%
- Q4（最も分散）: 55.9%

Neff ratio 2024–26:
- Q1（集中）: 76.3%
- Q2: 64.3%
- Q3: 60.0%
- Q4（分散）: 45.9%

完全単調ではないが、開発期・確認期とも最分散側が弱い方向は再現。
Market ShareはAxis本体へ既に入るため、難易度表示で再加点はしない。

### Opponent clarity

pair prediction top1-top2 gapを開発期quartileで固定。
2024–26 Axis 3着内率:
- Q1（gap小・拮抗）: 47.1%
- Q2: 51.7%
- Q3: 67.9%
- Q4（gap大・明確）: 73.2%

開発期でもQ1=32.5%, Q2=48.7%, Q3=53.8%, Q4=50.0%で概ね同方向。
ただしこれはAxis強度とも相関し得るため、難易度の独立加点ではなく `相手の曖昧さ` 表示候補。

### FPS

既存の強軸検証ではFPSが独立性の高い確認材料として有望。
一方pair研究集合とのrace overlapは少なく、この難易度検証ではサンプル不足。
したがって統合点にはまだ使わずShadow component。

## vNext方針

### Production候補

難易度を単一scoreへ潰さず、まず5軸表示:

- 軸信頼: A / B / C / D
- 市場: 集中 / 中間 / 分散
- 相手: 明確 / 拮抗
- 隊列: 分離 / 中間 / 圧縮（FPS）
- データ: Full / Fallback

### 単一難易度

現時点では作らない。
vNext Axis + vNext Opponentを同じForwardログで運用し、2027以降に重みを固定してから検証する。

## 禁止事項

- Market ShareをAxisと難易度で二重加点しない
- FPSをS候補と難易度で別々に点数加算しない
- 確認期間2024–26を見てEasy/Hard閾値を探索しない
- `難易度`から自動BUY/PASSを直接決めない
