const cheerio=require('cheerio');
(async()=>{
 const url='https://sports.yahoo.co.jp/keiba/directory/horse/2022104896/';
 const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'}});
 const html=await r.text(),$=cheerio.load(html);
 let n=0;
 $('a[href*="/keiba/race/"]').each((_,a)=>{
   if(n>=25)return; const tr=$(a).closest('tr');
   const c=tr.find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get();
   console.log('RACE_LINK',$(a).text().trim(),$(a).attr('href'),JSON.stringify(c)); n++;
 });
 console.log('count',n);
})().catch(e=>{console.error(e);process.exit(1)});