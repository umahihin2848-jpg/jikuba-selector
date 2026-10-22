(()=>{'use strict';
if(window.__TRIO_FORWARD_EASY_INPUT_V1)return;window.__TRIO_FORWARD_EASY_INPUT_V1=true;
const V='trio-forward-easy-input-v1.0',KEY='trioForwardDecompositionV1';
const $=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let readySince=0,lastSig='';
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function save(a){localStorage.setItem(KEY,JSON.stringify(a.slice(-1000)))}
function parseTop3(raw,field){
  const s=String(raw||'').normalize('NFKC').replace(/\r?\n/g,' ');
  let m=s.match(/1\s*着\D{0,12}(\d{1,2}).*?2\s*着\D{0,12}(\d{1,2}).*?3\s*着\D{0,12}(\d{1,2})/s),nums;
  if(m)nums=m.slice(1,4).map(Number);else nums=(s.match(/\d{1,2}/g)||[]).slice(0,3).map(Number);
  if(nums.length!==3||new Set(nums).size!==3||nums.some(n=>n<1||n>Number(field||18)))return null;
  return nums;
}
function applyResult(rec,nums){
  const top3=nums.map(String),pairNos=[String(rec.pair.axis.no),String(rec.pair.partner.no)],pairSuccess=pairNos.every(n=>top3.includes(n)),third=pairSuccess?(top3.find(n=>!pairNos.includes(n))||null):null,prod=pairSuccess?Boolean(third&&(rec.productionThird||[]).map(String).includes(String(third))):null,adaptive=pairSuccess&&Array.isArray(rec.adaptiveThird)&&rec.adaptiveThird.length?Boolean(third&&rec.adaptiveThird.map(String).includes(String(third))):null;
  rec.result={top3,recordedAt:new Date().toISOString(),pairSuccess,thirdHorse:third,productionThirdCapture:prod,adaptiveThirdCapture:adaptive,productionTrioCapture:Boolean(pairSuccess&&prod),adaptiveTrioCapture:adaptive===null?null:Boolean(pairSuccess&&adaptive),inputMode:'easy_one_line'};
}
function refreshTracker(){const x=$('raceName');if(x)x.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(render,40)}
function recordFromText(text){const all=load(),sel=$('tfeiPending'),id=String(sel?.value||''),rec=all.find(r=>r.id===id);if(!rec)return show('未入力レースを選んでください','bad');const nums=parseTop3(text,rec.meta?.field);if(!nums)return show('「7-3-12」のように1〜3着馬番を3つ入力してください','bad');applyResult(rec,nums);save(all);const inp=$('tfeiQuick');if(inp)inp.value='';show(`${rec.meta.date} ${rec.meta.name||rec.meta.venue}｜${nums.join('-')} を記録しました`,'ok');refreshTracker()}
function show(msg,cls=''){const x=$('tfeiMsg');if(x){x.textContent=msg;x.className=`tfeiMsg ${cls}`}}
async function clipboardRecord(){try{const t=await navigator.clipboard.readText();if($('tfeiQuick'))$('tfeiQuick').value=t;recordFromText(t)}catch{show('クリップボードを読めませんでした。入力欄へ貼り付けてください','bad')}}
function pending(){return load().filter(r=>!r.result).sort((a,b)=>String(b.lockedAt||'').localeCompare(String(a.lockedAt||'')))}
function ensure(){const root=$('trioForwardDecomposition');if(!root)return null;let box=$('trioForwardEasyInput');if(box)return box;box=document.createElement('div');box.id='trioForwardEasyInput';const a=root.querySelector('.tfdActions');(a||root).insertAdjacentElement(a?'beforebegin':'beforeend',box);return box}
function render(){
  const box=ensure();if(!box)return;const p=pending(),sig=p.map(r=>`${r.id}:${r.result?'1':'0'}`).join('|');if(sig===lastSig&&box.querySelector('select'))return;lastSig=sig;
  box.innerHTML=`<div class="tfeiHead"><b>かんたん結果入力</b><span>PASSは自動固定 ON</span></div><div class="tfeiLead">未入力レースを選び、着順を <b>7-3-12</b> のように1行で入れるだけです。コピー済みなら「貼付→記録」で完了します。</div>${p.length?`<div class="tfeiForm"><select id="tfeiPending">${p.map(r=>`<option value="${E(r.id)}">${E(r.meta.date)}｜${E(r.meta.venue)}｜${E(r.meta.name||'名称なし')}｜Pair ${E(r.pair.key)}</option>`).join('')}</select><input id="tfeiQuick" inputmode="numeric" autocomplete="off" placeholder="例 7-3-12"><button id="tfeiRecord">記録</button><button id="tfeiClipboard">貼付→記録</button></div>`:`<div class="tfeiEmpty">未入力のForwardレースはありません。</div>`}<div id="tfeiMsg" class="tfeiMsg"></div>`;
  $('tfeiRecord')?.addEventListener('click',()=>recordFromText($('tfeiQuick')?.value||''));
  $('tfeiClipboard')?.addEventListener('click',clipboardRecord);
  $('tfeiQuick')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();recordFromText(e.currentTarget.value)}});
}
function autoLock(){
  const b=$('tfdLock');if(!b||b.disabled){readySince=0;return}
  if(!readySince)readySince=Date.now();
  if(window.TrioThirdRowState?.ready||Date.now()-readySince>=1500){b.click();readySince=0;setTimeout(()=>{lastSig='';render()},80)}
}
const css=document.createElement('style');css.textContent=`#trioForwardEasyInput{margin-top:8px;border:1px solid #31566a;background:#0b202c;border-radius:10px;padding:8px}.tfeiHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.tfeiHead b{font-size:10px;color:#eef8fb}.tfeiHead span{font-size:7px;color:#a8dfc4;border:1px solid #3e6b5a;border-radius:999px;padding:3px 6px}.tfeiLead,.tfeiEmpty,.tfeiMsg{font-size:8px;color:#8da8b5;line-height:1.5;margin-top:5px}.tfeiLead b{color:#dff4fb}.tfeiForm{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(90px,.7fr) auto auto;gap:5px;margin-top:7px}.tfeiForm select,.tfeiForm input{min-height:38px;font-size:10px}.tfeiForm button{border:1px solid #477487;background:#12384a;color:#eaf7fb;border-radius:8px;padding:7px 9px;font-size:8px;font-weight:800}.tfeiMsg.ok{color:#9be0bd}.tfeiMsg.bad{color:#efaaaa}#trioForwardDecomposition .tfdResult{display:none!important}@media(max-width:620px){.tfeiForm{grid-template-columns:1fr 1fr}.tfeiForm select{grid-column:1/-1}.tfeiForm input{grid-column:1/-1}}`;document.head.appendChild(css);
['trio-third-row-ready','structural-ticket-auto-v2-ready','structural-ticket-exact-pair-ready','longshot-scout-ready','finish600-ready'].forEach(ev=>addEventListener(ev,()=>{setTimeout(autoLock,60);setTimeout(()=>{lastSig='';render()},100)}));
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','wqCheckBtn','wqTop3Btn'].includes(e.target?.id)){setTimeout(autoLock,180);setTimeout(()=>{lastSig='';render()},220)}},true);
setInterval(()=>{autoLock();render()},900);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>{render();setTimeout(autoLock,300)},{once:true});else{render();setTimeout(autoLock,300)}
window.TrioForwardEasyInputState={ready:true,version:V,autoLock:true,oneLineResult:true,clipboardResult:true,at:Date.now()};
})();