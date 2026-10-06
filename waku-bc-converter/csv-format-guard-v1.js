(function(){'use strict';
const C=window.ShapeCore;if(!C)return;
function norm(s){return C.normHead?C.normHead(s):String(s||'').replace(/[\s_　]/g,'').toUpperCase()}
function show(kind,msg){const state=document.getElementById('csvState'),info=document.getElementById('csvInfo');if(state){state.textContent=kind==='bad'?'形式違い':'要確認';state.classList.remove('ok');state.classList.add('bad')}if(info)info.innerHTML=`<div class="notice red" style="line-height:1.65"><b>CSV形式を確認してください</b><br>${msg}</div>`}
async function inspect(file){if(!file)return;try{const grid=C.parseCSV(C.decode(await file.arrayBuffer()));if(!grid.length)return;const head=grid[0].map(norm);const hasHorse=head.some(x=>x.includes('馬名'));const hasRpci=head.some(x=>x.includes('RPCI'));if(!hasHorse||!hasRpci){show('bad','このCSVには項目名のヘッダーがありません。TARGETでは <b>F8 → 馬データ・★画面イメージ全馬一括（CSV形式）</b> を使い、<b>「項目名を付加する」ON</b>、<b>「過去走を同一レコード内に展開する」OFF</b>、<b>「馬データエリアを行頭に付加する」ON</b> にしてください。過去走数は5〜10走を推奨します。');return}
const obj=C.rowsToObjects(grid),headers=obj.headers,hm=C.autoMap(headers,[['horse','馬名',['馬名']],['date','日付',['日付','年月日','レース日']]]);if(hm.horse){const counts={};for(const r of obj.rows){const n=String(r[hm.horse]||'').trim();if(n)counts[n]=(counts[n]||0)+1}const vals=Object.values(counts);if(vals.length&&Math.max(...vals)<=1){show('warn','項目名は読めていますが、各馬1走分しかありません。RPCI・能力・コース相性の推定には履歴が不足するため、TARGETの出力レース数を5〜10走にしてください。')}}
}catch(e){/* main reader will report actual read errors */}}
function bind(){const f=document.getElementById('csvFile');if(!f)return;f.addEventListener('change',e=>{const file=e.target.files?.[0];setTimeout(()=>inspect(file),60)});if(f.files?.[0])inspect(f.files[0])}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bind);else bind();
})();