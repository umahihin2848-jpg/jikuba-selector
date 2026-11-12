/* Ability C: grade-only candidate, frozen coefficients from 2024 research.
 * TARGET history only; Elo is the existing mean-opponent runtime approximation.
 * Missing or ambiguous input returns the original v1 for the entire race. */
(function(root){
'use strict';
const VERSION='ability-c-grade-v1.0',BETA=.4062284404659212,MEAN=1654.6364547216647,SD=269.35052168026897,C=1.3184938551202254;
const norm=x=>String(x??'').normalize('NFKC').trim(),num=x=>{const s=norm(x);return s!==''&&Number.isFinite(Number(s))?Number(s):NaN;};
const clip=(x,l,h)=>Math.max(l,Math.min(h,x)),venues=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
const head=x=>norm(x).replace(/[\s_]/g,'').toUpperCase();
const grade=x=>{const s=head(x);return ({G1:195,G2:179,G3:163,'重賞':163,'3勝':67,'3勝クラス':67,'1600万':67,'1600万下':67,'OP(L)':115,L:115,OP:131,'オープン':131,'ｵｰﾌﾟﾝ':131})[s]||0;};
const surface=x=>{const s=norm(x);return s==='芝'?'芝':s==='ダ'||s==='ダート'?'ダ':'';};
function day(x){const s=norm(x),m=s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);let v=m?m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0'):s.replace(/\D/g,'');if(v.length===6)v='20'+v;if(v.length!==8)return null;const d=Date.UTC(+v.slice(0,4),+v.slice(4,6)-1,+v.slice(6,8));return Number.isFinite(d)&&new Date(d).toISOString().slice(0,10).replace(/-/g,'')===v?{key:v,ms:d}:null;}
function time(x){const s=norm(x),m=s.match(/^(\d{1,2})[.:](\d{2})[.](\d)$/);if(m)return +m[1]*60+(+m[2])+(+m[3])/10;const n=num(s);if(!Number.isFinite(n))return NaN;if(s.includes('.')&&n>=20&&n<600)return n;if(/^\d{3,5}$/.test(s)){const sec=n%1000/10;return sec<60?Math.floor(n/1000)*60+sec:NaN;}return NaN;}
function hash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
function parse(rows,headers){
 const aliases={name:['馬名'],date:['日付','日付S','年月日'],venue:['場所','競馬場','開催場'],cls:['クラス名','クラス','格'],surface:['芝・ダート','芝・ダ','芝ダ','芝ダート'],distance:['距離'],field:['頭数','出走頭数'],finish:['確定着順','着順'],kg:['斤量'],gap:['上3F地点差','上３Ｆ地点差','-3F差'],c4:['通過4','4角','通過順4'],time:['タイムS','走破タイム.1','走破タイム','タイム'],rp:['レースPCI','RPCI'],rid:['レースID(新・馬番無16桁)','レースID(新)'],rno:['R','レース番号'],abnormal:['異常コード']};
 const m={};for(const [k,a] of Object.entries(aliases)){m[k]=a.map(head).map(h=>headers.find(v=>head(v)===h)).find(Boolean);}
 const missing=Object.keys(aliases).filter(k=>!['rid','rno','abnormal'].includes(k)&&!m[k]);if(!m.rid&&!m.rno)missing.push('レースIDまたはR');if(missing.length)return{ok:false,reason:'必要列不足: '+missing.join(', '),byName:new Map()};
 const byName=new Map(),seen=new Set();let invalid=0;
 for(const r of rows){const get=k=>m[k]?r[m[k]]:undefined,name=norm(get('name')),d=day(get('date')),v=norm(get('venue')),g=grade(get('cls')),s=surface(get('surface')),di=num(get('distance')),f=num(get('field')),fin=num(get('finish'));if(!name||!d||!venues.includes(v)||!g||!s||d.key<'20160101')continue;if(m.abnormal&&num(get('abnormal'))!==0&&norm(get('abnormal'))!=='')continue;if(!(di>600&&f>=2&&fin>=1&&fin<=f)){invalid++;continue;}
 let id=norm(get('rid'));if(/^\d{18}$/.test(id))id=id.slice(0,16);if(!/^\d{16}$/.test(id)){const rn=num(get('rno'));if(!Number.isInteger(rn)||rn<1||rn>12){invalid++;continue;}id=d.key+'|'+v+'|'+rn;}
 const key=name+'|'+id;if(seen.has(key))continue;seen.add(key);
 const k=num(get('kg')),gap=num(get('gap')),c4=num(get('c4')),rp=num(get('rp')),t=time(get('time')),pos=c4>=1&&c4<=f?(c4-1)/(f-1):NaN;
 const a={name,d,v,g,s,di,f,fin,kg:k,gap,pos,rp,t,id,fp:(f-fin)/(f-1)};
 if(!byName.has(name))byName.set(name,[]);byName.get(name).push(a);
 }
 for(const a of byName.values())a.sort((x,y)=>x.d.ms-y.d.ms||x.id.localeCompare(y.id));return{ok:true,byName,invalid};
}
function eligible(meta,n){return ['G1','G2','G3'].includes(head(meta.grade))&&venues.includes(norm(meta.venue))&&!!surface(meta.surface)&&Number.isInteger(+meta.fieldSize)&&+meta.fieldSize>=12&&+meta.fieldSize===n&&!!day(meta.date)&&+meta.distance>600;}
function evaluate(rows,meta,ctx,rs){
 const fallback=reason=>({active:false,reason,rows});if(!eligible(meta,rows.length))return fallback('対象外（JRA G1〜G3・12頭以上）');if(!ctx?.ok)return fallback(ctx?.reason||'対戦データ未読込');if(!rs?.strength)return fallback('Elo参照データ未読込');
 const cutoff=day(meta.date),s=surface(meta.surface),di=+meta.distance,history=rows.map(r=>(ctx.byName.get(norm(r.name))||[]).filter(a=>a.d.ms<cutoff.ms));
 if(history.every(a=>!a.length))return fallback('過去の高位履歴なし');
 const elo=history.map(a=>{let rating=1500,matched=0;for(const h of a){const vc=rs.venue_codes?.[h.v],sc=rs.surface_codes?.[h.s],opp=num(rs.strength[hash(h.d.key+'|'+vc+'|'+sc+'|'+h.di+'|'+h.g)]);if(!Number.isFinite(opp))continue;rating+=512*(h.fp-1/(1+10**((opp-rating)/400)));matched++;}return{rating,matched,total:a.length};});
 if(elo.some(e=>e.total>0&&!e.matched))return fallback('Elo照合できない馬あり：v1維持');
 const out=rows.map((r,i)=>{let sum=0,wSum=0,count=0;for(let j=0;j<rows.length;j++){if(i===j)continue;const other=new Map(history[j].map(h=>[h.id,h]));for(const a of history[i]){const b=other.get(a.id);if(!b||a.s!==s||b.s!==s||a.di!==b.di||a.v!==b.v||a.d.key!==b.d.key)continue;
 if(![a.t,b.t,a.kg,b.kg,a.gap,b.gap,a.pos,b.pos,a.rp,b.rp].every(Number.isFinite)||Math.min(a.t,b.t)<=0||a.gap<0||a.gap>10||b.gap<0||b.gap>10||a.rp<20||a.rp>80||b.rp<20||b.rp>80)continue;
 const w=2**(-((cutoff.ms-a.d.ms)/86400000)/365)*Math.exp(-Math.abs(a.di-di)/800-Math.abs(a.gap-b.gap)/.5-Math.abs(a.kg-b.kg)/1.5-Math.abs(a.pos-b.pos)/.25);
 sum+=clip((b.t-a.t)*1000/a.di,-2,2)*w;wSum+=w;count++;}}
 const sim=sum/(3+wSum),e=elo[i],v2=r.logit+BETA*(e.rating-MEAN)/SD,score=v2+C*sim;
 return {...r,v1Logit:r.logit,v2Logit:v2,logit:score,contextSimilar:sim,contextPairN:count,contextWeight:wSum,elo:e.rating,eloMatched:e.matched,eloTotal:e.total};});
 if(out.some(r=>!Number.isFinite(r.logit)))return fallback('非有限スコア：v1維持');
 if(out.every(r=>!r.contextPairN))return fallback('条件比較可能な対戦なし：v1維持');
 return{active:true,reason:'G1〜G3重賞限定 / Elo近似・C係数固定',rows:out,coverage:out.filter(r=>r.contextPairN>0).length,eloMatched:elo.reduce((s,e)=>s+e.matched,0),eloTotal:elo.reduce((s,e)=>s+e.total,0)};
}
let promise=null;
function load(){if(!promise){const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Elo読込タイムアウト')),5000));const get=u=>fetch(u,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();});promise=Promise.race([timeout,get('data/opponent_race_strength_v1_manifest.json').then(m=>Promise.all(m.shards.map(n=>get('data/'+n))).then(a=>({...m,strength:Object.assign({},...a)})))]).catch(()=>{promise=null;return null;});}return promise;}
root.AbilityCGradeV1={version:VERSION,parse,evaluate,eligible,load,hash,time,day};
})(typeof window!=='undefined'?window:globalThis);
