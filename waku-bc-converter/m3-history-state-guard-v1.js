(()=>{'use strict';
const C=window.ShapeCore;if(!C)return;
function sameRace(){const s=window.M3HistoryAmountState,f=window.Finish600State?.rows||[];if(!s?.results?.length||!f.length||s.results.length!==f.length)return false;const m=new Map(f.map(r=>[String(r.no),String(r.name||'')]));return s.results.every(r=>m.get(String(r.no))===String(r.name||''))}
function clearMismatch(){if(window.M3HistoryAmountState&&!sameRace())window.M3HistoryAmountState=null}
const old=C.analyze;C.analyze=function(...args){window.M3HistoryAmountState=null;return old.apply(this,args)};
addEventListener('finish600-ready',clearMismatch);addEventListener('m3-history-amount-ready',clearMismatch);
})();