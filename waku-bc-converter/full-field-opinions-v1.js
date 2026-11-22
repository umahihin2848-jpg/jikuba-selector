/* User-authored full-field graded-race opinion notebook; no betting logic changes. */
(function(root){'use strict';
const VERSION='full-field-opinions-v1-20261122',PREFIX='rsa-ffo-v1:';
const $=id=>root.document?.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=x=>x==null||String(x).trim()===''?NaN:Number(x);
const ok=x=>Number.isFinite(N(x));
const KEYS=['strength','risk','scenario','market','opinion','winPct','top3Pct','predictOdds'];
const empty=()=>({strength:'',risk:'',scenario:'',market:'',opinion:'',winPct:'',top3Pct:'',predictOdds:''});
function fair(p){const v=N(p);return Number.isFinite(v)&&v>0&&v<=100?100/v:null;}
function summary(horses,notes){
 let written=0,withWin=0,sum=0;const warnings=[];
 for(const h of horses){const a=notes[h.no]||{},w=N(a.winPct),t=N(a.top3Pct),od=N(a.predictOdds);
  if(String(a.opinion||'').trim())written++;
  if(String(a.winPct||'').trim()){if(!ok(w)||w<0||w>100)warnings.push(h.no+'番：勝率が不正');else{withWin++;sum+=w;}}
  if(String(a.top3Pct||'').trim()&&(!ok(t)||t<0||t>100||(ok(w)&&t<w)))warnings.push(h.no+'番：3着内率を確認');
  if(String(a.predictOdds||'').trim()&&(!ok(od)||od<1))warnings.push(h.no+'番：予想オッズを確認');
 }
 if(sum>100.1)warnings.push('入力済みの勝率合計が100%超');
 if(withWin===horses.length&&Math.abs(sum-100)>1)warnings.push('全頭の勝率合計は100%程度に調整');
 return{written,withWin,sum,warnings};
}
function report(meta,horses,notes,locked){
 const s=summary(horses,notes);
 const lines=['# '+meta.name+'｜全頭見解',meta.date+' '+meta.venue+' '+meta.grade+' '+meta.surface+meta.distance+'m',
 '記録状態：'+(locked?'固定 '+locked:'下書き'),'主観勝率入力 '+s.withWin+'/'+horses.length+'頭（合計'+s.sum.toFixed(1)+'%）',
 '※主観確率であり、検証済みの予測確率ではありません。馬番はCSV仮番号の可能性があります。',''];
 for(const h of horses){const n=notes[h.no]||empty(),fo=fair(n.winPct);
  lines.push('## '+h.no+'番 '+h.name,'参考 Ability '+(h.ability??'—')+'位 / M3 '+(h.m3??'—')+'位 / P10 '+(h.p10==null?'—':(h.p10*100).toFixed(1)+'%'),
  '勝率 '+(n.winPct!==''?n.winPct+'%':'—')+' / 3着内率 '+(n.top3Pct!==''?n.top3Pct+'%':'—')+
  ' / 採算分岐 '+(fo===null?'—':fo.toFixed(2)+'倍')+' / 最終予想単勝 '+(n.predictOdds?n.predictOdds+'倍':'—'),
  '強み：'+(n.strength||'—'),'懸念：'+(n.risk||'—'),'好走条件：'+(n.scenario||'—'),
  '市場との乖離：'+(n.market||'—'),'総合見解：'+(n.opinion||'—'),'');
 }
 return lines.join('\n');
}
function keyOf(meta,horses){return JSON.stringify([meta.date,meta.venue,meta.name,meta.grade,meta.surface,meta.distance,horses.map(h=>[h.no,h.name])]);}
function hash(v){let n=2166136261;for(let i=0;i<v.length;i++){n=Math.imul(n^v.charCodeAt(i),16777619);}return(n>>>0).toString(36);}
root.RSAFullFieldOpinionsCoreV1=Object.freeze({version:VERSION,fair,summary,report,keyOf});
if(!root.document?.createElement||!root.addEventListener)return;
let cur=null,record=null,active='',opened=false,timer=0,dirty=false;
function context(){
 const st=root.Finish600State||{},f=root.RSAFocusedThreeTabsState||{},gr=$('grade')?.value;
 if(!/^G[123]$/.test(String(gr||''))||!st.ready||!f.analysisReady||root.RSAFocusedThreeTabsV1?.dirty)return null;
 const horses=(st.rows||[]).map(x=>{const no=String(x.no),a=root.M3PureAbilityState?.byNo?.[no]||{},p=root.PositionRiskState?.byNo?.[no]||{};return{
  no,name:String(x.name||''),ability:ok(a.abilityRank)?Number(a.abilityRank):null,
  m3:ok(x.finishRank)?Number(x.finishRank):null,p10:ok(p.p10)?Number(p.p10):null
 };}).sort((a,b)=>Number(a.no)-Number(b.no));
 if(horses.length<12||horses.length>18||new Set(horses.map(x=>x.no)).size!==horses.length||horses.some(h=>!h.name||!/^\d+$/.test(h.no)))return null;
 const meta={date:$('raceDate')?.value||'',venue:$('venue')?.value||'',name:$('raceName')?.value||'',grade:gr,surface:$('surface')?.value||'',distance:$('distance')?.value||''};
 if(!meta.date||!meta.venue||!meta.name||!meta.distance)return null;
 return{meta,horses,key:keyOf(meta,horses)};
}
function retrieve(c){
 try{const x=JSON.parse(root.localStorage.getItem(PREFIX+hash(c.key))||'null');if(x&&x.version===VERSION&&x.key===c.key&&x.notes)return x;}catch(_){}
 return{version:VERSION,key:c.key,meta:c.meta,notes:{},lockedAt:null,createdAt:new Date().toISOString()};
}
function save(){
 if(!cur||!record)return false;
 try{record.lastSavedAt=new Date().toISOString();root.localStorage.setItem(PREFIX+hash(cur.key),JSON.stringify(record));dirty=false;status('保存済み');return true;}
 catch(_){status('保存エラー：バックアップを出力してください');return false;}
}
function status(extra){
 const el=$('ffoStatus');if(!el||!cur||!record)return;
 const s=summary(cur.horses,record.notes);el.textContent='見解 '+s.written+'/'+cur.horses.length+'頭｜勝率 '+s.withWin+'頭（計 '+s.sum.toFixed(1)+'%）'+(record.lockedAt?'｜固定済み':'｜下書き')+(extra?'｜'+extra:'');
 const w=$('ffoWarning');if(w)w.textContent=s.warnings.slice(0,3).join(' / ');
}
function persistSoon(){dirty=true;clearTimeout(timer);timer=setTimeout(save,550);status('入力中');}
function flush(){if(dirty){clearTimeout(timer);save();}}
function field(k,label,placeholder,rows){
 const v=String((record.notes[active]||{})[k]??'');return '<label class="ffo-field">'+esc(label)+
 '<textarea data-ffo-key="'+k+'" rows="'+rows+'" maxlength="1500" placeholder="'+esc(placeholder)+'"'+(record.lockedAt?' disabled':'')+'>'+esc(v)+'</textarea></label>';
}
function numeric(k,label,placeholder,max){
 const v=String((record.notes[active]||{})[k]??'');return '<label class="ffo-field">'+esc(label)+
 '<input data-ffo-key="'+k+'" type="number" inputmode="decimal" min="0" max="'+max+'" step=".1" placeholder="'+placeholder+'" value="'+esc(v)+'"'+(record.lockedAt?' disabled':'')+'></label>';
}
function picker(){
 const el=$('ffoHorse');if(!el||!cur)return;
 el.innerHTML=cur.horses.map(h=>'<option value="'+esc(h.no)+'">'+esc(h.no+'番 '+h.name+((record.notes[h.no]?.opinion||'').trim()?' ✓':''))+'</option>').join('');
 el.value=active;
}
function editor(){
 const el=$('ffoEditor');if(!el||!cur)return;
 const h=cur.horses.find(x=>x.no===active),idx=cur.horses.indexOf(h),fo=fair(record.notes[active]?.winPct);
 el.innerHTML='<div class="ffo-horse-title"><b>'+esc(h.no)+'番 '+esc(h.name)+'</b><small>Ability '+(h.ability??'—')+'位・M3 '+(h.m3??'—')+'位・P10 '+(h.p10===null?'—':(h.p10*100).toFixed(1)+'%')+'</small></div>'+
 '<div class="ffo-number-fields">'+numeric('winPct','自分の推定勝率 %','例 12',100)+numeric('top3Pct','推定3着内率 %','例 34',100)+numeric('predictOdds','最終予想単勝オッズ','例 9.8',100000)+'</div>'+
 '<p id="ffoFair">単勝損益分岐オッズ：'+(fo===null?'勝率入力待ち':fo.toFixed(2)+'倍')+'</p>'+
 field('strength','強み・好走根拠','前走内容・能力・調教・位置取りなど',3)+
 field('risk','不安材料','スタート、距離、枠、ローテなど',3)+
 field('scenario','好走しやすい馬場・展開','スロー/ハイ、内外、位置取り',3)+
 field('market','市場評価と自分の評価の乖離','人気の理由、過剰評価・過小評価の材料',3)+
 field('opinion','総合見解','この馬をどう評価するのか、自分の結論を記録',5)+
 '<div class="ffo-move"><button type="button" id="ffoPrev"'+(idx===0?' disabled':'')+'>前の馬</button><span>'+(idx+1)+' / '+cur.horses.length+'</span><button type="button" id="ffoNext"'+(idx===cur.horses.length-1?' disabled':'')+'>次の馬</button></div>';
}
function download(ext,body,type){
 const a=root.document.createElement('a'),url=root.URL.createObjectURL(new Blob([body],{type}));
 a.href=url;a.download=(cur.meta.date+'_'+cur.meta.venue+'_'+cur.meta.name+'_全頭見解').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext;
 root.document.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),1200);
}
function move(offset){
 flush();const i=cur.horses.findIndex(h=>h.no===active)+offset;
 if(i<0||i>=cur.horses.length)return;active=cur.horses[i].no;picker();editor();status();
}
function seal(){
 flush();if(!record||record.lockedAt)return;
 if(!$('ffoAgree')?.checked)return status('固定には発走前の自己申告チェックが必要');
 const s=summary(cur.horses,record.notes);
 if(!s.written)return status('少なくとも1頭の総合見解を記入してください');
 if(s.warnings.length)return status('入力値の不整合を修正してください');
 if(!root.confirm('発走前見解として固定しますか？ 固定後はこの端末では編集できません。'))return;
 record.lockedAt=new Date().toISOString();
 if(!save()){record.lockedAt=null;return;}
 paint(true);status('固定しました（発走前かは自己申告）');
}
function paint(force){
 const host=$('rsaFocusedView'),c=context();if(!host)return;
 let el=$('ffoNotebook');
 if(!c){if(el)el.hidden=true;return;}
 if(!cur||cur.key!==c.key){flush();cur=c;record=retrieve(c);active=c.horses[0].no;opened=false;force=true;}
 if(el&&el.dataset.key!==cur.key){el.remove();el=null;force=true;}
 if(!el){el=root.document.createElement('details');el.id='ffoNotebook';el.className='ffo-notebook';el.dataset.key=cur.key;
  $('rsafTabs')?.insertAdjacentElement('afterend',el);force=true;}
 el.hidden=false;
 if(!force){status();return;}
 el.open=opened;
 el.innerHTML='<summary>全頭見解ノート｜重賞全馬レビュー</summary><div class="ffo-body">'+
 '<p>各馬の強み・不安・展開・市場評価・総合見解を手入力。Ability・M3・P10は参考情報であり、推定勝率は自動生成しません。</p>'+
 '<p class="ffo-alert">CSV馬番は仮番号の場合があります。正式馬番を確認してください。見解は購入判定に反映しません。</p>'+
 '<p id="ffoStatus"></p><p id="ffoWarning" class="ffo-alert"></p>'+
 '<label class="ffo-field">評価する馬<select id="ffoHorse"></select></label><div id="ffoEditor"></div>'+
 '<div class="ffo-actions"><button type="button" id="ffoSave">保存</button><button type="button" id="ffoMarkdown">全頭見解を文章で出力</button><button type="button" id="ffoJSON">JSONバックアップ</button></div>'+
 '<div class="ffo-lock"><label><input id="ffoAgree" type="checkbox"'+(record.lockedAt?' disabled':'')+'> 発走前に書いた見解であることを確認（自己申告）</label>'+
 '<button type="button" id="ffoLock"'+(record.lockedAt?' disabled':'')+'>'+(record.lockedAt?'固定済み':'発走前見解として固定')+'</button></div>'+
 '<p class="ffo-foot">自動保存はSafari内のローカル保存のみ。データ消去・端末変更に備えJSONをダウンロードしてください。固定の日時は端末時刻で、外部による発走前の証明ではありません。</p></div>';
 el.addEventListener('toggle',()=>{opened=el.open;});
 el.addEventListener('change',e=>{if(e.target.id==='ffoHorse'){flush();active=e.target.value;editor();status();}});
 el.addEventListener('input',e=>{
  const k=e.target.dataset?.ffoKey;if(!KEYS.includes(k)||record.lockedAt)return;
  if(!record.notes[active])record.notes[active]=empty();
  record.notes[active][k]=String(e.target.value||'').slice(0,1500);
  persistSoon();if(k==='opinion')picker();
  if(k==='winPct'){const fo=fair(e.target.value);const span=$('ffoFair');if(span)span.textContent='単勝損益分岐オッズ：'+(fo===null?'勝率入力待ち':fo.toFixed(2)+'倍');}
  status();
 });
 el.addEventListener('click',e=>{
  const id=e.target.id;
  if(id==='ffoPrev')move(-1);
  if(id==='ffoNext')move(1);
  if(id==='ffoSave'){flush();save();}
  if(id==='ffoLock')seal();
  if(id==='ffoMarkdown'){flush();download('md',report(cur.meta,cur.horses,record.notes,record.lockedAt),'text/markdown;charset=utf-8');}
  if(id==='ffoJSON'){flush();download('json',JSON.stringify({version:VERSION,record,roster:cur.horses,exportedAt:new Date().toISOString()},null,2),'application/json;charset=utf-8');}
 });
 picker();editor();status();
}
let renderTimer=0;function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>paint(false),100);}
['rsa-focused-partner-ready','rsa-analysis-complete','finish600-ready','m3-pure-ability-ready','position-risk-ready'].forEach(event=>root.addEventListener(event,schedule));
root.document.addEventListener('change',e=>{if(['raceDate','raceName','venue','grade','surface','distance','csvFile'].includes(e.target?.id))schedule();},true);
root.document.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='hidden')flush()});
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
