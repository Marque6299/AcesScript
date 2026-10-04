(() => {
  'use strict';
  // Normalises ONLY the index copy; displayed and copied text is never touched.
  const fold = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0430/g, 'a').replace(/\u0441/g, 'c').replace(/\u0435/g, 'e').replace(/\u043e/g, 'o')
    .replace(/\u0440/g, 'p').replace(/\u0445/g, 'x').replace(/[\u03bc\u039c]/g, 'm')
    .replace(/\u00a0/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').toLowerCase();
  const word = (hay, t) => { for (let i = hay.indexOf(t); i !== -1; i = hay.indexOf(t, i + 1)) if (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return true; return false; };
  ACES.buildIndex = entries => entries.map((e, i) => ({
    i, title: fold(e.title), desc: fold(e.description),
    body: fold(e.cards.map(c => c.content.replace(/<[^>]+>/g, ' ')).join(' '))
  }));
  ACES.search = (index, query) => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.map(r => {
      let score = 0;
      for (const t of terms) {
        if (word(r.title, t)) score += 5; else if (word(r.desc, t)) score += 3; else if (word(r.body, t)) score += 1; else return null;
      }
      return { i: r.i, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  };
})();
