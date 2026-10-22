(()=>{'use strict';
if(window.__RSA_REGRESSION_FULL_FIXTURE_ADAPTER_V1)return;window.__RSA_REGRESSION_FULL_FIXTURE_ADAPTER_V1=true;
const originalFetch=window.fetch.bind(window);
// Only proven-valid full TARGET fixtures are substituted here.
// The split October/Uzumasa full fixtures currently fail gzip expansion, so those
// cases deliberately fall back to their stable mini fixtures instead of bending
// production expectations around corrupt test data.
const MAP={
 'fixtures/mini_昇仙峡.csv.gz.b64':['fixtures/fixture_fullcols_shosenkyo.csv.gz.b64'],
 'fixtures/mini_テレビ静岡.csv.gz.b64':['fixtures/full_tv_shizuoka.part1','fixtures/full_tv_shizuoka.part2','fixtures/full_tv_shizuoka.part3'],
 'fixtures/mini_スワン.csv.gz.b64':['fixtures/full_swan.part1','fixtures/full_swan.part2','fixtures/full_swan.part3','fixtures/full_swan.part4']
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchPart(path){
 const url=new URL(path,location.href).href;
 let last=null;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const r=await originalFetch(url,{cache:'no-store'});
   if(r.ok)return (await r.text()).trim();
   last=new Error(`fixture part HTTP ${r.status}: ${path}`);
  }catch(e){last=e}
  if(attempt<3)await sleep(80*attempt);
 }
 throw new Error(`fixture part fetch failed: ${path} / ${last?.message||last||'unknown'}`);
}
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:String(input?.url||'');
 const key=Object.keys(MAP).find(k=>url.includes(k));
 if(!key)return originalFetch(input,init);
 const parts=[];
 for(const p of MAP[key])parts.push(await fetchPart(p));
 const b64=parts.join('');
 console.log(`[regression-fixture] full TARGET ${key}: ${parts.length} part(s), ${b64.length} base64 chars`);
 return new Response(b64,{status:200,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
};
window.RSARegressionFixtureAdapter={version:'full-target-fixture-adapter-v3-corrupt-fixture-quarantine',cases:Object.keys(MAP).length,quarantined:['october','uzumasa']};
})();
