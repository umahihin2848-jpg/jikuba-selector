/* P3-75: Browser-only, no API/network, no mutation of P3-74 model or buy decisions. */
(function(root){'use strict';
if(root.RSASettlementUIV1)return;
const Core=root.RSASettlementCoreV1,doc=root.document,$=id=>doc.getElementById(id);
if(!Core)return;
const fmt=new Intl.NumberFormat('ja-JP');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=v=>Number.isFinite(v)?fmt.format(v)+'円':'—';
const pct=v=>Number.isFinite(v)?(100*v).toFixed(1)+'%':'—';
let snapshots=[],records=new Map(),pays=new Map(),rows=[],overrides={},sourceNames=[],errors=[];
function safeDownload(contents,mime,filename){const blob=new Blob([contents],{type:mime}),url=URL.createObjectURL(blob),a=doc.createElement('a');
 a.href=url;a.download=filename;doc.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function tallyInputs(){for(const [key,id] of [['p375Json','p375JsonCount'],['p375Csv','p375CsvCount'],['p375Hr','p375HrCount']]){
 const list=$(key)?.files;$(id).textContent=list?.length?[...list].map(f=>f.name).join(' / '):'未選択';}}
async function readFiles(files,encoding){const out=[];for(const file of files){const buffer=await file.arrayBuffer();let decoder;
 try{decoder=new TextDecoder(encoding,{fatal:false});}catch(e){throw Error('端末が '+encoding+' 文字コードを処理できません');}
 out.push({name:file.name,text:decoder.decode(buffer),bytes:file.size});}
 return out;}
function setStatus(t){$('p375Status').textContent=t;}
function parseSnapshots(fileEntries){const output=[],errors=[];
 for(const e of fileEntries){let x;try{x=JSON.parse(e.text);}catch(ex){errors.push(e.name+': JSON形式が不正');continue;}
 const groups=Array.isArray(x)?x:[x];for(const g of groups){const valid=Core.validateSnapshot(g);
 if(!valid.ok){errors.push(e.name+': '+valid.error);continue;}output.push(g);}}
 return{snapshots:output,errors};}
async function load(){const jsonFiles=[...$('p375Json').files],csvFiles=[...$('p375Csv').files],hrFiles=[...$('p375Hr').files];
 if(!jsonFiles.length||!csvFiles.length||!hrFiles.length){setStatus('3種類のファイルをそれぞれ選んでください');return;}
 $('p375Load').disabled=true;setStatus('端末内で読み込み中…');
 await new Promise(resolve=>setTimeout(resolve,20));
 try{
  const [js,cs,hs]=await Promise.all([readFiles(jsonFiles,'utf-8'),readFiles(csvFiles,'shift_jis'),readFiles(hrFiles,'utf-8')]);
  setStatus('レースキーと馬番を照合中…');await new Promise(resolve=>setTimeout(resolve,20));
  const a=parseSnapshots(js),b=Core.mergeSources(cs,'results'),c=Core.mergeSources(hs,'hr');
  snapshots=a.snapshots;records=b.records;pays=c.records;errors=[...a.errors,...b.issues,...c.issues];overrides={};sourceNames={json:js.map(x=>x.name),csv:cs.map(x=>x.name),hr:hs.map(x=>x.name)};
  if(!snapshots.length)throw Error('P3-74形式の予想JSONがありません');
  if(!records.size||!pays.size)throw Error('有効な成績レースまたはHR2払戻がありません');
  recalculate();
  setStatus(`読込完了: 予想 ${snapshots.length}件 / 結果 ${records.size}R / 払戻 ${pays.size}R / 注意 ${errors.length}件`);
 }catch(e){setStatus('読み込み失敗: '+e.message);console.error('P3-75 local parse error',e);}finally{$('p375Load').disabled=false;}
}
function getParams(){return{stake:Number($('p375Unit').value),ticket:$('p375Ticket').value,group:$('p375Group').value,year:$('p375Year').value,comparableOnly:$('p375Common').checked};}
function recalculate(){if(!snapshots.length)return;rows=Core.settleAll(snapshots,records,pays,{overrides,stake:Number($('p375Unit').value)});
 addYears();renderManual();renderSummary();renderLedger();$('p375SummarySection').hidden=false;$('p375LedgerSection').hidden=false;}
function addYears(){const select=$('p375Year'),current=select.value;const years=[...new Set(rows.map(r=>r.raceKey?.slice(0,4)||r.meta?.date?.slice(0,4)).filter(Boolean))].sort();
 select.innerHTML='<option value="all">全期間</option>'+years.map(y=>'<option value="'+esc(y)+'">'+esc(y)+'年</option>').join('');
 select.value=years.includes(current)||current==='all'?current:'all';}
function renderManual(){const unresolved=rows.filter(r=>r.state==='unresolved'&&r.candidates?.length);
 const section=$('p375ManualSection');section.hidden=!unresolved.length;
 $('p375ManualList').innerHTML=unresolved.length?unresolved.map(r=>{
  const source=esc(r.meta?.raceName||''),selection=overrides[r.index]?.key||'';
  return '<div class="manual"><div><b>予想 '+(r.index+1)+'：'+source+'</b><small>'+esc(r.meta?.date||'')+' '+esc(r.meta?.venue||'')+' ／ '+esc(r.reason)+'</small></div>'+
   '<div><label for="p375Fix'+r.index+'">結果CSVの候補レース</label><select id="p375Fix'+r.index+'" data-settle-choice="'+r.index+'"><option value="">選択しない</option>'+
   r.candidates.map(c=>'<option value="'+esc(c.key)+'"'+(selection===c.key?' selected':'')+'>'+c.number+'R '+esc(c.name)+'</option>').join('')+'</select>'+
   '<label class="check"><input type="checkbox" data-settle-confirm="'+r.index+'"'+(overrides[r.index]?.confirmed?' checked':'')+'> 日付・場・名称（異なる場合は出走表）を確認して対応付ける</label></div></div>';
 }).join(''):'<div class="empty">手動照合が必要な候補はありません</div>';
}
function renderSummary(){const p=getParams(),s=Core.summarize(rows,p),all=rows.length,resolved=rows.filter(r=>r.state==='resolved').length;
 const numbers=[['予想JSON',all+'件','重複予想は照合保留'],['結果照合済み',resolved+'件','未照合 '+(all-resolved)+'件'],['比較対象',s.raceCount+'R','年度・構造フィルタ後'],['共通の割当予算',money(s.allocatedBudgetYen),'方式ごと同額']];
 $('p375Stats').innerHTML=numbers.map(([label,value,note])=>'<div class="stat"><span class="caption">'+esc(label)+'</span><strong>'+esc(value)+'</strong><span class="small">'+esc(note)+'</span></div>').join('');
 $('p375SummaryBody').innerHTML=s.series.map(z=>{
  const netClass=z.netYen>0?'positive':z.netYen<0?'negative':'';
  return'<tr><td><b>'+esc(z.label)+'</b><div class="muted">購入率 '+pct(z.buyRate)+'</div></td><td>'+z.bets+'/'+z.races+'</td><td>'+z.hits+(z.refunds?'（返還'+z.refunds+'）':'')+'</td>'+
  '<td>'+money(z.stakedYen)+'</td><td>'+money(z.returnedYen)+'</td><td class="'+netClass+'">'+money(z.netYen)+'</td>'+
  '<td>'+pct(z.roi)+'</td><td class="'+netClass+'">'+pct(z.returnPerBudget)+'</td><td>'+money(z.maxDrawdownYen)+'</td></tr>';
 }).join('');
}
function preview(t,record){const rec=record?.simulation?.[t];if(!rec)return'—';return Object.entries(rec).map(([type,result])=>{
 const lbl={p10:'P10',quality:'レース質',flow:'見送り尊重'}[type];const x=result.state;
 const s=x==='hit'?'的中 '+money(result.returnYen):x==='miss'?'不的中':x==='refund'?'返還':x==='skip'?'見送り':x==='no_decision'?'判断保留':'未判定';
 return lbl+'：'+s;}).join(' / ');}
function renderLedger(){const r=rows.slice(0,150);$('p375LedgerBody').innerHTML=r.map(z=>{
 const name=z.raceName||z.meta?.raceName||'未特定',date=z.raceKey?.slice(0,8)||z.meta?.date||'—';
 return '<tr><td>'+esc(date)+'　'+esc(z.meta?.venue||'')+' '+(z.raceKey?Number(z.raceKey.slice(-2))+'R ':'')+'<b>'+esc(name)+'</b></td>'+
  '<td>'+esc(z.structure==='single'?'単独軸':z.structure==='pair'?'Pair':z.structure||'—')+'</td><td>'+esc(z.verdict||z.meta?.status||'—')+'</td>'+
  '<td><span class="tag '+(z.state==='resolved'?'ok':'wait')+'">'+esc(z.state==='resolved'?'照合済':z.state==='invalid'?'不正':'保留')+'</span></td>'+
  '<td class="detail">'+(z.state==='resolved'?'<b>ワイド</b> '+esc(preview('wide',z))+'<br><b>馬連</b> '+esc(preview('quinella',z)):esc(z.reason))+'</td></tr>';
 }).join('')+(rows.length>150?'<tr><td colspan="5">先頭150件を表示。全件は明細CSVへ出力できます。</td></tr>':'');
}
function exportJson(){if(!rows.length)return;const data={schema:'rsa-p375-reconciliation-v1',generatedAt:new Date().toISOString(),researchOnly:true,productionImpact:false,
  purchasesAreHypothetical:true,sourceFiles:sourceNames,sourceIssues:errors,manualOverrides:overrides,
  disclaimers:['P3-74 JSONは不変で同梱。照合・裁定・手動マッチは別記録。端末時刻は発走前の独立証明ではない。',
   '2016-2026年の既探索データは将来回収率のホールドアウトではない。未照合レースは分母に算入しない。'],
  originalPredictions:snapshots,reconciliations:rows,summary:Core.summarize(rows,getParams())};
 safeDownload(JSON.stringify(data,null,2),'application/json','P3-75_予想結果回収率_照合_'+new Date().toISOString().slice(0,10)+'.json');}
function exportCsv(){if(!rows.length)return;safeDownload(Core.rowsToCsv(rows),'text/csv;charset=utf-8','P3-75_馬券比較明細.csv');}
function setOverride(index,field,value){const x=overrides[index]||{key:'',confirmed:false};x[field]=value;
 if(field==='key')x.confirmed=false;overrides[index]=x;recalculate();}
function init(){for(const id of ['p375Json','p375Csv','p375Hr'])$(id).addEventListener('change',tallyInputs);
 $('p375Load').addEventListener('click',load);
 for(const id of ['p375Ticket','p375Group','p375Year','p375Common'])$(id).addEventListener('change',()=>{renderSummary();renderLedger();});
 $('p375Unit').addEventListener('change',recalculate);
 $('p375ExportJson').addEventListener('click',exportJson);$('p375ExportCsv').addEventListener('click',exportCsv);
 $('p375ManualList').addEventListener('change',e=>{
  if(e.target.matches('[data-settle-choice]')){setOverride(Number(e.target.dataset.settleChoice),'key',e.target.value)}
  if(e.target.matches('[data-settle-confirm]')){const idx=Number(e.target.dataset.settleConfirm);
   if(!overrides[idx]?.key){e.target.checked=false;setStatus('まず結果CSVの候補レースを選択してください');return;}
   setOverride(idx,'confirmed',e.target.checked);}
 });
}
root.RSASettlementUIV1=Object.freeze({version:'p3-75-local-browser',productionImpact:false});
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);