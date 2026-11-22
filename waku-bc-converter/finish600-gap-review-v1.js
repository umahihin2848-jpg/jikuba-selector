/* Last-600m gap research checklist: user's speculative -3F gap, not machine-generated probabilities. 
   Never modifies Ability/M3, official axis, other ticket decisions, or odds. */
(function(root){'use strict';
const VERSION='finish600-gap-review-v1-20261123';
const $=id=>root.document?.getElementById(id);
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>x===undefined||x===null||String(x).trim()===''?NaN:Number(x);
const has=x=>Number.isFinite(num(x));
const color=gap=>!has(gap)?'unrated':Number(gap)>1?'inspect-high':Number(gap)>.6?'inspect-middle':'inspect-low';
const label=gap=>!has(gap)?'見立て未入力':Number(gap)>1?'後方差が大きい想定｜再点検':Number(gap)>.6?'差がある想定｜展開確認':'先頭に比較的近い想定';
const assess=gap=>{
 const x=num(gap);if(!Number.isFinite(x)||x<0||x>15)return{valid:false,flag:'未入力または数値不正'};
 return{valid:true,value:x,flag:label(x),band:color(x)};
};
const keyOf=(m,hs)=>JSON.stringify([m.date,m.venue,m.race,m.grade,m.surface,m.dist,hs.map(h=>[h.no,h.name])]);
const hash=t=>{let x=2166136261;for(const c of t){x=Math.imul(x^c.charCodeAt(0),16777619);}return(x>>>0).toString(36);};
function importOK(o,k){return !!(o&&o.version===VERSION&&o.raceKey===k&&o.records&&typeof o.records==='object'&&!Array.isArray(o.records));}
root.RSAFinish600GapReviewCoreV1=Object.freeze({version:VERSION,assess,label,color,keyOf,importOK});
if(!root.document?.createElement||!root.addEventListener)return;
let state=null,chosen='',open=false,timer=null,writeTimer=null,changed=false;
function context(){
 const focus=root.RSAFocusedThreeTabsState||{},finish=root.Finish600State||{};
 if(!/^G[123]$/.test(String($('grade')?.value||''))||!focus.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!finish.ready||!Array.isArray(finish.rows))return null;
 const rows=finish.rows.map(h=>{const id=String(h.no),a=root.M3PureAbilityState?.byNo?.[id]||{},q=root.ValidatedQueueState?.byNo?.[id]||{},p=root.PositionRiskState?.byNo?.[id]||{};
 return{no:id,name:String(h.name||''),ability:has(a.abilityRank)?Number(a.abilityRank):null,m3:has(h.finishRank)?Number(h.finishRank):null,initial:has(q.expectedRank)?Number(q.expectedRank):null,p10:has(p.p10)?Number(p.p10):null};
 }).sort((a,b)=>Number(a.no)-Number(b.no));
 if(rows.length<12||rows.length>18||new Set(rows.map(r=>r.no)).size!==rows.length||rows.some(r=>!r.name))return null;
 const m={date:$('raceDate')?.value||'',venue:$('venue')?.value||'',race:$('raceName')?.value||'',grade:$('grade')?.value||'',surface:$('surface')?.value||'',dist:$('distance')?.value||''};
 if(!m.date||!m.venue||!m.race)return null;
 return{meta:m,rows,key:keyOf(m,rows)};
}
function storageKey(k){return'rsa-600m-gap-v1:'+hash(k);}
function load(ctx){
 try{const o=JSON.parse(root.localStorage.getItem(storageKey(ctx.key))||'null');
  if(o&&o.version===VERSION&&o.raceKey===ctx.key&&o.records&&typeof o.records==='object')return o;
 }catch(_){}
 return{version:VERSION,raceKey:ctx.key,meta:ctx.meta,records:{},createdAt:new Date().toISOString(),updatedAt:null};
}
function status(msg){
 const h=$('f6gStatus');if(!h||!state)return;
 const all=state.ctx.rows.filter(r=>assess(state.db.records[r.no]?.gap).valid);
 h.textContent='想定差の記入 '+all.length+'/'+state.ctx.rows.length+'頭'+(msg?'｜'+msg:'');
}
function save(){
 if(!state)return false;
 try{state.db.updatedAt=new Date().toISOString();root.localStorage.setItem(storageKey(state.ctx.key),JSON.stringify(state.db));changed=false;status('端末内に保存済み');return true;}
 catch(_){status('保存失敗。バックアップを確認');return false;}
}
function flush(){if(changed){clearTimeout(writeTimer);save();}}
function later(){changed=true;status('入力中');clearTimeout(writeTimer);writeTimer=setTimeout(save,500);}
function renderItem(){
 const p=$('f6gItem');if(!state||!p)return;
 const r=state.ctx.rows.find(r=>r.no===chosen)||state.ctx.rows[0],d=state.db.records[r.no]||{},a=assess(d.gap);
 p.innerHTML='<div class="f6g-name"><strong>'+E(r.no)+'番 '+E(r.name)+'</strong>'+
 '<small>Ability '+(r.ability??'—')+'位 ／ M3 '+(r.m3??'—')+'位 ／ 初角予測 '+(r.initial===null?'—':r.initial.toFixed(1)+'番手')+
 ' ／ P10 '+(r.p10===null?'—':(100*r.p10).toFixed(1)+'%')+'</small></div>'+
 '<div class="f6g-fields"><label>ゴール前600m時点の先頭差を予想（秒）'+
 '<input id="f6gGap" type="number" min="0" max="15" step=".1" inputmode="decimal" value="'+E(d.gap??'')+'" placeholder="例 0.8"></label>'+
 '<label>判断根拠・展開条件<textarea id="f6gReason" rows="3" maxlength="1200" placeholder="直近の-3F差、前半ペース、想定ポジション、コースなど">'+E(d.reason||'')+'</textarea></label></div>'+
 '<p id="f6gFlag" class="f6g-flag '+a.band+'">'+E(a.flag)+(a.valid?'（仮の見立て）':'')+'</p>';
}
function renderSelect(){
 const el=$('f6gHorse');if(!el||!state)return;
 el.innerHTML=state.ctx.rows.map(r=>'<option value="'+E(r.no)+'">'+E(r.no+'番 '+r.name+'｜Ability '+(r.ability??'—')+'位・M3 '+(r.m3??'—')+'位')+'</option>').join('');
 el.value=chosen;
}
function exportJSON(){
 if(!state)return;flush();
 const obj={...state.db,roster:state.ctx.rows,exportedAt:new Date().toISOString(),
 methodology:'手入力の事前見立て。初角の予測位置と残り600mの先頭差は別。履歴値も較正済み確率も自動生成していない。'};
 const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'}),u=root.URL.createObjectURL(b),a=root.document.createElement('a');
 a.href=u;a.download=(state.ctx.meta.date+'_'+state.ctx.meta.venue+'_'+state.ctx.meta.race+'_600m差検討').replace(/[\\/:*?"<>|]/g,'_')+'.json';
 root.document.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(u),1500);
}
async function importBackup(file){
 if(!file||!state)return;
 try{
  if(file.size>2000000)throw new Error('ファイルサイズが大きすぎます');
  const obj=JSON.parse(await file.text());
  if(!importOK(obj,state.ctx.key))throw new Error('レース識別子またはバックアップ形式が異なります');
  if(typeof root.confirm==='function'&&!root.confirm('このレースの想定600m差メモをJSONから復元しますか？ 既存の記録を上書きします。'))return;
  flush();
  const records={};
  for(const h of state.ctx.rows){
   const raw=obj.records[h.no]||{},gap=String(raw.gap??''),reason=String(raw.reason??'').slice(0,1200);
   if(gap.trim()&&!assess(gap).valid)throw new Error(h.no+'番の秒差が不正です');
   records[h.no]={gap,reason};
  }
  state.db={version:VERSION,raceKey:state.ctx.key,meta:state.ctx.meta,records,
   createdAt:obj.createdAt||new Date().toISOString(),updatedAt:null};
  if(!save())return;
  const old=$('f6gPanel');old?.remove();paint();status('JSONから復元しました');
 }catch(e){status('復元エラー：'+String(e.message||e));}
}
function paint(){
 const x=context(),host=$('rsafFormation');if(!x||!host||host.hidden)return;
 if(!state||state.ctx.key!==x.key){flush();state={ctx:x,db:load(x)};chosen=x.rows[0].no;open=false;}
 let node=$('f6gPanel');if(node&&node.getAttribute('data-race')!==state.ctx.key){node.remove();node=null;}
 if(node&&node.parentElement===host){status();return;}
 node=root.document.createElement('details');node.id='f6gPanel';node.className='f6g-panel';node.setAttribute('data-race',state.ctx.key);node.open=open;
 node.innerHTML='<summary>ゴール前600mの先頭差｜リスク再確認（研究用）</summary><div class="f6g-body">'+
 '<p>初角の予測順位とは別に、残り600mで先頭からどれほど離れる見込みかを考える。ここで入力する数値は自分の仮説で、アプリの予測や公式購入判定ではありません。</p>'+
 '<p class="f6g-caution">過去重賞108RでAbility/M3上位馬の<strong>実際の-3F差</strong>が1秒超なら3着内率26.2%（149頭）。ただし事後に観測した差。事前の「過去走の差」追加による予測精度改善は未確認。1.0秒を自動減点・消去基準にはしません。</p>'+
 '<p id="f6gStatus" class="f6g-status"></p><label class="f6g-choice">確認する馬<select id="f6gHorse"></select></label>'+
 '<div id="f6gItem"></div><div class="f6g-actions"><button type="button" id="f6gSave">この端末に保存</button>'+
 '<button type="button" id="f6gExport">全頭分をJSONで出力</button><button type="button" id="f6gImport">JSONから復元</button><input id="f6gImportFile" type="file" accept=".json,application/json" style="display:none"></div>'+
 '<p class="f6g-foot">CSV馬番は仮番号の場合があります。公式馬番と照合してください。ローカル保存のみで端末変更時にはJSONバックアップが必要。入力した差はAbility/M3・公式軸・相手3頭・購入判定に一切反映しません。</p></div>';
 host.appendChild(node);
 node.addEventListener('toggle',()=>{open=node.open;});
 node.addEventListener('change',e=>{if(e.target.id==='f6gHorse'){flush();chosen=e.target.value;renderItem();status();}});
 node.addEventListener('change',e=>{if(e.target.id==='f6gImportFile'){const file=e.target.files?.[0];e.target.value='';if(file)importBackup(file);}});
 node.addEventListener('input',e=>{
  if(!['f6gGap','f6gReason'].includes(e.target.id))return;
  const db=state.db.records;if(!db[chosen])db[chosen]={gap:'',reason:''};
  const v=String(e.target.value||'');
  if(e.target.id==='f6gGap')db[chosen].gap=v;else db[chosen].reason=v.slice(0,1200);
  const flag=$('f6gFlag'),a=assess(db[chosen].gap);
  if(flag){flag.className='f6g-flag '+(a.band||'unrated');flag.textContent=a.flag+(a.valid?'（仮の見立て）':'');}
  later();
 });
 node.addEventListener('click',e=>{
  if(e.target.id==='f6gSave'){flush();save();}
  if(e.target.id==='f6gExport')exportJSON();
  if(e.target.id==='f6gImport')$('f6gImportFile')?.click();
 });
 renderSelect();renderItem();status();
}
function schedule(){clearTimeout(timer);timer=setTimeout(paint,90);}
['rsa-focused-partner-ready','rsa-analysis-complete','finish600-ready','validated-queue-ready','position-risk-ready'].forEach(e=>root.addEventListener(e,schedule));
root.document.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='hidden')flush();});
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
