(()=>{'use strict';
if(!window.RSAMobileLean||window.__MOBILE_OPPONENT_FIT_V1)return;window.__MOBILE_OPPONENT_FIT_V1=true;
const V='mobile-opponent-fit-v1.0-frame-ability', $=id=>document.getElementById(id), E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer=0,raf=0,last='';
const N=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
function css(){if($('mof1-css'))return;const s=document.createElement('style');s.id='mof1-css';s.textContent=`
/* Wide price is intentionally excluded from opponent analysis. */
#moaRoot .moaLens.price,#moaRoot .moaPriceBox{display:none!important}
.mofFit{margin-top:7px;border:1px solid #3a5667;border-radius:10px;background:#0a1d28;padding:8px}.mofFitHead{display:flex;align-items:center;justify-content:space-between;gap:7px}.mofFitHead b{font-size:8px;color:#dcecf2}.mofFitHead span{font-size:6px;color:#7896a3}.mofFitKey{margin-top:5px;font-size:8px;font-weight:900;color:#e8f2f6}.mofFitRows{display:grid;gap:4px;margin-top:6px}.mofFitRow{font-size:7px;line-height:1.5;border-radius:8px;padding:6px 7px}.mofFitRow.good{border:1px solid #3e705c;background:#0e2921;color:#bce4d1}.mofFitRow.warn{border:1px solid #72534b;background:#291b19;color:#e9bcb1}.mofFitRow.note{border:1px solid #3a5667;background:#0a202b;color:#a8c1cc}.mofFitFoot{margin-top:6px;font-size:6px;line-height:1.45;color:#748f9b}
`;document.head.appendChild(s)}
function profileMap(){const st=window.FourAbilityProfileV1State||window.FiveAbilityProfileV2State;return st?.byNo||Object.fromEntries((st?.rows||[]).filter(x=>x.no!=null).map(x=>[String(x.no),x]))}
function frameOf(no,q,field){const f=N(q?.frame);if(Number.isFinite(f))return Math.max(1,Math.min(8,Math.round(f)));const n=N(no);if(!Number.isFinite(n)||!Number.isFinite(field)||field<1)return NaN;if(field===18)return Math.min(8,Math.max(1,Math.ceil((n+2)/2)));return Math.min(8,Math.max(1,Math.ceil(n*8/field)))}
function band(v){return !Number.isFinite(v)?'不明':v<=35?'低め':v>=65?'高め':'中位'}
function fit(no){const q=window.ValidatedQueueState?.byNo?.[String(no)]||{},p=window.PositionRiskState?.byNo?.[String(no)]||{},pr=profileMap()?.[String(no)]||{};const field=N($('fieldSize')?.value)||N(window.ValidatedQueueState?.field)||N(window.Finish600State?.rows?.length);const frame=frameOf(no,q,field),acc=N(pr.accelPct),sust=N(pr.sustPct),exp=N(q.expectedRank),front=N(q.frontness5),p10=N(p.p10);const inner=frame<=3,outer=frame>=6,rear=(Number.isFinite(exp)&&exp>field*.55)||(Number.isFinite(p10)&&p10>=.5),forward=(Number.isFinite(exp)&&exp<=field*.35)||(Number.isFinite(front)&&front>=.55);const rows=[];
if(inner&&acc<=35&&rear)rows.push(['warn','🔴 内寄り × 加速力低め × 後方想定：馬群内で進路が塞がれた場合、進路確保後の再加速が課題になりやすい構造。']);
else if(inner&&acc>=65)rows.push(['good','🟢 内寄り × 加速力高め：ロスを抑えて運び、進路が開いた時に短い加速を使いやすい組み合わせ。']);
else if(inner&&forward)rows.push(['good','🟢 内寄り × 前目想定：馬群に包まれる前に位置を取れれば、距離ロスを抑えやすい。']);
if(outer&&sust>=65)rows.push(['good','🟢 外寄り × 持続力高め：距離ロスはあるが、包まれにくい進路から長く脚を使う形を作りやすい。']);
else if(outer&&sust<=35)rows.push(['warn','🔴 外寄り × 持続力低め：外を回して早めに脚を使う形では、終盤まで脚を保てるかが論点。']);
if(outer&&acc>=65&&!rows.some(x=>x[1].includes('加速力')))rows.push(['good','🟢 外寄り × 加速力高め：進路を確保できれば、馬群の影響を受けにくい位置から反応しやすい。']);
if(rear&&acc<=35&&!inner)rows.push(['warn','🟠 後方想定 × 加速力低め：直線で前との差を一気に詰める形より、早めに動けるかを確認したい。']);
if(forward&&sust>=65)rows.push(['good','🟢 前目想定 × 持続力高め：前半で位置を取った後も、長く脚を使える形には噛み合いやすい。']);
if(!rows.length)rows.push(['note','⚪ 枠・能力の組み合わせに強い偏りはなし。Ability・M3・位置取り・展開を優先して確認。']);
return{frame,acc,sust,rows:rows.slice(0,3),key:`${Number.isFinite(frame)?`${frame}枠`:'枠不明'} × 加速力${band(acc)} × 持続力${band(sust)}`}}
function cleanPriceLanguage(root){root.querySelectorAll('.moaThink,.moaGood,.moaBad,.moaScenario').forEach(el=>{const t=el.textContent||'';if(/ワイド価格|価格で許容|何倍|最低ライン/.test(t)){el.textContent=t.replace(/ワイド価格で許容できるか。?/g,'今回のリスクを許容できるか。').replace(/価格で許容できるか。?/g,'リスクを許容できるか。').replace(/ワイド[^。]*。?/g,'')}})}
function decorate(){css();const root=$('moaRoot');if(!root)return;const cards=[...root.querySelectorAll('.moaCard')],sig=JSON.stringify([window.FourAbilityProfileV1State?.at,window.FiveAbilityProfileV2State?.at,window.ValidatedQueueState?.at,window.PositionRiskState?.at,cards.map(c=>c.querySelector('.moaNo')?.textContent)]);cleanPriceLanguage(root);if(sig===last&&cards.every(c=>c.querySelector('.mofFit')))return;last=sig;let added=0;cards.forEach(card=>{const body=card.querySelector('.moaBody'),no=String(card.querySelector('.moaNo')?.textContent||'').trim();if(!body||!no||body.querySelector('.mofFit'))return;const z=fit(no),box=document.createElement('section');box.className='mofFit';box.innerHTML=`<div class="mofFitHead"><b>🧩 枠 × 能力の噛み合わせ</b><span>構造上の注意点</span></div><div class="mofFitKey">${E(z.key)}</div><div class="mofFitRows">${z.rows.map(([c,t])=>`<div class="mofFitRow ${c}">${E(t)}</div>`).join('')}</div><div class="mofFitFoot">能力プロフィールは今回メンバー内の相対値。現段階では買い・消し判定に使わず、相手馬を吟味するための表示です。</div>`;const reason=body.querySelector('.moaReason');if(reason)reason.insertAdjacentElement('afterend',box);else body.appendChild(box);added++});window.MobileOpponentFitV1State={ready:true,version:V,decorated:root.querySelectorAll('.mofFit').length,added,widePriceVisible:false,productionImpact:false,at:Date.now()}}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;decorate()})},ms)}
['mobile-opponent-analysis-ready','five-ability-profile-v2-ready','four-ability-profile-ready','validated-queue-ready','position-risk-ready','rsa-analysis-complete','mobile-product-ui-stable-ready'].forEach(ev=>addEventListener(ev,()=>schedule(35)));
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-ims-tab="axis"],.moaCard>summary'))schedule(20)},true);
function start(){css();schedule(120);setTimeout(()=>schedule(0),500)}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
