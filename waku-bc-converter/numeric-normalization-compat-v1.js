(()=>{'use strict';
const C=window.ShapeCore;if(!C||C.__RSA_NFKC_NUM_V1)return;C.__RSA_NFKC_NUM_V1=true;
C.num=v=>{if(v===null||v===undefined||v==='')return null;const s=String(v).normalize('NFKC').replace(/[,％%倍秒\s]/g,'');const x=Number(s);return Number.isFinite(x)?x:null};
})();
