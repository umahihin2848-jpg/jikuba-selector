(()=>{
'use strict';
if(!window.RSAMobileLean||window.__MOBILE_RACE_PROGRESS_V1)return;
window.__MOBILE_RACE_PROGRESS_V1=true;
const V='mobile-race-progress-v1.0';
const LABELS=['強前傾','前傾','標準','スロー'];
const $=id=>document.getElementById(id);
const N=v=>v===null||v===undefined||v===''?NaN:Number(v);
const finite=v=>Number.isFinite(N(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let band=2,selected='',touchedBand=false,raf=0,timer=0,last='',lastRace='';
function style(){
 if($('rpvCss'))return;
 const s=document.createElement('style');s.id='rpvCss';
 s.textContent=[
 '#raceProgressV1{border:1px solid #345b72;background:linear-gradient(160deg,#091b2b,#07131e);color:#e5f2f8;border-radius:17px;padding:12px;margin:8px 0 16px;font-family:inherit}',
 '#raceProgressV1 .rpvHero{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
 '#raceProgressV1 .rpvHero small{display:block;font-size:9px;letter-spacing:.1em;color:#86a7bc;font-weight:800}',
 '#raceProgressV1 .rpvHero strong{display:block;font-size:18px;line-height:1.3;margin-top:3px}',
 '#raceProgressV1 .rpvTag{font-size:9px;border:1px solid #397363;border-radius:99px;padding:5px 7px;color:#a8ebd0;white-space:nowrap}',
 '#raceProgressV1 .rpvLead{font-size:11px;line-height:1.65;color:#a4becb;margin:8px 0 12px}',
 '#raceProgressV1 .rpvBands{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}',
 '#raceProgressV1 .rpvBand{min-height:52px!important;padding:5px 2px!important;border-radius:11px!important;border:1px solid #335062!important;background:#0b2535!important;color:#bed3de!important;font-size:10px!important;font-weight:800!important;line-height:1.25;box-shadow:none!important}',
 '#raceProgressV1 .rpvBand small{display:block;font-size:10px;color:#8ea8ba;margin-top:3px}',
 '#raceProgressV1 .rpvBand[aria-pressed="true"]{border-color:#5dba9b!important;background:#103a35!important;color:#eafff7!important}',
 '#raceProgressV1 .rpvBand[aria-pressed="true"] small{color:#a5efcf}',
 '#raceProgressV1 .rpvSub{display:flex;justify-content:space-between;flex-wrap:wrap;gap:7px;margin:10px 0 6px;color:#9eb7c4;font-size:10px}',
 '#raceProgressV1 .rpvCanvas{background:#061621;border:1px solid #274657;border-radius:13px;padding:6px;overflow:hidden}',
 '#raceProgressV1 .rpvCanvas svg{display:block;width:100%;height:auto;max-height:550px}',
 '#raceProgressV1 .rpvLegend{display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:#adc3cd;margin:8px 0}',
 '#raceProgressV1 .rpvSwatch{display:inline-block;width:17px;height:4px;vertical-align:middle;margin-right:4px;border-radius:8px}',
 '#raceProgressV1 .rpvFocus{border:1px solid #496276;border-radius:12px;padding:11px;background:#0b2735;margin:9px 0}',
 '#raceProgressV1 .rpvFocus h4{font-size:13px;margin:0 0 7px;color:#f8fcff}',
 '#raceProgressV1 .rpvFocusGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}',
 '#raceProgressV1 .rpvMetric{padding:7px 4px;background:#091e2b;border-radius:8px;text-align:center}',
 '#raceProgressV1 .rpvMetric small{display:block;font-size:9px;color:#88a7b7}',
 '#raceProgressV1 .rpvMetric b{display:block;margin-top:3px;font-size:16px;color:#eef9fd}',
 '#raceProgressV1 .rpvAlert{margin-top:8px;color:#e3c77f;font-size:10px;line-height:1.6}',
 '#raceProgressV1 .rpvSectionTitle{font-size:12px;font-weight:850;margin:14px 0 7px}',
 '#raceProgressV1 .rpvList{display:grid;gap:5px;max-height:390px;overflow-y:auto;overscroll-behavior:contain}',
 '#raceProgressV1 .rpvHorse{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:45px!important;padding:6px 8px!important;background:#0b2230!important;border:1px solid #2a4555!important;color:#dfedf4!important;text-align:left!important;border-radius:10px!important;box-shadow:none!important;width:100%}',
 '#raceProgressV1 .rpvHorse[data-selected="true"]{border-color:#e0b65e!important;background:#302915!important}',
 '#raceProgressV1 .rpvHorse .rpvNo{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#23475b;color:#fff;font-weight:900;font-size:11px}',
 '#raceProgressV1 .rpvHorse .rpvName{font-weight:850;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '#raceProgressV1 .rpvHorse .rpvDetail{display:block;font-size:9px;color:#99b5c4;margin-top:3px;white-space:normal;font-weight:500}',
 '#raceProgressV1 .rpvHorse .rpvEnd{font-size:12px;font-weight:900;color:#a7e9d1;white-space:nowrap}',
 '#raceProgressV1 .rpvNote{margin-top:11px;border-top:1px solid #254355;padding-top:9px;color:#90abb9;font-size:10px;line-height:1.65}',
 '#raceProgressV1 .rpvWaiting{padding:16px 8px;font-size:12px;color:#9fb7c4;line-height:1.7}',
 '@media(max-width:375px){#raceProgressV1{padding:9px}#raceProgressV1 .rpvBand{font-size:9px!important}#raceProgressV1 .rpvMetric b{font-size:14px}}'
 ].join('');
 document.head.appendChild(s);
}
function probabilities(){
 const a=window.MobileAnalysisCoreState?.analysis?.pred?.p||window.FourAxisIntegrationState?.p||window.ScenarioStatisticsState?.scenarioProbabilities;
 if(!Array.isArray(a)||a.length!==4)return null;
 const z=a.map(N),sum=z.reduce((p,c)=>p+c,0);
 return z.every(Number.isFinite)&&sum>0?z.map(x=>x/sum):null;
}
function raceId(){
 return ['raceDate','venue','raceName','surface','distance','fieldSize'].map(id=>$(id)?.value||'').join('|')+'|'+(Number(window.RSAAnalysisTransitionState?.generation)||0);
}
function rows(){
 const f=window.Finish600State,r=window.Remaining600ValidatedState,q=window.ValidatedQueueState;
 const g=Number(window.RSAAnalysisTransitionState?.generation)||0;
 if(!f?.ready||!Array.isArray(f.rows)||f.rows.length<2)return [];
 if(g&&f.generation&&Number(f.generation)!==g)return [];
 if(!r?.ready||!Array.isArray(r.rows)||r.rows.length<2)return [];
 if(g&&r.generation&&Number(r.generation)!==g)return [];
 const seen=new Set();
 const sorted=r.rows.filter(x=>finite(x.pred)).slice().sort((a,b)=>N(a.pred)-N(b.pred));
 const rm=new Map(sorted.map((x,i)=>[String(x.no),{rank:i+1,gap:N(x.pred)}]));
 const qm=new Map((q?.rows||[]).map(x=>[String(x.no),x]));
 const a=[];
 for(const x of f.rows){
  const no=String(x.no),r6=rm.get(no),q1=qm.get(no),goal=N(x.sc?.[band]?.rank);
  if(seen.has(no)||!r6||!Number.isFinite(goal))continue;
  seen.add(no);
  const one=finite(q1?.expectedRank)?N(q1.expectedRank):NaN;
  a.push({no,name:String(x.name||q1?.name||''),one,r600:r6.rank,gap:r6.gap,goal,scScore:N(x.sc?.[band]?.score),historyN:N(q1?.hist_n),frontness:N(q1?.frontness5),lane:String(q1?.lane||''),position:String(q1?.position||'')});
 }
 return a.sort((x,y)=>x.goal-y.goal||N(x.no)-N(y.no));
}
function svgChart(a,axis){
 const field=Math.max(a.length,Number($('fieldSize')?.value)||a.length);
 const ht=clamp(field*25+68,280,570),top=46,bot=ht-23,xs=[77,250,424],step=(bot-top)/Math.max(1,field-1);
 const y=r=>top+(clamp(r,1,field)-1)*step;
 let out='<svg viewBox="0 0 500 '+ht+'" role="img" aria-label="1コーナー、残り600m、選択シナリオでのゴール想定順位を線で比較"><rect width="500" height="'+ht+'" rx="10" fill="#061621"/>';
 for(let i=0;i<3;i++){
  out+='<line x1="'+xs[i]+'" y1="'+top+'" x2="'+xs[i]+'" y2="'+bot+'" stroke="#315164" stroke-dasharray="4 5" stroke-width="1"/>';
  out+='<text x="'+xs[i]+'" y="20" text-anchor="middle" fill="#d5e5ef" font-size="15" font-weight="700">'+['1コーナー','残600m','ゴール想定'][i]+'</text>';
 }
 out+='<line x1="36" y1="'+y(3.5)+'" x2="473" y2="'+y(3.5)+'" stroke="#486249" stroke-dasharray="5 5"/>';
 out+='<text x="23" y="'+(y(1)+4)+'" text-anchor="middle" fill="#88abbc" font-size="12">1位</text>';
 out+='<text x="23" y="'+(y(field)+4)+'" text-anchor="middle" fill="#88abbc" font-size="12">'+field+'位</text>';
 const order=a.slice().sort((p,q)=>(p.no===selected?2:p.no===axis?1:0)-(q.no===selected?2:q.no===axis?1:0));
 for(const h of order){
  const active=h.no===selected,ax=h.no===axis,color=active?'#ffd17f':ax?'#68dfc7':'#66879d';
  const points=[[xs[0],h.one],[xs[1],h.r600],[xs[2],h.goal]].filter(v=>Number.isFinite(v[1]));
  const pts=points.map(p=>p[0]+','+y(p[1])).join(' ');
  if(points.length>=2)out+='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="'+(active?4:ax?3:1.3)+'" opacity="'+(active?1:ax?0.85:0.23)+'" stroke-linejoin="round" stroke-linecap="round"/>';
  for(const p of points){
   out+='<circle cx="'+p[0]+'" cy="'+y(p[1])+'" r="'+(active?10:ax?7:3.7)+'" fill="'+color+'" opacity="'+(active?1:ax?0.95:0.5)+'" data-rpv-no="'+esc(h.no)+'"/>';
   if(active)out+='<text x="'+p[0]+'" y="'+(y(p[1])+3.7)+'" fill="#18222e" text-anchor="middle" font-size="10" font-weight="900" pointer-events="none">'+esc(h.no)+'</text>';
  }
 }
 return out+'</svg>';
}
function focus(h,field){
 if(!h)return '';
 const fmt=r=>Number.isFinite(r)?r.toFixed(Math.abs(r-Math.round(r))<.11?0:1)+'番手':'—';
 const posterior=Number.isFinite(h.one)&&h.one>=Math.ceil(field*.70);
 let alert='';
 if(!Number.isFinite(h.one))alert='初コーナー予測は過去走数が足りないため未算出です。';
 else if(posterior)alert='序盤後方見込み。スタートで置かれるか、意図して控えるかは区別できません。';
 else alert='初コーナーの位置予測であり、ゲートの反応や出遅れは予測していません。';
 return '<div class="rpvFocus"><h4>注目｜'+esc(h.no)+'番 '+esc(h.name)+'</h4><div class="rpvFocusGrid">'+
 '<div class="rpvMetric"><small>1コーナー</small><b>'+fmt(h.one)+'</b></div>'+
 '<div class="rpvMetric"><small>残600m</small><b>'+fmt(h.r600)+'</b></div>'+
 '<div class="rpvMetric"><small>ゴール想定</small><b>'+fmt(h.goal)+'</b></div></div>'+
 '<div class="rpvAlert">'+esc(alert)+'<br>残600mの先頭差目安：'+(finite(h.gap)?h.gap.toFixed(2)+'秒':'—')+' ／ 残600m→ゴール見込み：'+(h.r600>h.goal?'↑ '+(h.r600-h.goal)+'頭前へ':h.r600<h.goal?'↓ '+(h.goal-h.r600)+'頭後退':'位置を維持')+'</div></div>';
}
function render(force){
 const slot=$('imsFlowBody');
 if(!slot)return;
 style();
 let root=$('raceProgressV1');
 if(!root){root=document.createElement('section');root.id='raceProgressV1';slot.appendChild(root);}
 const rid=raceId();
 if(rid!==lastRace){lastRace=rid;selected='';touchedBand=false;last='';}
 const p=probabilities();
 if(!touchedBand&&p){band=p.indexOf(Math.max(...p));}
 const a=window.RSAAnalysisTransitionState?.status==='running'?[]:rows();
 const axis=String(window.ProductionDecisionPipelineV1State?.stages?.axis?.no||window.DecisionShellV2State?.structure?.axis?.no||'');
 if(a.length&&(!selected||!a.some(x=>x.no===selected)))selected=a.some(x=>x.no===axis)?axis:a[0].no;
 const sig=JSON.stringify([rid,band,selected,axis,p,a.map(x=>[x.no,x.name,x.one,x.r600,x.gap,x.goal,x.scScore,x.historyN])]);
 if(!force&&sig===last)return;
 last=sig;
 const hero='<div class="rpvHero"><div><small>RACE PROGRESSION · VISUAL</small><strong>🏁 レース推移シミュレーター</strong></div><span class="rpvTag">分析補助</span></div>';
 if(!a.length){
  root.innerHTML=hero+'<div class="rpvWaiting">隊列・残600m・シナリオ別M3の計算結果を読み込み中です。<br>過去走CSVを設定してレースを分析してください。</div>';
  window.RaceProgressVisualV1State={ready:false,version:V,displayOnly:true};
  return;
 }
 const field=Math.max(a.length,Number($('fieldSize')?.value)||a.length);
 const bands='<div class="rpvBands" role="group" aria-label="展開シナリオ選択">'+LABELS.map((nm,i)=>'<button type="button" class="rpvBand" data-rpv-band="'+i+'" aria-pressed="'+String(band===i)+'">'+nm+'<small>'+(p?Math.round(p[i]*100)+'%':'確率未取得')+'</small></button>').join('')+'</div>';
 const h=a.find(x=>x.no===selected);
 const list='<div class="rpvSectionTitle">馬ごとの推移（タップで強調）</div><div class="rpvList">'+a.map(x=>'<button type="button" class="rpvHorse" data-rpv-no="'+esc(x.no)+'" data-selected="'+String(x.no===selected)+'"><span class="rpvNo">'+esc(x.no)+'</span><span><span class="rpvName">'+esc(x.name)+(x.no===axis?'　◎軸':'')+'</span><small class="rpvDetail">初角 '+(finite(x.one)?x.one.toFixed(1)+'番手':'不明')+' → 残600 '+x.r600+'番手 → ゴール '+x.goal+'位目安</small></span><span class="rpvEnd">'+(x.r600>x.goal?'↗':x.r600<x.goal?'↘':'→')+' '+x.goal+'位</span></button>').join('')+'</div>';
 root.innerHTML=hero+
 '<p class="rpvLead">選んだ展開なら、各馬がどのあたりにいそうかを比較。軸馬や全頭の順位・確率は変更しません。</p>'+
 bands+'<div class="rpvSub"><b>シナリオ｜'+LABELS[band]+'</b><span>各馬の線は予測位置の移り変わり</span></div>'+
 '<div class="rpvCanvas">'+svgChart(a,axis)+'</div>'+
 '<div class="rpvLegend"><span><i class="rpvSwatch" style="background:#ffd17f"></i>選択中の馬</span><span><i class="rpvSwatch" style="background:#68dfc7"></i>アプリ軸</span><span><i class="rpvSwatch" style="background:#66879d"></i>その他</span></div>'+
 focus(h,field)+list+
 '<div class="rpvNote">【読み方】1コーナー＝予測隊列の番手／残600m＝予測タイム差から並べた相対位置／ゴール想定＝選択した展開帯のM3系スコア順位。3点を線でつないだ表示で、実際の通過順・着順や連続した移動を物理的にシミュレートしたものではありません。<br>スタート反応・出遅れ・進路取り・内外馬場バイアスはこの推移図で直接推定していません。馬場は実際の映像と照合してください。シナリオの切り替えは表示だけで、本番の軸・相手・買い目判定には影響しません。</div>';
 window.RaceProgressVisualV1State={ready:true,version:V,displayOnly:true,productionChanged:false,scenarioBand:band,selectedHorseNo:selected,axisNo:axis,fieldSize:field,rows:a.map(x=>({no:x.no,firstCornerExpectedRank:x.one,remaining600ExpectedRank:x.r600,remaining600Gap:x.gap,scenarioGoalRank:x.goal})),at:Date.now()};
}
function schedule(ms){
 clearTimeout(timer);
 timer=setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render(false);});},ms||60);
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-rpv-band]');
 if(b&&$('raceProgressV1')?.contains(b)){band=Number(b.dataset.rpvBand);touchedBand=true;last='';render(true);return;}
 const h=e.target.closest?.('[data-rpv-no]');
 if(h&&$('raceProgressV1')?.contains(h)){selected=String(h.dataset.rpvNo);last='';render(true);}
});
addEventListener('rsa-analysis-start',()=>{selected='';touchedBand=false;last='';schedule(80);});
['rsa-analysis-complete','finish600-ready','remaining600-validated-ready','validated-queue-ready','mobile-analysis-core-ready','production-decision-pipeline-ready','rsa-addons-ready'].forEach(e=>addEventListener(e,()=>schedule(90)));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id))schedule(160)},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(180),{once:true});else schedule(180);
})();