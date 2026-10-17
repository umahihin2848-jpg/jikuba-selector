(()=>{'use strict';
const BUILD='20261017a3';
const $=id=>document.getElementById(id);
let lastSanitize={qDropped:0,wDropped:0,qNormalized:0,wNormalized:0};

function normalizeText(v){return String(v||'').normalize('NFKC').replace(/[−–—―ー]/g,'-').replace(/[，、]/g,',')}
function validHorseSet(){
  try{const o=window.ShapeCore?.parseOdds?.($('oddsPaste')?.value||'')?.odds||{};return new Set(Object.keys(o).map(Number).filter(Number.isFinite))}catch(e){return new Set()}
}
function parseLine(line){
  const s=normalizeText(line).trim();if(!s)return null;
  const pair=s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if(pair){
    const a=Number(pair[1]),b=Number(pair[2]);
    const rest=s.slice((pair.index||0)+pair[0].length);
    const vals=(rest.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
    if(!vals.length)return null;
    return{a,b,odds:vals[0],extra:vals.slice(1)};
  }
  const vals=(s.replace(/,/g,' ').match(/\d+(?:\.\d+)?/g)||[]).map(Number);
  if(vals.length<3)return null;
  return{a:vals[0],b:vals[1],odds:vals[2],extra:vals.slice(3)};
}
function sanitize(text,valid){
  const rows=new Map();let dropped=0,normalized=0;
  for(const raw of String(text||'').split(/\r?\n/)){
    if(!raw.trim())continue;
    const p=parseLine(raw);if(!p){dropped++;continue}
    let a=Math.trunc(p.a),b=Math.trunc(p.b);const od=Number(p.odds);
    if(a>b)[a,b]=[b,a];
    if(a===b||a<1||b<1||!(od>0)||(valid.size&&(!valid.has(a)||!valid.has(b)))){dropped++;continue}
    const extra=p.extra.filter(Number.isFinite);
    rows.set(`${a}-${b}`,`${a}-${b} ${od}${extra.length?' '+extra.join(' '):''}`);
    if(normalizeText(raw).trim()!==rows.get(`${a}-${b}`))normalized++;
  }
  return{text:[...rows.values()].join('\n'),dropped,normalized};
}
function sanitizeInputs(){
  const valid=validHorseSet(),q=$('qmdQuinellaPaste'),w=$('qmdWidePaste');
  if(q){const r=sanitize(q.value,valid);q.value=r.text;lastSanitize.qDropped=r.dropped;lastSanitize.qNormalized=r.normalized}
  if(w){const r=sanitize(w.value,valid);w.value=r.text;lastSanitize.wDropped=r.dropped;lastSanitize.wNormalized=r.normalized}
}
function markBuild(){window.RSA_BUILD=BUILD;document.documentElement.dataset.rsaBuild=BUILD;document.body?.setAttribute('data-build',BUILD)}
function enhanceInputCard(){
  const card=$('marketMispricingInputCard');if(!card||card.dataset.a3ui)return;card.dataset.a3ui='1';
  const q=$('qmdQuinellaPaste'),w=$('qmdWidePaste');
  [q,w].forEach(x=>{if(!x)return;x.setAttribute('autocapitalize','off');x.setAttribute('autocomplete','off');x.spellcheck=false});
  const grid=card.querySelector('.mmGrid');
  if(grid&&!grid.querySelector('.mmQuickGuide')){
    const guide=document.createElement('div');guide.className='mmQuickGuide';guide.innerHTML='<span>気になる組だけ → 近似QMD</span><span>全組 → 正規化QMD</span>';
    grid.insertAdjacentElement('beforebegin',guide);
  }
  if(w){
    const field=w.closest('.field');
    if(field&&!field.closest('#mmWideDetails')){
      const det=document.createElement('details');det.id='mmWideDetails';det.className='mmWideDetails';
      const sum=document.createElement('summary');sum.innerHTML='<b>ワイドオッズ（任意）</b><span>Top3 Edgeを使うときだけ</span>';
      field.parentNode.insertBefore(det,field);det.appendChild(sum);det.appendChild(field);
      field.querySelector('label')?.remove();
    }
  }
  const qTiny=q?.closest('.field')?.querySelector('.tiny');if(qTiny)qTiny.textContent='部分入力でもOK。全組が揃うと自動で正規化QMDへ切り替わります。';
  if(!$('mmPatchStyle')){const st=document.createElement('style');st.id='mmPatchStyle';st.textContent=`
    .mmQuickGuide{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0 7px}.mmQuickGuide span{border:1px solid #31516c;border-radius:999px;padding:4px 8px;font-size:9px;color:#b9cfdd;background:#081827}
    .mmWideDetails{grid-column:1/-1;border:1px solid #29445f;border-radius:11px;background:#071725;padding:0 9px}.mmWideDetails>summary{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;color:#e9f3f8;font-size:11px}.mmWideDetails>summary span{color:#819bad;font-size:9px;font-weight:400}.mmWideDetails>.field{padding:0 0 9px}
    .mmSummaryGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.mmSummaryCard{border:1px solid #29445f;background:#081827;border-radius:12px;padding:9px}.mmSummaryLabel{font-size:9px;color:#88a3b5;margin-bottom:5px}.mmSummaryMain{font-size:13px;font-weight:800;color:#eef7fb}.mmSummaryEdge{font-size:18px;font-weight:900;margin-top:3px}.mmSummaryEdge.pos{color:#bfe7d4}.mmSummaryEdge.neg{color:#efc5cb}.mmSummaryMeta{font-size:9px;color:#89a3b4;line-height:1.45;margin-top:5px}.mmEvidence{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.mmEvidence span{border:1px solid #405b70;border-radius:999px;padding:3px 6px;font-size:8px;color:#a9bfce}.mmEvidence .strong{border-color:#5d7040;color:#dceab9}.mmDetailDisclosure{margin-top:10px;border-top:1px solid #20394e}.mmDetailDisclosure>summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#9eb5c5;font-size:10px}.mmSanitizeNote{margin-top:6px;color:#8da6b7;font-size:9px}
    #marketMispricingInputCard textarea{font-size:16px;line-height:1.45}.mmGrid{grid-template-columns:1fr}.mmGrid>.field:first-child textarea{min-height:108px}
    @media(max-width:560px){.mmSummaryGrid{grid-template-columns:1fr}.mmSummaryCard{padding:9px 10px}.mmSummaryMain{font-size:12px}.mmSummaryEdge{font-size:17px}.mmGrid textarea{min-height:88px}.mmQuickGuide{margin-top:8px}}
  `;document.head.appendChild(st)}
}
function evidenceForQmd(state,row){
  const out=[],n=state?.winMarket?.field||0,rank=row?.marketRank;
  if(n>=14)out.push(['14頭以上：検証強め','strong']);else if(n>=12)out.push(['12〜13頭：証拠限定','']);
  if(Number.isFinite(rank)){if(rank<=30)out.push(['馬連1〜30人気：検証強め','strong']);else if(rank<=60)out.push(['馬連31〜60人気：弱め','']);else out.push(['馬連61人気以下：証拠限定',''])}
  return out;
}
function card(label,main,edge,meta,evidence=[]){return `<div class="mmSummaryCard"><div class="mmSummaryLabel">${label}</div><div class="mmSummaryMain">${main}</div><div class="mmSummaryEdge ${edge>=0?'pos':'neg'}">${Number.isFinite(edge)?`${edge>=0?'+':''}${(edge*100).toFixed(1)}%`:'—'}</div><div class="mmSummaryMeta">${meta}</div>${evidence.length?`<div class="mmEvidence">${evidence.map(([t,c])=>`<span class="${c||''}">${t}</span>`).join('')}</div>`:''}</div>`}
function renderCompact(state){
  const result=$('marketMispricingResultCard');if(!result||!state)return;
  let box=$('mmCompactSummary');if(!box){box=document.createElement('div');box.id='mmCompactSummary';box.style.marginTop='9px';result.querySelector('.sectionTitle')?.insertAdjacentElement('afterend',box)}
  const hs=[...(state.horseEdges||[])];
  const win=hs.filter(h=>Number.isFinite(h.winEdge)).sort((a,b)=>b.winEdge-a.winEdge)[0];
  const top3=hs.filter(h=>Number.isFinite(h.top3Edge)).sort((a,b)=>b.top3Edge-a.top3Edge)[0];
  const qr=state.qmd?.rows?.[0];
  const items=[];
  if(win)items.push(card('Win Edge 上位',`${win.no}番 ${win.name||''}`,win.winEdge-1,`単勝市場比 ×${win.winEdge.toFixed(3)}。Condition Edgeのみ。`));
  else items.push(card('Win Edge','TARGET CSV待ち',NaN,'距離変化・年齢・性別×季節を使います。'));
  if(top3)items.push(card('Top3 Edge 上位',`${top3.no}番 ${top3.name||''}`,top3.top3Edge-1,`ワイド市場比 ×${top3.top3Edge.toFixed(3)}。全ワイド入力時のみ。`));
  else items.push(card('Top3 Edge','全ワイド待ち',NaN,'任意入力。使わない場合は空欄で問題ありません。'));
  if(qr)items.push(card(state.qmd.mode==='exact'?'QMD 上位・正規化':'QMD 上位・近似',`${qr.a}-${qr.b}　馬連 ${qr.odds.toFixed(1)}倍`,qr.R-1,state.qmd.mode==='exact'?'全馬連を正規化。':'部分入力の中で比較。払戻率77.5%近似。',evidenceForQmd(state,qr)));
  else items.push(card('QMD','馬連オッズ待ち',NaN,'気になる組だけでも計算できます。'));
  box.innerHTML=`<div class="mmSummaryGrid">${items.join('')}</div>`;
  let det=$('mmDetailDisclosure');
  if(!det){
    const hb=$('mmHorseBlock'),qb=$('mmQmdBlock');if(hb&&qb){det=document.createElement('details');det.id='mmDetailDisclosure';det.className='mmDetailDisclosure';const sm=document.createElement('summary');sm.textContent='全データを見る';hb.parentNode.insertBefore(det,hb);det.appendChild(sm);det.appendChild(hb);det.appendChild(qb)}
  }
  const totalDropped=lastSanitize.qDropped+lastSanitize.wDropped,totalNorm=lastSanitize.qNormalized+lastSanitize.wNormalized;
  let note=$('mmSanitizeNote');if(!note&&$('qmdInputInfo')){note=document.createElement('div');note.id='mmSanitizeNote';note.className='mmSanitizeNote';$('qmdInputInfo').insertAdjacentElement('afterend',note)}
  if(note)note.textContent=totalDropped?`入力点検：範囲外・読取不能 ${totalDropped}行を除外しました。`:totalNorm?`入力点検：${totalNorm}行をiPhone貼り付け向け形式に自動整形しました。`:'入力点検：形式OK';
}
function setup(){
  markBuild();enhanceInputCard();
  document.addEventListener('click',e=>{if(['qmdCalcBtn','analyzeBtn'].includes(e.target?.id))sanitizeInputs()},true);
  addEventListener('market-mispricing-ready',e=>{markBuild();enhanceInputCard();renderCompact(e.detail||window.MarketMispricingState)});
  if(window.MarketMispricingState?.ready)renderCompact(window.MarketMispricingState);
}
addEventListener('rsa-addons-ready',setup,{once:true});
if(document.readyState!=='loading')setTimeout(()=>{if($('marketMispricingInputCard'))setup()},80);
})();
