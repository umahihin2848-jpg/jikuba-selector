# 競馬分析Webアプリ — 完全引き継ぎ書（2026-11-19 18:00 JST）

> **最初に読むこと**：この文書は2026-11-19時点の運用方針と実装済みの状態を整理した引き継ぎ用スナップショット。将来はGitHub mainの実コードと最新コミットを必ず再取得して照合すること。2026-10月以前の古い検証文書には現在のPair方針と異なる記述がある。過去検証の数字を本番の確定好走率と扱わない。原データ（ユーザー提供CSV/7z）はこのGitHubに含まない。

## 0. 再開時の最重要リンク

- リポジトリ： https://github.com/umahihin2848-jpg/jikuba-selector
- 本番入口： https://umahihin2848-jpg.github.io/jikuba-selector/waku-bc-converter/v3.html?v=20261119pairlock1
- 本番HTML： waku-bc-converter/v3.html （GitHub Pages / 静的Webアプリ、iPhone Safari向け）
- この文書： PROJECT_HANDOFF_2026-11-19.md
- 2026-11-19最終の既知アプリ公開指定コミット：8a6d699873b14f9a82c95bee9c97c81ed39031fe（重賞Pair表示整合性、HTML更新）
- 2026-11-19最終の既知実装コミット：ab2d17158c44864e8bf6b0e0738a48f539a5c555（production-decision-pipeline-v1.js、Pair研究限定）
- 現時点の注意：GitHub更新と静的/模擬テストを確認したが、GitHub Pages実配信の完全なE2E操作やiPhone Safari実機通しテストは未実施。

## 1. 開発目的・境界

- JRA平地、実出走12〜18頭、対象クラスはG1〜G3・OP・L・3勝クラス。障害は対象外。
- 日曜重賞中心の分析。Ability（過去走の地力）・M3（今回のゴール到達構造）・P10（後方リスク）・初角隊列・M4（4ペース帯）・単勝市場を分けて表示する。
- 主な目的は、信頼できる軸候補、相手候補、見送り、単勝/馬連/ワイドの購入判断を分離し、将来の前向き検証で実際の期待値改善を測ること。目標回収率150%は希望値であり、実証済み性能ではない。
- 「候補を3頭表示する」ことは3点BUYではない。手動の買い目・資金配分・実オッズ確認が前提。未検証の統合点、EV閾値、Pair自動購入は導入しない。
- スマートフォン1レース1画面で簡単な結論と詳細説明を切替。研究結果が本番◎を勝手に上書きすることは禁止。

## 2. 2026-11-19 現行の本番ルール（これが最重要）

### 2.1 共通の軸判定

1. 解析完了・対象クラス・実出走頭数・全馬同一ID・モデル成立を確認。解析途中や不完全CSVは「判定待ち」であって購入可能ではない。
2. G1〜G3はAbility Cが本当に適用されていること必須。C未成立時は ability_c_wait（保留）。Ability v1による代替◎は禁止。
3. OP・L・3勝クラスはAbility v1を使い、実M3との順位照合で軸候補を決定。
4. Ability上位3頭 ∩ M3上位3頭を求め、同点首位・3位境界を信頼できない場合は保留。
5. 一致0頭：本番軸なし。3頭以上：本番軸なし。1頭：その馬がAbility1位ならA1、2位ならA2条件付き、3位なら見送り。
6. 一致2頭：**3勝、OP、Lは見送り（単独軸のみ）**。G1〜G3はAbility1位を含む場合、Pair研究比較のみ。単独◎としては採用しない。Ability1位不在のPairは見送り。
7. A1/A2は全頭単勝市場がそろった後に、軸の1〜6番人気を確認。7番人気以下は購入対象外だが、単独軸の研究分析表示は維持し得る。6番人気と7番人気のオッズ差が10%以下なら慎重な市場境界表示。
8. P10が50%以上の場合は**単勝だけ停止**。ワイド/馬連は組合せ価格も含めて別判断。A1におけるP10 20%未満かつ前方度70%以上は高信頼ラベルであり、両条件未達でも自動全券種停止ではない。
9. 3勝クラスの「単勝1〜2番人気」「前方度70%以上」は追加の購入ロックではなく、研究メモに限定。
10. AxisSelectionその他の研究軸が別馬を選んでも**本番のAbility×M3構造軸は変更しない**。

