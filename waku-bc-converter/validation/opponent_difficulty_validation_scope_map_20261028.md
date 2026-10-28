# ⑤相手診断 / ⑥レース難易度 — 検証可能期間とOOS境界の固定表

Date: 2026-10-28
Status: **FROZEN VALIDATION SCOPE MAP**

## 目的

近年の小標本だけで高/中/低などのルールを作り、年を変えると反転する事故を避けるため、⑤相手診断と⑥レース難易度について、各材料を「どの年まで遡って観察できるか」ではなく「どの年を検証年として数えてよいか」で分類する。

原則：**データが存在する年 = OOS検証に使える年、ではない。**

モデルの学習・選択に使った年、またはルール発見に使った年は、そのルール自身の未知年OOSには数えない。

---

## 1. 検証レイヤー分類

### A. 長期・モデル非依存で検証できる材料

#### 市場分散 (Neff / HHI)
- 使用可能データ: 2016–2026
- 既存検証: 2016–2024 historical / 2025 confirmation / 2026 confirmation
- 状態: **採用可（記述的難易度材料）**
- 理由: Ability / M3 / P10 の学習結果を必要とせず、単勝市場と実着順だけで定義できる。
- 禁止: BUY/PASS、相手頭数、点数の自動決定。

#### 素朴な Position Risk 現象
- 使用可能データ: 2017–2026（2016は履歴形成）
- 既存検証: 2017–2024 / 2025 / 2026 で「過去走から二桁位置取り傾向がある馬はTop3率が低い」方向が再現。
- 状態: **長期再現性あり。ただし位置取りリスクの記述・非市場補助に限定**
- 注意: 最終単勝オッズを入れると追加価値は大きく縮小するため、独立した万能能力指標とは扱わない。

#### Top3 Condition Edge
- 元データ: 2016–2026
- 評価: walk-forward 2021–2026
  - train 2016–2020 -> test 2021
  - ...
  - train 2016–2025 -> test 2026
- 状態: **相手候補の市場残差コンテキストとして研究採用可**
- 強み: Top Edge / Bottom Edge の市場O/E方向が6年で概ね一貫。
- 禁止: そのまま馬連・ワイド自動買いへ変換。

### B. 凍結モデルのOOSとして扱える材料

#### First-corner Queue
- fit: 2019–2023
- frozen evaluation: 2024 / 2025 / 2026
- 状態: **構造情報としてPASS**
- 2019–2023を現行モデルのOOS評価年には数えない。

#### Remaining-600 position
- fit: 2019–2023
- frozen evaluation: 2024 / 2025 / 2026
- 状態: **構造情報としてPASS**

#### M3 core / top3 probability
- fit: 2019–2023
- model selection: 2024
- confirmation: 2025
- final OOS: 2026
- 状態: **構造順位 / top3 probability としてPASS**
- 2019–2024を「未知年OOS」として再利用しない。

#### Ability v1
- development / model selection: 2024
- confirmation: 2025
- final OOS: 2026
- 状態: **市場非依存の地力参照としてPASS**
- 2024は現行AbilityのOOSではない。

#### P10 / PositionRisk runtime model
- train: 2024 fixed
- validation: 2025–2026
- 状態: **display-only position riskとして利用可**
- 2024は現行P10モデルの未知年評価には数えない。

### C. 複合ルール / 研究後に作ったため、過去年を純OOSにできない材料

#### HIGH AXIS
- 条件: Ability #1 × Ability P3 >=40% × high-class history >=3 × M3 <=4
- 2024–2026の後方成績は存在するが、このゲート自体を2024–2026を見て選択。
- 状態: **Shadow / Forward待ち**
- 2024–2026を未知年OOS確定と呼ばない。
- clean validation: 2026-10-26以降のforward + 2027。

#### Opponent Candidate Pool max5
- rule development: 2025
- confirmation: 2026
- final market popularity is historical proxy; exact T-15 snapshotではない。
- 状態: **manual shortlist / recall support Shadow**
- sample: quinella partner n=38 pooled, wide partner n=50 pooled と小さい。
- 2019–2024へ遡って同じルールを当てても、Ability/M3/P10の学習・選択期間と重なるため clean OOS にはしない。

#### 相手の絞りやすさ（structure-best popularity band）
- 2025 / 2026 revalidationで方向反転。
- 状態: **REJECT / 判定保留**
- 高 / 中 / 低へ変換しない。
- 同じ2025–2026で閾値を再探索しない。

#### Market top4 × structural top3 agreement
- 2025 / 2026で単調性が再現せず。
- 状態: **descriptive only / difficulty labelには不採用**

