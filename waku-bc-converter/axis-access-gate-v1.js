(()=>{'use strict';
if(window.AxisAccessGateV1)return;
const V='axis-access-gate-v1.3-unified-research-unlock',D=document.documentElement,$=id=>document.getElementById(id);
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let phase='idle',startAt=0,last='',timer=0;
function classify(transition,decision,gate){
 const t=transition||{},d=decision||{},s=d.structure||{},f=d.final||{};
 if(t.status==='running')return{status:'checking',title:'軸馬を判定中',reason:'Ability・M3・P10を照合しています。'};
 if(t.status==='error')return{status:'error',title:'解析未完了',reason:String(t.message||'必要な計算が完了していません。')};
 if(t.status!=='ready')return{status:'idle',title:'',reason:''};
 if(!d.ready||!s.code)return{status:'checking',title:'軸馬を判定中',reason:'軸判定の結果を確認しています。'};
 if(gate?.status==='checking')return{status:'checking',title:'軸馬を判定中',reason:'Ability・M3の一致を確認しています。'};
 if(gate?.status==='idle'||!gate?.status)return{status:'checking',title:'レース条件の確認待ち',reason:gate?.reason||'レース名・競馬場・対象条件を確認してください。解析後も続く場合はレース入力を開いてください。'};
 if(s.code==='scope_out'||gate?.kind==='scope')return{status:'skip',title:'見送り',reason:'対象レースの条件を満たしていません。'};
 if(s.code==='ability_rank_tie'||s.code==='wait')return{status:'skip',title:'見送り',reason:'軸馬の順位を一意に判定できませんでした。'};
 const candidates=Array.isArray(s.candidates)?s.candidates:[];
 if(s.code==='no_auto_axis'||s.code==='validated_stop'||s.kind==='A3'||!s.axis)return{status:'skip',title:'見送り',reason:'信頼条件を満たす軸馬がいません。'};
 if(s.kind==='double'||s.code==='double'){
   // Pair requires two validated overlaps including Ability #1.
   // The pre-existing model retains an Ability #1 anchor internally for compatibility,
   // but a Pair is never treated as a confirmed *single* axis by this UI.
   if(candidates.length!==2||!candidates.some(x=>Number(x.ar)===1)||gate?.status==='skip')
     return{status:'skip',title:'見送り',reason:'Pair構造の信頼条件を満たしていません。'};
   if(gate?.status!=='open')return{status:'checking',title:'Pair判定中',reason:'対象レースとAbility・M3の安全条件を確認しています。'};
   if(f.level==='red'||f.level==='neutral')return{status:'skip',title:'見送り',reason:'本番の安全条件を満たしていません。'};
   // Pair is a research view, not a final betting recommendation. It may be
   // inspected without all win odds; ticket eligibility remains unconfirmed.
   const marketPending=!d.market?.complete;
   if(marketPending&&!(f.level==='wait'&&f.code==='market_wait'))
     return{status:'checking',title:'Pair判定中',reason:'モデルと市場入力状態を照合しています。'};
   if(!marketPending&&(f.code!=='double'||f.level!=='yellow'))
     return{status:'checking',title:'Pair判定中',reason:'2頭一致の構造を確認しています。'};
   return{status:'pair',title:'',reason:'',marketPending,marketBlocked:false,betEligible:false,marketCount:Number(d.market?.rows?.length)||0,field:Number(d.market?.field)||0,candidates:candidates.map(x=>({no:String(x.no),name:String(x.name||''),abilityRank:Number(x.ar),m3Rank:Number(x.m3)}))};
 }
 if(candidates.length!==1)return{status:'skip',title:'見送り',reason:'単独で採用できる軸馬が決まりませんでした。'};
 if(!['A1','A2'].includes(s.kind))return{status:'skip',title:'見送り',reason:'軸馬の採用条件を満たしていません。'};
 if(gate?.status==='skip')return{status:'skip',title:'見送り',reason:'軸馬の安全条件を満たしていません。'};
 // A1/A2 may open the same full-field research view as Pair as soon as
 // the structural gate passes. Only ticket eligibility depends on full odds.
 const marketPending=!d.market?.complete;
 const marketBlocked=!marketPending&&f.code==='market_range';
 if(marketPending&&!(f.level==='wait'&&f.code==='market_wait'))
   return{status:'checking',title:'軸馬を判定中',reason:'市場入力と軸判定の整合性を確認しています。'};
 if(!marketPending&&!marketBlocked&&(f.level==='neutral'||f.level==='red'))
   return{status:'skip',title:'見送り',reason:'軸選定の安全条件を満たしていません。'};
 if(!marketPending&&!marketBlocked&&!['green','yellow'].includes(f.level))
   return{status:'checking',title:'軸馬を判定中',reason:'最終判定を確認しています。'};
 return{status:'pass',title:'',reason:'',axisNo:String(s.axis.no),kind:s.kind,
  conditional:marketPending||marketBlocked||f.level==='yellow',marketPending,marketBlocked,
  betEligible:!marketPending&&!marketBlocked&&['green','yellow'].includes(f.level),
  marketCount:Number(d.market?.rows?.length)||0,field:Number(d.market?.field)||0};
}
function ensure(){
 let el=$('axisAccessScreen');if(el)return el;
 const btn=$('analyzeBtn');if(!btn)return null;
 el=document.createElement('section');el.id='axisAccessScreen';el.className='axisAccessScreen';
 el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.hidden=true;
 btn.insertAdjacentElement('afterend',el);
 el.addEventListener('click',ev=>{
  if(!ev.target?.closest?.('[data-axis-retry]'))return;
  if(D.dataset.axisAccess!=='market'){phase='editing';startAt=0;D.dataset.axisAccess='editing'}
  const setup=$('mpuSetup');if(setup){setup.open=true;setup.scrollIntoView?.({block:'start'})}
  else($('raceCondCard')||$('csvCard'))?.scrollIntoView?.({block:'start'});
 });
 return el;
}
function read(){
 if(phase==='editing')return{status:'editing',title:'',reason:''};
 const t=window.RSAAnalysisTransitionState,d=window.DecisionShellV2State,g=window.RaceSkipLockV1State;
 let r=classify(t,d,g);
 if(t?.status==='ready'&&startAt&&d?.ready&&Number(d.at||0)<startAt)r={status:'checking',title:'軸馬を判定中',reason:'今回のレースの軸判定を確認しています。'};
 return r;
}
function render(){
 const el=ensure();if(!el)return;const r=read(),status=r.status;
 D.dataset.axisAccess=status;
 D.dataset.axisBet=r.betEligible===true?'eligible':'locked';
 D.dataset.axisMarket=r.marketPending?'pending':r.marketBlocked?'blocked':r.betEligible?'verified':'none';
 el.hidden=!['skip','market','checking','error'].includes(status);
 if(el.hidden){last='';window.AxisAccessGateV1State={ready:true,status,version:V,betEligible:r.betEligible===true,marketPending:Boolean(r.marketPending),marketBlocked:Boolean(r.marketBlocked),axisNo:r.axisNo||'',at:Date.now()};return}
 const sig=JSON.stringify([status,r.title,r.reason]);
 if(sig!==last){
 last=sig;el.innerHTML='<div class="aasIcon">'+(status==='skip'?'×':status==='error'?'!':'…')+'</div>'+
 '<h2>'+E(r.title)+'</h2><p>'+E(r.reason)+'</p>'+
 (status==='skip'?'<div class="aasEmphasis">このレースは購入しません</div>':'')+
 '<button type="button" data-axis-retry>'+(status==='market'?'単勝オッズを入力する':status==='error'?'入力とCSVを確認する':status==='checking'?'レース入力を確認する':'別のレースを入力する')+'</button>';
 }
 if(['skip','market'].includes(status)){const setup=$('mpuSetup');if(setup)setup.open=false}
 window.AxisAccessGateV1State={ready:true,status,reason:r.reason,axisNo:r.axisNo||'',version:V,betEligible:false,marketPending:false,marketBlocked:false,at:Date.now()};
}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(render,ms)}
function invalidate(){phase='editing';startAt=0;D.dataset.axisAccess='editing';schedule(20)}
function started(){phase='running';startAt=Date.now();D.dataset.axisAccess='checking';schedule(15)}
document.addEventListener('click',e=>{
 if(e.target?.id==='analyzeBtn')started();
 if(['applyOddsBtn','clearOddsBtn'].includes(e.target?.id))schedule(150);
},true);
document.addEventListener('input',e=>{
 if(['raceName','raceDate','venue','fieldSize','surface','distance','grade','going'].includes(e.target?.id))invalidate();
 if(e.target?.id==='oddsPaste')schedule(150);
},true);
document.addEventListener('change',e=>{
 if(['raceName','raceDate','venue','fieldSize','surface','distance','grade','going','csvFile'].includes(e.target?.id))invalidate();
},true);
for(const ev of ['rsa-analysis-start','rsa-analysis-complete','rsa-analysis-error','decision-shell-v2-ready','production-decision-pipeline-ready','finish600-ready','m3-pure-ability-ready','rsa-addons-ready'])
 window.addEventListener(ev,()=>ev==='rsa-analysis-start'?started():schedule(100));
window.AxisAccessGateV1={version:V,classify,render,schedule};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(80),{once:true});else schedule(80);
})();