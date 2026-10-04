(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {        // after script.js has wired the original buttons
    const ta = document.getElementById('ff-txt'); if (!ta) return;
    const $ = id => document.getElementById(id), page = $('notes-page'), live = $('aces-live'), stat = $('ff-char-count');
    const KEY = 'aces.ff.draft', PK = 'aces.ff.prefs', TTL = 24 * 36e5;
    const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    const prefs = Object.assign({ size: 16, space: false, contrast: false, mono: false, spell: true }, get(PK, {}));
    const TPL = {
      'Case summary': 'Customer: \nOrder / booking #: \nIssue: \nAction taken: \nOutcome: \nNext steps: \n',
      'Callback request': 'Callback requested\nCustomer: \nContact: \nBest time: \nReason: \n',
      'Escalation': 'Escalation\nCase #: \nTeam: \nReason: \nAlready tried: \nCustomer expectation: \n'
    };
    const b = (act, label, extra = '') => `<button type="button" class="freeflow-tool-btn" data-act="${act}" data-track="freeflow.${act}" ${extra}>${label}</button>`;
    const bar = document.createElement('div'); bar.className = 'ff-extras';
    bar.innerHTML = `<select id="ff-tpl" aria-label="Insert note template"><option value="">Insert template…</option>${Object.keys(TPL).map(k => `<option>${k}</option>`).join('')}</select>
      <span class="ff-group" role="group" aria-label="Display and accessibility">
        ${b('smaller', 'A&minus;', 'aria-label="Smaller text"')}${b('bigger', 'A+', 'aria-label="Larger text"')}
        ${b('space', 'Spacing', 'aria-pressed="false" aria-label="Relaxed line and letter spacing"')}${b('contrast', 'Contrast', 'aria-pressed="false" aria-label="High contrast"')}
        ${b('mono', 'Mono', 'aria-pressed="false" aria-label="Monospace font"')}${b('spell', 'Spellcheck', 'aria-pressed="true"')}
      </span>
      ${window.speechSynthesis ? b('speak', '<i class="fa-solid fa-volume-high"></i> Read aloud', 'aria-pressed="false" aria-label="Read notes aloud (selection, or everything)"') : ''}
      <button type="button" class="freeflow-tool-btn" data-act="undo" hidden>Undo clear</button>
      <span id="ff-saved" class="ff-saved" role="status"></span>
      <span class="ff-note">Autosaved on this device only and deleted after 24 hours. Shortcuts: Ctrl+Enter copy, Alt+T timestamp, Alt+S save.</span>`;
    stat.closest('.freeflow-toolbar').after(bar);

    const apply = () => {
      page.style.setProperty('--ff-size', prefs.size + 'px');
      ['space', 'contrast', 'mono'].forEach(k => page.toggleAttribute('data-' + k, !!prefs[k]));
      ta.spellcheck = prefs.spell;
      bar.querySelectorAll('[aria-pressed][data-act]').forEach(x => { if (x.dataset.act in prefs) x.setAttribute('aria-pressed', String(!!prefs[x.dataset.act])); });
      put(PK, prefs);
    };
    const fmt = () => { const v = ta.value; stat.textContent = `${v.length} chars · ${(v.match(/\S+/g) || []).length} words · ${v ? v.split('\n').length : 0} lines`; };
    let t, prev = '', undoT;
    const save = () => { clearTimeout(t); t = setTimeout(() => { put(KEY, { t: Date.now(), v: ta.value }); $('ff-saved').textContent = ta.value ? 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''; }, 600); };
    const insert = txt => { ta.setRangeText(txt, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true })); };
    const undo = () => { ta.value = prev; bar.querySelector('[data-act=undo]').hidden = true; ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true })); };

    ta.addEventListener('input', () => { fmt(); save(); });
    document.addEventListener('click', e => { if (e.target.closest('#ff-clear-btn')) prev = ta.value; }, true);   // runs before the original Clear
    $('ff-clear-btn').addEventListener('click', () => {
      fmt(); save();
      if (!prev) return;
      const u = bar.querySelector('[data-act=undo]'); u.hidden = false; live.textContent = 'Notes cleared. Undo available.';
      clearTimeout(undoT); undoT = setTimeout(() => { u.hidden = true; }, 15000);
    });
    bar.addEventListener('click', e => {
      const x = e.target.closest('[data-act]'); if (!x) return; const a = x.dataset.act;
      if (a === 'undo') return undo();
      if (a === 'speak') {
        const s = speechSynthesis; if (s.speaking) { s.cancel(); x.setAttribute('aria-pressed', 'false'); return; }
        const txt = ta.value.slice(ta.selectionStart, ta.selectionEnd) || ta.value; if (!txt.trim()) return;
        const u = new SpeechSynthesisUtterance(txt); u.onend = u.onerror = () => x.setAttribute('aria-pressed', 'false'); s.speak(u); x.setAttribute('aria-pressed', 'true'); return;
      }
      if (a === 'smaller') prefs.size = Math.max(12, prefs.size - 2); else if (a === 'bigger') prefs.size = Math.min(32, prefs.size + 2); else if (a in prefs) prefs[a] = !prefs[a];
      apply(); if (a === 'smaller' || a === 'bigger') live.textContent = `Text size ${prefs.size} pixels`;
    });
    $('ff-tpl').addEventListener('change', e => { if (TPL[e.target.value]) insert(TPL[e.target.value]); e.target.value = ''; });
    ta.setAttribute('aria-keyshortcuts', 'Control+Enter Alt+T Alt+S');
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('ff-copy-btn').click(); }
      else if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 't' || e.key === 's')) { e.preventDefault(); $(e.key === 't' ? 'ff-timestamp-btn' : 'ff-download-btn').click(); }
    });
    addEventListener('pagehide', () => { if (ta.value) put(KEY, { t: Date.now(), v: ta.value }); });

    const d = get(KEY, null);
    if (d && Date.now() - d.t < TTL) { if (!ta.value && d.v) { ta.value = d.v; $('ff-saved').textContent = 'Draft restored'; } } else if (d) { try { localStorage.removeItem(KEY); } catch {} }
    apply(); fmt();
  });
})();
