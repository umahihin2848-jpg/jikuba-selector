(()=>{'use strict';
if(window.__M3_INPUT_FIDELITY_V1)return;window.__M3_INPUT_FIDELITY_V1=true;
const V='m3-input-fidelity-v1.0',$=id=>document.getElementById(id),C=window.ShapeCore;
let byName=new Map(),parsed=false,timer=0;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||v==='')return NaN;const x=Number(String(v).normalize('NFKC').replace(/[,秒%％倍\s]/g,''));return Number.isFinite(x)?x:NaN};
const dateVal=v=>C?.dateVal?C.dateVal(String(v||'').normalize('NFKC')):Number(String(v||'').replace(/\D/g,''))||0;
const norm=h=>C?.normHead?C.normHead(h):String(h||'').normalize('NFKC').trim().replace(/[\s　]/g,'');
function col(headers,names){const nn=names.map(norm);return headers.find(h=>nn.includes(norm(h)))||headers.find(h=>nn.some(x=>norm(h).includes(x)))||''}
function firstFinite(vals){for(const v of vals){const x=num(v);if(Number.isFinite(x))return x}return NaN}
function classify(r){
  const full=r.histN>=5&&r.prN>=5&&r.last3fN>=5&&r.gapN>=5&&r.frontN>=5;
  if(full)return{level:'FULL',icon:'🟢',cls:'full'};
  const strong=[r.prN,r.last3fN,r.gapN,r.frontN].filter(x=>x>=3).length;
  if(r.histN>=3&&strong>=3)return{level:'PARTIAL',icon:'🟡',cls:'partial'};
  return{level:'LOW',icon:'🔴',cls:'low'};
}
async function parse(file){
  byName=new Map();parsed=false;if(!file||!C)return publish([]);
  try{
    const buf=window.RSATargetCsvCache?.arrayBuffer?await window.RSATargetCsvCache.arrayBuffer(file):await file.arrayBuffer();
    const grid=C.parseCSV(C.decode(buf));if(!grid?.length)return;
    const z=C.rowsToObjects(grid),h=z.headers,m={
      name:col(h,['馬名']),date:col(h,['日付','年月日','レース日']),surface:col(h,['芝・ダ','芝・ダート','芝ダ']),
      pci:col(h,['PCI']),rpci:col(h,['RPCI','レースPCI']),last3f:col(h,['上り3F','上がり3F']),gap:col(h,['上3F地点差','-3F差','－3F差','−3F差']),
      field:col(h,['頭数','出走頭数']),c1:col(h,['1角','１角','通過1']),c2:col(h,['2角','２角','通過2']),c3:col(h,['3角','３角','通過3']),c4:col(h,['4角','４角','通過4'])
    };
    if(!m.name||!m.date)return;
    for(const row of z.rows){
      const name=String(row[m.name]||'').trim(),d=dateVal(row[m.date]);if(!name||!d)continue;
      const field=num(row[m.field]),first=firstFinite([m.c1?row[m.c1]:null,m.c2?row[m.c2]:null,m.c3?row[m.c3]:null,m.c4?row[m.c4]:null]);
      const rec={date:d,surface:String(m.surface?row[m.surface]||'':''),pci:num(m.pci?row[m.pci]:''),rpci:num(m.rpci?row[m.rpci]:''),last3f:num(m.last3f?row[m.last3f]:''),gap:num(m.gap?row[m.gap]:''),front:Number.isFinite(field)&&field>1&&Number.isFinite(first)?(field-first)/(field-1):NaN};
      if(!byName.has(name))byName.set(name,[]);byName.get(name).push(rec);
    }
    for(const a of byName.values())a.sort((a,b)=>b.date-a.date);
    parsed=true;schedule();
  }catch(e){console.warn('m3 input fidelity',e)}
}
function rows(){
  const F=window.Finish600State?.rows||[],raceDate=dateVal($('raceDate')?.value)||99999999,currentSurf=String($('surface')?.value||'');
  return F.map(fr=>{
    const a=(byName.get(String(fr.name||'').trim())||[]).filter(x=>x.date<raceDate).slice(0,5);
    const prN=a.filter(x=>Number.isFinite(x.pci)&&Number.isFinite(x.rpci)).length,last3fN=a.filter(x=>Number.isFinite(x.last3f)&&x.last3f>=28&&x.last3f<=50).length,gapN=a.filter(x=>Number.isFinite(x.gap)).length,frontN=a.filter(x=>Number.isFinite(x.front)).length,sameSurfaceN=a.filter(x=>currentSurf?String(x.surface).includes(currentSurf.includes('ダ')?'ダ':'芝'):false).length;
    const r={no:String(fr.no),name:String(fr.name||''),m3Rank:Number(fr.finishRank),histN:a.length,prN,last3fN,gapN,frontN,sameSurfaceN};return{...r,...classify(r)};
  }).sort((a,b)=>a.m3Rank-b.m3Rank||Number(a.no)-Number(b.no));
}
function publish(r){
  const counts={FULL:r.filter(x=>x.level==='FULL').length,PARTIAL:r.filter(x=>x.level==='PARTIAL').length,LOW:r.filter(x=>x.level==='LOW').length};
  window.M3InputFidelityState={ready:true,version:V,displayOnly:true,rankingImpact:false,bettingImpact:false,rule:{FULL:'直近5走でPCI/RPCI・上がり3F・上3F地点差・位置入力がすべて5/5',PARTIAL:'直近履歴3走以上かつ主要4入力のうち3項目以上が3走以上',LOW:'PARTIAL未満'},counts,rows:r,at:Date.now()};
  dispatchEvent(new CustomEvent('m3-input-fidelity-ready',{detail:window.M3InputFidelityState}));
}
function ensureSummary(r){
  const root=$('finish600Simulator');if(!root)return;let box=$('m3InputFidelitySummary');if(!box){box=document.createElement('div');box.id='m3InputFidelitySummary';const note=root.querySelector('.f6Note');note?note.insertAdjacentElement('afterend',box):root.prepend(box)}
  const c={FULL:r.filter(x=>x.level==='FULL').length,PARTIAL:r.filter(x=>x.level==='PARTIAL').length,LOW:r.filter(x=>x.level==='LOW').length};
  box.innerHTML=`<span>INPUT FIDELITY</span><b>🟢 ${c.FULL}</b><b>🟡 ${c.PARTIAL}</b><b>🔴 ${c.LOW}</b><small>表示のみ｜M3順位・買い目は変更しません</small>`;
}
function render(){
  timer=0;if(!parsed||!window.Finish600State?.ready)return;
  const r=rows(),byNo=new Map(r.map(x=>[x.no,x])),cards=[...document.querySelectorAll('#finish600Simulator .f6Row')];
  cards.forEach(card=>{card.querySelectorAll('.m3Fidelity').forEach(x=>x.remove());const no=String(card.querySelector('.f6Top b')?.textContent.match(/^(\d+)番/)?.[1]||'');const x=byNo.get(no);if(!x)return;const badge=document.createElement('div');badge.className=`m3Fidelity ${x.cls}`;badge.innerHTML=`<strong>${x.icon} ${x.level}</strong><span>履歴 ${x.histN}/5｜PCI/RPCI ${x.prN}/5｜上り ${x.last3fN}/5｜−3F ${x.gapN}/5｜位置 ${x.frontN}/5</span>`;card.querySelector('.f6Body')?.appendChild(badge)});
  ensureSummary(r);publish(r);
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,60)}
const css=document.createElement('style');css.textContent=`#m3InputFidelitySummary{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:7px 0 2px;padding:6px 7px;border:1px solid #294d61;border-radius:9px;background:#0a2230;font-size:7px;color:#83a3b2}#m3InputFidelitySummary>span{font-weight:900;letter-spacing:.08em;color:#c7e4ef}#m3InputFidelitySummary>b{font-size:8px}#m3InputFidelitySummary>small{margin-left:auto;font-size:6px;color:#6f8e9d}.m3Fidelity{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:5px;padding:4px 6px;border-radius:7px;font-size:6px}.m3Fidelity strong{font-size:7px}.m3Fidelity span{color:#9bb4bf}.m3Fidelity.full{border:1px solid #3c6d5b;background:#0c2b24}.m3Fidelity.full strong{color:#8be3b9}.m3Fidelity.partial{border:1px solid #6a6038;background:#292514}.m3Fidelity.partial strong{color:#e9d37e}.m3Fidelity.low{border:1px solid #72464b;background:#2b171a}.m3Fidelity.low strong{color:#f0a3aa}@media(max-width:520px){#m3InputFidelitySummary>small{width:100%;margin-left:0}.m3Fidelity{display:grid;grid-template-columns:auto 1fr}}`;document.head.appendChild(css);
function bind(){const f=$('csvFile');if(f){f.addEventListener('change',e=>parse(e.target.files?.[0]));if(f.files?.[0])parse(f.files[0])}}
['finish600-ready','rsa-analysis-complete','m3-race-lab-ready'].forEach(ev=>addEventListener(ev,schedule));document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id))schedule()},true);if(document.readyState==='loading')addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
