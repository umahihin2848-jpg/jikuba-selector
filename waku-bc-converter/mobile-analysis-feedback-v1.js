(()=>{'use strict';
if(!window.RSAMobileLean||window.MobileAnalysisFeedbackV1)return;
const $=id=>document.getElementById(id),html=document.documentElement;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=()=>({base:window.MobileAnalysisCoreState,transition:window.RSAAnalysisTransitionState,finish:window.Finish600State,ability:window.M3PureAbilityState,queue:window.ValidatedQueueState,p10:window.PositionRiskState,decision:window.DecisionShellV2State,gate:window.RaceSkipLockV1State,addons:window.RSAAddonHealth});
let clicked=false,clickAt=0,errorMessage='',timer=0;
function ensure(){
 let box=$('rsaAnalysisFeedback');
 const btn=$('analyzeBtn');if(!btn)return null;
 if(box){if(box.previousElementSibling!==btn||box.parentElement!==btn.parentElement)btn.insertAdjacentElement('afterend',box);return box}
 box=document.createElement('section');box.id='rsaAnalysisFeedback';
 box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.hidden=true;
 btn.insertAdjacentElement('afterend',box);
 return box;
}
function css(){
 if($('rsaAnalysisFeedbackCss'))return;
 const s=document.createElement('style');s.id='rsaAnalysisFeedbackCss';
 s.textContent='#rsaAnalysisFeedback{margin:9px 0 14px!important;padding:13px;border:1px solid #446b85;background:#0a1d2d;border-radius:14px;color:#e6f4fa;font-size:12px;line-height:1.65;white-space:normal;overflow-wrap:anywhere}'+
 '#rsaAnalysisFeedback[hidden]{display:none!important}#rsaAnalysisFeedback h3{font-size:15px;margin:0 0 4px}#rsaAnalysisFeedback p{margin:5px 0;color:#abc4cf}'+
 '#rsaAnalysisFeedback .rafOk{color:#a8e8bd}#rsaAnalysisFeedback .rafWait{color:#ebd7a7}#rsaAnalysisFeedback .rafError{color:#ffbbbb}'+
 '#rsaAnalysisFeedback .rafStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}'+
 '#rsaAnalysisFeedback .rafStats>div{border:1px solid #2e4e60;border-radius:9px;padding:8px;background:#0c2838}'+
 '#rsaAnalysisFeedback .rafStats b{display:block;color:#f1f8fa;font-size:14px}'+
 '#rsaAnalysisFeedback details{margin-top:7px;font-size:11px;border-top:1px solid #355368;padding-top:7px}'+
 '#rsaAnalysisFeedback details>summary{cursor:pointer;color:#b7d5e6;font-weight:700}';
 document.head.appendChild(s);
}
function statusMap(x){return[
 ['基礎分析',Boolean(x.base?.ready)],['M3',Boolean(x.finish?.ready)],
 ['Ability',Boolean(x.ability?.ready)],['隊列',Boolean(x.queue?.ready)],
 ['位置取りリスク',Boolean(x.p10?.ready)],['軸評価',Boolean(x.decision?.ready)]
];}
function baseContent(x){
 const b=x.base;if(!b?.ready)return '';
 const a=b.analysis||{},pred=a.pred||{},f=a.f||{};
 const rpci=Array.isArray(pred.p)&&pred.p.length===4?['強前傾','前傾','平均〜やや後傾','スロー'][Number(pred.top)]||'算出済':'計算中';
 const pressure=a.pressure||'計算中';
 const cover=Number.isFinite(Number(f.hist_coverage))?Math.round(Number(f.hist_coverage)*100)+'%':'—';
 const count=Number(b.horseCount)||0;
 return '<div class="rafStats"><div><small>読み込んだ出走馬</small><b>'+esc(count)+'頭</b></div>'+
 '<div><small>RPCI本線</small><b>'+esc(rpci)+'</b></div>'+
 '<div><small>先行圧</small><b>'+esc(pressure)+'</b></div>'+
 '<div><small>RPCI履歴カバー率</small><b>'+esc(cover)+'</b></div></div>';
}
function render(){
 css();const box=ensure();if(!box)return;
 const x=get(),t=x.transition||{},baseReady=Boolean(x.base?.ready),full=Boolean(t.status==='ready');
 if(!clicked&&t.status!=='error'){box.hidden=true;return}
 box.hidden=false;
 if(baseReady)html.dataset.rsaCoreAnalyzed='1';
 let head,lead;
 if(t.status==='error'||errorMessage){
  head='解析が途中で止まりました';lead=errorMessage||t.message||'原因が不明です。計算状況を確認してください。';
 }else if(full){
  head='解析完了';lead='基本分析と軸・隊列の計算を終了しました。';
 }else if(baseReady){
  head='基礎分析は完了しています';lead='各馬のM3・Ability・位置取り計算を照合しています。下の基本分析結果は確認できます。';
 }else if(clicked){
  head='解析の開始を確認中';lead=t.status==='running'?'TARGET CSVとモデルを読み込んでいます。': 'CSVは読み込めています。解析モジュールの起動状況を確認しています。';
 }else{head='分析待ち';lead='レース構造を解析してください。'}
 const gate=x.gate||{},dec=x.decision?.structure||{},reason=gate.reason||dec.reason||'';
 const diag=statusMap(x).map(([name,ok])=>'<span class="'+(ok?'rafOk':'rafWait')+'">'+(ok?'✓':'…')+esc(name)+'</span>').join(' ｜ ');
 const srcError=errorMessage||t.message||'';
 const axis=dec.axis?.no?esc(dec.axis.no)+'番 '+esc(dec.axis.name||''):'まだ確定していません';
 const timing=clicked&&clickAt?Math.round((Date.now()-clickAt)/1000)+'秒':'—';
 box.innerHTML='<h3 class="'+((t.status==='error'||errorMessage)?'rafError':full?'rafOk':'rafWait')+'">'+esc(head)+'</h3>'+
 '<p>'+esc(lead)+'</p>'+baseContent(x)+
 (baseReady?'<p>本番軸：'+axis+'。'+(gate.status==='skip'?'軸は見送り。'+esc(reason):gate.status==='open'?'軸の条件を通過。':'判定待ち（購入は未判定）。')+'</p>':'')+
 '<details><summary>計算状況・不具合の確認</summary>'+
 '<div>'+diag+'</div><div>経過時間 '+esc(timing)+' / 処理 '+esc(t.status||'未起動')+' / 見送り判定 '+esc(gate.status||'未起動')+'</div>'+
 (srcError?'<p class="rafError">'+esc(srcError)+'</p>':'')+
 (x.addons?.criticalFailures?.length?'<p class="rafError">必須アドオン読込失敗：'+esc(x.addons.criticalFailures.join('、'))+'</p>':'')+
 '</details>';
}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(render,ms)}
function click(){
 clicked=true;clickAt=Date.now();errorMessage='';delete html.dataset.rsaCoreAnalyzed;schedule(0);
 setTimeout(()=>{const t=window.RSAAnalysisTransitionState;if(!window.MobileAnalysisCoreState?.ready&&t?.status!=='running'&&t?.status!=='error'){
 errorMessage=window.MobileAnalysisControllerV1?'解析開始処理が応答していません。レース条件・CSVを確認して再実行してください。':'iPhone用解析モジュールを読み込めませんでした。画面を更新して再試行してください。';
 render();
 }},1800);
 setTimeout(()=>{const x=get();if(clicked&&x.transition?.status==='running'&&!x.base?.ready){errorMessage='解析開始から時間がかかっています。読み込みデータやモデルの失敗を確認してください。';render()}},12000);
}
function init(){
 ensure();css();
 document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')click()},true);
 document.addEventListener('change',e=>{if(['csvFile','raceDate','venue','raceName','fieldSize','surface','distance','grade','going'].includes(e.target?.id)){clicked=false;errorMessage='';delete html.dataset.rsaCoreAnalyzed;const b=$('rsaAnalysisFeedback');if(b)b.hidden=true}},true);
 window.addEventListener('rsa-analysis-start',()=>{if(!clicked){clicked=true;clickAt=Date.now()}errorMessage='';schedule(20)});
 for(const name of ['mobile-analysis-core-ready','finish600-ready','m3-pure-ability-ready','validated-queue-ready','position-risk-ready','decision-shell-v2-ready','rsa-analysis-complete','rsa-addons-ready'])
  window.addEventListener(name,()=>{if((name==='mobile-analysis-core-ready'||name==='rsa-analysis-complete')&&window.RSAAnalysisTransitionState?.status!=='error')errorMessage='';schedule(60)});
 window.addEventListener('rsa-analysis-error',e=>{errorMessage=String(e?.detail?.message||window.RSAAnalysisTransitionState?.message||'解析エラー');schedule(0)});
 schedule(400);
}
window.MobileAnalysisFeedbackV1={ready:true,version:'1.0.0-live-analysis-status',render,schedule};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();