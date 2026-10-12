(()=>{'use strict';
if(window.__V4_FINAL_FLOW_HANDOFF_V1)return;window.__V4_FINAL_FLOW_HANDOFF_V1=true;
const KEY='rsa-v4-validated-flow-cache-v2';
const N=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
function raceKey(){const r=window.V4AppState?.state?.race||{};return[r.raceDate,r.venue,r.raceName,r.surface,r.distance,r.fieldSize,r.grade,r.going].join('|')}
function previous(k){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x?.raceKey===k?x:{}}catch{return{}}}
function capture(frame){
  try{
    const w=frame?.contentWindow,d=frame?.contentDocument;if(!w)return null;
    const k=raceKey(),x={...previous(k),raceKey:k,build:'20261009v4d3-final-handoff'};
    const q=w.ValidatedQueueState;if(q?.ready)x.q=(q.rows||[]).map(a=>({no:String(a.no),name:a.name,v:!!a.validated,pos:N(a.expectedRank),lab:a.position,n:N(a.hist_n),lane:a.lane,frame:N(a.frame)}));
    const r=w.Remaining600ValidatedState;if(r?.ready)x.r=(r.rows||[]).map(a=>({no:String(a.no),pred:N(a.pred),pct:N(a.rankPct)}));
    const f=w.Finish600State;if(f?.ready)x.f=(f.rows||[]).map(a=>({no:String(a.no),rank:N(a.finishRank),gap:N(a.predGap),close:N(a.close),score:N(a.score),move:N(a.move),sc:(a.sc||[]).map(b=>({rank:N(b.rank),score:N(b.score)})),beta:(a.beta||[]).map(b=>({t:b.t,d:b.d}))}));
    const p=w.RPCIFitBetaState;if(p?.ready)x.fit={exp:N(p.expectedRPCI),band:N(p.expectedBand),p:(p.probabilities||[]).map(N),rows:(p.rows||[]).map(a=>({no:String(a.no),level:a.level,label:a.label,n:N(a.n),good:N(a.good),avg:N(a.avgPct),pr:N(a.avgPr)}))};
    const s=w.ScenarioStatisticsState;if(s?.ready)x.scen={p:(s.scenarioProbabilities||[]).map(N),neff:N(s.effectiveScenarios),shape:s.packShape||''};
    if(d)x.queue=(d.getElementById('queueText')?.textContent||'').replace(/\s+/g,' ').trim();
    x.capturedAt=Date.now();
    try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}
    window.V4ValidatedFlowHandoffState={ready:Array.isArray(x.f)&&x.f.length>0,raceKey:k,data:x,at:x.capturedAt};
    window.dispatchEvent(new CustomEvent('v4-validated-flow-handoff',{detail:window.V4ValidatedFlowHandoffState}));
    return x;
  }catch(e){console.warn('v4 final flow handoff',e);return null}
}
const nativeRemove=Element.prototype.remove;
HTMLIFrameElement.prototype.remove=function(){if(this.parentElement?.id==='engineHost')capture(this);return nativeRemove.call(this)};
window.V4FinalFlowHandoff={capture,version:'v4-final-flow-handoff-v1'};
})();