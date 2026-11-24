/* Postrace corner observation helpers. No betting or probability changes. */
(function(root){"use strict";
const VERSION="postrace-corner-core-v1-20261124";
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=v=>v===null||v===undefined||String(v).trim()===""?NaN:Number(v);
const label=k=>({"1":"1角","2":"2角","3":"3角","4":"4角"}[String(k)]||"初記録角");
function readRank(raw,n){
 const s=String(raw??"").trim();
 if(s==="-"||s==="—"||/^NA$/i.test(s))return {ok:true,n:null};
 const v=Number(s);return {ok:/^\d+$/.test(s)&&Number.isInteger(v)&&v>=1&&v<=n,n:v};
}
function parse(raw,roster,firstCorner){
 const fc=String(firstCorner||""),n=roster.length,errors=[],out={};
 const lines=String(raw||"").normalize("NFKC").trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const ids=new Set(roster.map(h=>String(Number(h.no))));
 if(!["1","2","3","4"].includes(fc))errors.push("最初の記録角を選択してください");
 if(n<12||n>18||ids.size!==n)errors.push("12〜18頭の出走一覧を解析してください");
 if(lines.length!==n)errors.push("全"+n+"頭を入力してください（現在"+lines.length+"行）");
 for(const [i,line] of lines.entries()){
  const a=line.split(/[\t ,，、　]+/).filter(Boolean);
  if(a.length!==4){errors.push((i+1)+"行目：馬番 初角 3角 4角の4列で入力");continue}
  if(!/^\d+$/.test(a[0])||!ids.has(String(Number(a[0])))){errors.push((i+1)+"行目：馬番不一致");continue}
  const id=String(Number(a[0]));
  if(Object.prototype.hasOwnProperty.call(out,id)){errors.push(id+"番の入力重複");continue}
  const x=readRank(a[1],n),y=readRank(a[2],n),z=readRank(a[3],n);
  if(!x.ok||!y.ok||!z.ok){errors.push(id+"番：順位範囲外。欠測は -");continue}
  let initial=x.n,c3=y.n,c4=z.n;
  if(fc==="3"){
   if(initial===null)initial=c3;
   if(c3===null)c3=initial;
   if(initial!==c3){errors.push(id+"番：最初が3角なら初角と3角を一致させてください");continue}
  }
  if(fc==="4"){
   if(c3!==null){errors.push(id+"番：最初が4角なら3角は -");continue}
   if(initial===null)initial=c4;
   if(c4===null)c4=initial;
   if(initial!==c4){errors.push(id+"番：最初が4角なら初角と4角を一致させてください");continue}
  }
  out[id]={initial,c3,c4};
 }
 if(Object.keys(out).length!==n)errors.push("全頭の馬番が揃っていません");
 if(!errors.length&&!Object.values(out).some(z=>z.initial!==null))errors.push("初記録角の順位が未記録です");
 return {ok:errors.length===0,errors,values:out,firstCorner:fc};
}
function frozen(ctx){
 const f=ctx?.frozen,r=ctx?.roster;
 if(!f||f.locked!==true||!Array.isArray(f.formation)||!Array.isArray(r)||f.formation.length!==r.length)return null;
 const map=new Map(f.formation.map(h=>[String(h.no),h]));
 if(map.size!==r.length)return null;
 if(!r.every(h=>map.has(String(h.no))&&String(map.get(String(h.no)).name)===String(h.name)))return null;
 if(JSON.stringify(f.race)!==JSON.stringify(ctx.race))return null;
 return f;
}
function compare(ctx,result){
 const prior=frozen(ctx),index=new Map((prior?.formation||[]).map(h=>[String(h.no),h]));
 let count=0,absolute=0,signed=0;
 const rows=ctx.roster.map(h=>{
  const id=String(h.no),a=result.actual[id],p=N(index.get(id)?.expectedRank),v=a?.initial;
  const matched=Number.isFinite(p)&&Number.isFinite(v),delta=matched?v-p:null;
  if(matched){count++;absolute+=Math.abs(delta);signed+=delta}
  return {no:id,name:h.name,pred:Number.isFinite(p)?p:null,initial:v??null,c3:a?.c3??null,c4:a?.c4??null,delta};
 });
 return {frozen:!!prior,rows,count,mae:count?absolute/count:null,bias:count?signed/count:null};
}
function validSaved(result,ctx){
 if(!result||result.version!=="postrace-corner-ui-v1-20261124"||result.raceKey!==ctx.key||!result.actual)return false;
 if(Object.keys(result.actual).length!==ctx.roster.length)return false;
 const txt=ctx.roster.map(h=>{
  const z=result.actual[String(h.no)]||{},parts=["initial","c3","c4"].map(k=>z[k]===null?"-":String(z[k]??"BAD"));
  return [h.no,...parts].join(" ");
 }).join("\n");
 return parse(txt,ctx.roster,result.firstCorner).ok;
}
function actualMap(ctx,result,stage,turn){
 const n=ctx.roster.length,known=[],unknown=[],slots=[];
 for(const h of ctx.roster){
  const rank=result.actual[String(h.no)]?.[stage];
  if(!Number.isInteger(rank)){unknown.push(h);continue}
  known.push({no:String(h.no),name:h.name,rank});
 }
 known.sort((a,b)=>a.rank-b.rank||Number(a.no)-Number(b.no));
 for(const h of known){
  const x=305-250*(h.rank-1)/Math.max(n-1,1);
  let row=0;while(slots[row]?.some(z=>Math.abs(z.x-x)<30))row++;
  if(!slots[row])slots[row]=[];
  h.x=x;h.y=56+row*38;slots[row].push(h);
 }
 const height=Math.max(151,Math.max(0,...known.map(h=>h.y))+40);
 let svg='<svg viewBox="0 0 360 '+height+'" role="img" aria-label="'+E("実測"+(stage==="initial"?label(result.firstCorner):stage==="c3"?"3角":"4角")+"、内外は実測なし")+'">';
 svg+='<rect x="2" y="2" width="356" height="'+(height-4)+'" rx="12" fill="#245039"/>';
 svg+='<text x="'+(turn==="left"?285:16)+'" y="23" font-size="12" fill="#ffffff">先頭側</text>';
 svg+='<text x="'+(turn==="left"?15:283)+'" y="23" font-size="12" fill="#ffffff">後方側</text>';
 for(const h of known){
  const x=turn==="left"?360-h.x:h.x,role=h.no===ctx.axis?"axis":ctx.partners.includes(h.no)?"partner":"other";
  const fill=role==="axis"?"#7358c5":role==="partner"?"#0c968b":"#edf3ed";
  svg+='<g><title>'+E(h.no+"番 "+h.name+" 実測"+h.rank+"番手")+'</title>';
  svg+='<circle cx="'+x.toFixed(2)+'" cy="'+h.y+'" r="14" fill="'+fill+'" stroke="#d3e5d9" stroke-width="1.6"/>';
  svg+='<text x="'+x.toFixed(2)+'" y="'+(h.y+4.4)+'" text-anchor="middle" font-size="12" font-weight="750" fill="'+(role==="other"?"#264135":"#ffffff")+'">'+E(h.no)+'</text></g>';
 }
 svg+="</svg>";
 return {svg,known,unknown};
}
root.RSAPostraceCornerCoreV1=Object.freeze({version:VERSION,parse,compare,frozen,validSaved,actualMap,label});
})(typeof window!=="undefined"?window:globalThis);
