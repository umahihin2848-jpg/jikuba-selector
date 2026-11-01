const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shadow=read('waku-bc-converter/market-ability-opponent-shadow-v1.js');
const loader=read('waku-bc-converter/v3-addons-loader-p.js');
const v3=read('waku-bc-converter/v3.html');
const old=read('waku-bc-converter/opponent-ranking-display-v1.js');

new Function(shadow);
if(shadow.length>26000)throw new Error('market Ability Shadow unexpectedly large');

const must=[
  "popularity_1_3_keep",
  "popularity_4_5_and_ability_rank_le_3",
  "popularity_6_plus_and_ability_rank_le_3",
  "marketProbabilityFormula:'(1/odds)/sum(1/odds)'",
  'abilityP3CombinedWithMarket:false',
  'm3UsedForRanking:false',
  'gapUsedForRanking:false',
  'productionImpact:false',
  'ticketLogicChanged:false',
  "if(r.popEnd<=3)return'core'",
  "r.popStart>=4&&r.popEnd<=5&&r.abilityRank<=3",
  "r.popStart>=6&&r.abilityRank<=3"
];
for(const s of must)if(!shadow.includes(s))throw new Error(`missing guard: ${s}`);

if(!shadow.includes('r.marketP=(1/r.win)/invSum'))throw new Error('normalized market probability formula changed');
if(!shadow.includes('M3 P3 ${pct(r.m3p3)}（参考）'))throw new Error('M3 must remain reference-only display');
if(!shadow.includes('下断層 ${r.gapBelow.toFixed(1)}'))throw new Error('Ability gap reference display missing');
if(shadow.includes('setInterval(')||shadow.includes('MutationObserver'))throw new Error('heavy polling/observer forbidden');

if(!loader.includes('market-ability-opponent-shadow-v1.js?v=20261102marketability1'))throw new Error('mobile loader not wired');
if(!v3.includes('v3-addons-loader-p.js?v=20261102marketability1'))throw new Error('v3 mobile loader cache key not updated');

if(!old.includes('Math.min(n(r.abp3),n(r.m3p3))'))throw new Error('legacy wide ranking formula changed');
if(!old.includes('n(r.abp3)*n(r.m3p3)/win'))throw new Error('legacy quinella ranking formula changed');
if(!old.includes('ticketLogicChanged:false'))throw new Error('legacy display isolation flag missing');

console.log('market Ability opponent Shadow check: OK');
