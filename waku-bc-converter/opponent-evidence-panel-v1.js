/* Opponent evidence note; read only. No reranking of the three official partners,
   axis selection, betting gate, or expected ROI. */
(function(root){'use strict';
const VERSION='opponent-evidence-v1.0-20261122';
const N=v=>v===null||v===undefined||v===''?NaN:Number(v);
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=v=>Number.isFinite(N(v))&&N(v)>0;
const $=id=>root.document?.getElementById(id);
function typeOf(h){
 const a=N(h?.abilityRank),m=N(h?.m3Rank);
 if(!valid(a)||!valid(m))return 'missing';
 if(a>=2&&a<=3&&m<=5)return 'agreement';
 if(a>=2&&a<=3&&m>=10)return 'ability_only';
 if(a>=4&&a<=6&&m<=5)return 'm3_challenger';
 return 'mixed';
}
function zone(rank,field,validated=true){
 if(validated!==true||!valid(rank)||!valid(field)||N(rank)>N(field))return '未確定';
 if(N(rank)<=Math.ceil(N(field)/3))return '前方';
 if(N(rank)<=Math.ceil(N(field)*2/3))return '中団';
 return '後方';
}
function notes(h,axis,field){
 const type=typeOf(h),where=zone(h.expectedRank,field,h.queueValidated),axisZone=zone(axis?.expectedRank,field,axis?.queueValidated);
 const labels={agreement:'Ability・M3両上位',ability_only:'能力上位・M3に不安',m3_challenger:'M3上位の比較候補',mixed:'能力とM3を個別確認',missing:'順位データ待ち'};
 let support='',caution='';
 if(type==='agreement'){
  support='Ability2〜3位・M3 1〜5位。非重賞の長期集計で比較的好走率が高い型。';
  caution='順位の一致はワイドの同時好走確率ではない。';
 }else if(type==='ability_only'){
  support='Ability2〜3位。今回の相手関係で能力は上位評価。';
  caution='M3が10位以下。直線の評価が低いが、自動的に消す根拠はない。';
 }else if(type==='m3_challenger'){
  support='M3 1〜5位。残り600mの評価は上位。';
  caution='Ability4〜6位。上位馬を置き換える優位性は長期検証で未確認。';
 }else if(type==='mixed'){
  support='Ability '+(valid(h.abilityRank)?N(h.abilityRank)+'位':'未確定')+'・M3 '+(valid(h.m3Rank)?N(h.m3Rank)+'位':'未確定')+'。';
  caution='片方の順位だけで買い目を決めない。';
 }else{
  support='AbilityかM3の順位が揃っていない。';caution='評価を保留する。';
 }
 let positional='初角の位置取り予測が不足。展開面は保留。';
 if(where!=='未確定'){
  positional='初角'+N(h.expectedRank).toFixed(1)+'番手想定（'+where+'）。';
  if(where==='後方'&&valid(h.m3Rank)&&N(h.m3Rank)>=10)positional+='後方＋M3二桁で、差し届く根拠を別途確認したい。';
  else if(where==='前方'&&valid(h.m3Rank)&&N(h.m3Rank)>=10)positional+='前残りの可能性はあるが、ペース耐性は未検証。';
  else if(where==='後方'&&valid(h.m3Rank)&&N(h.m3Rank)<=5)positional+='末脚評価は高いが、差し届く馬場・ペースかは未確認。';
  else positional+='位置取りが好走に適するかはペース・馬場次第。';
  if(axisZone!=='未確定') positional+=' 軸は'+axisZone+'想定'+(axisZone===where?'（同じ位置取り帯）':'（位置取り帯が異なる）')+'。';
 }
 return {type,label:labels[type],support,caution,positional,zone:where,axisZone};
}
function mainChoice(partners){
 const hits=(partners||[]).filter(h=>typeOf(h)==='agreement');
 if(hits.length===1)return{kind:'single',no:String(hits[0].no),name:String(hits[0].name||''),count:1};
 if(hits.length>1)return{kind:'multiple',no:null,name:null,count:hits.length};
 return{kind:'none',no:null,name:null,count:0};
}
root.RSAOpponentEvidenceCoreV1=Object.freeze({version:VERSION,typeOf,zone,notes,mainChoice});
if(!root.document?.getElementById||typeof root.addEventListener!=='function')return;
function collect(){
 const st=root.RSAFocusedThreeTabsState||{},fo=root.Finish600State||{},ab=root.M3PureAbilityState||{},q=root.ValidatedQueueState||{};
 if(!st.analysisReady||!st.axisNo||!Array.isArray(st.partnerNos)||st.partnerNos.length!==3||!fo.ready||!ab.ready||root.RSAFocusedThreeTabsV1?.dirty)return null;
 const roster=(fo.rows||[]).map(h=>({no:String(h.no),name:String(h.name||'')}));
 if(roster.length<12||roster.length>18||roster.length!==new Set(roster.map(h=>h.no)).size)return null;
 const all=roster.map(h=>{const a=ab.byNo?.[h.no]||{},f=(fo.rows||[]).find(v=>String(v.no)===h.no)||{},pos=q.byNo?.[h.no]||{};
  return {no:h.no,name:h.name,abilityRank:N(a.abilityRank),m3Rank:N(f.finishRank),expectedRank:N(pos.expectedRank),queueValidated:pos.validated===true};
 });
 const idx=Object.fromEntries(all.map(h=>[h.no,h]));
 if(!idx[st.axisNo]||new Set(st.partnerNos).size!==3||st.partnerNos.some(no=>!idx[String(no)]||String(no)===String(st.axisNo)))return null;
 const partners=st.partnerNos.map(no=>idx[String(no)]),axis=idx[String(st.axisNo)];
 const alternatives=all.filter(h=>h.no!==axis.no&&!st.partnerNos.some(no=>String(no)===h.no)&&typeOf(h)==='m3_challenger').sort((a,b)=>N(a.m3Rank)-N(b.m3Rank)||N(a.abilityRank)-N(b.abilityRank)||N(a.no)-N(b.no)).slice(0,3);
 return{partners,axis,alternatives,field:roster.length,grade:String($('grade')?.value||''),abilityModel:ab.activeModel||'v1',all};
}
function draw(){
 const panel=$('rsafPartners');if(!panel)return;
 panel.querySelector('#rsaoEvidenceIntro')?.remove();
 panel.querySelectorAll('.rsao-card-evidence').forEach(el=>el.remove());
 if(panel.hidden)return;
 const data=collect();if(!data||!panel.querySelector('.rsaf-pick-card'))return;
 let main=mainChoice(data.partners);
 const rankTie=data.partners.some(h=>data.all.filter(v=>valid(v.abilityRank)&&N(v.abilityRank)===N(h.abilityRank)).length>1);
 if(rankTie)main={kind:'tie',no:null,name:null,count:0};
 const isGrade=/^G[123]$/.test(data.grade);
 let statement='該当する順位一致馬がいないため、本線は未確定。';
 if(main.kind==='single')statement='順位一致の比較優先：'+main.no+'番 '+main.name+'。ただし展開の適合と軸との同時好走は未確認。';
 if(main.kind==='multiple')statement='順位一致が'+main.count+'頭。根拠だけで1頭に絞れないため、本線は未確定。';
 if(main.kind==='tie')statement='Ability順位に同点があるため、本線は未確定。順位の境界を確認してください。';
 const ref=isGrade?'重賞Ability Cには非重賞の率を転用しません。':'非重賞・2023〜2026年の参考実績：Ability2〜3位かつM3 1〜5位の3着以内率は321/814（39.4%）。個々の馬やワイドの的中確率ではありません。';
 let html='<section id="rsaoEvidenceIntro" class="rsao-intro" aria-label="相手馬の根拠"><div class="rsao-kicker">相手の根拠｜研究表示</div><h3>なぜ軸と一緒に来られるか？</h3><p class="rsao-lead">'+E(statement)+'</p><p class="rsao-muted">'+E(ref)+'</p><div class="rsao-rule"><b>判断の順番</b> Ability → M3 → 初角の位置取り → 軸との同時好走を検討。<br>隊列の一致は同時好走の証拠ではなく、ペース・馬場の検証は未完成。</div>';
 if(data.alternatives.length){html+='<details class="rsao-compare"><summary>相手3頭の外にいるM3上位馬（'+data.alternatives.length+'頭）</summary><div class="rsao-alt-list">'+data.alternatives.map(h=>'<div><b>'+E(h.no)+'番 '+E(h.name)+'</b> <span>Ability '+E(h.abilityRank)+'位 / M3 '+E(h.m3Rank)+'位</span><small>比較用。自動入れ替えはしません。</small></div>').join('')+'</div></details>';}
 html+='<p class="rsao-disclaimer">ワイドの最低オッズ：未設定（軸＋相手の同時3着内率が未較正）。単勝オッズだけでワイド期待値は算定しません。</p></section>';
 panel.insertAdjacentHTML('afterbegin',html);
 const cards=panel.querySelectorAll('.rsaf-pick-card');
 data.partners.forEach((h,i)=>{
  if(!cards[i])return;
  const n=notes(h,data.axis,data.field),selected=main.kind==='single'&&main.no===h.no;
  cards[i].insertAdjacentHTML('beforeend','<div class="rsao-card-evidence"><div class="rsao-evidence-title"><span>選定根拠</span><strong class="'+(selected?'rsao-strong':'')+'">'+E(n.label)+(selected?'・比較優先':'')+'</strong></div><p><b>＋</b> '+E(n.support)+'</p><p><b>△</b> '+E(n.caution)+'</p><p><b>隊列</b> '+E(n.positional)+'</p></div>');
 });
}
['rsa-focused-partner-ready','validated-queue-ready','m3-pure-ability-ready','finish600-ready','rsa-analysis-complete'].forEach(ev=>root.addEventListener(ev,draw));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',draw,{once:true});else draw();
})(typeof window!=='undefined'?window:globalThis);
