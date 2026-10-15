(() => {
  'use strict';

  if (window.__MARKET_LAST_HEADING_GUARD_V1) return;
  window.__MARKET_LAST_HEADING_GUARD_V1 = true;

  const TITLE = '⑥ 市場構造 — 最後に照合';
  let observer = null;

  function enforce() {
    const h = document.querySelector('#marketSection h2');
    if (!h) return false;
    if (h.textContent !== TITLE) h.textContent = TITLE;
    return true;
  }

  function attach() {
    const h = document.querySelector('#marketSection h2');
    if (!h) return false;
    enforce();
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (h.textContent !== TITLE) h.textContent = TITLE;
    });
    observer.observe(h, { childList: true, characterData: true, subtree: true });
    window.MarketLastHeadingGuardState = {
      ready: true,
      version: 'market-last-heading-guard-v1',
      title: TITLE,
      at: Date.now()
    };
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
