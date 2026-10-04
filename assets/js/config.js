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
    slots: { end: '7813895425', banner: '5267623137', links: '6500813756' },   // the old rail unit (6965605774) is no longer used
    endPages: ['scripts', 'checklist'],
    // Rotating banner between scripts: on for showSec, off for restMin, then requests a new ad.
    rotation: {
      enabled: true,
      firstDelaySec: 15,
      showSec: [30, 45],
      restMin: [5, 8],
      idleSec: 120,                             // pauses when the agent is idle or the tab is hidden
      maxPerSession: 0,                         // 0 = unlimited
      trigger: 'user'                           // 'user' = next request waits for the agent's next tab/page switch (AdSense-compliant)
                                                // 'timer' = request exactly when the rest period ends (AdSense disallows publisher-timed refresh; use only with Ad Manager)
    }
  }
};
