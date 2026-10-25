(()=>{'use strict';
if(!window.RSAMobileLean||window.__WIDE_SIGNAL_V1)return;window.__WIDE_SIGNAL_V1=true;
const V='wide-signal-v1.1',MIN_NEFF=0.35828045612154874,MAX_NEFF=0.5125919145914545,MIN_WIDE=5,BC_MIN=2,BC_MAX=12,$=id=>document.getElementById(id);
let raf=0,lastSig='';
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join('-');
function schedule(ms=0){setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})},ms)}
function mapByNo(st){return st?.byNo||Object.fromEntries((st?.rows||[]).map(r=>[String(r.no),r]))}
function p10Penalty(p){return p>=.65?4:p>=.50?2:p>=.20?1:0}
function fieldSize(){return Number($('fieldSize')?.value)||Number(window.Finish600State?.rows?.length)||0}
function eligible(){const f=fieldSize(),g=String($('grade')?.value||'').toUpperCase();return f>=12&&/^(G1|G2|G3|L|OP|3勝)$/.test(g)}
function frameSizes(total){const f=Number(total);if(!(f>=8&&f<=18))return[];const s=Array(8).fill(1);let extra=f-8;for(let i=7;i>=0&&extra>0;i--,extra--)s[i]++;for(let i=7;i>=0&&extra>0;i--,extra--)s[i]++;return s}
function frameOf(no,total){const sizes=frameSizes(total);let x=Number(no),acc=0;if(!sizes.length||!(x>=1&&x<=total))return null;for(let i=0;i<sizes.length;i++){acc+=sizes[i];if(x<=acc)return i+1}return null}
function expectedFrameKeys(total){const s=frameSizes(total),out=[];for(let a=1;a<=8;a++)for(let b=a;b<=8;b++){if(a===b&&s[a-1]<2)continue;out.push(key(a,b))}return out}
function parseFrameOdds(text){const m=new Map;for(const line of String(text||'').split(/\r?\n/)){const z=line.normalize('NFKC').match(/\d+(?:\.\d+)?/g)?.map(Number)||[];if(z.length<3)continue;const a=Math.trunc(z[0]),b=Math.trunc(z[1]),od=Number(z[2]);if(a<1||a>8||b<1||b>8||!(od>0))continue;m.set(key(a,b),{a,b,od})}return m}
function parseWideOdds(text){const m=new Map;for(const line of String(text||'').split(/\r?\n/)){const z=line.normalize('NFKC').match(/\d+(?:\.\d+)?/g)?.map(Number)||[];if(z.length<3)continue;const a=Math.trunc(z[0]),b=Math.trunc(z[1]),low=Number(z[2]),high=z[3]>0?Number(z[3]):null;if(a<1||b<1||a===b||!(low>0))continue;m.set(key(a,b),{a,b,low,high})}return m}
function frameMarket(){
  const total=fieldSize(),expected=expectedFrameKeys(total),raw=parseFrameOdds($('wideFrameOddsPaste')?.value||''),missing=expected.filter(k=>!raw.has(k));
  if(!expected.length)return{ready:false,complete:false,count:raw.size,expected:0,missing:[],reason:'頭数を入力してください',band:'WAIT'};
  if(missing.length)return{ready:Boolean(raw.size),complete:false,count:raw.size,expected:expected.length,missing,reason:`枠連オッズ ${raw.size}/${expected.length}`,band:'WAIT'};
  const rows=expected.map(k=>({...raw.get(k),k})).sort((a,b)=>a.od-b.od||a.a-b.a||a.b-b.b);rows.forEach((r,i)=>r.rank=i+1);
  const over=rows.reduce((s,r)=>s+1/r.od,0);rows.forEach(r=>r.p=(1/r.od)/over);
  const hhi=rows.reduce((s,r)=>s+r.p*r.p,0),neff=hhi?1/hhi:NaN,ratio=neff/rows.length,byKey=Object.fromEntries(rows.map(r=>[r.k,r]));
  const band=ratio<MIN_NEFF?'LOW':ratio<=MAX_NEFF?'MID':'HIGH';
  return{ready:true,complete:true,count:rows.length,expected:rows.length,rows,byKey,neff,ratio,band,pass:band==='MID',reason:band==='MID'?'中間市場':band==='HIGH'?'HIGH市場':'LOW市場'}
}
function zone(rank){return[2,3,10,11,12].includes(Number(rank))?'B':Number(rank)>=4&&Number(rank)<=9?'C':'—'}
function horseMeta(no){const A=mapByNo(window.M3PureAbilityState),P=mapByNo(window.PositionRiskState),Q=mapByNo(window.ValidatedQueueState),F=(window.Finish600State?.rows||[]).find(x=>String(x.no)===String(no)),a=A[String(no)]||{},p=P[String(no)]||{},q=Q[String(no)]||{};return{no:String(no),name:String(F?.name||a.name||''),ar:Number(a.abilityRank)||99,m3:Number(F?.finishRank)||99,p10:n(p.p10),front:n(q.frontness5)}}
function allHorseRows(axisNo){const F=window.Finish600State?.rows||[],A=mapByNo(window.M3PureAbilityState),P=mapByNo(window.PositionRiskState),Q=mapByNo(window.ValidatedQueueState),total=fieldSize();return F.filter(f=>String(f.no)!==String(axisNo)).map(f=>{const no=String(f.no),a=A[no]||{},p=P[no]||{},q=Q[no]||{},ar=Number(a.abilityRank)||99,m3=Number(f.finishRank)||99,p10=n(p.p10),front=n(q.frontness5);return{no,name:String(f.name||a.name||''),frame:frameOf(no,total),ar,m3,p10,front,score:ar+m3+(Number.isFinite(p10)?p10Penalty(p10):2)}})}
function structural(){const F=window.Finish600State?.rows||[],A=mapByNo(window.M3PureAbilityState);return F.map(f=>{const a=A[String(f.no)]||{};return{no:String(f.no),name:String(f.name||a.name||''),ar:Number(a.abilityRank)||99,m3:Number(f.finishRank)||99}}).filter(x=>x.ar<=3&&x.m3<=3).sort((a,b)=>a.ar-b.ar||a.m3-b.m3||Number(a.no)-Number(b.no))}
function signalType(){
  if(!eligible()||!window.Finish600State?.ready||!window.M3PureAbilityState?.ready)return{type:'WAIT',axis:null,label:'構造計算待ち'};
  const c=structural(),official=window.DecisionShellV2State?.structure||{};
  if(c.length===1&&c[0].ar===2)return{type:'A2',axis:c[0],label:'A2 CORE'};
  if(c.length===2){const a1=c.find(x=>x.ar===1);if(a1)return{type:'PAIR2',axis:a1,label:'PAIR2 SECOND',partner:c.find(x=>x.no!==a1.no)||null}}
  if(c.length===1&&c[0].ar===1&&official.level==='red')return{type:'A1_RED',axis:c[0],label:'LOGIC C'};
  return{type:'NONE',axis:null,label:'該当シグナルなし'}
}
function candidates(axis,fm){if(!axis||!fm?.complete)return[];const total=fieldSize(),af=frameOf(axis.no,total);if(!af)return[];const frames=[];for(let f=1;f<=8;f++){const mr=fm.byKey?.[key(af,f)];if(!mr||mr.rank<BC_MIN||mr.rank>BC_MAX)continue;frames.push({frame:f,frameRank:mr.rank,zone:zone(mr.rank),frameOdds:mr.od})}const horses=allHorseRows(axis.no),reps=[];for(const fr of frames){const hs=horses.filter(h=>h.frame===fr.frame).sort((a,b)=>a.score-b.score||a.ar-b.ar||a.m3-b.m3||Number(a.no)-Number(b.no));if(hs[0])reps.push({...hs[0],...fr})}reps.sort((a,b)=>a.score-b.score||a.ar-b.ar||a.m3-b.m3||a.frameRank-b.frameRank||Number(a.no)-Number(b.no));reps.forEach((r,i)=>r.rank=i+1);return reps}
function logicCEligible(sig,fm){if(sig.type!=='A1_RED'||fm.band!=='MID'||!sig.axis)return false;const meta=horseMeta(sig.axis.no);return Number.isFinite(meta.front)&&meta.front<.50}
function selectRows(sig,cands,wide,fm){let base=[];if(sig.type==='A2'&&fm.band==='MID')base=cands[0]?[cands[0]]:[];else if(sig.type==='PAIR2'&&(fm.band==='MID'||fm.band==='HIGH'))base=cands[1]?[cands[1]]:[];else if(logicCEligible(sig,fm))base=cands.slice(0,2);return base.map(c=>{const w=wide.get(key(sig.axis.no,c.no)),priceReady=Boolean(w),pricePass=Boolean(w&&w.low>=MIN_WIDE);return{...c,wide:w||null,priceReady,pricePass,role:sig.type==='A2'?'CORE':sig.type==='PAIR2'?'SECOND':'C',pair:key(sig.axis.no,c.no)}})}
function logicStates(sig,fm,rows){
  const a2={name:'A2 CORE',tone:'off',status:'—'};
  const p2={name:'PAIR2 SECOND',tone:'off',status:'—'};
  const lc={name:'LOGIC C',tone:'off',status:'—'};
  if(sig.type==='A2'){
    if(!fm.complete)a2.status='WAIT';else if(fm.band!=='MID')a2.status='市場外';else if(!rows.length)a2.status='相手なし';else if(rows.some(r=>r.pricePass)){a2.tone='green';a2.status='BUY候補'}else a2.status=rows.some(r=>r.priceReady)?'価格不足':'オッズ待ち';
  }
  if(sig.type==='PAIR2'){
    if(!fm.complete)p2.status='WAIT';else if(fm.band==='LOW')p2.status='市場外';else if(!rows.length)p2.status='相手なし';else if(rows.some(r=>r.pricePass)){p2.tone=fm.band==='MID'?'green':'yellow';p2.status=fm.band==='MID'?'BUY候補':'前向き検証'}else p2.status=rows.some(r=>r.priceReady)?'価格不足':'オッズ待ち';
  }
  if(sig.type==='A1_RED'){
    if(!fm.complete)lc.status='WAIT';else if(fm.band!=='MID')lc.status='市場外';else if(!logicCEligible(sig,fm))lc.status='front条件外';else if(!rows.length)lc.status='相手なし';else if(rows.some(r=>r.pricePass)){lc.tone='yellow';lc.status='前向き検証'}else lc.status=rows.some(r=>r.priceReady)?'価格不足':'オッズ待ち';
  }
  return[a2,p2,lc]
}
function ensureCss(){if($('wide-signal-v1-css'))return;const s=document.createElement('style');s.id='wide-signal-v1-css';s.textContent=`#wsv1{border:1px solid #31566a;background:#081b27;border-radius:14px;padding:10px;margin:8px 0}.wsvHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.wsvHead b{font-size:12px;color:#edf7fb}.wsvHead span{font-size:7px;color:#9bb2bd;border:1px solid #385a6b;border-radius:999px;padding:3px 6px}.wsvRule{font-size:8px;line-height:1.55;color:#8da8b4;margin-top:6px}.wsvGate{margin-top:7px;border:1px solid #355364;border-radius:10px;padding:8px;background:#0a202c}.wsvGate.pass{border-color:#3f7661;background:#0d2923}.wsvGate.track{border-color:#776636;background:#292414}.wsvGate.stop{border-color:#6a4b4f;background:#25191d}.wsvGate.wait{border-color:#756436;background:#292414}.wsvGate b{font-size:10px}.wsvGate small{display:block;margin-top:3px;font-size:7px;color:#8da7b3;line-height:1.45}.wsvLogicList{display:grid;gap:5px;margin-top:8px}.wsvLogicItem{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #2d4b5a;background:#091b25;border-radius:9px;padding:7px 8px}.wsvLogicItem b{font-size:9px;color:#dcebf1}.wsvLogicItem span{font-size:8px;font-weight:900;color:#879ba4}.wsvLogicItem.green{border-color:#407a64;background:#0c2922}.wsvLogicItem.green span{color:#9ee4c2}.wsvLogicItem.yellow{border-color:#756536;background:#292414}.wsvLogicItem.yellow span{color:#efd77f}.wsvInput{margin-top:7px;border:1px solid #29495a;border-radius:10px;background:#091925}.wsvInput>summary{list-style:none;min-height:40px;display:flex;align-items:center;padding:0 9px;font-size:9px;font-weight:900;color:#a9c1cc}.wsvInput>summary::-webkit-details-marker{display:none}.wsvInputBody{padding:8px;border-top:1px solid #29495a;display:grid;gap:7px}.wsvInput label{font-size:8px;color:#91abb7}.wsvInput textarea{width:100%;min-height:74px;box-sizing:border-box;margin-top:4px}.wsvSignal{margin-top:8px;border:1px solid #365767;border-radius:11px;padding:8px;background:#0a202b}.wsvSignal.green{border-color:#3e7c64;background:#0c2a22}.wsvSignal.yellow{border-color:#776636;background:#292414}.wsvSignal.off{opacity:.72}.wsvSigTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.wsvSigTop b{font-size:11px;color:#eef8fb}.wsvSigTop span{font-size:8px;font-weight:900}.wsvSignal.green .wsvSigTop span{color:#9ee4c2}.wsvSignal.yellow .wsvSigTop span{color:#efd77f}.wsvAxis{font-size:8px;color:#9bb2bd;margin-top:4px}.wsvRows{display:grid;gap:5px;margin-top:7px}.wsvRow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:6px;align-items:center;border:1px solid #2f4c5b;border-radius:9px;padding:7px;background:#0a1c26}.wsvRow.buy{border-color:#407a64}.wsvRow.track{border-color:#756536}.wsvRow.pass{opacity:.62}.wsvRole{font-size:7px;font-weight:900;color:#a9c2cc}.wsvMain b{display:block;font-size:10px;color:#edf7fb}.wsvMain small{display:block;font-size:7px;color:#849fab;margin-top:2px;line-height:1.4}.wsvStatus{font-size:8px;font-weight:900;white-space:nowrap}.wsvRow.buy .wsvStatus{color:#9ee4c2}.wsvRow.track .wsvStatus{color:#efd77f}.wsvRow.pass .wsvStatus{color:#91a1a8}.wsvFoot{font-size:7px;line-height:1.45;color:#7895a2;margin-top:7px}@media(max-width:390px){.wsvRow{grid-template-columns:40px minmax(0,1fr)}.wsvStatus{grid-column:2}}`;document.head.appendChild(s)}
function ensureRoot(){ensureCss();let r=$('wsv1');if(r)return r;const ticket=$('imsTicket');if(!ticket)return null;r=document.createElement('section');r.id='wsv1';const body=$('imsTicketBody');if(body)ticket.insertBefore(r,body);else ticket.appendChild(r);return r}
function ensureInputs(root){let details=$('wsv1Inputs');if(!details){details=document.createElement('details');details.id='wsv1Inputs';details.className='wsvInput';details.innerHTML='<summary>枠連・ワイドオッズ入力</summary><div class="wsvInputBody"><label>枠連オッズ（例 1-2 5.4）<textarea id="wideFrameOddsPaste" placeholder="1-1 12.4\n1-2 5.4\n1-3 8.1"></textarea></label><div id="wsvWideInputSlot"></div><div class="wsvRule">枠連は対象組み合わせをすべて入力すると市場帯を確定します。ワイドは「馬番-馬番 下限 上限」で入力。下限5.0倍を判定に使用します。</div></div>';root.appendChild(details)}const slot=$('wsvWideInputSlot');if(slot&&!$('qmdWidePaste')){slot.innerHTML='<label>ワイドオッズ（例 3-7 5.2 6.0）<textarea id="qmdWidePaste" placeholder="3-7 5.2 6.0\n3-13 8.4 9.5"></textarea></label>'}else if(slot&&$('qmdWidePaste')&&!slot.contains($('qmdWidePaste'))){slot.innerHTML='<div class="wsvRule">ワイドオッズは既存の入力欄を使用します。</div>'}return details}
function rowHtml(r,sig,fm){const od=r.wide?`${r.wide.low.toFixed(1)}${r.wide.high?`–${r.wide.high.toFixed(1)}`:''}倍`:'オッズ待ち';let c='pass',st='WAIT';if(r.priceReady&&!r.pricePass){st='価格不足'}else if(r.pricePass&&sig.type==='A2'){c='buy';st='BUY候補'}else if(r.pricePass&&sig.type==='PAIR2'&&fm.band==='MID'){c='buy';st='BUY候補'}else if(r.pricePass){c='track';st='検証記録'}return`<div class="wsvRow ${c}"><div class="wsvRole">${esc(r.role)}</div><div class="wsvMain"><b>${esc(r.no)}番 ${esc(r.name)}｜${esc(od)}</b><small>${r.zone}枠帯・枠連${r.frameRank}位｜Ability #${r.ar}・M3 #${r.m3}・P10 ${Number.isFinite(r.p10)?Math.round(r.p10*100)+'%':'—'}｜構造Score ${r.score}</small></div><div class="wsvStatus">${st}</div></div>`}
function render(){
  const root=ensureRoot();if(!root){setTimeout(schedule,250);return}ensureInputs(root);
  const fm=frameMarket(),sig=signalType(),wide=parseWideOdds($('qmdWidePaste')?.value||''),cands=fm.complete&&sig.axis?candidates(sig.axis,fm):[],rows=selectRows(sig,cands,wide,fm),states=logicStates(sig,fm,rows);
  const gateClass=!fm.complete?'wait':fm.band==='MID'?'pass':fm.band==='HIGH'?'track':'stop';
  const gateText=!fm.complete?`🟡 ${fm.reason}`:fm.band==='MID'?'🟢 MID市場':fm.band==='HIGH'?'🟡 HIGH市場':'🔴 LOW市場';
  const ratio=Number.isFinite(fm.ratio)?fm.ratio.toFixed(3):'—';
  const body=`<div class="wsvHead"><b>WIDE SIGNAL</b><span>3ロジック</span></div><div class="wsvRule">枠連B・C（2〜12位） / ワイド下限 ${MIN_WIDE.toFixed(1)}倍。Neff MIDは ${MIN_NEFF.toFixed(3)}–${MAX_NEFF.toFixed(3)}。相手選定に単勝人気は使いません。</div><div class="wsvGate ${gateClass}"><b>${gateText}</b><small>枠連 Neff比 ${ratio}｜${fm.complete?`${fm.count}/${fm.expected}組 完了`:fm.reason}</small></div><div class="wsvLogicList">${states.map(x=>`<div class="wsvLogicItem ${x.tone}"><b>${x.name}</b><span>${x.status}</span></div>`).join('')}</div>`;
  const activeState=states.find(x=>x.tone!=='off'),tone=activeState?.tone||'off',status=activeState?.status||'OFF';
  const axis=sig.axis?`${sig.axis.no}番 ${esc(sig.axis.name)}（Ability #${sig.axis.ar} / M3 #${sig.axis.m3}${Number.isFinite(horseMeta(sig.axis.no).front)?` / front ${Math.round(horseMeta(sig.axis.no).front*100)}%`:''}）`:'—';
  let detail='';
  if(sig.type!=='NONE'&&sig.type!=='WAIT'){
    let msg='';
    if(!fm.complete)msg='枠連オッズを完成すると候補を確定します。';
    else if(sig.type==='A2'&&fm.band!=='MID')msg='A2 COREはMID市場だけをBUY判定します。';
    else if(sig.type==='PAIR2'&&fm.band==='LOW')msg='PAIR2 SECONDはMID/HIGH市場だけを対象にします。';
    else if(sig.type==='A1_RED'&&!logicCEligible(sig,fm))msg=fm.band!=='MID'?'LOGIC CはMID市場だけを前向き記録します。':'LOGIC Cはfrontness 50%未満だけを前向き記録します。';
    else if(!rows.length)msg='B/C枠に条件を満たす相手候補がありません。';
    detail=`<div class="wsvSignal ${tone}"><div class="wsvSigTop"><b>${esc(sig.label)}</b><span>${status}</span></div><div class="wsvAxis">軸：${axis}</div><div class="wsvRows">${rows.length?rows.map(r=>rowHtml(r,sig,fm)).join(''):`<div class="wsvFoot">${msg}</div>`}</div></div>`;
  }
  const oldInputs=$('wsv1Inputs');root.innerHTML=body+detail+'<div class="wsvFoot">🟢 A2 CORE / PAIR2 SECOND MID＝BUY候補。🟡 PAIR2 HIGH / LOGIC C＝前向き検証のみ。A2 PLUSは表示・購入対象から外します。資金配分は自動変更しません。</div>';if(oldInputs)root.appendChild(oldInputs);else ensureInputs(root);
  const state={ready:true,version:V,gate:{complete:fm.complete,band:fm.band,pass:fm.band==='MID',neffRatio:fm.ratio,min:MIN_NEFF,max:MAX_NEFF},signal:sig,axis:sig.axis,candidates:cands,rows,logicStates:states,lockedRules:{wideMin:MIN_WIDE,frameRankMin:BC_MIN,frameRankMax:BC_MAX,neffMin:MIN_NEFF,neffMax:MAX_NEFF,logicCFrontMax:.50},manualStake:true,autoBet:false,at:Date.now()};
  window.WideSignalV1State=state;
  const signature=JSON.stringify([fm.complete,fm.band,fm.ratio,sig.type,sig.axis?.no,cands.map(x=>[x.no,x.rank,x.frameRank,x.score]),rows.map(x=>[x.no,x.wide?.low]),states.map(x=>[x.name,x.status]),$('wideFrameOddsPaste')?.value,$('qmdWidePaste')?.value]);
  if(signature!==lastSig){lastSig=signature;dispatchEvent(new CustomEvent('wide-signal-v1-ready',{detail:state}))}
}
['decision-shell-v2-ready','opponent-candidate-pool-ready','finish600-ready','m3-pure-ability-ready','position-risk-ready','validated-queue-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(30)));
document.addEventListener('input',e=>{if(['wideFrameOddsPaste','qmdWidePaste','fieldSize','grade'].includes(e.target?.id))schedule(50)},true);document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))schedule(100)},true);if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(120),{once:true});else schedule(100);setTimeout(()=>schedule(),800);window.WideSignalV1={ready:true,version:V,render,schedule};
})();