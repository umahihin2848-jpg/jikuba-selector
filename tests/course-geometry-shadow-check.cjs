const fs=require('fs');
const assert=require('assert');
const path=require('path');
const ROOT=path.join(__dirname,'..','waku-bc-converter');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

const runtime=read('course-geometry-runtime-v1.js');
const mobile=read('mobile-opponent-geometry-v1.js');

// Syntax: parse without executing browser globals.
new Function(runtime);
new Function(mobile);

// Guard against reintroducing hot-path churn.
assert(runtime.includes("cache:'force-cache'"),'geometry JSON must use browser cache');
assert(runtime.includes('if(!meaningful())return state'),'geometry data must stay lazy until course inputs exist');
assert(!runtime.includes("document.addEventListener('input'"),'distance typing must not trigger per-keystroke geometry work');
assert(!runtime.includes("['venue','surface','distance','grade']"),'grade must not trigger geometry refresh');
assert(!mobile.includes("['courseRoute','venue','surface','distance','grade']"),'display layer must not duplicate course-field listeners');
assert(mobile.includes('clearTimeout(timer)')&&mobile.includes('requestAnimationFrame'),'display redraw must remain debounced/RAF-coalesced');

// Event graph: runtime may emit geometry-ready; display layer may only listen to it.
const runtimeDispatch=(runtime.match(/dispatchEvent\(new CustomEvent\('course-geometry-ready'/g)||[]).length;
const mobileDispatch=(mobile.match(/dispatchEvent\(new CustomEvent\('course-geometry-ready'/g)||[]).length;
assert.strictEqual(runtimeDispatch,1,'runtime should have exactly one geometry-ready emission site');
assert.strictEqual(mobileDispatch,0,'display layer must never re-emit geometry-ready (self-loop risk)');

// Shadow-only contract.
assert(runtime.includes('productionImpact:false'),'runtime must declare no Production impact');
assert(mobile.includes('productionImpact:false')&&mobile.includes('displayOnly:true'),'display must remain Shadow/display-only');
assert(!mobile.includes('ProductionDecision')&&!mobile.includes('ticketDecision'),'geometry display must not write Production/ticket state');

const first=json('data/course_first_turn_distance_v1.json');
const venue=json('data/venue_geometry_v1.json');
const route=json('data/course_route_resolution_v1.json');
const gate=json('data/course_outer_gate_residual_diagnostic_v1.json');
const pos=json('data/course_outer_position_residual_diagnostic_v1.json');
assert.strictEqual(first.entries.length,87,'legacy first-turn DB must remain 87 source conditions');
assert.strictEqual(route.status,'shadow_display_only','route resolver must remain Shadow');
assert(Array.isArray(venue.venues)&&venue.venues.length===10,'venue geometry must cover all 10 JRA venues');
assert(Array.isArray(gate.entries)&&gate.entries.length>0,'outer-gate diagnostic missing');
assert(Array.isArray(pos.entries)&&pos.entries.length>0,'position interaction diagnostic missing');

const ruleKey=r=>`${r.venue}|${r.surface}|${r.distance}`;
const rules=new Map(route.rules.map(r=>[ruleKey(r),r]));
let variants=0,unresolved=0;
for(const e of first.entries){
  if(e.route!=='ambig'){variants++;continue;}
  const r=rules.get(`${e.venue}|${e.surface}|${e.distance}`);
  if(!r||!Array.isArray(r.routes)||!r.routes.length){unresolved++;continue;}
  variants+=r.routes.length;
}
assert.strictEqual(unresolved,0,'all legacy ambig entries must have route-resolution rules');
assert.strictEqual(variants,92,'87 source conditions should expand to 92 route-specific variants');

// Size budget: display-only feature must stay small enough not to dominate mobile boot.
const runtimeBytes=Buffer.byteLength(runtime);
const mobileBytes=Buffer.byteLength(mobile);
assert(runtimeBytes<12000,`runtime too large: ${runtimeBytes} bytes`);
assert(mobileBytes<20000,`mobile geometry too large: ${mobileBytes} bytes`);
assert(runtimeBytes+mobileBytes<30000,`geometry JS bundle too large: ${runtimeBytes+mobileBytes} bytes`);

console.log(JSON.stringify({ok:true,runtimeBytes,mobileBytes,combinedBytes:runtimeBytes+mobileBytes,sourceConditions:first.entries.length,resolvedVariants:variants,runtimeDispatch,mobileDispatch},null,2));