### 2.2 クラス別の運用表

| 区分 | Ability | 1頭一致 | 2頭一致（Pair） | 相手3頭 |
|---|---|---|---|---|
| G1〜G3 | **Ability C必須** | A1/A2＋市場確認 | 2頭比較のみ、購入不可 | **Ability C＋市場の既存凍結モデル**が◎を除く3頭を表示。実M3/P10/M4/初角は比較情報 |
| OP・L | Ability v1 | A1/A2＋市場確認 | 本番は見送り | C＋市場モデルを移植しない。市場人気・Ability・M3を独立参照、未検証の自動3頭採用はしない |
| 3勝クラス | Ability v1 | A1/A2＋市場確認 | 本番は見送り | 重賞用C＋市場の自動3頭採用はしない。人気/前方度は研究メモのみ |

**最新変更の経緯**：11/19先にOP・LのPairを見送りに変更、次に3勝クラスのPairも同様に変更。最後に重賞Pairの「本番条件通過」と誤解される最終要約を「Pair構造｜研究用・購入見送り」に修正。G1〜G3の2頭比較自体は残している。

### 2.3 重賞Pairの扱い・旧検証との関係

- G1〜G3で2頭一致かつAbility1位を含むと、構造上は double / pair の研究経路を通すことがある。
- AxisAccessGateV1は status=pair と betEligible=false を返す。最終ProductionDecisionPipelineV1は本番軸馬番を空にし、単勝・馬連・ワイドを「Pair研究のみ」、最終評価を「Pair構造｜研究用・購入見送り」とする。
- 過去のPair Survivalの3連複に高い参考ROIが出た資料はあるが、3勝以上混合集計、確定オッズ、好配当上位数件への依存が大きく、重賞Pair専用の前向きEVを証明していない。**自動馬券・資金投入には昇格しない**。
- 重賞Pairの将来の研究条件例は「15頭以下かつ一致2頭にM3 1位を含む」。これは研究用層別条件であり自動BUY条件ではない。

## 3. 現行ソース・依存関係

本番入口 waku-bc-converter/v3.html は2026-11-19時点で66本の外部JavaScriptと2つのインラインscriptを読み込む。全66ファイルの取得・JS構文検査およびHTML内2本の構文検査は通過。重複読み込みなし。ただし静的構文確認は実機通し動作確認の代わりにはならない。

主な流れ：

1. 入力・TARGET CSV：shape-core-v2.js、target-csv-compat-v1.js、ios-csv-autoparse-v1.js、csv-shared-cache-v1.js
2. 解析進行：mobile-analysis-controller-v1.js（window.RSAAnalysisTransitionState、window.MobileAnalysisCoreState）
3. ゴール構造：remaining600-validated-v1.js、finish600-simulator-v2.js（window.Finish600State、M3/M4）
4. 能力：mobile-ability-core-v1.js、ability-c-grade-v1.js、data/ability_model_v1.json（window.M3PureAbilityState、activeModel=Cまたはv1）
5. 隊列・位置：validated-queue-model-v1.js（ValidatedQueueState）、position-risk-display-v2.js（PositionRiskState）
6. 本番軸/券種：mobile-decision-core-v1.js（DecisionShellV2State）、race-skip-lock-v1.js（RaceSkipLockV1State）、axis-access-gate-v1.js（AxisAccessGateV1State）
7. 本番表示用集約：mobile-opponent-core-v1.js（OpponentCandidatePoolState）、production-decision-pipeline-v1.js（ProductionDecisionPipelineV1State）
8. UI：mobile-final-summary-v1.js、mobile-product-ui-v1.js、mobile-focused-3tabs-v1.js（RSAFocusedThreeTabsState）
9. 研究用・前向き保存：prediction-reliability-shadow-v1.js、mobile-prediction-ledger-v1.js、ability-v3-*。研究状態を本番軸/券種へ逆流させない。
10. 初期化や追加JS：v3-addons-loader-p.js、mobile-addon-resilience-v1.js、mobile-lean-preempt-v1.js、runtime-health-guard-v1.js

### 3.1 本番APIと代表的な判定コード

