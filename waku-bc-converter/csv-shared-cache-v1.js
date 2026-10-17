(()=>{'use strict';
if(window.__CSV_SHARED_CACHE_V1)return;window.__CSV_SHARED_CACHE_V1=true;
const C=window.ShapeCore;if(!C)return;
const filePromises=new WeakMap(),decodeCache=new WeakMap(),rowsCache=new WeakMap();
let lastText=null,lastParsed=null;
if(typeof File!=='undefined'&&File.prototype?.arrayBuffer){const orig=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){let p=filePromises.get(this);if(!p){p=Promise.resolve(orig.call(this));filePromises.set(this,p)}return p}}
if(typeof C.decode==='function'){const orig=C.decode.bind(C);C.decode=function(buf){if(buf&&typeof buf==='object'){const hit=decodeCache.get(buf);if(hit!==undefined)return hit;const out=orig(buf);decodeCache.set(buf,out);return out}return orig(buf)}}
if(typeof C.parseCSV==='function'){const orig=C.parseCSV.bind(C);C.parseCSV=function(text){if(text===lastText&&lastParsed)return lastParsed;const out=orig(text);lastText=text;lastParsed=out;return out}}
if(typeof C.rowsToObjects==='function'){const orig=C.rowsToObjects.bind(C);C.rowsToObjects=function(parsed){if(parsed&&typeof parsed==='object'){const hit=rowsCache.get(parsed);if(hit)return hit;const out=orig(parsed);rowsCache.set(parsed,out);return out}return orig(parsed)}}
window.RSACsvSharedCache={ready:true,version:'csv-shared-cache-v1'};
})();