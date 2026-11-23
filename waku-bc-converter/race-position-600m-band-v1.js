/* P3-66: empirical interval for the 600m gap (research display only).
   Calibrated using as-of LIVE-app gap predictions and actual 600m gaps from 2025.
   Audited on previously explored 2026; NOT prospective proof, NOT a betting input.
   Match CSV transform version so old/main and deduplicated-shadow margins never mix. */
(function(root){'use strict';
if(root.RSAPosition600BandV1)return;
const VERSION='p366-position-600m-band-20261123';
const MODES=Object.freeze({
  legacy:Object.freeze({
    parserVersion:'target-csv-cache-v6-corner-zero-missing',
    margins:Object.freeze({front:0.47881955366133316,middle:0.6135775338802563,rear:0.7399505596533333}),
    validationCoverage:0.8278344331133773,
    label:'現行main方式'
  }),
  dedup:Object.freeze({
    parserVersion:'target-csv-cache-p363-history-dedup-shadow',
    margins:Object.freeze({front:0.4340189033215385,middle:0.5881834950063864,rear:0.6995677039966668}),
    validationCoverage:0.8152369526094781,
    label:'履歴重複除去の研究方式'
  })
});
const VALIDATION=Object.freeze({calibrationYear:2025,calibrationRaces:144,calibrationHorses:2171,
  exploratoryValidationYear:2026,validationRaces:111,validationHorses:1667,
  target:'残り600m地点の実測先頭差（秒）',nominalCoverage:0.8,
  note:'対象は2025/26の一部のJRA平地3勝/OP/L/G1〜G3・12〜18頭。2026年は既探索。個別馬の80%を保証せず、購入判断には使用しない。'});
function compute(value,parserVersion,remainingVersion,fieldSize){
 const v=Number(value),n=Number(fieldSize);
 if(value===null||value===undefined||value===''||!Number.isFinite(v)||v<0||v>3.5)
  return{ready:false,reason:'validated_600m_prediction_missing'};
 if(remainingVersion!=='remaining600-validated-v3'||!Number.isInteger(n)||n<12||n>18)
  return{ready:false,reason:'model_or_field_not_supported'};
 const mode=Object.keys(MODES).find(k=>MODES[k].parserVersion===parserVersion);
 if(!mode)return{ready:false,reason:'unknown_csv_parser_version'};
 const bucket=v<=.5?'front':v<=1?'middle':'rear';
 const q=MODES[mode].margins[bucket];
 return{ready:true,version:VERSION,mode,bucket,point:v,margin:q,low:Math.max(0,v-q),high:v+q,
   nominalCoverage:VALIDATION.nominalCoverage,validationCoverage:MODES[mode].validationCoverage,
   calibrationYear:VALIDATION.calibrationYear,validationYear:VALIDATION.exploratoryValidationYear};
}
root.RSAPosition600BandV1=Object.freeze({version:VERSION,compute,meta:VALIDATION,modes:MODES,productionImpact:false});
})(typeof window!=='undefined'?window:globalThis);
