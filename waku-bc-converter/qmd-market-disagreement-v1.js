(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,d=1)=>Number.isFinite(x)?Number(x).toFixed(d):'—';
const pct=x=>Number.isFinite(x)?`${x>=0?'+':''}${(x*100).toFixed(1)}%`:'—';
const STATE={ready:false,version:'qmd-v1',pairs:[],winCount:0,pairCount:0,expectedPairs:0,top2Concentration:NaN,error:''};
window.QMDMarketState=STATE;

const css=document.createElement('style');
css.textContent=`
.qmdInputCard textarea{min-height:132px;font-variant-numeric:tabular-nums}.qmdHead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.qmdGrid{display:grid;grid-template-columns:1fr;gap:7px;margin-top:9px}.qmdRow{display:grid;grid-template-columns:54px 76px 70px 1fr;gap:7px;align-items:center;padding:8px 9px;border:1px solid rgba(255,255,255,.08);background:#091a26;border-radius:11px}.qmdPair{font-size:15px;font-weight:900}.qmdOdds,.qmdVal{font-variant-numeric:tabular-nums;text-align:right;font-weight:800}.qmdVal.pos{color:#7fe0b2}.qmdVal.neg{color:#ffab9c}.qmdEvidence{font-size:10px;color:#9bb6c5;line-height:1.35}.qmdBadge{display:inline-flex;align-items:center;border:1px solid #2b4b61;border-radius:999px;padding:3px 7px;font-size:9px;color:#b8cfdb;background:#0b2130}.qmdBadge.strong{border-color:#2f7a5d;color:#9be5c1;background:#0b2920}.qmdBadge.limited{border-color:#705d32;color:#e6cd91;background:#2a2312}.qmdLegend{font-size:10px;color:#839faf;line-height:1.55;margin-top:8px}.qmdSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.qmdStat{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px 8px;background:#081827}.qmdStat span{display:block;color:#7f9baa;font-size:9px}.qmdStat b{display:block;font-size:14px;margin-top:2px}@media(max-width:560px){.qmdRow{grid-template-columns:48px 64px 64px 1fr;padding:7px}.qmdSummary{grid-template-columns:1fr 1fr}.qmdEvidence{font-size:9px}}
`;
document.head.appendChild(css);

