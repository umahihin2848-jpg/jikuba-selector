const path=require('path');
const Module=require('module');
const target=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');
const originalCompile=Module.prototype._compile;
Module.prototype._compile=function(content,filename){
  if(path.resolve(filename)===path.resolve(target)){
    content=String(content).replace(
      "  assert.strictEqual(last.cache?.rawReads,1,`${name}: TARGET file re-read during repeat analysis (${last.cache?.rawReads})`);",
      "  console.log('TARGET_CACHE_DEBUG',name,last.cache);\n  assert.strictEqual(last.cache?.rawReads,1,`${name}: TARGET file re-read during repeat analysis (${last.cache?.rawReads})`);"
    );
  }
  return originalCompile.call(this,content,filename);
};
try{require('./race-scenario-v3-r32-smoke.cjs')}finally{Module.prototype._compile=originalCompile}
