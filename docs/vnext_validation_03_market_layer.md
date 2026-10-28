# vNext Validation 03 — Market Layer

更新日: 2026-10-28

## 目的

Market層を、Ability / M3 / Queueとは独立したレイヤーとして再検証する。
固定人気順位のハードゲートは使用せず、連続値だけを比較する。

検証対象はG1–G3・12頭以上・Queue/Position Loss v3が揃う同一母集団。
2019–23を開発・LOYO、2024–26を既知確認期間として使用。

## 事前固定した候補

1. Popularity percentile: 人気順位を頭数内パーセンタイル化
2. Market Share: 単勝オッズの暗黙確率 1/odds をレース内で正規化
3. Market Dominance: 2番人気単勝 / 1番人気単勝。連続値。favoriteにのみ作用する交互作用として追加
4. Market concentration: Neff比とMarket Shareとの交互作用

## 2024–26 結果

| Model | n | AUC | LogLoss | Brier |
|---|---:|---:|---:|---:|
| Structure + Queue | 2904 | 0.7052 | 0.4418 | 0.1395 |
| + Popularity percentile | 2904 | 0.7692 | 0.4111 | 0.1302 |
| + Market Share | 2904 | **0.7753** | **0.4049** | **0.1279** |
| + Market Share + Dominance | 2904 | 0.7762 | 0.4047 | 0.1278 |
| + Dominance + Concentration | 2904 | 0.7751 | 0.4050 | 0.1280 |

### Market Shareの増分

Structure + QueueにMarket Shareを追加したrace-level bootstrap 1500回:

- AUC improvement: +0.0706, 95%CI +0.0476 to +0.0932, P(improve)=1.000
- LogLoss improvement: +0.0371, 95%CI +0.0251 to +0.0488, P(improve)=1.000
- Brier improvement: +0.0117, 95%CI +0.0074 to +0.0158, P(improve)=1.000

2019–23 LOYOでも5年すべてAUC / LogLoss / Brierが改善。
2024, 2025, 2026の各年でも同方向。

### 人気順位よりMarket Shareが良いか

2024–26でMarket Share vs Popularity percentile:

- AUC: +0.0059, 95%CI -0.0000 to +0.0118
- LogLoss: +0.0060, 95%CI +0.0015 to +0.0106
- Brier: +0.0022, 95%CI +0.0006 to +0.0038

したがって、固定1–6人気ゲートを廃止し、Market Shareを連続値で使用する。

## Market Dominance

以前の記述統計では、1番人気と2番人気のオッズ差が大きいほどHIGH COREの好走率が高い傾向が確認されていた。
ただし今回、Market Shareを既に入れたモデルへDominanceを追加すると、2024–26 pooledではAUCのみ約+0.0009で、LogLoss/Brierのrace-level bootstrap CIは0を跨いだ。
2026単独ではLogLoss/Brierが悪化した。

結論: Market Dominanceは現時点ではProduction Axis scoreへ独立加点しない。
Favorite authenticationの説明/Shadowとして残す。

## Market concentration / Neff

Market Share + Dominanceの後にNeff比とShare×Concentrationを追加すると、2024–26ではAUC/LogLoss/Brierが総合的に悪化。

結論: Neffは市場構造の診断表示に限定し、Axis score / BUY-PASSゲートには使用しない。

## vNext採否

| Module | Decision | Role |
|---|---|---|
| Market Share | ✅ Production候補 | Market層の主入力。連続値 |
| Popularity percentile | 👁 補助 | 表示・互換。ハード境界は禁止 |
| Market Dominance | 🧪 Shadow | Favorite authenticationの補助 |
| Market concentration / Neff | 👁 Display | 市場の集中/分散説明のみ |
| 1–6人気ハードゲート | 🗑 Retire | 廃止 |

## 設計原則

Marketを丸呑みしない。
同じオッズ帯でもAbility/M3構造が強い馬は好走率が高い既存検証があるため、vNextでは

Market Share → Ability/M3で認証 → Queue/Courseで独立確認

とする。

Market ShareとAbility/M3を単純二重加算するのではなく、最終Axis Reliabilityで較正する。
