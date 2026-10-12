(()=>{'use strict';
if(window.__V4_VALIDATED_FLOW_CAPTURE_GUARD_V1)return;window.__V4_VALIDATED_FLOW_CAPTURE_GUARD_V1=true;
const KEY='rsa-v4-validated-flow-cache-v2';
let timer=null,activeFrame=null,boundWindow=null;
const N=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
function raceKey(){const r=window.V4AppState?.state?.race||{};return[r.raceDate,r.venue,r.raceName,r.surface,r.distance,r.fieldSize,r.grade,r.going].join('|')}
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function write(x){try{localStorage.setItem(KEY,JSON.stringify(x));return true}catch{return false}}
function capture(frame){
  if(!frame)return false;
  let w,d;try{w=frame.contentWindow;d=frame.contentDocument}catch{return false}
  if(!w)return false;
  const f=w.Finish600State;if(!f?.ready||!(f.rows||[]).length)return false;
  const key=raceKey();let x=read();if(!x||x.raceKey!==key)x={raceKey:key,build:'20261009v4d3-ui2'};
  x.f=(f.rows||[]).map(a=>({
    no:String(a.no),rank:N(a.finishRank),gap:N(a.predGap),close:N(a.close),score:N(a.score),move:N(a.move),
    sc:(a.sc||[]).map(b=>({rank:N(b.rank),score:N(b.score)})),
    beta:(a.beta||[]).map(b=>({t:b.t,d:b.d}))
  }));
  const p=w.RPCIFitBetaState;if(p?.ready)x.fit={exp:N(p.expectedRPCI),band:N(p.expectedBand),p:(p.probabilities||[]).map(N),rows:(p.rows||[]).map(a=>({no:String(a.no),level:a.level,label:a.label,n:N(a.n),good:N(a.good),avg:N(a.avgPct),pr:N(a.avgPr)}))};
  const s=w.ScenarioStatisticsState;if(s?.ready)x.scen={p:(s.scenarioProbabilities||[]).map(N),neff:N(s.effectiveScenarios),shape:s.packShape||''};
  const q=w.ValidatedQueueState;if(q?.ready)x.q=(q.rows||[]).map(a=>({no:String(a.no),name:a.name,v:!!a.validated,pos:N(a.expectedRank),lab:a.position,n:N(a.hist_n),lane:a.lane,frame:N(a.frame)}));
  const r=w.Remaining600ValidatedState;if(r?.ready)x.r=(r.rows||[]).map(a=>({no:String(a.no),pred:N(a.pred),pct:N(a.rankPct)}));
  if(d)x.queue=(d.getElementById('queueText')?.textContent||x.queue||'').replace(/\s+/g,' ').trim();
  x.capturedAt=Date.now();
  const ok=write(x);if(ok)dispatchEvent(new CustomEvent('v4-validated-flow-captured',{detail:{raceKey:key,rows:x.f.length}}));return ok;
}
function stop(){if(timer){clearInterval(timer);timer=null}}
function bind(frame){
  if(!frame||frame===activeFrame)return;activeFrame=frame;stop();
  const take=()=>capture(frame);
  function attach(){try{const w=frame.contentWindow;if(w&&w!==boundWindow){boundWindow=w;['finish600-ready','remaining600-validated-ready','rpci-fit-beta-ready','scenario-statistics-ready','validated-queue-ready','four-axis-integration-ready'].forEach(ev=>w.addEventListener(ev,take));}}catch{}take()}
  attach();frame.addEventListener('load',attach,{once:true});
  timer=setInterval(()=>{take();if(!frame.isConnected){take();stop();activeFrame=null;boundWindow=null}},40);
}
function init(){const host=document.getElementById('engineHost');if(!host)return;new MutationObserver(()=>{const f=host.querySelector('iframe');if(f)bind(f);else if(activeFrame){capture(activeFrame);stop();activeFrame=null;boundWindow=null}}).observe(host,{childList:true});const f=host.querySelector('iframe');if(f)bind(f)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();