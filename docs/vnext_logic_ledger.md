# 競馬アプリ vNext ロジック台帳

更新日: 2026-10-28  
基準コード: `main` commit `120b62e3c8565a9558c2d374413b8015404b490f` / build `20261027win1`  
対象: まず iPhone / Mobile Lean 実行経路を正本とする。Desktop legacy は凍結し、vNext の判断ロジックへ自動昇格させない。

---

## 0. この台帳の目的

この文書を、今後の検証・実装の唯一のロジック台帳とする。

目的は次の4点。

1. 現行コードに「本番」「研究Shadow」「表示専用」が混在している状態を解消する。
2. 研究結果が良く見えたという理由だけで、その場で本番判定へ接続しない。
3. 同じ概念を複数モジュールが別定義で持たない。
4. 最終的なアプリを「馬券術を自動決定するアプリ」ではなく、「レースを分解して人間が馬券構築できる分析アプリ」にする。

### 状態ラベル

- ✅ Production: 現時点でvNext本番に残す
- 🔄 Replace/Update: 現行は動いているが、新しい検証済み版へ差し替える
- 🧪 Shadow: 研究専用。Production判定を書き換えてはいけない
- 👁 Display: 分析表示のみ。軸ランク・BUY/PASSを直接変更しない
- 🗑 Retire: vNextの判断経路から外す
- ➕ New: 検証済み/有望だが現行コード未実装

---

# 1. vNext の基本原則

## 1.1 判断は1本のパイプラインだけ

```text
入力
 ↓
Ability / M3 基礎構造
 ↓
市場構造
 ↓
隊列・位置取り
 ↓
コース位置適性
 ↓
補助情報
 ↓
Axis Reliability（連続値）
 ↓
S / A / B / C / D
 ↓
相手候補を分解表示
 ↓
最終馬券はユーザーが構築
```

`Shadow` はこの経路の横で動かすだけで、Axis Reliability、S/A/B/C/D、BUY/PASS、相手順位を書き換えてはいけない。

## 1.2 総合点で全部を潰さない

最終画面では、総合軸ランクだけでなく以下を独立表示する。

- Ability
- M3
- Market
- Queue
- P10
- Front Pack Separation
- Course Position
- Pace Vulnerability
- Ability Traits
- Data Reliability

相関の強い指標を単純加算して二重計上しない。

## 1.3 閾値は後から動かさない

2024–26はすでに何度も研究で見ているため、今後「完全な未知OOS」とは呼ばない。

- 2019–23: 開発 / 年抜き確認に使用可
- 2024–26: 既知の確認期間。再現性チェックには使うが閾値探索は禁止
- 2027以降: 真のForward確認

新しい閾値を作る場合は、先に式・方向・評価指標を固定してから結果を見る。

---

# 2. 現行 iPhone 実行経路の棚卸し

## 2.1 基礎能力・展開

|領域|現行コード / モデル|現状|vNext|軸ランクへの扱い|
|---|---|---:|---:|---|
|Ability core|`mobile-ability-core-v1.js` + `ability_model_v1.json`|JRA・3勝以上・最大5走。順位/着差/クラス等からAbilityを算出|✅|基礎コアとして使用|
|M3 core|`finish600-simulator-v2.js`|残600m位置→過去PCI/RPCI/上がり等からゴール構造を推定|✅|基礎コアとして使用|
|M3 P3 calibration|`m3-calibrated-shared-v1.js` + `m3_top3_probability_v1.json`|M3を3着内確率へ較正し、レース内合計≈3へ投影|✅|確率そのものと順位を使用可|
|Validated Queue|`validated-queue-model-v1.js`|過去前方度・逃げ率・枠・1角距離・他馬先行圧から位置予測|✅|隊列モジュールとして使用|
|Pursuit grade|`validated-queue-model-v1.js`内|芝1200/1400、ダ1400等の限定条件|👁|説明表示。単独加点しない|

## 2.2 位置取り

|領域|現行コード / モデル|現状|vNext|軸ランクへの扱い|
|---|---|---:|---:|---|
|旧P10|`position-risk-display-v2.js` + `position_risk_runtime_v2.json`|10番手以下になる確率。コード上は「表示専用」|🔄|P10-v3へ差替え。旧版は廃止|
|旧Position Risk v1/v2|外回し/包まれ等の簡易Risk|全体OOSで安定せず|🗑|軸加点に使わない|
|Position Loss v3|現行未実装|従来隊列より位置予測MAE/RMSEを2019–26全8年で改善|➕|隊列補正に採用。好走率へ直接加点しない|
|P10-v3|現行未実装|2024–26で旧再構築P10よりAUC/LL/Brier改善。<20/20–50/50–65/65+も校正良好|➕|独立リスク表示として採用。ハード軸ゲート禁止|
|Front Pack Separation (FPS)|現行未実装|HIGH COREで圧縮→低、分離→高の強い傾向。既存モデルへの増分も有望|➕|独立モジュール候補。強いS材料候補だが統合前に再確認|

