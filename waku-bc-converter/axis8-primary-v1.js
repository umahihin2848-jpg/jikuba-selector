/* Phase 3/5 axis8 replacement candidate. No ticket selection. */
(function(root){'use strict';
if(root.RSAAxis8Core)return;
const C=(function axis8Core(){
 const V="axis8-primary-20261125-v1";
 const grades=["3勝","G1","G2","G3","L","OP"];
 // Exact affine-logit representation recovered from the saved 2026 walk-forward
 // odds_cal predictions (trained on years <2026); maximum logit error <4e-14.
 const coeff=[
 [-0.46570457852944824,-0.30366092626726093,-0.4676590079722154,-0.4287509713976949,-0.4936064994005354,-0.5247281922535826,0.9599073958857633,0.020636892846395374],
 [-0.8381550006352151,-0.6915710443976434,-0.7652505288537059,-0.7146780394139741,-0.7195725631303089,-0.7784591941445397,0.8872235277727947,0.03668494681396805],
 [-0.8296275943034034,-0.6813815042724765,-0.7871952419328174,-0.7620975750039273,-0.77474678110233,-0.8511399974402233,0.7079564584196831,0.03212973303637613]];
 const n=x=>x==null||String(x).trim()===""?NaN:Number(x), norm=x=>String(x??"").normalize("NFKC").trim(), sum=a=>a.reduce((s,x)=>s+x,0);
 const bad=(reason,status="hold")=>({ready:false,status,reason,version:V});
 function parseOdds(raw,rows){
  const map=new Map();
  for(const line of norm(raw).split(/\r?\n/)){if(!line.trim())continue;const m=line.trim().match(/^(\d+)[,\s]+(\d+(?:\.\d+)?)$/);if(!m)return null;const no=String(+m[1]),o=+m[2];if(map.has(no)||!Number.isFinite(o)||o<1)return null;map.set(no,o);}
  if(map.size!==rows.length||rows.some(r=>!map.has(r.no)))return null;
  return rows.map(r=>({...r,od:map.get(r.no)})).sort((a,b)=>a.od-b.od||+a.no-+b.no).map((r,i)=>({...r,pop:i+1}));
 }
 function pl(rows){
  const N=rows.length, w=rows.map(h=>1/h.od),p=w.map(x=>x/sum(w));
  const two=Array(N).fill(0),three=Array(N).fill(0),q=Array.from({length:N},()=>Array(N).fill(0)),wide=Array.from({length:N},()=>Array(N).fill(0));
  for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(i!==j){
    const v=p[i]*p[j]/(1-p[i]);two[i]+=v;two[j]+=v;q[i][j]+=v;q[j][i]+=v;
    for(let k=0;k<N;k++)if(k!==i&&k!==j){const z=v*p[k]/(1-p[i]-p[j]);for(const u of [i,j,k])three[u]+=z;for(const [a,b] of [[i,j],[i,k],[j,k]]){wide[a][b]+=z;wide[b][a]+=z;}}
  }
  if(Math.abs(sum(p)-1)>1e-8||Math.abs(sum(two)-2)>1e-8||Math.abs(sum(three)-3)>1e-8)return null;
  return {p,two,three,q,wide};
 }
 function cal(raw,g,N,k){const b=coeff[k],x=Math.max(1e-6,Math.min(1-1e-6,raw));return 1/(1+Math.exp(-(b[grades.indexOf(g)]+b[6]*Math.log(x/(1-x))+b[7]*N)));}
 function rank(p){return p>=.7?"S":p>=.6?"A":p>=.5?"B":"C";}
 function preliminary({grade,field,surface,name,ability,finish}){
  if(!grades.includes(grade)||!Number.isInteger(field)||field<12||field>18||!["芝","ダ","ダート"].includes(surface)||/障害|ジャンプ|J[- ]?G[123]/i.test(name||""))return bad("平地3勝以上・12〜18頭の対象条件外","out");
  if(!ability?.ready||!finish?.ready||!Array.isArray(ability.rows)||!Array.isArray(finish.rows))return bad("Ability・M3の計算待ち");
  if(/^G[123]$/.test(grade)?ability.activeModel!=="C":String(ability.activeModel).toLowerCase()!=="v1")return bad("対象クラスのAbilityモデルが未確定");
  const tied=ability.leaderAmbiguous||finish.m3Top3BoundaryAmbiguous||ability.rows.some(h=>n(h.abilityTieStart)<=3&&n(h.abilityTieEnd)>n(h.abilityTieStart));
  const map=new Map(finish.rows.map(h=>[String(+h.no),h])),rows=ability.rows.map(h=>{const no=String(+h.no),f=map.get(no);return {no,name:norm(h.name),ar:n(h.abilityRank),mr:n(f?.finishRank),matched:!!f&&norm(f.name)===norm(h.name)};});
  if(rows.length!==field||map.size!==field||finish.rows.length!==field||new Set(rows.map(h=>h.no)).size!==field||rows.some(h=>!h.matched||!h.name||!Number.isInteger(+h.no)||+h.no<1||+h.no>18||!Number.isInteger(h.ar)||!Number.isInteger(h.mr)||h.ar<1||h.mr<1||h.ar>field||h.mr>field))return bad("全頭の馬番・馬名・順位の照合待ち");
  const uniqueTop=["ar","mr"].every(k=>[1,2,3].every(i=>rows.filter(h=>h[k]===i).length===1));
  if(tied||!uniqueTop)return {ready:true,structure:null,candidates:[],rows,reason:"上位順位の同点：構造判定保留"};
  const candidates=rows.filter(h=>h.ar<=3&&h.mr<=3).sort((a,b)=>a.ar-b.ar),structure=candidates.length?candidates.map(h=>"A"+h.ar).join("+"):"none";
  return {ready:true,structure,candidates,rows};
 }
 function compute(input){
  const {grade,field,odds}=input,pre=preliminary(input);
  if(!pre.ready)return pre;
  if(pre.structure===null)return bad(pre.reason);
  const {rows,candidates,structure}=pre;
  const market=parseOdds(odds,rows);if(!market)return {...bad("全頭の単勝オッズを馬番と照合してください"),structure};
  const list=candidates.length?market.filter(h=>candidates.some(c=>c.no===h.no)):market.filter(h=>h.ar===1);
  const axis=list[0];if(!axis)return bad("軸候補未確定");
  if((list.length>1&&list[0].od===list[1].od)||market.some(h=>h.no!==axis.no&&h.od===axis.od&&Math.min(h.pop,axis.pop)<=6&&Math.max(h.pop,axis.pop)>6))return {...bad("軸選定または人気6位境界が同オッズのため保留"),structure};
  const P=pl(market);if(!P)return bad("市場確率の整合性エラー");
  const i=market.findIndex(h=>h.no===axis.no),raw=[P.p[i],P.two[i],P.three[i]],c=raw.map((p,k)=>cal(p,grade,field,k));
  // Independent calibrated focal marginals are not claimed to be full-field coherent.
  // The gate uses the exact Phase 5 top3 model, never projected/recalibrated again.
  if(!(c[0]<=c[1]&&c[1]<=c[2]))return bad("較正後の勝率・連対率・3着内率が逆転：保留");
  const others=market.filter(h=>h.no!==axis.no).map(h=>{const j=market.indexOf(h);return {...h,w:P.wide[i][j]/P.three[i],q:P.q[i][j]/P.two[i]};});
  if(Math.abs(sum(others.map(h=>h.w))-2)>1e-8||Math.abs(sum(others.map(h=>h.q))-1)>1e-8)return bad("条件付き確率の整合性エラー");
  const tier=axis.pop>6?"C":rank(c[2]);
  return {ready:true,version:V,structure,axis,tier,status:tier==="C"?"skip":"candidate",reason:axis.pop>6?"軸が7番人気以下":c[2]<.5?"較正3着内確率50%未満":"レース選別条件クリア",calibrated:c,raw,rows:market,others};
 }
 // Exact Phase 4 direct_cond: W uses unordered fixed-two subset weights
 // proportional to products of inverse geometric-mean wide odds; Q uses inverse odds.
 // Only axis-connected n-1 rows are necessary: global odds normalization cancels.
 function direct(raw,model){
  if(!model?.ready)return null;const map=new Map();
  for(const l of norm(raw).split(/\r?\n/)){if(!l.trim())continue;const m=l.trim().match(/^(\d+)[,\s]+(\d+)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)$/);if(!m||String(+m[1])!==model.axis.no)return null;const id=String(+m[2]),q=+m[3],lo=+m[4],hi=+m[5];if(map.has(id)||id===model.axis.no||![q,lo,hi].every(v=>Number.isFinite(v)&&v>=1)||lo>hi)return null;map.set(id,{q:1/q,w:1/Math.sqrt(lo*hi)});}
  if(map.size!==model.others.length||model.others.some(h=>!map.has(h.no)))return null;
  let total=0;const w=Array(model.others.length).fill(0),v=model.others.map(h=>map.get(h.no));
  for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){const z=v[i].w*v[j].w;total+=z;w[i]+=z;w[j]+=z;}
  const qsum=sum(v.map(x=>x.q));if(!(total>0&&qsum>0))return null;
  return model.others.map((h,i)=>({...h,q:v[i].q/qsum,w:w[i]/total}));
 }
 function coverage(rows,target=.75,metric="w"){const total=metric==="w"?2:1;let c=0;const sorted=[...rows].sort((a,b)=>b[metric]-a[metric]||a.pop-b.pop||+a.no-+b.no);return sorted.map(h=>{const selected=c<target-1e-12;c+=h[metric]/total;return {...h,selected,coverage:c};});}
 function formation(model,selected,queue,risk,core,transition,started){
 const bad=reason=>({ready:false,reason});
 const N=x=>x==null||String(x).trim()===""?NaN:Number(x),norm=x=>String(x??"").normalize("NFKC").trim();
 if(!model?.ready||transition?.status!=="ready")return bad("レース判定待ち");
 if(!Number.isInteger(transition.generation)||!core?.ready||core.generation!==transition.generation||!queue?.ready||queue.generation!==transition.generation||!(N(queue.at)>=started))return bad("今回の隊列計算を待っています");
 const roster=model.rows.map(h=>({no:String(h.no),name:h.name})),m=new Map((queue.rows||[]).map(h=>[String(h.no),h]));
 if(queue.fieldSize!==roster.length||m.size!==roster.length||(queue.rows||[]).length!==roster.length||roster.some(h=>!m.has(h.no)||norm(m.get(h.no).name)!==norm(h.name)))return bad("隊列の馬番・馬名が不一致");
 const axis=model.axis?String(model.axis.no):"",partners=selected.map(h=>String(h.no));
 if((axis&&!roster.some(h=>h.no===axis))||(!axis&&partners.length)||new Set(partners).size!==partners.length||partners.some(no=>no===axis||!m.has(no)))return bad("軸・相手候補の照合待ち");
 const byNo=Object.fromEntries(roster.map(h=>{const q=m.get(h.no),rank=N(q.expectedRank),lane=N(q.laneIdx);return [h.no,{...q,expectedRank:q.validated===true&&rank>=1&&rank<=roster.length?rank:null,laneIdx:Number.isInteger(lane)&&lane>=0&&lane<=3?lane:null}];}));
 const a=core.analysis||{},raw=a.pred?.p;
 const total=Array.isArray(raw)&&raw.length===4&&raw.every(v=>Number.isFinite(N(v))&&N(v)>=0)?raw.reduce((s,v)=>s+N(v),0):0;
 const pace=total>0?raw.map(v=>N(v)/total):null;
 const ar=byNo[axis]||{},rr=risk?.byNo?.[axis],p10=axis&&risk?.ready&&N(risk.at)>=started&&norm(rr?.name)===norm(model.axis?.name)?N(rr.p10):NaN;
 return {ready:true,generation:transition.generation,roster,byNo,axis,partners,pace,pressure:String(a.pressure||""),axisRank:ar.expectedRank??null,frontness:N(ar.frontness5),pursuit:String(ar.pursuitGrade||""),p10:p10>=0&&p10<=1?p10:null,referenceOnly:model.tier==="C"};
}
 function verticalFormation(m){
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const known=[],unknown=[];
 for(const h of m.roster){const q=m.byNo[h.no];if(!q||!Number.isFinite(q.expectedRank)||!Number.isInteger(q.laneIdx)||q.laneIdx<0||q.laneIdx>3){unknown.push(h);continue;}known.push({...h,rank:q.expectedRank,lane:q.laneIdx});}
 known.sort((a,b)=>a.rank-b.rank||Number(a.no)-Number(b.no));
 const height=96+known.length*25,xs=[60,104,148,192];
 let svg='<svg viewBox="0 0 344 '+height+'" role="img" aria-label="初角予測。上が先頭、下が後方、左が内、右が外。縦の間隔は実距離ではありません。"><rect x="1" y="1" width="342" height="'+(height-2)+'" rx="12" fill="#183b30"/><path d="M39 45 V18 M32 25 L39 18 L46 25" fill="none" stroke="#dcefe1" stroke-width="2"/><text x="53" y="27" fill="#e4f4e9" font-size="12" font-weight="700">進行方向・先頭</text><text x="16" y="56" fill="#b6d2c1" font-size="10">番手</text>';
 for(let i=0;i<4;i++){svg+='<rect x="'+(xs[i]-19)+'" y="65" width="38" height="'+(known.length*25+4)+'" rx="8" fill="'+(i%2===0?"#254b3c":"#214437")+'"/><text x="'+xs[i]+'" y="56" text-anchor="middle" font-size="11" fill="#d9eddf">'+["最内","内","中","外"][i]+'</text>';}
 svg+='<path d="M39 65 V'+(height-27)+'" stroke="#b6d2c1" stroke-width="2"/><text x="218" y="56" font-size="11" fill="#d9eddf">馬名</text>';
 for(let i=0;i<known.length;i++){const h=known[i],x=xs[h.lane],y=80+i*25,axis=h.no===m.axis,partner=m.partners.includes(h.no),fill=axis?"#7358c5":partner?"#0c968b":"#ebf3ed",name=Array.from(h.name),short=name.length>9?name.slice(0,8).join("")+"…":h.name;svg+='<g><title>'+esc(h.no+"番 "+h.name+"・予測 "+h.rank.toFixed(1)+"番手")+'</title><text x="31" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="#d8e9dd">'+h.rank.toFixed(1)+'</text><circle cx="'+x+'" cy="'+y+'" r="10.5" fill="'+fill+'" stroke="'+(axis?"#d6c8ff":partner?"#a8f5dc":"#c5d3d0")+'" stroke-width="1.5"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="11" font-weight="800" fill="'+(axis||partner?"#fff":"#183b30")+'">'+esc(h.no)+'</text><text x="218" y="'+(y+4)+'" font-size="11" fill="'+(axis?"#e1d3ff":partner?"#a5f4e0":"#e4f4e9")+'">'+esc(short)+'</text></g>';}
 return {svg:svg+'<text x="53" y="'+(height-9)+'" fill="#dcefe1" font-size="11">後方</text></svg>',known,unknown};
}
 function horseDetail(h,field,finish,risk,form,generation,started){
 const num=v=>v==null||String(v).trim()===""?NaN:Number(v),norm=v=>String(v??"").normalize("NFKC").trim(),match=r=>r&&String(r.no??h.no)===String(h.no)&&norm(r.name)===norm(h.name),fresh=s=>s?.ready&&Number.isFinite(num(s.at))&&num(s.at)>=started&&(s.generation==null||s.generation===generation),prob=v=>Number.isFinite(num(v))&&num(v)>=0&&num(v)<=1?num(v):null,rank=v=>Number.isFinite(num(v))&&num(v)>=1&&num(v)<=field?num(v):null;
 const fr=fresh(finish)?finish.rows?.find(r=>match(r)):null,sc=Array.isArray(fr?.sc)&&fr.sc.length===4?fr.sc.map(v=>rank(v?.rank)):null,valid=sc&&sc.every(v=>v!==null);
 const pace=form?.ready&&form.generation===generation&&Array.isArray(form.pace)&&form.pace.length===4&&form.pace.every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0)&&form.pace.some(v=>v>0)?form.pace:null;
 const max=pace?Math.max(...pace):null,band=pace&&pace.filter(v=>v===max).length===1?pace.indexOf(max):-1;
 const rr=fresh(risk)&&match(risk.byNo?.[h.no])?risk.byNo[h.no]:null,q=form?.ready&&form.generation===generation&&match(form.byNo?.[h.no])?form.byNo[h.no]:null;
 return {ability:rank(h.ar),m3:rank(h.mr),m4:valid&&band>=0?sc[band]:null,m4Range:valid?[Math.min(...sc),Math.max(...sc)]:null,m4Sc:valid?sc:null,band:band>=0?band:null,p10:prob(rr?.p10),position:rank(q?.expectedRank),lane:rank(q?.expectedRank)!=null&&Number.isInteger(q?.laneIdx)&&q.laneIdx>=0&&q.laneIdx<=3?["内ラチ","内","中","外"][q.laneIdx]:null,front:prob(q?.frontness5),pursuit:q?.pursuitApplicable===false?null:typeof q?.pursuitGrade==="string"&&q.pursuitGrade!=="—"?q.pursuitGrade:null,pop:rank(h.pop),odds:Number.isFinite(num(h.od))&&num(h.od)>=1?num(h.od):null};
}
 function cornerProjection(form,api,meta){
 const bad=reason=>({ready:false,reason,rows:[]});
 if(!form?.ready)return bad("初角の分析待ち");
 if((meta.venue==="新潟"&&String(meta.surface).startsWith("芝")&&Number(meta.distance)===1000)||form.roster.every(h=>Number(form.byNo[h.no]?.noTurn)===1))return bad("直線コースのため3角・4角なし");
 if(!api?.predictCurrent)return bad("3・4角モデルの読み込み待ち");
 const q={ready:true,fieldSize:form.roster.length,rows:form.roster.map(h=>form.byNo[h.no])};
 let result;try{result=api.predictCurrent(q,{...meta,field:q.fieldSize});}catch(e){return bad("3・4角モデルの計算エラー");}
 if(!result?.ready||!Array.isArray(result.rows))return bad(result?.reason||"3・4角の予測待ち");
 const map=new Map(result.rows.map(h=>[String(h.no),h])),n=q.fieldSize,norm=v=>String(v??"").normalize("NFKC").trim(),rank=v=>typeof v==="number"&&Number.isFinite(v)&&v>=1&&v<=n?v:null;
 if(map.size!==n||result.rows.length!==n||form.roster.some(h=>norm(map.get(h.no)?.name)!==norm(h.name)))return bad("3・4角の馬番・馬名不一致");
 const rows=form.roster.map(h=>{const r=map.get(h.no),three=r.valid?rank(r.three):null,four=r.valid?rank(r.four):null,range=four!==null&&Array.isArray(r.range)&&r.range.length===2&&r.range.every(v=>Number.isInteger(v)&&v>=1&&v<=n)&&r.range[0]<=four&&four<=r.range[1]?r.range:null;return {...h,three,four,range};});
 return {ready:true,rows,byNo:Object.fromEntries(rows.map(h=>[h.no,h])),validation:result.modelValidation||{},validCount:rows.filter(h=>h.four!==null).length};
}
 function lateFormation(m,stage){
 const E=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
 const field=stage==="3"?"three":"four",known=[],unknown=[];
 for(const h of m.roster){const q=m.corners?.byNo?.[h.no],r=q?.[field];if(!Number.isFinite(r)){unknown.push(h);continue;}known.push({...h,rank:r,range:stage==="4"?q.range:null});}
 known.sort((a,b)=>a.rank-b.rank||Number(a.no)-Number(b.no));
 const height=92+known.length*29;
 let svg='<svg viewBox="0 0 344 '+height+'" role="img" aria-label="'+stage+'コーナー予測番手。内外進路は不明。"><rect x="1" y="1" width="342" height="'+(height-2)+'" rx="12" fill="#183b30"/><path d="M37 42 V16 M30 23 L37 16 L44 23" stroke="#dcefe1" stroke-width="2" fill="none"/><text x="53" y="25" fill="#e4f4e9" font-size="12" font-weight="700">進行方向・先頭</text><text x="17" y="54" font-size="10" fill="#dcefe1">番手</text><text x="79" y="54" font-size="11" fill="#dcefe1">馬名（内外不明）</text>'+(stage==="4"?'<text x="330" y="54" text-anchor="end" font-size="10" fill="#dcefe1">参考幅</text>':'')+'<rect x="40" y="62" width="34" height="'+(known.length*29+4)+'" rx="7" fill="#254b3c"/>';
 for(let i=0;i<known.length;i++){const h=known[i],y=77+i*29,axis=h.no===m.axis,partner=m.partners.includes(h.no),fill=axis?"#7358c5":partner?"#0c968b":"#ebf3ed",name=Array.from(h.name),short=name.length>13?name.slice(0,12).join("")+"…":h.name;svg+='<g><title>'+E(h.no+"番 "+h.name+"／"+h.rank.toFixed(1)+"番手")+'</title><text x="34" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#dcefe1">'+h.rank.toFixed(1)+'</text><circle cx="57" cy="'+y+'" r="11" fill="'+fill+'"/><text x="57" y="'+(y+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+(axis||partner?"#fff":"#183b30")+'">'+E(h.no)+'</text><text x="82" y="'+(y+4)+'" font-size="12" fill="#e4f4e9">'+E(short)+'</text>'+(h.range?'<text x="330" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#b9d4c5">'+h.range.join("〜")+'</text>':'')+'</g>';}
 return {svg:svg+'<text x="53" y="'+(height-8)+'" font-size="11" fill="#dcefe1">後方</text></svg>',known,unknown};
}
 return {V,preliminary,compute,pl,cal,rank,direct,coverage,formation,verticalFormation,horseDetail,cornerProjection,lateFormation};
})();root.RSAAxis8Core=C;
(function ui(root,C){
 if(!root.document)return;
 const D=root.document,$=id=>D.getElementById(id),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),pct=x=>Number.isFinite(x)?(x*100).toFixed(1)+"%":"—";
 let activeTab="axis",stage="1",lastFormation=null,analysisLocked=false;
 const tabs=["axis","partners","formation"];
 function selectTab(tab){if(!tabs.includes(tab))return;if(analysisLocked&&tab!=="axis")tab="axis";activeTab=tab;for(const key of tabs){const btn=$("a8Tab-"+key),panel=$("a8Panel-"+key);if(btn){btn.setAttribute?.("aria-selected",String(key===tab));btn.tabIndex=key===tab?0:-1;btn.disabled=analysisLocked&&key!=="axis";}if(panel)panel.hidden=key!==tab||(analysisLocked&&key!=="axis");}}
 let dirty=true,started=0,timer=0,signature="",target=.75,metric="w",pairText="",pairKey="",latest=null,confirmed=false,snapshot=null,snapshotSig="",renderCount=0;
 function setAnalysisLock(locked){
  analysisLocked=!!locked;const el=$("axis8Primary");if(el)el.dataset.a8Locked=locked?"1":"0";D.documentElement.dataset.axis8Verdict=locked?"skip":"open";
  for(const id of ["a8AxisDetailFold","a8AxisDetails","a8ResearchFold","a8FourModelCompare","a8ClosingCompare","a8RecordHost","abilityDCompare"]){const item=$(id);if(item)item.hidden=locked;}
  if(locked){activeTab="axis";lastFormation=null;}selectTab(activeTab);
 }
 function axisVerdict(x){
  if(!x.ready){
   const pre=x.pre, candidates=pre?.ready&&pre.structure!==null?(pre.candidates.length?pre.candidates:pre.rows.filter(h=>h.ar===1)):[];
   const compact=candidates.length?'<div class="a8preCandidates"><small>事前の軸候補（未確定）｜'+esc(pre.structure==="none"?"一致なし":pre.structure)+'</small>'+candidates.map(h=>'<div><strong>'+esc(h.no+"番 "+h.name)+'</strong><small>Ability '+esc(h.ar)+'位 ／ M3 '+esc(h.mr)+'位</small></div>').join("")+'</div>':"";
   return '<div class="a8verdict"><div class="a8verdictTop"><b>'+esc(x.status==="out"?"対象外":"判定保留")+'</b></div><p class="a8verdictMeta">'+esc(x.reason)+'</p>'+compact+'</div>';
  }
  if(x.tier==="C")return '<div class="a8verdict" data-tier="C"><div class="a8skipMark" aria-hidden="true">×</div><h3>C｜見送り</h3><p>このレースは分析対象外</p><p class="a8verdictReason">'+esc(x.reason)+'</p></div>';
  const labels={S:"高信頼",A:"分析対象",B:"条件付き"},str=x.structure==="none"?"一致なし":x.structure;
  const why=x.structure==="none"?"一致なし：Ability1位を採用":x.structure.includes("+")?"Ability・M3上位一致馬の中で最上位人気":"Ability・M3上位の単独一致馬を採用";
  const metric=(label,value)=>'<div><small>'+esc(label)+'</small><b>'+pct(value)+'</b></div>';
  return '<div class="a8verdict" data-tier="'+esc(x.tier)+'"><div class="a8verdictTop"><b>'+esc(x.tier+"｜"+labels[x.tier])+'</b><small>'+esc(str)+'構造</small></div><h3 class="a8heroHorse"><span aria-hidden="true">◎</span> '+esc(x.axis.no+"番 "+x.axis.name)+'</h3><p class="a8verdictMeta">'+esc(x.axis.pop+"番人気 ／ Ability "+x.axis.ar+"位 × M3 "+x.axis.mr+"位")+'</p><div class="a8heroProb"><small>較正3着内確率</small><strong>'+pct(x.calibrated[2])+'</strong><div class="a8heroTrack"><i style="width:'+(x.calibrated[2]*100).toFixed(1)+'%"></i></div></div><div class="a8heroOther">'+metric("勝率",x.calibrated[0])+metric("連対率",x.calibrated[1])+'</div><p class="a8verdictReason">採用理由：'+esc(why)+'</p><small class="a8muted">2026年固定の長期代理モデル較正。軸の個別推定値であり、全馬較正確率の整合性は未検証。</small></div>';
 }
 function ensure(){
  let el=$("axis8Primary");if(el)return el;
  const host=D.querySelector("main.view");if(!host)return null;
  el=D.createElement("section");el.id="axis8Primary";el.className="card";el.innerHTML='<h2>レース分析｜8構造</h2><div class="a8tabs" role="tablist" aria-label="レース分析"><button type="button" id="a8Tab-axis" role="tab" aria-controls="a8Panel-axis" aria-selected="true">軸</button><button type="button" id="a8Tab-partners" role="tab" aria-controls="a8Panel-partners" aria-selected="false" tabindex="-1">相手候補</button><button type="button" id="a8Tab-formation" role="tab" aria-controls="a8Panel-formation" aria-selected="false" tabindex="-1">展開隊列</button></div><section id="a8Panel-axis" role="tabpanel" aria-labelledby="a8Tab-axis"><label id="axis8ConfirmLabel" hidden><input type="checkbox" id="axis8Confirm"> CSVと確定馬番の一致を全頭確認済み</label><div id="axis8Result" aria-live="polite"></div><div id="axis8Pre" hidden></div><details id="a8AxisDetailFold" class="a8fold" hidden><summary>軸馬の詳細・位置取り</summary><div id="a8AxisDetails"></div></details><details id="a8ResearchFold" class="a8fold" hidden><summary>研究用モデル・末脚比較</summary><div id="a8FourModelCompare"></div><div id="a8ClosingCompare"></div></details><div id="a8RecordHost"></div></section><section id="a8Panel-partners" role="tabpanel" aria-labelledby="a8Tab-partners" hidden><p id="a8PartnerWait">全頭の単勝オッズ・確定馬番確認後に相手確率を表示します。</p><div id="axis8Controls" hidden><details><summary>馬連・ワイドオッズ（相手確率の精密比較用・任意）</summary><p>1行：軸番 相手番 馬連 ワイド下限 ワイド上限。全相手を入力。未入力時は単勝オッズから推定します。馬券購入判定には使いません。</p><textarea id="axis8Pairs" rows="4" placeholder="5 8 8.2 3.0 3.8"></textarea><button type="button" id="axis8Apply">相手オッズを反映</button></details><label>相手カバー目標 <select id="axis8Target"><option value=".65">65%</option><option value=".75" selected>75%</option><option value=".8">80%</option><option value=".9">90%</option></select></label> <label>並べ替え <select id="axis8Metric"><option value="w">ワイド相性</option><option value="q">馬連相性</option></select></label><div id="axis8Opp"></div></div></section><section id="a8Panel-formation" role="tabpanel" aria-labelledby="a8Tab-formation" hidden><h3>展開隊列</h3><p id="a8FormationWait">過去走CSVを解析すると隊列が表示されます。</p><div id="axis8Formation"><div class="a8stages" role="group" aria-label="予測地点"><button type="button" id="a8Stage1" aria-pressed="true">初角</button><button type="button" id="a8Stage3" aria-pressed="false">3コーナー</button><button type="button" id="a8Stage4" aria-pressed="false">4コーナー</button></div><div id="axis8FormationBody" aria-live="polite"></div></div><details id="axis8Analysis" hidden><summary>全頭の能力・展開・位置取り</summary><div id="axis8Field"></div></details></section>';
  host.appendChild(el);selectTab(activeTab);
  el.addEventListener("click",e=>{const id=e.target?.id||"";if(id.startsWith("a8Tab-"))selectTab(id.slice(6));if(["a8Stage1","a8Stage3","a8Stage4"].includes(id)){stage=id.slice(-1);if(lastFormation)paintFormation(lastFormation);else syncStages();}});
  el.addEventListener("keydown",e=>{const key=e.target?.id?.slice(6);if(!tabs.includes(key)||!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const i=tabs.indexOf(key),next=e.key==="Home"?tabs[0]:e.key==="End"?tabs.at(-1):tabs[(i+(e.key==="ArrowRight"?1:tabs.length-1))%tabs.length];selectTab(next);$("a8Tab-"+next)?.focus?.();});
  el.addEventListener("change",e=>{if(e.target.id==="axis8Confirm"){confirmed=e.target.checked;render(true);}if(e.target.id==="axis8Target"){target=+e.target.value;render(true);}if(e.target.id==="axis8Metric"){metric=e.target.value;render(true);}});
  $("axis8Apply").addEventListener("click",()=>{pairText=$("axis8Pairs").value;render(true);});
  return el;
 }
 function readInput(){
  if(dirty||!started||root.RSAAnalysisTransitionState?.status!=="ready")return {ready:false,status:"hold",reason:"レース条件・過去走を入力して解析してください"};
  const a=root.M3PureAbilityState,f=root.Finish600State;
  if(!a?.ready||!f?.ready||Number(a.at)<started||Number(f.at)<started||!Number.isFinite(Number(a.at))||!Number.isFinite(Number(f.at)))return {ready:false,status:"hold",reason:"今回のAbility・M3計算を待っています"};
  if(!/^\d{4}-\d{2}-\d{2}$/.test($("raceDate")?.value||"")||!$("venue")?.value)return {ready:false,status:"hold",reason:"日付・競馬場を確認"};
  // Scope is independently enforced in the new core; legacy axis lock is not authoritative.
  return {input:{grade:$("grade")?.value,field:Number($("fieldSize")?.value),surface:$("surface")?.value,name:$("raceName")?.value,ability:a,finish:f,odds:$("oddsPaste")?.value}};
 }
 function read(){
  const state=readInput();if(!state.input)return state;
  const pre=C.preliminary(state.input);
  if(!pre.ready)return pre;
  if(!confirmed)return {ready:false,status:"hold",reason:"確定馬番を照合すると最終判定できます",pre};
  return {...C.compute(state.input),pre};
 }
 // Read-only research bridge. Does not change axis, tier, or partner logic.
 function getAbilityComparison(){
  const state=readInput();if(!state.input)return {ready:false,reason:state.reason};
  const pre=C.preliminary(state.input);if(!pre.ready)return {ready:false,reason:pre.reason};
  const generation=root.RSAAnalysisTransitionState?.generation;
  const form=C.formation({ready:true,rows:pre.rows,axis:null},[],root.ValidatedQueueState,root.PositionRiskState,root.MobileAnalysisCoreState,root.RSAAnalysisTransitionState,started);
  // parseOdds is internal to C; obtain the validated market rows only through compute.
  const x=confirmed?C.compute(state.input):null;if(x?.ready&&x.tier==="C")return {ready:false,reason:"見送り：能力比較を非表示"};const m=x?.ready?C.pl(x.rows):null;
  const byNo=m?Object.fromEntries(x.rows.map((h,i)=>[h.no,m.three[i]])):{};
  const meta=Object.fromEntries(["raceDate","venue","raceName","grade","surface","distance","going","fieldSize"].map(id=>[id,String($(id)?.value||"")]));
  return {ready:true,confirmed,generation,started,meta,activeModel:state.input.ability.activeModel,axisNo:x?.ready?x.axis.no:null,marketReady:!!m,rows:pre.rows.map(h=>{const d=C.horseDetail(h,pre.rows.length,state.input.finish,root.PositionRiskState,form,generation,started);return {no:h.no,name:h.name,ar:h.ar,mr:h.mr,m4:d.m4,m4Range:d.m4Range,market3:byNo[h.no]??null};})};
 }
 root.RSAAxis8ComparisonV1=Object.freeze({getComparison:getAbilityComparison});
 function publishSnapshot(next){
  snapshot=next;const sig=JSON.stringify(next);
  if(sig===snapshotSig)return;
  snapshotSig=sig;
  root.dispatchEvent(new root.CustomEvent("axis8-snapshot-changed"));
 }
 function currentSnapshot(){
  if(!snapshot||dirty||!confirmed||root.RSAAnalysisTransitionState?.status!=="ready"||snapshot.generation!==root.RSAAnalysisTransitionState?.generation||snapshot.winInput!==String($("oddsPaste")?.value||"")||pairText!==String($("axis8Pairs")?.value||""))return null;
  if(Object.entries(snapshot.meta).some(([id,value])=>String($(id)?.value||"")!==value))return null;
  return JSON.parse(JSON.stringify(snapshot));
 }
 root.RSAAxis8SnapshotV1=Object.freeze({getSnapshot:currentSnapshot,diagnostics:()=>({renderCount,pendingTimer:Boolean(timer),ready:Boolean(currentSnapshot())})});
 function render(force=false){
  if(!ensure())return;$("axis8ConfirmLabel").hidden=dirty||!started||root.RSAAnalysisTransitionState?.status!=="ready";$("axis8Confirm").checked=confirmed;const x=read();latest=x;
  const key=x.ready?JSON.stringify([started,x.axis.no,x.rows.map(h=>[h.no,h.name,h.od])]):"";
  if(key!==pairKey){pairKey=key;pairText="";$("axis8Pairs").value="";}
  const sig=JSON.stringify([x,confirmed,target,metric,pairText,root.Finish600State?.at,root.PositionRiskState?.at,root.ValidatedQueueState?.at,root.MobileAnalysisCoreState?.at,root.RSAAnalysisTransitionState?.generation,Boolean(root.RSAForecastWorkflowCoreV1),root.RaceCorner34V1?.modelStatus?.(),root.RSAClosingShadowV1?.status?.(),root.M3PureAbilityState?.at]);if(!force&&signature===sig&&(!x.ready||x.tier==="C"||snapshot))return;signature=sig;renderCount++;root.RSAAxis8PrimaryState={...x,at:Date.now(),ticketDecision:false};root.dispatchEvent(new root.CustomEvent("axis8-comparison-changed"));
  const skipped=x.ready&&x.tier==="C";setAnalysisLock(skipped||x.status==="out");$("a8PartnerWait").hidden=x.ready;$("a8FormationWait").hidden=x.ready||!!x.pre?.ready;$("axis8Controls").hidden=!x.ready||skipped;$("axis8Pre").hidden=true;$("a8AxisDetailFold").hidden=skipped||x.status==="out"||(!x.ready&&!x.pre?.ready);$("a8ResearchFold").hidden=skipped||x.status==="out"||(!x.ready&&!x.pre?.ready);$("axis8Analysis").hidden=skipped||(!x.ready&&!x.pre?.ready);$("axis8Result").innerHTML=axisVerdict(x);
  if(skipped||x.status==="out"){for(const id of ["axis8Opp","axis8Pre","a8AxisDetails","a8ClosingCompare","a8FourModelCompare","axis8Field","axis8FormationBody"])$(id).textContent="";publishSnapshot(null);return;}
  if(!x.ready){
   $("axis8Opp").textContent="";$("a8AxisDetails").textContent="";$("a8ClosingCompare").innerHTML="";$("a8FourModelCompare").innerHTML="";publishSnapshot(null);
   if(!x.pre?.ready){lastFormation=null;$("axis8Pre").textContent="";$("axis8Field").textContent="";$("axis8FormationBody").textContent="";return;}
   const pre=x.pre,possibles=pre.structure===null?[]:pre.candidates.length?pre.candidates:pre.rows.filter(h=>h.ar===1);
   $("axis8Pre").textContent="";
   const form=withCorners(C.formation({ready:true,rows:pre.rows,axis:null},[],root.ValidatedQueueState,root.PositionRiskState,root.MobileAnalysisCoreState,root.RSAAnalysisTransitionState,started),pre.rows);
   paintPatterns(form.patterns);paintClosing(pre.rows,form.closing);paintFormation(form);paintField(pre.rows,form);$("a8AxisDetails").innerHTML=possibles.map(h=>horseCard(h,horseInfo(h,pre.rows.length,form),"事前の軸候補",true,false)).join("");return;
  }
  $("axis8Pre").textContent="";
  const d=C.direct(pairText,x),rows=C.coverage(d||x.others,target,metric),sel=rows.filter(h=>h.selected);
  const label=d?"馬連・ワイドの実オッズから推定（券種別モデル）":"単勝オッズから推定（参考値・75%方式の検証とは異なる入力）";
  const formation=withCorners(C.formation(x,sel,root.ValidatedQueueState,root.PositionRiskState,root.MobileAnalysisCoreState,root.RSAAnalysisTransitionState,started),x.rows);
  paintPatterns(formation.patterns);paintClosing(x.rows,formation.closing);
  const opened=new Map(Array.from($("axis8Opp").querySelectorAll?.("details[data-a8-horse]")||[]).map(el=>[el.getAttribute("data-a8-horse"),el.open]));
  const refOpen=$("a8OtherHorses")?.open===true;
  const oppCard=(h,i)=>horseCard(h,horseInfo(h,x.rows.length,formation),h.selected?"相手候補 "+(i+1):"参考馬",opened.has(h.no)?opened.get(h.no):false,true);
  $("axis8Opp").innerHTML='<div class="a8summary"><b>相手候補 '+sel.length+'頭</b><strong>'+pct(sel.at(-1)?.coverage)+'</strong><small>'+(metric==="w"?"ワイド":"馬連")+'相手カバー率</small></div><p class="a8muted">'+esc(label)+(pairText&&!d?" ／ 入力不完全・不整合":"")+'</p>'+sel.map(oppCard).join("")+(rows.length>sel.length?'<details id="a8OtherHorses"'+(refOpen?' open':'')+'><summary>参考馬 '+(rows.length-sel.length)+'頭</summary>'+rows.slice(sel.length).map(oppCard).join("")+'</details>':'')+'<small>相手カバー率は、軸が好走した場合に相手候補が占める予測割合です。ワイドは残り2枠の期待カバー割合、馬連は残り1枠の予測割合です。馬券の的中率ではありません。</small>';
  $("a8AxisDetails").innerHTML=horseCard(x.axis,horseInfo(x.axis,x.rows.length,formation),"軸馬の詳細",true,false);
  paintFormation(formation);
  const meta=Object.fromEntries(["raceDate","venue","raceName","grade","surface","distance","going","fieldSize"].map(id=>[id,String($(id)?.value||"")]));
  const recordFormation=formation.ready?{pace:formation.pace,pressure:formation.pressure,rows:formation.roster.map(h=>{const q=formation.byNo[h.no];return {no:h.no,name:h.name,expectedRank:q.expectedRank,laneIdx:q.laneIdx,frontness:Number.isFinite(q.frontness5)?q.frontness5:null,pursuit:q.pursuitGrade||null};}),axisP10:formation.p10}:null;
  publishSnapshot({version:C.V,generation:root.RSAAnalysisTransitionState?.generation,meta,structure:x.structure,tier:x.tier,reason:x.reason,axis:{...x.axis},calibrated:x.calibrated.slice(),target,metric,source:d?"direct_cond":"win_PL_reference",coverage:sel.at(-1)?.coverage??0,partners:rows.map(h=>({no:h.no,name:h.name,selected:h.selected,q:h.q,w:h.w,coverage:h.coverage})),roster:x.rows.map(h=>({...h})),formation:recordFormation,fourModelPattern:formation.patterns?{version:formation.patterns.version,ready:formation.patterns.ready,reason:formation.patterns.reason,scope:formation.patterns.scope,closingVersion:formation.patterns.closingVersion,field:formation.patterns.field,rows:formation.patterns.rows}:null,closingShadow:formation.closing?.ready?{version:formation.closing.version,cutoff:formation.closing.cutoff,eligible:formation.closing.eligible,field:formation.closing.field,rows:formation.closing.rows.map(h=>({no:h.no,name:h.name,baseRank:h.baseRank??null,shadowRank:h.shadowRank??null,loadRank:h.loadRank??null,baseScore:h.baseScore,shadowScore:h.shadowScore,load:h.load,condition:h.condition,sd:h.sd,count:h.count,unknownCourses:h.unknownCourses,history:h.history}))}:null,winInput:String($("oddsPaste")?.value||""),pairInput:pairText,numberMappingConfirmed:true});

  paintField(x.rows,formation);
 }
 function withCorners(m,roster){let closing;try{closing=root.RSAClosingShadowV1?.read(roster,{date:$("raceDate")?.value,surface:$("surface")?.value,distance:$("distance")?.value})||{ready:false,reason:"参考モデル読込待ち"};}catch(e){closing={ready:false,reason:"参考モデル計算エラー"};}let patterns;try{patterns=root.RSAFourModelPatternV1?.compute(roster,root.M3PureAbilityState,closing,{grade:$("grade")?.value,started});}catch(e){patterns=null;}return {...m,closing,patterns,corners:C.cornerProjection(m,root.RaceCorner34V1,{venue:$("venue")?.value,surface:$("surface")?.value,distance:Number($("distance")?.value)})};}
 function horseInfo(h,field,form){return {...C.horseDetail(h,field,root.Finish600State,root.PositionRiskState,form,root.RSAAnalysisTransitionState?.generation,started),corners:form.corners?.byNo?.[h.no]||null,closing:form.closing?.byNo?.[h.no]||null,closingField:form.closing?.eligible||0,closingReason:form.closing?.reason||"",closingFull:form.closing?.eligible===field,pattern:form.patterns?.byNo?.[h.no]||null,patternReason:form.patterns?.reason||""};}
 function horseCard(h,d,label,open,conditional){
  const ord=v=>v==null?"—":v+"位",pc=v=>v==null?"—":pct(v),fact=(l,v)=>'<div class="a8fact"><small>'+esc(l)+'</small><b>'+esc(v)+'</b></div>';
  const paceLabels=["強前傾","前傾","標準","スロー"];
  const market=d.pop==null||d.odds==null?"人気・オッズ未確定":d.pop+"番人気・単勝 "+d.odds.toFixed(1)+"倍";
  const affinity=(label,value,note,kind)=>'<div class="a8fact a8affinity" data-kind="'+kind+'"><small>'+esc(label)+'</small><b>'+pc(value)+'</b>'+(Number.isFinite(value)?'<div class="a8affinityTrack"><i style="width:'+Math.max(0,Math.min(100,value*100)).toFixed(1)+'%"></i></div>':'')+'<small class="a8affinityNote">'+esc(note)+'</small></div>';
  const probs=conditional?'<div class="a8horseProbs">'+affinity("ワイド相性",h.w,"軸が3着以内のとき、この馬も3着以内","w")+affinity("馬連相性",h.q,"軸が2着以内のとき、この馬も2着以内","q")+'</div>':"";
  const title='<div class="a8horseHead"><span class="a8horseNo">'+esc(h.no)+'</span><div><small>'+esc(label)+'</small><strong>'+esc(h.name)+'</strong><small>'+esc(market)+'</small></div></div>';
  const body='<div class="a8horseBody"><div class="a8subhead">能力・展開適性</div><div class="a8facts">'+fact("Ability",ord(d.ability))+fact("M3",ord(d.m3))+fact("M4本線",ord(d.m4))+'</div><div class="a8detailLine"><span>M4全展開の順位範囲</span><b>'+esc(d.m4Range?d.m4Range.join("〜")+"位":"—")+'</b></div>'+(d.m4Sc?'<div class="a8scenario">'+d.m4Sc.map((v,i)=>fact(paceLabels[i],ord(v))).join("")+'</div>':'')+'<div class="a8subhead">位置取り・展開リスク</div><div class="a8facts">'+fact("P10",pc(d.p10))+fact("初角予測",d.position==null?"—":d.position.toFixed(1)+"番手")+fact("予測進路",d.lane??"—")+'</div>'+cornerLine(d.position,d.corners)+'<div class="a8detailLine"><span>先行力（参考指標）</span><b>'+pc(d.front)+'</b></div>'+(d.front==null?"":'<div class="a8frontBar"><span style="width:'+(d.front*100).toFixed(1)+'%"></span></div>')+'<div class="a8detailLine"><span>追走力</span><b>'+esc(d.pursuit??"—")+'</b></div></div>';
  return '<article class="a8horse'+(conditional&&h.selected?' a8horseLeading':'')+'">'+title+probs+(conditional?'<div class="a8rankLine">'+fact("Ability",ord(d.ability))+fact("M3",ord(d.m3))+fact("M4",ord(d.m4))+'</div>':"")+'<details data-a8-horse="'+esc(h.no)+'"'+(open?' open':'')+'><summary>能力・位置取りの詳細</summary>'+body+'<details class="a8researchHorse"><summary>研究用の能力・末脚比較</summary>'+patternCard(d.pattern,d.patternReason)+closingCard(d)+'</details></details></article>';
 }
 function patternRanks(h){const rank=v=>Number.isInteger(v)?v+"位":"—";return '<div class="a8patternRanks">'+["V1","C","基準M3","改良M3"].map((label,i)=>'<div'+(h.ranks[i]!=null&&h.ranks[i]<=3?' class="a8patternTop"':'')+'><small>'+label+'</small><b>'+esc(rank(h.ranks[i]))+'</b></div>').join("")+'</div>';}
 function patternCard(h,reason){if(!h)return "";const change=v=>v==null?"—":(v>0?"+":"")+v+"位";return '<div class="a8patternCard">'+patternRanks(h)+'<div class="a8patternLabel"><b>'+esc(h.label||"構造分類保留")+'</b>'+(h.code?'<small>Ability '+esc(change(h.abilityDelta))+' ／ 末脚 '+esc(change(h.closingDelta))+'</small>':'<small>'+esc(reason)+'</small>')+'</div><small class="a8muted">参考分類・確率や選定には反映しません</small></div>';}
 function paintPatterns(p){
  const el=$("a8FourModelCompare");if(!el)return;if(!p){el.innerHTML='<p class="a8muted">4モデル比較：読込待ち</p>';return;}
  const open=el.querySelector?.("details")?.open===true,rank=v=>Number.isInteger(v)?v+"位":"—",rows=p.rows.slice().sort((a,b)=>Number(a.no)-Number(b.no));
  el.innerHTML='<details class="a8closing"'+(open?' open':'')+'><summary>4モデル能力比較・16構造（参考）</summary><p class="a8muted">V1／Cは本番Ability。基準・改良M3は固定の研究用代理モデル（本番M3とは別）。TOP3＝各モデル3位以内。'+esc(p.ready?"全頭分類済み。":p.reason)+'</p><div class="a8patternTable"><div><small>馬番・馬名</small><small>V1</small><small>C</small><small>基準M3</small><small>改良M3</small></div>'+rows.map(h=>'<section><div><span>'+esc(h.no+" "+h.name)+'</span>'+h.ranks.map(v=>'<b'+(v!=null&&v<=3?' class="a8patternTop"':'')+'>'+esc(rank(v))+'</b>').join("")+'</div><small>'+esc(h.label||"分類保留")+(h.code?' ｜ '+esc(h.code):'')+'</small></section>').join("")+'</div><small>基準M3→改良M3とV1→Cの差を観察。好走率・期待値の保証なし。</small></details>';
 }
 function closingCard(d){
 const h=d.closing,fmt=v=>Number.isFinite(v)?(v>0?"+":"")+v.toFixed(2)+"秒":"—",rank=v=>Number.isFinite(v)?v+"位／"+d.closingField+"頭":"—",fact=(l,v)=>'<div class="a8fact"><small>'+esc(l)+'</small><b>'+esc(v)+'</b></div>';
 if(!h?.count)return '<div class="a8horseBody"><div class="a8subhead">末脚能力｜参考</div><p class="a8muted">'+esc(d.closingReason||"条件に合う上位クラス・同馬場の有効履歴なし")+'</p></div>';
 const delta=d.closingFull&&Number.isFinite(d.m3)?d.m3-h.shadowRank:null,dp=h.baseRank-h.shadowRank,change=v=>v===0?"同順位":(v>0?"+":"")+v+"位（"+(v>0?"上昇":"下降")+"）";
 const bars=h.history.slice().reverse().map(v=>'<div class="a8closingHistRow"><small>'+esc(String(v.date).slice(0,4)+"/"+String(v.date).slice(4,6)+"/"+String(v.date).slice(6,8)+" "+v.venue+v.dist)+'</small><div class="a8closingTrack"><i style="left:'+ (v.load>=0?50:50-Math.min(50,Math.abs(v.load)*12.5))+'%;width:'+Math.min(50,Math.abs(v.load)*12.5)+'%;background:'+(v.load>=0?"#0c968b":"#b98663")+'"></i></div><b>'+esc(fmt(v.load))+'</b></div>').join("");
 return '<div class="a8horseBody a8closing"><div class="a8subhead">末脚能力｜検証用・参考</div><div class="a8facts">'+fact("本番M3",d.m3==null?"—":d.m3+"位")+fact("参考基準M3",rank(h.baseRank))+fact("改良参考M3",rank(h.shadowRank))+'</div><div class="a8detailLine"><span>本番との順位差</span><b>'+esc(delta==null?"全頭比較不可":change(delta))+'</b></div><div class="a8detailLine"><span>参考モデル内の順位差</span><b>'+esc(change(dp))+'</b></div><div class="a8facts">'+fact("条件補正",fmt(h.condition))+fact("負荷補正",fmt(h.load))+fact("負荷補正順位",rank(h.loadRank))+'</div><div class="a8detailLine"><span>有効な同馬場履歴</span><b>'+h.count+'走／最大10走</b></div><div class="a8detailLine"><span>負荷補正の標準偏差</span><b>'+esc(h.sd==null?"—（1走）":h.sd.toFixed(2)+"秒")+'</b></div>'+(h.unknownCourses?'<small>未学習コース '+h.unknownCourses+'走（コース効果なしで概算）</small>':'')+'<details><summary>過去走の負荷補正指数</summary>'+bars+'<small>中央が0、左右各4秒で表示上限。数値は実際の指数。</small></details><small class="a8muted">上がり順位・負荷補正の代理モデル。順位差は確認のきっかけであり、好走確率・軸・相手選定には反映しません。</small></div>';
}
 function paintClosing(roster,result){
 const el=$("a8ClosingCompare");if(!el)return;
 if(!result?.ready){el.innerHTML='<details><summary>末脚評価の食い違い（参考）</summary><p>'+esc(result?.reason||"計算待ち")+'</p></details>';return;}
 const opened=el.querySelector?.("details")?.open===true,full=result.eligible===roster.length,rows=roster.map(h=>({h,c:result.byNo[h.no]})).sort((a,b)=>{const k=z=>z.c?.count?(full?Math.abs(z.h.mr-z.c.shadowRank):Math.abs(z.c.baseRank-z.c.shadowRank)):-1;return k(b)-k(a)||Number(a.h.no)-Number(b.h.no);});
 const rank=v=>Number.isFinite(v)?v+"位":"—",delta=v=>Number.isFinite(v)?(v>0?"+":"")+v:"—";
 el.innerHTML='<details class="a8closing"'+(opened?' open':'')+'><summary>末脚評価の食い違い（参考）｜'+result.eligible+'／'+roster.length+'頭</summary><p class="a8muted">'+(full?"本番M3との順位差が大きい順。":"有効履歴馬内の参考順位差が大きい順。本番順位との直接比較はしません。")+' 順位差は参考であり、購入判断への加点なし。</p><div class="a8closingTable"><div><small>馬番・馬名</small><small>本番</small><small>基準</small><small>改良</small><small>順位差</small></div>'+rows.map(({h,c})=>'<div><span>'+esc(h.no+" "+h.name)+'</span><b>'+esc(rank(h.mr))+'</b><b>'+esc(rank(c?.baseRank))+'</b><b>'+esc(rank(c?.shadowRank))+'</b><b>'+esc(delta(c?.count?(full?h.mr-c.shadowRank:c.baseRank-c.shadowRank):null))+'</b></div>').join("")+'</div><small>基準＝長期検証用の代理M3、改良＝上がり順位・負荷補正追加。差はプラスが上昇。学習終了 2026/10/04。</small></details>';
}
 function cornerLine(initial,c){const rank=v=>Number.isFinite(v)?v.toFixed(1):"—";return '<div class="a8detailLine"><span>位置取り推移（予測）</span><b>'+rank(initial)+' → '+rank(c?.three)+' → '+rank(c?.four)+'</b></div><small>初角 → 3角 → 4角'+(c?.range?' ／ 4角参考幅 '+c.range.join("〜")+'番手':'')+'</small>';}
 function paintField(rows,formation){
  const p=root.PositionRiskState?.ready&&Number(root.PositionRiskState?.at)>=started?Object.fromEntries(rows.filter(h=>String(root.PositionRiskState?.byNo?.[h.no]?.name??"").normalize("NFKC").trim()===h.name).map(h=>[h.no,root.PositionRiskState.byNo[h.no]])):{},q=formation.ready?formation.byNo:{};
  const f=new Map((root.Finish600State?.rows||[]).map(h=>[String(h.no),h]));
  const pace=root.MobileAnalysisCoreState?.analysis?.pred?.p,band=Array.isArray(pace)&&pace.length===4&&pace.every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0)&&pace.some(v=>v>0)?pace.indexOf(Math.max(...pace)):-1;
  $("axis8Field").innerHTML=rows.map(h=>{
   const fr=f.get(String(h.no)),sc=String(fr?.name??"").normalize("NFKC").trim()===h.name&&Array.isArray(fr?.sc)?fr.sc.map(v=>v?.rank):[];
   const m4=sc.length===4&&sc.every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=1&&v<=rows.length);
   const m4text=m4?(band>=0?"M4本線 "+sc[band]+"位 / ":"")+"M4各展開 "+sc.join("・")+"位":"M4 —";
   return '<div class="a8row"><span>'+esc(h.no+"番 "+h.name)+'</span><small>'+esc("Ability "+h.ar+" / M3 "+h.mr+(h.pop?" / 人気 "+h.pop:"")+" / "+m4text)+" / P10 "+pct(Number.isFinite(Number(p[h.no]?.p10))&&p[h.no]?.p10!=null?Number(p[h.no].p10):NaN)+" / 初角 "+esc(q[h.no]?.expectedRank??"—")+'</small></div>';
  }).join("");
 }
 function syncStages(){for(const k of ["1","3","4"]){const b=$("a8Stage"+k);if(b)b.setAttribute?.("aria-pressed",String(stage===k));}}
 function paintFormation(m){
 lastFormation=m;syncStages();
 const el=$("axis8FormationBody"),f=root.RSAForecastWorkflowCoreV1;
 if(!m.ready||!f?.turnForVenue){el.textContent=m.reason||"隊列モデルを読込中";return;}
 const turn=f.turnForVenue($("venue")?.value,$("surface")?.value,$("distance")?.value,"");
 if(!turn){el.textContent="競馬場・回り方向を確認してください";return;}
 const plot=stage==="1"?C.verticalFormation(m):C.lateFormation(m,stage),labels=["強前傾","前傾","標準","スロー"];
 const pace=m.pace?labels.map((label,i)=>'<span class="'+(m.pace[i]===Math.max(...m.pace)?"a8paceMain":"")+'"><small>'+label+'</small><b>'+pct(m.pace[i])+'</b></span>').join(""):"展開確率待ち";
 const risk=m.axis?f.riskFor(m.byNo[m.axis],m.roster.length,m.pressure):"";
 const list=m.roster.slice().sort((a,b)=>(m.byNo[a.no].expectedRank??Infinity)-(m.byNo[b.no].expectedRank??Infinity)||Number(a.no)-Number(b.no)).map(h=>{
 const q=m.byNo[h.no];return '<div class="a8row"><span>'+esc(h.no+"番 "+h.name)+'</span><small>'+esc(q.expectedRank==null?"位置未確定":q.expectedRank.toFixed(1)+"番手")+' ／ '+esc(q.expectedRank!=null&&q.laneIdx!=null?q.lane:"—")+' ／ 先行力 '+pct(q.frontness5)+' ／ 追走 '+esc(q.pursuitGrade||"—")+'</small></div>'+cornerLine(q.expectedRank,m.corners?.byNo?.[h.no]);}).join("");
 const notice=(!confirmed?"仮馬番・参考":!m.axis?"軸未確定・参考":m.referenceOnly?"C判定・参考":"")+(stage==="1"?" 初角予測｜上が先頭・左が内":" "+stage+"角予測｜上が先頭・内外不明");
 const map=stage!=="1"&&!m.corners?.ready?'<p>'+esc(m.corners?.reason||"3・4角予測待ち")+'</p>':stage!=="1"&&!plot.known.length?'<p>3・4角の過去走履歴が不足しています。</p>':plot.svg;
 const legend=m.axis?'<div class="a8legend"><span><i style="background:#7358c5"></i>軸</span><span><i style="background:#0c968b"></i>相手 '+m.partners.length+'頭</span><span><i style="background:#ebf3ed"></i>その他</span></div>':"";
 const unknown=(stage==="1"||m.corners?.ready)&&plot.unknown.length?'<p class="a8muted">位置未確定：'+plot.unknown.map(h=>esc(h.no+"番 "+h.name)).join("、")+'</p>':"";
 const range=stage==="4"&&m.corners?.ready?'<p class="a8muted">参考幅：過去検証の誤差80%点に基づく目安。個別馬の保証区間ではありません。'+(Number.isFinite(m.corners.validation?.mae4)?' 16頭換算平均誤差 約'+(15*m.corners.validation.mae4).toFixed(1)+'番手。':'')+'</p>':"";
 const axis=m.axis?'<div class="a8horse">'+cornerLine(m.axisRank,m.corners?.byNo?.[m.axis])+'</div><details><summary>軸の展開リスク</summary><p>P10 '+pct(m.p10)+' ／ 先行力 '+pct(m.frontness)+' ／ 追走 '+esc(m.pursuit||"—")+'</p><p>'+esc(risk)+'</p></details>':"";
 el.innerHTML='<div class="a8formationHead"><b>'+esc(turn==="left"?"左回り":turn==="right"?"右回り":"直線")+'・'+m.roster.length+'頭</b><span>先行圧 '+esc(m.pressure||"—")+'</span></div><div class="a8pace">'+pace+'</div><p class="a8muted">'+esc(notice)+'</p><div class="a8map">'+map+'</div>'+legend+unknown+range+axis+'<details><summary>全頭の位置取り推移・初角進路・先行力</summary>'+list+'</details><small class="a8muted">予測番手順の模式図。間隔は実距離ではありません。</small>';
}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>{timer=0;render();},100);}
 function invalidate(){for(const id of ["a8AxisDetailFold","a8ResearchFold"]){const el=$(id);if(el)el.open=false;}const pc=$("a8FourModelCompare");if(pc)pc.innerHTML="";const cc=$("a8ClosingCompare");if(cc)cc.innerHTML="";selectTab("axis");stage="1";lastFormation=null;syncStages();dirty=true;started=0;confirmed=false;pairText="";pairKey="";root.RSAAxis8PrimaryState={ready:false,status:"hold",reason:"入力変更・再解析待ち",at:Date.now(),ticketDecision:false};publishSnapshot(null);const el=$("axis8FormationBody");if(el)el.textContent="";schedule();}
 const inputs=["raceDate","venue","surface","distance","grade","going","fieldSize","raceName","csvFile"];
 D.addEventListener("input",e=>{if(inputs.includes(e.target.id))invalidate();if(e.target.id==="oddsPaste"){publishSnapshot(null);schedule();}if(e.target.id==="axis8Pairs")root.dispatchEvent(new root.CustomEvent("axis8-snapshot-changed"));},true);
 D.addEventListener("change",e=>{if(inputs.includes(e.target.id))invalidate();},true);
 D.addEventListener("click",e=>{if(e.target.id==="analyzeBtn"){dirty=false;confirmed=false;started=Date.now();publishSnapshot(null);schedule();}if(["applyOddsBtn","clearOddsBtn"].includes(e.target.id)){publishSnapshot(null);schedule();}if(e.target.id==="clearCsvBtn")invalidate();},true);
 root.addEventListener("rsa-analysis-start",()=>{const pc=$("a8FourModelCompare");if(pc)pc.innerHTML="";const cc=$("a8ClosingCompare");if(cc)cc.innerHTML="";stage="1";lastFormation=null;syncStages();dirty=false;confirmed=false;root.RSAAxis8PrimaryState={ready:false,status:"hold",reason:"解析中",at:Date.now(),ticketDecision:false};publishSnapshot(null);started=Number(root.RSAAnalysisTransitionState?.startedWall)||Date.now();const el=$("axis8FormationBody");if(el)el.textContent="";schedule();});
 for(const e of ["rsa-analysis-complete","rsa-analysis-error","m3-pure-ability-ready","finish600-ready","position-risk-ready","validated-queue-ready","decision-shell-v2-ready","mobile-analysis-core-ready","mobile-race-map-pace-ready","rsa-addons-ready","axis8-corner-model-settled","closing-shadow-ready"])root.addEventListener(e,schedule);
 if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
})(root,C);
})(typeof window!=='undefined'?window:globalThis);
