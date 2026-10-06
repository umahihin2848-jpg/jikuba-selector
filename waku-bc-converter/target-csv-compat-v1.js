(function(){'use strict';
const C=window.ShapeCore;if(!C||!window.File||!File.prototype.arrayBuffer)return;
if(File.prototype.__rsaTargetCompat)return;
const orig=File.prototype.arrayBuffer;
const q=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const venueFromMeeting=v=>{const s=String(v||'');const map={札:'札幌',函:'函館',福:'福島',新:'新潟',東:'東京',中:'中山',名:'中京',京:'京都',阪:'阪神',小:'小倉'};for(const k of Object.keys(map))if(s.includes(k))return map[k];return''};
function transform(buf){
  let text;try{text=C.decode(buf)}catch(e){return buf}
  let grid;try{grid=C.parseCSV(text)}catch(e){return buf}
  if(!grid||grid.length<2)return buf;
  const h=grid[0].map(x=>String(x||'').trim());
  const hasTarget=h.includes('何走目')&&h.includes('馬名')&&(h.includes('レースPCI')||h.includes('RPCI'));
  if(!hasTarget)return buf;
  const idx=name=>h.indexOf(name), iName=idx('馬名'),iMeet=idx('開催'),iHistNo=idx('馬番'),iRpci=idx('レースPCI'),iStyle=idx('決手'),i1=idx('通過1'),i2=idx('通過2'),i3=idx('通過3'),i4=idx('通過4');
  if(iName<0)return buf;
  const outH=h.slice();
  if(iHistNo>=0)outH[iHistNo]='過去馬番';
  const add=[];
  const ensure=(name)=>{if(!outH.includes(name)){outH.push(name);add.push(name)}};
  ensure('馬番');ensure('RPCI');ensure('脚質');ensure('決め手');ensure('場所');ensure('1角');ensure('2角');ensure('3角');ensure('4角');
  const order=new Map();let next=1;
  const out=[outH];
  for(let rix=1;rix<grid.length;rix++){
    const r=grid[rix].slice();while(r.length<h.length)r.push('');
    const name=String(r[iName]||'').trim();if(name&&!order.has(name))order.set(name,next++);
    const extras={
      '馬番':name?String(order.get(name)||''):'',
      'RPCI':iRpci>=0?r[iRpci]:'',
      '脚質':iStyle>=0?r[iStyle]:'',
      '決め手':iStyle>=0?r[iStyle]:'',
      '場所':iMeet>=0?venueFromMeeting(r[iMeet]):'',
      '1角':i1>=0?r[i1]:'','2角':i2>=0?r[i2]:'','3角':i3>=0?r[i3]:'','4角':i4>=0?r[i4]:''
    };
    for(const k of add)r.push(extras[k]??'');
    out.push(r);
  }
  const csv=out.map(r=>r.map(q).join(',')).join('\r\n');
  return new TextEncoder().encode(csv).buffer;
}
File.prototype.arrayBuffer=function(){return orig.call(this).then(transform)};
File.prototype.__rsaTargetCompat=true;
function note(){setTimeout(()=>{const f=document.getElementById('csvFile'),info=document.getElementById('csvInfo');if(!f?.files?.[0]||!info)return;const n=f.files[0].name||'';if(!/\.csv$/i.test(n))return;if(!info.querySelector('[data-target-compat]')){const d=document.createElement('div');d.dataset.targetCompat='1';d.className='tiny';d.style.marginTop='6px';d.textContent='TARGET全馬一括CSVを自動変換：レースPCI→RPCI／決手→脚質／開催→競馬場／全馬出力順→今回馬番';info.appendChild(d)}},180)}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>{document.getElementById('csvFile')?.addEventListener('change',note)});else document.getElementById('csvFile')?.addEventListener('change',note);
})();
