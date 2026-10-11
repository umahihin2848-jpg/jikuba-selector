const fs=require('fs');
const path=require('path');
const Module=require('module');
const target=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');
let src=fs.readFileSync(target,'utf8')
  .replaceAll('20261011r30','20261012r32')
  .replaceAll('?test=r30','?test=r32')
  .replaceAll('r30-target.csv','r32-target.csv')
  .replaceAll('R30 Smoke Stakes','R32 Smoke Stakes');
const m=new Module(target,module);
m.filename=target;
m.paths=Module._nodeModulePaths(path.dirname(target));
m._compile(src,target);
