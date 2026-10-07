(function(){'use strict';
const $=id=>document.getElementById(id);
let M=null,lastSig='';
window.JointPairProbabilityState={ready:false,quinella:[],wide:[],version:'v1'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(p,d=1)=>Number.isFinite(p)?`${(p*100).toFixed(d)}%`:'—';
const css=document.createElement('style');
css.textContent='.jpGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jpCol{border:1px solid #1b394c;border-radius:12px;background:#091a26;padding:9px}.jpRow{display:grid;grid-template-columns:52px 1fr 58px;gap:7px;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)}.jpRow:last-child{border-bottom:0}.jpPair{font-weight:900;font-size:15px}.jpNames{font-size:10px;color:#91adbd;line-height:1.35}.jpP{font-weight:900;text-align:right}.jpNote{margin-top:8px;font-size:10px;color:#7997a8;line-height:1.5}@media(max-width:560px){.jpGrid{grid-template-columns:1fr}.jpRow{grid-template-columns:52px 1fr 62px}}';
document.head.appendChild(css);
function ensureUI(){
  if($('jointPairList'))return;
  const fp=$('finalProbabilityList')?.closest('.card');
  const cp=$('calibratedProbabilityList')?.closest('.card');
  const anchor=fp||cp||document.querySelector('.card.explain');
  if(!anchor)return;
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<h2>⑥ 馬連・ワイド共同確率</h2><div class="muted">各馬を独立に掛け算せず、レース全体の順位分布から組み合わせ確率を直接計算します。現在は確率表示だけで、EV・買い判定には使いません。</div><div id="jointPairState" class="tiny" style="margin-top:7px"></div><div id="jointPairList" style="margin-top:8px"></div><div id="jointPairNote" class="jpNote"></div>';
  anchor.insertAdjacentElement('afterend',c);
  renumber();
}
function renumber(){
  const set=(id,t)=>{const h=$(id)?.closest('.card')?.querySelector('h2');if(h)h.textContent=t};
  set('calibratedProbabilityList','⑦ 10年基礎確率');
  set('integratedViewList','⑧ 馬固有3着内率・内訳');
  set('abilityListV27','⑨ 地力・能力');
  set('courseFitList','⑩ コース相性');
  set('conditionChangeList','⑪ 条件替わり');
  set('horseFitList','⑫ 展開との相性');
  const ex=document.querySelector('.card.explain h2');if(ex)ex.textContent='⑬ レース展望・まとめ';
  const rel=$('reliability')?.closest('.card')?.querySelector('h2');if(rel)rel.textContent='⑭ データ信頼度';
}
function feats(pop,field){
  const a=[];
  for(let p=1;p<=17;p++)a.push(Number(pop)===p?1:0);
  const lp=Math.log1p(Number(pop)),rf=Number(pop)/Number(field);
  a.push(lp,lp*lp,rf,rf*rf);
  return a;
}
function score(pop,field){
  const x=feats(pop,field),m=M.model.means,s=M.model.scales,b=M.model.coef;
  let z=0;
  for(let i=0;i<b.length;i++)z+=b[i]*((x[i]-m[i])/(s[i]||1));
  return z*Number(M.model.temperature_alpha||1);
}
function pairMatrices(rows){
  const n=rows.length,sc=rows.map(x=>score(x.pop,n)),mx=Math.max(...sc),w=sc.map(x=>Math.exp(x-mx)),W=w.reduce((a,b)=>a+b,0);
  const q=Array.from({length:n},()=>Array(n).fill(0)),wd=Array.from({length:n},()=>Array(n).fill(0));
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const p=(w[i]/W)*(w[j]/(W-w[i]))+(w[j]/W)*(w[i]/(W-w[j]));
    q[i][j]=q[j][i]=p;
  }
  for(let a=0;a<n;a++){
    const pa=w[a]/W,W1=W-w[a];
    for(let b=0;b<n;b++){if(b===a)continue;
      const pab=pa*w[b]/W1,W2=W1-w[b];
      for(let c=0;c<n;c++){if(c===a||c===b)continue;
        const p=pab*w[c]/W2;
        const pairs=[[a,b],[a,c],[b,c]];
        for(const [u0,v0] of pairs){const u=Math.min(u0,v0),v=Math.max(u0,v0);wd[u][v]+=p;}
      }
    }
  }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)wd[j][i]=wd[i][j];
  return{q,wd};
}
function renderRows(arr){
  return arr.slice(0,8).map((x,i)=>`<div class="jpRow"><div class="jpPair">${esc(x.a.no)}-${esc(x.b.no)}</div><div><div class="jpNames">${esc(x.a.name)} × ${esc(x.b.name)}</div><div class="tiny">順位 ${x.a.pop}人気＋${x.b.pop}人気</div></div><div class="jpP">${pct(x.p,1)}</div></div>`).join('');
}
function render(){
  ensureUI();const box=$('jointPairList'),state=$('jointPairState');if(!box)return;
  if(!M){box.innerHTML='<div class="notice yellow">共同確率モデルを読込中です。</div>';return}
  const S=window.CalibratedProbabilityState;
  if(!S?.ready||!(S.results||[]).length){box.innerHTML='<div class="notice yellow">レース解析後に表示します。</div>';return}
  const rows=(S.results||[]).map(x=>({no:String(x.no),name:x.name,pop:Number(x.pop)})).filter(x=>x.no&&Number.isFinite(x.pop)).sort((a,b)=>a.pop-b.pop);
  if(rows.length<3){box.innerHTML='<div class="notice yellow">3頭以上の人気順位が必要です。</div>';return}
  const sig=rows.map(x=>`${x.no}:${x.pop}`).join('|');if(sig===lastSig)return;lastSig=sig;
  const {q,wd}=pairMatrices(rows),qa=[],wa=[];let sq=0,sw=0;
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){qa.push({a:rows[i],b:rows[j],p:q[i][j]});wa.push({a:rows[i],b:rows[j],p:wd[i][j]});sq+=q[i][j];sw+=wd[i][j]}
  qa.sort((a,b)=>b.p-a.p);wa.sort((a,b)=>b.p-a.p);
  window.JointPairProbabilityState={ready:true,quinella:qa,wide:wa,version:M.version,sumQuinella:sq,sumWide:sw};
  if(state)state.textContent=`整合性チェック：馬連合計 ${sq.toFixed(3)} / ワイド合計 ${sw.toFixed(3)}`;
  box.innerHTML=`<div class="jpGrid"><div class="jpCol"><b>馬連｜上位8組</b>${renderRows(qa)}</div><div class="jpCol"><b>ワイド｜上位8組</b>${renderRows(wa)}</div></div>`;
  const h=M.holdout_2026||{},qn=h.quinella||{},wn=h.wide||{};
  const note=$('jointPairNote');if(note)note.innerHTML=`2016〜2024学習・2025較正・2026完全OOS ${Number(M.scope.holdout_races||0)}レース / ${Number(M.scope.holdout_pairs||0).toLocaleString()}組。ECE10：馬連 ${pct(qn.ece10,2)}・ワイド ${pct(wn.ece10,2)}。各レースで馬連確率総和=1、ワイド確率総和=3になる共同順位モデルです。<br>※現段階では組み合わせ確率の参考表示です。ペアオッズを使ったEV選別は2024〜2025検証で安定した回収率優位を確認できなかったため、買い判定には採用していません。`;
  window.dispatchEvent(new CustomEvent('joint-pair-probability-ready'));
}
function schedule(){setTimeout(render,80);setTimeout(render,350)}
window.addEventListener('calibrated-probability-ready',schedule);
window.addEventListener('rsa-addons-ready',schedule);
fetch('data/joint_pair_probability_v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()}).then(x=>{M=x;schedule()}).catch(()=>{ensureUI();const b=$('jointPairList');if(b)b.innerHTML='<div class="notice red">共同確率モデルの読込に失敗しました。</div>'});
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ensureUI,{once:true});else ensureUI();
})();