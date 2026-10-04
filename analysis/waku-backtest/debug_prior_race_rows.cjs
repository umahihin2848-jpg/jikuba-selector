const cheerio=require('cheerio');
(async()=>{
 const url='https://sports.yahoo.co.jp/keiba/directory/horse/2022104896/';
 const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'}});
 console.log('HTTP',r.status); const html=await r.text(),$=cheerio.load(html);
 console.log('TITLE',$('title').text());
 $('tr').slice(0,20).each((i,tr)=>{
   const c=$(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get();
   const links=$(tr).find('a').map((_,a)=>({text:$(a).text().trim(),href:$(a).attr('href')})).get();
   if(c.length) console.log('ROW',i,JSON.stringify(c),JSON.stringify(links));
 });
})().catch(e=>{console.error(e);process.exit(1)});