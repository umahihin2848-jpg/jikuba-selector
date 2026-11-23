/* P3-71: only reconcile user-confirmed official saddlecloth roster with live CSV virtual-number cohort.
 * No automatic authoritative-source lookup. No writes to production model states.
 */
(function(root){'use strict';
const VERSION='p371-roster-shadow-20261123';
const normName=s=>String(s??'').normalize('NFKC').replace(/[\s\u3000]/g,'').trim();
const cleanString=s=>String(s??'').normalize('NFKC').trim();
function parseRoster(text){
 const list=[],errors=[];
 const lines=String(text??'').split(/\r?\n/).map((v,i)=>({line:i+1,text:v.trim()})).filter(x=>x.text);
 for(const {line,text:raw} of lines){
  const t=raw.normalize('NFKC'),m=t.match(/^(\d{1,2})[\s,，\t]+(.+)$/);
  if(!m){errors.push(line+'行目：「馬番 馬名」形式で入力してください');continue;}
  const no=Number(m[1]),name=cleanString(m[2]),key=normName(name);
  if(!Number.isInteger(no)||no<1||no>18||!key||key.length>45){errors.push(line+'行目：馬番または馬名が不正です');continue;}
  list.push({no:String(no),name,key,line});
 }
 if(list.length<12||list.length>18)errors.push('全頭12～18頭の出走表が必要です');
 if(new Set(list.map(x=>x.no)).size!==list.length)errors.push('馬番が重複しています');
 if(new Set(list.map(x=>x.key)).size!==list.length)errors.push('馬名が重複しています');
 return{ready:errors.length===0,rows:list,errors};
}
function validDate(s){const v=String(s||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===v;}
function verifyRoster({text,queue,meta,confirmed=false,sourceLabel='' }){
 const parsed=parseRoster(text);
 if(!parsed.ready)return{ready:false,reason:'roster_invalid',details:parsed.errors};
 if(!confirmed)return{ready:false,reason:'user_confirmation_required',details:['全頭の出走表と確定馬番を別資料で確認してください']};
 const q=queue||{},m=meta||{},nr=parsed.rows.length;
 if(!validDate(m.date)||!cleanString(m.venue)||!cleanString(m.raceName)||!Number.isFinite(Number(m.distance))||Number(m.distance)<=0||
    !['芝','ダート','ダ'].includes(cleanString(m.surface))||
    !Number.isInteger(Number(m.fieldSize))||Number(m.fieldSize)!==nr)
   return{ready:false,reason:'race_conditions_incomplete',details:['日付・競馬場・レース名・芝ダ・距離・出走頭数の入力を確認']};
 if(!q.ready||!Array.isArray(q.rows)||Number(q.fieldSize)!==nr||q.rows.length!==nr)
   return{ready:false,reason:'live_queue_not_ready',details:['現在のレースを先に解析し、全頭の初位置計算を完了してください']};
 if(cleanString(sourceLabel).length<3)
   return{ready:false,reason:'roster_source_required',details:['確定馬番を確認した出走表の出典を入力してください（例：JRA出走表）']};
 const byName=new Map(),invalid=[];
 for(const r of q.rows){
  const key=normName(r.name);
  if(!key||byName.has(key)||!Number.isInteger(Number(r.no))||!r.validated){invalid.push(key||'?');continue;}
  byName.set(key,r);
 }
 if(invalid.length||byName.size!==nr)return{ready:false,reason:'queue_names_invalid',details:invalid};
 const missing=parsed.rows.filter(x=>!byName.has(x.key));
 const extra=[...byName.keys()].filter(key=>!parsed.rows.some(x=>x.key===key));
 if(missing.length||extra.length)
  return{ready:false,reason:'horse_name_mismatch',details:[...missing.map(x=>'出走表の'+x.no+'番 '+x.name+'は過去走CSVにいません'),...extra.map(x=>'過去走CSVの'+byName.get(x).name+'は出走表にいません')]};
 const ids=new Set(),rows=parsed.rows.map(r=>{
  const original=byName.get(r.key);ids.add(String(original.no));
  return{...original,no:r.no,name:r.name,originalVirtualNo:String(original.no)};
 });
 if(ids.size!==nr)return{ready:false,reason:'virtual_number_duplicate',details:[]};
 const maxNo=Math.max(...rows.map(x=>Number(x.no)));
 const gaps=Array.from({length:maxNo},(_,i)=>String(i+1)).filter(x=>!parsed.rows.some(r=>r.no===x));
 const snapshot={date:cleanString(m.date),venue:cleanString(m.venue),raceName:cleanString(m.raceName),surface:cleanString(m.surface),
  distance:Number(m.distance),fieldSize:nr,sourceLabel:cleanString(sourceLabel),roster:parsed.rows.map(x=>[x.no,x.key]),
  liveQueue:q.rows.map(x=>[String(x.no),normName(x.name),Number(x.frontness5),Number(x.hist_n),Number(x.corner3Mean5),Number(x.corner4Mean5)])};
 return{ready:true,version:VERSION,userAttested:true,verifiedAgainst:'manual_roster_vs_current_csv_cohort_not_independent_official_api',
  snapshotSignature:JSON.stringify(snapshot),sourceLabel:cleanString(sourceLabel),roster:parsed.rows,
  rows,missingNumbers:gaps,fieldSize:nr,metadata:{...m,date:cleanString(m.date),distance:Number(m.distance),fieldSize:nr}};
}
root.RSACornerRosterAuditV1=Object.freeze({version:VERSION,parseRoster,verifyRoster,normName,productionImpact:false});
})(typeof window!=='undefined'?window:globalThis);
