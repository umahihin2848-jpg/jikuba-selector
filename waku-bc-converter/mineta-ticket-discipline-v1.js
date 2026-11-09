(function(){
'use strict';
if(window.MinetaTicketDisciplineV1)return;
const V='mineta-ticket-discipline-v1.0-research';
const $=id=>document.getElementById(id);
const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>{const n=Number(x);return Number.isFinite(n)?n:NaN};
const choose=(n,k)=>{if(!Number.isInteger(n)||n<k||k<0)return 0;let p=1;for(let i=1;i<=k;i++)p=p*(n-i+1)/i;return Math.round(p)};
let lastRace='',axisEdited=false,timer=0;
function parseNumbers(v,field){
 const parts=String(v||'').normalize('NFKC').trim().split(/[\s,、，;；]+/).filter(Boolean),bad=[],out=[];
 for(const x of parts){
  if(!/^\d+$/.test(x)||Number(x)<1||Number(x)>field){bad.push(x);continue}
  const n=Number(x);if(!out.includes(n))out.push(n)
 }
 return{nums:out,bad};
}
function calculate(field,axis,second,third,unit){
 if(!Number.isInteger(field)||field<12||field>18)return{ready:false,error:'出走頭数（12〜18頭）を確認してください'};
 if(!Number.isInteger(axis)||axis<1||axis>field)return{ready:false,error:'軸馬番を入力してください'};
 const b=parseNumbers(second,field),c=parseNumbers(third,field);
 if(b.bad.length||c.bad.length)return{ready:false,error:'入力できない馬番があります：'+[...b.bad,...c.bad].join('、')};
 if(!b.nums.length||!c.nums.length)return{ready:false,error:'2列目と3列目の馬番を手動で入力してください'};
 if(b.nums.includes(axis)||c.nums.includes(axis))return{ready:false,error:'軸馬は2列目・3列目に重ねず、相手馬だけ入力してください'};
 if(!Number.isInteger(unit)||unit<100||unit%100!==0)return{ready:false,error:'1点あたりの金額は100円単位で入力してください'};
 const pairs=new Set();
 for(const x of b.nums)for(const y of c.nums)if(x!==y)pairs.add([Math.min(x,y),Math.max(x,y)].join('-'));
 const pointCount=pairs.size;
 return{ready:true,field,axis,second:b.nums,third:c.nums,points:pointCount,
  full:choose(field,3),fixed:choose(field-1,2),cost:pointCount*unit,
  fraction:pointCount/choose(field,3),duplicatePolicy:'重複組合せは一度だけ数える',
  pairKeys:[...pairs].sort()};
}
function content(){
 return '<summary>📘 印の役割と買い目点数を確認 <span class="mtdSmall">研究・手動</span></summary>'+
 '<div class="mtdBody">'+
 '<p class="mtdIntro">書籍180〜186・214〜216ページの考え方を参考にした整理。相手馬の選定・購入判断は自動化しません。</p>'+
 '<div class="mtdRole"><b>◎ 単勝の期待値を重視</b><span>能力や信頼性が高いだけではなく、単勝価格との釣り合いも必要。アプリの軸馬と同一とは限らない。</span></div>'+
 '<div class="mtdRole"><b>○▲△ 期待値と展開の両面</b><span>展開が噛み合い、価格にも妙味があると判断する馬の役割。</span></div>'+
 '<div class="mtdRole"><b>☆注 能力はあるが条件付き</b><span>展開が不利でも馬券圏内に入る余地を考える役割。単独で期待値があるという意味ではない。</span></div>'+
 '<p class="mtdIntro">印は説明用。モデルが勝手に◎や相手Top2を決定することはありません。</p>'+
 '<div class="mtdSub">手動の3連複フォーメーション点数</div>'+
 '<div id="mtdContext" class="mtdContext">軸候補を確認中</div>'+
 '<div class="mtdGrid">'+
 '<label>1列目：軸馬番<input id="mtdAxis" type="number" min="1" max="18" inputmode="numeric" placeholder="例：1"></label>'+
 '<label>1点あたりの金額<input id="mtdUnit" type="number" min="100" step="100" inputmode="numeric" value="100"></label>'+
 '<label class="mtdWide">2列目：相手の馬番（手入力）<input id="mtdSecond" type="text" inputmode="text" autocomplete="off" placeholder="例：2,3,4"></label>'+
 '<label class="mtdWide">3列目：相手の馬番（手入力）<input id="mtdThird" type="text" inputmode="text" autocomplete="off" placeholder="例：2,3,4,5,6,7,8"></label>'+
 '</div><div id="mtdResult" class="mtdResult" aria-live="polite">馬番を入力すると、重複を除いた組み合わせ数と予算を表示します。</div>'+
 '<div class="mtdNote">これは数学的な点数計算で、的中確率・期待値・購入推奨ではありません。点数を減らしても削った買い目が有利なら期待値は悪化します。</div>'+
 '<div class="mtdNote">試行回数：高配当の買い方ほど長い不的中が起こり得ます。少数レースの回収率や最高払戻だけで手法の優劣を決めず、未購入レースも含めて記録します。</div>'+
 '</div>';
}
function css(){
 if($('mtdCss'))return;
 const e=document.createElement('style');e.id='mtdCss';
 e.textContent='#minetaTicketDiscipline{border:1px solid #436575;background:#0b1e2b;border-radius:14px;margin:12px 0;color:#e6f1f8;font-size:12px}'+
 '#minetaTicketDiscipline>summary{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;cursor:pointer;list-style:none;font-size:14px;font-weight:850}'+
 '#minetaTicketDiscipline>summary::-webkit-details-marker{display:none}#minetaTicketDiscipline .mtdSmall{font-size:10px;color:#a3cfbe}'+
 '#minetaTicketDiscipline .mtdBody{padding:0 12px 13px}#minetaTicketDiscipline .mtdIntro{font-size:11px;line-height:1.65;color:#abc0cb}'+
 '#minetaTicketDiscipline .mtdRole{border:1px solid #35586c;border-radius:9px;padding:9px;margin:7px 0;background:#102837}'+
 '#minetaTicketDiscipline .mtdRole b{display:block;font-size:12px}#minetaTicketDiscipline .mtdRole span{display:block;margin-top:3px;font-size:11px;color:#b8cad2;line-height:1.6}'+
 '#minetaTicketDiscipline .mtdSub{font-size:13px;font-weight:800;border-top:1px solid #385366;padding-top:12px;margin-top:14px}'+
 '#minetaTicketDiscipline .mtdContext{padding:7px 0;color:#b5dbcb;font-size:11px}'+
 '#minetaTicketDiscipline .mtdGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'+
 '#minetaTicketDiscipline .mtdGrid label{font-size:11px;font-weight:700;color:#bed3dd;min-width:0}'+
 '#minetaTicketDiscipline .mtdGrid .mtdWide{grid-column:1/-1}'+
 '#minetaTicketDiscipline input{box-sizing:border-box;width:100%;font-size:16px!important;min-height:43px;padding:8px;margin-top:5px;border:1px solid #4b6d7b;border-radius:9px;background:#102b3a;color:#f1f8fb}'+
 '#minetaTicketDiscipline .mtdResult{margin-top:10px;padding:10px;border:1px solid #3b6b5e;border-radius:10px;background:#103127;font-size:12px;line-height:1.7}'+
 '#minetaTicketDiscipline .mtdResult strong{font-size:19px;color:#e1faec}'+
 '#minetaTicketDiscipline .mtdNote{margin-top:9px;font-size:10px;line-height:1.65;color:#98b3c1}';
 document.head.appendChild(e);
}
function raceKey(){return ['raceDate','venue','raceName','fieldSize'].map(id=>$(id)?.value||'').join('|')}
function mount(){
 const area=$('imsPace')||$('mpuAllHorses')?.parentElement||$('result');
 if(!area)return null;
 let root=$('minetaTicketDiscipline');
 if(!root){root=document.createElement('details');root.id='minetaTicketDiscipline';root.innerHTML=content()}
 if(root.parentElement!==area)area.appendChild(root);
 return root;
}
function context(){
 const field=Number($('fieldSize')?.value)||Number(window.Finish600State?.rows?.length)||0;
 const axis=window.DecisionShellV2State?.structure?.axis||null;
 const gate=window.RaceSkipLockV1State?.status||document.documentElement?.dataset?.raceGate||'idle';
 const race=raceKey();
 return{field,axis,gate,race};
}
function update(){
 const root=mount();if(!root)return;css();
 const c=context(),axisBox=$('mtdAxis'),contextBox=$('mtdContext');
 if(lastRace!==c.race){
  lastRace=c.race;axisEdited=false;
  if($('mtdSecond'))$('mtdSecond').value='';
  if($('mtdThird'))$('mtdThird').value='';
  if(axisBox)axisBox.value='';
 }
 if(axisBox&&c.axis&&!axisEdited)axisBox.value=String(c.axis.no);
 if(contextBox){
  const state=c.gate==='open'?'軸が条件通過':c.gate==='skip'?'レースは見送り': '分析待ち';
  contextBox.textContent='対象 '+(c.field||'—')+'頭｜'+state+'｜自動軸 '+(c.axis?c.axis.no+'番 '+c.axis.name:'なし')+'（軸は手動変更可）';
 }
 const r=calculate(c.field,Number(axisBox?.value),$('mtdSecond')?.value,$('mtdThird')?.value,Number($('mtdUnit')?.value));
 const box=$('mtdResult');if(!box)return;
 if(!r.ready){box.textContent=r.error;return}
 box.innerHTML='<strong>'+r.points+'点</strong> ｜ 参考予算 <strong>'+r.cost.toLocaleString('ja-JP')+'円</strong>'+
  '<div>16頭などの全3連複'+r.full+'通りに対して '+(r.fraction*100).toFixed(1)+'%｜'+r.field+'頭で軸1頭固定なら最大'+r.fixed+'通り</div>'+
  '<div>2列目 '+r.second.length+'頭・3列目 '+r.third.length+'頭｜重複は1点として計算</div>';
 window.MinetaTicketDisciplineV1State={ready:true,version:V,points:r.points,cost:r.cost,manuallySelected:true,marketEvCalculated:false};
}
function schedule(ms=50){clearTimeout(timer);timer=setTimeout(update,ms)}
function init(){
 document.addEventListener('input',e=>{
  const id=e.target?.id;
  if(id==='mtdAxis')axisEdited=true;
  if(['mtdAxis','mtdSecond','mtdThird','mtdUnit','raceDate','raceName','venue','fieldSize'].includes(id))schedule(40)
 },true);
 document.addEventListener('change',e=>{if(['raceDate','raceName','venue','fieldSize'].includes(e.target?.id))schedule(60)},true);
 for(const event of ['decision-shell-v2-ready','production-decision-pipeline-ready','rsa-analysis-complete','mobile-opponent-analysis-ready','mobile-product-ui-stable-ready','finish600-ready','m3-pure-ability-ready'])
  window.addEventListener(event,()=>schedule(100));
 schedule(150);setTimeout(()=>schedule(),950);setTimeout(()=>schedule(),2500);
}
window.MinetaTicketDisciplineV1={version:V,parseNumbers,calculate,update,schedule,choose};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();