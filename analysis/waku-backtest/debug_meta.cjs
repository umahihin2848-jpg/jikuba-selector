const cheerio=require('cheerio');
(async()=>{
 const id='2201010411',url='https://sports.yahoo.co.jp/keiba/race/result/'+id+'/';
 const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'}});
 const html=await r.text(),$=cheerio.load(html);
 console.log('title', $('title').text());
 const text=$('body').text().replace(/\s+/g,' ').trim();
 for(const kw of ['芝','ダート','GⅠ','G1','GⅡ','G2','GⅢ','G3','ハンデ','別定','定量','3歳以上','4歳以上']){
   const i=text.indexOf(kw); if(i>=0) console.log('KW',kw,text.slice(Math.max(0,i-180),i+280));
 }
 $('script').each((i,s)=>{const t=$(s).html()||'';if(/distance|course|raceName|grade|芝|札幌/.test(t)&&t.length<100000)console.log('SCRIPT',i,t.slice(0,3000))});
})().catch(e=>{console.error(e);process.exit(1)});