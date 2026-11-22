/* Research-only axis × opponent evidence. No automatic opponent/axis or betting changes. */
(function(root){'use strict';
const VERSION='opponent-pair-study-v1-20261122';
const N=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
const ok=v=>Number.isFinite(N(v)),nval=v=>ok(v)?N(v):null;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>root.document?.getElementById(id);
const fmt=v=>ok(v)?N(v).toFixed(1)+'番手':'未計算';
const pc=v=>ok(v)?Math.round(100*N(v))+'%':'未計算';
function style(fr,n){return !ok(fr)||!ok(n)||N(n)<2?'不明':N(fr)>=.7?'前方型':N(fr)<.35?'後方型':'中間型'}
function group(v,n){return !ok(v)||!ok(n)||N(v)<1||N(v)>N(n)?'不明':N(v)<=Math.ceil(n/3)?'前方':N(v)<=Math.ceil(n*2/3)?'中団':'後方'}
function best(rows,key){if(rows.length!==3||rows.some(x=>!ok(x[key])))return null;
 const r=[...rows].sort((a,b)=>N(a[key])-N(b[key])||Number(a.no)-Number(b.no));
 return Math.abs(N(r[0][key])-N(r[1][key]))<=1e-9?null:String(r[0].no);}
function snapshot(){
 const f=root.RSAFocusedThreeTabsState||{},m=root.Finish600State||{},a=root.M3PureAbilityState||{},q=root.ValidatedQueueState||{},p=root.PositionRiskState||{};
 if(!f.analysisReady||!f.axisNo||!Array.isArray(f.partnerNos)||f.partnerNos.length!==3||!m.ready||!a.ready||!q.ready||root.RSAFocusedThreeTabsV1?.dirty)return{ready:false,reason:'必要な事前解析が未確定'};
 const n=(m.rows||[]).length,nums=new Set((m.rows||[]).map(x=>String(x.no)));
 if(n<12||n>18||!nums.has(String(f.axisNo))||new Set(f.partnerNos.map(String)).size!==3||f.partnerNos.some(x=>!nums.has(String(x))||String(x)===String(f.axisNo)))return{ready:false,reason:'対象馬番の照合待ち'};
 function horse(no){no=String(no);const r=m.rows.find(x=>String(x.no)===no),u=a.byNo?.[no]||{},v=q.byNo?.[no]||{},z=p.byNo?.[no]||{};
  return{no,name:String(r?.name||''),abilityRank:nval(u.abilityRank),m3Rank:nval(r?.finishRank),
   predPos:v.validated===true?nval(v.expectedRank):null,front:v.validated===true?nval(v.frontness5):null,historyN:nval(v.hist_n),
   p10:p.ready===true?nval(z.p10):null,lane:String(v.lane||'')};}
 const axis=horse(f.axisNo),partners=f.partnerNos.map(horse),frontCount=(q.rows||[]).filter(x=>x.validated&&ok(x.frontness5)&&N(x.frontness5)>=.7).length;
 const axStyle=style(axis.front,axis.historyN),axGroup=group(axis.predPos,n);
 const rows=partners.map(h=>{const hStyle=style(h.front,h.historyN),hGroup=group(h.predPos,n),gap=ok(h.predPos)&&ok(axis.predPos)?Math.abs(N(h.predPos)-N(axis.predPos)):null;
 const notes=[];
 if(axStyle==='前方型'&&hStyle==='前方型')notes.push('前方型同士：先行争いに注意（消去条件ではない）');
 if(axGroup===hGroup&&axGroup!=='不明')notes.push('同じ位置帯：有利かは未証明');
 if(hGroup==='後方'&&ok(h.m3Rank)&&h.m3Rank>=10)notes.push('後方＋M3二桁：差し届く根拠を確認');
 if(ok(h.p10)&&h.p10>=.5)notes.push('P10高：後方になるリスクを確認');
 if(!notes.length)notes.push('想定ペースと末脚の整合を確認');
 return{...h,style:hStyle,group:hGroup,gap,notes};});
 const paceP=root.MobileAnalysisCoreState?.analysis?.pred?.p;
 const pace=Array.isArray(paceP)&&paceP.length===4&&paceP.every(ok)?['強前傾','前傾','標準','スロー'][paceP.map(N).indexOf(Math.max(...paceP.map(N)))]:null;
 return{ready:true,version:VERSION,axis,axisStyle:axStyle,axisGroup:axGroup,field:n,frontCount,pace,partners:rows,
  methods:{ability:partners[0].no,m3:best(rows,'m3Rank'),p10:best(rows,'p10'),nearest:best(rows,'gap')},
  productionApplied:false,priceThreshold:null};
}
root.RSAOpponentPairStudyV1=Object.freeze({version:VERSION,style,group,best,snapshot});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const styleTag=root.document.createElement('style');styleTag.textContent=
 '#rsafPartners .ops-panel{border:1px solid #456779;border-radius:14px;padding:12px;background:#0e2836;color:#e1eff5;display:grid;gap:8px}' +
 '#rsafPartners .ops-head{font-size:15px;font-weight:900;color:#f0fafb}' +
 '#rsafPartners .ops-intro,#rsafPartners .ops-foot{font-size:11px;color:#a7c0cf;line-height:1.65}' +
 '#rsafPartners .ops-axis{border:1px solid #3e6964;border-radius:10px;background:#12342f;padding:10px;font-size:11px;line-height:1.7}' +
 '#rsafPartners .ops-horse{border:1px solid #355c6c;border-radius:10px;background:#0d2433;padding:10px;display:grid;gap:5px;font-size:11px;line-height:1.6}' +
 '#rsafPartners .ops-horse b{font-size:12px;color:#f0fafb}' +
 '#rsafPartners .ops-horse small{font-size:10px;color:#abc3ce}' +
 '#rsafPartners .ops-summary{border-top:1px solid #3b5968;padding-top:9px;font-size:11px;line-height:1.8}';
(root.document.head||root.document.body)?.appendChild(styleTag);
function render(){const panel=$('rsafPartners');if(!panel)return;panel.querySelector('#opsResearch')?.remove();if(panel.hidden)return;
 const s=snapshot();if(!s.ready)return;const div=root.document.createElement('section');div.id='opsResearch';div.className='ops-panel';
 const items=s.partners.map(h=>'<div class="ops-horse"><b>'+E(h.no)+'番 '+E(h.name)+'　'+E(h.style)+'／'+E(h.group)+'</b><div>P10 '+pc(h.p10)+'　初角 '+fmt(h.predPos)+'　軸との予測位置差 '+(ok(h.gap)?N(h.gap).toFixed(1)+'頭':'未確定')+'</div><small>'+E(h.notes.join('。'))+'</small></div>').join('');
 const methods=Object.entries({ability:'Ability優先',m3:'M3最上位',p10:'P10最小',nearest:'位置差最小'}).map(([k,v])=>E(v)+'：'+(s.methods[k]?E(s.methods[k])+'番':'未確定')).join(' ／ ');
 div.innerHTML='<div class="ops-head">軸との相性｜ペア研究</div><div class="ops-intro">既存の相手3頭を入れ替えず、位置関係だけを点検。個別のワイド確率は未較正。</div><div class="ops-axis">軸 '+E(s.axis.no)+'番 '+E(s.axis.name)+'：'+E(s.axisStyle)+'／'+E(s.axisGroup)+'、P10 '+pc(s.axis.p10)+'。今回の前方型 '+s.frontCount+'頭'+(s.pace?'、ペース本線 '+E(s.pace):'')+'</div>'+items+'<div class="ops-summary"><b>事前比較ルール</b><div>'+methods+'</div></div><div class="ops-foot">これまでの検証ではペア相互作用の追加でワイド1点の的中数は改善していません。ここは研究表示であり、購入ボーダーや消去条件ではありません。</div>';
 const intro=panel.querySelector('#rsaoEvidenceIntro');intro?intro.insertAdjacentElement('afterend',div):panel.insertAdjacentElement('afterbegin',div);
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(render,60)}
['rsa-focused-partner-ready','validated-queue-ready','position-risk-ready','rsa-analysis-complete'].forEach(ev=>root.addEventListener(ev,schedule));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
