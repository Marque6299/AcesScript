# ACES upgrade notes (built from AcesUpgradePlan.md)

## What changed
| Phase | Done |
|---|---|
| **P0 Integrity** | App now renders `data/scripts-list.json` and `data/checklist.json` (single source). `scripts-data.js` / `checklist-data.js` are *generated* file:// fallbacks (`node tools/build-data.mjs`). `node tools/verify-text.mjs` checks the SHA-256 baseline on both (passes: 474 entries, 564 cards). The JSON is byte-identical to the upload. |
| **P1 Ads** | Old AdManager, inline ad CSS, dead overlay code and the two 728x90 units removed. New `assets/js/ads.js`: lazy, measured, no polling, no `push` monkey-patch; rail / in-feed / end slots; labelled; reserved height; hidden while searching. **Nothing renders until you paste real unit IDs in `assets/js/config.js`** (the old IDs looked like placeholders). Footer is now static, inside the scroll area. |
| **P2 Tracking** | `assets/js/tracker.js` (local-first, whitelisted props only, no text/PII, honours Do Not Track). `data-track` on static controls; hooks for copy ok / blocked / fail, card click/reset, tabs, search, channel, page load, ad request/fill/viewable. Read it with `acesMetrics.top('scripts.card.copy_ok')` or `acesMetrics.export()` in the console. |
| **P4 UX (lite)** | `assets/css/aces-upgrade.css` token layer (light + dark), solid channel colours, neutral cards with channel edge, no hover shift, 14px body, dashed/solid placeholder states, "2 of 3 fields / Ready" chip, static New/Updated markers, visible two-tone focus ring (+ forced-colors), reduced motion. Keyboard: cards and placeholders are focusable (Enter fills/copies), `/` search, `Esc` clear, `Alt+1..5` pages, `aria-current`, live region for "Copied". `<button><a>` fixed, inputs labelled, logos relative. |
| **P5 (partial)** | Search covers card content (accent/look-alike folding, index copy only) with result count; placeholder aliases (`[Brand]`/`[BRAND]`/`[Brand Name]`/`[our Brand]`, `[Agent name]`...) share one value; unfilled-token warning (`##x##`, `XYZ`, `XX`, `CUSTOMER NAME`); agent name persisted; "new since last visit" replaces the 7-day blink; one shared state manager. |

## UX skills applied
- **ux-audit** (code tier): baseline inventory of the original = 121 colours, 16 font sizes, 13 radii, 33 shadows, 11% token adoption; the plan's findings were adopted as the register.
- **ux-restyle**: scope locked to look, not flows; plan tokens measured. Failing white-text pairs were derived darker: brand `#2c7be5` (4.14:1) -> `#1d63c6` (5.75:1); voice `#0f9d8a` (3.38:1) -> `#0b7a6b` (5.24:1); ok `#1f9d63` (3.46:1) -> `#17784a` (5.49:1). All text/UI pairs in `aces-upgrade.css` measured >= 4.4:1 (UI) / 4.5:1 (text), light and dark.
- **ux-design / ux-review**: card anatomy, states (empty/filled/ready/copied/blocked/loading/error), microcopy.

## Decisions for the content owner (plan §2.5)
1. Refund timing: the JSON says "5", the old JS copy said "6". JSON wins; confirm it is the right policy.
2. The `<strong>` add-on disclaimer on *CEP-Discuss Solution & Gain Agreement* exists only in the old JS copy. It is not in the JSON; add it there if it should return.
3. Curly quotes/dashes are restored in copied text (canonical). Add a paste-safe toggle only if a downstream tool mangles them.

## Account side (cannot be done in code)
Create real ad units and paste IDs in `assets/js/config.js`; keep Auto Ads off or Anchor-only; confirm the `*.netlify.app` host status in AdSense; consent banner (Funding Choices) if EEA/UK visitors; confirm client policy before enabling `errands` in `railPages`.

## Not built in this pass
Admin editor (P3), tab grouping + header rework, favourites/recents, PWA/offline worker, brand auto-fill selector, stats dashboard page, content sanitiser (only needed once an editor exists), step/command tracking inside the checklist. Everything else in the plan is untouched.

## Not verified
Written without a browser. Do a live pass: tab through header -> tabs -> card -> copy, check the dark/light card colours on each page, resize 1440 -> 390 px, and compare clipboard text with the JSON for the NBSP, Cyrillic and `<br>` samples.

