/* P3-28 — Standalone, research-only prospective C/V3 receipt.
 * A hash can detect accidental/subsequent edits to the saved JSON, but neither
 * a client clock nor a self-computed hash proves when the record was created.
 * It never writes the production decision, skip lock, ticket or prediction ledgers.
 */
(function(root){'use strict';
const SCHEMA='p3-28-ability-v3-forward-v1';
const N=v=>v===undefined||v===null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fixed=x=>JSON.parse(JSON.stringify(x));
function stable(o){if(Array.isArray(o))return o.map(stable);if(o&&typeof o==='object')return Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])]));return o;}
function stableString(o){return JSON.stringify(stable(o));}
async function sha256(value){if(!root.crypto?.subtle||!root.TextEncoder)throw new Error('SHA-256が利用できません。HTTPSまたはlocalhost上で開いてください');const b=new root.TextEncoder().encode(stableString(value));const d=await root.crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d),v=>v.toString(16).padStart(2,'0')).join('');}
function nowJst(ms){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
function parseStart(date,clock){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(clock||'')))throw new Error('レース日と発走時刻（HH:MM）の形式が不正です');const x=`${date}T${clock}:00+09:00`,ms=Date.parse(x);if(!Number.isFinite(ms)||new Date(ms).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})!==date)throw new Error('発走日時を確認してください');return{iso:x,ms};}
function preRaceGuard(meta,clock,confirmed,nowMs=Date.now()){
 if(!confirmed)throw new Error('公式発走時刻を確認し、チェックを入れてください');
 const s=parseStart(meta.date,clock);
 if(meta.date<nowJst(nowMs))throw new Error('過去レースは発走前予測として登録できません');
 if(nowMs>=s.ms)throw new Error('入力した発走時刻を過ぎています。発走前記録は作成できません');
 return s;
}
function horseRef(h){return{no:Number(h.no),name:String(h.name),cRank:N(h.cRank),v3Rank:N(h.v3Rank),m3Rank:N(h.m3),popularity:N(h.pop),odds:N(h.odds),h730:N(h.h730),peak:N(h.peak),peakMissing:Number(h.miss)===1,historyCount:N(h.histN),historyGapDays:N(h.gap),v3AbilityP3:N(h.V3A),cMarketP3:N(h.CW),v3MarketP3:N(h.V3W),mixedP3:N(h.CWV3)};}
function choice(p){return p?{axis:{no:Number(p.axis.no),name:String(p.axis.name),p3:N(p.axis.p3)},partners:p.partners.map(r=>({no:Number(r.no),name:String(r.name),p3:N(r.p3)}))}:null;}
function buildPayload(current,clock,confirmed,nowMs=Date.now(),raceName=''){
 if(!current?.ok||!current.analysis?.ready)throw new Error(current?.reason||'研究解析が完成していません');
 const a=current.analysis,m=a.meta,sd=preRaceGuard(m,clock,confirmed,nowMs);if(!String(raceName||'').trim()&&!String(a.cardRid||'').trim())throw new Error('レース名か識別IDを入力してください');
 if(!a.cValid||!a.hasMarket||!a.cPick||!a.vPick||!a.cMix||!a.market?.complete)throw new Error('C・V3・全頭オッズの揃った解析が必要です');
 const hs=a.rows.map(horseRef).sort((x,y)=>x.no-y.no),noSet=new Set(hs.map(h=>h.no));
 if(hs.length<12||hs.length>18||hs.length!==noSet.size||hs.length!==m.field||hs.some(h=>!h.name||h.odds===null||h.odds<1||h.cMarketP3===null||h.v3MarketP3===null||h.v3AbilityP3===null))throw new Error('出走馬・確率・オッズが不完全です');
 const payload={
  schema:SCHEMA,capturedAt:new Date(nowMs).toISOString(),clockSource:'device_clock_untrusted',scheduledStartJst:sd.iso,officialTimeConfirmedByUser:true,
  model:{researchVersion:String(a.version),evaluationYear:a.year,trainedThrough:a.modelTrainThrough,v3Source:String(current.source||'')},
  race:{date:m.date,venue:m.venue,name:String(raceName||''),rid:String(a.cardRid||''),surface:m.surface,distance:m.distance,grade:m.grade,field:m.field},
  decision:{productionGateCode:String(a.prodCode||'unknown'),productionStructureAxis:a.productionAxis?{no:Number(a.productionAxis.no),name:String(a.productionAxis.name)}:null,marketStructureP1Top3:N(a.marketP),marketStructureRecheck:Boolean(a.recheck),marketStructureThresholdResearchOnly:0.60},
  picks:{cMarket:choice(a.cPick),v3Market:choice(a.vPick),cAxisMixedPartners:choice(a.cMix)},
  horses:hs,
  notes:'研究専用。個別推定は未較正。発走前の予測固定は端末時刻・利用者申告に依存し、第三者の時刻証明ではない。本番の購入・見送りロックは無変更。'
 };
 validatePayload(payload);return payload;
}
function validatePayload(p){
 if(!p||p.schema!==SCHEMA||typeof p.capturedAt!=='string'||!Number.isFinite(Date.parse(p.capturedAt)))throw new Error('記録のスキーマまたは作成日時が不正です');
 const r=p.race,hs=p.horses;if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Array.isArray(hs)||hs.length<12||hs.length>18||hs.length!==r.field)throw new Error('レース・出走頭数が不正です');
 const sn=new Set(hs.map(x=>Number(x.no)));if(sn.size!==hs.length||hs.some(h=>!Number.isInteger(Number(h.no))||h.no<1||h.no>18||!h.name||N(h.odds)===null||N(h.cMarketP3)===null||N(h.v3MarketP3)===null))throw new Error('出走馬・予測値が不正です');
 const parts=[p.picks?.cMarket,p.picks?.v3Market,p.picks?.cAxisMixedPartners];
 for(const x of parts){if(!x||!sn.has(x.axis?.no)||!Array.isArray(x.partners)||x.partners.length!==4||new Set(x.partners.map(v=>v.no)).size!==4||x.partners.some(v=>!sn.has(v.no)||v.no===x.axis.no))throw new Error('軸または相手の記録が不正です');}
 const start=Date.parse(p.scheduledStartJst);if(!Number.isFinite(start)||!p.officialTimeConfirmedByUser||Date.parse(p.capturedAt)>=start)throw new Error('発走予定時刻より前の記録ではありません');
 if(p.race.date!==p.scheduledStartJst.slice(0,10))throw new Error('日付と発走日時が一致しません');
 return true;
}
async function seal(payload){validatePayload(payload);return{schema:SCHEMA,hashAlgorithm:'SHA-256',sha256:await sha256(payload),payload:fixed(payload)};}
async function verify(receipt){if(!receipt||receipt.schema!==SCHEMA||receipt.hashAlgorithm!=='SHA-256'||!/^[a-f0-9]{64}$/.test(String(receipt.sha256)))throw new Error('P3-28予測記録ではありません');validatePayload(receipt.payload);const d=await sha256(receipt.payload);if(d!==receipt.sha256)throw new Error('予測データのSHA-256が不一致です（編集または破損）');return{ok:true,hash:d,record:receipt.payload};}
function parseTop3(str,p){const ss=String(str||'').normalize('NFKC').trim().split(/[\s,、，]+/).filter(Boolean);if(ss.length!==3||ss.some(s=>!/^\d+$/.test(s)))throw new Error('確定1〜3着を馬番3頭（例：5 9 2）で入力してください');const ns=ss.map(Number),known=new Set(p.horses.map(x=>x.no));if(new Set(ns).size!==3||ns.some(n=>!known.has(n)))throw new Error('馬番の重複・出走表不一致です。同着は別途監査してください');return ns;}
function settle(p,ns){validatePayload(p);if(ns.length!==3||new Set(ns).size!==3)throw new Error('確定上位3頭を入力してください');const win=new Set(ns),picks={};for(const [key,v] of Object.entries(p.picks)){
 const axis=v.axis.no,partners=v.partners.map(x=>x.no),wins=partners.filter(n=>win.has(n));picks[key]={axisNo:axis,axisTop3:win.has(axis),axisTop2:ns.slice(0,2).includes(axis),axisWin:ns[0]===axis,partnerTop3Count:wins.length,axisAndOnePartner:win.has(axis)&&wins.length>=1,axisAndTwoPartners:win.has(axis)&&wins.length>=2};
 }return{top3Nos:ns,picks};}