- DecisionShellV2State.structure: kind=A1/A2/A3/double、axis、candidates、code
- DecisionShellV2State.final: level=green/yellow/neutral/red/wait、code
- RaceSkipLockV1State.status: open / skip / checking / idle
- AxisAccessGateV1State.status: pass / pair / skip / checking / idle。**betEligible は単独軸の安全ゲートと市場条件を通過した時だけtrue**
- ProductionDecisionPipelineV1State.final: ready / conditional / neutral / stop / wait。Pairは neutral（研究のみ）、単独軸ではない。
- 研究用AxisSelectionの選び直しは最終◎に適用しない（selectionAppliedToProduction=false）。

### 3.2 相手3頭に関する混同防止

- G1〜G3のスマホ「相手馬情報」は Ability C＋市場モデルで**3候補**を提示する。◎は除外。M3/P10/M4/初角予測は追加スコアにして自動入替しない。
- 一方、古い内部 production-decision-pipeline / mobile-opponent-core の対戦相手ステージには market_top2_excluding_axis という**2頭ロジック**が残る。3候補表示はこれを一斉に書き換えたものではない。表示3頭を自動3点BUYや厳密な確率較正値として扱わない。
- 3勝・OP・LではG1〜G3用C＋市場の3候補を本番採用しない。研究UIにC×M3の旧文言が一部残る可能性があり、実際の activeModel と一致させてから表示を判断する。

## 4. 2026-11-19の検証済み数字（厳密な意味）

| 対象・期間 | 対象レース | 単独軸成立（代理） | ◎3着内（代理） | ◎除外の相手3頭捕捉 | ◎＋相手双方3着内 |
|---|---:|---:|---:|---:|---:|
| OP・L、2025〜2026 | 170 | 21 | 12/21=57.1% | 16/21=76.2% | 9/21=42.9% |
| 3勝クラス、2025〜2026 | 286 | 33 | 16/33=48.5% | 28/33=84.8% | 11/33=33.3% |
| G1〜G3、2019〜2026別研究 | — | 173軸の別コホート | 85/173=49.1% | 厳密に対応する同条件集計なし | 厳密に対応する同条件集計なし |

別の重賞相手3頭代理比較（2025〜2026、174レース）では、市場上位3頭の候補内捕捉131/174=75.3%、市場＋Ability代理133/174=76.4%、市場＋Ability＋M3代理132/174=75.9%。この市場相手比較の「捕捉率」は上表の「軸成立時の同時好走」と同義ではない。重賞の別軸代理検証99/174=56.9%も、上表の85/173とは異なる条件であって足し合わせてはいけない。

OP・L全レースの市場3頭捕捉145/170=85.3%、3勝の市場3頭捕捉255/286=89.2%。これらは**全レース・軸除外なし**の3頭候補捕捉であり、ワイド的中率ではない。市場＋Ability（＋M3代理）を加えても安定的な上積みがなく、改善があったと主張しない。

全検証の重要な制限：
- ユーザー提供2026年結果は**2026年10月4日まで**。2025〜2026は既に多数の探索分析に使われた研究済みサンプル。
- オッズは主に**確定最終オッズ**であり、発走15分前／5分前に購入できた価格ではない。
- M3は実ブラウザの全馬保存値ではなく**代理計算**。単独軸成立率が本番と一致する保証なし。
- Ability C、Ability v1、構成モデル、データ母集団が異なるため、上表の57.1/49.1/48.5を同じ精度の純粋なクラス比較に用いない。
- 3頭捕捉率の上昇は購入点数増（2→3頭で50%増）と同時に起きる。回収率・正の期待値は未確認。

主な根拠：
- 同ディレクトリの validation/frozen_final_axis_top3_protocol_20261119.md
- validation/op_l_single_axis_only_20261119.md（3勝を未採用と記載した当日の「旧時点」資料。現在の3勝Pair採用変更はこの引き継ぎ書が優先）
- validation/candidate_c_ticket_runtime_revalidation_20261023.md
- validation/market_free_ability_m3_pair_audit_20261030.md
- data/axis_partner_separate_validation_20261104.md
- チャット環境側生成：keiba_partner3_validation_20261119、keiba_op_l_validation_20261119、keiba_3win_validation_20261119 等の検証CSV/報告PDF/再計算ZIP。**これらはGitHubの公開リポジトリに自動保存されていない**。

