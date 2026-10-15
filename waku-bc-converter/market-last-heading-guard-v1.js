(() => {
  'use strict';

  if (window.__MARKET_LAST_HEADING_GUARD_V1) return;
  window.__MARKET_LAST_HEADING_GUARD_V1 = true;

  const TITLE = '⑥ 市場構造 — 最後に照合';
  const WINDOW_MS = 1700;
  let observer = null;
  let stopTimer = 0;
  let raf = 0;
  let writes = 0;

  function publish() {
    window.MarketLastHeadingGuardState = {
      ready: true,
      version: 'market-last-heading-guard-v1-bounded',
      title: TITLE,
      writes,
      observing: !!observer,
      at: Date.now()
    };
  }

  function enforce() {
    const h = document.querySelector('#marketSection h2');
    if (!h) return false;
    if (h.textContent !== TITLE) {
      h.textContent = TITLE;
      writes += 1;
    }
    publish();
    return true;
  }

  function arm() {
    const h = document.querySelector('#marketSection h2');
    if (!h) return false;

    enforce();
    if (!observer) {
      observer = new MutationObserver(() => {
        if (h.textContent !== TITLE) enforce();
      });
    } else {
      observer.disconnect();
    }
    observer.observe(h, { childList: true, characterData: true, subtree: true });

    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      enforce();
      observer?.disconnect();
      observer = null;
      publish();
    }, WINDOW_MS);

    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        enforce();
      });
    }
    publish();
    return true;
  }

  [
    'final-probability-ready',
    'joint-pair-probability-ready',
    'calibrated-probability-ready',
    'ability-opponent-ready',
    'rsa-addons-ready',
    'rsa-analysis-complete'
  ].forEach(ev => addEventListener(ev, arm));

  document.addEventListener('click', e => {
    if (['analyzeBtn', 'applyOddsBtn', 'parseCsvBtn'].includes(e.target?.id)) arm();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
})();
