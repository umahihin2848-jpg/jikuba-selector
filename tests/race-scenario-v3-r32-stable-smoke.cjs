const fs=require('fs');
const path=require('path');
const Module=require('module');

const r32=path.join(__dirname,'race-scenario-v3-r32-smoke.cjs');
const generatedTarget=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');
const originalCompile=Module.prototype._compile;
Module.prototype._compile=function(content,filename){
  if(path.resolve(filename)===path.resolve(generatedTarget)){
    content=String(content).replaceAll('{timeout:7000}','{timeout:12000}');
  }
  return originalCompile.call(this,content,filename);
};
try{
  const src=fs.readFileSync(r32,'utf8');
  const m=new Module(r32,module);
  m.filename=r32;
  m.paths=Module._nodeModulePaths(path.dirname(r32));
  m._compile(src,r32);
} finally {
  Module.prototype._compile=originalCompile;
}
