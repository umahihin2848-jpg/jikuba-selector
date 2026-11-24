/* Postrace corner UI: manual result lock, table, 3 stage views. Research-only. */
(function(root){"use strict";
const VERSION="postrace-corner-ui-v1-20261124",PFX="rsa-postrace-corner-v1:";
const $=id=>root.document?.getElementById(id);
const H=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const C=()=>root.RSAPostraceCornerCoreV1;
const context=()=>root.RSAForecastWorkflowV1?.getPostraceContext?.()||null;
let currentKey="",record=null,stage="pred",timer=0;
function loadContext(){
 const x=context();
 if(!x||!x.ready||x.roster.length<12||x.roster.length>18)return null;
 if(x.key!==currentKey){
  currentKey=x.key;record=null;stage="pred";
  try{
   const saved=JSON.parse(root.localStorage.getItem(PFX+currentKey)||"null");
   if(C().validSaved(saved,x))record=saved;
  }catch(_){}
  if($("rfwCornerPaste"))$("rfwCornerPaste").value="";
 }
 return x;
}
function ensure(){
 const base=$("rsaForecastWorkflowV1");
 if(!base||!root.document?.createElement)return null;
 if($("rfwCornerAuditV1"))return $("rfwCornerAuditV1");
 const x=root.document.createElement("section");
 x.id="rfwCornerAuditV1";x.className="rfw-card";
 x.innerHTML='<h3>レース後｜初角・3角・4角の実際の位置</h3>'+
 '<p class="rfw-small">TARGETなどで実際の通過順位を全頭分確認して入力します。登録後は「展開隊列」タブで地点ごとの全頭配置を切り替え可能。結果は自動取得しません。</p>'+
 '<div id="rfwCornerEntry" class="rfw-fields">'+
 '<div><label for="rfwFirstCorner">最初に記録されている角</label><select id="rfwFirstCorner"><option value="1">1角</option><option value="2">2角</option><option value="3">3角</option><option value="4">4角</option></select></div>'+
 '<div><label for="rfwCornerPaste">全頭結果（馬番 初角 3角 4角）</label><textarea id="rfwCornerPaste" rows="7" spellcheck="false" placeholder="1 3 4 5&#10;2 1 1 2&#10;3 - 9 8"></textarea>'+
 '<p class="rfw-small">半角スペース・カンマ・タブ区切り。記録されない角は「-」。TARGETの同順位はそのまま入力。最初の記録が3角の場合、初角と3角は同一の順位です。</p></div>'+
 '<button type="button" id="rfwCornerSave">レース後の結果を固定保存</button></div>'+
 '<p id="rfwCornerMessage" class="rfw-small" aria-live="polite"></p><div id="rfwCornerResults"></div>'+
 '<div class="rfw-actions"><button type="button" id="rfwCornerExport" disabled>結果・予想のJSONを出力</button></div>';
 base.appendChild(x);
 x.addEventListener("click",e=>{
  if(e.target.id==="rfwCornerSave")save();
  if(e.target.id==="rfwCornerExport")exportData();
 });
 return x;
}
function status(msg,error=false){
 const e=$("rfwCornerMessage");
 if(e){e.textContent=msg;e.style.color=error?"#ffcfb2":"#adddcc"}
}
function panel(ctx){
 const el=ensure();if(!el)return;
 const entry=$("rfwCornerEntry"),out=$("rfwCornerResults"),exp=$("rfwCornerExport");
 if(!ctx){entry.hidden=true;exp.disabled=true;out.innerHTML="";status("レース解析後に実測順位を登録できます。");return}
 if(ctx.turn==="straight"){entry.hidden=true;exp.disabled=true;out.innerHTML="";status("新潟芝1000mなど直線コースにはコーナーがないため、比較対象外です。");return}
 entry.hidden=!!record;exp.disabled=!record;
 if(!record){out.innerHTML="";status("レース後に通過順位を入力してください。発走前の予想は書き換えません。");return}
 const info=C().compare(ctx,record);
 status("実測登録済み："+record.recordedAtDevice+"（端末時刻・固定）");
 let top;
 if(info.frozen){
  top='<b>事前固定の初角予測との比較</b><p>対象'+info.count+'頭・平均絶対誤差 '+(info.mae===null?"—":info.mae.toFixed(2)+"頭")+
   '・平均偏差 '+(info.bias===null?"—":(info.bias>0?"+":"")+info.bias.toFixed(2)+"頭")+'</p>';
 }else{
  top='<b>実際の通過順位のみ</b><p>事前に固定した予想がないため、後付けの予想精度は計算しません。</p>';
 }
 const rows=info.rows.map(h=>{
  const label=h.no===ctx.axis?"軸":ctx.partners.includes(h.no)?"相手":"";
  const fmt=(x,d)=>x===null||x===undefined?"—":Number(x).toFixed(d);
  return '<tr><th>'+H(h.no+" "+h.name)+(label?' <small>['+label+']</small>':"")+'</th>'+
   '<td>'+(info.frozen?fmt(h.pred,1):"—")+'</td><td>'+fmt(h.initial,0)+'</td>'+
   '<td>'+fmt(h.c3,0)+'</td><td>'+fmt(h.c4,0)+'</td>'+
   '<td>'+(h.delta===null?"—":(h.delta>0?"+":"")+h.delta.toFixed(1))+'</td></tr>';
 }).join("");
 out.innerHTML='<div class="rfw-corner-summary">'+top+
  '<p class="rfw-small">初角差＝実測−事前予想。プラスは想定より後ろ。3角・4角は実測のみで、予測していない通過順位を後付けしません。</p></div>'+
  '<div class="rfw-corner-scroll"><table><thead><tr><th>馬番・馬名</th><th>予想初角</th><th>実測初角</th><th>実測3角</th><th>実測4角</th><th>差</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="rfw-small">同順位や欠測はそのまま保持。固定時刻は端末自己申告であり、公式の発走前証明ではありません。</p>';
}
function formation(ctx){
 const container=$("rsafFormation");
 if(!ctx||!container||container.hidden)return;
 const base=container.querySelector(".rfw-course-map");
 if(!base)return;
 let tabs=$("rfwCornerStageTabs");
 if(!tabs){tabs=root.document.createElement("div");tabs.id="rfwCornerStageTabs";tabs.className="rfw-corner-tabs";container.insertBefore(tabs,base)}
 const choices=["pred"];
 if(record)for(const k of ["initial","c3","c4"]){
  if(ctx.roster.some(h=>record.actual[String(h.no)]?.[k]!==null))choices.push(k);
 }
 if(!choices.includes(stage))stage="pred";
 tabs.innerHTML='<b>隊列位置の表示</b>'+choices.map(k=>{
  const name=k==="pred"?"予想・初角":k==="initial"?"実際・初角":k==="c3"?"実際・3角":"実際・4角";
  return '<button type="button" data-rfw-stage="'+k+'" aria-pressed="'+(stage===k)+'">'+name+'</button>';
 }).join("");
 base.hidden=stage!=="pred";
 let actual=$("rfwCornerActualStage");
 if(!actual){actual=root.document.createElement("div");actual.id="rfwCornerActualStage";container.insertBefore(actual,base.nextSibling)}
 actual.hidden=stage==="pred";
 if(stage==="pred"||!record){actual.innerHTML="";return}
 const draw=C().actualMap(ctx,record,stage,ctx.turn||"right");
 const where=stage==="initial"?"初記録角（"+C().label(record.firstCorner)+"）":stage==="c3"?"3角":"4角";
 actual.innerHTML='<div class="rfw-course-map"><div class="rfw-corner-stage-heading"><b>実際の'+where+'｜全'+ctx.roster.length+'頭</b><small>順位記録 '+draw.known.length+'頭</small></div>'+
  (draw.known.length?draw.svg:'<div class="rfw-uncertain">この角の実測はありません。</div>')+
  (draw.unknown.length?'<div class="rfw-uncertain">未記録：'+draw.unknown.map(h=>H(h.no+" "+h.name)).join(" / ")+'</div>':"")+
  '<p class="rfw-small">前後の実測順位を表示。縦の段分けは重なり防止で、実際の内外の進路ではありません。右・左はコースに合わせて表示のみ反転。</p></div>';
}
function save(){
 const ctx=loadContext();if(!ctx)return status("レース解析がまだ完了していません",true);
 if(record)return status("結果は既に固定済みのため上書きできません",true);
 if(ctx.turn==="straight")return status("直線コースはコーナーがありません",true);
 const parsed=C().parse($("rfwCornerPaste").value,ctx.roster,$("rfwFirstCorner").value);
 if(!parsed.ok)return status(parsed.errors.slice(0,5).join("／"),true);
 const day=Date.parse(ctx.race.date+"T00:00:00");
 if(!Number.isFinite(day))return status("レース日付を確認してください",true);
 if(Date.now()<day)return status("レース日付が未来です。レース後に入力してください",true);
 const entry={version:VERSION,raceKey:ctx.key,race:ctx.race,firstCorner:parsed.firstCorner,actual:parsed.values,
  recordedAtDevice:new Date().toISOString(),source:"manual_postrace_unverified"};
 try{root.localStorage.setItem(PFX+ctx.key,JSON.stringify(entry))}
 catch(_){return status("端末内の保存に失敗しました。保存容量を確認してください",true)}
 record=entry;stage="initial";panel(ctx);formation(ctx);
}
function exportData(){
 const ctx=loadContext();if(!ctx||!record)return;
 const payload={...record,exportedAtDevice:new Date().toISOString(),predictionSnapshot:C().frozen(ctx)};
 const blob=new root.Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
 const url=root.URL.createObjectURL(blob),a=root.document.createElement("a");
 a.href=url;a.download="postrace_corners_"+String(ctx.race.date||"race").replace(/[^0-9-]/g,"")+".json";
 root.document.body.appendChild(a);a.click();a.remove();
 root.setTimeout(()=>root.URL.revokeObjectURL(url),1500);
}
function render(){const ctx=loadContext();panel(ctx);formation(ctx)}
function schedule(){root.clearTimeout(timer);timer=root.setTimeout(render,70)}
root.RSAPostraceCornerUIV1=Object.freeze({version:VERSION});
if(!root.document?.createElement||typeof root.addEventListener!=="function")return;
root.document.addEventListener("click",e=>{
 const b=e.target.closest?.("[data-rfw-stage]");
 if(b&&record){stage=b.dataset.rfwStage;formation(loadContext())}
},true);
for(const ev of ["rsa-forecast-formation-rendered","rsa-analysis-complete","rsa-focused-partner-ready","validated-queue-ready","course-geometry-ready"])root.addEventListener(ev,schedule);
root.document.addEventListener("change",e=>{if(["raceDate","venue","surface","raceName","grade","distance","courseRoute"].includes(e.target?.id))schedule()},true);
if(root.document.readyState==="loading")root.addEventListener("DOMContentLoaded",()=>{schedule();root.setTimeout(render,400)},{once:true});
else{schedule();root.setTimeout(render,400)}
})(typeof window!=="undefined"?window:globalThis);
