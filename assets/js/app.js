(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const track = (n, p) => window.acesTrack?.(n, p);

  // footer year, current page (used by ads + aria-current)
  $('#year').textContent = new Date().getFullYear();
  const pageOf = { 'script-page-action': 'scripts', 'errands-page-action': 'errands', 'notes-page-action': 'notes', 'check-list-page-action': 'checklist', 'links-page-action': 'links' };
  const setPage = btn => {
    document.body.dataset.page = pageOf[btn.id];
    document.querySelectorAll('.side-panel button').forEach(b => b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current', 'page');
    document.dispatchEvent(new Event('aces:page'));
    $('.main-page').scrollTo({ top: 0, behavior: 'instant' });
  };
  document.querySelectorAll('.side-panel button').forEach(b => b.closest('.nav-item').addEventListener('click', () => setPage(b)));
  setPage($('#script-page-action'));

  // theme toggle (card surfaces); follows the system setting until the agent chooses
  const root = document.documentElement, saved = ls.get('aces.theme');
  if (saved) root.dataset.theme = saved;
  const wrap = document.createElement('div');
  wrap.className = 'theme-wrap';
  wrap.innerHTML = '<button type="button" class="theme-toggle" aria-label="Switch dark / light cards" title="Dark / light cards"><i class="fa-solid fa-circle-half-stroke"></i></button>';
  $('.customer-input').before(wrap);
  wrap.firstChild.addEventListener('click', () => {
    const dark = (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    root.dataset.theme = dark ? 'light' : 'dark'; ls.set('aces.theme', root.dataset.theme);
  });

  // placeholder state + "2 of 3 fields" progress (display only)
  const refresh = card => {
    const f = [...card.querySelectorAll('.manual-edit')];
    f.forEach(x => { const t = x.textContent.trim(); x.classList.toggle('filled', !!t && t !== x.dataset.defaultText); });
    const n = f.filter(x => x.classList.contains('filled')).length, ready = !f.length || n === f.length;
    const prog = f.length ? (ready ? 'Ready · tap or click to copy' : `${n} of ${f.length} fields filled`) : '';
    if (prog) { if (card.dataset.progress !== prog) card.dataset.progress = prog; } else delete card.dataset.progress;
    if (card.hasAttribute('data-ready') !== (ready && f.length > 0)) card.toggleAttribute('data-ready', ready && f.length > 0);
  };
  const watch = () => {
    document.querySelectorAll('.card-module').forEach(refresh);
    new MutationObserver(ms => new Set(ms.map(m => (m.target.nodeType === 3 ? m.target.parentElement : m.target)?.closest?.('.card-module')).filter(Boolean)).forEach(refresh))
      .observe($('.script-canvas'), { subtree: true, childList: true, characterData: true });
  };

  // persisted agent name
  const agent = $('#user');
  agent.addEventListener('input', () => ls.set('aces.agent', agent.value.trim()));
  document.addEventListener('aces:rendered', () => {
    const a = ls.get('aces.agent');
    if (a) { agent.value = a; agent.dispatchEvent(new Event('input', { bubbles: true })); }
    watch();
    const cards = ACES.scripts.flatMap(s => s.cards), ts = cards.map(c => Date.parse(c.updated || c.created)).filter(Number.isFinite);
    if (ts.length) $('#footer-meta').textContent = `${ACES.scripts.length} scripts · updated ${new Date(Math.max(...ts)).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
    window.AcesAds?.init();
  });

  // tracking that cannot be declared in markup
  $('#channel-selection').addEventListener('change', e => track('header.channel.change', { value: e.target.value }));
  $('#customer').addEventListener('change', e => track('header.customer.set', { has_value: !!e.target.value.trim() }));
  agent.addEventListener('change', e => track('header.agent.set', { has_value: !!e.target.value.trim() }));
  $('.script-nav-container').addEventListener('click', e => { const b = e.target.closest('.nav-btn'); if (b) track('scripts.tab.click', { tab: b.dataset.tab }); });
  $('.check-list-nav-container').addEventListener('click', e => { const b = e.target.closest('button'); if (b) track('checklist.tab.click', { checklist: b.textContent.trim() }); });

  // keyboard: / search, Esc clear, Alt+1..5 pages
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === '/' && !typing) { e.preventDefault(); $('#search-input').focus(); }
    else if (e.key === 'Escape' && e.target.id === 'search-input') { e.target.value ? $('#search-clear')?.click() : e.target.blur(); }
    else if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); document.getElementById(Object.keys(pageOf)[e.key - 1]).click(); }
  });
  const lt = $('.legal-toggle');
  lt.addEventListener('click', () => { const o = lt.getAttribute('aria-expanded') === 'true'; lt.setAttribute('aria-expanded', String(!o)); $('#legal-links').classList.toggle('open', !o); });
  $('.to-top').addEventListener('click', e => { e.preventDefault(); $('.main-page').scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  // scrollbar thumbs brighten while their container is scrolling (CSS does the animation)
  document.addEventListener('scroll', e => {
    const t = e.target; if (!t || t.nodeType !== 1) return;
    t.classList.add('is-scrolling'); clearTimeout(t._sb); t._sb = setTimeout(() => t.classList.remove('is-scrolling'), 900);
  }, { capture: true, passive: true });
  window.addEventListener('pagehide', () => ls.set('aces.lastSeen', Date.now()));
})();
