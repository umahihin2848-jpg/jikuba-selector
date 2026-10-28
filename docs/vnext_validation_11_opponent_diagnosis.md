# vNext Validation 11 — 相手診断

更新日: 2026-10-28

## 目的

Axisが成功した場合に、相手候補を何頭・どのように残すと捕捉率と解釈性のバランスが良いかを検証する。
最終馬券はユーザーが構築し、自動購入ロジックにはしない。

## 対象

既存のWide / Quinella pair walk-forward predictionsを使用。

- 開発: 2020–23
- 確認: 2024–26

相手診断そのものを見るため、WideではAxisが3着内、QuinellaではAxisが2着内に来たレースに条件付ける。

## 固定戦略

1. Market top4: 市場上位4頭
2. Market top4 + qScore rescue: 市場上位4頭 + その外から構造スコア最上位1頭
3. Agreement 2-of-3: Market / Ability / M3のうち2系統以上で上位4
4. Pair model top2: ペア確率上位2頭のみ

## Wide結果

### 2020–23
- Market top4: 相手1頭以上捕捉 89.0%, partner recall 65.1%, 平均3.97頭
- Market top4 + rescue: 94.5%, recall 73.3%, 平均4.97頭
- Agreement 2-of-3: 75.3%, recall 47.9%, 平均2.96頭
- Pair model top2: 71.2%, recall 43.2%, 2頭

### 2024–26
- Market top4: 85.7%, recall 60.4%, 平均3.96頭
- Market top4 + rescue: 90.1%, recall 70.3%, 平均4.96頭
- Agreement 2-of-3: 76.9%, recall 47.8%, 平均2.97頭
- Pair model top2: 65.9%, recall 37.9%, 2頭

Market top4 + rescue vs top4の確認期差は +4.4pt。
race bootstrap 95%CIは約 +1.1〜+8.8pt、正方向確率98.2%。

## Quinella結果

### 2020–23
- Market top4: 相手捕捉 61.7%
- Market top4 + rescue: 72.3%
- Agreement 2-of-3: 40.4%
- Pair model top2: 38.3%

### 2024–26
- Market top4: 66.2%
- Market top4 + rescue: 76.1%
- Agreement 2-of-3: 56.3%
- Pair model top2: 52.1%

Market top4 + rescue vs top4の確認期差は +9.9pt。
race bootstrap 95%CIは約 +4.2〜+16.9pt、正方向確率99.9%。

## 解釈

- 相手を2頭へ自動圧縮すると捕捉率が大きく落ちる。
- 市場上位4頭は安定した土台。
- 市場外の構造救済を1頭だけ追加する効果は開発/確認で同方向。
- 2-of-3一致は精度ラベルとして有用だが、候補集合そのものをこれだけにすると取りこぼしが増える。

## vNext採否

- Market top4: ✅ 相手候補の土台
- 市場外qScore最上位1頭 rescue: ✅ 最大1頭
- 最大候補数5頭: ✅
- Agreement 2-of-3: 👁 `コア相手` ラベル
- Pair probability: 👁 確率表示/比較。候補を2頭へ削るhard filterは禁止
- 最終相手選択: 手動

## UI案

各相手を以下の役割で表示する。

- CORE: 市場上位かつAbility/M3も支持
- MARKET: 市場支持は強いが構造一致が弱い
- STRUCTURE RESCUE: 市場上位4外から1頭だけ
- OUT: 上記に入らない

この役割表示は券種を自動決定しない。
