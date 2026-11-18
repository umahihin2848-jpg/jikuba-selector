(()=>{'use strict';
let modelPromise=null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const num=v=>{if(v===null||v===undefined||v==='')return NaN;const z=Number(String(v).normalize('NFKC').replace(/[,秒%％倍\s]/g,''));return Number.isFinite(z)?z:NaN};
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN};
const med=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const sd=a=>{a=a.filter(Number.isFinite);if(a.length<2)return NaN;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))};
const vOr=(x,d)=>Number.isFinite(x)?x:d;
const normHead=s=>String(s||'').replace(/[\s_　]/g,'').toUpperCase();
function dateVal(v){const s=String(v??'').normalize('NFKC').trim();if(!s)return 0;let y,m,d,z;if((z=s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D.*)?$/))){y=+z[1];m=+z[2];d=+z[3]}else if(/^\d{8,14}$/.test(s)){y=+s.slice(0,4);m=+s.slice(4,6);d=+s.slice(6,8)}else if(/^\d{6}$/.test(s)){y=2000+(+s.slice(0,2));m=+s.slice(2,4);d=+s.slice(4,6)}else return 0;const c=new Date(Date.UTC(y,m-1,d));return c.getUTCFullYear()===y&&c.getUTCMonth()===m-1&&c.getUTCDate()===d?y*10000+m*100+d:0}
function parseCSV(t){const out=[],row=[];let cell='',q=false;for(let i=0;i<t.length;i++){const c=t[i],n=t[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));out.push(row.splice(0));cell=''}else cell+=c}if(cell||row.length){row.push(cell.replace(/\r$/,''));out.push(row)}return out.filter(r=>r.some(v=>String(v).trim()))}
function decode(buf){let best='',bad=1e9;for(const enc of ['utf-8','shift_jis']){try{const s=new TextDecoder(enc).decode(buf),b=(s.match(/�/g)||[]).length;if(b<bad){best=s;bad=b}}catch{}}return best.replace(/^\uFEFF/,'')}
function col(headers,names,exactOnly=false){const nn=names.map(normHead),exact=headers.find(h=>nn.includes(normHead(h)));return exact||(exactOnly?'':headers.find(h=>nn.some(x=>normHead(h).includes(x))))||''}
function finishNum(v){const m=String(v||'').normalize('NFKC').match(/\d+/);return m?Number(m[0]):NaN}
function surf(v){const s=String(v??'').normalize('NFKC').trim();return s.includes('ダ')?'ダ':s.includes('芝')?'芝':''}
async function loadModel(){if(!modelPromise)modelPromise=fetch('data/finish600_model_v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`M3モデル読込 ${r.status}`);return r.json()});return modelPromise}
function predictLinear(m,x){let z=Number(m.intercept)||0;for(let i=0;i<m.features.length;i++){const k=m.features[i],raw=Number(x[k]),imp=Number(m.imputer_median[i]),v=Number.isFinite(raw)?raw:imp,mu=Number(m.scaler_mean[i])||0,sc=Number(m.scaler_scale[i])||1;z+=(Number(m.coef[i])||0)*((v-mu)/sc)}return z}
function parseHistory(text){
 const grid=parseCSV(text);if(grid.length<2)throw new Error('CSVの行数が不足しています');
 const headers=grid[0].map(x=>String(x).trim()),idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
 const m={
 name:col(headers,['馬名'],true),date:col(headers,['日付','年月日','レース日'],true),
 surface:col(headers,['芝・ダート','芝・ダ','芝ダ','芝ダート'],true),
 last3f:col(headers,['上り3F','上がり3F','上り３Ｆ'],true),
 gap:col(headers,['上3F地点差','上３Ｆ地点差','-3F差','－3F差','−3F差'],true),
 rpci:col(headers,['RPCI','レースPCI'],true),pci:col(headers,['PCI'],true),
 field:col(headers,['頭数','出走頭数'],true),
 c1:col(headers,['1角','１角','通過1','通過１'],true),c2:col(headers,['2角','２角','通過2','通過２'],true),
 c3:col(headers,['3角','３角','通過3','通過３'],true),c4:col(headers,['4角','４角','通過4','通過４'],true),
 finish:col(headers,['着順','確定着順'],true),raceId:col(headers,['レースID(新・馬番無16桁)'],true),raceId18:col(headers,['レースID(新)'],true),pastNo:col(headers,['過去馬番','馬番'],true)
 };
 const labels={name:'馬名',date:'日付',surface:'芝・ダート',last3f:'上り3F',gap:'上3F地点差',rpci:'RPCI',pci:'馬PCI',field:'頭数'};const missing=Object.entries(labels).filter(([k])=>!m[k]).map(([,v])=>v);
 if(![m.c1,m.c2,m.c3,m.c4].some(Boolean))missing.push('通過順位');
 if(headers.includes('何走目')&&!m.raceId&&!m.raceId18)missing.push('レースID(新・馬番無16桁) または レースID(新)');
 if(missing.length)throw new Error('M3入力CSVの必須列不足: '+missing.join(', '));
 const val=(r,k)=>k?String(r[idx[k]]??'').trim():'';
 const byName=new Map(),seen=new Map();let invalidDate=0;
 for(let i=1;i<grid.length;i++){
 const r=grid[i],name=val(r,m.name);if(!name)continue;
 const date=dateVal(val(r,m.date));if(!date){invalidDate++;continue}
 const surface=surf(val(r,m.surface));if(!surface)continue;
 const id18=val(r,m.raceId18).toUpperCase(),priorNo=val(r,m.pastNo);
 const from18=/^[A-Z0-9]{18}$/.test(id18)&&/^\d{1,2}$/.test(priorNo)&&id18.slice(-2)===priorNo.padStart(2,'0')?id18.slice(0,16):'';
 if(m.raceId18&&!m.raceId&&!from18)throw new Error('18桁レースIDと過去馬番が一致しません: '+name);
 const id=(m.raceId?val(r,m.raceId):from18).toUpperCase();
 if(id){
   if(!/^[A-Z0-9]{16}$/i.test(id))throw new Error('過去走レースIDが不正: '+name);
   const key=name+'|'+id.toUpperCase(),signature=[date,surface,val(r,m.last3f),val(r,m.gap),val(r,m.rpci),val(r,m.pci),val(r,m.field),val(r,m.c1),val(r,m.c2),val(r,m.c3),val(r,m.c4)].join('|');
   if(seen.has(key)){if(seen.get(key)!==signature)throw new Error('同じ過去走に矛盾する行があります: '+name+' / '+id);continue}
   seen.set(key,signature);
 }
 const field=num(val(r,m.field)),corners=[m.c1,m.c2,m.c3,m.c4].map(k=>k?num(val(r,k)):NaN);
 const first=corners.find(x=>Number.isFinite(x)&&x>0);
 const front=Number.isFinite(field)&&field>1&&Number.isFinite(first)?clamp((field-first)/(field-1),0,1):NaN;
 const rec={date,raceId:id,surface,last3f:num(val(r,m.last3f)),gap:num(val(r,m.gap)),rpci:num(val(r,m.rpci)),pci:num(val(r,m.pci)),field,firstCorner:first,front,finish:finishNum(val(r,m.finish))};
 if(!byName.has(name))byName.set(name,[]);byName.get(name).push(rec)
 }
 for(const a of byName.values())a.sort((x,y)=>y.date-x.date||String(x.raceId).localeCompare(String(y.raceId)));
 if(!byName.size)throw new Error('M3計算できる過去走がありません'+(invalidDate?'（日付不正行あり）':''));
 return byName
}
function hist(byName,name,raceDate){return(byName.get(name)||[]).filter(x=>x.date&&x.date<raceDate).slice(0,5)}
function featuresFor(a,race,predGap,no){const same=a.filter(x=>x.surface===surf(race.surface)),gap=a.map(x=>x.gap),pci=a.map(x=>x.pci),rpci=a.map(x=>x.rpci),l3=a.map(x=>x.last3f).filter(x=>x>=28&&x<=50),front=a.map(x=>x.front),prd=a.filter(x=>Number.isFinite(x.pci)&&Number.isFinite(x.rpci)).map(x=>x.pci-x.rpci),sprd=same.filter(x=>Number.isFinite(x.pci)&&Number.isFinite(x.rpci)).map(x=>x.pci-x.rpci),sl3=same.map(x=>x.last3f).filter(x=>x>=28&&x<=50),field=Number(race.fieldSize)||1,gate=field>1?clamp((Number(no)-1)/(field-1),0,1):.5;return{pred_gap:predGap,hist_gap_med:vOr(med(gap),.7),hist_pci_med:vOr(med(pci),50),hist_rpci_med:vOr(med(rpci),50),hist_last3f_med:vOr(med(l3),35.5),hist_last3f_mean:vOr(mean(l3),35.5),hist_last3f_sd:vOr(sd(l3),1),hist_front_mean:vOr(mean(front),.5528647823),hist_pr_diff_med:vOr(med(prd),0),hist_pr_diff_mean:vOr(mean(prd),0),hist_pr_diff_sd:vOr(sd(prd),2),same_surface_pr_diff_med:vOr(med(sprd),vOr(med(prd),0)),same_surface_last3f_med:vOr(med(sl3),vOr(med(l3),35.5)),same_surface_n:same.length,hist_n:a.length,field_size:field,gate_frac:gate,distance:Number(race.distance)||1600,surface_dirt:surf(race.surface)==='ダ'?1:0}}
function fallbackGap(model,a,race,no,queueFront){const r=model.remaining600||{},field=Number(race.fieldSize)||1,gate=field>1?clamp((Number(no)-1)/(field-1),0,1):.5,gap=vOr(med(a.map(x=>x.gap)),.7),front=queueFront!==null&&queueFront!==undefined&&String(queueFront).trim()!==''&&Number.isFinite(Number(queueFront))?Number(queueFront):vOr(mean(a.map(x=>x.front)),.5528647823);return clamp((Number(r.intercept)||0)+(Number(r.hist_gap_median_last5)||0)*gap+(Number(r.hist_frontness_mean_last5)||0)*front+(Number(r.field_size)||0)*field+(Number(r.gate_fraction)||0)*gate,0,3.5)}
async function compute({blob,race,horses,predGapByNo={},queueFrontByNo={}}){if(!blob)throw new Error('M3計算用CSVがありません');const [model,buf]=await Promise.all([loadModel(),blob.arrayBuffer()]),byName=parseHistory(decode(buf)),raceDate=dateVal(race.raceDate),rows=[];if(!raceDate)throw new Error('M3レース日付が不正または未入力です');for(const h of horses||[]){const no=String(h.no),a=hist(byName,String(h.name||''),raceDate),suppliedGap=predGapByNo?.[no],officialGap=suppliedGap!==null&&suppliedGap!==undefined&&String(suppliedGap).trim()!==''?Number(suppliedGap):NaN,predGap=Number.isFinite(officialGap)?officialGap:fallbackGap(model,a,race,no,queueFrontByNo?.[no]),x=featuresFor(a,race,predGap,no),close=predictLinear(model.core_m3,x),score=predGap-close;rows.push({no,name:String(h.name||''),predGap,close,score,x,histN:a.length})}if(rows.every(r=>r.histN===0))throw new Error('M3対象馬に有効な発走前過去走がありません');rows.sort((a,b)=>a.score-b.score||Number(a.no)-Number(b.no)).forEach((r,i)=>r.finishRank=i+1);return{ready:true,version:model.version,engineVersion:'v4-m3-engine-v3-input-integrity',rows,validation:model.validation}}
window.V4M3Engine={compute,loadModel,version:'v4-m3-engine-v3-input-integrity'};
})();