---

# 3. 現行「軸判定」の整理

|ロジック|現行状態|問題|vNext|
|---|---:|---|---:|
|`mobile-decision-core-v1.js`|本番モバイルで稼働|Ability≤3 × M3≤3、Ability1/2/3の固定分岐、P10<20%、前方度≥70%、1–6人気ハードゲートを使用|🔄 全面更新|
|`axis-reliability-shadow-v1.js`|Shadowだが最終UIが参照|Ability #1 × P3≥40% × 履歴≥3 × M3≤4。2024–26を見て作った条件|🗑 vNext判断から撤去|
|旧HIGH P3≥40%|研究由来|Walk-forward観点で年代依存。固定閾値として弱い|🗑|
|前方度≥70%ハードゲート|本番Decision Coreに存在|位置取りは有用だが固定境界で軸信頼度を決める再現性は不足|🗑 ハードゲート廃止|
|人気1–6位ハードゲート|本番Decision Coreに存在|人気順位の離散境界より市場強度の連続値が適切|🗑|

## vNext Axis Reliability 方針

### 内部

連続値で計算し、最後に較正して S/A/B/C/D へ落とす。

### S/A/B/C/D の意味

- S: Aの中でも、独立モジュールが追加一致した最上位。件数を絞る
- A: 統計的に強い軸
- B: 条件付き軸
- C: 固定軸には弱い。相手向き
- D: 軸回避

### 現時点の実績

4層では過去検証上、A-or-better / B / C / D に明確な差が出たが、Sの分割は年代で不安定だった。

したがって **Sは既存Axis scoreの閾値をさらに厳しくするだけでは作らない。**

Sは「A + 独立したQueue/Market/Course等の確認」が再現した場合のみ昇格させる。

---

# 4. 市場モジュール

|領域|現状|研究結果|vNext|
|---|---|---|---:|
|単勝人気順位|現行で強く使用|有用だが固定1–6人気境界は粗い|🔄 連続市場強度へ|
|Market Dominance `D=2番人気Odds / 1番人気Odds`|未実装/研究|HIGH COREでD上昇と好走率上昇。D≥2付近は強いが閾値丸暗記は避ける|➕ 連続修正量として採用候補|
|市場集中度 / Neff|Wide Signal等に存在|市場構造診断として有用。BUYゲート固定は過学習リスク|👁 診断中心|
|枠連人気帯|Wide Signalで使用|旧馬券術の研究資産|👁 市場構造表示。Axisへ直結しない|

市場は「人気だから強い」ではなく、**Ability/M3で市場本命を認証する層**とする。

---

# 5. コース・馬場

|領域|研究結果|vNext|
|---|---|---:|
|固定枠有利（例: 東京外、中山内）|年代再現性が弱い。track_surface gate effectは不安定|🗑 固定スコア廃止|
|コース×予測位置|一部コースで2019–23内LOYO安定 → 2024–26でも好位置群が改善|➕ 再現確認済みコースのみ|
|全コース exact course×position|高次元で過学習|🗑|
|Course geometry低次元|小幅改善だがCI跨ぎ|🧪|
|Going追加|Ability/M3等の上にほぼ増分なし|👁 表示/説明|
|コース×位置×FPS|2024–26で有望、交互作用方向も支持。ただしLOYO完全安定ではない|🧪 強候補|

### コースの設計原則

`枠 → 隊列予測 → Position Loss補正 → 予測位置 → コース位置適性`

枠そのものに「+5点」を付けない。

今後は4区分の位置レンジより、**予測位置パーセンタイルを連続値のまま扱う滑らかなコース位置適性曲線**を検証する。

---

# 6. ペース・能力タイプ