root.AbilityV3ForwardReceiptCoreV1=Object.freeze({schema:SCHEMA,stableString,sha256,nowJst,parseStart,preRaceGuard,buildPayload,validatePayload,seal,verify,parseTop3,settle});
if(!root.document||typeof root.addEventListener!=='function')return;
const $=id=>root.document.getElementById(id);let imported=null;
function msg(t,error=false){const el=$('av3ForwardStatus');if(!el)return;el.textContent=t;el.dataset.error=error?'1':'0';}
function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function safeName(x){return String(x||'race').replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,50);}
async function freeze(){try{
 const state=root.AbilityV3ResearchPanelBridgeV1?.getCurrent();if(!state?.ok)throw new Error(state?.reason||'先に研究解析を実行してください');
 const clock=$('av3ScheduledStart')?.value,confirmed=$('av3OfficialConfirmed')?.checked,accept=$('av3PreRaceDeclaration')?.checked;
 if(!accept)throw new Error('発走前の研究予測であることを確認してください');
 const payload=buildPayload(state,clock,confirmed,Date.now(),$('raceName')?.value||'');const receipt=await seal(payload);
 const today=payload.race.date.replace(/-/g,''),venue=safeName(payload.race.venue),hash=receipt.sha256.slice(0,12);
 download(`P3-28_${today}_${venue}_C-V3_before_${hash}.json`,receipt);
 msg('予測JSONを出力しました。ファイルアプリ等へ保存し、レース後はこのJSONを読み込んで照合してください。端末時計による記録であり、第三者による時刻証明ではありません。');
 }catch(e){msg('保存できません：'+e.message,true);}}
