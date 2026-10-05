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
    labels: { '>>>>>>>>>>    C-SAT SCRIPTS    <<<<<<<<<<': 'C-SAT Scripts' }
  },
  ads: {
    enabled: true,
    client: 'ca-pub-6978764838614552',
    // Paste real ad-unit IDs (AdSense > Ads > By ad unit). An empty ID keeps that placement switched off.
    // Optional extra IDs: feed, tabbar, errands, notes (each falls back to banner / end when empty).
    slots: { end: '7813895425', banner: '5267623137', links: '6500813756' },   // the old rail unit (6965605774) is no longer used
    endPages: ['scripts', 'checklist'],
    // In-feed ads: each time the agent opens a script tab, slots are injected after every 3rd / 2nd script (max 4 per tab).
    // They request lazily (only when scrolled near) and are never refreshed on a timer. reuseSec: returning to a tab inside this window
    // keeps its existing ads instead of requesting new ones; maxPerMin caps total requests so fast tab-switching cannot flood AdSense.
    feed: { enabled: true, every: [3, 2], max: 4, reuseSec: 60, maxPerMin: 8 }
  }
};
