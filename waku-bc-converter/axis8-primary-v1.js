/* Phase 3/5 axis8 replacement candidate. No ticket selection. */
(function(root){'use strict';
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
 function compute({grade,field,surface,name,ability,finish,odds}){
  if(!grades.includes(grade)||!Number.isInteger(field)||field<12||field>18||!["芝","ダ","ダート"].includes(surface)||/障害|ジャンプ|J[- ]?G[123]/i.test(name||""))return bad("平地3勝以上・12〜18頭の対象条件外","out");
  if(!ability?.ready||!finish?.ready||!Array.isArray(ability.rows)||!Array.isArray(finish.rows))return bad("Ability・M3の計算待ち");
  if(/^G[123]$/.test(grade)?ability.activeModel!=="C":String(ability.activeModel).toLowerCase()!=="v1")return bad("対象クラスのAbilityモデルが未確定");
  if(ability.leaderAmbiguous||finish.m3Top3BoundaryAmbiguous||ability.rows.some(h=>n(h.abilityTieStart)<=3&&n(h.abilityTieEnd)>n(h.abilityTieStart)))return bad("上位順位の同点：構造判定保留");
  const map=new Map(finish.rows.map(h=>[String(+h.no),h])),rows=ability.rows.map(h=>{const no=String(+h.no),f=map.get(no);return {no,name:norm(h.name),ar:n(h.abilityRank),mr:n(f?.finishRank),matched:!!f&&norm(f.name)===norm(h.name)};});
  if(rows.length!==field||map.size!==field||finish.rows.length!==field||new Set(rows.map(h=>h.no)).size!==field||rows.some(h=>!h.matched||!h.name||!Number.isInteger(+h.no)||+h.no<1||+h.no>18||!Number.isInteger(h.ar)||!Number.isInteger(h.mr)||h.ar<1||h.mr<1||h.ar>field||h.mr>field))return bad("全頭の馬番・馬名・順位の照合待ち");
  for(const k of ["ar","mr"])for(let i=1;i<=3;i++)if(rows.filter(h=>h[k]===i).length!==1)return bad("Top3順位が一意でないため保留");
  const candidates=rows.filter(h=>h.ar<=3&&h.mr<=3).sort((a,b)=>a.ar-b.ar),structure=candidates.length?candidates.map(h=>"A"+h.ar).join("+"):"none";
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
 const axis=String(model.axis.no),partners=selected.map(h=>String(h.no));
 if(!roster.some(h=>h.no===axis)||new Set(partners).size!==partners.length||partners.some(no=>no===axis||!m.has(no)))return bad("軸・相手候補の照合待ち");
 const byNo=Object.fromEntries(roster.map(h=>{const q=m.get(h.no),rank=N(q.expectedRank),lane=N(q.laneIdx);return [h.no,{...q,expectedRank:q.validated===true&&rank>=1&&rank<=roster.length?rank:null,laneIdx:Number.isInteger(lane)&&lane>=0&&lane<=3?lane:null}];}));
 const a=core.analysis||{},raw=a.pred?.p;
 const total=Array.isArray(raw)&&raw.length===4&&raw.every(v=>Number.isFinite(N(v))&&N(v)>=0)?raw.reduce((s,v)=>s+N(v),0):0;
 const pace=total>0?raw.map(v=>N(v)/total):null;
 const ar=byNo[axis],rr=risk?.byNo?.[axis],p10=risk?.ready&&N(risk.at)>=started&&norm(rr?.name)===norm(model.axis.name)?N(rr.p10):NaN;
 return {ready:true,generation:transition.generation,roster,byNo,axis,partners,pace,pressure:String(a.pressure||""),axisRank:ar.expectedRank,frontness:N(ar.frontness5),pursuit:String(ar.pursuitGrade||""),p10:p10>=0&&p10<=1?p10:null,referenceOnly:model.tier==="C"};
}
 return {V,compute,pl,cal,rank,direct,coverage,formation};
})();root.RSAAxis8Core=C;
(function ui(root,C){
 if(!root.document)return;
 const D=root.document,$=id=>D.getElementById(id),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),pct=x=>Number.isFinite(x)?(x*100).toFixed(1)+"%":"—";
 let dirty=true,started=0,timer=0,signature="",target=.75,metric="w",pairText="",pairKey="",latest=null,confirmed=false;
 function ensure(){
  let el=$("axis8Primary");if(el)return el;
  const host=D.querySelector("main.view");if(!host)return null;
  el=D.createElement("section");el.id="axis8Primary";el.className="card";el.innerHTML='<h2>新・レース判定｜8構造</h2><label id="axis8ConfirmLabel" hidden><input type="checkbox" id="axis8Confirm"> CSVの馬番と確定馬番の対応を全頭確認した</label><div id="axis8Result" aria-live="polite"></div><div id="axis8Controls" hidden><details><summary>馬連・ワイドオッズ（相手確率の精密比較用・任意）</summary><p>1行：軸番 相手番 馬連 ワイド下限 ワイド上限。全相手を入力。未入力は単勝PL参考値。馬券購入判定には使いません。</p><textarea id="axis8Pairs" rows="4" placeholder="5 8 8.2 3.0 3.8"></textarea><button type="button" id="axis8Apply">相手オッズを反映</button></details><label>表示範囲 <select id="axis8Target"><option value=".65">65%</option><option value=".75" selected>75%</option><option value=".8">80%</option><option value=".9">90%</option></select></label> <label>並べ替え <select id="axis8Metric"><option value="w">3着内</option><option value="q">連対</option></select></label><div id="axis8Opp"></div><section id="axis8Formation" style="margin-top:16px"><h3>展開隊列</h3><div id="axis8FormationBody" aria-live="polite"></div></section><details><summary>全頭の能力・展開・位置取り</summary><div id="axis8Field"></div></details></div>';
  host.appendChild(el);
  el.addEventListener("change",e=>{if(e.target.id==="axis8Confirm"){confirmed=e.target.checked;render(true);}if(e.target.id==="axis8Target"){target=+e.target.value;render(true);}if(e.target.id==="axis8Metric"){metric=e.target.value;render(true);}});
  $("axis8Apply").addEventListener("click",()=>{pairText=$("axis8Pairs").value;render(true);});
  return el;
 }
 function read(){
  if(dirty||!started||root.RSAAnalysisTransitionState?.status!=="ready")return {ready:false,status:"hold",reason:"レース条件・過去走を入力して解析してください"};
  const a=root.M3PureAbilityState,f=root.Finish600State;
  if(!a?.ready||!f?.ready||Number(a.at)<started||Number(f.at)<started||!Number.isFinite(Number(a.at))||!Number.isFinite(Number(f.at)))return {ready:false,status:"hold",reason:"今回のAbility・M3計算を待っています"};
  if(!/^\d{4}-\d{2}-\d{2}$/.test($("raceDate")?.value||"")||!$("venue")?.value)return {ready:false,status:"hold",reason:"日付・競馬場を確認"};
  if(root.RaceSkipLockV1State?.kind==="scope")return {ready:false,status:"out",reason:"対象外"};
  if(!confirmed)return {ready:false,status:"hold",reason:"CSVの仮馬番と確定馬番を照合してチェックしてください"};
  return C.compute({grade:$("grade")?.value,field:Number($("fieldSize")?.value),surface:$("surface")?.value,name:$("raceName")?.value,ability:a,finish:f,odds:$("oddsPaste")?.value});
 }
 function render(force=false){
  if(!ensure())return;$("axis8ConfirmLabel").hidden=dirty||!started||root.RSAAnalysisTransitionState?.status!=="ready";$("axis8Confirm").checked=confirmed;const x=read();latest=x;root.RSAAxis8PrimaryState={...x,at:Date.now(),ticketDecision:false};
  const key=x.ready?JSON.stringify([started,x.axis.no,x.rows.map(h=>[h.no,h.name,h.od])]):"";
  if(key!==pairKey){pairKey=key;pairText="";$("axis8Pairs").value="";}
  const sig=JSON.stringify([x,target,metric,pairText,root.PositionRiskState?.at,root.ValidatedQueueState?.at,root.MobileAnalysisCoreState?.at,root.RSAAnalysisTransitionState?.generation,Boolean(root.RSAForecastWorkflowCoreV1)]);if(!force&&signature===sig)return;signature=sig;
  $("axis8Controls").hidden=!x.ready;$("axis8Result").innerHTML=x.ready?'<h3>'+esc(x.tier+"｜"+({S:"高信頼",A:"分析対象",B:"条件付き",C:"見送り"}[x.tier]))+'</h3><p>'+esc(x.reason)+' ｜ '+esc(x.structure==="none"?"一致なし":x.structure)+'</p><p><b>◎ '+esc(x.axis.no+"番 "+x.axis.name)+'</b> ｜ '+esc(x.axis.pop+"番人気・Ability "+x.axis.ar+"位・M3 "+x.axis.mr+"位")+'</p><p>勝率 '+pct(x.calibrated[0])+' ／ 連対率 '+pct(x.calibrated[1])+' ／ 3着内率 <b>'+pct(x.calibrated[2])+'</b></p><small>2026年固定の長期代理モデル較正。軸の個別推定値であり、全馬較正確率の整合性は未検証。馬券購入は自身で判断。</small>':'<h3>'+esc(x.status==="out"?"対象外":"判定保留")+'</h3><p>'+esc(x.reason)+'</p>';
  if(!x.ready){$("axis8Opp").textContent="";$("axis8Field").textContent="";$("axis8FormationBody").textContent="";return;}
  const d=C.direct(pairText,x),rows=C.coverage(d||x.others,target,metric),sel=rows.filter(h=>h.selected);
  const label=d?"券種別実オッズ・Phase 4直接条件付きモデル":"単勝PL参考値（75%方式の検証と異なる入力）";
  $("axis8Opp").innerHTML='<h3>相手候補 '+sel.length+'頭 ｜ '+pct(sel.at(-1)?.coverage)+'</h3><p>'+esc(label)+(pairText&&!d?" ／ 入力不完全・不整合":"")+'</p><p>軸好走時の相手の条件付き確率。カバー率は的中確率ではありません。</p>'+rows.map((h,i)=>(i===sel.length?'<hr><b>参考馬</b>':i===0?'<b>候補（上位3頭を強調）</b>':'')+'<div class="a8row'+(h.selected&&i<3?' a8strong':'')+'"><span>'+esc(h.no+"番 "+h.name)+'</span><small>連対 '+pct(h.q)+' ／ 3着内 '+pct(h.w)+'</small></div>').join("");
  const formation=C.formation(x,sel,root.ValidatedQueueState,root.PositionRiskState,root.MobileAnalysisCoreState,root.RSAAnalysisTransitionState,started);
  paintFormation(formation);
  const p=formation.ready&&root.PositionRiskState?.ready&&Number(root.PositionRiskState?.at)>=started?Object.fromEntries(x.rows.filter(h=>String(root.PositionRiskState?.byNo?.[h.no]?.name??"").normalize("NFKC").trim()===h.name).map(h=>[h.no,root.PositionRiskState.byNo[h.no]])):{},q=formation.ready?formation.byNo:{};
  $("axis8Field").innerHTML=x.rows.map(h=>'<div class="a8row"><span>'+esc(h.no+"番 "+h.name)+'</span><small>'+esc("Ability "+h.ar+" / M3 "+h.mr+" / 人気 "+h.pop)+" / P10 "+pct(Number.isFinite(Number(p[h.no]?.p10))&&p[h.no]?.p10!=null?Number(p[h.no].p10):NaN)+" / 初角 "+esc(q[h.no]?.expectedRank??"—")+'</small></div>').join("");
 }
 function paintFormation(m){
  const el=$("axis8FormationBody"),f=root.RSAForecastWorkflowCoreV1;
  if(!m.ready||!f?.formationSVG||!f?.turnForVenue){el.textContent=m.reason||"既存の隊列表示モジュールを読込中";return;}
  const turn=f.turnForVenue($("venue")?.value,$("surface")?.value,$("distance")?.value,"");
  if(!turn){el.textContent="競馬場・回り方向を確認してください";return;}
  const plot=f.formationSVG(m,turn);
  const labels=["強前傾","前傾","標準","スロー"];
  const pace=m.pace?labels.map((label,i)=>'<span>'+label+' <b>'+pct(m.pace[i])+'</b></span>').join(""):"展開確率待ち";
  const risk=f.riskFor(m.byNo[m.axis],m.roster.length,m.pressure);
  const list=m.roster.slice().sort((a,b)=>(m.byNo[a.no].expectedRank??Infinity)-(m.byNo[b.no].expectedRank??Infinity)||Number(a.no)-Number(b.no)).map(h=>{
   const q=m.byNo[h.no],mark=h.no===m.axis?"軸":m.partners.includes(h.no)?"相手":"その他";
   return '<div class="a8row"><span>'+esc(mark+"｜"+h.no+"番 "+h.name)+'</span><small>'+esc(q.expectedRank==null?"位置未確定":q.expectedRank.toFixed(1)+"番手")+' ／ '+esc(q.expectedRank!=null&&q.laneIdx!=null?q.lane:"—")+' ／ 先行力 '+pct(q.frontness5)+' ／ 追走 '+esc(q.pursuitGrade||"—")+'</small></div>';
  }).join("");
  el.innerHTML='<p>'+esc(turn==="left"?"左回り":turn==="right"?"右回り":"直線")+'｜全'+m.roster.length+'頭'+(m.referenceOnly?'｜C判定・参考軸のみ':'')+'</p><div class="a8pace">'+pace+'</div><p>先行圧：'+esc(m.pressure||"—")+'</p><div class="a8map">'+plot.svg+'</div><div class="a8legend"><span><i style="background:#7358c5"></i>軸</span><span><i style="background:#0c968b"></i>相手 '+m.partners.length+'頭</span><span><i style="background:#ebf3ed"></i>その他</span></div>'+
   (plot.unknown.length?'<p>位置未確定：'+plot.unknown.map(h=>esc(h.no+"番 "+h.name)).join("、")+'</p>':'')+
   '<p>軸の初角：'+(m.axisRank==null?"—":m.axisRank.toFixed(1)+"番手")+' ／ P10 '+pct(m.p10)+' ／ 先行力 '+pct(m.frontness)+' ／ 追走 '+esc(m.pursuit||"—")+'</p><p>'+esc(risk)+'</p><details><summary>全頭の予測番手・進路・先行力</summary>'+list+'</details><small>既存隊列モデルの参考予測です。実際の進路・着順は保証しません。レースランクは隊列情報で変更しません。</small>';
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>render(),100);}
 function invalidate(){dirty=true;started=0;confirmed=false;pairText="";pairKey="";const el=$("axis8FormationBody");if(el)el.textContent="";schedule();}
 const inputs=["raceDate","venue","surface","distance","grade","going","fieldSize","raceName","csvFile"];
 D.addEventListener("input",e=>{if(inputs.includes(e.target.id))invalidate();if(e.target.id==="oddsPaste")schedule();},true);
 D.addEventListener("change",e=>{if(inputs.includes(e.target.id))invalidate();},true);
 D.addEventListener("click",e=>{if(e.target.id==="analyzeBtn"){dirty=false;confirmed=false;started=Date.now();schedule();}if(["applyOddsBtn","clearOddsBtn"].includes(e.target.id))schedule();if(e.target.id==="clearCsvBtn")invalidate();},true);
 root.addEventListener("rsa-analysis-start",()=>{dirty=false;confirmed=false;started=Number(root.RSAAnalysisTransitionState?.startedWall)||Date.now();const el=$("axis8FormationBody");if(el)el.textContent="";schedule();});
 for(const e of ["rsa-analysis-complete","rsa-analysis-error","m3-pure-ability-ready","finish600-ready","position-risk-ready","validated-queue-ready","decision-shell-v2-ready","mobile-analysis-core-ready","mobile-race-map-pace-ready","rsa-addons-ready"])root.addEventListener(e,schedule);
 if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
})(root,C);
})(typeof window!=='undefined'?window:globalThis);
