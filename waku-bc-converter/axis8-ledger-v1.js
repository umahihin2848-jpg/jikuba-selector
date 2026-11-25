/* New selector ledger; no legacy axis or ticket dependency. */
(function(root){'use strict';if(root.RSAAxis8LedgerCore)return;const C=(function ledgerCore(){
 const V="axis8-ledger-v1", norm=x=>String(x??"").normalize("NFKC").trim(), clone=x=>JSON.parse(JSON.stringify(x)), finite=x=>typeof x==="number"&&Number.isFinite(x), prob=x=>finite(x)&&x>=0&&x<=1;
 const ok=(x,msg)=>{if(!x)throw Error(msg)};
 function raceKey(s){const m=s.meta||{};return JSON.stringify([m.raceDate,m.venue,norm(m.raceName),m.grade,m.surface,m.distance]);}
 function validate(s){
  ok(s&&s.version==="axis8-primary-20261125-v1"&&s.numberMappingConfirmed===true,"新版予測・馬番照合が必要");
  const m=s.meta||{},r=s.roster||[],p=s.partners||[],ids=r.map(h=>String(h.no)),set=new Set(ids),axis=String(s.axis?.no||"");
  ok(/^\d{4}-\d{2}-\d{2}$/.test(m.raceDate||"")&&m.venue&&norm(m.raceName)&&m.grade&&m.surface&&Number(m.distance)>0,"レース情報が不足");
  ok(r.length>=12&&r.length<=18&&Number(m.fieldSize)===r.length&&set.size===r.length&&set.has(axis)&&r.every(h=>/^[1-9]\d*$/.test(String(h.no))&&norm(h.name)),"出走馬照合エラー");
  ok(["S","A","B","C"].includes(s.tier)&&s.calibrated?.length===3&&s.calibrated.every(prob)&&s.calibrated[0]<=s.calibrated[1]&&s.calibrated[1]<=s.calibrated[2],"軸確率エラー");
  ok(p.length===r.length-1&&new Set(p.map(h=>String(h.no))).size===p.length&&p.every(h=>set.has(String(h.no))&&String(h.no)!==axis&&norm(h.name)===norm(r.find(a=>String(a.no)===String(h.no))?.name)&&prob(h.q)&&prob(h.w)&&typeof h.selected==="boolean"),"相手確率エラー");
  ok(Math.abs(p.reduce((v,h)=>v+h.q,0)-1)<1e-6&&Math.abs(p.reduce((v,h)=>v+h.w,0)-2)<1e-6,"相手確率合計エラー");
  ok(["direct_cond","win_PL_reference"].includes(s.source)&&["q","w"].includes(s.metric)&&[.65,.75,.8,.9].includes(s.target),"選定条件エラー");
  let c=0;const div=s.metric==="w"?2:1;
  for(let i=0;i<p.length;i++){const h=p[i];ok(h.selected===(c<s.target-1e-12)&&(!i||p[i-1][s.metric]>=h[s.metric]),"候補順・範囲エラー");c+=h[s.metric]/div;}
  const cover=p.filter(h=>h.selected).reduce((v,h)=>v+h[s.metric]/div,0);
  ok(finite(s.coverage)&&Math.abs(cover-s.coverage)<1e-6&&cover>=s.target-1e-10,"カバー率エラー");
  return true;
 }
 function freeze(s,records,notes,now,attested){
  ok(attested===true,"発走前の自己申告が必要");validate(s);const key=raceKey(s);ok(!records.some(r=>r.key===key),"このレースは固定済み。上書きしません");
  ok(typeof now==="string"&&Number.isFinite(Date.parse(now)),"記録時刻エラー");
  return {version:V,key,fixedAt:now,preRaceSelfAttested:true,forecast:clone(s),notes:String(notes||"").slice(0,4000),outcome:null};
 }
 function parseOrder(text,roster,count){const parts=norm(text).split(/[\s,、]+/).filter(Boolean);const ids=new Set(roster.map(h=>String(h.no)));ok(parts.length===count&&new Set(parts).size===count&&parts.every(v=>ids.has(v)),"馬番・頭数・重複を確認してください");return parts;}
 function settle(record,top,corner,now){
  ok(record?.version===V&&!record.outcome,"既に結果が固定済みです");const s=record.forecast;validate(s);
  const podium=parseOrder(top,s.roster,3),order=norm(corner)?parseOrder(corner,s.roster,s.roster.length):null;
  const a=String(s.axis.no),rank=podium.indexOf(a)+1,chosen=new Set(s.partners.filter(h=>h.selected).map(h=>String(h.no))),captured=podium.filter(n=>n!==a&&chosen.has(n)).length;
  const rows=s.formation?.rows||[],err=order?rows.filter(h=>finite(h.expectedRank)&&order.includes(String(h.no))).map(h=>Math.abs(h.expectedRank-(order.indexOf(String(h.no))+1))):[];
  return {...clone(record),outcome:{recordedAt:now,top3:podium,firstCornerOrder:order,axisWin:rank===1,axisTop2:rank>0&&rank<=2,axisTop3:rank>0,conditionalCaptured:rank>0?captured:null,conditionalTarget:rank>0?2:null,quinellaPartnerCaptured:rank>0&&rank<=2?chosen.has(podium[rank===1?1:0]):null,cornerMAE:err.length?err.reduce((a,b)=>a+b,0)/err.length:null,cornerCount:err.length}};
 }
 return {version:V,validate,raceKey,freeze,settle,parseOrder};
})();root.RSAAxis8LedgerCore=C;(function ledgerUI(root,C){
 if(!root.document)return;
 const D=root.document,$=id=>D.getElementById(id),key="rsa-axis8-ledger-v1",esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),pct=x=>typeof x==="number"?(100*x).toFixed(1)+"%":"—";
 let current="",listSig="",inputSig="",locked=false;
 function records(){const raw=root.localStorage.getItem(key);if(raw===null)return [];const a=JSON.parse(raw);if(!Array.isArray(a)||a.some(r=>r?.version!==C.version||typeof r.key!=="string"||!r.forecast))throw Error("保存データの形式が不正です。上書きしません");return a;}
 function write(a){root.localStorage.setItem(key,JSON.stringify(a));}
 function say(t){const e=$("a8LedgerStatus");if(e)e.textContent=t;}
 function ensure(){if($("axis8Ledger"))return true;const host=$("axis8Primary");if(!host)return false;
  const el=D.createElement("details");el.id="axis8Ledger";el.innerHTML='<summary>予想記録・結果照合（新版）</summary><p>発走前の予測を固定。馬券や金額は記録しません。保存はこの端末のみ。発走前かは自己申告です。</p><div id="a8LedgerCurrent"></div><label>予想メモ<textarea id="a8LedgerNotes" maxlength="4000" rows="3"></textarea></label><label><input type="checkbox" id="a8LedgerAttest"> 発走前・確定馬番を確認済み</label><button type="button" id="a8LedgerFreeze">予測を固定</button><hr><label>保存したレース<select id="a8LedgerPick"></select></label><div id="a8LedgerRecord"></div><div id="a8LedgerOutcome" hidden><label>確定1・2・3着の馬番（順番）<input id="a8LedgerTop" placeholder="5 8 3"></label><label>初角の全馬通過順（任意、同着・並列・取消は入力しない）<textarea id="a8LedgerCorner" rows="2"></textarea></label><button type="button" id="a8LedgerSettle">結果を固定</button></div><button type="button" id="a8LedgerExport">全記録JSONを保存</button><p id="a8LedgerStatus" role="status" aria-live="polite"></p>';
  host.appendChild(el);
  el.addEventListener("change",e=>{if(e.target.id==="a8LedgerPick"){current=e.target.value;showRecord(true);}if(e.target.id==="a8LedgerAttest")refresh();});
  el.addEventListener("click",e=>{const id=e.target.id;if(!["a8LedgerFreeze","a8LedgerSettle","a8LedgerExport"].includes(id)||locked)return;locked=true;try{
   if(id==="a8LedgerFreeze"){const s=root.RSAAxis8SnapshotV1?.getSnapshot();if(!s)throw Error("現在の予測は未確定です");const a=records(),rec=C.freeze(s,a,$("a8LedgerNotes").value,new Date().toISOString(),$("a8LedgerAttest").checked);write([...a,rec]);current=rec.key;$("a8LedgerNotes").value="";$("a8LedgerAttest").checked=false;refresh();say("予測を固定しました");}
   if(id==="a8LedgerSettle"){const a=records(),i=a.findIndex(r=>r.key===current);if(i<0)throw Error("保存レースを選択してください");a[i]=C.settle(a[i],$("a8LedgerTop").value,$("a8LedgerCorner").value,new Date().toISOString());write(a);showRecord(true);say("結果を固定しました");}
   if(id==="a8LedgerExport"){const url=root.URL.createObjectURL(new Blob([JSON.stringify({version:C.version,records:records()},null,2)],{type:"application/json"})),a=D.createElement("a");a.href=url;a.download="axis8-predictions.json";D.body.appendChild(a);a.click();a.remove();setTimeout(()=>root.URL.revokeObjectURL(url),1000);}
  }catch(err){say(String(err.message||err));}finally{locked=false;}});
  return true;
 }
 function showRecord(reset=false){
  const a=records(),r=a.find(x=>x.key===current),s=r?.forecast,o=r?.outcome;
  $("a8LedgerRecord").textContent=r?`${s.meta.raceDate} ${s.meta.venue} ${s.meta.raceName}｜${s.tier}・軸 ${s.axis.no} ${s.axis.name}｜3着内 ${pct(s.calibrated[2])}｜相手 ${s.partners.filter(h=>h.selected).length}頭｜${o?"結果 "+o.top3.join(" → ")+"・軸 "+(o.axisTop3?"好走":"圏外")+(o.axisTop3?"・相手捕捉 "+o.conditionalCaptured+"/2":"")+(o.cornerMAE===null?"":"・初角平均誤差 "+o.cornerMAE.toFixed(2)+"番手"):"結果未入力"}｜${s.source==="direct_cond"?"券種別オッズ":"単勝PL参考"}｜${r.notes||""}`:"保存レースなし";
  $("a8LedgerOutcome").hidden=!r||!!o;if(reset){$("a8LedgerTop").value="";$("a8LedgerCorner").value="";}
 }
 function refresh(){
  if(!ensure())return;
  try{
   const a=records(),s=root.RSAAxis8SnapshotV1?.getSnapshot(),k=s?C.raceKey(s):"",sig=JSON.stringify([k,s?.generation,s?.winInput,s?.pairInput,s?.target,s?.metric,s?.tier,s?.axis?.no]);
   if(sig!==inputSig){inputSig=sig;$("a8LedgerAttest").checked=false;}
   const exists=k&&a.some(r=>r.key===k);
   $("a8LedgerCurrent").textContent=s?`${s.tier}｜${s.axis.no} ${s.axis.name}｜${pct(s.calibrated[2])}｜相手 ${s.partners.filter(h=>h.selected).length}頭｜${s.formation?"隊列あり":"隊列未確定"}${exists?"｜固定済み":""}`:"新版の予測確定待ち（未反映の入力を確認）";
   $("a8LedgerFreeze").disabled=!s||!!exists||!$("a8LedgerAttest").checked;
   const ls=JSON.stringify(a.map(r=>[r.key,r.fixedAt,r.outcome?.recordedAt]));
   if(ls!==listSig){listSig=ls;if(!a.some(r=>r.key===current))current=a.at(-1)?.key||"";$("a8LedgerPick").innerHTML=a.map(r=>'<option value="'+esc(r.key)+'">'+esc(r.forecast.meta.raceDate+" "+r.forecast.meta.raceName)+'</option>').join("");$("a8LedgerPick").value=current;showRecord(true);}
  }catch(err){$("a8LedgerFreeze").disabled=true;say("記録を読み込めません："+String(err.message||err));}
 }
 root.addEventListener("axis8-snapshot-changed",refresh);
 root.addEventListener("storage",e=>{if(e.key===key)refresh();});
 if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",refresh,{once:true});else refresh();
})(root,C);})(typeof window!=='undefined'?window:globalThis);