|領域|研究結果|vNext|
|---|---|---:|
|Pace Vulnerability / Fast Pace Tolerance|脆弱群がold/recentとも低め。pは境界的。増分CIは0跨ぎ|🧪 軽い負方向候補|
|圧縮×前方×ペース脆弱性|年代再現せず|🗑|
|速力|次走同Traitとの相関あり|👁|
|超速力|Trait再現性が最も高い|👁|
|加速力|Trait再現性あり|👁|
|持続力|Trait再現性あり|👁|
|消耗戦耐性|Trait再現性あり|👁|
|5能力を全部Outcomeへ加算|2024–25微改善、2026悪化。相関も高い|🗑 単純加算禁止|
|Race requirement × AbilityMatch|一般的な強い馬を再発見する部分が大きく、2026再現せず|👁/🧪|
|Pure Shape Match|ほぼ増分なし|🗑 Axis加点不可|

能力5項目は「どんな馬か」を説明するために表示する。Axis scoreへ5本を独立加算しない。

---

# 7. 相手・券種ロジック

## 7.1 現行本番寄り

`mobile-opponent-core-v1.js`

- 市場上位4頭
- 構造拾い最大1頭
- 最大5頭
- 最終相手は手動選択

これは「分析アプリとして人間が馬券を組む」というvNext思想と合うため、✅ **基本思想は残す**。

ただし内部の `ar + m3 + P10段階ペナルティ` は将来、連続スコアへ差し替える。

## 7.2 Shadow

|ロジック|現状|vNext|
|---|---|---:|
|Opponent VETO Shadow|ワイド/馬連でObserved 95%前後の保持を目標に研究|🧪 継続研究|
|Wide hard VETO: 14人気以下 OR Ability/M3 P3両方<12%|2024–26で保持96.2%。歴史ストレスでも高保持|🧪 有力だがForward前|
|Quinella VETO|Wideほど安定しない|🧪|
|Post-VETO TOP2|2024–26を見て固定|🧪|
|ワイド7倍固定|旧研究で選択。長期再現性に懸念|🗑 本番化しない|
|Wide Signal / A2 CORE / PAIR2 / LOGIC C|旧枠連市場研究の派生|👁/🧪。馬券自動決定には使わない|

---

# 8. 最終UI・BUY/PASSの問題点

## 8.1 `mobile-final-summary-v1.js`

現行では最終「今回の結論」が以下を参照する。

- `AxisReliabilityShadowV1State`
- `RaceStrengthProfileShadowV1State`
- `PostVetoTop2ShadowV1State`

つまりコード上で「Production未変更」と書かれているShadowが、UX上の最終BUY/PASSを事実上決めている。

### vNext

🗑 **この依存関係を撤去する。**

最終UIは新しい `AxisReliabilityVNextState` のみを正本とする。

Shadowは「検証詳細」タブに隔離する。

## 8.2 Race Strength Profile

現行Shadow:

- 16–18頭を得意
- Ability1位−2位差≥0.12を得意
- 1200–1400mを得意
- 強構造なし＋1600m以上を苦手

これは旧HIGH 149例からの後付け探索であり、現在の広い検証と思想が一致しない。

🗑 vNextのBUY/PASSから外す。

## 8.3 Win Forward Candidate

現行:

`HIGH AXIS + 16頭以上 + Ability差≥0.12 → 単勝BUY候補`

研究期間に依存し、現在の検証設計では本番採用根拠が不足。

🗑 vNext本番判断から外し、必要ならForward記録だけ残す。

---

# 9. vNext 正式モジュール案

## Layer A: Core Ability

### ✅ Ability
- Ability rank
- calibrated P3
- history reliability

### ✅ M3
- M3 rank
- calibrated M3 P3
- scenario variation は説明表示

## Layer B: Market

### ➕ Market Strength
- normalized market probability
- Market Dominanceを連続量で使用
- market concentrationは診断

## Layer C: Queue

### ✅ Validated Queue
基礎隊列

### ➕ Position Loss v3
基礎隊列を微調整する。軸P3へ直接足さない。

### ➕ P10-v3
「10番手以下」の校正済み確率。

### ➕ FPS
前方集団の圧縮/分離。

## Layer D: Course

### ➕ Course Position Fit
再現性が確認されたコースだけ。
今後は連続位置曲線を検証する。

## Layer E: Diagnostics

### 👁 Pace Vulnerability
### 👁 5 Ability Traits
### 👁 Going
### 👁 previous-disadvantage 等

この層は、統計的な独立増分が確認されるまでAxis scoreを書き換えない。

---

# 10. S/A/B/C/D の統合前ルール

現時点では **最終式を固定しない**。

先に各独立モジュールをOOSで確認する。

統合時のルール:

