const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=nfkc-num-s21';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
function csv(){return [
'何走目,馬番,馬名,レースPCI,PCI,Ave-3F,上3F地点差,決手,日付,距離,開催,着順,着差,クラス名,頭数,芝・ダ,通過1,通過2,通過3,通過4',
'1,1,全角テストA,49.7,50.1,34.5,0.4,先行,2026.9.1,1600,4京1,１,0.0,Ｇ３,17,芝,,,２,２',
'2,1,全角テストA,51.2,51.8,34.8,0.6,差し,2026.8.1,1600,3京1,８,0.7,３勝,16,芝,,,６,５',
'1,2,全角テストB,47.2,48.0,35.0,0.3,逃げ,2026.9.2,1600,4京2,２,0.1,Ｇ２,17,芝,,,１,１',
'2,2,全角テストB,53.0,52.2,34.2,0.5,先行,2026.8.2,1600,3京2,１２,1.2,３勝,16,芝,,,３,４'
].join('\n')}
async function run(type,name){const browser=await type.launch({headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});await page.waitForFunction(()=>window.ShapeCore&&window.RSAAddonHealth?.ready===true,null,{timeout:25000});const nums=await page.evaluate(()=>['１','８','１２','１.２','３３．５'].map(x=>window.ShapeCore.num(x)));assert.deepStrictEqual(nums,[1,8,12,1.2,33.5],`${name}: NFKC numeric parse failed ${JSON.stringify(nums)}`);await page.locator('#csvFile').setInputFiles({name:'fullwidth-target.csv',mimeType:'text/csv',buffer:Buffer.from(csv(),'utf8')});await page.waitForFunction(()=>/^解析済\s+2頭$/.test(document.querySelector('#csvState')?.textContent||''),null,{timeout:12000});const info=await page.locator('#csvInfo').innerText();assert(/過去走\s+4件\s*\/\s*馬\s+2頭/.test(info),`${name}: CSV parse summary wrong: ${info}`);assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);console.log('PASS',name,{nums,info});await browser.close()}
(async()=>{await run(chromium,'Chromium iPhone full-width CSV');await run(webkit,'WebKit iPhone full-width CSV')})().catch(e=>{console.error(e);process.exit(1)});
