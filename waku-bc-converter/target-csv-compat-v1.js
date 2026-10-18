(function(){'use strict';
const C=window.ShapeCore;if(!C||!window.File||!File.prototype.arrayBuffer)return;
if(File.prototype.__rsaTargetCompat)return;
const origArrayBuffer=File.prototype.arrayBuffer,origDecode=C.decode.bind(C),origParseCSV=C.parseCSV.bind(C);
const fileBufferCache=new WeakMap(),fileSignatureCache=new Map(),decodeCache=new WeakMap();let lastCsvText=null,lastCsvGrid=null;
const stats={rawReads:0,transforms:0,bufferHits:0,decodeHits:0,parseHits:0,obstacleRowsSkipped:0,nonFinishRowsSkipped:0};
const q=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const fileSignature=f=>`${String(f?.name||'')}|${Number(f?.size)||0}|${Number(f?.lastModified)||0}|${String(f?.type||'')}`;
const venueFromMeeting=v=>{
  const s=String(v||'').trim();
  const full=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  if(full.includes(s))return s;
  const map={札:'札幌',函:'函館',福:'福島',新:'新潟',東:'東京',中:'中山',名:'中京',京:'京都',阪:'阪神',小:'小倉'};
  const m=s.match(/^[0-9]*([札函福新東中名京阪小])[0-9]*$/);
  return m?(map[m[1]]||''):'';
};
const normalizeDate=v=>{const s=String(v||'').trim();const m=s.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);if(!m)return s;return `${m[1]}.${String(+m[2]).padStart(2,'0')}.${String(+m[3]).padStart(2,'0')}`};
const isObstacle=(r,iRaceName,iRaceType)=>{
  const race=iRaceName>=0?String(r[iRaceName]||'').trim():'';
  const type=iRaceType>=0?String(r[iRaceType]||'').normalize('NFKC').trim():'';
  return type==='18'||type==='19'||race.includes('障害');
};
const isNonFinish=(r,iFinish)=>{
  if(iFinish<0)return false;
  const s=String(r[iFinish]||'').normalize('NFKC').trim();
  return ['止','中止','取','取消','消','除','除外','外','失','失格'].includes(s);
};
function transform(buf){
  stats.transforms++;
  let text;try{text=origDecode(buf)}catch(e){return buf}
  let grid;try{grid=origParseCSV(text)}catch(e){return buf}
  if(!grid||grid.length<2)return buf;
  const h=grid[0].map(x=>String(x||'').trim());
  const hasTarget=h.includes('何走目')&&h.includes('馬名')&&(h.includes('レースPCI')||h.includes('RPCI'));
  if(!hasTarget)return buf;
  const idx=name=>h.indexOf(name),iName=idx('馬名'),iMeet=idx('開催'),iHistNo=idx('馬番'),iRpci=idx('レースPCI'),iStyle=idx('決手'),iDate=idx('日付'),i1=idx('通過1'),i2=idx('通過2'),i3=idx('通過3'),i4=idx('通過4'),iRaceName=idx('レース名'),iRaceType=idx('競走種別コード'),iFinish=idx('着順');
  if(iName<0)return buf;
  const outH=h.slice();
  if(iHistNo>=0)outH[iHistNo]='過去馬番';
  const add=[];
  const ensure=name=>{if(!outH.includes(name)){outH.push(name);add.push(name)}};
  ensure('馬番');ensure('RPCI');ensure('脚質');ensure('決め手');ensure('場所');ensure('1角');ensure('2角');ensure('3角');ensure('4角');
  const order=new Map();let next=1;
  const out=[outH];
  for(let rix=1;rix<grid.length;rix++){
    const r=grid[rix].slice();while(r.length<h.length)r.push('');
    if(isObstacle(r,iRaceName,iRaceType)){stats.obstacleRowsSkipped++;continue}
    if(isNonFinish(r,iFinish)){stats.nonFinishRowsSkipped++;continue}
    if(iDate>=0)r[iDate]=normalizeDate(r[iDate]);
    const name=String(r[iName]||'').trim();if(name&&!order.has(name))order.set(name,next++);
    const extras={'馬番':name?String(order.get(name)||''):'','RPCI':iRpci>=0?r[iRpci]:'','脚質':iStyle>=0?r[iStyle]:'','決め手':iStyle>=0?r[iStyle]:'','場所':iMeet>=0?venueFromMeeting(r[iMeet]):'','1角':i1>=0?r[i1]:'','2角':i2>=0?r[i2]:'','3角':i3>=0?r[i3]:'','4角':i4>=0?r[i4]:''};
    for(const k of add)r.push(extras[k]??'');
    out.push(r);
  }
  const csv=out.map(r=>r.map(q).join(',')).join('\r\n');
  return new TextEncoder().encode(csv).buffer;
}
function cachedBuffer(file){
  let p=fileBufferCache.get(file);
  if(p){stats.bufferHits++;return p}
  const key=fileSignature(file);
  p=fileSignatureCache.get(key);
  if(p){stats.bufferHits++;fileBufferCache.set(file,p);return p}
  stats.rawReads++;
  p=origArrayBuffer.call(file).then(transform);
  fileBufferCache.set(file,p);fileSignatureCache.set(key,p);
  return p
}
File.prototype.arrayBuffer=function(){return cachedBuffer(this)};
File.prototype.__rsaTargetCompat=true;
C.decode=function(buf){if(buf&&typeof buf==='object'){const hit=decodeCache.get(buf);if(hit!==undefined){stats.decodeHits++;return hit}const text=origDecode(buf);decodeCache.set(buf,text);return text}return origDecode(buf)};
C.parseCSV=function(text){if(typeof text==='string'&&text===lastCsvText&&lastCsvGrid){stats.parseHits++;return lastCsvGrid}const grid=origParseCSV(text);if(typeof text==='string'&&text.length>256){lastCsvText=text;lastCsvGrid=grid}return grid};
window.RSATargetCsvCache={version:'target-csv-cache-v5-webkit-signature',stats,arrayBuffer:cachedBuffer,clear(){lastCsvText=null;lastCsvGrid=null;fileSignatureCache.clear()}};
function note(){setTimeout(()=>{const f=document.getElementById('csvFile'),info=document.getElementById('csvInfo');if(!f?.files?.[0]||!info)return;const n=f.files[0].name||'';if(!/\.csv$/i.test(n))return;if(!info.querySelector('[data-target-compat]')){const d=document.createElement('div');d.dataset.targetCompat='1';d.className='tiny';d.style.marginTop='6px';d.textContent='TARGET全馬一括CSVを共有キャッシュ：レースPCI→RPCI／決手→脚質／開催→競馬場／日付正規化／障害・取消・除外・競走中止・失格を除外／全馬出力順→今回馬番';info.appendChild(d)}},180)}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>{document.getElementById('csvFile')?.addEventListener('change',note)});else document.getElementById('csvFile')?.addEventListener('change',note);
})();