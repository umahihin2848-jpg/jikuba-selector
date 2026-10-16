# M3救済監視 × 解説文章：テレビ静岡賞CSV点検 2026-10-16

## 対象

ユーザー再提示CSV `2026_テレビ静岡(1).csv` を用いて、救済監視を解説文章へ反映した後のロジックを点検した。

ローカルSHA-256は `6a2b5c691ebd5eca1ebe08b10a5489862c448fdff04d57cff74c83b25e0d665c`。先に点検した `2026_テレビ静岡.csv` とbyte-identicalで、306行 × 106列、今回馬16頭のTARGET全馬一括履歴CSV。

このため、既報の同一CSV replayで確認済みの pre-race M3 / trait 状態をそのまま再確認できる。

## 既存pre-race state

テレビ静岡賞（2026-10-12、東京ダ1400、16頭）について、既報QAでは：

- RPCI v2 top = `45-49`
- #16 アジアミッション = Trait A / M3 4位
- #15 ヤマニンアストロン = Trait A / M3 8位

救済監視 v1 の固定条件は `12頭以上 + M3 7位以下 + Trait A + Ability v2候補 top3`。

## Ability v2再確認

同CSVから current runtime と同じ3勝クラス以上履歴を抽出し、Ability v1 + strict-prior Elo の候補式を再計算した。

ヤマニンアストロン：

- Ability v1 logit = `-1.068668`
- Ability v1 rank = 3位
- eligible high-class history = 8走
- strict-prior Elo final = 約 `1714.55`
- 2024固定標準化 mean = `1654.6417`, sd = `269.3543`
- beta = `0.40622844`
- Ability v2 logit = 約 `-0.978349`
- Ability v2 rank = **2位**

近傍候補の再計算：

- #7 カルパ: v2 logit 約 `-0.81815`
- #1 キョウエイカンセ: 約 `-1.17164`
- #11 フウセツ: 約 `-1.20091`
- #8 セギレエルビエント: 約 `-1.29822`
- #2 アスクアイルビゼア: 約 `-1.54459`
- #3 クインズデネブ: 約 `-1.62393`

したがって #15 は rescue gate の Ability v2 top3 条件を満たす。

## Expected rescue state

#15 ヤマニンアストロンは：

- 16頭立て → scope内
- target date > trait cutoff 2026-10-04
- M3 8位 → `>=7`
- Trait A
- Ability v2 2位 → `<=3`

なので `M3外・救済監視` に表示される。

## Narrative change

`m3-ability-narrative-append-v1.js` を内部version `m3-ability-narrative-append-v2`へ更新。

主な変更：

1. narrativeのAbility基準を v1 から **Ability v2候補**へ変更。
2. `M3TraitRescueWatchState` を読み、救済対象を文章へ明示。
3. 救済監視と単なる `能力高・M3慎重` を分離。
4. `④ 自動解説` にも救済対象を1行追加。
5. M3 narrative のコピーは描画後のlive DOMをコピーするよう変更し、後付けされたAbility/救済/再現性文章も含める。
6. `解説をコピー` も現在の `#explain` 本文をコピーするよう差し替え、救済行を落とさない。

テレビ静岡賞で追加される主要文意は：

> 15番ヤマニンアストロンはM3 8位だが、Ability v2候補2位かつ末脚特性Aで「M3外・救済監視」に該当。M3本命への昇格や確率補正ではなく、固定条件を前向きに追う別枠。

UI chipも `M3外・救済監視：15` となる。

## Outcome sanity check

既知のレース結果では #15 ヤマニンアストロンが1着だったため、このCSVでは新しい救済表示が「M3 8位の勝ち馬」を画面上で別枠監視できる形になる。

ただし、このテレビ静岡賞は救済ルール着想前に結果を既に確認している。**この1着を prospective 成績へ加えてはならない。** 動作確認・説明文QAの例としてのみ扱う。

## Safety / overfit status

- Rescue条件は変更していない。
- Ability top3 / M3>=7 / Trait A / field>=12 を維持。
- M3 rank / calibrated Top3 / betting rule に加点なし。
- 文章も「本命」「買い」とは表現しない。
- future validationはfreeze 2026-10-16より後に発生する新規レースのみ。

## Static QA

更新した `m3-ability-narrative-append-v1.js` はローカル `node --check` PASS。

V3 build: `20261016t6`。

ブラウザ実機での最終visual QAはこの点検には含めていない。
