(() => {
  'use strict';

  if (window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1) return;
  window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1 = true;

  const FORM_IDS = ['plBetType', 'plSelection', 'plStake', 'plOdds', 'plHitP'];
  const formState = {
    plBetType: '単勝',
    plSelection: '',
    plStake: '',
    plOdds: '',
    plHitP: ''
  };
  const settlementState = new Map();

  let observedRoot = null;
  let rootObserver = null;
  let applying = false;
  let knownDraftCount = 0;
  let queued = false;
  let armedClick = false;

  function countDraft() {
    return document.querySelectorAll('#plDraftList .plDraftRow').length;
  }

  function settlementBucket(id) {
    const key = String(id || '');
    if (!key) return null;
    if (!settlementState.has(key)) {
      settlementState.set(key, { places: {}, returns: {}, note: '' });
    }
    return settlementState.get(key);
  }

  function captureSettlement(el) {
    const article = el?.closest?.('[data-pl-id]');
    if (!article) return false;

    const bucket = settlementBucket(article.dataset.plId);
    if (!bucket) return false;
    const value = String(el.value ?? '');

    if (el.matches?.('[data-pl-place]')) {
      bucket.places[String(el.dataset.plPlace)] = value;
      return true;
    }
    if (el.matches?.('[data-pl-return]')) {
      bucket.returns[String(el.dataset.plReturn)] = value;
      return true;
    }
    if (el.matches?.('[data-pl-note]')) {
      bucket.note = value;
      return true;
    }
    return false;
  }

  function capture(el) {
    if (!el || applying) return;
    if (FORM_IDS.includes(el.id)) {
      formState[el.id] = String(el.value ?? '');
      return;
    }
    captureSettlement(el);
  }

  function restoreSettlement() {
    for (const [id, bucket] of settlementState) {
      const article = [...document.querySelectorAll('[data-pl-id]')]
        .find(x => String(x.dataset.plId || '') === id);
      if (!article) continue;

      for (const [place, value] of Object.entries(bucket.places || {})) {
        const el = article.querySelector(`[data-pl-place="${CSS.escape(place)}"]`);
        if (el && String(el.value ?? '') !== String(value)) el.value = value;
      }

      for (const [betId, value] of Object.entries(bucket.returns || {})) {
        const el = article.querySelector(`[data-pl-return="${CSS.escape(betId)}"]`);
        if (el && String(el.value ?? '') !== String(value)) el.value = value;
      }

      const note = article.querySelector('[data-pl-note]');
      if (note && String(note.value ?? '') !== String(bucket.note ?? '')) {
        note.value = String(bucket.note ?? '');
      }
    }
  }

  function restore() {
    const root = document.getElementById('prospectiveLedger');
    if (!root) return;

    applying = true;
    try {
      for (const id of FORM_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const value = formState[id] ?? '';
        if (String(el.value ?? '') !== String(value)) el.value = value;
      }

      const selection = document.getElementById('plSelection');
      const type = document.getElementById('plBetType')?.value || '単勝';
      if (selection) {
        selection.placeholder = type === '馬単'
          ? '1着→2着 例 5→9'
          : (type === '馬連' || type === 'ワイド')
            ? '組合せ 例 5-9'
            : '馬番 例 9';
      }

      restoreSettlement();
    } finally {
      applying = false;
    }

    knownDraftCount = countDraft();
    window.ProspectiveLedgerFormGuardState = {
      ready: true,
      version: 'prospective-ledger-form-stability-v6-readable',
      draftCount: knownDraftCount,
      settlementDrafts: settlementState.size,
      at: Date.now()
    };
  }

  function ensure() {
    const root = document.getElementById('prospectiveLedger');
    if (root === observedRoot) return;

    rootObserver?.disconnect();
    observedRoot = root || null;
    if (!root) return;

    knownDraftCount = countDraft();
    rootObserver = new MutationObserver(schedule);
    rootObserver.observe(root, { childList: true, subtree: true });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      ensure();
      restore();
    });
  }

  function isProtectedAction(target) {
    return Boolean(target?.closest?.('#plAddBet,#plFreeze,[data-pl-settle]'));
  }

  function windowPreclick(event) {
    if (!isProtectedAction(event.target)) return;
    restore();
    armedClick = false;
    window.removeEventListener('click', windowPreclick, true);
  }

  function armPreclick() {
    if (armedClick) return;
    armedClick = true;
    window.addEventListener('click', windowPreclick, true);
    setTimeout(() => {
      if (!armedClick) return;
      armedClick = false;
      window.removeEventListener('click', windowPreclick, true);
    }, 1200);
  }

  function preactivate(event) {
    if (!isProtectedAction(event.target)) return;
    ensure();
    restore();
    armPreclick();
  }

  document.addEventListener('input', event => capture(event.target), true);
  document.addEventListener('change', event => capture(event.target), true);
  document.addEventListener('pointerdown', preactivate, true);
  document.addEventListener('touchstart', preactivate, { capture: true, passive: true });

  document.addEventListener('click', event => {
    const target = event.target;
    if (isProtectedAction(target)) restore();

    if (target?.id === 'plAddBet') {
      const before = knownDraftCount;
      setTimeout(() => {
        const current = countDraft();
        if (current > before) {
          formState.plSelection = '';
          formState.plStake = '';
          formState.plOdds = '';
          formState.plHitP = '';
          knownDraftCount = current;
          schedule();
        }
      }, 0);
      return;
    }

    if (target?.id === 'plFreeze') {
      setTimeout(() => {
        if (countDraft() === 0) {
          formState.plSelection = '';
          formState.plStake = '';
          formState.plOdds = '';
          formState.plHitP = '';
          schedule();
        }
      }, 0);
      return;
    }

    if (target?.matches?.('[data-pl-settle]')) {
      const id = String(target.closest?.('[data-pl-id]')?.dataset.plId || '');
      setTimeout(() => {
        const article = [...document.querySelectorAll('[data-pl-id]')]
          .find(x => String(x.dataset.plId || '') === id);
        if (id && article && !article.querySelector('[data-pl-settle]')) {
          settlementState.delete(id);
        }
      }, 0);
    }
  }, true);

  [
    'rsa-addons-ready',
    'rsa-analysis-complete',
    'market-independent-center-ready',
    'race-independent-layers-ready'
  ].forEach(eventName => addEventListener(eventName, schedule));

  new MutationObserver(() => {
    if (document.getElementById('prospectiveLedger') !== observedRoot) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();