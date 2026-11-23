/* P3-74: side-effect-free purchase/skip research audit. Never sets official BUY/PASS. */
(function(root){'use strict';
const VERSION='p3-74-buy-skip-audit-v1';
const num=x=>x===null||x===undefined||x===''?NaN:Number(x);
const clean=x=>String(x??'').normalize('NFKC').trim(),name=x=>clean(x).replace(/[\s\u3000]/g,'');
const dateOk=s=>{s=String(s||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s};
const item=(code,message)=>({code,message});
function parseRoster(text){
 const list=[],errors=[];
 for(const line of String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
  const m=line.normalize('NFKC').match(/^(\d{1,2})[\s,，、\t]+(.+)$/);
  if(!m){errors.push('馬番,馬名の形式ではない行');continue}
  const no=String(Number(m[1])),nm=clean(m[2]);
  if(+no<1||+no>18||!name(nm))errors.push('馬番または馬名が不正');else list.push({no,name:nm});
 }
 if(new Set(list.map(x=>x.no)).size!==list.length)errors.push('馬番が重複');
 if(new Set(list.map(x=>name(x.name))).size!==list.length)errors.push('馬名が重複');
 return{rows:list,errors};
}
function audit(input){
 const x=input||{},r=x.race||{},grade=clean(r.grade).toUpperCase(),n=num(r.field),trace=[];
 const official={gate:clean(x.official?.gate||'未確認'),final:clean(x.official?.final||'未確認'),reason:clean(x.official?.reason||'')};
 const make=(status,code,reason,extra={})=>({version:VERSION,productionImpact:false,automaticPurchase:false,calibratedEV:false,status,code,reason,official,trace,axis:null,opponents:[],...extra});
 const hold=(code,reason,extra)=>make('hold',code,reason,extra);
 if(!Number.isInteger(n)||n<12||n>18||!['3勝','OP','L','G1','G2','G3'].includes(grade)||!['芝','ダ','ダート'].includes(clean(r.surface))||!dateOk(r.date)||!clean(r.venue)||!clean(r.name))
  return hold('scope','JRA平地・3勝以上・12〜18頭の開催日、場、名称、芝ダを確認');
 if(['G1','G2','G3'].includes(grade))
  return make('grade_reference','separate_grade_model','重賞は既存Ability C判定を参照。非重賞P10最小相手の払戻結果を重賞に流用しない');
 const A=x.ability||{},M=x.m3||{},P=x.position||{};
 if(A.ready!==true||M.ready!==true||A.activeModel!=='v1'||!Array.isArray(A.rows)||!Array.isArray(M.rows)||A.rows.length!==n||M.rows.length!==n)
  return hold('models_missing','非重賞Ability v1・M3の全頭計算が未成立');
 if(A.leaderAmbiguous||A.top3BoundaryAmbiguous||M.m3Top3BoundaryAmbiguous)return hold('top3_ties','Ability首位またはAbility/M3上位3頭の同点境界');
 const a=new Map(),m=new Map();
 for(const [src,out]of [[A.rows,a],[M.rows,m]])for(const v of src){
  const k=String(Number(v.no));
  if(!/^\d{1,2}$/.test(k)||+k<1||+k>18||out.has(k)||!name(v.name))return hold('duplicate_horses','Ability/M3の馬番・馬名が不正・重複');
  out.set(k,v);
 }
 if(a.size!==n||m.size!==n||[...a].some(([id,v])=>!m.has(id)||name(v.name)!==name(m.get(id).name)))
  return hold('models_roster_mismatch','Ability/M3全頭の馬番・馬名が一致しない');
 const horses=[...a].map(([id,v])=>{
  const f=m.get(id),p=P?.byNo?.[id]||(P.rows||[]).find(z=>String(Number(z.no))===id)||{};
  return{no:id,name:clean(v.name),ar:num(v.abilityRank),m3:num(f.finishRank),abilityTieEnd:num(v.abilityTieEnd),histN:num(v.histN),p10:num(p.p10),p10Name:clean(p.name)};
 });
 if(horses.some(h=>![h.ar,h.m3].every(Number.isInteger)||h.ar<1||h.ar>n||h.m3<1||h.m3>n))return hold('ranks_missing','Ability/M3順位の欠損');
 const a3=horses.filter(z=>z.ar<=3),m3=horses.filter(z=>z.m3<=3);
 if(a3.length!==3||m3.length!==3)return hold('top3_invalid','上位3頭の人数が不正');
 const mids=new Set(m3.map(z=>z.no)),overlap=a3.filter(z=>mids.has(z.no)).sort((u,v)=>u.ar-v.ar);
 trace.push(item('structure','AbilityとM3上位3頭の一致 '+overlap.length+'頭'));
 const shared={structure:overlap.length===2?'pair':'single',overlap,horses};
 if(overlap.length===0||overlap.length>=3)return make('skip','structure_not_selectable','一致'+overlap.length+'頭。単独軸またはPair2頭が成立せず見送り',{...shared});
 if(overlap.length===1&&overlap[0].ar>2)return make('skip','ability3_only','単独一致がAbility3位のみ。既存軸基準外',{...shared});
 const roster=parseRoster(x.roster?.text),rr=x.roster||{};
 if(rr.confirmed!==true||clean(rr.source).length<5||roster.errors.length||roster.rows.length!==n||
   roster.rows.some(h=>!a.has(h.no)||name(a.get(h.no).name)!==name(h.name)))
   return hold('official_roster_not_attested','別の出走表で確定馬番・馬名を全頭照合し、出典と確認欄を入力',{...shared});
 trace.push(item('roster','手動出走表と全頭一致。公式APIによる独立確認ではない'));
 const q=x.quality||{},e=x.reviews||{},entry=no=>e[String(no)]||{};
 const complete=no=>['good','neutral','bad'].includes(entry(no).fit)&&clean(entry(no).reason).length>=8;
 if(!['inner_front','inner_closer','outer_front','outer_closer'].includes(q.type)||q.preRaceDeclared!==true||clean(q.source).length<5||clean(q.evidence).length<8)
   return hold('quality_evidence_missing','4象限レース質の根拠・出典・発走前情報である旨を記録',{...shared});
 let axis;
 if(overlap.length===1){axis=overlap[0];trace.push(item('axis','Ability×M3単独一致馬を軸候補に固定'))}
 else{
  if(overlap.some(h=>!complete(h.no)))return hold('pair_reviews_missing','Pair2頭のレース質・隊列適合を両方評価',{...shared});
  const best=overlap.filter(h=>entry(h.no).fit==='good');
  if(best.length!==1)return make('skip','pair_not_unique',best.length===2?'Pair両馬が適合。軸の優劣を決められない':'Pairで唯一適合する軸なし',{...shared});
  axis=best[0];trace.push(item('axis','Pairの唯一適合馬を研究用の仮軸に選択。収益優位は未検証'));
 }
 if(!complete(axis.no))return hold('axis_review_missing','軸候補の展開適合理由が必要',{...shared,axis});
 if(entry(axis.no).fit==='bad')return make('skip','axis_unfavorable','軸候補はレース質・隊列に明確な不利',{...shared,axis});
 const possible=horses.filter(h=>h.no!==axis.no).sort((u,v)=>u.ar-v.ar||u.m3-v.m3||Number(u.no)-Number(v.no));
 if(possible.length<4||possible.slice(0,4).some(h=>h.ar<=4&&Number.isFinite(h.abilityTieEnd)&&h.abilityTieEnd>4))
   return hold('partner_tie','相手3頭のAbility順位境界が同点',{...shared,axis});
 const opponents=possible.slice(0,3),basis={...shared,axis,opponents};
 trace.push(item('partners','軸以外のAbility順位上位3頭を、レース質を評価する前に固定'));
 if(P.ready!==true||!Array.isArray(P.rows)||P.rows.length!==n||opponents.some(h=>!Number.isFinite(h.p10)||h.p10<0||h.p10>1||h.p10Name&&name(h.name)!==name(h.p10Name)))
   return hold('p10_unavailable','相手3頭のP10入力が不完全・馬名不一致',{...basis});
 const sorted=[...opponents].sort((u,v)=>u.p10-v.p10||u.ar-v.ar);
 if(Math.abs(sorted[0].p10-sorted[1].p10)<1e-10)return hold('p10_tied','相手P10同値。仮番号で強制選定しない',{...basis});
 basis.preferredOpponent=sorted[0];
 trace.push(item('p10','過去58Rの探索結果に基づきP10最小馬を第一候補。未較正の馬券確率ではない'));
 if(opponents.some(h=>!complete(h.no)))return hold('partner_reviews_missing','相手3頭それぞれの展開適合と理由を確認',{...basis});
 const fit=opponents.filter(h=>entry(h.no).fit==='good');
 if(fit.length!==1)return make('skip','partner_not_unique',fit.length===0?'相手3頭に適合馬なし':'複数の相手馬が適合し1頭に絞れない',{...basis});
 const chosen=fit[0];
 trace.push(item('partner','レース質・隊列による唯一適合馬 '+chosen.no+'番'+(chosen.no===sorted[0].no?'（P10優先馬と一致）':'（P10優先馬から変更。効果未実証）')));
 if(clean(x.manualSkip).length>=3)return make('skip','manual_skip','利用者の見送り判断：'+clean(x.manualSkip),{...basis,selectedOpponent:chosen});
 const t=x.quote||{},price=num(t.odds),ticket=clean(t.ticket),observed=clean(t.observedAt);
 if(!['wide','quinella'].includes(ticket)||!(price>1)||!observed)
  return make('price_pending','price_not_recorded','軸・相手の研究候補は確定。券種・事前観測オッズ・時刻を記録',{...basis,selectedOpponent:chosen});
 return make('research_complete','unvalidated_joint_ev','候補と市場価格を保存可能。連系馬券の共同的中確率は未較正なので期待値・購入可否は自動判定しない',
  {...basis,selectedOpponent:chosen,quote:{ticket,odds:price,observedAt:observed}});
}
function snapshot(input,result){
 return{schema:'rsa-p374-buy-skip-research-snapshot-v1',deviceCapturedAt:new Date().toISOString(),note:'端末時刻は発走前であることを第三者が保証する記録ではない。買い目のEV未較正。',researchOnly:true,productionImpact:false,input:JSON.parse(JSON.stringify(input)),decision:JSON.parse(JSON.stringify(result))};
}
root.RSAPurchaseAuditCoreV1=Object.freeze({version:VERSION,audit,parseRoster,snapshot,productionImpact:false});
})(typeof window!=='undefined'?window:globalThis);
