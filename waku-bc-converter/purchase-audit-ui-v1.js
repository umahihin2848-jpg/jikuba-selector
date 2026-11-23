/* P3-74: lightweight research display. This code cannot change M3/Ability/P10 or BUY/PASS. */
(function(root){'use strict';
if(root.RSAPurchaseAuditUIV1)return;
const Core=root.RSAPurchaseAuditCoreV1,doc=root.document,$=id=>doc.getElementById(id);
if(!Core)return;
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=x=>x===null||x===undefined||x===''?NaN:Number(x);
const fmt=x=>Number.isFinite(x)?x.toFixed(1):'—';
let review={},lastResult=null,lastInput=null,listen=false,timer=null;
function mount(){
 let el=$('rsaPurchaseAudit');
 if(el)return el;
 const anchor=$('analyzeBtn');if(!anchor)return null;
 el=doc.createElement('details');el.id='rsaPurchaseAudit';el.className='rpa';el.open=false;
 el.innerHTML='<summary>購入判断・見送り理由｜研究版 <small>本番のBUY/PASSは変更しません</small></summary>'+
 '<div class="rpaBody"><p class="rpaIntro">Ability × M3による構造 → 相手3頭 → P10最小を参考 → レース質・隊列の手動審査 → 価格記録。<b>実績ある自動購入ルールではありません。</b> 失敗・見送りの理由も保存します。</p>'+
 '<section class="rpaField"><h4>1. 出走馬の確定馬番を照合</h4><p>CSVの馬番は仮番号の可能性があります。別の出走表で全頭確認してください。取消による欠番のあるレースでは、現行モデルを自動対応付けせず保留します。</p>'+
 '<button type="button" id="rpaFillRoster" class="rpaSub">仮番号と馬名を転記（照合前の下書き）</button>'+
 '<label for="rpaRaceNo">参照した出走表のR番号（任意・1〜12）</label><input type="number" id="rpaRaceNo" min="1" max="12" inputmode="numeric" placeholder="例：11">'+'<label for="rpaRoster">馬番,馬名（1行1頭・全頭分）</label><textarea id="rpaRoster" rows="5" placeholder="1,ホースA&#10;2,ホースB"></textarea>'+
 '<label for="rpaRosterSource">参照した出走表の出典</label><input id="rpaRosterSource" type="text" placeholder="例：JRA公式出走表・日付">'+
 '<label class="rpaCheck"><input id="rpaAttest" type="checkbox"> 別資料で全馬の確定馬番・馬名を確認した</label></section>'+
 '<section class="rpaField"><h4>2. 発走前のレース質</h4><label for="rpaQuality">4象限の判断</label>'+
 '<select id="rpaQuality"><option value="">未確認</option><option value="inner_front">内先行</option><option value="inner_closer">内差し</option><option value="outer_front">外先行</option><option value="outer_closer">外差し</option></select>'+
 '<label for="rpaQualitySource">根拠の出典（前日馬場・当日の対象レース前のレースなど）</label><input id="rpaQualitySource" type="text" placeholder="例：前日東京芝の開催映像">'+
 '<label for="rpaEvidence">具体的な判断理由</label><textarea id="rpaEvidence" rows="2" placeholder="内側の伸び／先行馬の有利不利／当日のペース想定"></textarea>'+
 '<label class="rpaCheck"><input id="rpaBefore" type="checkbox"> この根拠は対象レース発走前に把握可能だった</label></section>'+
 '<section class="rpaField"><h4>3. 軸候補・相手候補の適合（記録）</h4><p>適合＝レース質と隊列の両方に明確な利がある。位置予測だけで内外を断定しない。Ability順位上位5頭を表示します。</p>'+
 '<div id="rpaHorseReviews"></div></section>'+
 '<section class="rpaField"><h4>4. 馬券価格と最終判断</h4><label for="rpaTicket">記録する券種</label>'+
 '<select id="rpaTicket"><option value="">未選択</option><option value="wide">ワイド（表示下限オッズ）</option><option value="quinella">馬連</option></select>'+
 '<label for="rpaOdds">発走前に確認した組合せオッズ</label><input id="rpaOdds" inputmode="decimal" type="number" step="0.1" min="1.1" placeholder="例：8.4">'+
 '<label for="rpaObserved">観測日時</label><input id="rpaObserved" type="datetime-local">'+
 '<label for="rpaManualSkip">その他の見送り理由（任意）</label><textarea id="rpaManualSkip" rows="2" placeholder="例：軸馬の発汗が目立ったため手動で見送り"></textarea></section>'+
 '<div class="rpaActions"><button type="button" id="rpaEvaluate">判定内容を更新</button><button type="button" id="rpaDownload" class="rpaSub">見送りを含めJSON保存</button><a href="p3-75-settlement.html" class="rpaSub" style="display:inline-flex;align-items:center;padding:8px 12px;min-height:42px;text-decoration:none;color:#aeeadc;border:1px solid #376673;border-radius:10px">保存JSONの結果・回収率を照合 ↗</a></div>'+
 '<section id="rpaResult" class="rpaResult" aria-live="polite"></section>'+
 '<p class="rpaFoot">P3-73の非重賞単独軸58Rで、相手P10最小ワイド1点の過去実現回収率は128.4%。探索済み年度の事後払戻であり、期待回収率や的中保証ではありません。Pairは別研究。</p></div>';
 anchor.insertAdjacentElement('afterend',el);
 // This informational panel must remain visible even while the official BUY/PASS gate is closed.
 // An inline important display beats legacy selectors that hide direct main children.
 el.style.setProperty('display','block','important');
 return el;
}
function meta(){return{date:$('raceDate')?.value||'',name:$('raceName')?.value||'',venue:$('venue')?.value||'',raceNumber:($('rpaRaceNo')?.value||''),surface:$('surface')?.value||'',grade:$('grade')?.value||'',field:Number($('fieldSize')?.value),distance:Number($('distance')?.value)}}
function raceKey(){const m=meta(),f=$('csvFile')?.files?.[0];return JSON.stringify([m.date,m.name,m.venue,m.grade,m.surface,m.field,m.distance,f?.name,f?.size,f?.lastModified])}
function clearReview(){
 review={};lastResult=null;lastInput=null;
 for(const id of ['rpaRaceNo','rpaRoster','rpaRosterSource','rpaQualitySource','rpaEvidence','rpaOdds','rpaObserved','rpaManualSkip'])if($(id))$(id).value='';
 for(const id of ['rpaAttest','rpaBefore'])if($(id))$(id).checked=false;
 for(const id of ['rpaQuality','rpaTicket'])if($(id))$(id).value='';
 if($('rpaHorseReviews'))$('rpaHorseReviews').innerHTML='';
 if($('rpaResult'))$('rpaResult').textContent='レース条件・CSVが変わりました。新しい内容で判定してください。';
}
let key='';
function fromDom(){
 const q=meta(),aa=root.M3PureAbilityState||{},f=root.Finish600State||{},p=root.PositionRiskState||{},gate=root.RaceSkipLockV1State||{},off=root.ProductionDecisionPipelineV1State||{};
 return{race:q,ability:{ready:aa.ready,activeModel:aa.activeModel,rows:(aa.rows||[]).map(h=>({no:h.no,name:h.name,abilityRank:h.abilityRank,abilityTieEnd:h.abilityTieEnd,histN:h.histN})),
    leaderAmbiguous:aa.leaderAmbiguous,top3BoundaryAmbiguous:aa.top3BoundaryAmbiguous},
  m3:{ready:f.ready,rows:(f.rows||[]).map(h=>({no:h.no,name:h.name,finishRank:h.finishRank})),m3Top3BoundaryAmbiguous:f.m3Top3BoundaryAmbiguous},
  position:{ready:p.ready,rows:(p.rows||[]).map(h=>({no:h.no,name:h.name,p10:h.p10})),
    byNo:Object.fromEntries((p.rows||[]).map(h=>[String(h.no),{no:h.no,name:h.name,p10:h.p10}]))},
  roster:{text:$('rpaRoster')?.value||'',source:$('rpaRosterSource')?.value||'',confirmed:Boolean($('rpaAttest')?.checked)},
  quality:{type:$('rpaQuality')?.value||'',source:$('rpaQualitySource')?.value||'',evidence:$('rpaEvidence')?.value||'',preRaceDeclared:Boolean($('rpaBefore')?.checked)},
  reviews:{...review},
  quote:{ticket:$('rpaTicket')?.value||'',odds:$('rpaOdds')?.value||'',observedAt:$('rpaObserved')?.value||''},
  manualSkip:$('rpaManualSkip')?.value||'',
  official:{gate:gate.status||'未確認',final:off.final?.label||off.final?.status||'未確認',reason:gate.reason||off.final?.reason||''},
  historyWarning:root.RSATargetCsvCache?.version!=='target-csv-cache-p363-history-dedup-shadow'};
}
function renderHorses(){
 const A=root.M3PureAbilityState||{},P=root.PositionRiskState||{},F=root.Finish600State||{};
 const r=$('rpaHorseReviews');if(!r)return;
 if(!A.ready||!F.ready||!Array.isArray(A.rows)||A.rows.length<12){r.textContent='まず「軸・相手・隊列を解析」を実行してください。';return}
 const horses=A.rows.slice().sort((a,b)=>Number(a.abilityRank)-Number(b.abilityRank)).slice(0,5),m=new Map((F.rows||[]).map(z=>[String(z.no),z]));
 const identity=horses.map(h=>String(h.no)+':'+h.name+':'+h.abilityRank).join('|');
 if(r.dataset.identity===identity&&r.children.length)return;
 r.dataset.identity=identity;
 r.innerHTML=horses.map(h=>{
  const no=String(h.no),p=P.byNo?.[no],fh=m.get(no),z=review[no]||{};
  return'<div class="rpaHorse"><div><b>'+e(no)+'番 '+e(h.name)+'</b><small>Ability '+e(h.abilityRank)+'位／M3 '+e(fh?.finishRank??'—')+'位／P10 '+(Number.isFinite(num(p?.p10))?Math.round(100*num(p.p10))+'%':'—')+'</small></div>'+
   '<label for="rpaFit'+e(no)+'">適合評価</label><select data-rpa-fit="'+e(no)+'" id="rpaFit'+e(no)+'">'+
   [['','未評価'],['good','適合'],['neutral','中立'],['bad','不利']].map(([v,l])=>'<option value="'+v+'"'+(v===z.fit?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
   '<label for="rpaWhy'+e(no)+'">位置取り・馬場の理由</label><textarea id="rpaWhy'+e(no)+'" data-rpa-why="'+e(no)+'" rows="2" placeholder="発走前に分かる理由を記入">'+e(z.reason||'')+'</textarea></div>';
 }).join('');
}
function readAssessments(){
 const host=$('rpaHorseReviews');if(!host)return;
 for(const el of host.querySelectorAll('[data-rpa-fit]')){const no=el.dataset.rpaFit;review[no]={fit:el.value,reason:host.querySelector('[data-rpa-why="'+no+'"]')?.value||''}}
}
const statusLabel={hold:'判定保留',skip:'研究上見送り',price_pending:'価格記録待ち',research_complete:'研究候補・記録完了',grade_reference:'重賞：既存判定を確認'};
function draw(){
 const el=$('rpaResult');if(!el)return;
 readAssessments();
 lastInput=fromDom();lastResult=Core.audit(lastInput);const s=lastResult;
 const selected=s.selectedOpponent;
 const officialLabel='<div class="rpaOfficial"><b>本番の購入ゲート：'+e(s.official?.gate||'未確認')+'</b><small>'+e(s.official?.final||'')+'　'+e(s.official?.reason||'')+'</small></div>';
 let html='<h4>研究判断：'+e(statusLabel[s.status]||s.status)+'</h4><p>'+e(s.reason)+'</p>'+officialLabel;
 if(s.overlap?.length)html+='<p><b>'+e(s.structure==='pair'?'Pairの一致2頭':'単独一致軸候補')+'</b>：'+s.overlap.map(h=>e(h.no)+'番 '+e(h.name)+'（Ability'+h.ar+'位／M3'+h.m3+'位）').join('・')+'</p>';
 if(s.axis)html+='<p>軸候補：<b>'+e(s.axis.no)+'番 '+e(s.axis.name)+'</b></p>';
 if(s.opponents?.length)html+='<p>相手3頭：'+s.opponents.map(h=>e(h.no)+'番 '+e(h.name)+(s.preferredOpponent?.no===h.no?'〔P10第一候補〕':'')).join('／')+'</p>';
 if(selected)html+='<p>レース質による相手候補：<b>'+e(selected.no)+'番 '+e(selected.name)+'</b>（購入推薦ではない）</p>';
 if(s.trace?.length)html+='<ol>'+s.trace.map(h=>'<li>'+e(h.message)+'</li>').join('')+'</ol>';
 if(lastInput.historyWarning)html+='<p class="rpaWarn">現在の本番CSVは過去走重複除去版と入力定義が一致しません。履歴整合性を修正するまでは、本番購入条件に昇格できません。</p>';
 html+='<p class="rpaWarn">連系馬券の共同的中確率が未較正のため、自動的な期待値・買い推奨は出しません。入力時刻は発走前であったことの証明ではありません。</p>';
 el.innerHTML=html;
}
function download(){
 draw();if(!lastResult||!lastInput)return;
 const snap=Core.snapshot(lastInput,lastResult),blob=new root.Blob([JSON.stringify(snap,null,2)],{type:'application/json'}),url=root.URL.createObjectURL(blob);
 const a=doc.createElement('a');a.href=url;a.download='buy_skip_audit_'+String(lastInput.race.date||'race').replace(/[^0-9]/g,'')+'.json';a.hidden=true;doc.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),25000);
}
function fillRoster(){
 const a=root.M3PureAbilityState;
 if(!a?.ready||!Array.isArray(a.rows))return;
 const lines=a.rows.slice().sort((u,v)=>Number(u.no)-Number(v.no)).map(h=>h.no+','+h.name).join('\n');
 $('rpaRoster').value=lines;$('rpaAttest').checked=false;
 $('rpaResult').textContent='仮番号から下書きを作成。公式出走表と馬番・馬名を一頭ずつ照合してから確認欄を選択してください。';
}
function init(){
 const el=mount();if(!el||listen)return;
 listen=true;
 el.addEventListener('click',ev=>{
  const id=ev.target?.id;
  if(id==='rpaFillRoster')fillRoster();
  if(id==='rpaEvaluate')draw();
  if(id==='rpaDownload')download();
 });
 el.addEventListener('input',()=>{if(lastResult)$('rpaResult').textContent='入力を変更しました。「判定内容を更新」を押してください。';});
}
function schedule(){
 root.clearTimeout(timer);timer=root.setTimeout(()=>{init();const newKey=raceKey();if(key&&newKey!==key)clearReview();key=newKey;renderHorses();if(!lastResult)$('rpaResult').textContent='購入候補の判定は未実行。上の根拠を記入して「判定内容を更新」してください。';},100);
}
root.RSAPurchaseAuditUIV1=Object.freeze({version:'p3-74-purchase-research-display-v1',refresh:schedule,productionImpact:false});
['m3-pure-ability-ready','finish600-ready','position-risk-ready','production-decision-pipeline-ready','rsa-analysis-complete'].forEach(t=>root.addEventListener(t,schedule));
doc.addEventListener('change',ev=>{if(['raceDate','venue','raceName','grade','fieldSize','surface','distance','csvFile'].includes(ev.target?.id)){clearReview();schedule()}},true);
doc.addEventListener('click',ev=>{if(ev.target?.id==='analyzeBtn'){clearReview();schedule()}},true);
if(doc.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