#### Race Strength Profile / post-hoc difficulty heuristics
- 2024–2026を見て発見したルール群。
- 状態: **Shadow / prospective validation required**
- 2024–2026を未知年OOSとして宣伝しない。

#### 現在の「展開の読みやすさ」UI
- 現行は主にQueue履歴の充足率を高/中/低へ変換。
- Queueモデル自体はOOS PASSだが、**履歴充足率 = レース全体の展開が読みやすい**という変換は未検証。
- 状態: **要検証**
- 次の対象。

#### 統合レース難易度 / 総合点
- 4項目の重み付き合成は未検証。
- 状態: **作らない**
- 各要素が独立に検証されるまで総合スコア化しない。

---

## 2. 今後の固定ルール

### Rule 1 — 学習年を検証年に数えない
モデル依存の指標は、そのモデルのtrain / model-selection期間を、その組合せルールのOOS証拠として扱わない。

### Rule 2 — 年間方向が割れたら pooled だけで採用しない
2025で良く2026で逆転した場合、pooled平均が良くても高/中/低ルールへ昇格させない。

### Rule 3 — 閾値は確認年を見た後に変更しない
確認年で失敗した閾値を、同じ年の結果を見ながら調整して再度「検証済み」としない。

### Rule 4 — 小標本は必ずnを前面表示
- 各band n<30: **small sample / descriptive only** と明示。
- n>=30でもCIと年別方向を必ず確認。
- `n>=30`は昇格条件ではなく、極端な小標本警告の最低ライン。

### Rule 5 — 昇格には年別再現性を要求
カテゴリ難易度を採用するには最低限:
1. 開発年で方向を定義する。
2. 確認年で同方向。
3. 可能なら別の最終OOS年でも同方向。
4. race-cluster bootstrap / 適切なCIで効果量の不確実性を併記。

### Rule 6 — final odds と T-15 を混同しない
historical final popularity / final odds で確認した市場ルールは、live T-15運用の確定証拠ではない。T-15はforward logで確認する。

### Rule 7 — post-2026 composite rules のclean holdoutは2027
2026までの結果を見て作ったHIGH AXIS、Race Strength、相手難易度などの新しい複合ルールは、2027をclean calendar holdoutとして残す。

### Rule 8 — 長期検証できる現象と、モデルOOSを別表示
UI / validation reportでは以下を分ける:
- `LONG-HORIZON REPLICATION`: 市場分散、素朴Position Riskなど。
- `MODEL OOS`: Queue / M3 / Ability / P10など。
- `FORWARD ONLY`: 2024–26を見て作った複合Shadow。

---

## 3. ⑤相手診断の現時点

| Component | Validation window | Status |
|---|---|---|
| Market order / concentration | 2016–2026 possible | long-horizon descriptive |
| Top3 Condition Edge | walk-forward 2021–2026 | research/context supported |
| Ability | 2025 / 2026 OOS | supported trait |
| M3 | 2025 / 2026 confirmation/OOS | supported structural trait |
| P10 | 2025–2026 validation | display-only risk |
| max5 candidate pool | 2025 develop / 2026 confirm | Shadow recall support |
| structural-best popularity -> opponent ease | 2025/26 | rejected |
| automatic opponent count / ticket | — | not supported |

## 4. ⑥レース難易度の現時点

| Component | Validation window | Status |
|---|---|---|
| 市場の分散 | 2016–2024 + 2025 + 2026 | **validated descriptive** |
| 中心候補の明確さ | HIGH AXIS is 2024–26 research-touched | **Shadow / forward needed** |
| 展開の読みやすさ | underlying Queue OOS 2024–26; readability mapping unvalidated | **next validation target** |
| 相手の絞りやすさ | 2025/26 ordering failed | **判定保留** |
| 総合難易度点 | no independent validation | **do not build** |

---

## 5. 次の検証

次は `展開の読みやすさ` を検証する。

現在の単純な `Queue履歴が全頭揃う = 高` をそのまま正解とせず、2024で定義・2025と2026で確認する。

候補アウトカム:
1. race-level first-corner queue prediction error;
2. RPCI band forecast error / coverage;
3. predicted queue ordering vs actual early-position ordering;
4. missing-history shareと上記誤差の単調関係。

採用条件:
- 2025と2026で同じ方向を再現;
- band分割は2024で固定してから確認;
- 2025/2026を見ながらcutoffを動かさない;
- 読みやすさラベルが実測予測誤差と対応しなければ、高/中/低を撤回する。
