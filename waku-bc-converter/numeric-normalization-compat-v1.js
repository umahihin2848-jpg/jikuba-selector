(()=>{'use strict';
const C=window.ShapeCore;if(!C||C.__RSA_NFKC_NUM_V2)return;C.__RSA_NFKC_NUM_V2=true;
C.num=v=>{if(v===null||v===undefined||v==='')return null;const s=String(v).normalize('NFKC').replace(/[,％%倍秒\s]/g,'');const x=Number(s);return Number.isFinite(x)?x:null};
const state=window.RSACornerPositionGuard={version:'corner-zero-v1',normalizedZeroCorners:0};
const cornerNames=new Set(['1角','2角','3角','4角','通過1','通過2','通過3','通過4']);
const normKey=k=>String(k??'').normalize('NFKC').replace(/\s+/g,'');
const isZero=v=>{if(v===null||v===undefined||String(v).trim()==='')return false;const x=Number(String(v).normalize('NFKC').trim());return Number.isFinite(x)&&x===0};
if(typeof C.rowsToObjects==='function'){
  const old=C.rowsToObjects.bind(C);
  C.rowsToObjects=function(grid){
    const z=old(grid);
    if(z&&Array.isArray(z.rows))for(const r of z.rows){for(const k of Object.keys(r||{})){if(cornerNames.has(normKey(k))&&isZero(r[k])){r[k]='';state.normalizedZeroCorners++}}}
    return z;
  };
}
})();
