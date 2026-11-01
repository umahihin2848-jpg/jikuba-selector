const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shadow=read('waku-bc-converter/market-ability-opponent-shadow-v1.js');
const mobileCore=read('waku-bc-converter/mobile-opponent-core-v1.js');
const loader=read('waku-bc-converter/v3-addons-loader-p.js');
const v3=read('waku-bc-converter/v3.html');
const old=read('waku-bc-converter/opponent-ranking-display-v1.js');

new Function(shadow);
new Function(mobileCore);
new Function(old);
if(shadow.length>30000)throw new Error('market Ability Shadow unexpectedly large');
if(mobileCore.length>22000)throw new Error('mobile opponent core unexpectedly large');

const must=[
  "V='market-ability-opponent-shadow-v1.2-review-labels'",
  "shadowCandidate:true",
  "thresholdsValidated:false",
  "thresholdRole:'display_partition_not_validated_cutoff'",
  "fourQuadrant:true",
  "marketHighDefinition:'popularity_1_5'",
  "abilityHighDefinition:'ability_rank_le_3'",
  "popularity_1_3_and_ability_rank_le_3",
  "popularity_1_3_and_ability_rank_4_6",
  "popularity_1_3_and_ability_rank_ge_7",
  "popularity_4_5_and_ability_rank_le_3",
  "popularity_6_plus_and_ability_rank_le_3",
  "marketProbabilityFormula:'(1/odds)/sum(1/odds)'",
  'abilityP3CombinedWithMarket:false',
  'm3UsedForRanking:false',
  'gapUsedForRanking:false',
  'productionImpact:false',
  'ticketLogicChanged:false',
  "r.popEnd<=3&&r.abilityRank<=3",
  "r.popEnd<=3&&r.abilityRank<=6",
  "r.popStart>=4&&r.popEnd<=5&&r.abilityRank<=3",
  "r.popStart>=6&&r.abilityRank<=3",
  "return'bothHigh'",
  "return'marketOnly'",
  "return'abilityOnly'",
  "return'bothLow'",
  '市場先行 ⚠︎',
  '次期候補｜市場 × Ability',
  '市場上位 × Ability上位',
  '市場下位 × Ability上位',
  'この境界は統計的に普遍な閾値ではありません',
  '正式相手｜Production',
  'Ability指数＝同レース内相対値（平均50・SD10）'
];
for(const s of must)if(!shadow.includes(s))throw new Error(`missing guard: ${s}`);

if(!shadow.includes('r.marketP=(1/r.win)/invSum'))throw new Error('normalized market probability formula changed');
if(!shadow.includes('M3 P3 ${pct(r.m3p3)}（参考）'))throw new Error('M3 must remain reference-only display');
if(!shadow.includes('下断層 ${r.gapBelow.toFixed(1)}'))throw new Error('Ability gap reference display missing');
if(shadow.includes('setInterval(')||shadow.includes('MutationObserver'))throw new Error('heavy polling/observer forbidden');

// Production opponent selection remains market Top2 excluding the axis.
const productionMust=[
  "V='mobile-opponent-core-v1.16-odds-input-meta'",
  ".filter(r=>String(r.no)!==String(axis.no)).slice(0,2)",
  "selectionMethod:'market_top2_excluding_axis'",
  "mode:'production_market_top2_with_warning_tiers'",
  'autoDrop:false',
  'noReplacement:true',
  'structureReplacementDisabled:true',
  'pairProbabilityUsed:false',
  'conditionEdgeUsed:false',
  "marketInputMetaRole:'session_input_time_not_official_market_timestamp'"
];
for(const s of productionMust)if(!mobileCore.includes(s))throw new Error(`Production opponent guard missing: ${s}`);

if(!loader.includes('market-ability-opponent-shadow-v1.js?v=20261102review1'))throw new Error('mobile loader not wired to reviewed Shadow build');
if(!v3.includes('v3-addons-loader-p.js?v=20261102review1'))throw new Error('v3 mobile loader cache key not updated');
if(!v3.includes('mobile-opponent-core-v1.js?v=20261102review1'))throw new Error('Production opponent core cache key not updated');
if(!v3.includes('opponent-ranking-display-v1.js?v=20261102review1'))throw new Error('legacy diagnostic cache key not updated');
if(!v3.includes("window.RSA_BUILD='20261101ability2'"))throw new Error('global Production build marker changed unexpectedly');

// Legacy formulas remain available only as diagnostic comparisons.
if(!old.includes("V='opponent-ranking-display-v1.4-legacy-diagnostic'"))throw new Error('legacy diagnostic version missing');
if(!old.includes('Math.min(n(r.abp3),n(r.m3p3))'))throw new Error('legacy wide ranking formula changed');
if(!old.includes('n(r.abp3)*n(r.m3p3)/win'))throw new Error('legacy quinella ranking formula changed');
if(!old.includes('ticketLogicChanged:false'))throw new Error('legacy display isolation flag missing');
if(!old.includes('legacyDiagnostic:true'))throw new Error('legacy diagnostic flag missing');
if(!old.includes("productionPartnerSource:'market_top2_excluding_axis'"))throw new Error('official Production source label missing');
if(!old.includes('旧相手評価｜診断'))throw new Error('legacy UI hierarchy label missing');

console.log('market Ability opponent Shadow check: OK');