## 5. 2026-11-19 改修履歴と現時点のテスト根拠

- 11/19今週版：本番◎はAbility C×M3構造軸を固定、AxisSelectionは研究専用。C未成立なら判定保留。重賞相手3頭の可視化、発走前研究JSONの整合性確認。v3.htmlの旧キャッシュ指定 20261119weekend1。
- OP・L単独軸：mobile-decision-core-v1.js / race-skip-lock-v1.js の2頭一致を停止。HTML cache=20261119opl1。
- 3勝クラス単独軸：同2ファイルへ3勝を追加、axis-access-gate-v1.jsに見送り理由、mobile-focused-3tabs-v1.jsに研究メモ。HTML cache=20261119threewin1。
- 11/19全体監査：公開HTMLから読み込む66本の外部JSと2つのインラインJSで構文エラー0件。イベント間の明白な直接循環は見つからず。focused 3tabsの変更なし再描画通知を抑制（同一状態3回→通知1回）。HTML focused cache=20261119audit1。
- 重賞Pair表示整合性修正：production-decision-pipeline-v1.jsでPairを研究のみと確定、内部の仮軸馬番/券種候補/最終「本番通過」を禁止。6ケースのモック＋静的整合チェックを通過。HTML pipeline cache=20261119pairlock1。
- 上記はコード取得・構文・ステート模擬テスト。iPhone実機・GitHub Pages本番のCSV読込→解析→オッズ→見送り/購入候補→保存の連続操作は未確認。モック合格を実機成功と書かない。

## 6. 既知の注意点・技術的負債（バグ断定しない）

1. **Pairの説明文**：production-decision-pipeline-v1.jsのPair研究説明には「重賞の2頭一致」と書かれている。内部では3勝/OP/Lの見送りPairにもこの分岐が通り得るため、今後クラス別に文字列を分けるとより正確。
2. **古いC表記**：mobile-focused-3tabs-v1.jsのskipDiagnosis等に「C×M3」の旧表示文言があり、非重賞ではAbility v1が正しい。見送りUIで誤解を招かないよう確認する。
3. **研究比較の可視性**：Pairの候補2頭は内部に残すが、3勝/OP/LはAxisAccessGateのskipで詳細タブ自体が隠れ得る。研究用に表示させたい時は、購入ロックを解除せず別パネルに分ける設計が必要。
4. **相手2頭と3頭の二重構造**：古いproduction opponent top2と重賞3頭比較UIの意味を混同しない。チケットロジックに相手3頭を自動接続しない。
5. **監査JSONの対象**：prediction-reliability-shadow-v1.jsの品質ゲートはG1〜G3・Ability C中心。OP/L・3勝も同じ前向き精度検証を行うなら、別定義の保存機能や検証母数を準備する。時刻は device_clock_untrusted であり、発走前の第三者証明ではない。
6. **表示対象頭数の上限**：mobile-decision-core-v1.js のscopeは12頭以上、race-skip-lock等は12〜18頭。19頭以上の異常入力が安全にスキップされることを実UIでも確認する。
7. **長期処理**：コード内のタイマー・カスタムイベント・optional addon retryの連鎖は広い。イベント抑制は行ったが、全ブラウザ実測のCPU/メモリ使用や長時間無限ループの不在は未保証。
8. **旧文書の時系列**：AXIS_POLICY_SINGLE_V1.md、validation/op_l_single_axis_only_20261119.md等は更新時点の凍結方針。現在の実装と矛盾したら、この文書の時点説明→GitHub実コード→新しいテストの順に確認。

## 7. 原データ・派生物の所在（公開リポジトリへ無断アップロード禁止）

このチャット/プロジェクトでユーザー提供された主な原データファイル：
- umade.csv、umadete.csv（過去走・TARGET関連の馬単位データ）
- 2016_2025_odds.csv、2026_odds.csv（過去の確定オッズ）
- 2026seiseki.csv、2026_2025_seiseki.csv（成績）
- haitou.txt、2026_haitou.txt（払戻）
- lap2016_2026(1).csv（ラップ）、pci(1).csv、pci2026(1).csv
- mainiti.csv、CK_DATA.7z
- 参考予想1.txt、参考予想2.txt、参考資料3.txt、参考資料4.txt、参考資料5.txt、参考資料6.txt、参考資料7 みねた.txt

