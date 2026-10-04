const cheerio=require('cheerio');
(async()=>{
 const id='2606010111';
 const r=await fetch('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/',{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'}});
 const html=await r.text(),$=cheerio.load(html);
 $('tr').each((_,tr)=>{
   const c=$(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get();
   if(c[0]==='1'||c[0]==='2'||c[0]==='3'){
     const links=$(tr).find('a').map((_,a)=>({text:$(a).text().trim(),href:$(a).attr('href')})).get();
     console.log('ROW',JSON.stringify(c)); console.log('LINKS',JSON.stringify(links));
   }
 });
})().catch(e=>{console.error(e);process.exit(1)});