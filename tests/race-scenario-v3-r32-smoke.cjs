// Legacy CI entrypoint retained for compatibility.
// The old r32 smoke dynamically patched retired iOSStableUI/RaceIndependentLayer UI.
// Current production behavior is covered by the maintained scenario smoke instead.
require('./race-scenario-v3-current-smoke.cjs');
