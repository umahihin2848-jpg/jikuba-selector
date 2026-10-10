(()=>{'use strict';
if(window.__V5_DOM_WRITE_GUARD_V1)return;window.__V5_DOM_WRITE_GUARD_V1=true;
const d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(!d?.get||!d?.set)return;
const nativeGet=d.get,nativeSet=d.set,state={ready:true,version:'v5-dom-write-guard-v1',skipped:0,writes:0,scope:'v5Panel only'};
Object.defineProperty(Element.prototype,'innerHTML',{configurable:d.configurable,enumerable:d.enumerable,get:nativeGet,set:function(v){
  if(this?.closest?.('#v5Panel')){
    const next=String(v??'');
    try{if(nativeGet.call(this)===next){state.skipped++;return}}catch{}
    state.writes++;
    return nativeSet.call(this,next);
  }
  return nativeSet.call(this,v);
}});
window.V5DomWriteGuardState=state;
})();
