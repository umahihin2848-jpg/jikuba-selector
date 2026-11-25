(function(root){'use strict';
const V='closing-shadow-frozen-v1',norm=v=>String(v??'').normalize('NFKC').trim(),N=v=>norm(v)===''?NaN:Number(norm(v)),finite=Number.isFinite,avg=a=>{a=a.filter(finite);return a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN},med=a=>{a=a.filter(finite).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:NaN},sd=a=>{a=a.filter(finite);const m=avg(a);return a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)):NaN},fb=(x,v)=>finite(x)?x:v,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const venues=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'],grade=v=>({'1600万':'3勝','オープン':'OP','OP(L)':'L','オープン(L)':'L','L':'L','3勝':'3勝','OP':'OP','G1':'G1','G2':'G2','G3':'G3'}[norm(v)]||''),surf=v=>/^(芝|T)$/.test(norm(v))?'芝':/^(ダ|ダート|D)$/.test(norm(v))?'ダ':'';
const day=v=>{const m=norm(v).match(/^(20\d{2})[-./ ]+\s*(\d{1,2})[-./ ]+\s*(\d{1,2})$/);let s=m?m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0'):norm(v);if(!/^20\d{6}$/.test(s))return 0;const d=new Date(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T00:00:00Z');return finite(+d)&&d.toISOString().slice(0,10).replace(/-/g,'')===s?+s:0;};
const get=(r,...keys)=>{for(const k of keys)if(Object.prototype.hasOwnProperty.call(r,k)&&norm(r[k])!=='')return r[k];return '';};
const time=v=>{const s=norm(v),m=s.match(/^(\d{1,2})[.:](\d{2})\.(\d)$/);if(m)return +m[1]*60 + +m[2]+ +m[3]/10;if(/^\d{3,5}$/.test(s)){const n=+s;return Math.floor(n/1000)*60+(n%1000)/10;}return NaN;};
function parse(rows){
 const map=new Map(),seen=new Map(),conflicts=new Set();
 for(const r of rows){
  const name=norm(get(r,'馬名')),id=norm(get(r,'レースID(新)')),date=day(get(r,'日付','年月日','レース日')),s=surf(get(r,'芝・ダ','芝・ダート','芝ダ')),g=grade(get(r,'クラス名')),n=N(get(r,'頭数','出走頭数')),finish=N(get(r,'着順','確定着順')),dist=N(get(r,'距離.1','距離')),v=venues[+id.slice(8,10)-1];
  if(!name||!/^20\d{16}$/.test(id)||!v||date!==+id.slice(0,8)||!s||!g||!Number.isInteger(n)||n<2||n>18||!Number.isInteger(finish)||finish<1||finish>n||!finite(dist)||dist<=600)continue;
  const last=N(get(r,'上り3F','上がり3F')),ave=N(get(r,'Ave-3F')),total=time(get(r,'走破タイム.1','タイム','走破タイム')),pci=N(get(r,'PCI')),rpci=N(get(r,'RPCI','レースPCI')),rank=N(get(r,'上り3F順位','上がり3F順位','上り順位')),gap=N(get(r,'上3F地点差','-3F差')),first=[1,2,3,4].map(i=>N(get(r,i+'角','通過'+i))).find(v=>v>=1&&v<=n),front=finite(first)?(n-first)/(n-1):NaN,going=norm(get(r,'馬場状態')).replace('稍重','稍').replace('不良','不'),route=norm(get(r,'コース区分'));
  const rec={id,date,name,s,g,n,finish,dist,v,going,route,last,ave,total,pci,rpci,rank,gap,front};const key=name+'|'+id.slice(0,16),sig=JSON.stringify(rec);
  if(seen.has(key)){if(seen.get(key)!==sig)conflicts.add(key);continue;}seen.set(key,sig);if(!map.has(name))map.set(name,[]);map.get(name).push(rec);
 }
 for(const [name,a] of map)map.set(name,a.filter(x=>!conflicts.has(name+'|'+x.id.slice(0,16))).sort((a,b)=>b.date-a.date||b.id.localeCompare(a.id)));
 return map;
}
function linear(m,a){return m.b+m.coef.reduce((s,w,i)=>s+w*fb(a[i],m.med[i]),0);}
function index(rec,M){
 const {s,g,n,dist,v,going,route,last,ave,total,pci,rank}=rec,early=(total-last)*600/(dist-600),stratum=s+'_'+(dist<=1400?'short':dist<=1800?'mile':dist<=2200?'mid':dist<=2600?'long':'xl');
 if(rec.date<=M.correction_cutoff||!(last>=25&&last<=50&&early>=27&&early<=48&&pci>=0&&pci<=100&&Math.abs(early-ave)<=.08&&rank>=1&&rank<=n)||!M.cat[1][s+'_'+going]||!M.cat[2][s+'_'+g]||!M.cat[3][stratum])return null;
 const keys=[v+'_'+s+'_'+dist+'_'+route,s+'_'+going,s+'_'+g,stratum],c=early-36,sq=c*c,vals={dist,n,early_c:c,early_sq:sq,['e_'+stratum]:c,['sq_'+stratum]:sq};
 const predict=(k,i)=>M[k].b+Object.entries(M[k].num).reduce((t,[f,w])=>t+w*(vals[f]??0),0)+keys.reduce((t,key,j)=>t+(M.cat[j][key]?.[i]??0),0)-last;
 return {date:rec.date,venue:v,dist,last,early,rank:1-(rank-1)/(n-1),condition:predict('cond',0),load:predict('load',1),unknownCourse:!M.cat[0][keys[0]]};
}
function features(a,s,dist,n,no){
 a=a.slice(0,5);const same=a.filter(x=>x.s===s),ar=(key,ls=a)=>ls.map(x=>key==='diff'?x.pci-x.rpci:key==='last'&&(x.last<28||x.last>50)?NaN:x[key]);const gp=ar('gap'),l=ar('last'),di=ar('diff'),fr=ar('front');
 return [fb(med(gp),.7),fb(med(ar('pci')),50),fb(med(ar('rpci')),50),fb(med(l),35.5),fb(avg(l),35.5),fb(sd(l),1),fb(avg(fr),.5528647823),fb(med(di),0),fb(avg(di),0),fb(sd(di),2),fb(med(ar('diff',same)),fb(med(di),0)),fb(med(ar('last',same)),fb(med(l),35.5)),same.length,a.length,n,(no-1)/(n-1),dist,s==='ダ'?1:0];
}
function ranked(rows,key,dest){
 const a=rows.filter(h=>finite(h[key])).sort((a,b)=>a[key]-b[key]||Number(a.no)-Number(b.no));for(let i=0;i<a.length;i++){a[i][dest]=i&&Math.abs(a[i][key]-a[i-1][key])<=1e-8?a[i-1][dest]:i+1;}return a.length;
}
function compute(M,map,roster,meta){
 const bad=reason=>({ready:false,reason,version:V,rows:[]}),date=day(meta.date),s=surf(meta.surface),dist=N(meta.distance),n=roster.length;
 if(!M||!map)return bad('参考モデル・過去走の読込待ち');
 if(date<=M.cutoff)return bad('学習終了日（2026/10/04）以前は参考予測を表示しません');
 if(!s||!finite(dist)||dist<=600||n<12||n>18||new Set(roster.map(x=>norm(x.name))).size!==n||new Set(roster.map(x=>String(x.no))).size!==n)return bad('対象条件・馬名照合待ち');
 const rows=roster.map(h=>{const a=(map.get(norm(h.name))||[]).filter(x=>x.date<date),history=a.filter(x=>x.s===s).map(x=>index(x,M)).filter(Boolean).slice(0,10),load=avg(history.map(x=>x.load)),condition=avg(history.map(x=>x.condition)),count=history.length,ranking=avg(history.map(x=>x.rank)),f=features(a,s,dist,n,+h.no),pg=clamp(linear(M.gap,[f[0],f[6],f[14],f[15]]),0,3.5),x=[pg,...f],baseScore=count?pg-linear(M.base,x):null,shadowScore=count?pg-linear(M.shadow,[...x,count,0,ranking,load]):null;
  return {no:String(h.no),name:h.name,history,load:finite(load)?load:null,condition:finite(condition)?condition:null,sd:count>=2?sd(history.map(x=>x.load)):null,count,loadScore:finite(load)?-load:null,baseScore,shadowScore,unknownCourses:history.filter(x=>x.unknownCourse).length};});
 const eligible=ranked(rows,'shadowScore','shadowRank');ranked(rows,'baseScore','baseRank');ranked(rows,'loadScore','loadRank');return {ready:true,version:V,cutoff:M.cutoff,eligible,field:n,rows,byNo:Object.fromEntries(rows.map(h=>[h.no,h]))};
}
const core={version:V,parse,index,features,compute,linear,day,time};root.RSAClosingShadowCore=core;
const D=root.document;if(!D)return;
let M=null,modelStatus='loading',file=null,hist=null,fileStatus='waiting',rev=0,cache=null;
const emit=()=>{rev++;cache=null;root.dispatchEvent(new root.CustomEvent('closing-shadow-ready'));};
root.RSAClosingShadowV1={version:V,status:()=>rev,read:(roster,meta)=>{const current=D.getElementById('csvFile')?.files?.[0];if(current!==file)loadFile(current);if(modelStatus!=='ready'||fileStatus!=='ready')return {ready:false,reason:modelStatus==='error'?'参考モデル読込エラー':fileStatus==='error'?'過去走CSV読込エラー':'参考モデル・過去走読込待ち',rows:[]};const key=JSON.stringify([meta,roster.map(h=>[h.no,h.name])]);if(cache?.key===key)return cache.value;const value=compute(M,hist,roster,meta);cache={key,value};return value;}};
async function loadFile(f){file=f;hist=null;fileStatus=f?'loading':'waiting';emit();if(!f)return;try{const C=root.ShapeCore;if(!C)throw Error('CSV');const grid=C.parseCSV(C.decode(await f.arrayBuffer()));if(f!==file)return;hist=parse(C.rowsToObjects(grid).rows);fileStatus='ready';emit();}catch(e){if(f===file){fileStatus='error';emit();}}}
fetch('data/closing-shadow-frozen-v1.json?v=20261126close1').then(r=>{if(!r.ok)throw Error('model');return r.json();}).then(m=>{if(m.cutoff!==20261004||m.shadow?.coef?.length!==23||m.base?.coef?.length!==19||m.cat?.length!==4)throw Error('format');M=m;modelStatus='ready';emit();}).catch(()=>{modelStatus='error';emit();});
function bind(){const el=D.getElementById('csvFile');el?.addEventListener('change',()=>loadFile(el.files?.[0]));if(el?.files?.[0])loadFile(el.files[0]);}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(typeof window!=='undefined'?window:globalThis);