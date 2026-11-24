/* P3 2026-11-24: forecast workflow / whole-field formation (display + user notes only).
 * Does not alter Ability, M3, P10, M4, ProductionDecisionPipeline, BUY/PASS,
 * or treat market-derived pair probabilities as independently actionable EV.
 */
(function(root){"use strict";
var VERSION="P3-forecast-workflow-v1-20261124";
var $=function(id){return root.document&&root.document.getElementById(id)};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var num=function(v){if(v===null||v===undefined||String(v).trim()==="")return NaN;var n=Number(v);return Number.isFinite(n)?n:NaN};
var TURN={東京:"left",新潟:"left",中京:"left",札幌:"right",函館:"right",福島:"right",中山:"right",京都:"right",阪神:"right",小倉:"right"};
var localPrefix="rsa-forecast-workflow-v1:";
function turnForVenue(venue,surface,distance,route){
 if(String(route)==="straight"||(venue==="新潟"&&String(surface).includes("芝")&&Number(distance)===1000))return "straight";
 return TURN[String(venue)]||null;
}
function pairKey(a,b){return [Number(a),Number(b)].sort(function(x,y){return x-y}).join("-")}
function riskFor(row,n,pressure){
 if(!row)return "位置取り予測が未取得。過去走の内容を要確認";
 var risks=[],rank=num(row.expectedRank),lane=num(row.laneIdx);
 if(row.validated!==true||!Number.isFinite(rank))risks.push("位置取り履歴不足・想定番手は参考");
 if(Number.isFinite(rank)&&rank>n*0.7)risks.push("後方想定で進路と差し届きに注意");
 if(Number.isFinite(lane)&&lane>=3)risks.push("外を回る進路の可能性（実測ではない）");
 if(Number.isFinite(rank)&&rank<=n*0.3&&pressure==="高")risks.push("先行争いが激化した場合の負荷");
 if(!risks.length)risks.push("位置取り面の明確な警戒材料は未特定（安全保証ではない）");
 return risks.join("／");
}
function rosterRows(){
 var s=root.Finish600State;
 return s&&s.ready&&Array.isArray(s.rows)?s.rows.map(function(h){
  return {no:String(Number(h.no)),name:String(h.name||"")};
 }).filter(function(h){return /^[1-9]\d*$/.test(h.no)}):[];
}
function context(){
 var roster=rosterRows(),queue=root.ValidatedQueueState||{},focused=root.RSAFocusedThreeTabsState||{};
 var axis=String(focused.axisNo||focused.researchAxisNo||"");
 var partners=Array.isArray(focused.partnerNos)?focused.partnerNos.map(String).filter(function(no){return no!==axis}).slice(0,3):[];
 var names={};roster.forEach(function(h){names[h.no]=h.name});
 var byNo=queue.byNo||{};
 if(!Object.keys(byNo).length&&Array.isArray(queue.rows))queue.rows.forEach(function(h){byNo[String(h.no)]=h});
 var ref=root.MobilePairProbabilityReferenceV1State||{},pmap={};
 if(ref.ready===true&&String(ref.axisNo)===axis){
  (ref.axisPairs||[]).forEach(function(p){pmap[String(p.no)]=num(p.wide)});
  partners.forEach(function(no){
   var z=ref.pairMap&&ref.pairMap[pairKey(axis,no)];
   if(z&&Number.isFinite(num(z.wide)))pmap[no]=num(z.wide);
  });
 }
 var venue=String($("venue")&&$("venue").value||"");
 var surface=String($("surface")&&$("surface").value||"");
 var distance=String($("distance")&&$("distance").value||"");
 var route=root.CourseGeometryRuntimeV1State&&root.CourseGeometryRuntimeV1State.current&&root.CourseGeometryRuntimeV1State.current.route;
 var turn=turnForVenue(venue,surface,distance,route);
 var pressure=root.MobileRaceMapPaceV1State&&root.MobileRaceMapPaceV1State.pressure||"";
 var race={date:String($("raceDate")&&$("raceDate").value||""),venue:venue,name:String($("raceName")&&$("raceName").value||""),
  surface:surface,distance:distance,grade:String($("grade")&&$("grade").value||""),
  route:String(route||""),turn:turn};
 var key=[race.date,race.venue,race.name,race.surface,race.distance,race.grade,race.route,roster.map(function(x){return x.no+":"+x.name}).join(",")].join("|");
 var ready=focused.analysisReady===true&&roster.length>=12&&roster.length<=18;
 return {race:race,key:key,roster:roster,names:names,queue:queue,byNo:byNo,axis:axis,partners:partners,pmap:pmap,
  pressure:pressure,ready:ready,researchAxis:!focused.axisNo&&!!focused.researchAxisNo,focused:focused,marketReady:ref.ready===true};
}
function positionSlots(m){
 var n=m.roster.length,known=[],unknown=[];
 m.roster.forEach(function(h){
  var q=m.byNo[h.no],rank=num(q&&q.expectedRank),lane=num(q&&q.laneIdx);
  if(!Number.isFinite(rank)||!Number.isFinite(lane)||lane<0||lane>3){unknown.push(h);return}
  known.push({no:h.no,name:h.name,rank:Math.max(1,Math.min(n,rank)),lane:Math.floor(lane),validated:q.validated===true});
 });
 for(var lane=0;lane<4;lane++){
  var subset=known.filter(function(h){return h.lane===lane}).sort(function(a,b){return a.rank-b.rank||Number(a.no)-Number(b.no)});
  var last=Infinity,gap=Math.min(31,250/Math.max(subset.length-1,1));
  subset.forEach(function(h){
   var ideal=291-(h.rank-1)*250/Math.max(n-1,1);
   h.x=Math.min(ideal,last-gap);last=h.x;
  });
  if(subset.length&&subset[subset.length-1].x<34){
   var shift=34-subset[subset.length-1].x;
   subset.forEach(function(h){h.x+=shift});
  }
  subset.forEach(function(h){h.y=205-h.lane*43});
 }
 return {known:known,unknown:unknown};
}
function formationSVG(m,turn){
 var pos=positionSlots(m);
 var mirror=turn==="left";
 var rail=turn==="straight"?"":'<g transform="'+(mirror?'translate(360 0) scale(-1 1)':'')+'"><path d="M24 19 H235 Q333 19 333 115 V244" fill="none" stroke="#93bda2" stroke-opacity=".52" stroke-width="2"/><path d="M24 51 H235 Q299 51 299 115 V244" fill="none" stroke="#c4e3ce" stroke-opacity=".5" stroke-width="2"/></g>';
 var s='<svg viewBox="0 0 360 248" role="img" aria-label="'+esc(turn==="right"?"右回り":turn==="left"?"左回り":"直線")+'、全馬の初角参考隊列図。馬番は番号で表示。">';
 s+='<rect x="2" y="2" width="356" height="244" rx="14" fill="#234e38"/>';
 [76,119,162].forEach(function(y){s+='<path d="M12 '+y+' H348" stroke="#bddfc6" opacity=".28" stroke-width="1" stroke-dasharray="5 7"/>'});
 s+=rail;
 s+='<text x="16" y="20" fill="#d7eedc" font-size="11" font-weight="bold">外</text><text x="16" y="235" fill="#d7eedc" font-size="11" font-weight="bold">内</text>';
 pos.known.forEach(function(h){
  var x=mirror?360-h.x:h.x,y=h.y,axis=h.no===m.axis,partner=m.partners.indexOf(h.no)>=0;
  var fill=axis?"#7358c5":partner?"#0c968b":"#ebf3ed",stroke=axis?"#d6c8ff":partner?"#a8f5dc":"#c5d3d0";
  s+='<g><title>'+esc(h.no+"番 "+h.name+"／想定 "+h.rank.toFixed(1)+"番手／"+(h.lane===0?"内":h.lane===3?"外":"中")+"進路")+'</title>';
  s+='<circle cx="'+x.toFixed(2)+'" cy="'+y+'" r="14.5" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
  if(!h.validated)s+='<circle cx="'+x.toFixed(2)+'" cy="'+y+'" r="17" fill="none" stroke="#ffc96b" stroke-width="1.5" stroke-dasharray="3 3"/>';
  s+='<text x="'+x.toFixed(2)+'" y="'+(y+4.8)+'" text-anchor="middle" font-size="12" font-weight="800" fill="'+(axis||partner?"#ffffff":"#264135")+'">'+esc(h.no)+'</text></g>';
 });
 return {svg:s+"</svg>",unknown:pos.unknown,known:pos.known};
}
function mapHtml(m,turn){
 var data=formationSVG(m,turn);
 var all=m.roster.map(function(h){
  var mark=h.no===m.axis?"軸":m.partners.indexOf(h.no)>=0?"相手":"";
  return '<span>'+esc(h.no)+" "+esc(h.name)+(mark?" ["+mark+"]":"")+"</span>";
 }).join("");
 var note=data.unknown.length?'<div class="rfw-uncertain">位置未確定：'+data.unknown.map(function(h){return esc(h.no+" "+h.name)}).join(" / ")+'（順番や内外を捏造せず、下に分けて表示）</div>':"";
 var ctrl=turn==="straight"?"<span class=\"rfw-badge\">直線コース</span>":
  '<div class="rfw-turn-controls"><button type="button" data-rfw-turn="right" aria-pressed="'+(turn==="right")+'">右回り</button><button type="button" data-rfw-turn="left" aria-pressed="'+(turn==="left")+'">左回り</button></div>';
 return '<div class="rsaf-intro"><b>全頭の位置取りを予想</b><p>初角の参考順位と進路。枠順・過去走・他馬の先行力を参照し、軸馬・相手3頭を色分け。予測順位や実際の横位置は確定ではありません。</p></div>'+
  '<section class="rfw-course-map"><div class="rfw-map-head"><b>'+esc(turn==="right"?"右回り":turn==="left"?"左回り":"直線")+'｜全'+m.roster.length+'頭</b>'+ctrl+'</div>'+
  data.svg+'<div class="rfw-map-legend"><span><i class="rfw-dot" style="background:#7358c5"></i>軸馬</span><span><i class="rfw-dot" style="background:#0c968b"></i>相手3頭</span><span><i class="rfw-dot" style="background:#ebf3ed"></i>その他</span></div>'+note+
  '<div class="rfw-roster">'+all+'</div>'+
  '<p class="rfw-small">位置が近い馬は視認性のため少し離して描画。横の内外は実測トラッキングではなく推定。右・左の切替は表示専用で予測値を変更しません。</p></section>';
}
var turnOverride="",lastRaceBase="",raceKey="",draft=null,lastData=null,lastPanelSig="";
function draftFor(key){
 try{var s=root.localStorage&&root.localStorage.getItem(localPrefix+key);return s?JSON.parse(s):null}catch(_){return null}
}
function saveDraft(){if(!draft||draft.locked||!raceKey)return false;
 try{root.localStorage.setItem(localPrefix+raceKey,JSON.stringify(draft));return true}catch(_){message("端末内の保存に失敗しました。JSON出力でバックアップしてください。",true);return false}
}
function message(v,error){var e=$("rfwMessage");if(e){e.textContent=v;e.style.color=error?"#ffd1a7":"#a9daca"}}
function formValue(id){var el=$(id);return el?String(el.value||""):""}
function setValue(id,v){var e=$(id);if(e)e.value=v==null?"":v}
function modelProb(m,no){var p=num(m.pmap[no]);return p>=0&&p<=1?p:NaN}
function infoHtml(m){
 if(!m.ready)return '<p class="rfw-dim">解析結果待ち。レース条件と過去走CSVを確認してください。</p>';
 var axis=m.roster.find(function(h){return h.no===m.axis});
 var ax=axis?'<b>'+esc(axis.no+"番 "+axis.name)+'</b> '+(m.researchAxis?'<span class="rfw-badge">研究上の候補（本番軸なし）</span>':'<span class="rfw-badge">構造上の軸候補</span>'):
  '<b>軸は未確定</b>：先にレース見送りを検討';
 var risk=axis?riskFor(m.byNo[axis.no],m.roster.length,m.pressure):"軸が決まっていないため、軸の危険性を判定できません";
 return '<div class="rfw-card"><h3>① レース選定と軸のリスク</h3>'+ax+
  '<p class="rfw-risk">'+esc(risk)+'</p><p class="rfw-small">公式BUY/PASSと別の参考画面。研究軸を本番の購入可能軸に昇格させません。</p></div>';
}
function partnersHtml(m){
 if(!m.ready||!m.axis||m.partners.length!==3)return '<p class="rfw-dim">本番の軸と相手3頭が揃ってから比較します。軸なしの場合、無理に選びません。</p>';
 return m.partners.map(function(no,i){
  var nm=m.names[no]||"",p=modelProb(m,no),selected=String(draft&&draft.partnerNo||"")===no;
  return '<div class="rfw-candidate"><div><b>候補'+(i+1)+'｜'+esc(no+"番 "+nm)+'</b>'+
   '<small class="rfw-risk">'+esc(riskFor(m.byNo[no],m.roster.length,m.pressure))+'</small>'+
   '<small>'+(Number.isFinite(p)?'市場較正モデル由来の参考ワイド確率。利益確率ではありません。':'ワイド同時確率：オッズ・ペアモデルの取得待ち')+'</small></div>'+
   '<div><div class="rfw-prob">'+(Number.isFinite(p)?(100*p).toFixed(1)+"%":"—")+'</div>'+
   '<button type="button" class="rfw-pick" data-rfw-choice="'+esc(no)+'" aria-pressed="'+selected+'" '+(draft&&draft.locked?"disabled":"")+'>'+(selected?"選択中":"相手に選ぶ")+'</button></div></div>';
 }).join("");
}
function content(){
 return '<div class="rfw-kicker">FINAL DECISION｜研究用</div>'+
  '<h2 class="rfw-heading">自分の解説から購入判断へ</h2>'+
  '<p class="rfw-small">軸馬・相手3頭・隊列を確認したうえで、最後に買う根拠と価格を整理します。</p>'+
  '<div id="rfwDecisionRecap" class="rfw-decision-recap"></div>'+
  '<div class="rfw-card"><h3>① 自分のレース解説</h3><div class="rfw-fields">'+
   '<div><label for="rfwWhyAxis">軸馬を選ぶ根拠</label><textarea id="rfwWhyAxis" placeholder="能力・近走・条件適性、確認した事実と推測を分けて記録"></textarea></div>'+
   '<div><label for="rfwPaceNote">想定隊列とペース</label><textarea id="rfwPaceNote" placeholder="どの馬が前に出るか、内外、展開が変わる条件"></textarea></div>'+
   '<div><label for="rfwWhyPartner">ワイドの相手に選ぶ根拠</label><textarea id="rfwWhyPartner" placeholder="候補3頭を比較して採用・不採用の理由"></textarea></div>'+
   '<div><label for="rfwWeakness">この予想が外れるとしたら</label><textarea id="rfwWeakness" placeholder="スタート、折合い、枠、馬場変化、ペースの想定違い"></textarea></div>'+
   '</div></div>'+
  '<div class="rfw-card"><h3>② ワイド1点の購入条件（手入力）</h3><div class="rfw-fields">'+
   '<div><label for="rfwQuote">検討時点のワイド最低オッズ（任意）</label><input id="rfwQuote" inputmode="decimal" type="number" min="1" step=".1" placeholder="例：8.5"></div>'+
   '<div><label for="rfwStake">仮購入額（円）</label><input id="rfwStake" inputmode="numeric" type="number" min="100" step="100" value="100"></div>'+
   '</div><p id="rfwQuoteHint" class="rfw-small">実際の購入時点のオッズを記録。購入推奨や期待利益の保証はしません。</p></div>'+
  '<div class="rfw-card"><h3>③ 自分の最終判断</h3><div class="rfw-final">'+
   '<label><input type="radio" name="rfwDecision" value="buy"> BUY候補</label>'+
   '<label><input type="radio" name="rfwDecision" value="pass" checked> PASS</label>'+
   '</div><div class="rfw-fields" style="margin-top:10px"><div><label for="rfwFinalReason">買う・見送る最終理由（必須）</label><textarea id="rfwFinalReason" placeholder="なぜ買う／なぜ見送るか。見送りの理由も記録"></textarea></div></div>'+
   '<p class="rfw-small">この判断は個人メモ。本番アプリのBUY/PASS・購入候補を変更しません。発走前の固定時刻は端末の自己申告で、公的な発走前証明にはなりません。</p>'+
   '<div class="rfw-actions"><button type="button" id="rfwLock">予想を固定して保存</button><button type="button" id="rfwExport">JSONを書き出す</button></div>'+
   '<p id="rfwMessage" aria-live="polite"></p></div>';
}
function ensure(){
 if(!root.document||!root.document.body||!root.document.body.classList.contains("rsaFocusedThreeTabs"))return null;
 var parent=$("rsaFocusedView");if(!parent)return null;
 var target=$("rsafDecision");if(!target)return null;
 var el=$("rsaForecastWorkflowV1");if(el){if(el.parentElement!==target)target.appendChild(el);return el;}
 el=root.document.createElement("section");el.id="rsaForecastWorkflowV1";target.appendChild(el);el.innerHTML=content();
 el.addEventListener("click",function(e){
  var choice=e.target.closest&&e.target.closest("[data-rfw-choice]");
  if(choice){if(draft&&!draft.locked){draft.partnerNo=String(choice.dataset.rfwChoice);saveDraft();renderWorkspace(true)}return}
  if(e.target.id==="rfwLock"){freeze();return}
  if(e.target.id==="rfwExport"){exportJSON();return}
 });
 el.addEventListener("input",function(e){if(draft&&!draft.locked&&/^(rfwWhyAxis|rfwPaceNote|rfwWhyPartner|rfwWeakness|rfwQuote|rfwStake|rfwFinalReason)$/.test(e.target.id)){capture();saveDraft();updateQuoteHint(lastData)}});
 el.addEventListener("change",function(e){if(draft&&!draft.locked&&e.target.name==="rfwDecision"){capture();saveDraft()}});
 return el;
}
function capture(){
 if(!draft||draft.locked)return;
 draft.notes={axis:formValue("rfwWhyAxis"),pace:formValue("rfwPaceNote"),partner:formValue("rfwWhyPartner"),
  weakness:formValue("rfwWeakness"),final:formValue("rfwFinalReason")};
 draft.quote=formValue("rfwQuote");draft.stake=formValue("rfwStake");
 draft.decision=root.document.querySelector('input[name="rfwDecision"]:checked')&&root.document.querySelector('input[name="rfwDecision"]:checked').value||"pass";
 draft.updatedAt=new Date().toISOString();
}
function applyDraft(){
 if(!draft)return;
 setValue("rfwWhyAxis",draft.notes&&draft.notes.axis);setValue("rfwPaceNote",draft.notes&&draft.notes.pace);
 setValue("rfwWhyPartner",draft.notes&&draft.notes.partner);setValue("rfwWeakness",draft.notes&&draft.notes.weakness);
 setValue("rfwFinalReason",draft.notes&&draft.notes.final);setValue("rfwQuote",draft.quote);setValue("rfwStake",draft.stake||"100");
 var radio=root.document.querySelector('input[name="rfwDecision"][value="'+(draft.decision==="buy"?"buy":"pass")+'"]');if(radio)radio.checked=true;
 ["rfwWhyAxis","rfwPaceNote","rfwWhyPartner","rfwWeakness","rfwFinalReason","rfwQuote","rfwStake"].forEach(function(id){if($(id))$(id).disabled=!!draft.locked});
 root.document.querySelectorAll('input[name="rfwDecision"]').forEach(function(x){x.disabled=!!draft.locked});
 if($("rfwLock"))$("rfwLock").disabled=!!draft.locked;
 message(draft.locked?"固定済み："+String(draft.fixedAt||"")+"（端末時刻・自己申告）":"下書きはこの端末内に保存されます。");
}
function updateQuoteHint(m){
 if(!m)return;
 var chosen=draft&&draft.partnerNo,p=chosen?modelProb(m,chosen):NaN;
 var el=$("rfwQuoteHint");if(!el)return;
 var quote=num(formValue("rfwQuote"));
 var msg=Number.isFinite(p)?"選択ペアの参考同時3着内率 "+(p*100).toFixed(1)+"%。参考損益分岐オッズ "+(1/p).toFixed(2)+"倍。":"同時確率が取得できないため損益分岐オッズは表示できません。";
 if(Number.isFinite(quote)&&quote>=1)msg+=" 記録オッズ "+quote.toFixed(1)+"倍。";
 el.textContent=msg+" この確率は市場情報に依存するため、数式上の比較だけで購入期待値がプラスと認定しません。";
}
function decisionRecap(m){
 if(!m.ready)return '<b>解析結果待ち</b><p>軸馬・相手馬・隊列の解析が完了すると要点が表示されます。</p>';
 const axis=m.roster.find(h=>h.no===m.axis);
 if(!axis)return '<b>軸馬が未確定</b><p>無理に軸を選ばず、PASSを検討してください。予想メモは記録できます。</p>';
 const chosen=m.partners.find(no=>no===String(draft?.partnerNo||""));
 const label=chosen?chosen+"番 "+(m.names[chosen]||""):"相手未選択";
 const p=chosen?modelProb(m,chosen):NaN;
 return '<b>軸 '+esc(axis.no+"番 "+axis.name)+' × '+esc(label)+'</b><p>'+
  (m.researchAxis?'研究用軸のため本番BUY条件には使えません。':"本番軸の候補。")+
  (Number.isFinite(p)?" ワイド参考的中確率 "+(100*p).toFixed(1)+"%。":"")+
  '相手候補の評価は「相手馬」タブ、全頭隊列は「展開隊列」タブで確認してください。</p>';
}
function decorateAnalysisTabs(m){
 if(!m.ready)return;
 const axis=$("rsafAxis")?.querySelector(".rsaf-axis");
 if(axis&&m.axis){
  let box=axis.querySelector(".rfw-axis-risk");
  if(!box){box=root.document.createElement("div");box.className="rfw-axis-risk";axis.appendChild(box)}
  box.textContent="位置取りの懸念｜"+riskFor(m.byNo[m.axis],m.roster.length,m.pressure);
 }
 const panel=$("rsafPartners");
 if(!panel||panel.hidden||!m.axis)return;
 const cards=panel.querySelectorAll(".rsaf-pick-card");
 cards.forEach((card,i)=>{
  const no=m.partners[i];if(!no)return;
  let extra=card.querySelector(".rfw-partner-assist");
  if(!extra){extra=root.document.createElement("div");extra.className="rfw-partner-assist";const btn=card.querySelector(".rsaf-pick-action");if(btn)card.insertBefore(extra,btn);else card.appendChild(extra)}
  const p=modelProb(m,no);
  extra.textContent="ワイド参考同時的中率 "+(Number.isFinite(p)?(100*p).toFixed(1)+"%":"未取得")+"｜位置取りの懸念："+riskFor(m.byNo[no],m.roster.length,m.pressure);
 });
}
function renderWorkspace(force){
 var node=ensure();if(!node)return;
 var m=context();lastData=m;
 if(!m.roster.length)return;
 var key=m.key;
 if(raceKey!==key){
  raceKey=key;draft=draftFor(key)||{version:VERSION,locked:false,partnerNo:"",decision:"pass",quote:"",stake:"100",notes:{},race:m.race};
  if(!draft.partnerNo&&m.partners.length===3)draft.partnerNo=m.partners[0];
  turnOverride="";
  applyDraft();force=true;lastPanelSig="";
 }
 var sig=JSON.stringify([m.ready,m.axis,m.partners,m.marketReady,m.pmap,m.queue&&m.queue.at,m.pressure,m.roster.map(function(h){return [h.no,h.name]}),draft&&draft.partnerNo]);
 if(force||sig!==lastPanelSig){
  lastPanelSig=sig;
  $("rfwDecisionRecap").innerHTML=decisionRecap(m);
 }
 updateQuoteHint(m);
 decorateAnalysisTabs(m);
 if(draft&&draft.locked)message("固定済み："+String(draft.fixedAt||"")+"（オッズ・根拠・馬番は保存時のスナップショット）");
}
function renderFormation(){
 var el=$("rsafFormation"),m=context();if(!el||el.hidden||!m.ready)return;
 var base=[m.race.date,m.race.venue,m.race.surface,m.race.distance,m.race.route].join("|");
 if(base!==lastRaceBase){lastRaceBase=base;turnOverride=""}
 var turn=turnOverride||m.race.turn;
 if(!turn)return;
 var sig=JSON.stringify([turn,m.axis,m.partners,m.roster,m.queue&&m.queue.at,m.queue&&m.queue.rows&&m.queue.rows.map(function(h){return [h.no,h.expectedRank,h.laneIdx,h.validated]})]);
 if(el.dataset.rfwSignature===sig&&el.querySelector(".rfw-course-map"))return;
 el.dataset.rfwSignature=sig;el.innerHTML=mapHtml(m,turn);
 root.dispatchEvent(new root.CustomEvent('rsa-forecast-formation-rendered',{detail:{turn:turn}}));
}
function snapshot(){
 var m=lastData||context(),chosen=String(draft&&draft.partnerNo||"");
 return {version:VERSION,kind:"user_prediction_note",researchOnly:true,
   recordedAtDevice:new Date().toISOString(),timeProof:"device_local_only_not_proof_of_pre_race",
   race:m.race,modelLabels:{axis:"RSAFocusedThreeTabsState",position:"ValidatedQueueState",wide:"MobilePairProbabilityReferenceV1State_market_derived"},
   axisNo:m.axis||null,axisIsResearch:m.researchAxis,partnerCandidates:m.partners.map(function(no){
    return {no:no,name:m.names[no]||"",wideReferenceProbability:Number.isFinite(modelProb(m,no))?modelProb(m,no):null,risk:riskFor(m.byNo[no],m.roster.length,m.pressure)};
   }),chosenPartnerNo:chosen||null,axisRisk:riskFor(m.byNo[m.axis],m.roster.length,m.pressure),
   formation:m.roster.map(function(h){var q=m.byNo[h.no]||{};return {no:h.no,name:h.name,expectedRank:Number.isFinite(num(q.expectedRank))?num(q.expectedRank):null,laneIdx:Number.isFinite(num(q.laneIdx))?num(q.laneIdx):null,validated:q.validated===true}}),
   notes:draft.notes,quote:draft.quote||null,stake:Number(draft.stake)||100,
   decision:draft.decision,locked:!!draft.locked,fixedAt:draft.fixedAt||null,
   disclaimer:"Reference model market-derived, not an independent positive EV or purchase recommendation."};
}
function freeze(){
 if(!draft||draft.locked)return;
 capture();
 var m=lastData||context();
 if(!(draft.notes&&String(draft.notes.final||"").trim())){message("買う・見送る最終理由を入力してください。",true);return}
 if(draft.decision==="buy"&&(!m.axis||m.researchAxis||m.partners.indexOf(draft.partnerNo)<0)){message("本番軸と相手3頭の選択がないためBUY候補は固定できません。PASSを検討してください。",true);return}
 if(draft.decision==="buy"&&(!String(draft.notes.axis||"").trim()||!String(draft.notes.partner||"").trim())){message("BUY候補では軸と相手を選んだ根拠を記載してください。",true);return}
 var amount=num(draft.stake);if(!Number.isFinite(amount)||amount<100||amount%100!==0){message("仮購入額は100円単位で入力してください。",true);return}
 var old=JSON.stringify(draft);
 draft.locked=true;draft.fixedAt=new Date().toISOString();draft.snapshot=snapshot();
 if(!saveLocked()){draft=JSON.parse(old);return}
 applyDraft();renderWorkspace(true);renderFormation();
}
function saveLocked(){
 try{root.localStorage.setItem(localPrefix+raceKey,JSON.stringify(draft));return true}
 catch(_){message("保存できなかったため予想は固定していません。",true);return false}
}
function exportJSON(){
 if(!draft){message("予想データがありません。",true);return}
 if(!draft.locked)capture();
 var payload=draft.locked&&draft.snapshot?draft.snapshot:snapshot();
 var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
 var url=URL.createObjectURL(blob),a=root.document.createElement("a");
 a.href=url;a.download="race_prediction_"+String(payload.race&&payload.race.date||"draft").replace(/[^0-9-]/g,"")+".json";
 root.document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);
 message("JSONを書き出しました。発走前の自己申告記録として保管してください。");
}
function getPostraceContext(){
 var m=context(),same=raceKey===m.key;
 return {key:m.key,race:m.race,roster:m.roster,axis:m.axis,partners:m.partners,turn:turnOverride||m.race.turn,
  ready:m.ready,frozen:same&&draft&&draft.locked===true?draft.snapshot:null};
}
function refresh(){renderWorkspace(false);renderFormation()}
function start(){ensure();refresh();setTimeout(refresh,500);setTimeout(refresh,1500)}
if(!root.document||typeof root.addEventListener!=="function"){root.RSAForecastWorkflowCoreV1=Object.freeze({version:VERSION,turnForVenue:turnForVenue,riskFor:riskFor,positionSlots:positionSlots,formationSVG:formationSVG});return}
root.RSAForecastWorkflowCoreV1=Object.freeze({version:VERSION,turnForVenue:turnForVenue,riskFor:riskFor,positionSlots:positionSlots,formationSVG:formationSVG});
root.RSAForecastWorkflowV1=Object.freeze({version:VERSION,getPostraceContext:getPostraceContext});
root.document.addEventListener("click",function(e){
 var b=e.target.closest&&e.target.closest("[data-rfw-turn]");
 if(!b)return;
 turnOverride=b.dataset.rfwTurn;renderFormation();
});
["rsa-focused-partner-ready","validated-queue-ready","mobile-pair-probability-reference-ready",
 "mobile-race-map-pace-ready","course-geometry-ready","rsa-analysis-complete","production-decision-pipeline-ready"].forEach(function(name){
 root.addEventListener(name,function(){setTimeout(refresh,30)});
});
root.addEventListener("rsa-analysis-start",function(){lastPanelSig="";setTimeout(refresh,45)});
root.document.addEventListener("change",function(e){
 if(["raceDate","venue","raceName","surface","distance","grade","courseRoute"].indexOf(e.target&&e.target.id)>=0){lastPanelSig="";setTimeout(refresh,70)}
},true);
if(root.document.readyState==="loading")root.addEventListener("DOMContentLoaded",start,{once:true});else start();
})(typeof window!=="undefined"?window:globalThis);
