(()=>{'use strict';
const C=window.ShapeCore,$=id=>document.getElementById(id);if(!C)return;
let MODEL=null,lastCtx=null,busy=false;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const med=a=>{a=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const sd0=a=>{a=a.filter(Number.isFinite);if(!a.length)return NaN;const m=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)};
function predict(x){let z=Number(MODEL.intercept)||0;for(let i=0;i<MODEL.features.length;i++){const k=MODEL.features[i],raw=Number(x[k]),imp=Number(MODEL.imputer_median[i]),v=Number.isFinite(raw)?raw:imp,mu=Number(MODEL.scaler_mean[i])||0,sc=Number(MODEL.scaler_scale[i])||1;z+=(Number(MODEL.coef[i])||0)*((v-mu)/sc)}return 1/(1+Math.exp(-z))}
function band(p){const lo=Number(MODEL.band_cutpoints_train_only?.rear_chance_max),hi=Number(MODEL.band_cutpoints_train_only?.front_favour_min);if(p>=hi)return{key:'front',icon:'🟢',title:'前有利傾向',cls:'rsbFront',desc:'前方にいる馬が相対的に残りやすい構造。後方型はM3上位でも展開整合を確認。'};if(p<=lo)return{key:'rear',icon:'🔵',title:'後方にもチャンス',cls:'rsbRear',desc:'前有利が強く出にくい構造。後方型を位置取りだけで下げすぎない。'};return{key:'neutral',icon:'⚪',title:'中立',cls:'rsbNeutral',desc:'前後どちらかへ強く寄せる根拠は弱い。Ability・隊列・M3をそのまま優先。'}}
function pressureText(a){const p=a?.pressure;return p==='高'?'先行圧 高':p==='低'?'先行圧 低':'先行圧 中'}
function queueText(vals){if(vals.length<2)return'隊列履歴不足';const m=med(vals),s=sd0(vals);const pos=m>=.52?'前寄り':m<=.38?'後ろ寄り':'標準';const spread=s>=.255?'ばらける':s<=.205?'密集':'標準';return`隊列 ${pos}・${spread}`}
function render(){if(busy||!MODEL||!lastCtx?.analysis)return;busy=true;try{
  const {meta,analysis}=lastCtx,S=window.ValidatedQueueState,field=Number(meta?.fieldSize)||Number(S?.fieldSize)||0;if(field<2)return;
  const qrows=(S?.rows||[]),qvals=qrows.filter(r=>Number(r.hist_n)>0&&Number.isFinite(Number(r.frontness5))).map(r=>Number(r.frontness5));
  const x={distance:Number(meta?.distance)||1600,field,surface_dirt:String(meta?.surface||'').includes('ダ')?1:0,escape_exp:Number(analysis?.f?.escape_exp),front_pressure:Number(analysis?.f?.front_pressure),queue_med:med(qvals),queue_spread:sd0(qvals)};
  const p=predict(x),b=band(p),validated=field>=12,coverage=field?qvals.length/field:0;
  let root=$('raceShapeBias');if(!root){root=document.createElement('div');root.id='raceShapeBias';const anchor=$('qValidationPanel')||$('qRealTrack')||$('sQueue');if(anchor?.parentElement)anchor.insertAdjacentElement('afterend',root);else $('sQueue')?.appendChild(root)}
  if(!root)return;
  const badge=validated?'2024–26 OOS検証済み':'参考｜12頭未満は検証外';
  root.innerHTML=`<div class="rsbHead"><div><b>展開バイアス</b><span>Race Shape</span></div><em>${badge}</em></div><div class="rsbMain ${b.cls}"><div class="rsbTitle">${b.icon} ${b.title}</div><div class="rsbDesc">${b.desc}</div></div><div class="rsbFacts"><span>${pressureText(analysis)}</span><span>${queueText(qvals)}</span><span>隊列履歴 ${Math.round(coverage*100)}%</span></div><div class="rsbFoot">判定本体は <b>逃げ・先行圧＋予測隊列</b>のみ。高速追走耐性と中盤緩みはこの判定に加えていません。M3順位・勝率・Top3確率は変更しません。実装版OOS：AUC .567（条件のみ .523、Δ+.044、95%CI +.019〜+.067）。</div>`;
  window.RaceShapeBiasState={ready:true,version:MODEL.version,band:b.key,label:b.title,score:p,validated,features:x,queueCoverage:coverage,policy:{m3Correction:false,probabilityCorrection:false,standaloneBetRule:false}};
  dispatchEvent(new CustomEvent('race-shape-bias-ready',{detail:window.RaceShapeBiasState}));
}catch(e){console.warn('race shape bias',e)}finally{busy=false}}
const css=document.createElement('style');css.textContent=`#raceShapeBias{margin:9px 0 12px;border:1px solid #2b5267;background:#081c29;border-radius:14px;padding:10px}.rsbHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.rsbHead>div{display:flex;align-items:center;gap:7px}.rsbHead b{font-size:12px}.rsbHead span,.rsbHead em{font-size:8px;font-style:normal;border:1px solid #315a70;border-radius:999px;padding:3px 6px;color:#9bbaca}.rsbMain{margin-top:8px;border-radius:11px;padding:9px;border:1px solid #315063}.rsbTitle{font-size:13px;font-weight:950}.rsbDesc{font-size:9px;line-height:1.55;color:#b4c9d4;margin-top:4px}.rsbFront{background:#0d2923;border-color:#2f6d58}.rsbFront .rsbTitle{color:#7ce6bc}.rsbNeutral{background:#101f29}.rsbNeutral .rsbTitle{color:#d9e7ed}.rsbRear{background:#0d2332;border-color:#315f7a}.rsbRear .rsbTitle{color:#8fd4ff}.rsbFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.rsbFacts span{font-size:8px;text-align:center;background:#0b2635;border-radius:8px;padding:5px;color:#9fb9c7}.rsbFoot{font-size:8px;color:#7897a7;line-height:1.55;margin-top:7px}.rsbFoot b{color:#b8d3df}@media(max-width:520px){.rsbFacts{grid-template-columns:1fr 1fr}.rsbFacts span:last-child{grid-column:1/-1}}`;document.head.appendChild(css);
function go(){[70,180,360,700,1300,2300,4200].forEach(t=>setTimeout(render,t))}
const old=C.analyze;C.analyze=function(meta,odds,horses,M){const a=old(meta,odds,horses,M);lastCtx={meta,analysis:a};go();return a};
fetch('data/race_shape_bias_oos_v1.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{MODEL=x;go()}).catch(e=>console.warn('race shape model',e));
['validated-queue-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,go));addEventListener('load',go);document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn'||e.target?.id==='parseCsvBtn')go()});
})();
