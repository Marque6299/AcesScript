(() => {
  'use strict';
  const cfg = (window.ACES_CONFIG || {}).ads || {}, S = cfg.slots || {};
  const F = Object.assign({ enabled: true, every: [3, 2], max: 4, reuseSec: 60, maxPerMin: 8 }, cfg.feed);
  const track = (n, p) => window.acesTrack?.(n, p), page = () => document.body.dataset.page || 'scripts';
  const rnd = ([a, b]) => a + Math.random() * (b - a);
  const unit = (id, fmt) => `<span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.client}" data-ad-slot="${id}" data-ad-format="${fmt}" data-full-width-responsive="${fmt === 'vertical' ? 'false' : 'true'}"></ins>`;
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

  // ---- Placement engine: every placement is created lazily, only for the page the agent is looking at ----
  const $ = s => document.querySelector(s), id = (k, ...f) => [S[k], ...f.map(x => S[x])].find(Boolean);
  const hits = [];                                       // global limiter: no request floods when tabs are switched rapidly
  const allowed = () => { const t = Date.now(); while (hits.length && t - hits[0] > 60000) hits.shift(); if (hits.length >= F.maxPerMin) return false; hits.push(t); return true; };
  const pg = {};                                         // one slot per page placement
  function put(key, cls, slotId, fmt, place, reuseSec = F.reuseSec) {
    if (!slotId) return;
    const old = pg[key];
    if (old?.isConnected && Date.now() - old._at < reuseSec * 1000) return;   // still fresh: keep it, no new request
    if (!allowed()) return;
    old?.remove();
    const el = make(cls, key, slotId, fmt); el._at = Date.now(); pg[key] = el; place(el); io.observe(el);
  }

  // ---- In-feed: re-built each time the agent switches script tab; one slot after every 3rd / 2nd script ----
  function feed() {
    const slotId = id('feed', 'banner'), mod = $('.script-module.active');
    if (!F.enabled || !slotId || !mod || page() !== 'scripts') return;
    const live = mod.querySelectorAll(':scope > .ad-feed');
    if (live.length && Date.now() - (mod._adAt || 0) < F.reuseSec * 1000) return;   // returning soon: keep what is there
    if (!allowed()) return;
    live.forEach(x => x.remove());
    const cards = [...mod.querySelectorAll(':scope > .script-card-sub.active')];
    let n = 0, k = 0, i = F.every[0];
    while (i < cards.length && n < F.max) {              // always leaves >= 1 script after the ad (the end slot covers the bottom)
      const el = make('ad-feed', 'feed', slotId, 'horizontal'); cards[i - 1].after(el); io.observe(el);
      n++; k++; i += F.every[k % F.every.length];
    }
    mod._adAt = Date.now();
  }

  function showFor() {
    const p = page();
    document.querySelectorAll('.ad-end').forEach(s => { s.hidden = !(cfg.endPages || []).includes(p); });
    if (p === 'scripts') {
      put('tabbar', 'ad-tabbar', id('tabbar', 'banner'), 'horizontal', el => $('.script-nav-container').append(el), Infinity);
      feed();
    }
    if (p === 'errands') put('errands', 'ad-wide', id('errands', 'banner'), 'horizontal', el => $('.archived-errands-section').before(el));
    if (p === 'notes') put('notes', 'ad-rail', id('notes', 'end'), 'vertical', el => $('#notes-page').append(el));
    if (p === 'links') put('links', 'ad-links', id('links'), 'horizontal', el => $('#links-page .links-btn-container').after(el), Infinity);
  }

  window.AcesAds = {
    init() {
      if (!cfg.enabled || window.ACES_CONSENT?.ads === false) return;
      if (S.end) document.querySelector('.main-page').append(make('ad-end', 'end', S.end));
      document.querySelectorAll('.ad-end').forEach(x => io.observe(x));
      showFor();
      document.addEventListener('aces:page', showFor);
      // user-initiated switch between script tabs -> fresh in-feed slots for the tab that just opened
      $('.script-nav-container').addEventListener('click', e => { if (e.target.closest('.nav-btn')) requestAnimationFrame(feed); });
    }
  };
})();
