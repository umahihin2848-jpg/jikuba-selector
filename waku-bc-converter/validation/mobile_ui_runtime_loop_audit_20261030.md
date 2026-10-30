# Mobile UI runtime loop audit — 2026-10-30

Scope: mobile UI runtime only. Prediction, Ability, M3, opponent and ticket logic were not changed.

## Confirmed loop risks found

1. `research-promising-status-v1.js`
   - Observed `#imsTicket` with `MutationObserver`.
   - `render()` always rewrote its own `innerHTML`.
   - Its own write retriggered the observer.
   - Also retried forever on desktop when `#mfs1` did not exist.
   - Fixed in v1.1: mobile-only guard, no persistent observer, finite startup retries, DOM signature guard.

2. `mobile-pair-probability-reference-v1.js`
   - Observed `#imsTicket`.
   - While odds / axis were incomplete, the waiting HTML was rewritten every observer cycle.
   - This could continue around every 100 ms.
   - Fixed in v1.1: removed persistent observer, debounced event scheduling, finite root retries, waiting/final DOM signature guards.

3. `opponent-ranking-display-v1.js`
   - Observed `#imsTicket`.
   - While HIGH axis / VETO / calibrated probability were not ready, waiting HTML was rewritten every observer cycle.
   - Fixed in v1.2: mobile-only guard, removed persistent observer, debounced event scheduling, finite root retries, waiting/final DOM signature guards.

4. `mobile-product-ui-fix-v1.js`
   - Used a persistent observer across `main.view` only to repair layout after legacy UI writes.
   - Not an infinite loop, but unnecessary continuous DOM observation.
   - Fixed in v1.3: removed persistent observer; startup and known state/click events now trigger repair.

## Reviewed and not self-looping

- `mobile-product-ui-v1.js`: still has a broad child-list observer, but rendering is gated by a state signature. A render can cause one later no-op schedule, not an endless rewrite loop.
- `mobile-opponent-detail-v1.js`: observer is scoped to the conclusion area and only restores an open detail after parent rerender. Attribute changes are not observed; detail insertion settles after one follow-up callback.
- `axis-reliability-shadow-v1.js`: event-driven; state signature prevents repeated full render after data exists.
- `race-strength-profile-shadow-v1.js`: event-driven; no MutationObserver.
- `opponent-veto-shadow-v1.js`: event-driven; no MutationObserver.
- `post-veto-top2-shadow-v1.js`: event-driven; no MutationObserver.
- `mobile-logic-status-v1.js`: event-driven with signature guard; no MutationObserver.
- `runtime-health-guard-v1.js`: debounced timer/event driven; no MutationObserver.
- `ui-plain-japanese-v1.js`: debounced timer/event driven; no MutationObserver.

## Expected runtime after fixes

- Idle screen: no 80–100 ms self-refresh loops from research, pair probability, or opponent ranking.
- Pair probability heavy calculation runs only on relevant state/input events, not on every DOM mutation.
- Startup UI reveal is finite and event-driven.
- Existing broad observer in `mobile-product-ui-v1.js` remains as compatibility glue, but it is signature-gated and is not expected to create an infinite render chain.

## Build

Cache-busted assets are connected from `v3.html` as `20261030profile20`.
