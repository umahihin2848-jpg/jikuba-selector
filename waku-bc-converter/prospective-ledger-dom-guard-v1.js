(() => {
  'use strict';

  if (window.__PROSPECTIVE_LEDGER_DOM_GUARD_V1) return;
  window.__PROSPECTIVE_LEDGER_DOM_GUARD_V1 = true;

  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!descriptor?.get || !descriptor?.set || descriptor.configurable === false) {
    window.ProspectiveLedgerDomGuardState = {
      ready: false,
      version: 'prospective-ledger-dom-guard-v1',
      reason: 'innerHTML descriptor unavailable',
      at: Date.now()
    };
    return;
  }

  const htmlCache = new WeakMap();
  let skipped = 0;
  let applied = 0;

  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) {
      if (this?.id === 'prospectiveLedger') {
        const next = String(value ?? '');
        const prev = htmlCache.get(this);
        if (prev === next) {
          skipped += 1;
          window.ProspectiveLedgerDomGuardState = {
            ready: true,
            version: 'prospective-ledger-dom-guard-v1',
            skipped,
            applied,
            at: Date.now()
          };
          return;
        }
        htmlCache.set(this, next);
        applied += 1;
      }
      return descriptor.set.call(this, value);
    }
  });

  window.ProspectiveLedgerDomGuardState = {
    ready: true,
    version: 'prospective-ledger-dom-guard-v1',
    skipped,
    applied,
    at: Date.now()
  };
})();
