'use strict';
// Diagnose whether the archived five-race regression fixtures still satisfy strict M3 history identity.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const dir=path.resolve(__dirname,'../waku-bc-converter/regression/fixtures');
const names=['mini_昇仙峡','mini_テレビ静岡','mini_オクトーバー','mini_太秦','mini_スワン'];
const output=[];
for(const name of names){
 const fn=path.join(dir,name+'.csv.gz.b64');
 const b64=fs.readFileSync(fn,'utf8').trim();
 let text='',error='';
 try{text=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8')}catch(e){error=e.message}
 const first=text.split(/\r?\n/,1)[0]||'',h=first.split(',').map(s=>s.replace(/"/g,'').trim());
 output.push({name,unzipOk:!error,error,headerCount:h.length,hasTarget:h.includes('何走目'),hasStableId:h.includes('レースID(新・馬番無16桁)'),hasHorsePCI:h.includes('PCI'),hasRacePCI:h.includes('レースPCI'),hasSurface:h.includes('芝・ダート'),has3f:h.includes('上り3F'),hasCorner:h.some(x=>/^(通過[1-4]|[1-4]角)$/.test(x))});
}
console.log('P3-88 Five-race fixture data-contract check:',JSON.stringify(output,null,2));
