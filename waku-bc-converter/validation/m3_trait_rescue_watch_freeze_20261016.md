# M3外・救済監視 v1 freeze — 2026-10-16

## Purpose

M3本命レイヤーとは別に、M3が7位以下へ置いた馬の中から、既存の独立した2シグナルが同時に強い馬を「救済監視」として表示する。

## Frozen rule

対象は検証母集団と同じ JRA平地・12頭以上・3勝クラス以上を想定し、trait snapshot cutoff 2026-10-04より後のレースのみ。

表示条件はすべて満たすこと：

1. M3順位 >= 7位
2. 末脚特性 = A
3. Ability v2候補順位 <= 3位

表示のみ。M3順位、Top3確率、馬券判定、オッズ評価は変更しない。

## Why Ability top 3 is not newly optimized here

`m3-ability-compare-v1.js` ではこの救済レイヤーを作る前から、`Ability v2 rank <= 3 && M3 rank >= 7` を `能力高・M3慎重` として強調する既存境界が実装されている。

したがって今回の `<=3` / `>=7` は、直近の好走馬を見て新たに探索した閾値ではない。既存Ability側の固定された乖離定義に、独立して作成済みの末脚特性Aを重ねる。

## Statistical status

これは新しい組み合わせルールであり、過去のpost-cutoff少数例を見た後に着想されたため pristine OOS ではない。

よって現時点では：

- 「買い」判定にしない
- 確率補正しない
- M3順位を上げない
- Ability順位の閾値を今後の結果で動かさない
- M3 7位の境界を今後の結果で動かさない
- 末脚Aのcutoffを動かさない

## Prospective log fields

今後は各新規レースについて最低限、以下を固定記録する。

- race date
- field size
- horse number / name
- M3 rank
- trait A/B/C
- Ability v2 rank
- Ability v2 projected Top3
- actual finish / Top3 outcome

補助としてRPCI v2 top band、distance、predicted positionを保存してよいが、v1 rescue gate自体の条件には追加しない。

## Promotion criteria

十分なfreeze後サンプルが蓄積するまでは研究表示のままにする。

将来スコア候補へ昇格する場合は、少なくとも：

1. freeze後のみで rescue候補のTop3率を報告
2. 同じ M3 7位以下の非rescue群と比較
3. M3 rank構成を調整しても方向が維持
4. race-cluster CIを報告
5. できればhorse依存も考慮
6. 閾値を途中変更しない

を満たすこと。

## UI wording

`M3外・救済監視`

`RESCUE WATCH / PROSPECTIVE v1`

`加点なし`

ユーザーに「本命」や「買い推奨」と誤解させない。