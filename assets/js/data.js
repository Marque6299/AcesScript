(() => {
  'use strict';
  const K = 'aces.cache.';
  async function load(name, url, fallback) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      try { localStorage.setItem(K + name, t); } catch {}
      ACES.source = 'network';
      return JSON.parse(t.replace(/^\uFEFF/, ''));          // strip BOM only; text is never altered
    } catch (e) {
      let c = null; try { c = localStorage.getItem(K + name); } catch {}
      if (c) { ACES.source = 'cache'; return JSON.parse(c); }
      if (window[fallback]) { ACES.source = 'inline'; return window[fallback]; }
      throw e;
    }
  }
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  // In-memory stable ids (the JSON file is not modified): entry#nth-duplicate, card#index
  function assignUids(data) {
    const seen = {};
    data.forEach(e => {
      const k = [e.id, e.category, e.title].join('::');
      e._uid = 'e-' + hash(k + '::' + (seen[k] = (seen[k] ?? -1) + 1));
      e.cards.forEach((c, i) => { c._uid = e._uid + '.' + i; });
    });
    return data;
  }
  window.ACES = Object.assign(window.ACES || {}, {
    loadScripts: () => new Promise((resolve, reject) => {     // scripts-data.js is the single, hand-edited source
      const d = window.SCRIPTS_DATA;
      if (!Array.isArray(d)) return reject(new Error('scripts-data.js did not load or contains a syntax error'));
      ACES.source = 'file';
      const ok = d.filter((e, i) => { const good = e && e.id && Array.isArray(e.cards); if (!good) console.warn('[ACES] skipped invalid entry #' + (i + 1), e); return good; });
      ok.forEach(e => { e.title ??= ''; e.description ??= ''; e.tags ??= []; e.cards = e.cards.filter(c => typeof c.content === 'string'); });
      resolve(assignUids(ok));
    }),
    loadChecklists: () => load('checklist', 'data/checklist.json', 'CHECKLIST_DATA')
  });
})();
