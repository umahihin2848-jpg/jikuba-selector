(()=>{'use strict';
function arm(){const host=document.getElementById('engineHost');if(!host)return;Object.assign(host.style,{position:'fixed',left:'0',top:'0',width:'1px',height:'1px',overflow:'hidden',pointerEvents:'none',opacity:'1',zIndex:'0',contain:'strict'});}
function kick(){arm();const b=document.getElementById('analyzeBtn');if(b&&!b.dataset.v4WebkitArmed){b.dataset.v4WebkitArmed='1';b.addEventListener('click',()=>{arm();requestAnimationFrame(arm)},true)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kick,{once:true});else kick();
})();