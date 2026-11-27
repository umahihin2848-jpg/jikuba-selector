"use strict";
const AbilityDCompareCore = (function makeCore(){
 const norm=v=>String(v??"").normalize("NFKC").trim();
 const keys=["raceDate","venue","raceName","grade","surface","distance","going","fieldSize"];
 function raceKey(c){if(!c?.ready||!Array.isArray(c.rows)||!Number.isInteger(c.generation))return "";return JSON.stringify([c.generation,...keys.map(k=>c.meta[k]),c.rows.map(h=>[String(h.no),norm(h.name)]).sort((a,b)=>+a[0]-+b[0])])}
 function overrides(raw,rows){const map=new Map(),valid=new Set(rows.map(h=>Number(h.no)));for(const line of norm(raw).split(/\r?\n/)){if(!line.trim())continue;const a=line.trim().split(/[\s,]+/).map(Number);if(a.length!==3||!a.every(Number.isInteger)||!valid.has(a[0])||map.has(a[0])||a[1]<2||a[1]>15||a[2]<=0||a[2]>=6000)throw Error("年齢補足は1行に「馬番 年齢 生後日数」。重複・範囲を確認してください。");map.set(a[0],{age:a[1],birthdays:a[2]})}return map}
 // Match TARGET's historical route encoding (not geometric inner/outer terminology).
 const courseMap={
  東京:{none:[1400,1600,1800,2000,2400,2500]},中山:{none:[1200,1600,1800,2000,2200,2500,3600]},
  中京:{none:[1200,1400,1600,2000,2200]},札幌:{none:[1200,1500,1800,2000,2600]},函館:{none:[1200,1800,2000,2600]},
  福島:{none:[1200,1800,2000,2600]},小倉:{none:[1200,1800,2000,2600]},
  京都:{内:[1200,2000],外:[1800,2200,2400,3000,3200]},阪神:{内:[1200,1400,2000,2200,3000,3200],外:[1600,1800,2400,2600]},
  新潟:{内:[1000,1200,1400,2200],外:[1600,1800]}
 };
 const dirtMap={東京:[1300,1400,1600,2100],中山:[1200,1800,2400,2500,3200],中京:[1200,1400,1800,1900],京都:[1200,1400,1800,1900],阪神:[1200,1400,1800,2000],新潟:[1200,1800],札幌:[1000,1700,2400],函館:[1000,1700,2400],福島:[1150,1700,2400],小倉:[1000,1700,2400]};
 function inferRoute(m){
  const v=norm(m?.venue),s=norm(m?.surface),dist=Number(m?.distance),name=norm(m?.raceName).replace(/\s/g,"");
  if(s==="ダ"||s==="ダート")return dirtMap[v]?.includes(dist)?"none":"";
  if(s!=="芝")return "";
  // Exact race aliases, only with matching grade/venue/distance.
  if(v==="京都"&&dist===1400&&norm(m.grade)==="G2"&&/^(?:MBS賞)?スワン(?:S|ステークス)(?:G2)?$/.test(name))return "外";
  if(v==="京都"&&dist===1600&&norm(m.grade)==="G1"&&/^マイル(?:CS|チャンピオンシップ)(?:G1)?$/.test(name))return "外";
  for(const [r,ds] of Object.entries(courseMap[v]||{}))if(ds.includes(dist))return r;
  return "";
 }
 const day=86400000;
 function dateParts(v){const t=norm(v);let a=t.match(/^(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})$/);if(!a){const b=t.match(/^(\d{4})(\d{2})(\d{2})$/);if(b)a=b;}if(!a)return null;const [y,m,d]=a.slice(1).map(Number),ms=Date.UTC(y,m-1,d),dt=new Date(ms);return y>=1900&&y<=2100&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?{y,ms}:null}
 function validAge(a){return !!a&&Number.isInteger(a.age)&&a.age>=2&&a.age<=15&&Number.isInteger(a.birthdays)&&a.birthdays>0&&a.birthdays<6000}
 function csvAgeIndex(grid){
  if(!Array.isArray(grid)||!grid.length)return new Map();
  const h=grid[0].map(norm),idx=k=>h.indexOf(k),i=[idx("馬名"),idx("日付"),idx("年齢"),idx("生後日数"),idx("血統登録番号")];
  if(i.slice(0,4).some(x=>x<0))return new Map();
  const out=new Map();
  for(const row of grid.slice(1)){const name=norm(row[i[0]]),d=dateParts(row[i[1]]),age=Number(norm(row[i[2]])),birthdays=Number(norm(row[i[3]])),id=i[4]>=0?norm(row[i[4]]):"";
   if(!name||!d||!validAge({age,birthdays}))continue;
   const birth=d.ms-birthdays*day,year=d.y-age;
   if(new Date(birth).getUTCFullYear()!==year)continue;
   if(/^\d{10}$/.test(id)&&Number(id.slice(0,4))!==year)continue;
   if(!out.has(name))out.set(name,[]);out.get(name).push({ms:d.ms,birth,year,id});
  }return out;
 }
 function ageFromCSV(index,name,date){
  const d=dateParts(date);if(!d)return null;
  const rows=(index?.get(norm(name))||[]).filter(h=>h.ms<d.ms);
  if(!rows.length)return null;
  // Never combine incompatible identities or inconsistent implied birth dates.
  if(new Set(rows.map(h=>h.id).filter(Boolean)).size>1||new Set(rows.map(h=>h.birth)).size>1||new Set(rows.map(h=>h.year)).size>1)return null;
  const h=rows.reduce((a,b)=>a.ms>=b.ms?a:b),a={age:d.y-h.year,birthdays:(d.ms-h.birth)/day};return validAge(a)?a:null;
 }
 function makeRace(c,db,route,raw,engine,index){if(!raceKey(c)||!c.confirmed)throw Error("メイン画面で確定馬番を照合してください。");const m=c.meta;route=route||inferRoute(m);if(!["none","内","外"].includes(route))throw Error("内外回りを特定できません。今回のコースを選択してください。");const surface=m.surface==="ダート"?"ダ":m.surface;const r={date:m.raceDate,venue:m.venue,name:m.raceName,grade:m.grade,surface,distance:Number(m.distance),route:route==="none"?"":route,horses:[]};if(c.rows.length!==Number(m.fieldSize))throw Error("頭数不一致");const ov=overrides(raw,c.rows),missing=[],ageSources={db:0,csv:0,manual:0};for(const h of c.rows){const no=Number(h.no),name=norm(h.name),manual=ov.get(no),stored=engine.ageFromDB(db,name,surface,r.date),csv=ageFromCSV(index,name,r.date);const source=manual?"manual":validAge(stored)?"db":csv?"csv":"";const a=source==="manual"?manual:source==="db"?stored:csv;if(!source||!validAge(a)){missing.push(no+" "+name);continue}ageSources[source]++;r.horses.push({no,name,...a})}if(missing.length)throw Error("年齢・生後日数を補足してください："+missing.join("、"));return {...r,ageSources}}
 function compareRows(c,p){const rows=c.rows.map(h=>({...h}));if(!p)return rows;const m=new Map(p.horses.map(h=>[Number(h.no),h]));if(m.size!==rows.length||p.horses.length!==rows.length||rows.some(h=>norm(m.get(Number(h.no))?.name)!==norm(h.name)))throw Error("Ability Dの馬番・馬名が一致しません");return rows.map(h=>({...h,d:m.get(Number(h.no))}))}
 function checkReplacement(current,next){if(current&&next.history_through<current.history_through)throw Error("古い履歴DBには置き換えられません。必要なら保存DBを削除してください。");return next}
 return {raceKey,makeRace,compareRows,overrides,checkReplacement,inferRoute,csvAgeIndex,ageFromCSV};
})();
if(typeof module!=="undefined")module.exports=AbilityDCompareCore;
(function ui(root,core){
 if(!root.document)return;
 const d=root.document,$=id=>d.getElementById(id);let db=null,prevKey="",prediction=null,predKey="",timer=0,drawKey="",dbBusy=false,csvFile=null,csvIndex=new Map(),csvBusy=false,csvRev=0;
 // Store only the validated history DB, never race input or predictions.
 function openStore(){return new Promise((resolve,reject)=>{let req;try{req=root.indexedDB.open("rsa-ability-d-history",1)}catch(err){reject(err);return}let blocked=false;req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("history"))req.result.createObjectStore("history")};req.onblocked=()=>{blocked=true;reject(Error("別タブがDBを使用中です"))};req.onerror=()=>reject(req.error||Error("端末保存を利用できません"));req.onsuccess=()=>{const conn=req.result;if(blocked){conn.close();return}conn.onversionchange=()=>conn.close();resolve(conn)}})}
 async function storeOp(kind,next){const conn=await openStore();try{return await new Promise((resolve,reject)=>{let result=null,problem=null;const tx=conn.transaction("history",kind==="read"?"readonly":"readwrite"),st=tx.objectStore("history");tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(problem||tx.error||Error("端末保存が中断されました"));tx.onerror=()=>{};if(kind==="delete"){st.delete("active");return}const req=st.get("active");req.onsuccess=()=>{if(kind==="read"){result=req.result??null;return}try{let old=null;try{if(req.result)old=AbilityD.validateDB(req.result)}catch(_){}core.checkReplacement(old,next);st.put(next,"active")}catch(err){problem=err;tx.abort()}}})}finally{conn.close()}}
 function setBusy(v){dbBusy=v;$("adcDb").disabled=v;$("adcDbDelete").disabled=v;clearPrediction();schedule()}
 function dbInfo(note){$("adcDbShort").textContent=db?"DB読込済":"DB未登録";$("adcDbShort").dataset.ready=db?"1":"0";$("adcDbInfo").textContent=(db?"履歴 "+db.history_through+" ／ "+db.complete_races+"R":"DB未読込（C・M3・M4のみ表示可能）")+(note?" ｜ "+note:"")}
 async function restoreDB(){setBusy(true);dbInfo("端末内の保存DBを確認中…");try{const saved=await storeOp("read");if(saved){db=AbilityD.validateDB(saved);dbInfo("端末保存から復元済み")}else dbInfo("初回のみ履歴DBを選択してください")}catch(err){dbInfo("保存DBを復元できません。ファイルを選択してください："+String(err.message||err))}finally{setBusy(false)}}
 async function importDB(e){const file=e.target.files?.[0];e.target.value="";if(!file||dbBusy)return;setBusy(true);dbInfo("新しいDBを検証中…");const old=db;try{if(file.size>100*1024*1024)throw Error("DBが大きすぎます");const next=AbilityD.validateDB(JSON.parse(await file.text()));core.checkReplacement(old,next);try{await storeOp("write",next);db=next;dbInfo("端末に保存済み・次回自動復元")}catch(err){if(String(err.message||err).includes("古い履歴DB"))throw err;db=next;dbInfo("今回のみ使用（端末保存に失敗）："+String(err.message||err))}}catch(err){db=old;dbInfo("更新せず："+String(err.message||err))}finally{setBusy(false)}}
 async function deleteDB(){if(dbBusy||!root.confirm("この端末のAbility D履歴DBを削除しますか？ 元のファイルは削除されません。"))return;setBusy(true);try{await storeOp("delete");db=null;dbInfo("端末保存を削除しました")}catch(err){dbInfo("削除できませんでした："+String(err.message||err))}finally{setBusy(false)}}
 const pct=p=>Number.isFinite(p)?(100*p).toFixed(1)+"%":"—";
 const ids=["raceDate","venue","raceName","grade","surface","distance","going","fieldSize","csvFile"];
 function loadCsvAges(){const f=$("csvFile")?.files?.[0]||null;if(f===csvFile)return;csvFile=f;csvIndex=new Map();csvBusy=!!f;const rev=++csvRev;clearPrediction();if(!f)return;Promise.resolve().then(async()=>{const C=root.ShapeCore;if(!C?.decode||!C?.parseCSV)throw Error("CSV読込機能未準備");return core.csvAgeIndex(C.parseCSV(C.decode(await f.arrayBuffer())))}).then(idx=>{if(rev===csvRev&&f===$("csvFile")?.files?.[0])csvIndex=idx}).catch(()=>{}).finally(()=>{if(rev===csvRev){csvBusy=false;clearPrediction();schedule()}})}
 function ensure(){const anchor=$("a8RecordHost");if(!anchor)return null;if($("abilityDCompare"))return $("abilityDCompare");
 const el=d.createElement("details");el.id="abilityDCompare";el.className="a8closing";el.open=false;
 el.innerHTML='<summary>全馬能力比較 <small id="adcDbShort" class="adcDbShort">DB確認中</small></summary><p id="adcStatus" role="status" class="a8muted"></p><details id="adcSettings" class="adcSettings"><summary>Ability DのDB・補足設定</summary><div class="adcControls"><label>Ability D専用履歴DB（初回・更新時のみ）<input id="adcDb" type="file" accept=".json,application/json"></label><p id="adcDbInfo" class="a8muted" role="status">保存DBを確認中…</p><button id="adcDbDelete" type="button" class="secondary">端末の保存DBを削除</button><p class="a8muted">履歴DBは端末・ブラウザ内に保存します。別端末とは同期しません。Safariの設定や容量により消えることがあります。更新時は新しい専用JSONを選択してください。</p><label>今回の内外回り<select id="adcRoute"><option value="">自動判定</option><option value="none">指定なし（内外区分なし）</option><option>内</option><option>外</option></select></label><p id="adcRouteInfo" class="a8muted" role="status"></p><details><summary>年齢・生後日数の補足（必要時のみ）</summary><p class="a8muted">DB・過去走CSVから自動補完します。両方で取得できない馬、年齢の訂正が必要な馬だけ入力。1行：馬番 年齢 生後日数。</p><textarea id="adcAge" rows="2" placeholder="8 4 1650"></textarea></details></div></details><div class="adcTableTools"><label><input type="checkbox" id="adcExtra"> 確率・履歴も表示</label></div><div class="adcScroll"><table class="adcTable"><thead><tr><th>馬番・馬名</th><th id="adcAbilityLabel">C/V1</th><th>M3</th><th>M4</th><th>D</th><th>D 3着内</th><th>市場3着内</th><th>履歴</th></tr></thead><tbody id="adcRows"></tbody></table></div><details class="adcExplain"><summary>指標の説明・予測記録</summary><p class="a8muted">M4＝最頻ペースの順位（同率・未確定は—）。市場＝単勝オッズの未較正PL参考値。D＝オッズ非依存のV4。緑色は各順位3位以内。履歴は同一芝ダートの対象クラスでの対戦記録数。0は未出走を意味しません。Dは研究用で、本番の軸・相手判定には反映しません。</p><button id="adcSave" type="button" class="secondary" disabled>Ability D予測記録を保存</button></details>';
 anchor.before(el);el.dataset.extra="0";$("adcExtra").addEventListener("change",()=>{el.dataset.extra=$("adcExtra").checked?"1":"0"});
 $("adcDb").addEventListener("change",importDB);
 $("adcDbDelete").addEventListener("click",deleteDB);
 restoreDB();
 for(const id of ["adcRoute","adcAge"])$(id).addEventListener("input",()=>{clearPrediction();schedule()});
 $("adcSave").addEventListener("click",()=>{update();if(!prediction)return;const u=URL.createObjectURL(new Blob([JSON.stringify(prediction,null,2)],{type:"application/json"}));const a=d.createElement("a");a.href=u;a.download="ability-d-"+prediction.race.date+"-prediction.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)});
 return el}
 function clearPrediction(){prediction=null;predKey="";drawKey="";if($("adcSave"))$("adcSave").disabled=true}
 function reset(){clearPrediction();prevKey="";if($("adcRoute"))$("adcRoute").value="";if($("adcAge"))$("adcAge").value="";if($("adcRows"))$("adcRows").replaceChildren();if($("adcStatus"))$("adcStatus").textContent="再解析待ち";schedule()}
 function schedule(){clearTimeout(timer);timer=setTimeout(update,80)}
 function update(){if(!ensure())return;loadCsvAges();let c;try{c=root.RSAAxis8ComparisonV1?.getComparison()}catch(err){c={ready:false,reason:"比較データの照合待ち"}}const k=core.raceKey(c);if(!k){clearPrediction();$("adcRows").replaceChildren();$("adcStatus").textContent=c?.reason||"レースを解析してください";return}
 if(k!==prevKey){clearPrediction();if(prevKey){$("adcRoute").value="";$("adcAge").value=""}prevKey=k}
 $("adcAbilityLabel").textContent=c.activeModel==="C"?"C":"V1";const auto=core.inferRoute(c.meta),manual=$("adcRoute").value,routeLabel=v=>v==="none"?"内外区分なし":v+"回り";$("adcRouteInfo").textContent=manual?"手動指定："+routeLabel(manual):auto?"自動判定："+routeLabel(auto):"内外回りが複数、または未登録のコースです。手動で選択してください。";
 let status=dbBusy?"履歴DBの確認中…":"専用履歴DBを読み込むとDを追加できます。";
 if(db&&!dbBusy&&csvBusy){status="過去走CSVの年齢情報を確認中…"}
 if(db&&!dbBusy&&!csvBusy){const pk=JSON.stringify([k,db.history_sha256,$("adcRoute").value,$("adcAge").value,c.confirmed,csvRev]);try{if(!prediction||pk!==predKey){clearPrediction();const r=core.makeRace(c,db,$("adcRoute").value,$("adcAge").value,AbilityD,csvIndex);prediction=AbilityD.predict(db,r);prediction.age_sources=r.ageSources;prediction.reviewed_roster=true;predKey=pk}const hs=String(prediction.history_through);const gap=(Date.parse(prediction.race.date)-Date.parse(hs.slice(0,4)+"-"+hs.slice(4,6)+"-"+hs.slice(6,8)))/86400000;status="D計算済み｜履歴0件 "+prediction.horses.filter(h=>h.history_count===0).length+"頭｜年齢補完 "+prediction.age_sources.csv+"頭（手動 "+prediction.age_sources.manual+"頭）。"+(gap>14?" 注意：履歴DBが"+gap+"日前。最近の成績が未反映です。":" 履歴最終日 "+hs);}catch(err){clearPrediction();status=String(err.message||err)}}
 $("adcStatus").textContent=status;$("adcSave").disabled=!prediction;
 let rows;try{rows=core.compareRows(c,prediction)}catch(err){clearPrediction();$("adcSave").disabled=true;$("adcStatus").textContent=err.message;rows=core.compareRows(c,null)}
 const sig=JSON.stringify([rows,c.axisNo,c.confirmed]);if(sig===drawKey)return;drawKey=sig;const tbody=$("adcRows");tbody.replaceChildren();for(const h of rows.slice().sort((a,b)=>Number(a.no)-Number(b.no))){const tr=d.createElement("tr");const name=d.createElement("td");name.textContent=(String(h.no)===String(c.axisNo)?"◎ ":"")+h.no+" "+h.name;tr.append(name);for(const v of [h.ar,h.mr,h.m4,h.d?.rank]){const td=d.createElement("td");td.textContent=Number.isFinite(v)?v:"—";if(Number.isFinite(v)&&v<=3)td.className="adcTop";tr.append(td)}for(const v of [pct(h.d?.p3),pct(h.market3),h.d?.history_count??"—"]){const td=d.createElement("td");td.textContent=v;tr.append(td)}tbody.append(tr)}
 }
 d.addEventListener("input",e=>{if(ids.includes(e.target.id))reset();else if(e.target.id==="oddsPaste")schedule()},true);d.addEventListener("change",e=>{if(ids.includes(e.target.id))reset();if(e.target.id==="axis8Confirm")schedule()},true);d.addEventListener("click",e=>{if(["analyzeBtn","clearCsvBtn"].includes(e.target.id))reset()},true);
 for(const e of ["rsa-analysis-start","rsa-analysis-error"])root.addEventListener(e,reset);for(const e of ["axis8-comparison-changed","axis8-snapshot-changed","rsa-analysis-complete","finish600-ready","validated-queue-ready"])root.addEventListener(e,schedule);
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
})(typeof window!=="undefined"?window:globalThis,AbilityDCompareCore);