## Round 2: layout, tab groups, sidebar, footer, mobile
- **Right-edge white strip**: the header row was wider than the page (the agent-name box spilled out; that was the faint "James"), so Chrome zoomed out to fit it. The header is now a grid that wraps (1 row >=1100px, 2 rows below), the shell is a single-scroller flex column on `100dvh`, and `overflow-x: clip` guards the page.
- **Tab groups**: 25 tabs -> 5 colour-coded menus (Conversation, Changes, Libraries, CEP, Reference). Hover (desktop), click/tap or arrow keys open them; on phones they open as a bottom sheet. Edit the groups in `assets/js/config.js` (`tabs.groups`); unlisted tabs appear under "More". Display only: tab ids and JSON are unchanged.
- **Script headers**: 14px gap between them, filled with their group's colour (the card edge matches); Chat/Voice is a text badge so it never relies on colour alone.
- **Sidebar**: 88px rail with 12px labels and a clear active bar (no tooltips, labels are visible); a bottom tab bar with 44px+ targets on phones. Links item now matches the others; nav buttons have accessible names.
- **Footer**: auto year, "N scripts · updated Mon YYYY" from the data, Back to top, and legal links behind a "Legal" toggle on phones.
- **Mobile**: titles stack above cards, 16px inputs (no iOS zoom), real **Copy / Fill next field** button on every card, errands forms stack, tables scroll, skip link, `viewport-fit=cover` with safe-area padding.
- Not render-tested (no browser here). Colour pairs measured: every group colour passes AA with white text; dark-theme edge colours pass 3:1+.

## Round 3
- **Data**: `scripts-data.js` is now the single, hand-edited, readable source (instructions at the top of the file; one field per line; text in backticks; NBSP shown as `\u00a0`). `data/scripts-list.json` and `tools/verify-text.mjs` are gone. `node tools/check-data.mjs` validates it and a GitHub Action runs it on every change. `node tools/format-data.mjs` re-tidies the layout. Every field was verified identical to the previous data.
- **Footer** is a fixed row of the app grid (36px, 40px on phones); legal links collapse into a pop-up under 900px.
- **Skeleton loader** (tabs + cards) shows until the scripts render; a failed load shows a Retry button.
- **Cards**: the Copy button appears only when every field is filled (no "Fill next field").
- **Motion**: group buttons lift, chevrons rotate, menus fade/scale in with a staggered item reveal; phones get a sliding bottom sheet. Honors reduced-motion.
- **Ads**: Links feed is requested only the first time the Links tab opens. Rotating banner between scripts (config `ads.rotation`): shows 30-45 s, rests 5-8 min, repeats while the Scripts tab is open, the browser tab is visible, the agent is active and not searching/editing. Each placement stays off until its real unit ID is set in `config.js` (`banner`, `links`).
- **AdSense rule**: publisher-timed re-requests are not allowed on AdSense; user-initiated ones are. Default `trigger: 'user'` waits for the agent's next tab/page switch after each rest period. `'timer'` is the literal timed loop (use only on Ad Manager with refresh declared).
- **Freeflow**: autosave (24 h, this device), templates, word/line counts, text size, spacing, high contrast, mono, spellcheck toggle, read aloud, undo clear, shortcuts.
- **Content flags** from the validator (left untouched): two cards have mismatched brackets, `{like baggage, seats, or meals]` (ETG Chat Scripts, "ATC-CXL - non-ref tax") and `[currency}` ("CXL - fare rules").
- Not render-tested (no browser here).

## Round 4
- **Shell lock**: the app frame is `position: fixed` to the viewport and `html/body` never scroll, with `!important` guards, so header, sidebar, tab bar and footer stay put on every page; only `.main-page` (and the Freeflow text area) scroll. Verified in headless Chromium at 1366x634: container = viewport, footer pinned, Links page fills the screen. `_headers` no longer caches `/assets/*` for an hour (stale CSS could be mixed with new HTML).
- **Scrollbars**: slim pill thumbs with a soft track that brighten and thicken on hover and while scrolling (Chrome/Edge/Safari); thin themed scrollbar in Firefox. Content tab bar now sticks with a solid backing.
- **Ads**: ad units set in `config.js` (`end`, `banner`, `links`); the vertical rail is removed entirely. Every ad container is zero-height and invisible until AdSense reports `filled` (it then expands; unfilled ones stay gone). Links feed now sits under the tiles.
- **Freeflow**: page is a flex column; the text area takes the remaining height and scrolls inside itself.
- Tip: in AdSense turn Auto ads off for this site, otherwise Google may add placements beside your manual units.