async function importReceipt(file){imported=null;if(!file)return;try{
 if(file.size>400000)throw new Error('研究記録としてファイルが大きすぎます');const r=JSON.parse(await file.text()),v=await verify(r);imported=r;
 const p=r.payload;
 $('av3ReceiptInfo').innerHTML=`<b>検証一致（SHA-256）</b>｜${E(p.race.date)} ${E(p.race.venue)} ${E(p.race.name)}　${E(p.race.grade)} ${E(p.race.field)}頭<br>作成端末時刻：${E(p.capturedAt)}｜確認した発走予定：${E(p.scheduledStartJst)}<br>C軸 ${E(p.picks.cMarket.axis.no)}／V3軸 ${E(p.picks.v3Market.axis.no)}｜市場構造 ${p.decision.marketStructureP1Top3===null?'—':(100*p.decision.marketStructureP1Top3).toFixed(1)+'%'}<br><small>これは記録内容の照合であり、第三者時刻証明ではありません。</small>`;
 msg('予測JSONのハッシュ検証が一致しました。確定1〜3着を入力すれば別ファイルで結果を保存できます。');
 }catch(e){$('av3ReceiptInfo').textContent='予測JSON未検証';msg('読込・検証失敗：'+e.message,true);}}
async function resultCheck(){try{
 if(!imported)throw new Error('発走前に保存した予測JSONを読み込んでください');
 await verify(imported);
 if(Date.now()<Date.parse(imported.payload.scheduledStartJst))throw new Error('発走予定時刻前です。結果はレース後に登録してください');
 if(!$('av3OfficialResultConfirmed')?.checked)throw new Error('公式の確定着順を確認してチェックしてください');
 const top3=parseTop3($('av3ResultTop3').value,imported.payload),result=settle(imported.payload,top3),value={schema:'p3-28-ability-v3-settlement-v1',predictionSha256:imported.sha256,settledAt:new Date().toISOString(),officialResultConfirmedByUser:true,result};
 const p=imported.payload;
 const lines=[['市場＋C',result.picks.cMarket],['市場＋V3',result.picks.v3Market],['C軸＋混合相手',result.picks.cAxisMixedPartners]].map(([name,x])=>`${name}：軸3着内${x.axisTop3?'○':'×'}／軸＋相手1頭${x.axisAndOnePartner?'○':'×'}／軸＋相手2頭${x.axisAndTwoPartners?'○':'×'}`);
 $('av3ReceiptInfo').textContent=`SHA-256照合済み｜${p.race.date} ${p.race.venue} ${p.race.name}\n結果 1着${top3[0]}・2着${top3[1]}・3着${top3[2]}\n`+lines.join('\n');
 download(`P3-28_${p.race.date.replace(/-/g,'')}_${safeName(p.race.venue)}_results_${imported.sha256.slice(0,12)}.json`,value);
 msg('結果照合JSONを別ファイルで出力しました。発走前予測の原本は書き換えていません。実際の払戻・ROIは未計算です。');
 }catch(e){msg('結果を保存できません：'+e.message,true);}}
