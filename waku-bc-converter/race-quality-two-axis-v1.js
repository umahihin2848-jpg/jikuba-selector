(function raceQualityTwoAxis(){
  'use strict';
  if(window.RaceQualityTwoAxisV1) return;
  const V='race-quality-two-axis-v1.1.0', STORE='race_quality_two_axis_predictions_v1',$=id=>document.getElementById(id);
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const N=v=>v===null||v===undefined||v===''?NaN:Number(v);
  const LATERAL=[['unknown','まだ判断しない'],['outer_loss','外回しの距離ロス大'],['flat','内外の差は小さい'],['inner_slow','内を通ると伸びない']];
  const LONGITUDINAL=[['unknown','まだ判断しない'],['front_holds','前後差が埋まらず前残り'],['even','前後差は概ね互角'],['natural_close','前後差が自然に縮む'],['front_fades','逃げ・先行馬が止まる']];
  const CONF=[['high','高'],['medium','中'],['low','低']];
  let raceId='',draft={lateral:'unknown',longitudinal:'unknown',confidence:'medium'},sig='',latest=null,note='',timer=0;
  function race(){const f=$('csvFile')?.files?.[0];return{date:$('raceDate')?.value||'',name:$('raceName')?.value||'',venue:$('venue')?.value||'',grade:$('grade')?.value||'',surface:$('surface')?.value||'',distance:Number($('distance')?.value)||0,field:Number($('fieldSize')?.value)||0,csv:f?.name||'',csvModified:f?.lastModified||0}}
  function keyOf(x){return JSON.stringify([x.date,x.name,x.venue,x.grade,x.surface,x.distance,x.field,x.csv,x.csvModified])}
  function enumHtml(opts,sel){return opts.map(([k,v])=>`<option value="${E(k)}"${k===sel?' selected':''}>${E(v)}</option>`).join('')}
  function evaluate(ctx,options){
    const {queue,market,axisNo,frontState}=ctx||{},field=Number(ctx?.field)||0;
    if(!queue?.ready||!Array.isArray(queue.rows)||queue.rows.length!==field||Number(queue.fieldSize)!==field||field<12)return{ready:false,reason:'隊列データ待ち／頭数未一致'};
    if(!axisNo||!market?.complete||!Array.isArray(market.rows)||market.rows.length!==field)return{ready:false,reason:'軸判定または全頭単勝オッズ待ち'};
    const q=queue.rows,byNo=Object.fromEntries(q.map(r=>[String(Number(r.no)),r])),fields=q.filter(r=>Boolean(r.validated)&&N(r.hist_n)>=2&&Number.isFinite(N(r.expectedRank)));
    const sorted=[...market.rows].filter(m=>String(Number(m.no))!==String(Number(axisNo))).sort((a,b)=>N(a.pop)-N(b.pop)||N(a.od)-N(b.od)||Number(a.no)-Number(b.no));
    const preselected=sorted.slice(0,2).map(m=>String(Number(m.no)));
    const lateral=options?.lateral||'unknown',longitudinal=options?.longitudinal||'unknown',confidence=options?.confidence||'medium';
    const baselineApplicable=lateral!=='unknown'&&longitudinal!=='unknown'&&confidence!=='low';
    const stateByNo=Object.fromEntries((frontState?.rows||[]).map(r=>[String(Number(r.no)),r]));
    const rows=sorted.map(m=>{
      const no=String(Number(m.no)),r=byNo[no],rank=N(r?.expectedRank),frontness=N(r?.frontness5),lane=N(r?.laneIdx),odds=N(m.od),pop=N(m.pop);
      const valid=Boolean(r?.validated)&&N(r?.hist_n)>=2&&Number.isFinite(rank)&&Number.isFinite(frontness);
      const laneKnown=valid&&Number.isInteger(lane)&&lane>=0&&lane<=3;
      const front=valid&&(rank<=Math.max(5,field*.40)||frontness>=.66),rear=valid&&rank>=field*.53&&frontness<=.55;
      const inner=laneKnown&&lane<=1,outer=laneKnown&&lane>=2;
      const blockers=laneKnown?fields.filter(x=>String(Number(x.no))!==no&&Number.isInteger(N(x.laneIdx))&&N(x.laneIdx)>lane&&N(x.laneIdx)<=3&&Math.abs(N(x.expectedRank)-rank)<=2.25).length:null;
      const frontCheck=stateByNo[no]||null;
      let access='判定保留',accessDetail='実走進路は未確定',move='判定保留',track='未判定',position='未判定',flags=[];
      if(valid&&laneKnown){
        if(inner&&rear){
          if(blockers>=2){access='外へ出しにくい可能性';accessDetail=`予測隊列の外側・同順位帯に${blockers}頭。物理的閉塞は未確認`}
          else{access='外へ出せる余地';accessDetail=`予測隊列の外側・同順位帯は${blockers}頭。実際の通り道は未確定`}
        }else if(inner&&front){
          if(frontCheck?.level==='high'||frontCheck?.level==='watch'){access='被される可能性';accessDetail=`従来の先行位置警告：${frontCheck.label}`}
          else {access='内の先行位置を想定';accessDetail='外から被される可能性は隊列で別途確認'}
        }else if(outer){access='外側の進路を想定';accessDetail='内へ潜る場合の横移動は確定できない'}
        else{access='中団の位置を想定';accessDetail='前が壁になるリスクは実走映像で確認'}
      }else if(valid){access='走行レーン未取得';accessDetail='予想初角順位はあるが内外レーンが未取得'}
      else{access='過去走不足';accessDetail='有効な過去位置取りが2走未満'}
      if(lateral==='outer_loss'){
        if(outer){track='外回しのロス懸念';move='内へ入れるかが鍵';flags.push('外の距離ロス')}
        else if(inner){track='内でロスを抑えやすい';move='内の通り道を維持できるか'}
        else if(valid){track='走行レーン要確認';move='内外ロスは未判定'}
      }else if(lateral==='inner_slow'){
        if(inner){
          move=blockers>=2?'外への移動が難しい可能性': '外へ出す余地はあるが移動ロスは不明';
          track=blockers>=2?'内の減速＋出口狭い懸念':'内は不利・外へ出す余地を確認';
          if(blockers>=2)flags.push('内の減速＋進路制約');
        }else if(outer){track='内の減速を避けられる可能性';move='外を通る距離ロスと比較'}
        else if(valid){track='レーンが未確定';move='伸びる進路を取れるか未確認'}
      }else if(lateral==='flat'){
        track='内外の馬場差は小さい想定';move='能力・コース形態・距離ロスを優先';
      }
      if(longitudinal==='front_holds'){
        if(rear){position='後方から届かない懸念';flags.push('前残り×後方')}
        else if(front)position='先行位置の優位を維持できる可能性';
        else if(valid)position='好位差をどこまで詰められるか';
      }else if(longitudinal==='natural_close'){
        if(rear)position='後方との距離が縮む可能性';
        else if(front)position='前との差が自然に縮む点を注意';
        else if(valid)position='位置差が縮む想定';
      }else if(longitudinal==='front_fades'){
        if(front){position='先行馬の終盤失速に注意';flags.push('前の失速')}
        else if(rear)position='前の失速で届く余地あり';
        else if(valid)position='差し上昇の余地を検討';
      }else if(longitudinal==='even'&&valid)position='前後差は互角・能力を優先';
      const strong=valid&&laneKnown&&confidence!=='low'&&lateral!=='unknown'&&longitudinal!=='unknown'&&(
          (lateral==='inner_slow'&&inner&&blockers>=2&&longitudinal==='front_holds'&&rear)||
          (lateral==='outer_loss'&&outer&&rear&&longitudinal==='front_holds')
        );
      const caution=valid&&(flags.length>0||access==='被される可能性');
      const level=!valid||!laneKnown?'unknown':strong?'strong':caution?'watch':'normal';
      return{no,name:String(r?.name||m.name||''),pop:Number.isFinite(pop)?pop:null,odds:Number.isFinite(odds)?odds:null,
        expectedRank:valid?rank:null, lane:laneKnown?lane:null, front, rear, blockers,
        access,accessDetail,track,move,position,level,flags,frontWarning:frontCheck?.level||null};
    });
    // Preserve the exact same two market picks unless a high-confidence *joint* warning
    // is present. Replacement is a research-only counterfactual, not a production ticket.
    let candidate=null,changed=[],reason='';
    if(baselineApplicable){
      const highWarn=new Set(rows.filter(r=>r.level==='strong').map(r=>r.no));
      if(preselected.some(no=>highWarn.has(no))){
        const keep=preselected.filter(no=>!highWarn.has(no));
        const incoming=rows.filter(r=>!preselected.includes(r.no)&&r.pop!==null&&r.pop<=9&&r.odds!==null&&r.odds<40&&r.level!=='strong'&&r.level!=='unknown');
        const selected=[...keep];
        while(selected.length<2&&incoming.length){const next=incoming.shift();selected.push(next.no);changed.push(next.no)}
        if(selected.length===2){candidate=selected;reason='複数の不利条件が重なった市場上位馬を比較用に差し替え'}
        else reason='安全に比較できる補充候補が足りないため保留';
      }else{candidate=preselected.slice();reason='強い複合注意の馬が市場Top2にいないため変更なし'}
    }else reason='2軸の判断が揃わないか確信度が低いため、比較案は保留';
    const study=window.RaceQualityTop2LogicV1?.rank(rows,{lateral,longitudinal,confidence})||{ready:false,top2:null,ranked:[],reason:'研究用Top2のロジック未読込'};
    return{ready:true,version:V,axisNo:String(axisNo),inputs:{lateral,longitudinal,confidence},marketTop2:preselected,
      shadowTop2:candidate,changed,reason,rows,raceQualityTop2:study.top2,raceQualityRanked:study.ranked,raceQualityReason:study.reason,
      calibrated:false,productionImpact:false,changesProductionTickets:false,at:Date.now()};
  }
  function css(){
    if($('rq2-css'))return;
    const s=document.createElement('style');s.id='rq2-css';s.textContent=`
    #rq2-root{color:#e5f1f7;background:#0a2130;border:1px solid #3e6d7b;border-radius:14px;margin:12px 0;padding:13px;line-height:1.52}
    #rq2-root h3{font-size:16px;margin:0 0 5px;color:#eaf7fa}
    #rq2-root p.rq2-note{font-size:11px;color:#abc1cc;margin:6px 0}
    #rq2-root .rq2-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:10px 0}
    #rq2-root label{display:block;font-size:12px;color:#c2d9e2}
    #rq2-root select{width:100%;min-height:43px;margin-top:4px;border:1px solid #648a9a;background:#153544;color:#f3f8fc;padding:8px;border-radius:9px;font-size:14px}
    #rq2-root .rq2-pair{background:#102d3d;border-radius:10px;border:1px solid #41647a;padding:10px;margin:10px 0}
    #rq2-root .rq2-pair strong{display:block;font-size:14px;margin:2px 0 6px}
    #rq2-root .rq2-pair small{font-size:11px;color:#aac0c9}
    #rq2-root .rq2-row{padding:9px;margin-top:7px;border-radius:10px;border:1px solid #385969;background:#0e2936}
    #rq2-root .rq2-row.warn{border-color:#b78a63}
    #rq2-root .rq2-row strong{font-size:13px}
    #rq2-root .rq2-row small{display:block;font-size:11px;color:#adc4ce;margin-top:4px}
    #rq2-root .rq2-tag{font-size:10px;white-space:nowrap;border:1px solid #6a8792;border-radius:7px;padding:2px 5px;margin-left:6px}
    #rq2-root button{min-height:39px;border-radius:8px;background:#1d5163;border:1px solid #59889a;color:#effaff;font-size:12px;padding:8px 12px}
    #rq2-root .rq2-rows{max-height:470px;overflow-y:auto}
    #rq2-legacy{margin:8px 0}#rq2-legacy>summary{cursor:pointer;color:#b1c9d1;font-size:12px;padding:8px;border:1px solid #3d5e6d;border-radius:9px}
    html[data-race-gate]:not([data-race-gate="open"]) #rq2-root,
    html[data-race-gate]:not([data-race-gate="open"]) #rq2-legacy{display:none!important}
    `;document.head.appendChild(s);
  }
  function relocateLegacy(){
    const old=$('rq23-root');if(!old)return;
    let holder=$('rq2-legacy');
    if(!holder){
      holder=document.createElement('details');holder.id='rq2-legacy';
      holder.innerHTML='<summary>旧方式の芝6分類・ダート4分類（研究用の参考）</summary>';
      const p=old.parentElement;
      if(p)p.insertBefore?p.insertBefore(holder,old):p.appendChild(holder);
    }
    if(old.parentElement!==holder)holder.appendChild(old);
  }
  function pane(){
    let root=$('rq2-root');const parent=$('rqfr-root')?.parentElement||$('imsTicket')||$('result');
    if(!parent)return null;
    if(!root){root=document.createElement('section');root.id='rq2-root';root.setAttribute('aria-label','レース質2軸の相手馬検証');const old=$('rqfr-root');if(old?.parentElement===parent&&parent.insertBefore)parent.insertBefore(root,old);else parent.appendChild(root)}
    else if(root.parentElement!==parent)parent.appendChild(root);
    relocateLegacy();return root;
  }
  function logs(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
  function render(){
    css();const x=race(),key=keyOf(x);
    if(raceId!==key){raceId=key;draft={lateral:'unknown',longitudinal:'unknown',confidence:'medium'};note='';sig=''}
    const el=pane();if(!el)return;
    const open=document.documentElement.dataset.raceGate==='open'&&window.RSAAnalysisTransitionState?.status==='ready';
    if(!open){el.hidden=true;latest=null;window.RaceQualityTwoAxisV1State={ready:false,blocked:true};return}
    el.hidden=false;
    const shell=window.DecisionShellV2State||{},q=window.ValidatedQueueState,axisNo=shell?.structure?.axis?.no;
    const result=evaluate({field:x.field,queue:q,market:shell.market,axisNo,frontState:window.RaceQualityFrontRiskShadowV1State},draft);
    latest={race:x,key,inputs:{...draft},result};
    const hasLog=logs().some(z=>z.key===key);
    const next=JSON.stringify([key,draft,axisNo,q?.rows?.map(y=>[y.no,y.expectedRank,y.laneIdx,y.hist_n]),shell?.market?.rows?.map(y=>[y.no,y.pop,y.od]),window.RaceQualityFrontRiskShadowV1State?.rows?.map(y=>[y.no,y.level]),note,hasLog]);
    if(next===sig)return;sig=next;
    const inputs=`<div class="rq2-ctl">
      <label>横方向｜内外の走行コスト<select data-rq2="lateral">${enumHtml(LATERAL,draft.lateral)}</select></label>
      <label>縦方向｜前後の差<select data-rq2="longitudinal">${enumHtml(LONGITUDINAL,draft.longitudinal)}</select></label>
      <label>判断の確信度<select data-rq2="confidence">${enumHtml(CONF,draft.confidence)}</select></label>
      </div>`;
    const formatNo=no=>{const r=result.rows?.find(z=>z.no===String(no));return r?`${E(r.no)}番 ${E(r.name)}`:`${E(no)}番`};
    let body=`<p class="rq2-note">${E(result.reason||'')}</p>`;
    if(result.ready){
      const baseline=result.marketTop2.map(formatNo).join('・'),comparison=result.raceQualityTop2?.map(formatNo).join('・')||'判定保留';
      const studyDetail=(result.raceQualityRanked||[]).slice(0,2).map(t=>`${E(t.rank)}位 ${formatNo(t.no)}：適合段階${t.score>0?'+':''}${E(t.score)}｜${E(t.reasons.join('、'))}`).join(' ／ ');
      body=`<div class="rq2-pair"><small>現行本番相手（市場Top2）</small><strong>${baseline}</strong><small>レース質Top2｜研究用（本番の馬券ロジックには接続しない）</small><strong>${comparison}</strong><small>${E(result.raceQualityReason)}${studyDetail?' ／ '+studyDetail:''}</small></div>
      <div class="rq2-rows">${result.rows.map(r=>{
      const caution=r.level==='strong'?'強い複合注意':r.level==='watch'?'要確認':r.level==='unknown'?'データ不足':'通常';
      const mark=[result.marketTop2.includes(r.no)?'市場Top2':'',result.raceQualityTop2?.includes(r.no)?'レース質Top2':''].filter(Boolean).join('・');
      const fit=(result.raceQualityRanked||[]).find(t=>t.no===r.no);
      return `<div class="rq2-row ${r.level==='strong'?'warn':''}">
        <strong>${E(r.no)}番 ${E(r.name)} ${r.pop!==null?E(r.pop)+'人気':''}</strong><span class="rq2-tag">${E(caution)}</span>${mark?`<span class="rq2-tag">${E(mark)}</span>`:''}
        <small>想定初角${r.expectedRank!==null?Math.round(r.expectedRank)+'位':'未判定'}｜予測レーン${r.lane!==null?['内ラチ','内','中','外'][r.lane]:'未取得'}。${E(r.accessDetail)}</small>
        <small>横：${E(r.track)} ／ 移動：${E(r.move)}</small>
        <small>縦：${E(r.position)}</small>
        ${fit?`<small>研究用適合段階：${fit.score>0?'+':''}${E(fit.score)}｜${E(fit.reasons.join('、'))}</small>`:''}
      </div>`}).join('')}</div>`;
    }
    el.innerHTML=`<h3>レース質Top2 × 進路｜相手比較</h3>
      <p class="rq2-note">観察した馬場を2項目で入力。AIが予測した位置・レーンと合わせ、相手馬の不利を確認する試験版。</p>
      ${inputs}${body}
      <div><button type="button" data-rq2-action="save" ${!result.ready||hasLog?'disabled':''}>${hasLog?'このレースは保存済み':'発走前の予測を保存'}</button>
      <button type="button" data-rq2-action="export">保存記録を出力</button></div>
      ${note?`<p class="rq2-note">${E(note)}</p>`:''}
      <p class="rq2-note">適合段階は未較正の研究用指標で、好走確率ではありません。レーンは推定であり実走経路ではありません。CORE・M3・本番の相手Top2・購入判定は変更しません。</p>`;
    window.RaceQualityTwoAxisV1State={...result,displayOnly:true,updatedAt:Date.now()};
  }
  function save(){
    if(!latest?.result.ready||document.documentElement.dataset.raceGate!=='open')return;
    const a=logs();if(a.some(z=>z.key===latest.key)){note='既に保存済み。上書きはしません';sig='';render();return}
    const raceDay=latest.race.date,rd=/^\d{4}-\d{2}-\d{2}$/.test(raceDay)?new Date(raceDay+'T00:00:00').getTime():NaN;
    const record={key:latest.key,version:V,recordedAt:new Date().toISOString(),race:latest.race,inputs:latest.inputs,prediction:latest.result,
      preRaceVerified:false,mayBeRetrospective:Number.isFinite(rd)&&rd<new Date().setHours(0,0,0,0)};
    a.push(record);try{localStorage.setItem(STORE,JSON.stringify(a));note=`保存しました（${a.length}レース）。入力時刻は後で照合してください。`}
    catch(e){note='保存できませんでした。端末の保存容量を確認してください'}
    sig='';render();
  }
  function exportData(){
    const t=JSON.stringify({version:V,exportedAt:new Date().toISOString(),records:logs()},null,2);
    const url=URL.createObjectURL(new Blob([t],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='race_quality_two_axis_predictions.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function schedule(ms=120){clearTimeout(timer);timer=setTimeout(render,ms)}
  document.addEventListener('change',ev=>{
    const el=ev.target;if(el?.dataset?.rq2&&['lateral','longitudinal','confidence'].includes(el.dataset.rq2)){draft[el.dataset.rq2]=el.value;note='';sig='';schedule(0)}
    else if(el?.id==='csvFile')schedule(150);
  },true);
  document.addEventListener('click',ev=>{
    const el=ev.target;const cmd=el?.closest?.('[data-rq2-action]')?.dataset?.rq2Action;
    if(cmd==='save')save();else if(cmd==='export')exportData();
    else if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(el?.id))schedule(300);
  },true);
  document.addEventListener('input',ev=>{if(['raceDate','raceName','venue','grade','surface','distance','fieldSize','oddsPaste'].includes(ev.target?.id))schedule(150)},true);
  ['rsa-analysis-start','rsa-analysis-complete','rsa-analysis-error','validated-queue-ready','decision-shell-v2-ready','opponent-candidate-pool-ready','rsa-addons-ready'].forEach(x=>addEventListener(x,()=>schedule(100)));
  window.RaceQualityTwoAxisV1={version:V,evaluate,render,exportData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(250),{once:true});else schedule(180);
})();