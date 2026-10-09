(()=>{'use strict';
if(window.__RSA_Q16_CACHE_GUARD)return;window.__RSA_Q16_CACHE_GUARD=true;
const BUILD='20261009q16',orig=Node.prototype.appendChild;
Node.prototype.appendChild=function(node){
  try{
    if(node&&node.tagName==='SCRIPT'&&node.src){
      const u=new URL(node.src,location.href);
      if(u.origin===location.origin){u.searchParams.set('rsa_build',BUILD);node.src=u.href}
    }
  }catch(e){console.warn('q16 cache guard',e)}
  return orig.call(this,node)
};
window.RSARuntimeCacheState={ready:true,build:BUILD};
})();