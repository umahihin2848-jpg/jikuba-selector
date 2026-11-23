/* P3-75: Offline, research-only reconciliation of immutable pre-race P3-74 JSON with TARGET CSV and JV-Data HR2.
   No writes to production models/BUY/PASS. All payoffs are JPY per JPY100 JRA-VAN HR record. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 root.RSASettlementCoreV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const VERSION='p3-75-settlement-v1';
const VENUE={'札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10'};
const normalize=s=>String(s??'').normalize('NFKC').trim();
const normHorse=s=>normalize(s).replace(/[\s\u3000]/g,'');
const normRace=s=>normalize(s).replace(/[\s\u3000・･\-‐ｰ]/g,'').replace(/(?:G[123]|3勝|OP|オープン)$/i,'');
const nint=(s,min,max)=>{const t=String(s??'').trim();if(!/^\d+$/.test(t))return null;const n=Number(t);return Number.isInteger(n)&&n>=min&&n<=max?n:null;};
const dateKey=(y,m,d)=>{let yr=nint(y,0,9999);const mo=nint(m,1,12),da=nint(d,1,31);if(yr===null||mo===null||da===null)return null;
 if(yr<100)yr+=2000;const a=new Date(Date.UTC(yr,mo-1,da));if(a.getUTCFullYear()!==yr||a.getUTCMonth()!==mo-1||a.getUTCDate()!==da)return null;
 return String(yr).padStart(4,'0')+String(mo).padStart(2,'0')+String(da).padStart(2,'0');};
const raceKey=(date,venue,number)=>{const v=VENUE[normalize(venue)];const no=nint(number,1,12);return /^\d{8}$/.test(date)&&v&&no?date+v+String(no).padStart(2,'0'):null;};
const ticketKey=(a,b)=>{const i=nint(a,1,28),j=nint(b,1,28);return i&&j&&i!==j?[i,j].sort((x,y)=>x-y).map(x=>String(x).padStart(2,'0')).join(''):null;};
// Stream individual RFC4180 fields into a row visitor, never materialize an enormous 10-year CSV matrix.
function visitCsv(text,visitor){const s=String(text??'').replace(/^\uFEFF/,'');let row=[],cell='',q=false,rowN=0;
 function emit(){row.push(cell);cell='';if(row.some(x=>x!=='')){visitor(row,rowN++);}row=[];}
 for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c;}
 else if(c==='"'){if(cell==='')q=true;else cell+=c}
 else if(c===','){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;emit();}
 else cell+=c;}
 if(q)throw Error('CSVに閉じていない引用符があります');if(row.length||cell)emit();
}
function parseResultsCsv(text){let columns=null,seen=0,ignored=0;const races=new Map(),issues=[];
 const mandatory=['年','月','日','場所','レース番号','レース名','頭数','馬番','馬名','確定着順','コースコード'];
 visitCsv(text,(cells,lineno)=>{
  if(!columns){columns=Object.fromEntries(cells.map((x,i)=>[normalize(x),i]));const missing=mandatory.filter(k=>!Object.hasOwn(columns,k));if(missing.length)throw Error('TARGET結果CSVの必要な列がありません: '+missing.join('、'));return;}
  const get=k=>String(cells[columns[k]]??'').trim(),d=dateKey(get('年'),get('月'),get('日')),
   venue=normalize(get('場所')),rk=raceKey(d,venue,get('レース番号')),
   no=nint(get('馬番'),1,28),field=nint(get('頭数'),1,28);
  if(!rk||!no||!field){issues.push('結果CSV '+(lineno+1)+'行: レースキー/馬番/頭数が不正');ignored++;return;}
  let race=races.get(rk);
  if(!race){race={key:rk,date:d,venue,number:Number(get('レース番号')),name:normalize(get('レース名')),field,
   course:get('コースコード'),gradeCode:get('クラスコード'),horses:new Map(),errors:[]};races.set(rk,race)}
  if(race.name!==normalize(get('レース名'))||race.field!==field||race.course!==get('コースコード'))race.errors.push('CSVのレース条件が行によって矛盾');
  if(race.horses.has(no)){race.errors.push('結果の同一馬番が重複: '+no);return;}
  const rank=nint(get('確定着順'),1,28),abnormal=get('異常コード');
  race.horses.set(no,{no,name:normalize(get('馬名')),rank,abnormal,rawRank:get('確定着順')});seen++;
 });
 if(!columns)throw Error('結果CSVにヘッダーがありません');
 return{races,horseRows:seen,ignored,issues};
}
// JV-Data HR: 1-index positions 246 (馬連 3x16), 294 (ワイド 7x16); amount is yen/100yen.
// Truncated right padding is seen in exported user records and is safe; needed portions must exist.
function parseHr2Text(text){const pays=new Map(),issues=[];let count=0;
 for(const [i,ln]of String(text??'').replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
  if(!ln.trim())continue;if(!ln.startsWith('HR'))continue;if(ln.length<405){issues.push('HR '+(i+1)+'行: 必要なワイド欄より短い');continue;}
  const status=ln[2],date=ln.slice(11,19),venueCode=ln.slice(19,21),nr=ln.slice(25,27),key=date+venueCode+nr;
  if(!/^\d{12}$/.test(key)){issues.push('HR '+(i+1)+'行: レースキーが不正');continue;}
  const flags={invalid:ln.slice(31,40),special:ln.slice(40,49),refund:ln.slice(49,58),refundHorses:ln.slice(58,86)};
  const extract=(start,size,count,width)=>{let arr=[];for(let t=0;t<count;t++){
   const chunk=ln.slice(start+t*size,start+(t+1)*size);if(!chunk.trim())continue;
   const pair=chunk.slice(0,width),pay=chunk.slice(width,width+9),pop=chunk.slice(width+9);
   if(!/^\d+$/.test(pair)||!/^\d{9}$/.test(pay)||!/^\d+$/.test(pop))throw Error('払戻レコード組番/金額の桁不正: '+key);
   if(/^0+$/.test(pair))continue;
   if(width===4&&(!ticketKey(pair.slice(0,2),pair.slice(2,4))||ticketKey(pair.slice(0,2),pair.slice(2,4))!==pair))throw Error('馬券の組番に不正値: '+pair);
   arr.push({pair,amount:Number(pay),popularity:Number(pop)});
  }return arr;};
  let singles,quinellas,wides;try{singles=extract(102,13,3,2);quinellas=extract(245,16,3,4);wides=extract(293,16,7,4)}
  catch(e){issues.push('HR '+(i+1)+'行: '+e.message);continue;}
  if(pays.has(key)){pays.get(key).errors.push('同一キーのHRが複数存在');continue;}
  const entry={key,status,registered:nint(ln.slice(27,29),0,28),starters:nint(ln.slice(29,31),0,28),flags,singles,quinellas,wides,errors:[]};
  if(!['1','2'].includes(status))entry.errors.push('HRデータ区分が確定払戻ではない');
  if(!/^[01]{9}$/.test(flags.invalid)||!/^[01]{9}$/.test(flags.special)||!/^[01]{9}$/.test(flags.refund)||!/^[01]{28}$/.test(flags.refundHorses))entry.errors.push('払戻フラグが不明');
  pays.set(key,entry);count++;
 }
 return{pays,count,issues};
}
function mergeSources(inputs,kind){const merged=new Map(),issues=[];let total=0;
 for(const inp of inputs){const parsed=kind==='results'?parseResultsCsv(inp.text):parseHr2Text(inp.text);
  issues.push(...parsed.issues.map(s=>(inp.name||'')+': '+s));
  const map=kind==='results'?parsed.races:parsed.pays;total+=map.size;
  for(const [key,v]of map){if(merged.has(key)){merged.get(key).errors.push('複数ファイルに同じレースが重複: '+key);continue;}merged.set(key,v)}
 }
 return{records:merged,issues,total};
}
function validateSnapshot(s){if(!s||s.schema!=='rsa-p374-buy-skip-research-snapshot-v1'||s.researchOnly!==true||s.productionImpact!==false||!s.input||!s.decision)
 return{ok:false,error:'P3-74研究JSONではありません'};
 const r=s.input.race||{},date=normalize(r.date).replace(/-/g,''),venue=normalize(r.venue),raceName=normalize(r.name);
 if(!/^\d{8}$/.test(date)||!VENUE[venue]||!raceName)return{ok:false,error:'日付・競馬場・レース名がありません'};
 const out=s.decision;
 if(out.productionImpact!==false||out.automaticPurchase!==false||out.calibratedEV!==false)return{ok:false,error:'研究判定フラグが不正'};
 // Raw JSON from the user is not cryptographically authenticated or sealed by a race-official clock.
 return{ok:true,date,venue,raceName,grade:normalize(r.grade),field:nint(r.field,1,28),number:nint(r.raceNumber??r.raceNo??r.number,1,12),status:out.status,structure:out.structure||'none'};
}
function identifyRace(snapshot,allResults,override){const q=validateSnapshot(snapshot);if(!q.ok)return{status:'invalid',reason:q.error,matched:null};
 const available=[...allResults.values()].filter(r=>r.date===q.date&&r.venue===q.venue);
 if(!available.length)return{status:'unresolved',reason:'当日・競馬場の結果CSVがありません',matched:null,candidates:[]};
 const matches=available.filter(r=>normRace(r.name)===normRace(q.raceName));
 if(q.number){const candidate=available.find(r=>r.number===q.number);
  if(!candidate)return{status:'unresolved',reason:'JSONのレース番号に一致する結果がありません',matched:null,candidates:available};
  if(normRace(candidate.name)!==normRace(q.raceName)&&!override?.confirmed)return{status:'unresolved',reason:'レース番号は一致したが名称が異なります。明示的な照合が必要です',matched:null,candidates:available};
  return{status:'matched',matched:candidate,method:'explicit_number'};}
 if(matches.length===1)return{status:'matched',matched:matches[0],method:'unique_name'};
 if(override?.confirmed&&typeof override.key==='string'){
  const candidate=available.find(r=>r.key===override.key);
  if(candidate)return{status:'matched',matched:candidate,method:'explicit_manual_override'};}
 return{status:'unresolved',reason:matches.length>1?'同日の同名レースが複数あります':'レース名が一致せず自動で確定できません',matched:null,candidates:available};
}
function isRefunded(hr,no){const n=nint(no,1,28);return Boolean(n&&hr.flags.refundHorses[n-1]==='1');}
function ticketSettlement(hr,ticket,a,b,stake){const key=ticketKey(a,b),idx=ticket==='wide'?4:ticket==='quinella'?3:null;
 if(!key||idx===null||!Number.isInteger(stake)||stake<100||stake%100!==0)return{state:'unknown',reason:'券種/買い目/予算が不正'};
 if(hr.errors.length)return{state:'unknown',reason:hr.errors.join(' / ')};
 if(hr.flags.invalid[idx]==='1'||hr.flags.special[idx]==='1')return{state:'unknown',reason:'不成立または特払: この版では投票券別の取扱いを確定できません'};
 if(!['0','1'].includes(hr.flags.refund[idx]))return{state:'unknown',reason:'返還フラグが不明'};
 const refA=isRefunded(hr,a),refB=isRefunded(hr,b);
 if(refA||refB){if(hr.flags.refund[idx]!=='1')return{state:'unknown',reason:'取消馬と券種返還フラグが一致しません'};
  return{state:'refund',returnYen:stake,stakeYen:stake,pair:key,reason:'対象馬の取消・除外による返還'};}
 const wins=(ticket==='wide'?hr.wides:hr.quinellas).filter(x=>x.pair===key);
 if(wins.length>1)return{state:'unknown',reason:'同一組番が払戻に重複'};
 if(wins.length===1){if(wins[0].amount<100)return{state:'unknown',reason:'異常な払戻単価'};
  return{state:'hit',returnYen:wins[0].amount*(stake/100),stakeYen:stake,pair:key,unitPayoff:wins[0].amount};}
 return{state:'miss',returnYen:0,stakeYen:stake,pair:key};
}
function checkRoster(snapshot,race,hr,requireFull){const roster=snapshot.input?.roster||{};
 if(roster.confirmed!==true){return requireFull?{ok:false,reason:'事前JSONに全頭出走表の照合がありません'}:{ok:true,quality:'not_attested'};}
 const body=String(roster.text||'').split(/\r?\n/).filter(x=>x.trim()),entries=new Map(),names=new Set();
 for(const line of body){const m=line.normalize('NFKC').match(/^\s*(\d{1,2})[\s,，、]+(.+?)\s*$/);
  if(!m)return{ok:false,reason:'出走表行の形式が不正'};
  const no=nint(m[1],1,28),hname=normHorse(m[2]);if(!no||!hname||entries.has(no)||names.has(hname))return{ok:false,reason:'出走表に重複/不正番号・名前'};
  entries.set(no,hname);names.add(hname);}
 if(entries.size!==Number(snapshot.input?.race?.field))return{ok:false,reason:'事前出走表の頭数とレース条件が不一致'};
 for(const [no,h]of race.horses){if(entries.get(no)!==normHorse(h.name))return{ok:false,reason:'結果CSVと事前出走表の馬番/馬名が不一致（'+no+'番）'};}
 for(const no of entries.keys()){if(!race.horses.has(no)&&!isRefunded(hr,no))return{ok:false,reason:'結果CSVにない馬が返還記録にもありません（'+no+'番）'};}
 return{ok:true,quality:'all_horses_verified',horseNames:entries};
}
const STRATEGIES=[
 {id:'p10',label:'P10最小相手（全候補レース）'},
 {id:'quality',label:'レース質による相手（見送り前）'},
 {id:'flow',label:'P3-74研究フロー（見送り尊重）'}
];
function settleSnapshot(snapshot,results,pays,{overrides={},index=0,stake=100}={}){
 const validation=validateSnapshot(snapshot);
 if(!validation.ok)return{index,state:'invalid',reason:validation.error};
 const found=identifyRace(snapshot,results,overrides[index]);
 if(found.status!=='matched')return{index,state:'unresolved',reason:found.reason,candidates:found.candidates?.map(x=>({key:x.key,name:x.name,number:x.number}))||[],meta:validation};
 const race=found.matched,hr=pays.get(race.key);
 if(!hr)return{index,state:'unresolved',reason:'一致するHR払戻がありません',raceKey:race.key,meta:validation};
 if(race.errors.length||hr.errors.length)return{index,state:'unresolved',reason:[...race.errors,...hr.errors].join(' / '),raceKey:race.key,meta:validation};
 if(hr.registered!==race.field||hr.starters>race.field||race.horses.size>hr.starters)
  return{index,state:'unresolved',reason:'HR登録頭数/出走頭数と結果CSVが不整合',raceKey:race.key,meta:validation};
 if(validation.field!==race.field)return{index,state:'unresolved',reason:'予想時点と結果の頭数が違います（取消の可能性）。照合を保留',raceKey:race.key,meta:validation};
 const expectedGrades={'3勝':'67','OP':'131','L':'115','G3':'163','G2':'179','G1':'195'};
 const actualCode=String(race.gradeCode||'');
 if(expectedGrades[validation.grade]&&actualCode!==expectedGrades[validation.grade])
  return{index,state:'unresolved',reason:'予想のクラスとTARGETクラスコードが異なります（'+validation.grade+'/'+actualCode+'）',raceKey:race.key,meta:validation};
 if(race.course==='2'||race.course==='3')return{index,state:'unresolved',reason:'障害レースは対象外',raceKey:race.key,meta:validation};
 const dec=snapshot.decision,needRoster=Boolean(dec.axis||dec.selectedOpponent||dec.preferredOpponent);
 const roster=checkRoster(snapshot,race,hr,needRoster);
 if(!roster.ok)return{index,state:'unresolved',reason:roster.reason,raceKey:race.key,meta:validation};
 const picked=(pair,type)=>{if(!pair?.axis||!pair?.other)return{state:'skip',returnYen:0,stakeYen:0};
  const a=nint(pair.axis.no,1,28),b=nint(pair.other.no,1,28);
  if(!a||!b||!roster.horseNames?.has(a)||!roster.horseNames?.has(b)||roster.horseNames.get(a)!==normHorse(pair.axis.name)||roster.horseNames.get(b)!==normHorse(pair.other.name))
    return{state:'unknown',reason:'候補馬の馬番・馬名が事前出走表と一致しません'};
  return ticketSettlement(hr,type,a,b,stake);};
 const simulation={};for(const type of ['wide','quinella']){
  const a=dec.axis;simulation[type]={
    p10:picked({axis:a,other:dec.preferredOpponent},type),
    quality:picked({axis:a,other:dec.selectedOpponent},type),
    flow:dec.status==='research_complete'&&dec.quote?.ticket===type
      ?picked({axis:a,other:dec.selectedOpponent},type):
      (['hold','price_pending'].includes(dec.status)?{state:'no_decision',reason:'事前の購入判断が保留/価格待ち'}:{state:'skip',returnYen:0,stakeYen:0})
   };}
 const undecidable=Object.values(simulation).flatMap(x=>Object.values(x)).filter(x=>x.state==='unknown');
 if(undecidable.length)return{index,state:'unresolved',reason:'券種の照合が確定できません: '+undecidable[0].reason,raceKey:race.key,meta:validation};
 const outcome={};for(const [num,h]of race.horses)outcome[num]={name:h.name,rank:h.rank};
 return{index,state:'resolved',raceKey:race.key,raceName:race.name,meta:validation,method:found.method,
   verdict:dec.status,reason:dec.reason,structure:dec.structure||'none',simulation,outcome,
   notice:'仮想収支（実購入記録ではない）',sourceTime:snapshot.deviceCapturedAt||null};
}
function settleAll(snapshots,results,pays,options={}){
 const rows=snapshots.map((s,index)=>settleSnapshot(s,results,pays,{...options,index}));
 const duplicates=new Map();for(const r of rows)if(r.state==='resolved'){
  const n=(duplicates.get(r.raceKey)||[]);n.push(r);duplicates.set(r.raceKey,n);}
 for(const [k,list]of duplicates)if(list.length>1)for(const r of list){r.state='unresolved';r.reason='同一レースの予想JSONが複数あります。後付け選別を防ぐため重複を保留';delete r.simulation;}
 return rows;
}
function summarize(rows,{stake=100,ticket='wide',group='all',year='all',comparableOnly=false}={}){
 const valid=rows.filter(r=>r.state==='resolved'&&(group==='all'||r.structure===group)&&
   (year==='all'||r.raceKey?.slice(0,4)===String(year)));
 const base=comparableOnly?valid.filter(r=>r.simulation?.[ticket]?.p10?.state!=='skip'&&r.simulation?.[ticket]?.quality?.state!=='skip'):valid;
 const series=STRATEGIES.map(s=>{
  let buys=0,hits=0,refunds=0,spent=0,returned=0,unknowns=0,dd=0,peak=0,balance=0;
  const monthly=new Map();const chron=base.slice().sort((a,b)=>a.raceKey.localeCompare(b.raceKey));
  for(const r of chron){const op=r.simulation?.[ticket]?.[s.id];if(!op||op.state==='unknown'||op.state==='no_decision'){unknowns++;continue;}
   if(op.state!=='skip'){buys++;spent+=op.stakeYen;returned+=op.returnYen;hits+=Number(op.state==='hit');refunds+=Number(op.state==='refund');
    const k=r.raceKey.slice(0,6),b=monthly.get(k)||{bets:0,returns:0};b.bets+=op.stakeYen;b.returns+=op.returnYen;monthly.set(k,b);}
   balance+=op.returnYen-op.stakeYen;peak=Math.max(peak,balance);dd=Math.max(dd,peak-balance);
  }
  const net=returned-spent;return{id:s.id,label:s.label,races:base.length,bets:buys,hits,refunds,unknowns,stakedYen:spent,returnedYen:returned,netYen:net,
   unusedYen:Math.max(0,base.length*stake-spent),allocatedBudgetYen:base.length*stake,
   roi:spent>0?returned/spent:null,returnPerBudget:base.length?net/(base.length*stake):null,
   hitRate:buys>refunds?hits/(buys-refunds):null,buyRate:base.length?buys/base.length:null,maxDrawdownYen:dd,
   monthly:[...monthly].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,v])=>({month,...v,net:v.returns-v.bets}))};
 });
 return{raceCount:base.length,settledCount:rows.filter(r=>r.state==='resolved').length,unresolvedCount:rows.length-rows.filter(r=>r.state==='resolved').length,
  allocatedBudgetYen:base.length*stake,stake,ticket,group,year,comparableOnly,series,
  caution:'同じ対象レース・同じ1レース当たり予算に対する仮想比較。未照合は分母外。見送り資金は未使用。収益改善の独立検証ではありません。'};
}
function rowsToCsv(rows){const cols=['日付','場','R','レース名','JSON番号','構造','判定','結果照合','理由','券種','方式','仮想購入円','払戻円','差引円','結果'];
 const escaped=s=>'"'+String(s??'').replace(/"/g,'""')+'"';const data=[cols];
 for(const r of rows){const meta=r.meta||{},common=[r.raceKey?.slice(0,8)||meta.date,meta.venue,r.raceKey?.slice(-2)||'',r.raceName||meta.raceName,r.index+1,r.structure||meta.structure,r.verdict||meta.status,r.state,r.reason||''];
  if(r.state!=='resolved'){data.push([...common,'','','','','','']);continue;}
  for(const t of ['wide','quinella'])for(const strategy of STRATEGIES){const q=r.simulation[t][strategy.id];data.push([...common,t,strategy.id,q.stakeYen??'',q.returnYen??'',q.stakeYen===undefined?'':q.returnYen-q.stakeYen,q.state]);}
 }
 return '\uFEFF'+data.map(a=>a.map(escaped).join(',')).join('\r\n')+'\r\n';
}
return Object.freeze({version:VERSION,parseResultsCsv,parseHr2Text,mergeSources,validateSnapshot,identifyRace,settleSnapshot,settleAll,ticketSettlement,summarize,rowsToCsv,
  VENUE,STRATEGIES,normalize,normHorse,normRace,ticketKey,productionImpact:false,automaticPurchase:false,calibratedEV:false});
});