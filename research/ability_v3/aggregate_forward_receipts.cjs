/** P3-28 research receipt aggregator. Requires Node 18+.
 * Usage: node tools/aggregate_forward_receipts.cjs --dir ./my-receipts --out ./report
 * Reads only P3-28 prediction and settlement JSON. Never updates either.
 * User-entered outcomes are NOT independently verified. Client times untrusted.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ARGS=process.argv.slice(2),arg=n=>ARGS[ARGS.indexOf(n)+1];
if(!ARGS.includes('--dir')||!ARGS.includes('--out')){console.error('Usage: node tools/aggregate_forward_receipts.cjs --dir ./receipts --out ./report');process.exit(2)}
const inDir=path.resolve(arg('--dir')),out=path.resolve(arg('--out'));
const stable=o=>Array.isArray(o)?o.map(stable):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])])):o;
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(stable(x)),'utf8').digest('hex');
function assert(x,msg){if(!x)throw Error(msg)}
const validNo=(p,ns)=>Array.isArray(ns)&&ns.length===3&&ns.every(x=>Number.isInteger(x))&&new Set(ns).size===3&&ns.every(x=>p.horses.some(h=>h.no===x));
function score(p,top3){const win=new Set(top3),s={};for(const [name,v] of Object.entries(p.picks)){const a=v.axis.no,partners=v.partners.map(x=>x.no),n=partners.filter(x=>win.has(x)).length;s[name]={axisNo:a,axisTop3:win.has(a),axisTop2:top3.slice(0,2).includes(a),axisWin:top3[0]===a,partnerTop3Count:n,axisAndOnePartner:win.has(a)&&n>=1,axisAndTwoPartners:win.has(a)&&n>=2};}return s;}
function csvLine(arr){return arr.map(x=>{const s=x===null||x===undefined?'':String(x);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')}
function csvWrite(file,cols,rows){fs.writeFileSync(file, '\ufeff'+[csvLine(cols),...rows.map(x=>csvLine(cols.map(k=>x[k])))].join('\n')+'\n','utf8')}
assert(fs.existsSync(inDir),'No input directory');fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync(inDir).filter(f=>f.toLowerCase().endsWith('.json')).sort();let pred=[],settles=[],rejected=[];
for(const file of files){try{const j=JSON.parse(fs.readFileSync(path.join(inDir,file),'utf8'));
 if(j.schema==='p3-28-ability-v3-forward-v1'){
  assert(j.hashAlgorithm==='SHA-256'&&typeof j.sha256==='string'&&/^[a-f0-9]{64}$/.test(j.sha256),'invalid hash field');
  assert(hash(j.payload)===j.sha256,'hash mismatch');const p=j.payload;
  assert(p.schema===j.schema&&p.horses?.length===p.race?.field&&p.horses?.length>=12&&p.horses?.length<=18&&new Set(p.horses.map(x=>x.no)).size===p.horses.length,'invalid horse roster');
  assert(p.officialTimeConfirmedByUser===true&&Date.parse(p.capturedAt)<Date.parse(p.scheduledStartJst),'invalid pre-race timestamp');
  pred.push({file,hash:j.sha256,p});
 }else if(j.schema==='p3-28-ability-v3-settlement-v1')settles.push({file,j});
 else rejected.push({file,error:'unrecognized schema'});
 }catch(e){rejected.push({file,error:e.message});}}
const byHash=new Map(pred.map(x=>[x.hash,x]));const settleBy=new Map();
for(const x of settles){const j=x.j,pr=byHash.get(j.predictionSha256);
 try{
  assert(pr,'prediction original missing');assert(j.officialResultConfirmedByUser===true,'outcome user confirmation missing');
  assert(Date.parse(j.settledAt)>=Date.parse(pr.p.scheduledStartJst),'outcome entered before scheduled start');
  assert(validNo(pr.p,j.result?.top3Nos),'invalid top3');
  assert(JSON.stringify(score(pr.p,j.result.top3Nos))===JSON.stringify(j.result.picks),'outcome metrics mismatch');
  assert(!settleBy.has(pr.hash),'multiple settlement records for one prediction');
  settleBy.set(pr.hash,j);
 }catch(e){rejected.push({file:x.file,error:e.message});}}
const raceKey=p=>[p.race.date,p.race.venue,p.race.name||p.race.rid,p.race.surface,p.race.distance].join('|');
const counts=new Map();for(const x of pred){const k=raceKey(x.p);counts.set(k,(counts.get(k)||0)+1)}
const rows=pred.map(x=>{const p=x.p,k=raceKey(p),v=settleBy.get(x.hash),res=v?.result,cp=res?.picks?.cMarket,vp=res?.picks?.v3Market,mp=res?.picks?.cAxisMixedPartners;
 return{date:p.race.date,venue:p.race.venue,race:p.race.name||p.race.rid,grade:p.race.grade,race_key:k,receipt:x.file,capturedAt:p.capturedAt,schedule:p.scheduledStartJst,source:p.model.v3Source,hash:x.hash,gate:p.decision.productionGateCode,marketP:p.decision.marketStructureP1Top3,marketHigh:p.decision.marketStructureP1Top3>=.6?1:0,gateNoAxis:['no_auto_axis','ability_rank_tie'].includes(p.decision.productionGateCode)?1:0,rescue:p.decision.marketStructureP1Top3>=.6&&['no_auto_axis','ability_rank_tie'].includes(p.decision.productionGateCode)?1:0,duplicateRace:counts.get(k)>1?1:0,settled:!!v?1:0,cAxis:p.picks.cMarket.axis.no,v3Axis:p.picks.v3Market.axis.no,axisAgree:p.picks.cMarket.axis.no===p.picks.v3Market.axis.no?1:0,top3:res?res.top3Nos.join('-'):'',cAxisTop3:cp?Number(cp.axisTop3):'',v3AxisTop3:vp?Number(vp.axisTop3):'',cJoint:cp?Number(cp.axisAndOnePartner):'',v3Joint:vp?Number(vp.axisAndOnePartner):'',mixedJoint:mp?Number(mp.axisAndOnePartner):'',cTriple:cp?Number(cp.axisAndTwoPartners):'',v3Triple:vp?Number(vp.axisAndTwoPartners):'',mixedTriple:mp?Number(mp.axisAndTwoPartners):''};});
const cols=['date','venue','race','grade','race_key','receipt','capturedAt','schedule','source','hash','gate','marketP','marketHigh','gateNoAxis','rescue','duplicateRace','settled','cAxis','v3Axis','axisAgree','top3','cAxisTop3','v3AxisTop3','cJoint','v3Joint','mixedJoint','cTriple','v3Triple','mixedTriple'];
csvWrite(path.join(out,'forward_race_audit.csv'),cols,rows);
const good=rows.filter(r=>r.settled&&!r.duplicateRace),groups=[['all',good],['market_ge_0p60',good.filter(x=>x.marketHigh)],['market_lt_0p60',good.filter(x=>!x.marketHigh)],['no_axis_rescue',good.filter(x=>x.rescue)],...new Set(good.map(x=>x.date.slice(0,4)))].map(x=>typeof x==='string'?['year_'+x,good.filter(r=>r.date.startsWith(x))]:x);
const summary=groups.map(([group,z])=>{const sum=k=>z.reduce((s,x)=>s+Number(x[k]||0),0);return{group,n:z.length,axisAgreement:sum('axisAgree'),cAxisTop3:sum('cAxisTop3'),v3AxisTop3:sum('v3AxisTop3'),cJoint:sum('cJoint'),v3Joint:sum('v3Joint'),mixedJoint:sum('mixedJoint'),cTriple:sum('cTriple'),v3Triple:sum('v3Triple'),mixedTriple:sum('mixedTriple')};});
csvWrite(path.join(out,'forward_summary.csv'),['group','n','axisAgreement','cAxisTop3','v3AxisTop3','cJoint','v3Joint','mixedJoint','cTriple','v3Triple','mixedTriple'],summary);
csvWrite(path.join(out,'rejected_files.csv'),['file','error'],rejected);
console.log(JSON.stringify({inputFiles:files.length,predictionReceipts:pred.length,outcomes:settleBy.size,distinctRaces:counts.size,duplicateRaceReceipts:rows.filter(r=>r.duplicateRace).length,eligibleSettled:good.length,rejected:rejected.length,output:out},null,2));