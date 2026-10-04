(() => {
  'use strict';
  // Forwards the app's own tracker events (assets/js/tracker.js) to Google Analytics 4.
  // The GA tag itself is added by Netlify (Snippet injection), so this file only SENDS events.
  // Do not also paste the gtag snippet into index.html, or every page view is counted twice.
  //
  // Privacy: tracker.js already drops free text and honours Do Not Track / window.ACES_TRACK_OFF,
  // and only dispatches whitelisted props. Script text, customer and agent names never reach GA.
  // The only addition is the script's TITLE (not its content) so card reports are readable.

  const SKIP = [/^ads\./];   // events to keep local only. Add e.g. /^scripts\.card\.click$/ to cut event volume.
  const RENAME = { value: 'option', source: 'data_source', page: 'app_page' };   // avoid names GA4 treats specially

  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag || function () { window.dataLayer.push(arguments); };   // queued until gtag.js loads

  // "Refund - Full refund #2" instead of an opaque hash like e-1x9k2a.1
  function cardInfo(uid) {
    let card = null;
    try { card = document.querySelector('[data-uid="' + uid.replace(/["\\]/g, '') + '"]'); } catch { /* ignore */ }
    if (!card) return {};
    let p = card.closest('.script-card-sub')?.previousElementSibling;
    while (p && !p.matches('[class*="script-title-"]')) p = p.previousElementSibling;   // skips any ad node in between
    const title = p?.querySelector('h4')?.textContent.trim();
    const n = Number(uid.split('.').pop()) + 1;
    return title ? { card_name: (title + ' #' + n).slice(0, 100) } : {};
  }

  window.addEventListener('aces:track', e => {
    const { name, props = {} } = e.detail || {};
    if (!name || SKIP.some(r => r.test(name))) return;
    const params = {};
    for (const k in props) if (k !== 'uid') params[RENAME[k] || k] = props[k];
    if (props.uid) { params.card_id = props.uid; Object.assign(params, cardInfo(props.uid)); }
    // GA4 event names allow letters, digits and underscores only (no dots), max 40 chars.
    gtag('event', name.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40), params);
  });
})();
