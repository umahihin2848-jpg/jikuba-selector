(() => {
  'use strict';

  if (window.__MARKET_LAST_HEADING_GUARD_V1) return;
  window.__MARKET_LAST_HEADING_GUARD_V1 = true;

  const TITLE = '⑥ 市場構造 — 最後に照合';
  let raf = 0;
  let timer = 0;
  let writes = 0;

  function enforce() {
    const h = document.querySelector('#marketSection h2');
    if (!h) return false;
    if (h.textContent !== TITLE) {
      h.textContent = TITLE;
      writes += 1;
    }
    window.MarketLastHeadingGuardState = {
      ready: true,
      version: 'market-last-heading-guard-v1-finite',
      title: TITLE,
      writes,
      at: Date.now()
    };
    return true;
  }

  function schedule() {
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        enforce();
        requestAnimationFrame(enforce);
      });
    }
    clearTimeout(timer);
    timer = setTimeout(enforce, 1550);
  }

  [
    'final-probability-ready',
    'joint-pair-probability-ready',
    'calibrated-probability-ready',
    'ability-opponent-ready',
    'rsa-addons-ready',
    'rsa-analysis-complete'
  ].forEach(ev => addEventListener(ev, schedule));

  document.addEventListener('click', e => {
    if (['analyzeBtn', 'applyOddsBtn', 'parseCsvBtn'].includes(e.target?.id)) schedule();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
