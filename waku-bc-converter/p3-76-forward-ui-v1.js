/* P3-76: client-only capture/settlement. No network requests. */
(function(root){'use strict';
const doc=root.document,$=id=>doc.getElementById(id),C=root.RSAForwardLedgerCoreV1,S=root.RSASettlementCoreV1;
if(!C||!S)return;
const nf=new Intl.NumberFormat('ja-JP'),money=n=>Number.isFinite(n)?nf.format(n)+'円':'—',pct=n=>Number.isFinite(n)?(100*n).toFixed(1)+'%':'—';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let forecast=null,latest=null,loadedManifests=[];
const save=(obj,name)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download=name;doc.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),10000)};
const read=async(files,charset)=>{const r=[];for(const f of files){let raw=new Uint8Array(await f.arrayBuffer()),text=new TextDecoder(charset).decode(raw);r.push({name:f.name,text})}return r};
async function hashForecast(snapshot){if(!root.crypto?.subtle)throw Error('この環境でSHA-256を使えません。HTTPS接続を確認してください');
 const b=new TextEncoder().encode(JSON.stringify(snapshot));const digest=await root.crypto.subtle.digest('SHA-256',b);
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function tokyoToday(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const vals=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return vals.year+'-'+vals.month+'-'+vals.day;}
function localInputTime(){const d=new Date(),off=d.getTimezoneOffset(),x=new Date(d.getTime()-off*60000);return x.toISOString().slice(0,16)}
function buildBetRow(){const e=doc.createElement('div');e.className='betrow';e.innerHTML='<div class="fgrid">'+
 '<div><label>券種</label><select data-ticket><option value="wide">ワイド</option><option value="quinella">馬連</option></select></div>'+
 '<div><label>馬番①</label><input type="number" min="1" max="18" inputmode="numeric" data-a></div>'+
 '<div><label>馬番②</label><input type="number" min="1" max="18" inputmode="numeric" data-b></div>'+
 '<div><label>投資額（円）</label><input type="number" min="100" step="100" value="100" inputmode="numeric" data-stake></div></div>'+
 '<div class="fgrid"><div><label>購入日時（自己申告）</label><input type="datetime-local" data-at></div><div><label>明細・レシート参照（任意）</label><input type="text" maxlength="250" data-ref placeholder="例：JRAネット投票の投票照会記録"></div></div>'+
 '<button type="button" class="secondary" data-remove>この明細を削除</button>';
 e.querySelector('[data-remove]').addEventListener('click',()=>{e.remove();});return e;}
function betInput(){return [...$('p376BetList').children].map(e=>({ticket:e.querySelector('[data-ticket]').value,a:Number(e.querySelector('[data-a]').value),b:Number(e.querySelector('[data-b]').value),stakeYen:Number(e.querySelector('[data-stake]').value),placedAt:e.querySelector('[data-at]').value,receiptRef:e.querySelector('[data-ref]').value}));}
async function importForecast(){forecast=null;$('p376ForecastDetails').textContent='未読み込み';const f=$('p376Forecast').files[0];if(!f)return;
 try{const s=JSON.parse(await f.text()),v=S.validateSnapshot(s);if(!v.ok)throw Error(v.error);
  forecast=s;const k=v.number?`${v.number}R`:'R番号未入力';$('p376ForecastStatus').textContent=f.name;
  $('p376ForecastDetails').textContent=`${v.date.slice(0,4)}-${v.date.slice(4,6)}-${v.date.slice(6)} ${v.venue} ${k} ${v.raceName}\n`+
   `構造: ${v.structure} / 研究判断: ${v.status} / 軸: ${s.decision.axis?.no||'—'}番 / 相手: ${s.decision.selectedOpponent?.no||'—'}番`;
  if(v.number)$('p376RaceNo').value=v.number;
 }catch(e){$('p376ForecastStatus').textContent='読み込み失敗';$('p376ForecastDetails').textContent=e.message;}}
async function capture(){const out=$('p376CaptureStatus');out.textContent='入力を検証中';try{
 if(!forecast)throw Error('まず予想JSONを読み込んでください');const v=S.validateSnapshot(forecast);
 const day=v.date.slice(0,4)+'-'+v.date.slice(4,6)+'-'+v.date.slice(6);
 if(day<tokyoToday())throw Error('レース日が過去です。発走前検証用の台帳は作れません');
 const decl=$('p376Declaration').value,bets=decl==='bought'?betInput():[];
 const h=await hashForecast(forecast),m=C.build(forecast,{raceNumber:$('p376RaceNo').value,declaration:decl,
  attestedPreRace:$('p376Attest').checked,predictionSha256:h,bets,skipReason:$('p376Reason').value});
 const safe=`${m.raceKey}_${decl}`;save(m,`P3-76_発走前台帳_${safe}.json`);
 out.textContent='保存済み（端末のダウンロードに保存）。発走前の独立証明ではありません。';
 }catch(e){out.textContent='保存できません: '+e.message;}}
function summaryTable(sel,obj){$(sel).innerHTML=obj.series.map(x=>'<tr><td>'+escape(x.label)+'</td><td>'+x.bets+'/'+x.races+'</td><td>'+x.hits+'</td><td>'+money(x.stakedYen)+'</td><td>'+money(x.returnedYen)+'</td><td>'+money(x.netYen)+'</td><td>'+pct(x.roi)+'</td></tr>').join('');}
async function reconcile(){const status=$('p376ReconcileStatus');status.textContent='読み込み中…';$('p376Reconcile').disabled=true;
 try{
  const manifestFiles=[...$('p376Manifests').files],csvFiles=[...$('p376Csv').files],hrFiles=[...$('p376Hr').files];
  if(!manifestFiles.length||!csvFiles.length||!hrFiles.length)throw Error('3種類のファイルが必要です');
  const [raw,results,payoffs]=await Promise.all([read(manifestFiles,'utf-8'),read(csvFiles,'shift_jis'),read(hrFiles,'utf-8')]);
  const declarations=[];for(const f of raw){let x=JSON.parse(f.text);if(Array.isArray(x))declarations.push(...x);else declarations.push(x);}
  if(!declarations.length)throw Error('台帳JSONがありません');
  const integrity=[];for(let i=0;i<declarations.length;i++){
   const m=declarations[i];try{integrity.push((await hashForecast(m.forecast))===m.forecastSha256)}catch(e){integrity.push(false)}
  }
  const r=S.mergeSources(results,'results'),p=S.mergeSources(payoffs,'hr');if(!r.records.size||!p.records.size)throw Error('結果CSVまたはHRが読めません');
  const settled=C.settleForward(declarations,r.records,p.records,{baselineStake:100,integrity});const totals=C.summary(settled.rows);
  latest={schema:'rsa-p376-forward-reconciliation-v1',researchOnly:true,generatedAtDevice:new Date().toISOString(),
    manifests:declarations,integrityMatches:integrity,results:settled.rows,actualSummary:totals,baseline:settled.baseline,
    parseIssues:{results:r.issues,hr:p.issues},warnings:['本人申告の購入は独立証明ではない','既に探索済みの過去レースや後付け記録は未知年検証に含めない']};
  loadedManifests=declarations;
  $('p376Stats').innerHTML=[['記録R数',totals.manifestCount],['照合済み',totals.completed],['保留',totals.held],['実購入申告',totals.bought],['見送り申告',totals.skipped]].map(([a,b])=>'<div class="stat"><span class="caption">'+escape(a)+'</span><strong>'+b+'</strong></div>').join('');
  $('p376ActualResult').textContent=`投資 ${money(totals.stakedYen)} / 払戻 ${money(totals.returnedYen)} / 損益 ${money(totals.netYen)} / 回収率 ${pct(totals.roi)} / 的中 ${totals.hit}件 / 返還 ${totals.refund}件\n購入記録は本人申告のため、購入履歴や領収記録による独立確認はしていません。`;
  summaryTable('p376WideTable',settled.baseline.wide);summaryTable('p376QuinellaTable',settled.baseline.quinella);
  $('p376LedgerBody').innerHTML=settled.rows.map(x=>'<tr><td>'+escape(x.key)+' '+escape(x.forecastName)+'</td><td>'+escape(x.declared==='bought'?'購入申告':x.declared==='skipped'?'見送り申告':'不明')+'</td><td>'+escape(x.state==='resolved'?'照合済':'保留')+'</td><td>'+escape(x.state==='resolved'?(x.actual.state==='bought'?`投資${money(x.actual.stakedYen)}・払戻${money(x.actual.returnedYen)}`:'見送り（投資0円）'):x.reason)+'</td></tr>').join('');
  $('p376Result').hidden=false;status.textContent=`台帳 ${totals.manifestCount}件 / 結果 ${r.records.size}レース / 払戻 ${p.records.size}レース / 保留 ${totals.held}件`;
 }catch(e){status.textContent='照合失敗: '+e.message;}finally{$('p376Reconcile').disabled=false;}}
function init(){$('p376Forecast').addEventListener('change',importForecast);$('p376Declaration').addEventListener('change',()=>{
 const show=$('p376Declaration').value==='bought';$('p376BetForm').hidden=!show;if(show&&!$('p376BetList').children.length)$('p376BetList').appendChild(buildBetRow());});
 $('p376AddBet').addEventListener('click',()=>{if($('p376BetList').children.length>=10)return;$('p376BetList').appendChild(buildBetRow())});
 $('p376Capture').addEventListener('click',capture);$('p376Reconcile').addEventListener('click',reconcile);
 $('p376Export').addEventListener('click',()=>{if(latest)save(latest,'P3-76_前向き台帳_結果照合_'+tokyoToday()+'.json')});}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);