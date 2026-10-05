(() => {
  'use strict';
  // Version check + safe refresh. Every `updates.checkEveryMin` minutes the live files are compared with the ones this tab loaded.
  // When something changed: save every input to sessionStorage (this tab only, never sent anywhere), wait for a quiet moment,
  // reload, then put everything back. The snapshot is used once and deleted.
  const C = Object.assign({ enabled: true, checkEveryMin: 10, quietMs: 4000, maxWaitMs: 60000, reloadEvenIfUnchanged: false }, (window.ACES_CONFIG || {}).updates);
  const KEY = 'aces.session.snapshot', LAST = 'aces.session.lastReload', FRESH_MS = 3 * 60 * 1000, MIN_GAP_MS = 5 * 60 * 1000;
  const $ = s => document.querySelector(s), byId = id => document.getElementById(id);
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); return true; } catch { return false; } }, del: k => { try { sessionStorage.removeItem(k); } catch {} } };
  const PAGE_BTN = { scripts: 'script-page-action', errands: 'errands-page-action', notes: 'notes-page-action', checklist: 'check-list-page-action', links: 'links-page-action' };
  const live = msg => { const l = byId('aces-live'); if (l) l.textContent = msg; };

  // ---------- small status toast ----------
  function toast(msg, action) {
    let t = byId('aces-toast');
    if (!t) { t = document.createElement('div'); t.id = 'aces-toast'; t.className = 'aces-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    if (action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label; b.addEventListener('click', action.run); t.appendChild(b); }
    t.classList.add('show'); live(msg);
    clearTimeout(t._h); if (!action) t._h = setTimeout(() => t.classList.remove('show'), 6000);
  }

  // ---------- capture ----------
  function collect() {
    const snap = { v: 1, t: Date.now(), page: document.body.dataset.page || 'scripts', fields: {}, cards: {}, checks: {}, scroll: {} };
    snap.tab = $('.script-nav-container .nav-btn.active')?.dataset.tab || null;
    snap.checklist = $('.checklist-module.active')?.id || null;
    // every input / textarea / select that has an id (header, search, errands forms, Freeflow...): new fields are picked up automatically
    document.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
      if (el.type === 'password' || el.type === 'file' || el.id === 'ff-tpl') return;
      const v = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
      if (v !== '' && v !== false) snap.fields[el.id] = v;
    });
    // script-card placeholders that differ from their default text
    document.querySelectorAll('.card-module[data-uid]').forEach(card => {
      const rows = [];
      card.querySelectorAll('.manual-edit').forEach((f, i) => { const d = f.dataset.defaultText, t = f.textContent.trim(); if (t && t !== d) rows.push([i, d, t]); });
      if (rows.length) snap.cards[card.dataset.uid] = rows;
    });
    // checklist ticks
    document.querySelectorAll('.checklist-module').forEach(m => {
      const on = [...m.querySelectorAll('.step-checkbox')].flatMap((c, i) => c.checked ? [i] : []);
      if (on.length) snap.checks[m.id] = on;
    });
    const ff = byId('ff-txt');
    if (ff) { snap.ffSel = [ff.selectionStart, ff.selectionEnd]; snap.scroll.ff = ff.scrollTop; }
    snap.scroll.main = $('.main-page')?.scrollTop || 0;
    const a = document.activeElement; if (a && a.id && /^(INPUT|TEXTAREA)$/.test(a.tagName)) snap.focus = a.id;
    return snap;
  }

  // ---------- restore ----------
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const waitFor = (test, ms = 8000) => new Promise(res => {
    const t0 = Date.now();
    (function tick() { const v = test(); if (v) return res(v); if (Date.now() - t0 > ms) return res(null); setTimeout(tick, 80); })();
  });

  async function restore(snap) {
    window.ACES_RESTORING = true;                                   // keeps replayed clicks out of the usage metrics
    try {
      const F = snap.fields || {};
      // header first so the shared [Cx Name] / [Agent Name] placeholders sync, then channel, then category
      ['customer', 'user'].forEach(id => { if (F[id] != null && byId(id)) { byId(id).value = F[id]; fire(byId(id), 'input'); } });
      if (F['channel-selection'] && byId('channel-selection')) { byId('channel-selection').value = F['channel-selection']; fire(byId('channel-selection'), 'change'); }
      if (snap.tab) [...document.querySelectorAll('.script-nav-container .nav-btn')].find(b => b.dataset.tab === snap.tab)?.click();

      const cards = new Map([...document.querySelectorAll('.card-module[data-uid]')].map(c => [c.dataset.uid, c]));
      Object.entries(snap.cards || {}).forEach(([uid, rows]) => {
        const fields = cards.get(uid)?.querySelectorAll('.manual-edit');
        if (fields) rows.forEach(([i, d, t]) => { if (fields[i] && fields[i].dataset.defaultText === d) fields[i].textContent = t; });   // skip if the new version changed the card
      });

      // everything else with an id (errands forms, notes, ...)
      Object.entries(F).forEach(([id, v]) => {
        if (['customer', 'user', 'channel-selection', 'search-input'].includes(id)) return;
        const el = byId(id); if (!el) return;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v; else el.value = v;
        fire(el, 'input');
      });
      if (F['search-input'] && byId('search-input')) { byId('search-input').value = F['search-input']; fire(byId('search-input'), 'input'); }

      // checklist (built asynchronously)
      if (snap.checklist || Object.keys(snap.checks || {}).length) {
        await waitFor(() => document.querySelector('.checklist-module'));
        Object.entries(snap.checks || {}).forEach(([mid, idx]) => {
          const boxes = [...(byId(mid)?.querySelectorAll('.step-checkbox') || [])];
          idx.forEach(i => { if (boxes[i] && !boxes[i].checked) { boxes[i].checked = true; fire(boxes[i], 'change'); } });
        });
        if (snap.checklist) byId(snap.checklist + '-nav')?.click();
      }

      // page last (side-panel click), then scroll and focus once it is visible
      if (snap.page && snap.page !== 'scripts' && byId(PAGE_BTN[snap.page])) byId(PAGE_BTN[snap.page]).click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const main = $('.main-page'); if (main && snap.scroll?.main) main.scrollTo({ top: snap.scroll.main, behavior: 'instant' });
      const ff = byId('ff-txt');
      if (ff && snap.scroll?.ff != null) ff.scrollTop = snap.scroll.ff;
      if (snap.focus && byId(snap.focus)) {
        const el = byId(snap.focus); el.focus({ preventScroll: true });
        if (el === ff && snap.ffSel) try { ff.setSelectionRange(...snap.ffSel); } catch {}
      }
      toast('Updated to the latest version. Your entries were restored.');
    } finally { window.ACES_RESTORING = false; }
  }

  // ---------- version check ----------
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const watched = () => {
    const urls = new Set([new URL('.', location.href).href, new URL('data/checklist.json', location.href).href]);
    document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(el => { try { const u = new URL(el.getAttribute('src') || el.getAttribute('href'), location.href); if (u.origin === location.origin) urls.add(u.href); } catch {} });
    return [...urls];
  };
  async function fingerprint(url) {                                 // validators first (cheap HEAD); body hash only when the host sends none
    const h = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!h.ok) return null;
    const tag = h.headers.get('etag') || h.headers.get('last-modified');
    if (tag) return tag + '|' + (h.headers.get('content-length') || '');
    const g = await fetch(url, { cache: 'no-store' });
    return g.ok ? 'h' + hash(await g.text()) : null;
  }
  const sample = async urls => Object.fromEntries(await Promise.all(urls.map(async u => [u, await fingerprint(u).catch(() => null)])));
  const differs = (a, b) => Object.keys(a).some(u => a[u] && b[u] && a[u] !== b[u]);

  let base = null, lastInput = Date.now(), lastCheck = Date.now(), applying = false;
  ['keydown', 'pointerdown', 'input', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, { capture: true, passive: true }));

  async function check() {
    if (applying || !navigator.onLine) return;
    lastCheck = Date.now();
    try {
      if (!base) { base = await sample(watched()); return; }
      const urls = Object.keys(base), now = await sample(urls);
      let changed = differs(base, now);
      if (changed) { await new Promise(r => setTimeout(r, 1500)); changed = differs(base, await sample(urls)); }   // confirm once: avoids a reload on a CDN blip
      if (changed || C.reloadEvenIfUnchanged) applyUpdate();
    } catch { /* offline or blocked: try again next cycle */ }
  }

  function reload() {
    if (!ss.set(KEY, JSON.stringify(collect()))) {                  // never reload if the inputs cannot be saved first
      applying = false;
      return toast('A new version is available.', { label: 'Update now', run: () => { ss.set(KEY, JSON.stringify(collect())); location.reload(); } });
    }
    ss.set(LAST, String(Date.now()));
    location.reload();
  }
  function applyUpdate() {
    if (applying || Date.now() - Number(ss.get(LAST) || 0) < MIN_GAP_MS) return;   // never more than one auto-reload per 5 min (loop guard)
    applying = true;
    const t0 = Date.now(); let done = false;
    const go = () => {
      if (done || document.visibilityState !== 'visible') return;   // a hidden tab waits until the agent is back
      if (Date.now() - lastInput < C.quietMs && Date.now() - t0 < C.maxWaitMs) return setTimeout(go, 500);
      done = true; document.removeEventListener('visibilitychange', go);
      toast('Updating to the latest version…'); setTimeout(reload, 900);
    };
    document.addEventListener('visibilitychange', go);
    go();
  }

  // ---------- boot ----------
  function boot() {
    const raw = ss.get(KEY);
    if (raw) {
      ss.del(KEY);                                                  // single use
      let snap = null; try { snap = JSON.parse(raw); } catch {}
      if (snap && Date.now() - snap.t < FRESH_MS) {
        if (document.querySelector('.card-module')) restore(snap); else document.addEventListener('aces:rendered', () => restore(snap), { once: true });
      }
    }
    if (!C.enabled) return;
    setTimeout(check, 4000);                                        // baseline of what this tab loaded
    setInterval(check, Math.max(1, C.checkEveryMin) * 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && base && Date.now() - lastCheck > C.checkEveryMin * 60000) check(); });
  }
  window.AcesSession = { collect, restore, check, snapshotNow: () => ss.set(KEY, JSON.stringify(collect())) };   // handy for testing in the console
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
