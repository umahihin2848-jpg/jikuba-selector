(function(){'use strict';
const C=window.ShapeCore;if(!C)return;
const nativeFetch=window.fetch.bind(window),courseMap=new Map();
const normSurf=s=>String(s||'').includes('ダ')?'ダ':'芝';
const normGrade=g=>{g=String(g||'').toUpperCase();if(g==='L'||g.includes('LISTED'))return'OP';return g||'Other'};
const key=(v,s,d)=>`${String(v||'').trim()}|${normSurf(s)}|${Number(d)}`;
const right=0,left=1;
const base={
'札幌|芝':[1640.9,266.1,0.7,right],'札幌|ダ':[1487,264.3,0.9,right],
'函館|芝':[1626.6,262.1,3.5,right],'函館|ダ':[1475.8,260.3,3.5,right],
'福島|芝':[1600,292,1.9,right],'福島|ダ':[1444.6,295.7,2.1,right],
'東京|芝':[2083.1,525.9,2.7,left],'東京|ダ':[1899,501.6,2.5,left],
'中京|芝':[1705.9,412.5,3.5,left],'中京|ダ':[1530,410.7,3.4,left],
'小倉|芝':[1615.1,293,3.0,right],'小倉|ダ':[1445.4,291.3,2.9,right],
'中山|ダ':[1493,308,4.5,right],'京都|ダ':[1607.6,329.1,3.0,right],
'阪神|ダ':[1517.6,352.7,1.6,right],'新潟|ダ':[1472.5,353.9,0.6,left]
};
const routes={
'中山|inner':[1667.1,310,5.3,right],'中山|outer':[1839.7,310,5.3,right],
'京都|inner':[1782.8,328.4,3.1,right],'京都|outer':[1894.3,403.7,4.3,right],
'阪神|inner':[1689,356.5,1.9,right],'阪神|outer':[2089,473.6,2.4,right],
'新潟|inner':[1623,358.7,0.8,left],'新潟|outer':[2223,658.7,2.2,left],
'新潟|straight':[1000,1000,0.8,left]
};
const avg=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,a[3]];
function courseSpec(v,s,route){
 s=normSurf(s);if(s==='ダ')return base[`${v}|ダ`]||[1600,350,2.5,right];
 if(routes[`${v}|${route}`])return routes[`${v}|${route}`];
 if(['中山','京都','阪神','新潟'].includes(v))return avg(routes[`${v}|inner`],routes[`${v}|outer`]);
 return base[`${v}|芝`]||[1700,350,2.5,right];
}
const coursePromise=nativeFetch('data/course_first_turn_distance_v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`course ${r.status}`);return r.json()}).then(j=>{for(const e of j.entries||[])courseMap.set(key(e.venue,e.surface,e.distance),e);window.RPCIV2RuntimeState={ready:true,courseCount:courseMap.size,model:'rpci_browser_model_v2'};return j}).catch(e=>{window.RPCIV2RuntimeState={ready:false,error:String(e)};return null});
window.fetch=function(input,init){const u=typeof input==='string'?input:(input&&input.url)||'';if(/(?:^|\/)data\/rpci_browser_model_v1\.json(?:\?|$)/.test(u)){const v2=u.replace('rpci_browser_model_v1.json','rpci_browser_model_v2.json');return coursePromise.then(()=>nativeFetch(v2,init))}return nativeFetch(input,init)};
const oldFeatures=C.features;
C.features=function(hs,meta,M){const f=oldFeatures(hs,meta,M);if(!M||M.version!=='rpci_browser_model_v2')return f;const venue=String(meta.venue||'').trim(),surf=normSurf(meta.surface),dist=Number(meta.distance),e=courseMap.get(key(venue,surf,dist));f.surface=surf==='ダ'?'ダート':'芝';f.grade=normGrade(meta.grade);if(!e){f.route='unknown';return f}const sp=courseSpec(venue,surf,e.route),loop=sp[0],straight=sp[1],elev=sp[2];f.loop_length=loop;f.straight_length=straight;f.elevation=elev;f.left=sp[3];f.straight_ratio=straight/loop;f.loop_distance_ratio=loop/dist;f.first_turn_distance=e.no_turn?0:Number(e.first_turn_distance_m);f.first_turn_ratio=e.no_turn?0:f.first_turn_distance/dist;f.no_turn=e.no_turn?1:0;f.route=String(e.route||'unknown');return f};
})();
