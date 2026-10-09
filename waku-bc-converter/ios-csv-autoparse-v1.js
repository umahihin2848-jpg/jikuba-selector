(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
const $=id=>document.getElementById(id);
const css=document.createElement('style');css.textContent=`
body.rsaCsvAuto #mappingBox{display:none!important}
body.rsaCsvAuto #csvInfo{min-height:0!important}
`;document.head.appendChild(css);
function parseWhenReady(){let tries=0;const t=setInterval(()=>{tries++;const s=String($('csvState')?.textContent||'');if(/^\d+行$/.test(s)){clearInterval(t);$('parseCsvBtn')?.click();setTimeout(()=>{const st=String($('csvState')?.textContent||'');if(/^解析済\s+\d+頭$/.test(st)){document.body.classList.add('rsaCsvAuto');const info=$('csvInfo');if(info&&!info.querySelector('[data-rsa-autoparse]')){const d=document.createElement('div');d.dataset.rsaAutoparse='1';d.className='tiny';d.style.marginTop='6px';d.textContent='列は自動認識しました。手動の列割り当ては不要です。';info.appendChild(d)}}else{document.body.classList.remove('rsaCsvAuto')}void document.body.offsetHeight},80)}else if(tries>80){clearInterval(t);document.body.classList.remove('rsaCsvAuto')}},50)}
function bind(){const f=$('csvFile');if(!f)return;document.body.classList.add('rsaCsvAuto');f.addEventListener('change',()=>{document.body.classList.add('rsaCsvAuto');parseWhenReady()},{capture:false})}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();