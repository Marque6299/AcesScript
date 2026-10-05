(() => {
  'use strict';
  // Local-first usage metrics. Only whitelisted, non-free-text props are ever stored: no script text, customer, order or agent names.
  const COUNTERS = 'aces.metrics.v1', LOG = 'aces.eventlog.v1', MAX_LOG = 1500, KEEP_DAYS = 90;
  const OK = new Set(['uid','page','label','tab','group','channel','value','len','results','zero','form','rows','action','checklist','step','on','slot','source','entries','msg','fields_filled','empty_count','token','system','doc','has_value']);
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let counters = read(COUNTERS, {}), log = read(LOG, []), timer = null;
  const flush = () => { clearTimeout(timer); timer = null; write(COUNTERS, counters); write(LOG, log); };
  const queue = () => { if (!timer) timer = setTimeout(flush, 800); };

  function track(name, raw = {}) {
    if (window.ACES_TRACK_OFF || window.ACES_RESTORING || navigator.doNotTrack === '1') return;   // ACES_RESTORING: session.js replaying clicks after an auto-update
    const props = {};
    for (const k in raw) if (OK.has(k) && raw[k] != null) props[k] = typeof raw[k] === 'string' ? raw[k].slice(0, 60) : raw[k];
    const day = new Date().toISOString().slice(0, 10), key = props.uid ? `${name}|${props.uid}` : name;
    const c = (counters[key] ||= { n: 0, first: day, days: {} });
    c.n++; c.last = day; c.days[day] = (c.days[day] || 0) + 1;
    const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
    for (const d in c.days) if (d < cutoff) delete c.days[d];
    log.push({ t: Date.now(), e: name, ...props });
    if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
    queue();
    window.dispatchEvent(new CustomEvent('aces:track', { detail: { name, props } }));   // hook for GA4 / endpoint (gate on consent)
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    const d = el.dataset;
    track(d.track, { uid: d.trackUid, page: d.trackPage, label: d.trackLabel });
  }, true);
  window.addEventListener('pagehide', flush);
  window.addEventListener('error', e => track('app.error', { msg: String(e.message) }));
  const top = (prefix, n = 10) => Object.entries(counters).filter(([k]) => k.startsWith(prefix))
    .sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([k, v]) => ({ key: k, count: v.n, last: v.last }));
  window.acesTrack = track;
  window.acesMetrics = { top, export: () => JSON.stringify({ exportedAt: new Date().toISOString(), counters, log }, null, 2), reset: () => { counters = {}; log = []; flush(); } };
})();