これらは現在の会話環境では /mnt/data 以下にある場合があるが、**GitHubでは管理していない**。別のチャットやPC環境では必ず利用可能とは限らない。引き継ぎZIPに巨大な元CSV/7zは再同梱しない。再取込時はローカル作成のSHA-256マニフェストと照合する。

再計算・報告の重要フォルダ名：
- keiba_partner3_validation_20261119
- keiba_op_l_validation_20261119
- keiba_3win_validation_20261119
- keiba_forward_capture_20261119 / keiba_production_axis_audit_20261119
- keiba_weekend_release_20261119 / keiba_weekend_full_audit_20261119

## 8. 次回再開の優先順位（未完了）

1. **最優先：実機E2E**。新URLでiPhone Safari/PCブラウザを開き、重賞A1/A2、重賞Pair、OP/L単独とPair、3勝単独とPair、Ability C未成立、部分オッズ、P10高、対象外を操作確認。購入誤表示、フリーズ、画面更新ループ、古いキャッシュを確認。
2. **クラス別表示文言**と研究用Pair閲覧の整合性を修正。ただしPurchase Gateは維持。
3. **発走前データを凍結**。G1〜G3は既存の研究JSON出力、OP・L・3勝は別途保存仕様を設計。予想前の馬番・市場・人気・モデル版・M3/M4/P10・Pair判定・研究対象を残し、後日結果と突合。見送りを分母から消さない。
4. **同一年/同頭数/同人気基準の年別比較**。単独軸Top3と相手3頭捕捉を別々に検証し、市場だけの上位3頭・Ability追加・M3追加を同一3頭数で対照。過去の「最終オッズ」依存を卒業する。
5. **Pairの前向き検証**。G1〜G3のみ、2頭の3着内同時好走、馬連/ワイド/3連複の組合せ別価格と期待値、払い戻し集中度、見送りとの比較を保存。新規BUY判断は新しい未知の開催で再現するまで凍結。
6. 統計的な優位がない重み付き相手総合点やAIによる自動買い目を急いで実装しない。利益/損失の再現性とUI誤誘導防止が先。

## 9. 次チャットへ貼る短い再開プロンプト

「競馬アプリ jikuba-selector の開発を引き継いでください。GitHubの PROJECT_HANDOFF_2026-11-19.md と waku-bc-converter/v3.html の**最新ソースを再取得**し、実際のコードを正として読んでください。G1〜G3はAbility C×M3の単独A1/A2購入候補、Pairは研究比較のみでBUY不可。OP・Lおよび3勝クラスはAbility v1×M3の単独A1/A2のみ購入候補、Pair見送り。P10>=50%は単勝のみ見送り。重賞相手3頭はC＋市場で表示し、M3/P10/M4は別表示。別クラスへCモデルや未検証の統合スコアを流用しない。最終オッズ/代理M3の過去検証を実運用精度と断言しない。まず現状の差分と未解決事項を整理してから、次の依頼を実行してください。公開アプリは https://umahihin2848-jpg.github.io/jikuba-selector/waku-bc-converter/v3.html?v=20261119pairlock1 です。」

## 10. 引き継ぎ前のセルフチェック

- [ ] GitHub mainの実コードとこの文書の日付・commitを照合した
- [ ] データの代理値/実M3/最終オッズ/発走前オッズを混同していない
- [ ] 重賞Pairを本番◎や自動BUYにしていない
- [ ] OP/L/3勝Pairを本番購入可と誤判定していない
- [ ] 研究AxisSelectionが構造◎を上書きしていない
- [ ] 券種別P10条件・全頭市場ゲートを壊していない
- [ ] 12〜18頭・平地・対象クラス・Ability C成立条件を照合した
- [ ] コード修正後、構文・模擬・可能なら実ブラウザE2Eを試し、v3.htmlのキャッシュ識別子を更新した
- [ ] 原データ・機密情報を公開GitHubに書き込んでいない

**状態**：2026-11-19時点の引き継ぎ資料。新しい予想ロジックの採用依頼ではない。
