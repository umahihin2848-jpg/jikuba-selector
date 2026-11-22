/* Forward-only 600m leader-gap prediction audit. Never changes selections or bets. */
(function(root){'use strict';
const V='finish600-gap-audit-v1-20261123',PFX='rsa-f6ga-v1:';
const $=id=>root.document?.getElementById(id);
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v==null||String(v).trim()===''?NaN:Number(v);
const validGap=v=>Number.isFinite(number(v))&&number(v)>=0&&number(v)<=15;
function keyOf(m,hs){return JSON.stringify([m.date,m.venue,m.race,m.grade,m.surface,m.dist,hs.map(h=>[String(h.no),h.name])]);}
function hash(str){let n=2166136261;for(const s of str)n=Math.imul(n^s.charCodeAt(0),16777619);return(n>>>0).toString(36);}
function checkForecast(roster,records){
 const errors=[],values={};
 for(const h of roster){const raw=records?.[String(h.no)]?.gap;
  if(!validGap(raw))errors.push(h.no+'番の想定差を入力・確認');else values[h.no]=Number(raw);
 }
 return{ok:errors.length===0,errors,values,count:roster.length-errors.length};
}
function parseActual(raw,roster){
 const lines=String(raw||'').normalize('NFKC').trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const names=new Set(roster.map(h=>String(h.no))),n=roster.length,result={},errors=[];
 if(lines.length!==n)errors.push('全'+n+'頭を1行ずつ入力（現在'+lines.length+'行）');
 for(const [i,line] of lines.entries()){
  const cells=line.split(/[\t ,，、]+/).filter(Boolean);
  if(cells.length!==2&&cells.length!==3){errors.push((i+1)+'行目は「馬番 秒差 [着順]」');continue;}
  const [no,gap,rank]=cells;
  if(!/^\d+$/.test(no)||!names.has(String(Number(no)))){errors.push((i+1)+'行目の馬番が不一致');continue;}
  const id=String(Number(no));
  if(Object.prototype.hasOwnProperty.call(result,id)){errors.push(id+'番が重複');continue;}
  if(!validGap(gap)){errors.push(id+'番の実測差が不正（0〜15秒）');continue;}
  if(rank!==undefined&&(!/^\d+$/.test(rank)||Number(rank)<1||Number(rank)>n)){
   errors.push(id+'番の着順が不正・重複');continue;
  }
  result[id]={gap:Number(gap),rank:rank===undefined?null:Number(rank)};
 }
 if(Object.keys(result).length!==n)errors.push('馬番が全頭分揃っていません');
 return{ok:!errors.length,errors,values:result};
}
function stats(predicted,actual,roster){
 const rows=[],errors=[],overRisk=[],underRisk=[];
 for(const h of roster){
  const id=String(h.no),p=number(predicted?.[id]?.gap),a=number(actual?.[id]?.gap);
  if(!Number.isFinite(p)||!Number.isFinite(a))continue;
  const err=a-p,rank=actual[id]?.rank??null,upper=(Number.isFinite(number(h.ability))&&number(h.ability)>0&&number(h.ability)<=3)||(Number.isFinite(number(h.m3))&&number(h.m3)>0&&number(h.m3)<=3);
  const r={no:id,name:h.name,pred:p,actual:a,error:err,absError:Math.abs(err),
   unexpectedBack:p<=1&&a>1,anticipatedBack:p>1&&a>1,
   overRisk:p>1&&a<=1,positionUnder:err>.3+1e-9,abilityOrM3Top3:upper,rank};
  rows.push(r);if(r.unexpectedBack)underRisk.push(r);if(r.overRisk)overRisk.push(r);errors.push(err);
 }
 const n=rows.length,mean=fn=>n?rows.reduce((s,r)=>s+fn(r),0)/n:null;
 return{n,mae:mean(r=>r.absError),bias:mean(r=>r.error),
  underBy03:rows.filter(r=>r.positionUnder).length,
  unexpectedBack:underRisk.length,correctBack:rows.filter(r=>r.anticipatedBack).length,
  falseAlarm:overRisk.length,highAbilityUnexpected:underRisk.filter(r=>r.abilityOrM3Top3).length,
  rows};
}
function combine(audits){
 const races=audits.filter(x=>x?.frozen?.roster&&x?.outcome?.actual&&x?.frozen?.predicted&&x?.raceKey);
 const all=[];
 for(const r of races){const m=stats(r.frozen.predicted,r.outcome.actual,r.frozen.roster);
  for(const row of m.rows)all.push({...row,venue:r.meta?.venue||'',surface:r.meta?.surface||'',distance:Number(r.meta?.dist)||0,grade:r.meta?.grade||'',race:r.meta?.race||''});}
 const n=all.length,rate=(numer,den)=>den?numer/den:null;
 const aggregate=rs=>({n:rs.length,races:new Set(rs.map(r=>r.race+'|'+r.venue)).size,
  mae:rs.length?rs.reduce((s,r)=>s+r.absError,0)/rs.length:null,
  bias:rs.length?rs.reduce((s,r)=>s+r.error,0)/rs.length:null,
  unexpected:rs.filter(r=>r.unexpectedBack).length});
 return {races:races.length,horses:n,all:aggregate(all),
  front:aggregate(all.filter(r=>r.pred<=.6)),
  middle:aggregate(all.filter(r=>r.pred>.6&&r.pred<=1)),
  back:aggregate(all.filter(r=>r.pred>1)),
  topAbility:aggregate(all.filter(r=>r.abilityOrM3Top3)),
  turf:aggregate(all.filter(r=>r.surface==='芝')),
  dirt:aggregate(all.filter(r=>r.surface==='ダート')),
  short:aggregate(all.filter(r=>r.distance<=1600)),
  long:aggregate(all.filter(r=>r.distance>1600))};
}
function validateImport(a,k){
 if(!a||a.version!==V||a.raceKey!==k||!a.meta||!a.frozen||!Array.isArray(a.frozen.roster)||!a.frozen.predicted||!a.frozen.startAt||!a.frozen.lockedAt)return false;
 const r=a.frozen.roster;if(r.length<12||r.length>18||new Set(r.map(x=>String(x.no))).size!==r.length)return false;
 if(!checkForecast(r,a.frozen.predicted).ok)return false;
 if(!Number.isFinite(Date.parse(a.frozen.startAt))||!Number.isFinite(Date.parse(a.frozen.lockedAt))||Date.parse(a.frozen.lockedAt)>=Date.parse(a.frozen.startAt))return false;
 if(a.outcome?.recordedAt&&Date.parse(a.outcome.recordedAt)<Date.parse(a.frozen.startAt))return false;
 if(a.outcome){if(!a.outcome.actual||typeof a.outcome.actual!=='object')return false;
  for(const h of r)if(!validGap(a.outcome.actual[String(h.no)]?.gap))return false;
 }
 return true;
}
root.RSAFinish600GapAuditCoreV1=Object.freeze({version:V,keyOf,checkForecast,parseActual,stats,combine,validateImport});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
let current=null,record=null,open=false,timer=0;
function context(){
 const f=root.RSAFocusedThreeTabsState||{},st=root.Finish600State||{},grade=$('grade')?.value;
 if(!/^G[123]$/.test(String(grade||''))||!f.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!st.ready||!Array.isArray(st.rows))return null;
 const roster=st.rows.map(h=>{
  const id=String(h.no),a=root.M3PureAbilityState?.byNo?.[id]||{},q=root.ValidatedQueueState?.byNo?.[id]||{},p=root.PositionRiskState?.byNo?.[id]||{};
  return{no:id,name:String(h.name||''),
   ability:Number.isFinite(number(a.abilityRank))?Number(a.abilityRank):null,
   m3:Number.isFinite(number(h.finishRank))?Number(h.finishRank):null,
   initial:Number.isFinite(number(q.expectedRank))?Number(q.expectedRank):null,
   p10:Number.isFinite(number(p.p10))?Number(p.p10):null};
 }).sort((a,b)=>Number(a.no)-Number(b.no));
 if(roster.length<12||roster.length>18||roster.some(h=>!h.name||!Number.isInteger(Number(h.no))))return null;
 const meta={date:$('raceDate')?.value||'',venue:$('venue')?.value||'',race:$('raceName')?.value||'',
  grade,surface:$('surface')?.value||'',dist:$('distance')?.value||'',going:$('going')?.value||''};
 if(!meta.date||!meta.venue||!meta.race||!meta.dist)return null;
 return {meta,roster,key:keyOf(meta,roster)};
}
const storageKey=k=>PFX+hash(k);
function load(c){
 try{const v=JSON.parse(root.localStorage.getItem(storageKey(c.key))||'null');
  if(v&&v.version===V&&v.raceKey===c.key)return v;}catch(_){}
 return {version:V,raceKey:c.key,meta:c.meta,frozen:null,outcome:null};
}
function persist(){if(!current||!record)return false;
 try{root.localStorage.setItem(storageKey(current.key),JSON.stringify(record));return true;}catch(_){showMessage('保存領域が使えません。',true);return false;}}
function draft(){
 root.RSAFinish600GapReviewV1?.flush?.();
 try{const key='rsa-600m-gap-v1:'+hash(current.key),d=JSON.parse(root.localStorage.getItem(key)||'null');
  return d?.raceKey===current.key&&d?.records&&typeof d.records==='object'?d.records:{};}catch(_){return{};}
}
function frozenFor(key){
 if(current?.key===key&&record?.frozen)return record.frozen;
 try{const s=JSON.parse(root.localStorage.getItem(storageKey(key))||'null');
 return s?.raceKey===key&&s.version===V?s.frozen||null:null;}catch(_){return null;}
}
function isLocked(key){return Boolean(frozenFor(key));}
function getFrozen(key){return frozenFor(key)?.predicted||null;}
root.RSAFinish600GapAuditV1={version:V,isLocked,getFrozen};
function updateDraftCount(){if(!current||record?.frozen)return;const el=$('f6gaCount');if(el){const a=checkForecast(current.roster,draft());el.textContent='全頭予想 '+a.count+'/'+current.roster.length+'頭';}}
function showMessage(s,bad){const n=$('f6gaMessage');if(n){n.textContent=s;n.style.color=bad?'#ffc7b7':'#b4efd9';}}
const fmt=(x,n=2)=>x===null||!Number.isFinite(x)?'—':x.toFixed(n);
function hist(){const all=[];
 try{for(let i=0;i<root.localStorage.length;i++){const k=root.localStorage.key(i);if(!k?.startsWith(PFX))continue;
  try{const x=JSON.parse(root.localStorage.getItem(k)||'null');if(x?.frozen&&x?.outcome)all.push(x);}catch(_){}}
 }catch(_){}
 return combine(all);
}
function download(){
 if(!record?.frozen)return showMessage('先に発走前予想を固定してください',true);
 const obj={...record,exportedAt:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});
 const url=root.URL.createObjectURL(blob),a=root.document.createElement('a');
 a.href=url;a.download=[current.meta.date,current.meta.venue,current.meta.race,'600m予測実測監査'].join('_').replace(/[\\/:*?"<>|]/g,'_')+'.json';
 root.document.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),1400);
}
function freeze(){
 if(!current||record?.frozen)return;
 const t=$('f6gaStart')?.value;if(!t)return showMessage('発走予定日時を入力してください',true);
 const stamp=new Date(t),now=new Date();
 if(!Number.isFinite(stamp.getTime())||t.slice(0,10)!==current.meta.date)return showMessage('日付が対象レースと一致しません',true);
 if(stamp.getTime()<=now.getTime())return showMessage('発走予定時刻を過ぎています。過去の予想として固定できません',true);
 if($('f6gaNumbers')?.checked!==true)return showMessage('公式馬番とCSV仮馬番の照合を確認してください',true);
 if($('f6gaBefore')?.checked!==true)return showMessage('発走前の自己申告にチェックしてください',true);
 const rec=draft(),z=checkForecast(current.roster,rec);
 if(!z.ok)return showMessage('全頭の想定差が必要です。'+z.errors.slice(0,3).join('、'),true);
 if(root.confirm&&!root.confirm('残り600m地点の全'+current.roster.length+'頭の予測を固定します。後から変更できません。よろしいですか？'))return;
 const predicted={};
 for(const h of current.roster)predicted[h.no]={gap:z.values[h.no],reason:String(rec[h.no]?.reason||'').slice(0,1200)};
 record.frozen={startAt:stamp.toISOString(),lockedAt:now.toISOString(),roster:current.roster,predicted,
  versionContext:{ability:root.M3PureAbilityState?.version||null,m3:root.Finish600State?.version||null,
   position:root.ValidatedQueueState?.version||null,p10:root.PositionRiskState?.version||null},
  confirmation:'user_declared_before_off_not_externally_verified'};
 if(!persist()){record.frozen=null;return;}
 root.dispatchEvent(new CustomEvent('rsa-finish600-audit-frozen',{detail:{raceKey:current.key}}));
 const old=$('f6gaPanel');old?.remove();render();showMessage('発走前の全頭予測を固定しました。結果は発走予定時刻後に入力できます');
}
function submit(){
 if(!record?.frozen||record.outcome)return;
 if(Date.now()<Date.parse(record.frozen.startAt))return showMessage('登録した発走予定時刻を過ぎるまで結果を入力できません',true);
 const checked=$('f6gaSource')?.checked===true;
 if(!checked)return showMessage('実測値をTARGETの上3F地点差と照合したことを確認してください',true);
 const z=parseActual($('f6gaActual')?.value,current.roster);
 if(!z.ok)return showMessage(z.errors.slice(0,3).join('／'),true);
 if(root.confirm&&!root.confirm('全頭の実測差を結果として固定します。修正できません。よろしいですか？'))return;
 record.outcome={actual:z.values,recordedAt:new Date().toISOString(),
  source:'user_pasted_TARGET_upper3F_time_gap_unverified'};
 if(!persist()){record.outcome=null;return;}
 const old=$('f6gaPanel');old?.remove();render();showMessage('実測結果を固定しました。事前予測は変更されていません');
}
async function restore(file){
 if(!file||!current)return;
 if(record?.frozen)return showMessage('既に固定済みです。保存済み監査を上書きできません',true);
 try{
  if(file.size>1500000)throw Error('ファイルサイズが大きすぎます');
  const obj=JSON.parse(await file.text());
  if(!validateImport(obj,current.key))throw Error('レース・馬名・全頭予測・形式が一致しません');
  const same=obj.frozen.roster.every((h,i)=>String(h.no)===current.roster[i].no&&String(h.name)===current.roster[i].name);
  if(!same)throw Error('登録順・馬名が異なります');
  if(root.confirm&&!root.confirm('以前の端末で固定した監査データを復元しますか？'))return;
  record={...obj,version:V,raceKey:current.key,meta:current.meta};
  if(!persist())return;
  root.dispatchEvent(new CustomEvent('rsa-finish600-audit-frozen',{detail:{raceKey:current.key}}));
  const old=$('f6gaPanel');old?.remove();render();showMessage('JSONバックアップを復元しました');
 }catch(e){showMessage('復元失敗：'+String(e.message||e),true);}
}
function resultHtml(){
 const frozen=record.frozen,m=stats(frozen.predicted,record.outcome.actual,frozen.roster),history=hist();
 let s='<div class="f6ga-summary"><strong>今回の予測誤差｜'+m.n+'頭</strong>'+
 '<div>平均絶対誤差（MAE） <b>'+fmt(m.mae)+'秒</b> ／ 平均差（実測−予測） <b>'+fmt(m.bias)+'秒</b></div>'+
 '<div>差を0.3秒超、小さく見積もった馬：'+m.underBy03+'頭 ／ 実測1秒超の見落とし：'+m.unexpectedBack+'頭</div>'+
 '<div>AbilityまたはM3上位3頭で実測1秒超を見落とした馬：'+m.highAbilityUnexpected+'頭</div>'+
 '<small>平均差がプラスなら後方差を小さく見積もる傾向。0.3秒／1.0秒は探索用の区切りで、購入基準ではありません。</small></div>';
 s+='<div class="f6ga-scroll"><table><thead><tr><th>馬</th><th>予想</th><th>実測</th><th>ズレ</th><th>結果</th></tr></thead><tbody>'+
 m.rows.map(r=>'<tr'+(r.unexpectedBack?' class="f6ga-miss"':'')+'><td>'+html(r.no)+' '+html(r.name)+'</td>'+
 '<td>'+fmt(r.pred,1)+'</td><td>'+fmt(r.actual,1)+'</td><td>'+ (r.error>0?'+':'')+fmt(r.error,1)+'</td>'+
 '<td>'+ (r.unexpectedBack?'後方差の見落とし':r.rank!==null?r.rank+'着':'—')+'</td></tr>').join('')+'</tbody></table></div>';
 if(history.races>0){s+='<div class="f6ga-summary"><strong>保存済み'+history.races+'レース／'+history.horses+'頭の累積</strong>'+
 '<p>平均絶対誤差 '+fmt(history.all.mae)+'秒 ／ 平均差 '+fmt(history.all.bias)+'秒 ／ 1秒超の見落とし '+history.all.unexpected+'頭</p>'+
 (history.races<3?'<small>レース数が少ないため傾向判定は保留</small>':
 '<p>能力/M3上位：'+history.topAbility.n+'頭・平均差 '+fmt(history.topAbility.bias)+'秒 ／ 想定0.6秒以内：'+history.front.n+'頭・平均差 '+fmt(history.front.bias)+'秒</p>'+
 '<p>芝：'+history.turf.n+'頭・平均差 '+fmt(history.turf.bias)+'秒 ／ ダート：'+history.dirt.n+'頭・平均差 '+fmt(history.dirt.bias)+'秒</p>'+
 '<p>1600m以下：'+history.short.n+'頭・平均差 '+fmt(history.short.bias)+'秒 ／ 1600m超：'+history.long.n+'頭・平均差 '+fmt(history.long.bias)+'秒</p>'+
 '<small>参考集計。レース・年度・ペース条件の違いは調整していません。</small>')+'</div>';}
 return s;
}
function render(){
 const c=context(),host=$('rsafFormation');if(!c||!host||host.hidden)return;
 if(!current||c.key!==current.key){current=c;record=load(c);open=false;}
 let node=$('f6gaPanel');
 if(node&&node.dataset.race!==current.key){node.remove();node=null;}
 if(node&&node.parentElement===host){updateDraftCount();return;}
 node=root.document.createElement('details');node.id='f6gaPanel';node.className='f6ga-panel';node.dataset.race=current.key;node.open=open;
 const frozen=record?.frozen,completed=Boolean(record?.outcome);
 let content='<summary>600m先頭差｜発走前予測と実測の照合</summary><div class="f6ga-body">'+
 '<p>「600m先頭差チェック」で全頭の予想（秒）を書いたら、こちらで発走前に固定。レース後にTARGETの「上3F地点差」を馬番ごとに登録し、予想との差を調べます。</p>'+
 '<p class="f6ga-caution">研究専用。時間・馬番・観測データは利用者が確認する必要があります。端末時刻は真正な発走前記録の外部証明にはなりません。購入・能力・軸馬評価に自動反映しません。</p>'+
 '<p id="f6gaMessage" class="f6ga-status"></p>';
 if(!frozen){
  const d=draft(),a=checkForecast(current.roster,d);
  content+='<div class="f6ga-summary"><strong id="f6gaCount">全頭予想 '+a.count+'/'+current.roster.length+'頭</strong>'+
   '<small>全頭の想定先頭差を入力すると、発走前に記録を固定できます。</small></div>'+
   '<label>発走予定日時（JSTで確認）<input id="f6gaStart" type="datetime-local" value="" /></label>'+
   '<label class="f6ga-check"><input id="f6gaNumbers" type="checkbox"/> CSV表示番号を公式馬番と照合しました</label>'+
   '<label class="f6ga-check"><input id="f6gaBefore" type="checkbox"/> 発走前に入力した自分の見立てです</label>'+
   '<button type="button" id="f6gaFreeze">全頭の予測を固定する</button>'+
   '<div class="f6ga-actions"><button type="button" id="f6gaImport">監査JSONから復元</button><input id="f6gaFile" type="file" accept=".json,application/json" style="display:none"/></div>';
 }else{
  content+='<div class="f6ga-summary"><strong>発走前の予測を固定済み</strong>'+
   '<small>予測固定時刻 '+html(new Date(frozen.lockedAt).toLocaleString('ja-JP'))+' ／ 設定発走時刻 '+html(new Date(frozen.startAt).toLocaleString('ja-JP'))+
   ' ／ 対象 '+frozen.roster.length+'頭</small></div>';
  if(completed)content+=resultHtml();
  else{
   content+='<label>実測データを全頭分貼り付け（馬番 秒差 着順［任意］）'+
   '<textarea id="f6gaActual" rows="7" placeholder="1 0.0 1&#10;2 0.7 4&#10;3 1.2 8&#10;…"></textarea></label>'+
   '<label class="f6ga-check"><input id="f6gaSource" type="checkbox"/> TARGETの上3F地点差を確認し、全馬番を照合しました</label>'+
   '<button type="button" id="f6gaResult">実測値を固定して比較する</button>';
  }
  content+='<div class="f6ga-actions"><button type="button" id="f6gaExport">監査JSONを出力・引き継ぐ</button></div>';
 }
 content+='<p class="f6ga-foot">監査用JSONは予測と結果を両方保存。発走前の予測固定後と結果固定後は同一記録を上書きできません。Safariの端末内保存だけに頼らずJSONを保管してください。予想する「初角順位」と残り600mの時間差は別です。</p></div>';
 node.innerHTML=content;host.appendChild(node);
 node.addEventListener('toggle',()=>{open=node.open;});
 node.addEventListener('click',e=>{
  const id=e.target.id;
  if(id==='f6gaFreeze')freeze();
  if(id==='f6gaResult')submit();
  if(id==='f6gaExport')download();
  if(id==='f6gaImport')$('f6gaFile')?.click();
 });
 node.addEventListener('change',e=>{if(e.target.id==='f6gaFile'){const file=e.target.files?.[0];e.target.value='';if(file)restore(file);}});
}
let renderTimer=0,draftTimer=0;function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(render,110);}
['rsa-focused-partner-ready','finish600-ready','rsa-analysis-complete','rsa-finish600-audit-frozen'].forEach(e=>root.addEventListener(e,schedule));
root.document.addEventListener('input',e=>{if(e.target?.id==='f6gGap'){clearTimeout(draftTimer);draftTimer=setTimeout(updateDraftCount,690);}},true);
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
