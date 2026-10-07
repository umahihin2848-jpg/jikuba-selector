(function(){'use strict';
const C=window.ShapeCore;if(!C||!window.File||!File.prototype.arrayBuffer||File.prototype.__rsaSurfaceAliasCompat)return;
const orig=File.prototype.arrayBuffer;
const q=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function addAlias(buf){
  let text,grid;
  try{text=C.decode(buf);grid=C.parseCSV(text)}catch(e){return buf}
  if(!grid||grid.length<2)return buf;
  const h=grid[0].map(x=>String(x||'').trim());
  if(h.includes('芝・ダ'))return buf;
  let src=h.indexOf('芝・ダート');
  if(src<0)src=h.indexOf('芝ダート');
  if(src<0)return buf;
  const out=[h.concat('芝・ダ')];
  for(let i=1;i<grid.length;i++){
    const r=grid[i].slice();while(r.length<h.length)r.push('');
    out.push(r.concat(r[src]??''));
  }
  return new TextEncoder().encode(out.map(r=>r.map(q).join(',')).join('\r\n')).buffer;
}
File.prototype.arrayBuffer=function(){return orig.call(this).then(addAlias)};
File.prototype.__rsaSurfaceAliasCompat=true;
})();