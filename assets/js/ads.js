(() => {
  'use strict';
  const cfg = (window.ACES_CONFIG || {}).ads || {}, S = cfg.slots || {};
  const R = Object.assign({ enabled: true, firstDelaySec: 15, showSec: [30, 45], restMin: [5, 8], idleSec: 120, maxPerSession: 0, trigger: 'user' }, cfg.rotation);
  const track = (n, p) => window.acesTrack?.(n, p), page = () => document.body.dataset.page || 'scripts';
  const rnd = ([a, b]) => a + Math.random() * (b - a);
  const unit = (id, fmt) => `<span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.client}" data-ad-slot="${id}" data-ad-format="${fmt}" data-full-width-responsive="true"></ins>`;
  const make = (cls, key, id, fmt = 'auto') => { const a = document.createElement('aside'); a.className = `ad-slot ${cls}`; a.dataset.slot = key; a.setAttribute('aria-label', 'Advertisement'); a.innerHTML = unit(id, fmt); return a; };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); } }), { rootMargin: '400px 0px' });

  function fill(slot) {                    // one request per slot element, never into a zero-width box
    const ins = slot.querySelector('ins.adsbygoogle');
    if (!ins || ins.dataset.adsbygoogleStatus || slot.getBoundingClientRect().width === 0) return;
    new MutationObserver((_, mo) => {
      const s = ins.getAttribute('data-ad-status');
      if (s !== 'filled' && s !== 'unfilled') return;
      mo.disconnect();
      slot.classList.add(s === 'filled' ? 'is-filled' : 'is-empty');
      track('ads.slot.' + s, { slot: slot.dataset.slot, page: page() });
      slot.dispatchEvent(new CustomEvent('ad:status', { detail: s }));
      if (s === 'filled') view(slot);
    }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); track('ads.slot.requested', { slot: slot.dataset.slot, page: page() }); }
    catch { slot.classList.add('is-empty'); slot.dispatchEvent(new CustomEvent('ad:status', { detail: 'unfilled' })); }
  }
  function view(slot) {                    // own "viewable" proxy: >=50% visible for 1 s
    let t; const v = new IntersectionObserver(([e]) => { clearTimeout(t); if (e.isIntersecting) t = setTimeout(() => { track('ads.slot.viewable', { slot: slot.dataset.slot, page: page() }); v.disconnect(); }, 1000); }, { threshold: .5 });
    v.observe(slot);
  }

  // ---- Links feed: requested only once the Links tab is first opened ----
  let linksDone = false;
  function linksFeed() {
    if (linksDone || !S.links) return;
    const grid = document.querySelector('#links-page .links-btn-container'); if (!grid) return;
    linksDone = true;
    const el = make('ad-links', 'links', S.links); grid.after(el);
    requestAnimationFrame(() => fill(el));
  }

  // ---- Rotating banner between scripts ----
  const st = { el: null, timer: null, armed: false, count: 0, input: Date.now() };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { st.input = Date.now(); }, { passive: true, capture: true }));
  const eligible = () => page() === 'scripts' && document.visibilityState === 'visible' && !document.body.classList.contains('search-active')
    && Date.now() - st.input < R.idleSec * 1000 && !document.querySelector('.card-module .manual-edit.editing');
  const later = sec => { clearTimeout(st.timer); st.timer = setTimeout(show, sec * 1000); };
  function gap() {                         // a gap between two scripts, on screen but below the reading zone
    const mod = document.querySelector('.script-module.active'), box = document.querySelector('.main-page').getBoundingClientRect();
    if (!mod) return null;
    const y = box.top + box.height * .7;
    return [...mod.querySelectorAll(':scope > .script-card-sub')].slice(0, -1).find(s => { const r = s.getBoundingClientRect(); return r.height > 0 && r.bottom > y && r.bottom < box.bottom - 60; }) || null;
  }
  function show() {
    clearTimeout(st.timer);
    if (page() !== 'scripts' || st.el || !S.banner || (R.maxPerSession && st.count >= R.maxPerSession)) return;
    if (!eligible() || !st.armed) return later(20);
    const g = gap(); if (!g) return later(20);
    st.armed = false; st.count++;
    const el = make('ad-banner', 'banner', S.banner, 'horizontal'); g.after(el); st.el = el;
    el.addEventListener('ad:status', e => e.detail === 'filled' ? (clearTimeout(st.timer), st.timer = setTimeout(drop, rnd(R.showSec) * 1000)) : drop(), { once: true });
    st.timer = setTimeout(drop, 12000);    // never filled: clear it
    fill(el);
  }
  function drop(instant) {
    clearTimeout(st.timer);
    const el = st.el; st.el = null;
    if (el) { if (instant) el.remove(); else { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 500); } }
    st.timer = setTimeout(() => { st.armed = true; if (R.trigger === 'timer') show(); }, rnd(R.restMin) * 60000);
  }
  const onView = () => { if (st.armed && R.trigger === 'user') setTimeout(show, 600); };   // user-initiated view change

  function showFor() {
    const p = page();
    document.querySelectorAll('.ad-end').forEach(s => { s.hidden = !(cfg.endPages || []).includes(p); });
    if (p === 'links') linksFeed();
    if (p !== 'scripts' && st.el) drop(true);           // pause while another tab is open
    if (p === 'scripts') onView();
  }

  window.AcesAds = {
    init() {
      if (!cfg.enabled || window.ACES_CONSENT?.ads === false) return;
      if (S.end) document.querySelector('.main-page').append(make('ad-end', 'end', S.end));
      document.querySelectorAll('.ad-end').forEach(x => io.observe(x));
      showFor();
      document.addEventListener('aces:page', showFor);
      if (R.enabled && S.banner) {
        document.querySelector('.script-nav-container').addEventListener('click', e => { if (e.target.closest('.nav-btn')) onView(); });
        st.timer = setTimeout(() => { st.armed = true; show(); }, R.firstDelaySec * 1000);
      }
    }
  };
})();
