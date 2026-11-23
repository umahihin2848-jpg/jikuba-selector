/* P3-71 research-only preview: three stages, from manual full-card roster and deduplicated prior racing data.
   Not official P10/Queue/M3; no write to their state; no lane or trajectory inference. */
(function(root){'use strict';
if(root.RSACornerStagePreviewV1)return;
const doc=root.document,$=id=>doc.getElementById(id),R=root.RSACornerRosterAuditV1,C=root.RSACornerGroupShadowV1;
if(!R||!C)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=['前方','好位','中団','後方'];let panel=null,snapshot=null,stage='start',modelPromise=null,timeout=0;
const parseMeta=()=>({date:$('raceDate')?.value,venue:$('venue')?.value,raceName:$('raceName')?.value,
 surface:$('surface')?.value,distance:Number($('distance')?.value),fieldSize:Number($('fieldSize')?.value)});
function status(message,valid=false){const e=$('p371Status');if(e){e.textContent=message;e.dataset.state=valid?'ok':'warn'}}
function invalidate(message='出走表・レース条件・モデル入力が変わりました。再確認してください。'){
 snapshot=null;
 const check=$('p371Confirmed');if(check)check.checked=false;
 const output=$('p371Output');if(output)output.hidden=true;
 status(message);
}
function createPanel(){
 const host=$('rsafFormation');if(!host)return null;
 let e=$('p371StagePreview');
 if(e&&e.parentElement===host)return e;
 e=doc.createElement('details');e.id='p371StagePreview';e.className='p371';
 e.innerHTML='<summary>研究用｜初位置 → 3角 → 4角の4馬群比較（確定馬番の照合必須）</summary>'+
  '<div class="p371Content"><p class="p371Note">本番と切り離した予測プレビューです。現在のCSVは馬名の登場順で仮番号を振るため、<strong>出走表の確定馬番と馬名を全頭分入力</strong>してください。馬番の欠番はそのまま入力します。</p>'+
  '<label class="p371Label" for="p371Source">確認した出走表の出典（手入力）</label>'+
  '<input id="p371Source" type="text" placeholder="例：JRA公式出走表・2026年12月6日" maxlength="180">'+
  '<label class="p371Label" for="p371Roster">確定馬番と馬名（1行1頭・全頭分）</label>'+
  '<textarea id="p371Roster" rows="6" placeholder="1,サンプルホースA&#10;2,サンプルホースB&#10;4,サンプルホースC"></textarea>'+
  '<label class="p371Check"><input id="p371Confirmed" type="checkbox"> 出走表の馬番と馬名を別資料で確認し、取消後の出走全頭を入力しました</label>'+
  '<button id="p371Run" type="button">全頭照合して3地点を表示</button>'+
  '<p id="p371Status" class="p371Note" role="status" aria-live="polite">研究版の過去走重複除去パーサーが必要です。本番mainでは表示しません。</p>'+
  '<div id="p371Output" hidden><div class="p371Tabs" role="group" aria-label="予測する地点">'+
  '<button type="button" data-p371-stage="start">初位置（参考）</button>'+
  '<button type="button" data-p371-stage="c3">3コーナー</button>'+
  '<button type="button" data-p371-stage="c4">4コーナー</button></div>'+
  '<div id="p371Stage"></div><p id="p371Transition" class="p371Note"></p>'+
  '<button id="p371Export" type="button">発走前の研究データをJSON保存</button>'+
  '<p class="p371Note">3角・4角は各地点を別々に推定。画面上の群の変化は<strong>実際の進出経路・移動確率を推定したものではありません</strong>。内外レーンや詰まりの予測も含みません。</p></div></div>';
 host.appendChild(e);
 e.addEventListener('input',ev=>{if(['p371Roster','p371Source'].includes(ev.target?.id))invalidate('入力を変更しました。出走表をもう一度確認してください。');});
 e.addEventListener('change',ev=>{if(ev.target?.id==='p371Confirmed'&&snapshot)invalidate();});
 e.addEventListener('click',ev=>{
  const id=ev.target?.id,selected=ev.target?.closest?.('[data-p371-stage]')?.dataset?.p371Stage;
  if(id==='p371Run'){run();return}
  if(id==='p371Export'){download();return}
  if(selected&&snapshot){stage=selected;draw();return}
 });
 return e;
}
function startStage(rows,seats){
 const ranks=[...rows].sort((a,b)=>b.frontness5-a.frontness5||Number(a.no)-Number(b.no));
 const assigned=[],items=[];
 for(let k=0,p=0;k<4;k++)for(let j=0;j<seats[k];j++,p++)
  assigned.push({no:String(ranks[p].no),name:ranks[p].name,groupIndex:k,representativeGroup:labels[k],
    representativeShare:null,frontness5:Number(ranks[p].frontness5),rank:p+1});
 for(const r of rows)items.push(assigned.find(x=>x.no===String(r.no)));
 return{rows:items,method:'過去の先行度のみを並べた参考位置（初位置の学習済み3角/4角モデルとは独立）'};
}
const formatReason=reason=>({
  model_version_missing:'研究係数が読み込めません',deduplicated_history_required:'重複除去済みの研究版CSVパーサーが必要',
  actual_horse_numbers_not_verified:'確定馬番を照合できません',full_field_required:'全頭の履歴が揃っていません',
  history_or_race_number_invalid:'馬番・過去走数・位置履歴が不足しています',
  duplicate_numbers_or_names:'馬番または馬名に重複があります',
  race_metadata_missing:'距離・芝ダなどの条件が不足しています',
  model_stage_missing:'3角/4角の研究モデルが不完全です',
  group_assignment_failed:'4つの馬群の人数を揃えられません'
 })[reason]||String(reason||'不明なエラー');
async function fetchModel(){
 if(!modelPromise)modelPromise=root.fetch('data/corner_group_research_model_v1.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
  .catch(e=>{modelPromise=null;throw e});
 return modelPromise;
}
async function run(){
 const e=createPanel();if(!e)return;
 const entered=R.verifyRoster({text:$('p371Roster')?.value,queue:root.ValidatedQueueState,meta:parseMeta(),
   confirmed:Boolean($('p371Confirmed')?.checked),sourceLabel:$('p371Source')?.value});
 if(!entered.ready){invalidate();status('照合不可：'+(entered.details?.slice(0,3).join('／')||formatReason(entered.reason)));return}
 if(root.RSATargetCsvCache?.version!=='target-csv-cache-p363-history-dedup-shadow'){
  invalidate();status('この研究画面は履歴を異なる過去5レースに統一したPR #7版だけで動作します');return;
 }
 status('出走馬名を全頭照合できました。3角・4角の推論中…');
 let m;try{m=await fetchModel()}catch(err){status('研究モデルを読み込めません：'+err.message);return}
 const again=R.verifyRoster({text:$('p371Roster')?.value,queue:root.ValidatedQueueState,meta:parseMeta(),
   confirmed:Boolean($('p371Confirmed')?.checked),sourceLabel:$('p371Source')?.value});
 if(!again.ready||again.snapshotSignature!==entered.snapshotSignature){invalidate();status('解析中に入力が変わりました。再確認してください');return}
 const result=C.assess({ready:true,fieldSize:entered.fieldSize,rows:entered.rows},
  {surface:entered.metadata.surface,distance:entered.metadata.distance},m,
  {csvParserVersion:root.RSATargetCsvCache?.version,actualNumbersVerified:true});
 if(!result.ready){invalidate();status('3角・4角の予測を保留：'+formatReason(result.reason));return}
 const first=startStage(entered.rows,result.seats);
 snapshot={schema:'p3-71-three-stage-shadow-snapshot-v1',createdAt:new Date().toISOString(),
  confirmation:'Manual race-card roster vs virtual CSV names, not official API verification',
  parserVersion:root.RSATargetCsvCache.version,stageModelVersion:m.modelVersion,stageEngineVersion:C.version,
  race:entered.metadata,rosterSource:entered.sourceLabel,missingHorseNumbers:entered.missingNumbers,
  virtualToActual:entered.rows.map(x=>({actualNo:String(x.no),virtualNo:x.originalVirtualNo,name:x.name})),
  firstProxy:first,stagePredictions:result.stages,groupSeats:result.seats,notCalibratedForProspectiveRaces:true,
  interpretation:'Each corner modeled independently, not a path or lane prediction'};
 stage='start';
 $('p371Output').hidden=false;
 status('全頭'+entered.fieldSize+'頭が一致。旧モデルや馬券は変更していません。'+
   (entered.missingNumbers.length?' 欠番：'+entered.missingNumbers.join(',')+'番。':'') ,true);
 draw();
}
function draw(){
 if(!snapshot)return;
 const data=stage==='start'?snapshot.firstProxy:snapshot.stagePredictions[stage];
 if(!data)return;
 const items=data.rows,stg=stage,quota=snapshot.groupSeats;
 $('p371Stage').innerHTML='<p class="p371Note">'+esc(stg==='start'?'初位置：過去の先行度順に並べた参考表示。ここには較正済みの所属確率はありません。':
   (stg==='c3'?'3コーナー':'4コーナー')+'：2023年学習の研究モデルによる4群所属割合。2024～26年は既探索で、未知レースでの較正は未確定。')+'</p>'+
  '<div class="p371Groups">'+labels.map((l,i)=>{
   const group=items.filter(x=>x.groupIndex===i).sort((a,b)=>stg==='start'?a.rank-b.rank:b.representativeShare-a.representativeShare);
   return'<section class="p371Group"><h4>'+l+' <span>'+quota[i]+'頭</span></h4>'+group.map(x=>
    '<div class="p371Horse"><b>'+esc(x.no)+'番 '+esc(x.name)+'</b><small>'+
    (stg==='start'?'過去先行度 '+Number(x.frontness5).toFixed(2)+'／参考順位 '+x.rank:
     'この群への未較正推定 '+(100*x.representativeShare).toFixed(0)+'%'+
     (x.representativeShare<.5?'・入替注意':''))+'</small></div>').join('')+'</section>';
  }).join('')+'</div>';
 const c3=new Map(snapshot.stagePredictions.c3.rows.map(x=>[x.no,x.groupIndex]));
 const moved=snapshot.stagePredictions.c4.rows.filter(x=>x.groupIndex!==c3.get(x.no)).length;
 $('p371Transition').textContent='3角と4角で代表グループが異なる馬：'+moved+'頭。これは別々の予測結果の比較であり、追い上げや後退が実際に起きる確率ではありません。';
 panel.querySelectorAll('[data-p371-stage]').forEach(b=>{const sel=b.dataset.p371Stage===stage;b.setAttribute('aria-pressed',sel?'true':'false');});
}
function download(){
 if(!snapshot)return;
 const serialized=JSON.stringify(snapshot,null,2),url=root.URL.createObjectURL(new root.Blob([serialized],{type:'application/json'}));
 const a=doc.createElement('a');a.href=url;a.download='research_corner_groups_'+snapshot.race.date.replace(/-/g,'')+'.json';
 a.hidden=true;doc.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),25000);
}
function mount(){
 const next=createPanel();
 if(next&&panel&&next!==panel){snapshot=null;stage='start';}
 if(next)panel=next;
}
function invalidateRace(){if(panel)invalidate('レース条件または過去走データが変わりました。出走表を確認し直してください。');}
['rsa-focused-partner-ready','rsa-analysis-complete'].forEach(name=>root.addEventListener(name,()=>root.setTimeout(mount,50)));
root.addEventListener('validated-queue-ready',()=>{invalidateRace();root.setTimeout(mount,70)});
doc.addEventListener('change',ev=>{if(['raceDate','venue','raceName','fieldSize','surface','distance','grade','csvFile'].includes(ev.target?.id))invalidateRace()});
doc.addEventListener('input',ev=>{if(['raceDate','venue','raceName','fieldSize','surface','distance'].includes(ev.target?.id))invalidateRace()});
if(doc.readyState==='loading')root.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
root.RSACornerStagePreviewV1=Object.freeze({version:'p371-stage-preview-20261123',productionImpact:false,refresh:mount,
 getSnapshot:()=>snapshot});
})(typeof window!=='undefined'?window:globalThis);