function parseWin(text){
  const m=new Map();
  String(text||'').split(/\r?\n/).forEach(line=>{
    const nums=line.match(/\d+(?:\.\d+)?/g);if(!nums||nums.length<2)return;
    const no=String(parseInt(nums[0],10)),od=Number(nums[1]);if(no&&Number.isFinite(od)&&od>0)m.set(no,od);
  });
  return m;
}
function parseQuinella(text){
  const m=new Map(),errors=[];
  String(text||'').split(/\r?\n/).forEach((line,ix)=>{
    const s=line.trim();if(!s)return;
    const nums=s.match(/\d+(?:\.\d+)?/g);if(!nums||nums.length<3){errors.push(`${ix+1}行目`);return}
    let a=parseInt(nums[0],10),b=parseInt(nums[1],10),od=Number(nums[2]);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||!(od>0)){errors.push(`${ix+1}行目`);return}
    if(a>b)[a,b]=[b,a];m.set(`${a}-${b}`,od);
  });
  return {map:m,errors};
}
function ensureInput(){
  if($('qmdQuinellaPaste'))return;
  const odds=$('oddsPaste'),base=odds?.closest('section.card');if(!base)return;
  const card=document.createElement('section');card.className='card qmdInputCard';card.id='qmdInputCard';
  card.innerHTML=`<div class="qmdHead"><div><h2>3B. 馬連オッズ — QMD</h2><div class="muted">単勝市場と馬連市場の評価差を比較します。買い判定ではありません。</div></div><span class="qmdBadge">QMD v1</span></div><textarea id="qmdQuinellaPaste" placeholder="1-2 8.5&#10;1-3 12.4&#10;1-4 18.0&#10;2-3 9.6"></textarea><div class="actions" style="margin-top:8px"><button id="qmdApplyBtn">馬連を反映</button><button id="qmdClearBtn" class="ghost">消去</button></div><div id="qmdInputInfo" class="tiny" style="margin-top:7px">全組み合わせを入力するとQMDを計算できます。形式：1-2 8.5 または 1 2 8.5</div>`;
  base.insertAdjacentElement('afterend',card);
  $('qmdApplyBtn').addEventListener('click',()=>{computeAndRender(true)});
  $('qmdClearBtn').addEventListener('click',()=>{$('qmdQuinellaPaste').value='';$('qmdInputInfo').textContent='馬連オッズを消去しました。';resetOutput('馬連オッズを入力すると表示します。')});
}
function ensureOutput(){
  if($('qmdOutput'))return;
  const market=$('marketSection');if(!market)return;
  const box=document.createElement('div');box.id='qmdOutput';box.style.marginTop='12px';
  box.innerHTML='<div class="qmdHead"><div><h3 style="margin:0">QMD｜単勝市場 × 馬連市場</h3><div class="muted">市場同士のズレだけを表示。M3・P10・Ability等とは合算しません。</div></div><span id="qmdStateBadge" class="qmdBadge">未計算</span></div><div id="qmdBody" class="qmdLegend">馬連オッズを入力すると表示します。</div>';
  market.appendChild(box);
}
function expectedPairCount(n){return n*(n-1)/2}
function gradeStrong(g){return String(g||'').trim()==='3勝'}
function evidence(meta,pairRank){
  const strong=[];const weak=[];
  if(meta.top2Concentration>=.5)strong.push('上位2頭集中≥50%');
  if(pairRank<=30)strong.push('馬連1〜30位');
  else if(pairRank<=60&&pairRank>=31)weak.push('馬連31〜60位');
  if(meta.fieldSize>=14)strong.push('14頭以上');
  else if(meta.fieldSize>=12&&meta.fieldSize<=13)weak.push('12〜13頭');
  if(gradeStrong(meta.grade))strong.push('3勝');
  let label='標準',cls='';
  if(weak.length)label='限定的',cls='limited';
  else if(strong.length>=2)label='高',cls='strong';
  return {label,cls,strong,weak};
}
function compute(){
  const wins=parseWin($('oddsPaste')?.value||'');
  const pq=parseQuinella($('qmdQuinellaPaste')?.value||'');
  const winNos=[...wins.keys()].sort((a,b)=>Number(a)-Number(b));
  const expected=expectedPairCount(winNos.length);
  const validPairs=[];
  for(let i=0;i<winNos.length;i++)for(let j=i+1;j<winNos.length;j++){
    const a=Number(winNos[i]),b=Number(winNos[j]),key=`${Math.min(a,b)}-${Math.max(a,b)}`;
    if(pq.map.has(key))validPairs.push([String(a),String(b),pq.map.get(key),key]);
  }
  if(winNos.length<3){return {ok:false,msg:'単勝オッズを3頭以上入力してください。',wins,pq,expected,validPairs}}
  if(validPairs.length!==expected){return {ok:false,msg:`馬連オッズが不足しています：${validPairs.length}/${expected}組。QMDは全組合せ入力時のみ計算します。`,wins,pq,expected,validPairs}}
  const invWins=winNos.map(no=>[no,1/wins.get(no)]),sumWin=invWins.reduce((s,x)=>s+x[1],0),p=Object.fromEntries(invWins.map(([no,v])=>[no,v/sumWin]));
  const top2=[...Object.values(p)].sort((a,b)=>b-a).slice(0,2).reduce((s,v)=>s+v,0);
  let sumQm=0;for(const [, ,od] of validPairs)sumQm+=1/od;
  const rows=validPairs.map(([a,b,od,key])=>{
    const pa=p[a],pb=p[b];
    const qSingle=pa*pb/(1-pa)+pb*pa/(1-pb);
    const qMarket=(1/od)/sumQm;
    const ratio=qSingle/qMarket;
    return {a,b,key,od,qSingle,qMarket,ratio,qmd:ratio-1};
  });
  const byOdds=[...rows].sort((x,y)=>x.od-y.od);byOdds.forEach((x,i)=>x.rank=i+1);
  const meta={top2Concentration:top2,fieldSize:Number($('fieldSize')?.value)||winNos.length,grade:$('grade')?.value||''};
  rows.forEach(x=>x.evidence=evidence(meta,x.rank));
  rows.sort((x,y)=>y.qmd-x.qmd||x.rank-y.rank);
  return {ok:true,wins,pq,expected,rows,meta};
}
function resetOutput(msg){
  ensureOutput();const b=$('qmdBody'),s=$('qmdStateBadge');if(b)b.innerHTML=`<div class="notice yellow">${esc(msg)}</div>`;if(s){s.textContent='未計算';s.className='qmdBadge'}
  Object.assign(STATE,{ready:false,pairs:[],error:msg});
}
function renderResult(r){
  ensureOutput();const b=$('qmdBody'),s=$('qmdStateBadge');if(!b||!s)return;
  if(!r.ok){resetOutput(r.msg);return}
  const pos=r.rows.filter(x=>x.qmd>0),neg=r.rows.filter(x=>x.qmd<0),top=r.rows.slice(0,20);
  const evidenceText=e=>{const bits=[];if(e.strong.length)bits.push(`強め:${e.strong.join('・')}`);if(e.weak.length)bits.push(`弱め:${e.weak.join('・')}`);if(!bits.length)bits.push('通常条件');return bits.join(' / ')};
  b.innerHTML=`<div class="qmdSummary"><div class="qmdStat"><span>単勝上位2頭シェア</span><b>${fmt(r.meta.top2Concentration*100,1)}%</b></div><div class="qmdStat"><span>QMDプラス</span><b>${pos.length}組</b></div><div class="qmdStat"><span>QMDマイナス</span><b>${neg.length}組</b></div></div><div class="qmdLegend"><b>読み方：</b>QMD +10%なら、単勝市場から作る1・2着確率が馬連市場より約10%高いという意味です。<b>EV・購入推奨ではありません。</b><br>証拠強度は過去のQMD再現性の文脈表示だけで、QMD値自体は変更していません。</div><div class="qmdGrid">${top.map(x=>`<div class="qmdRow"><div class="qmdPair">${esc(x.a)}-${esc(x.b)}</div><div class="qmdOdds">${fmt(x.od,1)}倍</div><div class="qmdVal ${x.qmd>=0?'pos':'neg'}">${pct(x.qmd)}</div><div class="qmdEvidence"><span class="qmdBadge ${x.evidence.cls}">証拠 ${esc(x.evidence.label)}</span><br>馬連${x.rank}位｜${esc(evidenceText(x.evidence))}</div></div>`).join('')}</div>${r.rows.length>20?`<div class="qmdLegend">QMD上位20組を表示（全${r.rows.length}組）。購入点数を自動決定する機能ではありません。</div>`:''}`;
  s.textContent=`計算済 ${r.rows.length}組`;s.className='qmdBadge strong';
  Object.assign(STATE,{ready:true,pairs:r.rows,winCount:r.wins.size,pairCount:r.rows.length,expectedPairs:r.expected,top2Concentration:r.meta.top2Concentration,error:''});
  window.dispatchEvent(new CustomEvent('qmd-ready',{detail:STATE}));
}
function computeAndRender(scroll){
  ensureInput();ensureOutput();const r=compute();const info=$('qmdInputInfo');
  if(info){if(r.ok)info.innerHTML=`<span class="ok">馬連 ${r.rows.length}/${r.expected}組を反映。QMD計算可能です。</span>`;else info.innerHTML=`<span class="bad">${esc(r.msg)}</span>`}
  renderResult(r);
  if(scroll&&r.ok)$('qmdOutput')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function schedule(){setTimeout(()=>computeAndRender(false),180);setTimeout(()=>computeAndRender(false),700)}
function boot(){ensureInput();ensureOutput();$('analyzeBtn')?.addEventListener('click',schedule);$('applyOddsBtn')?.addEventListener('click',()=>setTimeout(()=>computeAndRender(false),80));window.addEventListener('rsa-addons-ready',schedule);window.addEventListener('calibrated-probability-ready',schedule)}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();