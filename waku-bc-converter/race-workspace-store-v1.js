(function(){'use strict';
const DB='raceShapeAnalyzerWorkspaceV1',STORE='races',VER=1,$=id=>document.getElementById(id);
let dbp=null,busy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function openDB(){if(dbp)return dbp;dbp=new Promise((ok,ng)=>{const q=indexedDB.open(DB,VER);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};q.onsuccess=()=>ok(q.result);q.onerror=()=>ng(q.error)});return dbp}
async function tx(mode,fn){const d=await openDB();return new Promise((ok,ng)=>{const t=d.transaction(STORE,mode),s=t.objectStore(STORE);let out;try{out=fn(s)}catch(e){ng(e);return}t.oncomplete=()=>ok(out);t.onerror=()=>ng(t.error)})}
function req(r){return new Promise((ok,ng)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>ng(r.error)})}
async function put(x){const d=await openDB();return new Promise((ok,ng)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(x);t.oncomplete=ok;t.onerror=()=>ng(t.error)})}
async function all(){const d=await openDB();return req(d.transaction(STORE,'readonly').objectStore(STORE).getAll())}
async function get(id){const d=await openDB();return req(d.transaction(STORE,'readonly').objectStore(STORE).get(id))}
async function del(id){const d=await openDB();return new Promise((ok,ng)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=ok;t.onerror=()=>ng(t.error)})}
async function clearAll(){const d=await openDB();return new Promise((ok,ng)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).clear();t.oncomplete=ok;t.onerror=()=>ng(t.error)})}
function val(id){return $(id)?.value||''}
function meta(){return{date:val('raceDate'),venue:val('venue'),raceName:val('raceName'),fieldSize:val('fieldSize'),surface:val('surface'),distance:val('distance'),grade:val('grade'),going:val('going')||'良'}}
function key(m){return [m.date,m.venue,m.raceName||'race',m.surface,m.distance,m.grade,m.going||'良'].join('|')}
function oddsCount(txt){return String(txt||'').split(/\r?\n/).filter(x=>/^\s*\d+\s+\d/.test(x)).length}
function analyzed(){return !!$('result')&&!$('result').classList.contains('hidden')}
function setStatus(msg,bad=false){let x=$('raceWorkspaceStatus');if(!x)return;x.textContent=msg;x.style.color=bad?'#ffaaaa':'#8ed5ff'}
function ui(){
  if($('raceTempSaveBtn'))return;
  const a=$('analyzeBtn');if(a){const wrap=document.createElement('div');wrap.className='actions';wrap.style.marginTop='8px';wrap.innerHTML='<button id="raceTempSaveBtn" class="secondary">レースを一時保存</button><span id="raceWorkspaceStatus" class="tiny" style="align-self:center"></span>';a.insertAdjacentElement('afterend',wrap)}
  const old=$('saveBtn');if(old)old.style.display='none';
  const sec=$('savedList')?.closest('.card');if(sec){const h=sec.querySelector('h2');if(h)h.textContent='一時保存したレース';const m=sec.querySelector('.muted');if(m)m.textContent='レース条件・CSV・単勝オッズをこのiPhone内に保存し、タップで復元します。'}
  $('raceTempSaveBtn')?.addEventListener('click',saveCurrent);
  const c=$('clearSavedBtn');if(c){c.onclick=async()=>{if(!confirm('一時保存したレースをすべて削除しますか？'))return;await clearAll();try{localStorage.removeItem('raceShapeAnalyzerV2Integrated')}catch(e){};renderList()}}
}
async function saveCurrent(){if(busy)return;busy=true;try{
  const m=meta();if(!m.date&&!m.venue&&!m.raceName){setStatus('レース条件を入力してください',true);return}
  const f=$('csvFile')?.files?.[0]||null;let blob=null,fm=null;if(f){blob=new Blob([f],{type:f.type||'text/csv'});fm={name:f.name||'race.csv',type:f.type||'text/csv',lastModified:f.lastModified||Date.now(),size:f.size||0}}
  const odds=val('oddsPaste');const rec={id:key(m),savedAt:Date.now(),meta:m,odds,csvBlob:blob,csv:fm,wasAnalyzed:analyzed()};await put(rec);setStatus(`保存しました｜CSV ${f?'✓':'なし'}・オッズ ${oddsCount(odds)}頭`);await renderList()
}catch(e){console.error(e);setStatus('保存に失敗しました',true)}finally{busy=false}}
function setValue(id,v){const e=$(id);if(!e)return;e.value=v??'';e.dispatchEvent(new Event('change',{bubbles:true}))}
async function waitUntil(fn,limit=3000,step=60){const end=Date.now()+limit;while(Date.now()<end){if(fn())return true;await sleep(step)}return false}
async function restoreFile(rec){if(!rec.csvBlob)return false;const input=$('csvFile');if(!input)return false;const file=new File([rec.csvBlob],rec.csv?.name||'restored.csv',{type:rec.csv?.type||'text/csv',lastModified:rec.csv?.lastModified||Date.now()});try{const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof input.onchange==='function')input.onchange.call({files:[file]});return false}
  await waitUntil(()=>/行|解析済/.test($('csvState')?.textContent||''),3500);await sleep(120);if($('parseCsvBtn'))$('parseCsvBtn').click();await waitUntil(()=>/解析済/.test($('csvState')?.textContent||''),3500);return true}
