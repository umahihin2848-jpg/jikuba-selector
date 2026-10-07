(function(){'use strict';
const $=id=>document.getElementById(id);
function patch(){
  const jp=$('jointPairList')?.closest('.card');
  if(jp){
    const h=jp.querySelector('h2');if(h)h.textContent='⑥ 組み合わせ構造';
    const m=jp.querySelector('.muted');if(m)m.textContent='⑤の10年較正済み連対率・複勝率をレース内で整合化し、1・2着の決着構造（馬連）と3着内の共存構造（ワイド）を見ます。EV・買い判定ではありません。';
  }
  const iv=$('integratedViewList')?.closest('.card');
  if(iv){
    const h=iv.querySelector('h2');if(h)h.textContent='⑦ 馬固有の条件補正｜参考分析';
    const m=iv.querySelector('.muted');if(m)m.textContent='地力・コース・条件替わり・展開適合が、人気だけの評価から今回どちらへ働くかを見る参考分析です。条件込み参考3着内率は最終複勝率・ワイド確率には採用しません。';
    for(const card of iv.querySelectorAll('.horse')){
      const boxes=card.querySelectorAll('.ivProbBox');
      if(boxes[0]){const s=boxes[0].querySelector('span');if(s)s.textContent='条件込み参考3着内率';}
      const notes=card.querySelectorAll('.tiny');
      for(const n of notes){if((n.textContent||'').includes('推定3着内率はモデル確率'))n.textContent=(n.textContent||'').replace('推定3着内率はモデル確率で、馬券の期待値ではありません。','条件込み参考3着内率は条件解釈用のモデル値です。最終複勝率・ワイド確率・馬券EVには採用しません。');}
    }
    const foot=[...iv.querySelectorAll('.tiny')].find(x=>(x.textContent||'').includes('2026未知年'));
    if(foot)foot.textContent='この馬固有モデルは条件の追い風・向かい風を読む補助レイヤーです。2026 OOSで人気だけの簡易基準には改善しましたが、10年較正済み複勝率を直接上回らなかったため、最終確率への置換は不採用です。';
  }
}
function schedule(){setTimeout(patch,120);setTimeout(patch,500);setTimeout(patch,1100);setTimeout(patch,2200);}
window.addEventListener('calibrated-probability-ready',schedule);
window.addEventListener('joint-pair-probability-ready',schedule);
window.addEventListener('ability-opponent-ready',schedule);
window.addEventListener('rsa-addons-ready',schedule);
$('analyzeBtn')?.addEventListener('click',schedule);
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();