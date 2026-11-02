const {chromium,webkit}=require('playwright');
const assert=require('assert');

const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=uxsemantics';

function csv(){
  const h=['何走目','馬番','馬名','レースPCI','PCI','Ave-3F','上3F地点差','決手','日付','距離','開催','着順','着差','クラス名','頭数','芝・ダ','上り3F','通過1','通過2','通過3','通過4'];
  const a=[h.join(',')];
  for(let no=1;no<=16;no++)for(let k=0;k<8;k++){
    const style=no<=3?'逃げ':no<=8?'先行':no<=12?'差し':'追込';
    a.push([
      k+1,no,`UXHorse${no}`,45+(no+k)%10,47+(no*2+k)%12,
      (34.1+(no+k)%8*.2).toFixed(1),(.2+(no+k)%8*.25).toFixed(2),style,
      `2026.${String(9-k).padStart(2,'0')}.10`,1400,'京都',((no+k*2)%14)+1,
      (((no+k)%8)*.16-.2).toFixed(2),k<2?'Ｇ２':'Ｇ３',16,'芝',
      (33.8+(no+k)%9*.2).toFixed(1),Math.min(16,no),Math.min(16,no),
      Math.min(16,Math.max(1,no+(style==='差し'||style==='追込'?-2:1))),
      Math.min(16,Math.max(1,no+(style==='差し'||style==='追込'?-2:1)))
    ].join(','));
  }
  return a.join('\n');
}

const odds=()=>[2.8,4.0,5.5,7.0,9,11,14,18,23,29,36,45,56,70,90,120]
  .map((x,i)=>`${i+1} ${x}`).join('\n');

function hasAxisText(t){return t.includes('分析上の軸候補')||t.includes('軸候補は')}
function hasUpliftText(t){return t.includes('構造浮上馬')||t.includes('今回の構造で浮上')}
function hasCautionText(t){return t.includes('地力上位・構造慎重')||t.includes('地力は高いが今回は慎重')}

function assertRoleEvidence(e,name,phase){
  assert(e,`${name}: narrative evidence missing ${phase}`);
  assert.strictEqual(e.coreVersion,'ability-m3-role-sync-v3-readable',`${name}: readable v3 role sync missing ${phase}`);
  assert.strictEqual(e.parallelOpponentTypes,true,`${name}: parallel opponent semantics missing ${phase}`);
  assert.strictEqual(e.readableSummary,true,`${name}: readable summary flag missing ${phase}`);
  assert(e.quickText.trim().length>0,`${name}: QUICK READ empty ${phase}`);
  assert.strictEqual(e.detailsOpen,false,`${name}: details must start collapsed ${phase}`);
  assert(!e.narrIntro.includes('が中心'),`${name}: legacy M3 center wording survived ${phase}`);
  if(e.axisNo)assert(hasAxisText(e.narrIntro),`${name}: axis candidate wording missing ${phase}`);
  else assert(!hasAxisText(e.narrIntro),`${name}: invented axis candidate ${phase}`);
  if(e.upliftNo)assert(hasUpliftText(e.narrIntro),`${name}: uplift wording missing ${phase}`);
  if(e.cautionNo)assert(hasCautionText(e.narrIntro),`${name}: caution wording missing ${phase}`);
  if(!e.axisNo&&!e.upliftNo&&!e.cautionNo){
    assert(e.narrIntro.includes('明確な役割馬は抽出されていません'),`${name}: no-role wording missing ${phase}`);
  }
}

