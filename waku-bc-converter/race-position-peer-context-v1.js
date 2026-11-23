/* Research-only nearby-rivals diagnostic. Not an odds or M3 probability model. */
(function(root){'use strict';
const V='race-position-peer-context-v1-20261123',d=root.document;
const number=x=>x===null||x===undefined||String(x).trim()===''?NaN:Number(x);
const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function evaluate(data){
 if(!Array.isArray(data)||data.length<12||data.length>18)return{ready:false,reason:'全12〜18頭の位置予測が必要'};
 const seen=new Set(),list=[];
 for(const v of data){const no=number(v.no),rank=number(v.expectedRank);
  if(!Number.isInteger(no)||no<1||no>18||seen.has(no)||!v.validated||!Number.isFinite(rank)||rank<1||rank>data.length)return{ready:false,reason:'馬番または初位置予測が未確認'};
  seen.add(no);list.push({no,name:String(v.name||''),rank});
 }
 list.sort((a,b)=>a.no-b.no);
 return{ready:true,n:list.length,rows:list.map((v,i)=>{
  const inside=list.slice(Math.max(0,i-3),i),outside=list.slice(i+1,i+4);
  return{...v,inside:inside.filter(x=>x.rank<v.rank).map(x=>x.no),outside:outside.filter(x=>x.rank<v.rank).map(x=>x.no)};
 })};
}
root.RSAPositionPeerContextCoreV1=Object.freeze({version:V,evaluate});
if(!d?.createElement||!root.addEventListener||root.RSAPositionPeerContextV1)return;
const $=id=>d.getElementById(id);let timer=0,lastKey='',open=false;
function style(){if($('rsapcStyle'))return;const el=d.createElement('style');el.id='rsapcStyle';el.textContent=
 '#rsapcPanel{margin:12px 0;border:1px solid #31566b;border-radius:14px;background:#081d2c;color:#dcecf4;overflow:hidden}'+
 '#rsapcPanel>summary{padding:12px;font-weight:850;font-size:13px;cursor:pointer;list-style:none}'+
 '#rsapcPanel>summary::-webkit-details-marker{display:none}'+
 '.rsapcBody{padding:0 11px 12px}.rsapcHint{color:#a6bdcc;font-size:11px;line-height:1.65;margin:8px 0}'+
 '.rsapcGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}'+
 '.rsapcHorse{border:1px solid #2b4c60;background:#0e293b;border-radius:10px;padding:9px;min-width:0}'+
 '.rsapcHorse strong{font-size:11px;display:block;overflow-wrap:anywhere}'+
 '.rsapcHorse small{display:block;color:#afc6d1;font-size:10px;margin:2px 0 5px}'+
 '.rsapcPair{display:grid;grid-template-columns:1fr 1fr;gap:5px}'+
 '.rsapcPair span{background:#091e2b;border-radius:7px;padding:6px;font-size:10px;line-height:1.45}'+
 '.rsapcPair b{display:block;color:#c7f0e5;font-size:10px;margin-top:2px;overflow-wrap:anywhere}'+
 '.rsapcCaution{border:1px solid #465969;background:#132c3b;border-radius:9px;padding:9px;color:#cedbe5;font-size:10px;line-height:1.6;margin-top:9px}'+
 '@media(max-width:520px){.rsapcGrid{grid-template-columns:1fr}}';d.head.appendChild(el);}
function context(){const f=root.RSAFocusedThreeTabsState||{},q=root.ValidatedQueueState||{},s=root.Finish600State||{};
 if(f.active!=='formation'||!f.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!q.ready||!s.ready)return null;
 if(!/^(3勝|OP|L|G1|G2|G3)$/.test($('grade')?.value||''))return null;
 const host=$('rsafFormation'),horses=s.rows||[];if(!host||horses.length<12||horses.length>18)return null;
 const data=horses.map(x=>{const y=q.byNo?.[String(x.no)]||{};return{no:x.no,name:x.name,expectedRank:y.expectedRank,validated:y.validated}});
 const key=[$('raceDate')?.value,$('venue')?.value,$('distance')?.value,$('raceName')?.value,$('grade')?.value,data.map(x=>[x.no,x.name,x.expectedRank,x.validated].join(':')).join('|')].join('~');
 return{host,data,key,geom:root.CourseGeometryRuntimeV1State?.current};}
function render(){const x=context();if(!x)return;style();
 const m=number(x.geom?.row?.first_turn_distance_m);
 const geom=x.geom?.ready&&Number.isFinite(m)?'初角まで約'+m.toFixed(0)+'m（'+String(x.geom.routeLabel||'ルート確認済')+'）':'初角までの距離・ルートは未確定';
 const key=x.key+'|'+geom;
 let el=$('rsapcPanel');if(el&&el.parentElement===x.host&&lastKey===key)return;lastKey=key;
 const result=evaluate(x.data);
 if(!el||el.parentElement!==x.host){el=d.createElement('details');el.id='rsapcPanel';x.host.appendChild(el);el.addEventListener('toggle',()=>{open=el.open;});}
 el.open=open;
 let content='<div class="rsapcBody"><p class="rsapcHint">'+html(geom)+'。馬番の内外それぞれ近くの3頭で、自分より前の初位置が予測された馬を抽出。</p>';
 if(!result.ready)content+='<p class="rsapcCaution">'+html(result.reason)+'</p>';
 else{
  content+='<div class="rsapcGrid">';
  for(const r of result.rows){const label=a=>a.length?a.map(no=>no+'番').join('・'):'該当なし';
   content+='<div class="rsapcHorse"><strong>'+html(r.no)+'番 '+html(r.name)+'</strong><small>既存の初位置予測 '+r.rank.toFixed(1)+'番手</small><div class="rsapcPair"><span>内側の前寄り候補<b>'+html(label(r.inside))+'</b></span><span>外側の前寄り候補<b>'+html(label(r.outside))+'</b></span></div></div>';
  }content+='</div>';
 }
 content+='<p class="rsapcCaution">これは既存予測の位置関係を見せる研究用比較で、前を取る確率や不利の発生率は新たに計算していません。TARGET仮馬番と確定馬番を照合してください。Ability・M3・P10・公式軸・買い目判定には反映しません。</p></div>';
 el.innerHTML='<summary>内外の位置争奪｜全頭の相手関係（研究用）</summary>'+content;
}
function schedule(){root.clearTimeout(timer);timer=root.setTimeout(render,100);}
root.RSAPositionPeerContextV1=Object.freeze({version:V,productionImpact:false,refresh:schedule});
['rsa-focused-partner-ready','validated-queue-ready','finish600-ready','course-geometry-ready','rsa-analysis-complete'].forEach(ev=>root.addEventListener(ev,schedule));
if(d.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
