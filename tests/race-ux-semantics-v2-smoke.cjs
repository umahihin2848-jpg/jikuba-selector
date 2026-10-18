const {chromium,webkit}=require('playwright');
const assert=require('assert');

const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=uxsemantics';
const UA='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';

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

function assertRoleNarrative(s,name,phase='initial'){
  assert.strictEqual(s.roleState?.version,'ability-m3-role-sync-v1',`${name}: role sync state version ${phase}`);
  assert(!s.narrIntro.includes('が中心'),`${name}: legacy M3 center wording survived ${phase}`);
  if(s.roleState.axisNo)assert(s.narrIntro.includes('分析上の軸候補'),`${name}: axis candidate wording missing ${phase}`);
  else assert(!s.narrIntro.includes('分析上の軸候補'),`${name}: invented axis candidate ${phase}`);
  if(s.roleState.upliftNo)assert(s.narrIntro.includes('構造浮上馬'),`${name}: uplift role wording missing ${phase}`);
  if(s.roleState.cautionNo)assert(s.narrIntro.includes('地力上位・構造慎重'),`${name}: caution role wording missing ${phase}`);
  if(!s.roleState.axisNo&&!s.roleState.upliftNo&&!s.roleState.cautionNo){
    assert(s.narrIntro.includes('明確な役割馬は抽出されていません'),`${name}: no-role wording missing ${phase}`);
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

async function run(bt,name){
  const b=await bt.launch({headless:true});
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const p=await c.newPage(),errs=[];
  p.on('pageerror',e=>errs.push(e.message));

  await p.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await p.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const health=await p.evaluate(()=>window.RSAAddonHealth);
  assert.deepStrictEqual(health.failures,[],`${name}: addon failures`);
  assert(health.loaded.some(x=>x.startsWith('m3-ability-explain-all-v1.js')),`${name}: ability explain addon not loaded`);
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

  const prev=await p.evaluate(()=>window.RSAAnalysisTransitionState?.generation||0);
  await p.click('#analyzeBtn');
  await p.waitForFunction(x=>window.RSAAnalysisTransitionState?.generation>x&&window.RSAAnalysisTransitionState?.status==='ready',prev,{timeout:20000});
  await p.waitForFunction(()=>window.M3AbilityExplainAllState?.ready===true&&window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.semanticsReady===true,null,{timeout:9000});
  await p.waitForFunction(()=>document.querySelectorAll('#m3NarrativeAnalysis.ruxNarrativeCompact').length===1,null,{timeout:9000});
  await p.waitForFunction(()=>window.M3NarrativeRoleSyncState?.ready===true&&document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody p')?.dataset.roleSync==='1',null,{timeout:9000});

  let s=await p.evaluate(()=>({
    explain:document.querySelectorAll('.m3AbilityExplain').length,
    note:document.querySelectorAll('#m3AbilityExplainAllNote').length,
    summary:document.querySelector('#raceUXSummary')?.innerText||'',
    narrative:document.querySelectorAll('#m3NarrativeAnalysis.ruxNarrativeCompact').length,
    narrBody:document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody')?getComputedStyle(document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody')).display:'none',
    narrIntro:document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody p')?.textContent||'',
    roleState:window.M3NarrativeRoleSyncState,
    state:window.RaceUXState,
    exState:window.M3AbilityExplainAllState
  }));
  assert.strictEqual(s.explain,16,`${name}: all-horse Ability explanation count`);
  assert.strictEqual(s.note,1,`${name}: ability explanation note missing/duplicate`);
  assert(s.summary.includes('Ability v2候補'),`${name}: candidate label missing`);
  assert(s.summary.includes('展開Top3支持'),`${name}: support label ambiguous`);
  assert(s.summary.includes('市場人気'),`${name}: market popularity label missing`);
  assert(s.summary.includes('市場ギャップ'),`${name}: market gap label missing`);
  assert(!s.summary.includes('分析の中心'),`${name}: ambiguous center label survived`);
  assert.strictEqual(s.narrative,1,`${name}: narrative not compacted`);
  assert.strictEqual(s.narrBody,'none',`${name}: long narrative must start collapsed`);
  assert.strictEqual(s.exState.count,16,`${name}: explanation state count mismatch`);
  assertRoleNarrative(s,name,'initial');

  await p.click('#raceUXTabs [data-rux-tab="horses"]');
  await p.waitForFunction(()=>window.RaceUXState?.active==='horses');
  assert.strictEqual(await p.locator('.m3AbilityExplain').count(),16,`${name}: explanations lost in horse tab`);
  await p.selectOption('#going','稍');
  const before=await p.evaluate(()=>window.RSAAnalysisTransitionState?.generation||0);
  await p.click('#analyzeBtn');
  await p.waitForFunction(x=>window.RSAAnalysisTransitionState?.generation>x&&window.RSAAnalysisTransitionState?.status==='ready',before,{timeout:20000});
  await p.waitForFunction(()=>window.M3AbilityExplainAllState?.ready===true&&window.RaceUXState?.version==='race-ux-v2-semantics'&&window.M3NarrativeRoleSyncState?.ready===true,null,{timeout:9000});
  await p.waitForFunction(()=>document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody p')?.dataset.roleSync==='1',null,{timeout:9000});

  s=await p.evaluate(()=>({
    explain:document.querySelectorAll('.m3AbilityExplain').length,
    note:document.querySelectorAll('#m3AbilityExplainAllNote').length,
    summary:document.querySelectorAll('#raceUXSummary.ruxReady').length,
    narrIntro:document.querySelector('#m3NarrativeAnalysis .m3NarrativeBody p')?.textContent||'',
    roleState:window.M3NarrativeRoleSyncState,
    state:window.RaceUXState
  }));
  assert.strictEqual(s.explain,16,`${name}: explanations leaked/duplicated after reanalysis`);
  assert.strictEqual(s.note,1,`${name}: note leaked after reanalysis`);
  assert.strictEqual(s.summary,1,`${name}: summary leaked after reanalysis`);
  assert.strictEqual(s.state.version,'race-ux-v2-semantics');
  assertRoleNarrative(s,name,'reanalysis');
  assert.deepStrictEqual(errs,[],`${name}: page errors ${errs.join(' | ')}`);
  console.log('PASS semantic UX',name,{role:s.state.roleLabel,agreement:s.state.agreementNo,uplift:s.state.upliftNo,axis:s.roleState.axisNo,roleUplift:s.roleState.upliftNo});
  await b.close();
}

(async()=>{
  await run(chromium,'chromium mobile non-iOS');
  await run(webkit,'webkit mobile non-iOS');
})().catch(e=>{console.error(e);process.exit(1)});
