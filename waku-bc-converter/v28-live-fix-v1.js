(function(){'use strict';
const C=window.ShapeCore;if(!C)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s_　]/g,'').toUpperCase();
const uniq=a=>[...new Set(a.map(x=>String(x??'').trim()).filter(Boolean))];
function firstHeader(headers,aliases){const ns=headers.map(h=>[h,norm(h)]);for(const a of aliases){const na=norm(a),hit=ns.find(([,n])=>n===na);if(hit)return hit[0]}return''}
function oneValue(rows,key){if(!key)return'';const u=uniq(rows.map(r=>r[key]));return u.length===1?u[0]:''}
function dateISO(v){const s=String(v||'').trim();let m=s.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);if(!m){const d=s.replace(/\D/g,'');if(d.length===8)m=[d,d.slice(0,4),d.slice(4,6),d.slice(6,8)];else if(d.length===6)m=['','20'+d.slice(0,2),d.slice(2,4),d.slice(4,6)]}return m?`${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`:''}
function venue(v){v=String(v||'').trim();const places=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];for(const p of places)if(v.includes(p)||v.includes(p[0]))return p;return v}
function surface(v){v=String(v||'');return v.includes('ダ')?'ダート':v.includes('芝')?'芝':''}
function grade(v){let s=String(v||'').normalize('NFKC').toUpperCase().replace(/Ｇ/g,'G');if(s.includes('G1'))return'G1';if(s.includes('G2'))return'G2';if(s.includes('G3'))return'G3';if(s.includes('OP(L)')||s==='L'||s.includes('LISTED'))return'L';if(s.includes('OP')||s.includes('オープン')||s.includes('ｵｰﾌﾟﾝ'))return'OP';if(s.includes('3勝')||s.includes('1600万'))return'3勝';return''}
function setVal(id,v){const e=$(id);if(!e||v===null||v===undefined||v==='')return false;e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));return true}
function showAutofill(items){const info=$('csvInfo');if(!info||!items.length)return;let old=info.querySelector('[data-race-autofill]');if(!old){old=document.createElement('div');old.dataset.raceAutofill='1';old.className='tiny';old.style.marginTop='6px';info.appendChild(old)}old.textContent='レース条件を自動反映：'+items.join(' / ')}
async function inspectRaceMeta(file){if(!file)return;try{
  const grid=C.parseCSV(C.decode(await file.arrayBuffer()));if(grid.length<2)return;
  const obj=C.rowsToObjects(grid),h=obj.headers,r=obj.rows,done=[];
  const horse=firstHeader(h,['馬名']);
  if(horse){const n=uniq(r.map(x=>x[horse])).length;if(n>=2&&setVal('fieldSize',n))done.push(`頭数 ${n}`)}
  const aliases={
    date:['今回日付','今走日付','出走日','出走日付','今回日付S','今走日付S'],
    venue:['今回競馬場','今回場所','今走競馬場','出走競馬場','出走場所','今回開催場所'],
    race:['今回レース名','今走レース名','出走レース名','今回競走名'],
    surf:['今回芝・ダート','今回芝・ダ','今走芝・ダート','出走芝・ダート','今回トラック'],
    dist:['今回距離','今走距離','出走距離'],
    grd:['今回格','今回クラス','今走クラス','出走クラス','今回グレード'],
    size:['今回頭数','今走頭数','出走頭数']
  };
  const kd=firstHeader(h,aliases.date),kv=firstHeader(h,aliases.venue),kr=firstHeader(h,aliases.race),ks=firstHeader(h,aliases.surf),kdi=firstHeader(h,aliases.dist),kg=firstHeader(h,aliases.grd),kn=firstHeader(h,aliases.size);
  const vd=oneValue(r,kd),vv=oneValue(r,kv),vr=oneValue(r,kr),vs=oneValue(r,ks),vdi=oneValue(r,kdi),vg=oneValue(r,kg),vn=oneValue(r,kn);
  if(vd&&setVal('raceDate',dateISO(vd)))done.push('日付');
  if(vv&&setVal('venue',venue(vv)))done.push('競馬場');
  if(vr&&setVal('raceName',vr))done.push('レース名');
  if(vs&&setVal('surface',surface(vs)))done.push('芝/ダ');
  if(vdi){const m=String(vdi).match(/\d{3,4}/);if(m&&setVal('distance',m[0]))done.push('距離')}
  if(vg&&grade(vg)&&setVal('grade',grade(vg)))done.push('格');
  if(vn){const m=String(vn).match(/\d+/);if(m&&setVal('fieldSize',m[0]))done.push('頭数')}
  showAutofill([...new Set(done)]);
}catch(e){}}
function raceMeta(){return{date:$('raceDate')?.value||'',venue:$('venue')?.value||'',name:$('raceName')?.value||'',surface:$('surface')?.value||'',distance:$('distance')?.value||'',grade:$('grade')?.value||'',field:$('fieldSize')?.value||''}}
function prettyDate(v){if(!v)return'';const m=v.match(/(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}/${+m[2]}/${+m[3]}`:v}
function raceLine(m){return [prettyDate(m.date),m.venue,m.name,[m.surface,m.distance?m.distance+'m':'',m.grade].filter(Boolean).join(' ')].filter(Boolean).join('　')}
function ensureRaceHeader(){const result=$('result');if(!result||$('raceIdentityV28'))return;const hero=result.querySelector('.card.hero');if(!hero)return;const d=document.createElement('div');d.id='raceIdentityV28';d.style.cssText='margin:12px 0 0;padding:10px 12px;border:1px solid #214459;border-radius:12px;background:#091a26;font-size:13px;line-height:1.5;color:#b9d1df;font-weight:700';hero.insertAdjacentElement('beforebegin',d)}
function renderRaceIdentity(){ensureRaceHeader();const m=raceMeta(),line=raceLine(m),d=$('raceIdentityV28');if(d)d.innerHTML=line?`<span style="color:#7fe5bd">RACE</span>　${esc(line)}`:'レース条件を入力するとここに表示します。';const ex=$('explain');if(ex&&line){let p=ex.querySelector('[data-race-id-v28]');if(!p){p=document.createElement('p');p.dataset.raceIdV28='1';ex.insertBefore(p,ex.firstElementChild)}p.innerHTML=`<b>レース：</b>${esc(line)}`}}
function bindFile(){const f=$('csvFile');if(!f)return;f.addEventListener('change',e=>{const file=e.target.files?.[0];setTimeout(()=>inspectRaceMeta(file),120)});if(f.files?.[0])inspectRaceMeta(f.files[0])}
let timer=null,lastSig='';
function sourceSignature(){return['abilityListV27','courseFitList','conditionChangeList','horseFitList'].map(id=>{const e=$(id);return id+':' +(e?e.querySelectorAll('.horse').length:0)+':' +(e?.textContent||'').slice(0,80)}).join('|')}
function nudgeIntegrated(){clearTimeout(timer);timer=setTimeout(()=>{const sig=sourceSignature();if(sig===lastSig)return;lastSig=sig;window.dispatchEvent(new CustomEvent('ability-opponent-ready'));setTimeout(renderRaceIdentity,120)},80)}
function relevantNode(n){if(!n||n.nodeType!==1)return false;const ids=['abilityListV27','courseFitList','conditionChangeList','horseFitList'];return ids.some(id=>n.id===id||n.closest?.('#'+id)||n.querySelector?.('#'+id))}
function observe(){const mo=new MutationObserver(ms=>{if(ms.some(m=>relevantNode(m.target)||[...m.addedNodes].some(relevantNode)))nudgeIntegrated()});mo.observe(document.body,{childList:true,subtree:true,characterData:true})}
function bindAnalyze(){const b=$('analyzeBtn');if(b)b.addEventListener('click',()=>{lastSig='';setTimeout(renderRaceIdentity,60);setTimeout(nudgeIntegrated,250);setTimeout(nudgeIntegrated,800);setTimeout(nudgeIntegrated,1800)})}
function init(){bindFile();observe();bindAnalyze();renderRaceIdentity()}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init);else init();
})();