1. Ability/M3/Marketを基礎Axis scoreとする。
2. Queue/FPS/Courseは「独立増分が確認されたもの」だけ修正量として使う。
3. P10は後方化確率の表示を主目的とし、固定閾値でS→B等へ落とさない。
4. Ability Traits、Going、Paceは説明層から開始。
5. Sは単一閾値では作らない。
6. 全モジュールを足して100点にする方式は禁止。

---

# 11. 研究採否台帳（2026-10-28時点）

|研究|採否|理由|
|---|---:|---|
|Ability + M3 favorite authentication|✅|同オッズ帯でも低オッズ領域で構造liftが再現|
|Market Dominance|➕|連続的な信頼度modifierとして有望|
|Queue prediction|✅|2019–26全年度でSpearman約0.57–0.60|
|FPS|➕|HIGH COREで強い勾配、増分モデルも改善|
|Escape competitor count|👁|FPSの補助説明。独立増分小|
|Pace Vulnerability|🧪|old/recent同方向だが十分確定せず|
|Ability type × FPS|🗑|全Universeで増分なし|
|Ability 5 traits|👁|Traitとして再現するがOutcome独立増分なし|
|AbilityMatch|🗑 Axis|2024–25微改善、2026悪化|
|Pure Shape Match|🗑 Axis|ほぼ無効|
|Exact course×gate×position|🗑|過学習|
|Hierarchical course geometry|🧪|小幅改善だがCI跨ぎ|
|Stable course×position|➕|一部再現コースでOOS差あり|
|Course×position×FPS|🧪|有望だがLOYO不完全|
|Position Risk v1/v2|🗑 Axis|年代安定せず|
|Position Loss v3|✅ Queue補正|全8年で位置予測改善|
|P10-v3|✅ Risk display|旧P10より識別/校正改善、M3にも少量の独立情報|
|Going追加|👁|既存モデル上の増分ほぼなし|
|Wide VETO|🧪|保持率は有望だが研究済み期間依存|
|Wide 7倍 TOP2|🗑 Production|閾値探索・長期安定性の懸念|

---

# 12. 次の検証順序

台帳整理後は、以下の順で進める。

## Phase 1 — 隊列を完成

1. Position Loss v3を現行Queueへ統合した場合の完全Walk-forward再確認
2. P10-v3を新隊列から正式再校正
3. FPS定義をProduction用に固定

## Phase 2 — コース

4. `v3補正後予測位置 × コース` を連続曲線で検証
5. course position fit が2024–26で増分を持つか
6. FPSとの交互作用は事前仮説1本だけで確認

## Phase 3 — Axis

7. Ability/M3/Marketの基礎Axis continuous scoreを固定
8. Queue/FPS/Courseを1つずつ追加し増分確認
9. 最終continuous scoreを較正
10. S/A/B/C/D境界を開発期間だけで決定

## Phase 4 — 相手

11. 相手候補の連続Coreを整理
12. VETOはForwardに耐えたものだけ昇格
13. 券種・価格は分析表示に留め、ユーザーが最終構築

---

# 13. 実装優先順位

### P0 — ロジック衝突防止

- Shadowから最終BUY/PASSを作らない
- Production正本Stateを1つにする
- 旧HIGH / Race Strength / Win Forward Candidateの本番UI接続を切る

### P1 — Queue vNext

- Position Loss v3
- P10-v3
- FPS

### P2 — Axis vNext

- continuous Axis score
- S/A/B/C/D calibration
- module breakdown UI

### P3 — Course Position

- 再現コースのみ
- continuous position fit

### P4 — Opponent

- 手動候補プール維持
- VETOはShadow継続

---

# 14. 変更管理ルール

今後、新しい検証を行うたびにこの台帳へ必ず1行追加する。

最低限記録する項目:

- 仮説
- 事前固定した式/特徴量
- 開発期間
- 確認期間
- サンプル数
- AUC / LogLoss / Brier または目的に適した指標
- race-level bootstrap CI
- 年代別方向一致
- 採否
- Productionへ影響するか

**検証結果を見てから既存閾値を変更した場合、その結果はForward確認扱いにしない。**

---

# 15. 現時点の最終方針

vNextの目的は「自動で馬券を買わせること」ではない。

**レースを、能力・市場・隊列・位置リスク・コース・ペースに分解し、再現性のある情報だけを同じ画面へ並べる。**

最終馬券構築はユーザーが行う。

そのため、今後の研究では「ROIが一時的に高いルール」より、

- 年代を跨ぐ
- 連続値で効く
- 既存モジュールと独立増分を持つ
- 説明可能
- Forwardで固定できる

を優先する。