function init(){const panel=$('av3ResearchPanel'),body=panel?.querySelector('.av3-body');if(!body||$('av3ForwardPanel'))return;
 const div=document.createElement('section');div.id='av3ForwardPanel';div.className='av3-forward';div.innerHTML=`<h3>発走前予測の固定・結果照合（研究専用）</h3>
 <p>現在のC・V3研究予測、全頭オッズ、軸、相手4頭、見送り理由をハッシュ付きJSONに保存。予測は端末外で保管し、結果は別ファイルで照合します。</p>
 <label for="av3ScheduledStart">公式の発走予定時刻（日本時間）</label><input type="time" id="av3ScheduledStart" autocomplete="off" />
 <label class="av3-forward-check"><input type="checkbox" id="av3OfficialConfirmed" />公式発走時刻と照合しました</label>
 <label class="av3-forward-check"><input type="checkbox" id="av3PreRaceDeclaration" />発走前の予測であり、現在の出走表・オッズを確認しました</label>
 <button type="button" id="av3FreezeBtn">発走前の研究予測をJSON保存</button>
 <div class="av3-forward-divider"></div>
 <label for="av3ReceiptFile">保存した発走前JSONを読み込んで検証</label><input id="av3ReceiptFile" type="file" accept="application/json,.json" />
 <div id="av3ReceiptInfo" class="av3-forward-info" aria-live="polite">予測JSON未検証</div>
 <label for="av3ResultTop3">レース後の確定1・2・3着馬番（例：5 9 2）</label><input type="text" id="av3ResultTop3" placeholder="5 9 2" inputmode="numeric" autocomplete="off" />
 <label class="av3-forward-check"><input type="checkbox" id="av3OfficialResultConfirmed" />公式発表の確定1〜3着を確認しました（同着は別途確認）</label>
 <button type="button" id="av3SettleBtn" class="secondary">結果を照合して別JSONで保存</button>
 <div id="av3ForwardStatus" class="av3-forward-status" role="status">注意：端末時刻と利用者入力の発走時刻に基づくため、第三者の時刻証明・改ざん不可能な保存ではありません。本番の見送りロックは変更しません。</div>`;
 body.appendChild(div);$('av3FreezeBtn').addEventListener('click',freeze);$('av3ReceiptFile').addEventListener('change',e=>importReceipt(e.target.files?.[0]));$('av3SettleBtn').addEventListener('click',resultCheck);
}
if(document.readyState==='loading')root.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
