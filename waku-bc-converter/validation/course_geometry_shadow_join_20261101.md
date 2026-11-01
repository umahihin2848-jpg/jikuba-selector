# Course geometry route-aware Shadow join

Date: 2026-11-01
Status: implemented / display-only Shadow
Production impact: none

## What changed

The existing 87-condition `course_first_turn_distance_v1.json` is now joined at runtime with:

- `venue_geometry_v1.json`
- `course_route_resolution_v1.json`
- `course_outer_gate_residual_diagnostic_v1.json`
- `course_outer_position_residual_diagnostic_v1.json`

The six legacy `route=ambig` conditions are explicitly resolved or expanded before geometry is used:

- 京都 芝1400
- 京都 芝1600
- 京都 芝2000
- 新潟 芝1400
- 新潟 芝2000
- 阪神 芝1400

The 87 source conditions expand to 92 route-specific variants. No `ambig` value is allowed through the runtime join.

## Route safety rule

A course with multiple official/possible routes is not silently assigned from venue size or distance alone.

- 京都芝1400: upper-class default = outer; user can override.
- 京都芝1600: upper-class default = outer; user can override.
- 京都芝2000: explicit route selection required because the JRA course table contains both inner/outer start settings and the outer first-turn distance has not been independently verified in this DB.
- 新潟芝1400: current normal default = inner; user can override.
- 新潟芝2000: upper-class default = outer; user can override.
- 阪神芝1400: resolved to inner.

Unverified first-turn distances remain `null`; the UI must say `未検証` rather than infer a number.

## Runtime state

`course-geometry-runtime-v1.js` builds a route-specific joined record with:

- venue / surface / distance / route
- first-turn distance and quality label
- loop / straight / width / curve notes
- outer-gate residual diagnostic when available
- outer-gate x realized-position diagnostic when available

It also injects an `内 / 外回り` selector only for multi-route conditions. Single-route conditions stay automatic.

## Opponent-analysis display

`mobile-opponent-geometry-v1.js` adds a display-only block to each opponent card. It keeps three outputs independent:

1. 純粋な外回し距離ロス
2. コーナー負荷
3. インへ収まる余地

Then it adds one qualitative branch point using:

`course geometry × horse number/gate × predicted queue/P10 × acceleration × sustained ability`

The historical residual is shown only as supporting evidence. It is explicitly labelled as a gate proxy, not a causal or measured distance-loss value.

## Non-negotiable separation

This layer does **not**:

- create a composite wide-trip score,
- change Ability,
- change M3,
- change P10/queue,
- change calibrated probabilities,
- replace an opponent,
- alter axis judgement,
- alter tickets,
- feed Production decision logic.

Runtime states explicitly set `productionImpact:false` and `newCompositeScore:false`.

## Build

Mobile build marker: `20261101geometry1`.

## Next validation

Before any Production consideration:

1. record the route-resolved Shadow output prospectively,
2. compare predicted position band against realized first position without using realized position as a feature,
3. evaluate whether the three independent geometry outputs add stable information beyond P10/queue alone,
4. freeze interpretation rules before testing betting performance.