async function ensureCsvParsed(p){
  await p.locator('#csvFile').setInputFiles({name:'ux.csv',mimeType:'text/csv',buffer:Buffer.from(csv(),'utf8')});
  await p.waitForTimeout(250);
  let state=await p.locator('#csvState').textContent();
  if(!/^解析済\s+16頭$/.test(state||'')&&!/^\d+行$/.test(state||'')){
    await p.evaluate(async()=>{
      const el=document.querySelector('#csvFile');
      if(typeof el?.onchange==='function')await el.onchange.call(el,{type:'change',target:el});
      else el?.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }
  await p.waitForFunction(()=>{
    const s=document.querySelector('#csvState')?.textContent||'';
    return /^解析済\s+16頭$/.test(s)||/^\d+行$/.test(s);
  },null,{timeout:12000});
  const parsed=await p.evaluate(()=>/^解析済\s+16頭$/.test(document.querySelector('#csvState')?.textContent||''));
  if(!parsed)await p.click('#parseCsvBtn');
  await p.waitForFunction(()=>/^解析済\s+16頭$/.test(document.querySelector('#csvState')?.textContent||''),null,{timeout:12000});
}

async function waitReadableRoleNarrative(p){
  await p.waitForFunction(()=>{
    const st=window.M3NarrativeRoleSyncState,t=window.RSAAnalysisTransitionState;
    const root=document.querySelector('#m3NarrativeAnalysis');
    const first=root?.querySelector('.m3NarrativeBody p');
    const quick=root?.querySelector('.m3QuickRead');
    const details=root?.querySelector('.m3NarrativeDetails');
    const core=st?.internalVersion||st?.version||'';
    if(!st?.ready||st.generation!==t?.generation||core!=='ability-m3-role-sync-v3-readable'||st.parallelOpponentTypes!==true||st.readableSummary!==true||!first||!quick||!details||details.open)return false;
    const text=first.textContent||'';
    const axis=text.includes('分析上の軸候補')||text.includes('軸候補は');
    const uplift=text.includes('構造浮上馬')||text.includes('今回の構造で浮上');
    const caution=text.includes('地力上位・構造慎重')||text.includes('地力は高いが今回は慎重');
    if(st.axisNo&&!axis)return false;
    if(!st.axisNo&&axis)return false;
    if(st.upliftNo&&!uplift)return false;
    if(st.cautionNo&&!caution)return false;
    if(!st.axisNo&&!st.upliftNo&&!st.cautionNo&&!text.includes('明確な役割馬は抽出されていません'))return false;
    window.__UXNarrativeSmokeEvidence={
      generation:st.generation,
      coreVersion:core,
      parallelOpponentTypes:st.parallelOpponentTypes===true,
      readableSummary:st.readableSummary===true,
      axisNo:String(st.axisNo||''),
      upliftNo:String(st.upliftNo||''),
      cautionNo:String(st.cautionNo||''),
      narrIntro:text,
      quickText:quick.textContent||'',
      detailsOpen:details.open===true
    };
    return true;
  },null,{timeout:12000,polling:50});
  return p.evaluate(()=>window.__UXNarrativeSmokeEvidence||null);
}

async function analyze(p){
  const prev=await p.evaluate(()=>window.RSAAnalysisTransitionState?.generation||0);
  await p.evaluate(()=>{window.__UXNarrativeSmokeEvidence=null});
  await p.click('#analyzeBtn');
  await p.waitForFunction(x=>window.RSAAnalysisTransitionState?.generation>x&&window.RSAAnalysisTransitionState?.status==='ready',prev,{timeout:20000});
  await p.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.semanticsReady===true&&window.M3NarrativeRoleSyncState?.ready===true,null,{timeout:9000});
  const evidence=await waitReadableRoleNarrative(p);
  const generation=await p.evaluate(()=>window.RSAAnalysisTransitionState?.generation||0);
  assert.strictEqual(evidence?.generation,generation,'narrative evidence generation out of sync');
  return evidence;
}

async function run(bt,name){
  const b=await bt.launch({headless:true});
  const c=await b.newContext({viewport:{width:1280,height:900}});
  const p=await c.newPage(),errs=[];
  p.on('pageerror',e=>errs.push(e.message));

  await p.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await p.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const health=await p.evaluate(()=>window.RSAAddonHealth);
  assert.deepStrictEqual(health.failures,[],`${name}: addon failures`);
  assert.strictEqual(health.mobileLean,false,`${name}: expected desktop addon path`);
  assert(health.loaded.some(x=>x.startsWith('race-ux-semantics-v2.js')),`${name}: semantic ux addon not loaded`);
  assert(health.loaded.some(x=>x.startsWith('m3-narrative-role-sync-v1.js')),`${name}: narrative role sync addon not loaded`);

  await p.fill('#raceDate','2026-10-17');
  await p.selectOption('#venue','京都');
  await p.fill('#raceName','UX Semantic Stakes');
  await p.fill('#fieldSize','16');
  await p.selectOption('#surface','芝');
  await p.fill('#distance','1400');
  await p.selectOption('#grade','G2');
  await p.selectOption('#going','良');
  await ensureCsvParsed(p);
  await p.fill('#oddsPaste',odds());
  await p.click('#applyOddsBtn');

  let evidence=await analyze(p);
  let s=await p.evaluate(()=>({
    summary:document.querySelector('#raceUXSummary')?.innerText||'',
    summaryCount:document.querySelectorAll('#raceUXSummary.ruxReady').length,
    state:window.RaceUXState
  }));
  assert.strictEqual(s.summaryCount,1,`${name}: summary missing/duplicate`);
  assert(s.summary.includes('Ability v2候補'),`${name}: candidate label missing`);
  assert(s.summary.includes('展開Top3支持'),`${name}: support label ambiguous`);
  assert(s.summary.includes('市場人気'),`${name}: market popularity label missing`);
  assert(s.summary.includes('市場ギャップ'),`${name}: market gap label missing`);
  assert(!s.summary.includes('分析の中心'),`${name}: ambiguous center label survived`);
  assertRoleEvidence(evidence,name,'initial');

  await p.selectOption('#going','稍');
  evidence=await analyze(p);
  s=await p.evaluate(()=>({
    summaryCount:document.querySelectorAll('#raceUXSummary.ruxReady').length,
    state:window.RaceUXState
  }));
  assert.strictEqual(s.summaryCount,1,`${name}: summary leaked after reanalysis`);
  assert.strictEqual(s.state.version,'race-ux-v2-semantics');
  assertRoleEvidence(evidence,name,'reanalysis');
  assert.deepStrictEqual(errs,[],`${name}: page errors ${errs.join(' | ')}`);
  console.log('PASS semantic UX',name,{role:s.state.roleLabel,agreement:s.state.agreementNo,uplift:s.state.upliftNo,axis:evidence.axisNo,roleUplift:evidence.upliftNo});
  await b.close();
}

(async()=>{
  await run(chromium,'chromium desktop');
  await run(webkit,'webkit desktop');
})().catch(e=>{console.error(e);process.exit(1)});
