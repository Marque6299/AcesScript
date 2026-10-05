// Site switches. Ads render only for slots that have a real AdSense unit ID.
window.ACES_CONFIG = {
  // Display-only tab grouping. Tab ids (and the JSON) are untouched; unlisted tabs land in "More" so a new tab never disappears.
  tabs: {
    groups: [
      { key: 'flow',    label: 'Conversation', ids: ['Opening', 'Closing', 'Handling Objections', 'Payment'] },
      { key: 'changes', label: 'Changes',      ids: ['Change', 'Cancel', 'Refunds', 'Refund Delays', 'Schedule Change', 'Name Correction'] },
      { key: 'library', label: 'Libraries',    ids: ['ETG Chat Scripts', 'B.COM Chat Scripts', 'ETG Voice Scripts'] },
      { key: 'cep',     label: 'CEP',          prefix: 'CEP-', ids: ['>>>>>>>>>>    C-SAT SCRIPTS    <<<<<<<<<<'] },
      { key: 'ref',     label: 'Reference',    ids: ['Helpful Scripts', 'General Scripts', 'Exchange and Cancellation Tips'] }
    ],
    other: { key: 'more', label: 'More' },
    // Tab rail: every tab is its own chip (colour = its group). `rows` rows are always visible; any further rows open downward on hover
    // (mouse), on the +N button (touch / keyboard) and fold back after a pick. order: 'group' keeps each colour together, 'data' = file order.
    rail: { rows: 2, order: 'group', hoverOpen: true, openDelayMs: 140, closeDelayMs: 300 },
    labels: { '>>>>>>>>>>    C-SAT SCRIPTS    <<<<<<<<<<': 'C-SAT Scripts' }
  },
  ads: {
    enabled: true,
    client: 'ca-pub-6978764838614552',
    // Paste real ad-unit IDs (AdSense > Ads > By ad unit). An empty ID keeps that placement switched off.
    //   end / links / banner : as before.      feed      : in-feed units between script cards (falls back to `banner`).
    //   notesBar             : strip above the Freeflow text area (falls back to `banner`).
    //   notesSide            : the 20% column beside the Freeflow text area. Pre-filled with your retired rail unit (6965605774); create a fresh display unit
    //                          for it in AdSense if that one was a fixed size, because the column serves 300x600 / 160x600 / 300x250 / smaller. Empty = column off.
    slots: { end: '7813895425', banner: '5267623137', links: '6500813756', feed: '', notesBar: '', notesSide: '6965605774' },
    endPages: ['scripts', 'checklist'],

    // In-feed ads between script cards. Every click on a DIFFERENT category starts a fresh view: the old units are removed and
    // new ones are planned (one after every 2-3 cards). Requests stay lazy and rate-limited so rapid tab flipping cannot spam AdSense.
    feed: {
      enabled: true,
      everyCards: [2, 3],        // one ad after every 2 or 3 cards (re-rolled after each ad)
      minContentPx: 240,         // an ad waits until at least this much script content sits above it, so very short cards stretch the gap a little (0 = strict 2-3 cards)
      maxPerView: 12,            // hard cap per category view (0 = no cap). Long categories such as ETG Chat Scripts have 100+ cards
      dwellMs: 1200,             // request only after the agent stayed on the category this long
      maxRequestsPerMin: 10,     // sliding-window guard on ALL ad requests from this tab
      initialView: true          // also fill the first category shown on page load
    },

    // Freeflow notes: a thin strip between the tools and the text area, plus a column at 20% of the width on its right.
    // Both are fixed standard sizes chosen to FIT (never clipped) and stay at zero size until AdSense fills them.
    notes: {
      bar: true,  barSizes: [[468, 60], [320, 50]],                                           // smallest height first
      side: true, sidePct: 20, sideMinPageWidth: 720,                                        // phones: no side column
      sideSizes: [[300, 600], [160, 600], [300, 250], [250, 250], [200, 200], [180, 150]]    // largest that fits wins
    },

    // The old timed rotating banner is OFF: the in-feed units above replace it (running both would stack too many ads on one view).
    rotation: {
      enabled: false,
      firstDelaySec: 15,
      showSec: [30, 45],
      restMin: [5, 8],
      idleSec: 120,
      maxPerSession: 0,
      trigger: 'user'            // 'user' = waits for the agent's next tab/page switch (AdSense-compliant)
    }
  },

  // Version check + safe refresh. Every `checkEveryMin` minutes the app compares the live files with the ones it loaded.
  // If something changed it saves every input (sessionStorage, this tab only), waits for a quiet moment, reloads and puts everything back.
  updates: {
    enabled: true,
    checkEveryMin: 10,
    quietMs: 4000,               // reload only after this long without typing/clicking...
    maxWaitMs: 60000,            // ...but never wait longer than this once a new version is found (inputs are restored anyway)
    reloadEvenIfUnchanged: false // true = literal reload every 10 min. Not recommended with AdSense (automatic reloads = extra page views / ad requests)
  }
};
