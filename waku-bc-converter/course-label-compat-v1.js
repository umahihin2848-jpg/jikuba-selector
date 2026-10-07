(function(){'use strict';
function patch(){
  const root=document.getElementById('courseFitList');if(!root)return;
  let changed=false;
  for(const s of root.querySelectorAll('.hs span')){
    if((s.textContent||'').trim()==='補正量'){s.textContent='コース補正';changed=true}
  }
  if(changed)window.dispatchEvent(new CustomEvent('course-fit-label-ready'));
}
function bind(){
  patch();
  const root=document.getElementById('courseFitList');
  if(root){
    const mo=new MutationObserver(()=>patch());
    mo.observe(root,{childList:true,subtree:true});
  }
  document.getElementById('analyzeBtn')?.addEventListener('click',()=>{setTimeout(patch,50);setTimeout(patch,250)});
}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('rsa-addons-ready',()=>setTimeout(bind,0),{once:true});
})();