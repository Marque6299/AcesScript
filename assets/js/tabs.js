(() => {
  'use strict';
  // Script tabs: every tab is its own small chip, coloured by its group (display only), laid out in a compact two-row rail.
  // If the chips need more rows, the rail grows downward OVER the page (no layout shift) by exactly the rows that are missing.
  // Moves the existing .nav-btn nodes, so script.js handlers, ids and data-tab stay intact.
  const T = (window.ACES_CONFIG || {}).tabs || { groups: [], other: { key: 'more', label: 'More' }, labels: {} };
  const R = Object.assign({ rows: 2, order: 'group', hoverOpen: true, openDelayMs: 140, closeDelayMs: 300 }, T.rail);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  const st = { open: false, quiet: false, start: 0, tops: [], rowOf: new Map(), collapsed: 0, full: 0, over: false };
  let bar, rail, clip, list, toggle, btns = [], timer, raf, lastW = 0;

  // ---- geometry: which row every chip is on, how tall two rows are, how tall all rows are ----
  function layout() {
    if (!list) return;
    rail.classList.add('is-measuring', 'no-anim');
    const tops = [...new Set(btns.map(b => Math.round(b.offsetTop)))].sort((a, b) => a - b), h = btns[0].offsetHeight;
    st.tops = tops; st.full = list.offsetHeight; st.over = tops.length > R.rows;
    st.collapsed = st.over ? tops[R.rows - 1] - tops[0] + h : st.full;
    st.rowOf = new Map(btns.map(b => [b, tops.indexOf(Math.round(b.offsetTop))]));
    const cs = getComputedStyle(rail);
    bar.style.setProperty('--rail-h', Math.ceil(st.collapsed + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth)) + 'px');
    rail.classList.remove('is-measuring');
    st.start = clamp(st.start, 0, Math.max(0, tops.length - R.rows));
    if (!st.over) st.open = false;
    keepVisible(); apply();
    requestAnimationFrame(() => requestAnimationFrame(() => rail.classList.remove('no-anim')));
  }

  // the collapsed window slides so the current tab is always inside the visible rows
  function keepVisible() {
    const on = btns.find(b => b.classList.contains('active')), r = on && st.rowOf.get(on);
    if (r == null) return;
    if (r < st.start) st.start = r; else if (r > st.start + R.rows - 1) st.start = r - R.rows + 1;
    st.start = clamp(st.start, 0, Math.max(0, st.tops.length - R.rows));
  }

  function apply() {
    const open = st.open && st.over, cap = Math.max(160, innerHeight * .6);
    const hidden = btns.filter(b => { const r = st.rowOf.get(b); return r < st.start || r > st.start + R.rows - 1; });
    rail.style.setProperty('--clip-h', (open ? Math.min(st.full, cap) : st.collapsed) + 'px');
    rail.style.setProperty('--shift', (open ? 0 : (st.tops[st.start] || 0) - (st.tops[0] || 0)) + 'px');
    rail.classList.toggle('is-open', open); rail.classList.toggle('is-over', st.over);
    clip.classList.toggle('is-scroll', open && st.full > cap);
    if (!open) clip.scrollTop = 0;
    toggle.hidden = !st.over;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.tab-more').textContent = open ? 'Less' : '+' + hidden.length;
    toggle.setAttribute('aria-label', open ? 'Show fewer script categories' : `Show ${hidden.length} more script categories`);
    btns.forEach(b => {
      const x = hidden.indexOf(b);
      if (x > -1) { b.dataset.extra = ''; b.style.setProperty('--n', x); } else { delete b.dataset.extra; b.style.removeProperty('--n'); }
      b.inert = x > -1 && !open;                                     // clipped chips are not focusable or read out until the rail is open
    });
  }

  function setOpen(v) {
    if (v && !st.over) return;
    if (!v && st.open) { const a = document.activeElement; if (a && list.contains(a)) toggle.focus({ preventScroll: true }); }   // never strand focus inside a chip that is about to be clipped
    st.open = v; apply();
  }

  function refresh() {
    const on = btns.find(b => b.classList.contains('active'));
    btns.forEach(b => {
      b.setAttribute('aria-label', `${b._label}, ${b._group}${b.classList.contains('has-updates') ? ', has new scripts' : ''}`);
      if (b === on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    keepVisible(); apply();
  }

  function build() {
    bar = document.querySelector('.script-nav-container');
    const groups = [...T.groups, T.other];
    const of = id => groups.find(g => (g.ids || []).includes(id) || (g.prefix && id.startsWith(g.prefix))) || groups[groups.length - 1];
    btns = [...bar.querySelectorAll('.nav-btn')];
    btns.forEach((b, i) => {
      const g = of(b.dataset.tab), s = b.querySelector('span');
      b._i = i; b._g = groups.indexOf(g); b._group = g.label;
      b._label = (T.labels || {})[b.dataset.tab] || s.textContent.replace(/^CEP[\s-]+/, '');
      s.textContent = b._label;
      b.dataset.group = g.key; b.type = 'button'; b.removeAttribute('role'); b.classList.add('tab-btn');
      b.title = `${g.label} › ${b._label}`;
    });
    document.querySelectorAll('.script-module').forEach(m => { m.dataset.group = of(m.id).key; });
    if (R.order !== 'data') btns.sort((a, b) => a._g - b._g || a._i - b._i);       // keep each colour together, data order inside a group

    bar.textContent = '';
    rail = mk('div', 'tab-rail'); clip = mk('div', 'tab-clip'); list = mk('div', 'tab-list');
    list.id = 'script-tab-list'; list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Script categories');
    btns.forEach(b => list.appendChild(b));
    toggle = mk('button', 'tab-toggle'); toggle.type = 'button'; toggle.hidden = true; toggle.setAttribute('aria-controls', list.id); toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="tab-more"></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    clip.appendChild(list); rail.append(clip, toggle); bar.appendChild(rail);
    layout(); refresh();

    new MutationObserver(m => { if (m.some(x => x.target.classList.contains('nav-btn'))) refresh(); }).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(() => { const w = bar.clientWidth; if (w === lastW) return; lastW = w; cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); }).observe(bar);
    document.fonts?.ready.then(layout);
    clip.addEventListener('scroll', () => { if (!st.open) clip.scrollTop = clip.scrollLeft = 0; });   // an overflow:hidden box can still be scrolled by focus / find-in-page

    toggle.addEventListener('click', () => { st.quiet = st.open && bar.matches(':hover'); setOpen(!st.open); });
    bar.addEventListener('click', e => { if (e.target.closest('.tab-btn')) { st.quiet = bar.matches(':hover'); setOpen(false); } });   // picking a tab folds the rail back; no hover re-open until the mouse leaves
    bar.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || !R.hoverOpen || !st.over || st.quiet) return;
      clearTimeout(timer); timer = setTimeout(() => setOpen(true), R.openDelayMs);
    });
    bar.addEventListener('pointerleave', e => {
      st.quiet = false; clearTimeout(timer);
      if (e.pointerType === 'mouse' && st.open) timer = setTimeout(() => setOpen(false), R.closeDelayMs);
    });
    document.addEventListener('pointerdown', e => { if (st.open && !rail.contains(e.target)) setOpen(false); });
    bar.addEventListener('focusout', e => { if (st.open && e.relatedTarget && !rail.contains(e.relatedTarget)) setOpen(false); });
    bar.addEventListener('keydown', e => {
      if (e.key === 'Escape' && st.open) { setOpen(false); toggle.focus({ preventScroll: true }); return; }
      const cur = list.contains(document.activeElement) ? btns.indexOf(document.activeElement) : -1;
      if (cur < 0) return;
      const ok = btns.filter(b => !b.inert), i = ok.indexOf(btns[cur]);
      let next = null;
      if (e.key === 'ArrowRight') next = ok[(i + 1) % ok.length];
      else if (e.key === 'ArrowLeft') next = ok[(i - 1 + ok.length) % ok.length];
      else if (e.key === 'Home') next = ok[0];
      else if (e.key === 'End') next = ok[ok.length - 1];
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {      // nearest chip in the row below / above
        const r = st.rowOf.get(btns[cur]) + (e.key === 'ArrowDown' ? 1 : -1), x = btns[cur].offsetLeft + btns[cur].offsetWidth / 2;
        next = ok.filter(b => st.rowOf.get(b) === r).sort((a, b) => Math.abs(a.offsetLeft + a.offsetWidth / 2 - x) - Math.abs(b.offsetLeft + b.offsetWidth / 2 - x))[0] || null;
      }
      if (next) { e.preventDefault(); next.focus(); }
    });
  }
  document.addEventListener('aces:rendered', build, { once: true });
})();
