(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
const $=id=>document.getElementById(id);
const css=document.createElement('style');css.textContent=`
body.rsaCsvAuto #mappingBox{display:none!important}
body.rsaCsvAuto #csvInfo{min-height:0!important}
`;document.head.appendChild(css);
let token=0;
function finishAutoParse(myToken){if(myToken!==token)return;const st=String($('csvState')?.textContent||'');if(!/^解析済\s+\d+頭$/.test(st)){document.body.classList.remove('rsaCsvAuto');return}
  document.body.classList.add('rsaCsvAuto');
  const box=$('mappingBox'),grid=$('mappingGrid');if(box)box.classList.add('hidden');if(grid)grid.replaceChildren();
  const info=$('csvInfo');if(info&&!info.querySelector('[data-rsa-autoparse]')){const d=document.createElement('div');d.dataset.rsaAutoparse='1';d.className='tiny';d.style.marginTop='6px';d.textContent='CSV自動解析済み。列割り当て画面は省略しました。';info.appendChild(d)}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const card=$('csvFile')?.closest('.card');if(card)card.scrollIntoView({block:'start',behavior:'auto'});void document.documentElement.offsetHeight;void document.body.offsetHeight;}));
}
function parseWhenReady(){const myToken=++token;let tries=0;const t=setInterval(()=>{if(myToken!==token){clearInterval(t);return}tries++;const s=String($('csvState')?.textContent||'');if(/^\d+行$/.test(s)){clearInterval(t);$('parseCsvBtn')?.click();let waits=0;const done=setInterval(()=>{if(myToken!==token){clearInterval(done);return}waits++;const st=String($('csvState')?.textContent||'');if(/^解析済\s+\d+頭$/.test(st)){clearInterval(done);finishAutoParse(myToken)}else if(waits>50){clearInterval(done);document.body.classList.remove('rsaCsvAuto')}},40)}else if(tries>100){clearInterval(t);document.body.classList.remove('rsaCsvAuto')}},40)}
function bind(){const f=$('csvFile');if(!f||f.dataset.rsaAutoBound)return;f.dataset.rsaAutoBound='1';document.body.classList.add('rsaCsvAuto');f.addEventListener('change',()=>{document.body.classList.add('rsaCsvAuto');const grid=$('mappingGrid');if(grid)grid.replaceChildren();parseWhenReady()})}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();