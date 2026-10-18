const fs=require('fs');
const path=require('path');
const Module=require('module');

const r32=path.join(__dirname,'race-scenario-v3-r32-smoke.cjs');
const generatedTarget=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');

const firstShapeWait="await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout=\"1\"]').length===1,null,{timeout:7000});";
const repeatShapeWait="await page.waitForFunction(()=>window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout=\"1\"]').length===1,null,{timeout:5000});";
const firstUxWait="await page.waitForFunction(()=>window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true,null,{timeout:7000});";
const repeatUxWait="await page.waitForFunction(()=>window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation,null,{timeout:7000});";

const shapeDebug=`const d=await page.evaluate(()=>({
  transition:window.RSAAnalysisTransitionState||null,
  overall:window.RaceOverallSummaryState||null,
  independent:window.RaceIndependentLayerState||null,
  shape:window.RaceShapeBiasState||null,
  bridge:window.RaceShapeSummaryBridgeState||null,
  ux:window.RaceUXState||null,
  raceUxFlag:window.__RACE_UX_V1??null,
  raceUxSemanticsFlag:window.__RACE_UX_SEMANTICS_V2??null,
  healthLoaded:(window.RSAAddonHealth?.loaded||[]).filter(x=>x.includes('race-ux')),
  healthFailures:window.RSAAddonHealth?.failures||[],
  raceUxScripts:[...document.scripts].map(s=>s.getAttribute('src')||'').filter(x=>x.includes('race-ux')),
  narrativeCount:document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length,
  metricCount:document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length,
  readoutCount:document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length,
  summaryExists:!!document.querySelector('#raceUXSummary'),
  tabsExists:!!document.querySelector('#raceUXTabs'),
  summaryClass:document.querySelector('#raceUXSummary')?.className||'',
  summarySemantics:document.querySelector('#raceUXSummary')?.dataset?.ruxSemantics||'',
  centerCount:document.querySelectorAll('#raceUXSummary .ruxCenter').length
}));console.log('RACE_SHAPE_BRIDGE_DEBUG',name,d);console.log('RACE_UX_PAGE_ERRORS',name,pageErrors);`;
const firstShapeSync=`try{
    await page.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation&&document.querySelectorAll('#raceUXSummary.ruxReady').length===1,null,{timeout:9000});
    await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeBiasState?.generation===window.RSAAnalysisTransitionState?.generation&&window.RaceShapeSummaryBridgeState?.ready===true&&window.RaceShapeSummaryBridgeState?.generation===window.RSAAnalysisTransitionState?.generation&&window.RaceShapeSummaryBridgeState?.narrative===true&&window.RaceShapeSummaryBridgeState?.ux===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length===1,null,{timeout:5000});
  }catch(e){${shapeDebug}throw e;}`;
const repeatShapeSync=`try{
    await page.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation&&document.querySelectorAll('#raceUXSummary.ruxReady').length===1,null,{timeout:9000});
    await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeBiasState?.generation===window.RSAAnalysisTransitionState?.generation&&window.RaceShapeSummaryBridgeState?.ready===true&&window.RaceShapeSummaryBridgeState?.generation===window.RSAAnalysisTransitionState?.generation&&window.RaceShapeSummaryBridgeState?.narrative===true&&window.RaceShapeSummaryBridgeState?.ux===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length===1,null,{timeout:5000});
  }catch(e){${shapeDebug}throw e;}`;
const uxSync=`await page.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation&&document.querySelectorAll('#raceUXSummary.ruxReady').length===1,null,{timeout:9000});`;

const originalCompile=Module.prototype._compile;
Module.prototype._compile=function(content,filename){
  if(path.resolve(filename)===path.resolve(generatedTarget)){
    content=String(content)
      .replace(firstShapeWait,firstShapeSync)
      .replace(repeatShapeWait,repeatShapeSync)
      .replace(firstUxWait,uxSync)
      .replace(repeatUxWait,uxSync);
  }
  return originalCompile.call(this,content,filename);
};
try{
  const src=fs.readFileSync(r32,'utf8');
  const m=new Module(r32,module);
  m.filename=r32;
  m.paths=Module._nodeModulePaths(path.dirname(r32));
  m._compile(src,r32);
} finally {
  Module.prototype._compile=originalCompile;
}
