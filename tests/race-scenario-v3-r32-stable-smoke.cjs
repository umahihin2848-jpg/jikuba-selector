const fs=require('fs');
const path=require('path');
const Module=require('module');

const r32=path.join(__dirname,'race-scenario-v3-r32-smoke.cjs');
const generatedTarget=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');
const shapeWait="await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric=\"1\"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout=\"1\"]').length===1,null,{timeout:7000});";
const shapeWaitDebug=`try{await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length===1,null,{timeout:7000});}catch(e){const d=await page.evaluate(()=>({transition:window.RSAAnalysisTransitionState||null,shape:window.RaceShapeBiasState||null,bridge:window.RaceShapeSummaryBridgeState||null,ux:window.RaceUXState||null,narrativeCount:document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length,metricCount:document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length,readoutCount:document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length,summaryClass:document.querySelector('#raceUXSummary')?.className||'',summarySemantics:document.querySelector('#raceUXSummary')?.dataset?.ruxSemantics||'',centerCount:document.querySelectorAll('#raceUXSummary .ruxCenter').length}));console.log('RACE_SHAPE_BRIDGE_DEBUG',name,d);throw e;}`;
const firstUxWait="await page.waitForFunction(()=>window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true,null,{timeout:7000});";
const repeatUxWait="await page.waitForFunction(()=>window.RaceUXState?.ready===true&&window.RaceUXState?.stale===false&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation,null,{timeout:7000});";
const firstUxSync=`await page.waitForFunction(()=>window.RSAAnalysisTransitionState?.status==='ready',null,{timeout:20000});
  try{await page.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation&&document.querySelectorAll('#raceUXSummary.ruxReady').length===1,null,{timeout:9000});}catch(e){const d=await page.evaluate(()=>({transition:window.RSAAnalysisTransitionState||null,ux:window.RaceUXState||null,overall:window.RaceOverallSummaryState||null,independent:window.RaceIndependentLayerState||null,summaryClass:document.querySelector('#raceUXSummary')?.className||'',summarySemantics:document.querySelector('#raceUXSummary')?.dataset?.ruxSemantics||'',summaryCount:document.querySelectorAll('#raceUXSummary.ruxReady').length}));console.log('RACE_UX_INIT_DEBUG',name,d);throw e;}`;
const repeatUxSync=`await page.waitForFunction(()=>window.RSAAnalysisTransitionState?.status==='ready',null,{timeout:20000});
  try{await page.waitForFunction(()=>window.RaceUXState?.version==='race-ux-v2-semantics'&&window.RaceUXState?.semanticsReady===true&&window.RaceUXState?.generation===window.RSAAnalysisTransitionState?.generation&&document.querySelectorAll('#raceUXSummary.ruxReady').length===1,null,{timeout:9000});}catch(e){const d=await page.evaluate(()=>({transition:window.RSAAnalysisTransitionState||null,ux:window.RaceUXState||null,overall:window.RaceOverallSummaryState||null,independent:window.RaceIndependentLayerState||null,summaryClass:document.querySelector('#raceUXSummary')?.className||'',summarySemantics:document.querySelector('#raceUXSummary')?.dataset?.ruxSemantics||'',summaryCount:document.querySelectorAll('#raceUXSummary.ruxReady').length}));console.log('RACE_UX_REPEAT_DEBUG',name,d);throw e;}`;
const originalCompile=Module.prototype._compile;
Module.prototype._compile=function(content,filename){
  if(path.resolve(filename)===path.resolve(generatedTarget)){
    content=String(content)
      .replace(shapeWait,shapeWaitDebug)
      .replace(firstUxWait,firstUxSync)
      .replace(repeatUxWait,repeatUxSync);
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
