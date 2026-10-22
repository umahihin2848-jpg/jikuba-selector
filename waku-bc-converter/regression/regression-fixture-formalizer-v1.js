(()=>{'use strict';
if(window.__RSA_REGRESSION_FULL_FIXTURE_ADAPTER_V1)return;window.__RSA_REGRESSION_FULL_FIXTURE_ADAPTER_V1=true;
const originalFetch=window.fetch.bind(window);
const MAP={
 'fixtures/mini_昇仙峡.csv.gz.b64':['fixtures/fixture_fullcols_shosenkyo.csv.gz.b64'],
 'fixtures/mini_テレビ静岡.csv.gz.b64':['fixtures/full_tv_shizuoka.part1','fixtures/full_tv_shizuoka.part2','fixtures/full_tv_shizuoka.part3'],
 'fixtures/mini_オクトーバー.csv.gz.b64':['fixtures/full_october.part1','fixtures/full_october.part2','fixtures/full_october.part3','fixtures/full_october.part4'],
 'fixtures/mini_太秦.csv.gz.b64':['fixtures/full_uzumasa.part1','fixtures/full_uzumasa.part2','fixtures/full_uzumasa.part3'],
 'fixtures/mini_スワン.csv.gz.b64':['fixtures/full_swan.part1','fixtures/full_swan.part2','fixtures/full_swan.part3','fixtures/full_swan.part4']
};
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:String(input?.url||'');
 const key=Object.keys(MAP).find(k=>url.includes(k));
 if(!key)return originalFetch(input,init);
 const parts=await Promise.all(MAP[key].map(async p=>{const r=await originalFetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`fixture part HTTP ${r.status}: ${p}`);return (await r.text()).trim()}));
 const b64=parts.join('');
 console.log(`[regression-fixture] full TARGET ${key}: ${parts.length} part(s), ${b64.length} base64 chars`);
 return new Response(b64,{status:200,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
};
window.RSARegressionFixtureAdapter={version:'full-target-fixture-adapter-v1',cases:Object.keys(MAP).length};
})();
