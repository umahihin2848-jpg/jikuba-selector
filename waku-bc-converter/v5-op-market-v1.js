(()=>{
'use strict';

const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

let MODEL=null;

function pick(field){
  if(field<=10)return MODEL?.bands?.le10;
  if(field<=15)return MODEL?.bands?.['11_15'];
  return MODEL?.bands?.ge16;
}

function opWave(field,b){
  const rate=Number(b.oos_rate);
  const pct=Math.round(rate*1000)/10;
  const lo=Math.round(Number(b.oos_ci95_wilson?.[0])*1000)/10;
  const hi=Math.round(Number(b.oos_ci95_wilson?.[1])*1000)/10;
  const range=field<=10?'10頭以下':field<=15?'11〜15頭':'16頭以上';
  return {
    supported:true,
    level:String(b.level||'standard'),
    label:String(b.label||'標準'),
    action:String(b.action||'中立'),
    score:rate,
    modelType:'op-field-size-oos',
    eventRate:rate,
    oosN:Number(b.oos_n),
    trainRate:Number(b.train_rate),
    trainN:Number(b.train_n),
    fieldSize:field,
    band:range,
    reason:`OP専用・${range}｜2024〜26 OOS実測 ${pct}%（${b.oos_n}R）｜95%CI ${lo}〜${hi}%`
  };
}

function injectResult(field,b){
  const res=window.V4AppState?.state?.results;
  if(!res)return null;
  const w=opWave(field,b);
  const old=res.wave;
  if(!old||old.modelType!=='op-field-size-oos'||Number(old.fieldSize)!==field){
    res.wave=w;
  }
  window.V5OPMarketState={
    ready:true,
    version:MODEL.version,
    wave:w,
    validation:{
      scope:MODEL.scope,
      outcome:MODEL.outcome,
      development:MODEL.development,
      oos_tests:MODEL.oos_tests,
      band:b
    }
  };
  return w;
}

function patch(){
  if(!MODEL)return;
  if(String($('grade')?.value||'')!=='OP')return;

  const field=Number($('fieldSize')?.value);
  if(!Number.isFinite(field))return;
  const b=pick(field);
  if(!b)return;

  injectResult(field,b);

  const panel=$('v5Panel');
  if(!panel)return;
  const head=[...panel.querySelectorAll('.v5CardHead')].find(x=>(x.querySelector('small')?.textContent||'').trim()==='MARKET STRUCTURE');
  if(!head)return;
  const card=head.closest('.v5Card');
  if(!card)return;

  const rate=Number(b.oos_rate);
  const pct=Math.round(rate*1000)/10;
  const train=Math.round(Number(b.train_rate)*1000)/10;
  const lo=Math.round(Number(b.oos_ci95_wilson?.[0])*1000)/10;
  const hi=Math.round(Number(b.oos_ci95_wilson?.[1])*1000)/10;
  const range=field<=10?'10頭以下':field<=15?'11〜15頭':'16頭以上';
  const sig=[field,b.oos_n,pct].join('|');
  if(card.dataset.opMarket===sig)return;

  card.dataset.opMarket=sig;
  card.classList.add('v5OpMarketCard');
  card.innerHTML=`
    <div class="v5CardHead">
      <div><small>MARKET STRUCTURE</small><h3>市場構造</h3></div>
      <span>OP専用・OOS実測</span>
    </div>
    <div class="v5Gauge">
      <div>
        <div class="v5GaugeRing" style="--v:${pct}">
          <div class="v5GaugeValue">
            <strong>${pct.toFixed(1)}%</strong>
            <small>OOS EMPIRICAL RATE</small>
          </div>
        </div>
        <div class="v5GaugeCaption">${E(b.label)}</div>
      </div>
    </div>
    <div class="v5MetricChips">
      <span class="v5Chip">${E(range)}</span>
      <span class="v5Chip">2024〜26 OOS ${b.oos_n}R</span>
      <span class="v5Chip">学習期 ${train.toFixed(1)}%</span>
    </div>
    <div class="v5OpMarketNote">
      7番人気以下が3着以内に1頭以上入った<strong>同頭数帯での実測頻度</strong>です。個別レースの発生確率ではなく、勝率・M3・RPCIの補正には使いません。<br>
      <small>95%CI ${lo.toFixed(1)}〜${hi.toFixed(1)}%</small>
    </div>`;
}

const css=document.createElement('style');
css.textContent=`
.v5OpMarketCard .v5GaugeValue strong{font-size:clamp(34px,10vw,52px)}
.v5OpMarketCard .v5GaugeValue small{letter-spacing:.08em}
.v5OpMarketNote{margin-top:14px;border-top:1px solid rgba(86,169,255,.18);padding-top:12px;color:#91a9bd;font-size:12px;line-height:1.7}
.v5OpMarketNote strong{color:#d8e9f7}
.v5OpMarketNote small{color:#6f8da7}
`;
document.head.appendChild(css);

const obs=new MutationObserver(()=>setTimeout(patch,0));
if($('v5Panel'))obs.observe($('v5Panel'),{childList:true,subtree:true});
['grade','fieldSize'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(patch,80)));
document.addEventListener('click',e=>{
  if(e.target.closest('[data-v5-tab="overview"]'))setTimeout(patch,50);
});

fetch('data/op_market_structure_v1.json',{cache:'no-store'})
  .then(r=>{
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(x=>{
    MODEL=x;
    patch();
    setInterval(patch,700);
  })
  .catch(e=>console.warn('v5 op market',e));
})();