async function restore(id){if(busy)return;busy=true;try{const r=await get(id);if(!r)return;setStatus('復元中…');
  const m=r.meta||{};setValue('raceDate',m.date);setValue('venue',m.venue);setValue('raceName',m.raceName);setValue('fieldSize',m.fieldSize);setValue('surface',m.surface);setValue('distance',m.distance);setValue('grade',m.grade);await waitUntil(()=>$('going'),3000);setValue('going',m.going||'良');
  if(r.odds!=null){setValue('oddsPaste',r.odds);$('applyOddsBtn')?.click()}
  let csvOk=true;if(r.csvBlob)csvOk=await restoreFile(r);
  if(r.wasAnalyzed&&csvOk){await sleep(350);$('analyzeBtn')?.click()}
  setStatus(`復元しました｜CSV ${r.csvBlob?'✓':'なし'}・オッズ ${oddsCount(r.odds)}頭`);window.scrollTo({top:0,behavior:'smooth'})
}catch(e){console.error(e);setStatus('復元に失敗しました',true)}finally{busy=false}}
async function renderList(){ui();const root=$('savedList');if(!root)return;let arr=[];try{arr=await all()}catch(e){root.innerHTML='<div class="notice red">一時保存DBを開けませんでした。</div>';return}arr.sort((a,b)=>b.savedAt-a.savedAt);if(!arr.length){root.innerHTML='<div class="muted" style="margin-top:8px">まだありません。</div>';return}root.innerHTML=arr.map(r=>{const m=r.meta||{},line=[m.date,m.venue,m.raceName||'レース'].filter(Boolean).join(' '),sub=[m.surface,m.distance?m.distance+'m':'',m.grade,m.going||'良'].filter(Boolean).join(' ');return `<div class="savedItem" data-workspace-id="${esc(r.id)}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>${esc(line)}</b><div class="tiny">${esc(sub)}｜CSV ${r.csvBlob?'✅':'—'}${r.csv?.size?` ${Math.max(1,Math.round(r.csv.size/1024))}KB`:''}｜オッズ ${oddsCount(r.odds)}頭｜${r.wasAnalyzed?'解析済み':'未解析'}</div><div class="tiny">${new Date(r.savedAt).toLocaleString('ja-JP')}</div></div><div class="actions" style="margin:0;flex:none"><button class="secondary" data-open="${esc(r.id)}">開く</button><button class="ghost" data-del="${esc(r.id)}">削除</button></div></div></div>`}).join('');root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>restore(b.dataset.open));root.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{await del(b.dataset.del);renderList()})}
function init(){ui();renderList();window.RaceWorkspace={save:saveCurrent,restore,list:renderList}}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();