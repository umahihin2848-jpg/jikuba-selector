const fs=require('fs'),cheerio=require('cheerio');
const yy=String(process.env.YY||''),chunk=Number(process.env.CHUNK||0),chunks=4;
if(!/^(22|23|24|25|26)$/.test(yy)||!Number.isInteger(chunk)||chunk<0||chunk>=chunks)throw Error('YY/CHUNK');
const source=yy==='26'?'analysis/waku-backtest/race_ids_2026_external.json':'analysis/waku-backtest/race_ids_2022_2025.json';
const all=JSON.parse(fs.readFileSync(source,'utf8')).map(String).filter(id=>id.startsWith(yy));
const ids=all.filter((_,i)=>i%chunks===chunk),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let e;for(let k=0;k<4;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research','accept-language':'ja,en-US;q=.7'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length<1000)throw Error('short');return t}catch(x){e=x;await sleep([300,800,1600,3000][k])}}throw e}
function norm(s){return String(s||'').replace(/\s+/g,' ').trim()}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function median(a){const x=a.filter(Number.isFinite).slice().sort((p,q)=>p-q);if(!x.length)return 1;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
function boundary(runners){
 const rs=runners.slice().sort((a,b)=>a.pop-b.pop),n=rs.length;if(n<2)return{end:Math.min(10,n),boundary:null};
 const inv=rs.map(x=>1/x.win),tot=inv.reduce((s,x)=>s+x,0),p=inv.map(x=>x/tot),share=k=>p.slice(0,Math.min(k,n)).reduce((s,x)=>s+x,0),wall=k=>k>=1&&k<n?rs[k].win/rs[k-1].win:null;
 const cand=[];for(let k=3;k<=Math.min(8,n-1);k++){const ratio=wall(k),near=[];for(let j=Math.max(1,k-2);j<=Math.min(n-1,k+2);j++)if(j!==k)near.push(wall(j));const base=median(near),prom=base>0?ratio/base:1,cum=share(k);
 const ss=clamp((cum-.55)/(.88-.55),0,1),ws=clamp((ratio-1.04)/(1.58-1.04),0,1),ps=clamp((prom-1)/(1.4-1),0,1),cs=clamp(1-(k-3)/(8-3),0,1),score=100*(.4*ss+.3*ws+.2*ps+.1*cs),eligible=cum>=.55&&score>=57&&(ratio>=1.10||prom>=1.08);cand.push({k,score,eligible})}
 const ok=cand.filter(x=>x.eligible).sort((a,b)=>b.score-a.score||a.k-b.k);return{end:ok[0]?.k||Math.min(10,n)}
}
function plTop2(horses){const W=horses.reduce((s,h)=>s+h.w,0),out=new Map;for(let i=0;i<horses.length;i++){const wi=horses[i].w;let p=wi/W;for(let j=0;j<horses.length;j++)if(j!==i){const wj=horses[j].w;p+=(wj/W)*(wi/(W-wj))}out.set(horses[i].horse,p)}return out}
function axes(runners){
 const fr=boundary(runners),cand=runners.filter(h=>h.pop<=fr.end),top2=plTop2(runners),groups={};for(const h of runners)(groups[h.frame]??=[]).push(h);
 const scored=cand.map(h=>{const den=groups[h.frame].reduce((s,x)=>s+x.w,0),rep=den?h.w/den:0,t2=top2.get(h.horse)||0;return{...h,frameRep:rep,top2:t2,axisScore:rep*t2}}).sort((a,b)=>b.axisScore-a.axisScore||a.pop-b.pop);
 if(!scored.length)return[];const a1=scored[0],a2=scored.find(x=>x.frame!==a1.frame)||scored[1];return[a1,a2].filter(Boolean)
}
function parseTarget(html,id){
 const $=cheerio.load(html),body=norm($('body').text()),hm=body.match(/(\d{1,2}:\d{2})発走\s+(.+?)\s+(?:GI{1,3}|G[123]|L)?\s*(芝|ダート)・[^ ]+\s+(\d{3,4})m/),runners=[];
 $('tr').each((_,tr)=>{const c=$(tr).find('th,td').map((_,x)=>norm($(x).text())).get(),om=(c[7]||'').match(/^(\d+)\(([\d.]+)\)$/);if(!/^\d+$/.test(c[1]||'')||!/^\d+$/.test(c[2]||'')||!om)return;const hlink=$(tr).find('a[href*="/keiba/directory/horse/"]').attr('href')||'';const hid=(hlink.match(/\/horse\/(\d+)\//)||[])[1]||null;runners.push({frame:+c[1],horse:+c[2],pop:+om[1],win:+om[2],w:1/(+om[2]),horseId:hid,name:$(tr).find('a[href*="/keiba/directory/horse/"]').first().text().trim()})});
 return{surface:hm?hm[3]:null,distance:hm?+hm[4]:null,runners}
}
function parsePassage(s){const m=String(s||'').match(/^([0-9-]+?)(\d{2}\.\d)$/);if(!m)return null;const ps=m[1].split('-').filter(Boolean).map(Number).filter(Number.isFinite);if(!ps.length)return null;return{first:ps[0],last:ps[ps.length-1]}}
function parseHistory(html,targetId){
 const $=cheerio.load(html),rows=[];
 $('a[href*="/keiba/race/"]').each((_,a)=>{const href=$(a).attr('href')||'',m=href.match(/\/keiba\/race\/(?:index|result)\/(\d{10})/);if(!m)return;const tr=$(a).closest('tr'),c=tr.find('th,td').map((_,x)=>norm($(x).text())).get();if(c.length<9)return;const info=c[1]||'',im=info.match(/(芝|ダート)(\d{3,4})m\s+(\d+)頭/),pass=parsePassage(c[8]);rows.push({id:m[1],surface:im?im[1]:null,distance:im?+im[2]:null,starters:im?+im[3]:null,finish:/^\d+$/.test(c[2]||'')?+c[2]:null,pass})});
 const idx=rows.findIndex(x=>x.id===targetId);if(idx<0)return[];
 return rows.slice(idx+1,idx+4);
}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){const i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
(async()=>{
 const out=await mapLimit(ids,5,async(id,i)=>{
  try{
   const th=await get('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/'),t=parseTarget(th,id),ax=axes(t.runners);
   const styles=[];
   for(const a of ax){
    if(!a.horseId){styles.push({horse:a.horse,frame:a.frame,known:false});continue}
    try{const hh=await get('https://sports.yahoo.co.jp/keiba/directory/horse/'+a.horseId+'/'),hist=parseHistory(hh,id),known=hist.filter(x=>x.pass&&x.starters);
      const prev1=known[0]||null,fronts=known.map(x=>x.pass.first<=3?1:0);
      styles.push({horse:a.horse,frame:a.frame,horseId:a.horseId,known:!!prev1,prev1Front:prev1?+(prev1.pass.first<=3):null,prev1FirstNorm:prev1?prev1.pass.first/prev1.starters:null,prev1LastNorm:prev1?prev1.pass.last/prev1.starters:null,prev1Distance:prev1?prev1.distance:null,distanceChange:prev1&&t.distance?t.distance-prev1.distance:null,frontRate3:fronts.length?fronts.reduce((s,x)=>s+x,0)/fronts.length:null,historyN:known.length})}
    catch(e){styles.push({horse:a.horse,frame:a.frame,horseId:a.horseId,known:false,error:e.message})}
   }
   const known=styles.filter(x=>x.known),vals=k=>known.map(x=>x[k]).filter(Number.isFinite);
   const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
   if((i+1)%10===0)console.log(yy,chunk,i+1,'/',ids.length);
   return{id,year:2000+ +id.slice(0,2),raceNo:+id.slice(-2),targetSurface:t.surface,targetDistance:t.distance,axisFrames:ax.map(x=>x.frame),axisHorses:ax.map(x=>x.horse),styleKnownN:known.length,axisPrev1FrontShare:mean(vals('prev1Front')),axisFrontRate3:mean(vals('frontRate3')),axisPrevFirstNorm:mean(vals('prev1FirstNorm')),axisPrevLastNorm:mean(vals('prev1LastNorm')),axisDistanceChange:mean(vals('distanceChange')),styles};
  }catch(e){return{id,year:2000+ +id.slice(0,2),error:e.message}}
 });
 fs.mkdirSync('analysis/waku-backtest/axis-style-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/axis-style-out/style-'+yy+'-'+chunk+'.json',JSON.stringify(out));
 console.log('STYLE',yy,chunk,'N',out.length,'good',out.filter(x=>!x.error).length,'bothKnown',out.filter(x=>x.styleKnownN===2).length);
})().catch(e=>{console.error(e);process.exit(1)});