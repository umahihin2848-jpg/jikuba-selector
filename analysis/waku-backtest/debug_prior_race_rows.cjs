const cheerio=require('cheerio');
(async()=>{
 const ids=['2606010101','2606010102','2606010103','2606010104','2606010105','2606010106','2606010107','2606010108','2606010109','2606010110','2606010111'];
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