(()=>{'use strict';
const $=id=>document.getElementById(id);
const TERMS=[
['基礎確率','このアプリの本線。過去データで較正した勝率・連対率・複勝率。M3やRPCI適性より優先して見る。','main'],
['勝率 / 連対率 / 複勝率','勝率＝1着、連対率＝2着以内、複勝率＝3着以内に入る推定確率。','main'],
['市場勝率','単勝オッズから逆算した市場側の勝つ見込み。モデル勝率とのズレを見るための比較値。','main'],
['EV（期待値）','モデル勝率×単勝オッズ。1.00が損益分岐の目安。高ければ必ず当たる、という意味ではない。','main'],
['M3末脚順位','残600m地点からゴールまで「どれだけ伸びそうか」の順位。最終予想順位・勝率順位ではない。','main'],
['M4','M3を、RPCIの4つの展開シナリオごとに見た what-if。展開別の届き方を見る参考表示。','main'],
['RPCI','レース全体の前後半バランスを表す指数。低いほど前半が速く、高いほど後半寄り・スロー寄り。','pace'],
['PCI','各馬がそのレースでどんなペース配分で走ったかを見る指数。RPCIとの差も末脚傾向の参考に使う。','pace'],
['RPCI適性一致 β','今回想定されるRPCI帯に近い流れで、過去に好走した経験があるかを見る補助評価。確率は上書きしない。','pace'],
['残600m差','残り600m地点で先頭から何秒くらい後ろにいそうか、という予測。小さいほど前にいる想定。','pace'],
['追い上げ力','残600mからゴールまで、前との差をどれだけ詰められそうかの推定。プラスが大きいほど追い上げ方向。','pace'],
['ゴール指数','M3で使う「残600m差−追い上げ力」のスコア。小さいほど末脚順位では上。能力の総合点ではない。','pace'],
['先行力','過去に前の位置を取りやすかった傾向。絶対的なスピード能力そのものではない。','pace'],
['追走力','道中で前との距離を保ちやすいかを見る指標。先行力とは別。','pace'],
['ペース耐性','今回想定される流れと、過去に経験した流れの相性。','pace'],
['位置取り相性','今回の枠・隊列・コースで、想定位置に収まりやすいかを見る補助評価。','pace'],
['β（ベータ）','有望な傾向はあるが、まだ本体の確率へ入れていない研究中の補助指標。','stats'],
['OOS','Out-of-Sample。モデル作成に使っていない年で試した検証。未知データで通用するかを見る。','stats'],
['90%予測レンジ','RPCIが入りそうな範囲。個別レースが90%当たるという意味ではなく、検証上の予測集合。','stats'],
['Split Conformal','90%予測レンジの幅を決める較正方法。難しい名前だが「予測範囲を広すぎず狭すぎず調整する仕組み」と覚えればOK。','stats'],
['Neff','人気やシナリオの分散度を「実質何頭・何通りに割れているか」で表した値。大きいほど分散。','stats'],
['MCI','単勝オッズの偏り方・割れ方をまとめた市場構造指数。馬の能力指数ではない。','stats'],
['モデル間の食い違い','基礎確率順位とM3末脚順位が大きく違う状態。どちらかが間違いという意味ではなく、見ている要素が違う。','stats']
];
const groups={main:['まずこれだけ','買い判断で先に見る言葉'],pace:['展開・末脚','隊列やペースを読む言葉'],stats:['統計・検証','信頼度を確認する言葉']};
function section(k){const [title,sub]=groups[k],rows=TERMS.filter(x=>x[2]===k);return `<section class="tgSection"><div class="tgSectionHead"><b>${title}</b><span>${sub}</span></div>${rows.map(x=>`<div class="tgRow"><dt>${x[0]}</dt><dd>${x[1]}</dd></div>`).join('')}</section>`}
function ensure(){const result=$('result');if(!result)return;let card=$('termGuideCard');if(card)return card;card=document.createElement('div');card.id='termGuideCard';card.className='card tgCard';card.innerHTML=`<details id="termGuideDetails"><summary><span>📘 用語ガイド</span><small>専門用語をかんたんに確認</small><em>開く</em></summary><div class="tgIntro">迷ったら、まず <b>基礎確率 → M3末脚 → RPCI適性 → オッズ</b> の順で見ればOKです。</div><div class="tgGrid">${section('main')}${section('pace')}${section('stats')}</div></details>`;result.appendChild(card);const d=$('termGuideDetails');d?.addEventListener('toggle',()=>{const e=card.querySelector('summary em');if(e)e.textContent=d.open?'閉じる':'開く'});return card}
function addJump(){const result=$('result');if(!result||$('termGuideJump'))return;const first=$('finalDecisionCard')||result.firstElementChild;if(!first)return;const b=document.createElement('button');b.id='termGuideJump';b.type='button';b.textContent='？ 用語ガイド';b.addEventListener('click',()=>{const card=ensure(),d=$('termGuideDetails');if(d)d.open=true;card?.scrollIntoView({behavior:'smooth',block:'start'})});first.insertAdjacentElement('beforebegin',b)}
function run(){ensure();addJump()}
const css=document.createElement('style');css.textContent=`#termGuideJump{display:block;margin:8px 0 2px auto;border:1px solid #31596b;background:#0b2636;color:#a8ccdb;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:850}.tgCard{margin-top:12px;border:1px solid #2b5366;background:#081b27}.tgCard summary{list-style:none;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;cursor:pointer}.tgCard summary::-webkit-details-marker{display:none}.tgCard summary span{font-size:13px;font-weight:900}.tgCard summary small{font-size:8px;color:#7899a8}.tgCard summary em{font-style:normal;font-size:8px;color:#9ec4d4;border:1px solid #355a6c;border-radius:999px;padding:3px 6px}.tgIntro{margin-top:9px;padding:8px 9px;border-radius:9px;background:#0c2938;color:#9dbac7;font-size:9px;line-height:1.55}.tgIntro b{color:#e7f6fb}.tgGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.tgSection{background:#0a2230;border:1px solid #244858;border-radius:10px;padding:8px}.tgSectionHead{margin-bottom:6px}.tgSectionHead b{display:block;font-size:10px;color:#e4f4fa}.tgSectionHead span{display:block;font-size:7px;color:#71909e;margin-top:2px}.tgRow{display:grid;grid-template-columns:minmax(75px,.85fr) minmax(0,2fr);gap:6px;padding:6px 0;border-top:1px solid #163746}.tgRow:first-of-type{border-top:0}.tgRow dt{font-size:8px;font-weight:900;color:#a9d8e8}.tgRow dd{margin:0;font-size:8px;color:#8da9b6;line-height:1.5}@media(max-width:700px){.tgGrid{grid-template-columns:1fr}.tgRow{grid-template-columns:90px minmax(0,1fr)}}`;document.head.appendChild(css);['final-decision-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,run));if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();})();