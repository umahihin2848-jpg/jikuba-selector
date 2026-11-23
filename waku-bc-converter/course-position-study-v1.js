/* Course corner-position context, exploratory only.
   Reads historical aggregate and existing position predictions.
   NEVER changes M3, Ability, P10, official axis, ticket logic or odds. */
(function(root){'use strict';
 if(root.RSACoursePositionStudyV1)return;
 var V='course-position-study-v1-20261123';
 var DOC=root.document;
 if(!DOC||!root.addEventListener)return;
 var $=function(id){return DOC.getElementById(id);};
 var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var num=function(v){if(v===null||v===undefined||String(v).trim()==='')return NaN;var n=Number(v);return Number.isFinite(n)?n:NaN;};
 var db=null,error='',loadOnce=false,timer=0,opened=false,lastKey='';
 function style(){
  if($('rscpsStyle'))return;
  var e=DOC.createElement('style');e.id='rscpsStyle';
  e.textContent='#rscpsPanel{margin:13px 0 4px;background:#071e2e;border:1px solid #31576b;border-radius:14px;color:#dcedf5;overflow:hidden}'+
   '#rscpsPanel>summary{cursor:pointer;list-style:none;padding:13px 12px;font-weight:850;font-size:13px;line-height:1.55}'+
   '#rscpsPanel>summary::-webkit-details-marker{display:none}'+
   '.rscpsBody{padding:0 12px 12px;font-size:12px;line-height:1.65}.rscpsNote{color:#a6bdcc;font-size:11px;margin:7px 0}'+
   '.rscpsMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}'+
   '.rscpsMetric{background:#0c2a3b;border:1px solid #274d61;border-radius:9px;padding:8px 6px;text-align:center}'+
   '.rscpsMetric b{display:block;font-size:15px;color:#dcf6ff;font-weight:850}'+
   '.rscpsMetric small{display:block;font-size:10px;color:#a6becb;line-height:1.35;margin-top:2px}'+
   '.rscpsTable{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'+
   '.rscpsTable th,.rscpsTable td{padding:8px 5px;border-bottom:1px solid #254556;text-align:right;overflow-wrap:anywhere}'+
   '.rscpsTable th:first-child,.rscpsTable td:first-child{text-align:left;width:43%}'+
   '.rscpsTable th{color:#a9c5d3;font-weight:650}.rscpsWarn{background:#152735;border:1px solid #3e5361;color:#d1dee7;padding:9px;border-radius:9px;font-size:11px}'+
   '@media(max-width:440px){.rscpsMetric b{font-size:13px}.rscpsTable th,.rscpsTable td{padding:8px 3px}.rscpsBody{padding:0 9px 10px}}';
  DOC.head.appendChild(e);
 }
 function context(){
  var f=root.RSAFocusedThreeTabsState||{};
  if(f.active!=='formation'||!f.analysisReady||root.RSAFocusedThreeTabsV1?.dirty)return null;
  if(!/^(3勝|OP|L|G[123])$/.test(String($('grade')?.value||'')))return null;
  var hs=root.Finish600State?.rows;
  if(!root.Finish600State?.ready||!Array.isArray(hs)||hs.length<12||hs.length>18)return null;
  var v=$('venue')?.value||'',s=String($('surface')?.value||'').includes('ダ')?'ダ':'芝',d=num($('distance')?.value);
  var host=$('rsafFormation');
  if(!host||!v||!Number.isFinite(d))return null;
  return {host:host,venue:v,surface:s,dist:d,hs:hs,focus:f,geo:root.CourseGeometryRuntimeV1State?.current,
    race:[$('raceDate')?.value||'',$('raceName')?.value||'',v,s,d,$('grade')?.value||'',hs.map(function(h){return String(h.no)+':'+String(h.name);}).join('|')].join('~')};
 }
 function metric(label,value){return '<div class="rscpsMetric"><b>'+esc(value)+'</b><small>'+esc(label)+'</small></div>';}
 function paint(){
  var c=context();
  if(!c)return;
  style();
  var old=$('rscpsPanel');
  if(old&&old.parentElement!==c.host){old=null;}
  var geo=c.geo;
  var geom=geo?.ready?geo.row:null,ft=num(geom?.first_turn_distance_m);
  var ftText=geo?.ready?(Number.isFinite(ft)?'初角まで約'+ft.toFixed(0)+'m（コースDB）':geom?.no_turn?'直線コース':'初角距離は未収録'):'コース形態の特定待ち';
  var route=geo?.ready?(' / '+String(geo.routeLabel||geo.route||'ルート未識別')):'';
  var hit=db?.rows?.find(function(x){return x.v===c.venue&&x.s===c.surface&&Number(x.d)===c.dist;});
  var key=c.race+'|'+(hit?hit.r:'0')+'|'+ftText+'|'+(c.geo?.route||'')+'|'+c.hs.map(function(x){return x.no+':'+x.predGap+':'+x.finishRank;}).join(';');
  if(old&&old.parentElement===c.host&&lastKey===key)return;
  lastKey=key;
  var node=old||DOC.createElement('details');node.id='rscpsPanel';node.open=opened;
  var body='<div class="rscpsBody">'+
   '<p class="rscpsNote">'+esc(c.venue+c.surface+c.dist+'m'+route)+'｜'+esc(ftText)+'</p>';
  if(error)body+='<p class="rscpsWarn">過去実績の読込に失敗しました。'+esc(error)+'</p>';
  else if(!db)body+='<p class="rscpsNote">コース別過去実績を読込中です。</p>';
  else if(!hit)body+='<p class="rscpsWarn">このコースは8レース以上の照合済みサンプルがなく、3角→4角の数値は表示しません。</p>';
  else{
   body+='<p class="rscpsNote">過去の同じ競馬場・芝ダ・距離における<strong>3角→4角の実測</strong>。今回の予測確率ではありません。</p>'+
    '<div class="rscpsMetrics">'+metric('過去サンプル',hit.r+'R / '+hit.n+'頭')+
    metric('平均の順位入替',hit.m.toFixed(2)+'頭')+metric('3頭以上進出', (hit.up3*100).toFixed(1)+'%')+'</div>'+
    '<p class="rscpsNote">3頭以上後退 '+(hit.down3*100).toFixed(1)+'%。内外回りが混ざるコースや少数レースに注意。</p>';
  }
  var queue=root.ValidatedQueueState?.byNo||{};
  var rank=c.hs.slice().sort(function(a,b){return (num(a.predGap)||0)-(num(b.predGap)||0);});
  var rows=rank.map(function(h){
   var q=queue[String(h.no)]||{},p=num(h.predGap),i=num(q.expectedRank),m=num(h.finishRank);
   return '<tr><td>'+esc(h.no)+'番 '+esc(h.name)+'</td><td>'+(q.validated&&Number.isFinite(i)?i.toFixed(1)+'番手':'—')+'</td><td>'+(Number.isFinite(p)?'+'+p.toFixed(2)+'秒':'—')+'</td><td>'+(Number.isFinite(m)?m+'位':'—')+'</td></tr>';
  }).join('');
  body+='<p class="rscpsNote"><strong>今回の各馬の位置予測</strong>（既存モデルの数値を再掲。新しい位置確率は計算していません）</p>'+
   '<table class="rscpsTable"><thead><tr><th>馬</th><th>初位置予測</th><th>残600m差</th><th>M3</th></tr></thead><tbody>'+rows+'</tbody></table>'+
   '<p class="rscpsWarn">研究表示のみ。過去の3角→4角の移動幅と、今回の残600m地点の時間差は別の指標です。馬番はTARGET CSVの仮番号の可能性があります。Ability・M3・P10・軸/買い目・購入判定は変更しません。</p></div>';
  node.innerHTML='<summary>コース別・位置取り変化の研究｜初位置 → 残600m</summary>'+body;
  if(!old){c.host.appendChild(node);node.addEventListener('toggle',function(){opened=node.open;});}
 }
 function schedule(){clearTimeout(timer);timer=root.setTimeout(paint,75);}
 function load(){
  if(loadOnce)return;loadOnce=true;
  root.fetch('data/course_position_c3c4_study_20261123.json?v=20261123cp1',{cache:'force-cache'})
   .then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();})
   .then(function(o){if(!Array.isArray(o.rows))throw Error('表形式不一致');db=o;schedule();})
   .catch(function(e){error=String(e?.message||e);schedule();});
 }
 root.RSACoursePositionStudyV1=Object.freeze({version:V,productionImpact:false,refresh:schedule});
 ['rsa-focused-partner-ready','finish600-ready','validated-queue-ready','course-geometry-ready','rsa-analysis-complete'].forEach(function(ev){root.addEventListener(ev,schedule);});
 DOC.addEventListener('click',function(ev){if(ev.target?.id==='analyzeBtn')root.setTimeout(schedule,500);});
 function start(){load();schedule();}
 if(DOC.readyState==='loading')root.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
