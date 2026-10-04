const cheerio=require('cheerio');
(async()=>{
 const ids=['2605040801','2605040802','2605040803','2605040804','2605040805','2605040806','2605040807','2605040808','2605040809','2605040810','2605040811'];
 for(const id of ids){
  try{
   const r=await fetch('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/',{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'}});
   if(!r.ok){console.log(id,'HTTP',r.status);continue}
   const html=await r.text(),$=cheerio.load(html),body=$('body').text().replace(/\s+/g,' ').trim();
   const hm=body.match(/(\d{1,2}:\d{2})発走\s+(.+?)\s+(?:GI{1,3}|G[123]|L)?\s*(芝|ダート)・[^ ]+\s+(\d{3,4})m/);
   console.log('\\nRACE',id,hm?hm.slice(1,5):'NOHDR');
   let shown=0;
   $('tr').each((_,tr)=>{if(shown>=3)return;const c=$(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get();if(c[0]==='1'||c[0]==='2'||c[0]==='3'){console.log('ROW',JSON.stringify(c));shown++}});
  }catch(e){console.log(id,e.message)}
 }
})().catch(e=>{console.error(e);process.exit(1)});