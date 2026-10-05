(() => {
  'use strict';
  const cfg = (window.ACES_CONFIG || {}).ads || {}, S = cfg.slots || {};
  const R = Object.assign({ enabled: false, firstDelaySec: 15, showSec: [30, 45], restMin: [5, 8], idleSec: 120, maxPerSession: 0, trigger: 'user' }, cfg.rotation);
  const F = Object.assign({ enabled: true, everyCards: [2, 3], minContentPx: 240, maxPerView: 12, dwellMs: 1200, maxRequestsPerMin: 10, initialView: true }, cfg.feed);
  const N = Object.assign({ bar: true, barSizes: [[468, 60], [320, 50]], side: true, sidePct: 20, sideMinPageWidth: 720, sideSizes: [[300, 600], [160, 600], [300, 250], [250, 250], [200, 200], [180, 150]] }, cfg.notes);
  const track = (n, p) => window.acesTrack?.(n, p), page = () => document.body.dataset.page || 'scripts';
  const $ = s => document.querySelector(s);
  const rnd = ([a, b]) => a + Math.random() * (b - a);
  const pick = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

  // A slot is an empty labelled box until its request: the <ins> is created inside fill(), right before adsbygoogle.push().
  // AdSense fills the FIRST unprocessed <ins> in the page, so having exactly one at push time guarantees the right box gets the ad.
  // fmt = responsive format; size = [w, h] for a fixed standard size (used where the box is known and must never be clipped)
  const make = (cls, key, id, fmt = 'auto', size) => {
    const a = document.createElement('aside'); a.className = `ad-slot ${cls}`; a.dataset.slot = key; a.dataset.unit = id;
    if (size) a.dataset.size = size.join('x'); else a.dataset.fmt = fmt;
    a.setAttribute('aria-label', 'Advertisement'); a.innerHTML = '<span class="ad-label">Advertisement</span>'; return a;
  };
  const insFor = slot => {
    const ins = document.createElement('ins'); ins.className = 'adsbygoogle';
    ins.setAttribute('data-ad-client', cfg.client); ins.setAttribute('data-ad-slot', slot.dataset.unit);
    if (slot.dataset.size) { const [w, h] = slot.dataset.size.split('x'); ins.style.cssText = `display:inline-block;width:${w}px;height:${h}px`; ins.dataset.fixed = '1'; }
    else { ins.style.display = 'block'; ins.setAttribute('data-ad-format', slot.dataset.fmt); ins.setAttribute('data-full-width-responsive', 'true'); }
    return ins;
  };

  // ---- request gate shared by every placement: visible tab only, bounded request rate ----
  const stamps = [];
  const allowed = () => { const now = Date.now(); while (stamps.length && now - stamps[0] > 60000) stamps.shift(); return stamps.length < (F.maxRequestsPerMin || 10); };
  const waiting = new Set();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') [...waiting].forEach(s => { waiting.delete(s); fill(s); }); });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    if (e.target.classList.contains('ad-feed') && !feed.armed) { feed.pending.push(e.target); return; }   // feed units wait for the dwell time
    fill(e.target);
  }), { root: $('.main-page'), rootMargin: '400px 0px' });   // root = the scrolling pane, so the 400 px look-ahead works and ads load just below the fold (no visible jump)

  function fill(slot) {                    // one request per slot element, never into a zero-width responsive box
    if (!slot.isConnected || slot.dataset.requested) return;
    if (document.visibilityState !== 'visible') { waiting.add(slot); return; }
    if (!slot.dataset.size && slot.getBoundingClientRect().width === 0) return;
    if (!allowed()) {                      // over the per-minute cap: a feed unit is simply dropped (the view is stale by then); one-per-page units wait for the window to clear
      track('ads.slot.throttled', { slot: slot.dataset.slot, page: page() });
      if (slot.classList.contains('ad-feed')) { slot.remove(); return; }
      setTimeout(() => fill(slot), Math.max(1000, 60200 - (Date.now() - stamps[0])));
      return;
    }
    slot.dataset.requested = '1'; stamps.push(Date.now());
    const ins = insFor(slot); slot.append(ins);
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

  // ---- Links: one unit at the bottom of the page, requested the first time the tab opens; the tiles re-centre in the space left ----
  let linksDone = false;
  function linksFeed() {
    const pg = document.getElementById('links-page');
    if (linksDone || !S.links || !pg) return;
    linksDone = true;
    const el = make('ad-links', 'links', S.links); pg.append(el);
    requestAnimationFrame(() => fill(el));
  }

  // ---- Scripts: in-feed units between cards, a fresh set for every category the agent opens ----
  const feed = { tab: null, armed: false, pending: [], timer: null };
  const activeTab = () => $('.script-nav-container .nav-btn.active')?.dataset.tab || null;
  function clearFeed() {
    clearTimeout(feed.timer); feed.armed = false; feed.pending = [];
    document.querySelectorAll('.ad-feed').forEach(el => { io.unobserve(el); waiting.delete(el); el.remove(); });
  }
  function planFeed() {
    clearFeed();
    const id = S.feed || S.banner;
    if (!F.enabled || !id || page() !== 'scripts' || document.body.classList.contains('search-active')) return;
    const mod = $('.script-module.active'); if (!mod) return;
    const subs = [...mod.querySelectorAll(':scope > .script-card-sub.active')];
    let since = 0, height = 0, goal = pick(F.everyCards), placed = 0;
    subs.forEach((sub, si) => {
      const cards = [...sub.querySelectorAll(':scope > .card-module')];
      cards.forEach((card, ci) => {
        since++; height += card.offsetHeight;
        if ((F.maxPerView && placed >= F.maxPerView) || since < goal || height < F.minContentPx) return;
        const lastCard = ci === cards.length - 1;
        if (lastCard && si === subs.length - 1) return;              // nothing follows: the end-of-page unit covers it
        const el = make('ad-feed', 'feed', id, 'horizontal');
        (lastCard ? sub : card).after(el);                           // between two cards, or between two script entries
        io.observe(el);
        placed++; since = 0; height = 0; goal = pick(F.everyCards);
      });
    });
    if (placed) feed.timer = setTimeout(() => { feed.armed = true; feed.pending.splice(0).forEach(fill); }, F.dwellMs);
  }
  function viewChanged() {                                           // after the clicked category is on screen
    const t = activeTab();
    if (t === feed.tab) return;                                      // same category again: no new request
    feed.tab = t; planFeed();
  }

  // ---- Freeflow notes: thin strip above the text area + a column at 20% width on its right ----
  let notesDone = false;
  function notesAds() {
    const body = document.querySelector('#notes-page .freeflow-body');
    if (notesDone || !body) return;
    const box = body.getBoundingClientRect(); if (!box.width) return;
    notesDone = true;
    const barId = S.notesBar || S.banner, sideId = S.notesSide;
    let barH = 0;
    if (N.bar && barId) {
      const sz = (N.barSizes || []).find(s => s[0] + 24 <= box.width);
      if (sz) { const el = make('ad-ff-bar', 'notes-bar', barId, null, sz); body.before(el); barH = sz[1] + 14; requestAnimationFrame(() => fill(el)); }
    }
    if (N.side && sideId && box.width >= N.sideMinPageWidth) {
      const colW = (box.width - 32) * N.sidePct / 100 - 12 - 14;     // 20% of the content box, minus the gap to the text area, slot padding and border
      const colH = box.height - barH - 24 - 14 - 24;                 // minus the bar that may appear, body padding, slot padding, label
      const sz = (N.sideSizes || []).find(s => s[0] <= colW && s[1] <= colH);
      if (sz) {
        const el = make('ad-ff-side', 'notes-side', sideId, null, sz); body.append(el);
        el.addEventListener('ad:status', e => body.classList.toggle('has-side', e.detail === 'filled'), { once: true });
        const fit = () => {                                            // never clip a creative: if it no longer fits, hide the whole column
          const c = el.getBoundingClientRect(), ins = el.querySelector('ins'), over = ins.offsetHeight + 40 > c.height + 1 || ins.offsetWidth > c.width;
          el.classList.toggle('is-oversize', over); body.classList.toggle('has-side', !over);
        };
        new ResizeObserver(() => { if (el.classList.contains('is-filled')) fit(); }).observe(body);
        requestAnimationFrame(() => fill(el));
      }
    }
  }

  // ---- Optional timed banner (off by default; replaced by the in-feed units) ----
  const st = { el: null, timer: null, armed: false, count: 0, input: Date.now() };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { st.input = Date.now(); }, { passive: true, capture: true }));
  const eligible = () => page() === 'scripts' && document.visibilityState === 'visible' && !document.body.classList.contains('search-active')
    && Date.now() - st.input < R.idleSec * 1000 && !document.querySelector('.card-module .manual-edit.editing');
  const later = sec => { clearTimeout(st.timer); st.timer = setTimeout(show, sec * 1000); };
  function gap() {                         // a gap between two scripts, on screen but below the reading zone
    const mod = $('.script-module.active'), box = $('.main-page').getBoundingClientRect();
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
    if (p === 'notes') requestAnimationFrame(notesAds);
    if (p !== 'scripts' && st.el) drop(true);           // pause while another tab is open
    if (p === 'scripts') onView();
  }

  window.AcesAds = {
    init() {
      if (!cfg.enabled || window.ACES_CONSENT?.ads === false) return;
      if (S.end) $('.main-page').append(make('ad-end', 'end', S.end));
      document.querySelectorAll('.ad-end').forEach(x => io.observe(x));
      showFor();
      document.addEventListener('aces:page', showFor);
      const bar = $('.script-nav-container');
      bar.addEventListener('click', e => {                 // runs after the tab's own handlers, so the new category is already active
        if (!e.target.closest('.nav-btn')) return;
        onView();
        requestAnimationFrame(() => requestAnimationFrame(viewChanged));
      });
      document.getElementById('channel-selection')?.addEventListener('change', () => requestAnimationFrame(planFeed));   // filter swaps the visible cards
      feed.tab = activeTab();
      if (F.initialView) requestAnimationFrame(planFeed);
      if (R.enabled && S.banner) st.timer = setTimeout(() => { st.armed = true; show(); }, R.firstDelaySec * 1000);
    }
  };
})();
