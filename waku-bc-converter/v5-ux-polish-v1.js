(()=>{'use strict';
const FLOW_KEY='rsa-v4-validated-flow-cache-v2';
const css=document.createElement('style');
css.id='v5-ux-polish-v1';
css.textContent=`
:root{--bg:#05080e!important;--bg2:#07101a!important;--panel:#0a1420!important;--panel2:#0d1b2b!important;--line:#1e3650!important;--line2:#2d5278!important;--text:#f4f8ff!important;--muted:#8094aa!important;--emerald:#66b9ff!important;--cyan:#74c6ff!important;--gold:#7dbfff!important;--amber:#e7b75f!important;--red:#ef7f73!important}
html,body{background:#05080e!important}body{background:radial-gradient(circle at 85% 0,rgba(43,111,170,.18),transparent 30%),linear-gradient(180deg,#05080e 0,#060b13 52%,#04070c 100%)!important}
.v5Eyebrow{color:#6c9cc8!important}.v5Build{border-color:#295477!important;background:#0b1b2a!important;color:#9fd2ff!important}.v5Status{background:rgba(5,10,17,.92)!important;border-color:#1d3851!important;color:#7f99b2!important}
.v5Setup,.v5Storage,.v5RaceHero,.v5Card{background:linear-gradient(180deg,rgba(11,23,37,.985),rgba(7,15,26,.985))!important;border-color:#1e3a57!important}.v5SetupTitle span{background:#102b45!important;color:#86c9ff!important}.v5RaceDetails,.v5OddsBlock{background:#070f1a!important;border-color:#203a54!important}input,select,textarea{background:#060c15!important;border-color:#294560!important}input:focus,select:focus,textarea:focus{border-color:#4c8ec6!important;box-shadow:0 0 0 2px rgba(78,168,255,.13)!important}.v5Upload{background:#08111d!important;border-color:#2b5173!important}.v5InputIcon{background:linear-gradient(180deg,#12314e,#0c2238)!important;border-color:#356a96!important;color:#9dd4ff!important}.v5MiniBtn{background:#09131f!important;border-color:#29445d!important}.v5FieldHead strong{color:#7fc4ff!important}.v5Analyze{border-color:#3f7eb3!important;background:linear-gradient(180deg,#15528a,#103961)!important;box-shadow:0 14px 34px rgba(21,82,138,.28)!important}.v5Analyze small{color:#b3d9f7!important}.v5LiveDot{border-color:#376b94!important;background:#0d2438!important;color:#8fd0ff!important}
.v5GaugeRing{background:conic-gradient(#5aaeff calc(var(--v)*1%),#132538 0)!important}.v5GaugeRing:after{background:#08121f!important;border-color:#24425f!important}.v5PaceTrack{background:#112236!important}.v5PaceFill{background:linear-gradient(90deg,#387db7,#75c3ff)!important}.v5PacePrimary{border-color:#1d3852!important}.v5RpciBand{border-color:#27445f!important;background:#091725!important}.v5RpciBand.active{border-color:#4c86b7!important;background:#10283e!important}
.v5Chip{border-color:#294b69!important;background:#0a1826!important;color:#91aac0!important}.v5Chip.good{border-color:#3d7cae!important;color:#8fd0ff!important;background:#0d253a!important}.v5Chip.warn{border-color:#7a6538!important;color:#f0cd76!important;background:#2b2515!important}.v5Chip.bad{border-color:#7a4743!important;color:#f29b91!important;background:#2b1919!important}.v5Segmented button{border-color:#27445f!important;background:#081522!important;color:#829bb2!important}.v5Segmented button.active{background:#12314d!important;border-color:#4d89b9!important;color:#f1f8ff!important}
.v5TrackShell{border-color:#294b69!important;background:linear-gradient(90deg,rgba(26,65,99,.18),rgba(8,25,41,.48))!important}.v5Lane{border-color:rgba(85,146,194,.18)!important}.v5LaneTitle,.v5TrackLabels{color:#6e8da9!important}.v5HorseDot{background:#0c2338!important;border-color:#4d88b8!important;color:#f3f8ff!important;box-shadow:0 8px 18px rgba(0,0,0,.32)!important;transform:translateX(calc(-50% + var(--dx,0px)))!important}.v5HorseDot small{color:#8cb6d5!important}.v5HorseDot.warn{background:#2c2617!important;border-color:#8b7139!important}
.v5ScenarioCard,.v5ScenarioBox,.v5QueueRow,.v5HorseCard{background:#081522!important;border-color:#24435f!important}.v5MiniHorse{border-color:#17324a!important}.v5No{background:#102942!important;border-color:#3b78a8!important}.v5HorseName small,.v5HorseOdds small,.v5QueueMain span,.v5Move small{color:#7893aa!important}
.v5FeatureGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.v5Feature{background:#0a1928!important;border-color:#223f5a!important;border-radius:11px!important;padding:9px!important;min-height:54px}.v5Feature small{color:#6f8ca5!important;font-size:7px!important}.v5Feature b{font-size:10px!important;line-height:1.35}.v5HorseCard{padding:12px!important}.v5HorseSummary{border-top-color:#1d3851!important;color:#adc0d1!important;font-size:9px!important;line-height:1.65!important}
.v5HorseReadout{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-top:9px;padding:9px 10px;border-radius:12px;border:1px solid #294c69;background:#091a29}.v5HorseReadout strong{display:block;font-size:10px;line-height:1.3}.v5HorseReadout small{display:block;margin-top:3px;color:#7895ad;font-size:7px}.v5HorseReadout .v5ReadBadge{flex:0 0 auto;border-radius:999px;padding:5px 7px;font-size:7px;font-weight:900;border:1px solid #3e7198;color:#9ed5ff;background:#0d2740}.v5HorseReadout.rise{border-color:#316b98;background:#0b2033}.v5HorseReadout.rise .v5ReadBadge{border-color:#4a8ec2;color:#9ed8ff;background:#123150}.v5HorseReadout.caution{border-color:#745d34;background:#251f13}.v5HorseReadout.caution .v5ReadBadge{border-color:#8d713a;color:#f1cf7c;background:#322916}.v5HorseReadout.align{border-color:#29465f;background:#0a1723}.v5HorseReadout.align .v5ReadBadge{border-color:#3d6687;color:#a7c8e3;background:#102237}
.v5HorseFilters{display:flex;gap:6px;overflow-x:auto;padding:1px 1px 4px;margin-bottom:8px;scrollbar-width:none}.v5HorseFilters::-webkit-scrollbar{display:none}.v5HorseFilters button{white-space:nowrap;border:1px solid #284863;background:#081522;color:#809bb1;border-radius:999px;padding:7px 10px;font-size:8px}.v5HorseFilters button.active{background:#123251;border-color:#4a86b6;color:#eef8ff}.v5HorseCard[data-v5-hidden="1"]{display:none!important}
.v5CollisionNote{margin-top:7px;color:#708ba3;font-size:7px;line-height:1.45}
.v5BottomNav{background:rgba(4,9,15,.94)!important;border-color:#203d58!important}.v5BottomNav button{color:#738ba0!important}.v5BottomNav button.active{background:#102c47!important;color:#eaf6ff!important}.v5BottomNav .navIcon{color:#69b4ef!important}
.v5GoalMapWrap{border-color:#294a67!important;background:linear-gradient(180deg,#071321,#050d17)!important}.v5GoalPlot{border-color:#294a67!important;background:linear-gradient(90deg,rgba(40,68,94,.08),rgba(23,66,101,.16)),repeating-linear-gradient(90deg,transparent 0,transparent calc(25% - 1px),rgba(83,137,181,.09) 25%)!important}.v5GoalBase{background:linear-gradient(90deg,#203b55,#4c82ad)!important}.v5ReachLine{border-left-color:#6eb9f2!important}.v5ReachLine span{color:#91ceff!important}.v5GoalHorse{background:#0d2031!important;border-color:#496b84!important;color:#dceaf5!important}.v5GoalHorse.reach{background:#103454!important;border-color:#5da8df!important;color:#f3f9ff!important}.v5GoalHorse.fringe{background:#342d19!important;border-color:#bd9c4d!important;color:#f4e5aa!important}.v5GoalHorse.out{background:#101a24!important;border-color:#3b5062!important;color:#8299ab!important}.v5GoalHorse .mv{background:#050c14!important;border-color:#294a67!important}.v5GoalHorse.reach .mv{color:#87ceff!important}.v5GoalLegend span{border-color:#294a67!important;color:#91a7b9!important}.v5GoalLegend .reach{color:#87ceff!important;border-color:#3e7299!important}.v5GoalOut{border-color:#1d3448!important;color:#758ea3!important}.v5GoalOut b{color:#a7bed1!important}.v5GoalSheet{background:linear-gradient(180deg,#0b1d2d,#050c14)!important;border-color:#31536d!important}.v5GoalSheetCell{border-color:#27445f!important;background:#081522!important}
`;
document.head.appendChild(css);

function getFlow(){try{return JSON.parse(localStorage.getItem(FLOW_KEY)||'null')}catch{return null}}
function num(v){const n=+v;return Number.isFinite(n)?n:null}
function resolveFormation(){
  const grid=document.querySelector('#v5Panel .v5TrackGrid');
  if(!grid)return;
  const H=Math.max(340,grid.clientHeight||340),minY=34,maxY=H-38,minGap=49;
  grid.querySelectorAll('.v5Lane').forEach(lane=>{
    const dots=[...lane.querySelectorAll('.v5HorseDot')].map((el,i)=>({el,desired:parseFloat(el.style.top)||0,i})).sort((a,b)=>a.desired-b.desired||a.i-b.i);
    if(!dots.length)return;
    const ys=[];
    for(let i=0;i<dots.length;i++)ys[i]=Math.max(dots[i].desired,i?ys[i-1]+minGap:minY);
    if(ys[ys.length-1]>maxY){ys[ys.length-1]=maxY;for(let i=ys.length-2;i>=0;i--)ys[i]=Math.min(ys[i],ys[i+1]-minGap);if(ys[0]<minY){const d=minY-ys[0];for(let i=0;i<ys.length;i++)ys[i]+=d}}
    for(let i=0;i<dots.length;i++){
      const nearPrev=i>0&&Math.abs(dots[i].desired-dots[i-1].desired)<34;
      const nearNext=i<dots.length-1&&Math.abs(dots[i+1].desired-dots[i].desired)<34;
      const off=(nearPrev||nearNext)?([0,-11,11,-17,17][i%5]||0):0,top=`${ys[i].toFixed(1)}px`,dx=`${off}px`;
      if(dots[i].el.style.top!==top)dots[i].el.style.top=top;
      if(dots[i].el.style.getPropertyValue('--dx')!==dx)dots[i].el.style.setProperty('--dx',dx);
      if(dots[i].el.dataset.resolved!=='1')dots[i].el.dataset.resolved='1';
    }
  });
  const shell=grid.closest('.v5TrackShell');
  if(shell&&!shell.querySelector('.v5CollisionNote')){
    const n=document.createElement('div');n.className='v5CollisionNote';n.textContent='表示位置は重なり回避のため微調整。1角予測値そのものは変更していません。';shell.appendChild(n);
  }
}
function horseData(no){
  const r=window.V4AppState?.state?.results,h=(r?.horses||[]).find(x=>String(x.no)===String(no));
  const F=getFlow(),f=(F?.f||[]).find(x=>String(x.no)===String(no));
  const base=num(h?.pRank),m3=num(f?.rank??h?.m3);
  return{h,base,m3};
}
function readClass(base,m3){if(base===null||m3===null)return'align';const d=base-m3;if(d>=4)return'rise';if(d<=-4)return'caution';return'align'}
function readLabel(cls,base,m3){
  if(cls==='rise')return{badge:'↑ M3浮上',title:'市場評価より構造側が上',text:`基礎 ${base??'—'}位 → M3 ${m3??'—'}位。人気順だけでは見えにくい浮上。`};
  if(cls==='caution')return{badge:'⚠ 要注意',title:'基礎評価に対してM3が下位',text:`基礎 ${base??'—'}位 → M3 ${m3??'—'}位。人気・基礎だけで過信しない。`};
  return{badge:'＝ 一致',title:'市場基礎とM3が概ね一致',text:`基礎 ${base??'—'}位 → M3 ${m3??'—'}位。大きなモデル間乖離なし。`};
}
let horseFilter='all';
function applyHorseFilter(){
  document.querySelectorAll('#v5Panel .v5HorseCard').forEach(card=>{const c=card.dataset.readClass||'align',v=(horseFilter==='all'||horseFilter===c)?'0':'1';if(card.dataset.v5Hidden!==v)card.dataset.v5Hidden=v});
  document.querySelectorAll('.v5HorseFilters button').forEach(b=>{const on=b.dataset.hf===horseFilter;if(b.classList.contains('active')!==on)b.classList.toggle('active',on)})
}
function decorateHorses(){
  const wrap=document.querySelector('#v5Panel .v5HorseCards');if(!wrap)return;
  if(!wrap.previousElementSibling?.classList?.contains('v5HorseFilters')){
    const f=document.createElement('div');f.className='v5HorseFilters';f.innerHTML='<button type="button" data-hf="all" class="active">全頭</button><button type="button" data-hf="rise">M3浮上</button><button type="button" data-hf="caution">要注意</button><button type="button" data-hf="align">一致</button>';wrap.parentNode.insertBefore(f,wrap);f.addEventListener('click',e=>{const b=e.target.closest('[data-hf]');if(!b)return;horseFilter=b.dataset.hf;applyHorseFilter()});
  }
  wrap.querySelectorAll('.v5HorseCard').forEach(card=>{
    const no=card.querySelector('.v5No')?.textContent?.trim();if(!no)return;const {base,m3}=horseData(no),cls=readClass(base,m3),l=readLabel(cls,base,m3);
    if(card.dataset.readClass!==cls)card.dataset.readClass=cls;
    let ro=card.querySelector('.v5HorseReadout');if(!ro){ro=document.createElement('div');card.querySelector('.v5HorseTop')?.after(ro)}
    const klass=`v5HorseReadout ${cls}`,html=`<div><strong>${l.title}</strong><small>${l.text}</small></div><span class="v5ReadBadge">${l.badge}</span>`,sig=`${cls}|${base}|${m3}`;
    if(ro.className!==klass)ro.className=klass;
    if(ro.dataset.sig!==sig){ro.dataset.sig=sig;ro.innerHTML=html}
  });
  applyHorseFilter();
}
function polish(){resolveFormation();decorateHorses();if(!window.V5UxPolishState?.ready)window.V5UxPolishState={ready:true,version:'v5-ux-polish-v1',theme:'black-blue',collision:true,horseCards:true,eventDriven:true}}
let raf=0,timer=0;function schedule(){cancelAnimationFrame(raf);clearTimeout(timer);raf=requestAnimationFrame(()=>{timer=setTimeout(polish,20)})}
function relevantMutation(r){const t=r.target;return !(t?.closest?.('.v5HorseReadout,.v5TrustStrip,.v5KartSummary,.v5HorseFilters'))}
function init(){
  const p=document.getElementById('v5Panel');if(p)new MutationObserver(rs=>{if(rs.some(relevantMutation))schedule()}).observe(p,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-v5-tab]')||e.target.closest('[data-form]')||e.target.closest('#analyzeBtn'))setTimeout(schedule,80)});
  setTimeout(schedule,450);setTimeout(schedule,1600);schedule()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();