(()=>{'use strict';
if(window.RSAJRAHistory)return;
const FULL=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
const LOCAL=new Set(['門別','旭川','盛岡','水沢','浦和','船橋','大井','川崎','金沢','笠松','名古','名古屋','園田','姫路','高知','佐賀','荒尾']);
function norm(v){return String(v??'').normalize('NFKC').trim()}
function isJRA(v){const s=norm(v);if(FULL.has(s))return true;return /^[0-9]*[札函福新東中名京阪小][0-9A-C]*$/.test(s)}
function kind(v){const s=norm(v);if(!s)return'unknown';if(isJRA(s))return'jra';if(LOCAL.has(s))return'local';return'overseas'}
function label(v){const k=kind(v);return k==='jra'?'JRA':k==='local'?'地方':k==='overseas'?'海外':'不明'}
function summarize(rows,venueKey){const out={jra:0,local:0,overseas:0,unknown:0,total:0};for(const r of rows||[]){const k=kind(typeof venueKey==='function'?venueKey(r):r?.[venueKey]);out[k]++;out.total++}return out}
window.RSAJRAHistory={version:'jra-history-filter-v1.0',isJRA,kind,label,summarize,jraFull:[...FULL],localKnown:[...LOCAL]};
})();