(() => {
  'use strict';
  // Groups the 25 script tabs into a few colour-coded menus (display only). Moves the existing .nav-btn nodes, so their handlers and ids stay intact.
  const T = (window.ACES_CONFIG || {}).tabs || { groups: [], other: { key: 'more', label: 'More' }, labels: {} };
  const hover = () => matchMedia('(hover: hover) and (min-width: 769px)').matches;
  const set = (el, a, v) => { if (el.getAttribute(a) !== v) el.setAttribute(a, v); };
  let bar, timer;
  const close = except => document.querySelectorAll('.tab-group.open').forEach(g => {
    if (g === except) return;
    g.classList.remove('open'); set(g.querySelector('.group-btn'), 'aria-expanded', 'false');
  });
  const open = g => { close(g); g.classList.add('open'); set(g.querySelector('.group-btn'), 'aria-expanded', 'true'); };
  const items = g => [...g.querySelectorAll('.nav-btn')];

  function refresh() {
    bar.querySelectorAll('.tab-group').forEach(g => {
      const on = items(g).find(b => b.classList.contains('active')), upd = items(g).some(b => b.classList.contains('has-updates'));
      const cur = on ? on.querySelector('span').textContent : '', btn = g.querySelector('.group-btn'), c = g.querySelector('.group-cur');
      if (g.classList.contains('is-current') !== !!on) g.classList.toggle('is-current', !!on);
      if (c.textContent !== cur) c.textContent = cur;
      if (g.hasAttribute('data-updates') !== upd) g.toggleAttribute('data-updates', upd);
      set(btn, 'aria-label', `${g.dataset.label}${cur ? ', current: ' + cur : ''}${upd ? ', has new scripts' : ''}`);
      items(g).forEach(b => { if (on === b) set(b, 'aria-current', 'true'); else b.removeAttribute('aria-current'); });
    });
  }

  function build() {
    bar = document.querySelector('.script-nav-container');
    const groups = [...T.groups, T.other].map(g => ({ ...g, btns: [] }));
    const of = id => groups.find(g => (g.ids || []).includes(id) || (g.prefix && id.startsWith(g.prefix))) || groups[groups.length - 1];
    [...bar.querySelectorAll('.nav-btn')].forEach(b => {
      const g = of(b.dataset.tab), s = b.querySelector('span');
      g.btns.push(b); b.dataset.group = g.key; b.type = 'button'; b.setAttribute('role', 'menuitem');
      s.textContent = (T.labels || {})[b.dataset.tab] || s.textContent.replace(/^CEP[\s-]+/, '');
    });
    document.querySelectorAll('.script-module').forEach(m => { m.dataset.group = of(m.id).key; });
    bar.textContent = '';
    groups.filter(g => g.btns.length).forEach(g => {
      const w = document.createElement('div');
      w.className = 'tab-group'; w.dataset.group = g.key; w.dataset.label = g.label;
      w.innerHTML = '<button type="button" class="group-btn" aria-haspopup="menu" aria-expanded="false"><span class="group-label"></span><span class="group-cur"></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="tab-menu" role="menu"></div>';
      w.querySelector('.group-label').textContent = g.label;
      g.btns.forEach((b, i) => { b.style.setProperty('--i', i); w.querySelector('.tab-menu').appendChild(b); });
      bar.appendChild(w);
    });
    refresh();
    new MutationObserver(m => { if (m.some(x => x.target.classList.contains('nav-btn'))) refresh(); }).observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });

    bar.addEventListener('click', e => {
      const g = e.target.closest('.tab-group'); if (!g) return;
      if (e.target === g) return close();                                  // tap on the scrim (mobile sheet)
      if (e.target.closest('.group-btn')) return g.classList.contains('open') ? close() : open(g);
      if (e.target.closest('.nav-btn')) close();
    });
    bar.addEventListener('mouseover', e => { const g = e.target.closest('.tab-group'); if (g && hover()) { clearTimeout(timer); timer = setTimeout(() => open(g), 60); } });
    bar.addEventListener('mouseleave', () => { if (hover()) { clearTimeout(timer); timer = setTimeout(() => close(), 220); } });
    bar.addEventListener('keydown', e => {
      const g = e.target.closest('.tab-group'); if (!g) return;
      const list = items(g), i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(); g.querySelector('.group-btn').focus(); }
      else if (e.target.closest('.group-btn') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); open(g); list[e.key === 'ArrowDown' ? 0 : list.length - 1].focus(); }
      else if (i > -1 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); list[e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus(); }
    });
    bar.addEventListener('focusout', e => { if (e.relatedTarget) close(bar.contains(e.relatedTarget) ? e.relatedTarget.closest('.tab-group') : null); });
    document.addEventListener('click', e => { if (!e.target.closest('.tab-group')) close(); });
  }
  document.addEventListener('aces:rendered', build, { once: true });
})();
