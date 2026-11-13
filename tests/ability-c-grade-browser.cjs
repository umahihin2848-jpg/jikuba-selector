// Browser-level smoke test: actual v3, mobile viewport, full TARGET-style rows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const {chromium, webkit} = require('playwright');
const kind=process.argv[2]||'chromium';
const browserType=kind==='webkit'?webkit:chromium;
const url='http://127.0.0.1:4173/waku-bc-converter/v3.html?abilityCQA=1';
const H=['何走目','何走前','日付','開催','場所','R','レース名','クラス名','頭数','出走頭数','馬番','着順','確定着順','人気','斤量','芝・ダート','距離','コース区分','馬場状態','タイム','タイムS','着差','通過1','通過2','通過3','通過4','決手','脚質',' Ave-3F','上り3F','上り3F順位','上3F地点差',' PCI','PCI3','レースPCI','レースID(新・馬番無16桁)','異常コード','馬名','競走種別コード'];
const races=[['2026.10. 4','4東4','東京','Ｇ２',1800,'2026100405040211',105.5],['2026. 6. 7','3東2','東京','Ｇ１',1600,'2026060705030211',92.1],['2026. 4. 5','2阪4','阪神','Ｇ１',2000,'2026040509020411',118]];
function fixture(missing=false){const h=H.filter(x=>!missing||x!=='斤量');const rows=[h];for(let i=0;i<12;i++){for(let j=0;j<3;j++){const [date,meeting,venue,grade,dist,rid,t0]=races[j],t=t0+i*.12,sec=Math.floor(t%60),ts=Math.floor(t/60)+'.'+String(sec).padStart(2,'0')+'.'+Math.round((t-Math.floor(t))*10)%10,fin=i+1;const vals=[3-j,j+1,date,meeting,venue,11,'QA過去走',grade,12,12,fin,fin,fin,fin,57,'芝',dist,'A','良','',ts,(i*.12).toFixed(1),'','',fin,fin,i<3?'先行':'差し',i<3?'先行':'差し',36,34+i*.12,fin,i*.12,50,50,51,rid,0,'QA馬'+fin,14];rows.push(h.map(k=>vals[H.indexOf(k)]));}}return Buffer.from(rows.map(x=>x.join(',')).join('\r\n'),'utf8')}
const real=()=>zlib.gunzipSync(Buffer.from([1,2,3,4].map(i=>fs.readFileSync('waku-bc-converter/regression/fixtures/full_swan.part'+i,'utf8').trim()).join(''),'base64'));
async function run(browser,{grade,bytes,field=12,venue='東京',distance=1800,date='2026-11-12',want,realCase=false}){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text());});
 try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.RSAAddonHealth?.ready&&window.MobileAnalysisControllerV1?.ready&&!document.querySelector('#analyzeBtn')?.disabled,{},{timeout:40000});
 const health=await page.evaluate(()=>window.RSAAddonHealth);assert.deepEqual(health.failures,[],'addon load failure');
 await page.evaluate(meta=>{for(const [k,v] of Object.entries(meta)){const e=document.getElementById(k);if(!e)throw Error('missing '+k);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}}, {raceDate:date,venue,raceName:'Ability C QA '+grade,fieldSize:field,surface:'芝',distance,grade,going:'良'});
 await page.locator('#csvFile').setInputFiles({name:'target-test.csv',mimeType:'text/csv',buffer:bytes});
 await page.evaluate(()=>{document.getElementById('parseCsvBtn')?.click();document.getElementById('analyzeBtn')?.click()});
 await page.waitForFunction(()=>['ready','error'].includes(window.RSAAnalysisTransitionState?.status),null,{timeout:40000});
 const st=await page.evaluate(()=>({transition:window.RSAAnalysisTransitionState,ability:window.M3PureAbilityState,finish:window.Finish600State?.rows,queue:window.ValidatedQueueState?.ready,position:window.PositionRiskState?.ready,decision:window.DecisionShellV2State}));
 assert.equal(st.transition.status,'ready',JSON.stringify(st.transition));assert.equal(st.ability.rows.length,field);assert.equal(st.finish.length,field);assert(st.queue&&st.position);
 assert.equal(new Set(st.ability.rows.map(r=>r.abilityRank)).size,field);assert(st.ability.rows.every(r=>Number.isFinite(r.logit)&&Number.isFinite(r.index)&&Number.isFinite(r.top3)));assert(Math.abs(st.ability.rows.reduce((s,r)=>s+r.top3,0)-3)<1e-7);
 if(want)assert.equal(st.ability.activeModel,want,JSON.stringify(st.ability.abilityC));if(realCase)assert(st.ability.activeModel==='C'||st.ability.abilityC?.reason,'real fixture route must be explicit');if(st.ability.activeModel==='C')assert(st.ability.abilityC.coverage>0&&st.ability.abilityC.eloMatched>0);
 // Market input and the three ticket types exercise the actual live decision pipeline.
 await page.evaluate(n=>{const e=document.getElementById('oddsPaste');e.value=Array.from({length:n},(_,i)=>(i+1)+' '+(i+2)).join('\n');e.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('applyOddsBtn')?.click();},field);
 await page.waitForFunction(()=>window.DecisionShellV2State?.market?.complete&&window.ProductionDecisionPipelineV1State?.stages?.price?.marketComplete,null,{timeout:15000});
 const x=await page.evaluate(()=>({d:window.DecisionShellV2State,p:window.ProductionDecisionPipelineV1State,a:window.M3PureAbilityState,html:document.body.innerText}));
 assert(x.d.tickets.win&&x.d.tickets.quinella&&x.d.tickets.wide);assert.equal(x.p.shadowInputsUsed,false);assert.equal(x.p.manualCombination,true);assert.equal(x.p.manualStake,true);assert.equal(x.p.stages.price.pairPriceConnected,false);assert.equal(x.d.market.rows.length,field);
 const candidates=x.d.structure.candidates||[];for(const c of candidates){assert(c.ar<=3&&c.m3<=3);assert.equal(x.a.byNo[c.no].abilityRank,c.ar);}
 if(x.d.structure.axis)assert.equal(x.a.byNo[x.d.structure.axis.no].abilityRank,x.d.structure.axis.abilityRank);

 // Exercise a deliberately single-overlap race in the real browser using controlled
 // model states: old #1, new #4 (market favorite outside Ability Top3).
 if(grade==='G1'){
 const qa=await page.evaluate(()=>{
 const names=Array.from({length:12},(_,i)=>'AxisQA'+(i+1)),mr=[1,7,8,2,3,4,5,6,9,10,11,12],saved={a:window.M3PureAbilityState,f:window.Finish600State,q:window.ValidatedQueueState,p:window.PositionRiskState,m:window.MobileAnalysisCoreState,od:document.getElementById('oddsPaste').value};
 const a=names.map((name,i)=>({no:String(i+1),name,abilityRank:i+1,logit:1-i*.15,contextWeight:.1,histN:5,axisHistory:{front:.5,rest:30,priorTop3:.4,lastfp:.5}}));
 window.M3PureAbilityState={ready:true,activeModel:'C',rows:a,byNo:Object.fromEntries(a.map(r=>[r.no,r]))};window.Finish600State={ready:true,rows:names.map((name,i)=>({no:String(i+1),name,finishRank:mr[i],score:mr[i]*.02}))};
 window.ValidatedQueueState={byNo:{'1':{frontness5:.8},'4':{frontness5:.4}}};window.PositionRiskState={byNo:{'1':{p10:.1},'4':{p10:.6}}};window.MobileAnalysisCoreState={meta:{grade:'G1'}};
 const od=document.getElementById('oddsPaste');od.value=names.map((_,i)=>(i+1)+' '+(i===3?1.4:i===0?5:10+i)).join('\n');window.MobileDecisionCoreV1.render();
 const d=window.DecisionShellV2State,gate=window.AxisAccessGateV1.classify({status:'ready'},d,{status:'open'}),result={active:d.axisSelection.active,changed:d.axisSelection.changed,old:d.originalStructure.axis.no,chosen:d.structure.axis.no,candidate:d.structure.candidates[0].no,win:d.tickets.win.level,wide:d.tickets.wide.level,gate:gate.status,gateAxis:gate.axisNo,p3:d.axisSelection.chosen.p3,sum:d.axisSelection.rows.reduce((s,r)=>s+r.p3,0)};
 od.value='';window.MobileDecisionCoreV1.render();result.noOdds=window.DecisionShellV2State.structure.axis.no;result.noOddsActive=window.DecisionShellV2State.axisSelection.active;
 window.M3PureAbilityState=saved.a;window.Finish600State=saved.f;window.ValidatedQueueState=saved.q;window.PositionRiskState=saved.p;window.MobileAnalysisCoreState=saved.m;od.value=saved.od;window.MobileDecisionCoreV1.render();return result;
 });
 assert(qa.active&&qa.changed);assert.equal(qa.old,'1');assert.equal(qa.chosen,'4');assert.equal(qa.candidate,'1');assert.equal(qa.win,'red');assert.equal(qa.wide,'yellow');assert.equal(qa.gate,'pass');assert.equal(qa.gateAxis,'4');assert.equal(qa.noOdds,'1');assert.equal(qa.noOddsActive,false);assert(Math.abs(qa.sum-3)<1e-8);assert(Math.abs(qa.p3-.6456160869090499)<1e-10);console.log(kind+' Axis Selection reselection and fallback PASS');
 }
 assert.deepEqual(errors,[],'uncaught browser error: '+errors.join('; '));
 console.log(JSON.stringify({kind,grade,model:st.ability.activeModel,coverage:st.ability.abilityC?.coverage,eloMatched:st.ability.abilityC?.eloMatched,reason:st.ability.abilityC?.reason,decision:x.d.final.code,warnings:warnings.slice(0,5),PASS:true}));
 return st.ability.rows;
 }catch(e){console.error('case failed',kind,grade,errors,warnings.slice(-15));throw e;}finally{await context.close()}
}
(async()=>{const browser=await browserType.launch({headless:true});try{
const c=await run(browser,{grade:'G1',bytes:fixture(),want:'C'});const v=await run(browser,{grade:'OP',bytes:fixture(),want:'v1'});const vr=Object.fromEntries(v.map(r=>[r.no,r.abilityRank]));assert(c.every(r=>r.v1Rank===vr[r.no]),'legacy rank changed for same input');
await run(browser,{grade:'G3',bytes:fixture(true),want:'v1'});
await run(browser,{grade:'G2',bytes:real(),field:18,venue:'京都',distance:1400,date:'2026-10-12',realCase:true});
console.log(kind+' Ability C browser QA PASS 4/4');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
