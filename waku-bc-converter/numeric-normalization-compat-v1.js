(()=>{'use strict';
const C=window.ShapeCore;if(!C||C.__RSA_NFKC_NUM_V3)return;C.__RSA_NFKC_NUM_V3=true;
C.num=v=>{if(v===null||v===undefined||v==='')return null;const s=String(v).normalize('NFKC').replace(/[,％%倍秒\s]/g,'');const x=Number(s);return Number.isFinite(x)?x:null};
const state=window.RSACornerPositionGuard={version:'corner-zero-v2-horseno-guard',normalizedZeroCorners:0};
const noState=window.RSACurrentHorseNoGuard={version:'current-horseno-v1',reconstructed:0,kept:0,rejectedFuzzy:0,lastStrategy:'none'};
const cornerNames=new Set(['1角','2角','3角','4角','通過1','通過2','通過3','通過4']);
const normKey=k=>String(k??'').normalize('NFKC').replace(/[\s_　]+/g,'').toUpperCase();
const isZero=v=>{if(v===null||v===undefined||String(v).trim()==='')return false;const x=Number(String(v).normalize('NFKC').trim());return Number.isFinite(x)&&x===0};
const currentNo=v=>{const s=String(v??'').normalize('NFKC').trim();if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isInteger(n)&&n>=1&&n<=99?n:null};
if(typeof C.rowsToObjects==='function'){
  const old=C.rowsToObjects.bind(C);
  C.rowsToObjects=function(grid){
    const z=old(grid);
    if(z&&Array.isArray(z.rows))for(const r of z.rows){for(const k of Object.keys(r||{})){if(cornerNames.has(normKey(k))&&isZero(r[k])){r[k]='';state.normalizedZeroCorners++}}}
    return z;
  };
}
// Current-race horse number must never fuzzy-match a historical number column such as 過去馬番.
if(typeof C.autoMap==='function'){
  const old=C.autoMap.bind(C);
  C.autoMap=function(headers,mapSpec){
    const out=old(headers,mapSpec);
    const spec=(mapSpec||[]).find(x=>x?.[0]==='horseNo');
    if(spec){
      const aliases=(spec[2]||[]).map(normKey);
      const exact=(headers||[]).find(h=>aliases.includes(normKey(h))&&!normKey(h).includes('過去'))||'';
      if(out.horseNo&&!exact)noState.rejectedFuzzy++;
      out.horseNo=exact;
    }
    return out;
  };
}
// Guarantee a stable 1-based current horse number before ShapeCore creates analysis.hs.
// If the mapped number is missing, historical, inconsistent within a horse, duplicated across horses,
// or an unconverted TARGET historical 馬番, rebuild by first horse-name appearance.
if(typeof C.buildHistories==='function'){
  const old=C.buildHistories.bind(C),INTERNAL='__RSA_CURRENT_HORSE_NO__';
  C.buildHistories=function(rows,m){
    rows=Array.isArray(rows)?rows:[];m={...(m||{})};
    const nameKey=m.horseName;
    if(!nameKey||!rows.length)return old(rows,m);
    const names=[],seen=new Set();
    for(const r of rows){const name=String(r?.[nameKey]??'').trim();if(name&&!seen.has(name)){seen.add(name);names.push(name)}}
    const key=m.horseNo&&!normKey(m.horseNo).includes('過去')?m.horseNo:'';
    const targetLike=Object.keys(rows[0]||{}).some(k=>normKey(k)==='何走目');
    const transformed=Object.keys(rows[0]||{}).some(k=>normKey(k)==='過去馬番');
    let usable=!!key&&!(targetLike&&!transformed),byName=new Map();
    if(usable){
      for(const r of rows){
        const name=String(r?.[nameKey]??'').trim();if(!name)continue;
        const n=currentNo(r?.[key]);
        if(n===null){usable=false;break}
        if(byName.has(name)&&byName.get(name)!==n){usable=false;break}
        byName.set(name,n);
      }
      if(usable&&(byName.size!==names.length||new Set(byName.values()).size!==byName.size))usable=false;
    }
    if(!usable){byName=new Map(names.map((name,i)=>[name,i+1]));noState.reconstructed+=names.length;noState.lastStrategy='reconstructed-1based'}
    else{noState.kept+=names.length;noState.lastStrategy='validated-current'}
    const patched=rows.map(r=>{const name=String(r?.[nameKey]??'').trim();return{...r,[INTERNAL]:name&&byName.has(name)?String(byName.get(name)):''}});
    return old(patched,{...m,horseNo:INTERNAL});
  };
}
})();
