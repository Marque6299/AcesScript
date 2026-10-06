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

## Round 5: Google Analytics 4
- The GA tag is added by Netlify (Site configuration > Build & deploy > Post processing > Snippet injection). Do **not** also paste it into `index.html`.
- `assets/js/ga-bridge.js` listens for the tracker's `aces:track` event and forwards each one to GA4 with `gtag('event', ...)`. Dots in event names become underscores (`scripts.card.copy_ok` -> `scripts_card_copy_ok`). Card events add `card_id` and a readable `card_name` ("Script title #N"). `ads.*` events stay local (see `SKIP` in the file).
- Register these as GA4 custom dimensions (Admin > Data display > Custom definitions, event scope): `card_name`, `tab`, `channel`, `label`, `app_page`, `option`.
- Do Not Track and `window.ACES_TRACK_OFF` still disable events (tracker.js is the single gate). Not tested against a live GA property.

## Round 6 (V4 request)
- **Cards**: the Copy button is gone (markup, CSS and JS). The whole card still copies on click / tap / Enter; the status line now reads "Ready · tap or click to copy". Card padding no longer reserves room for a button.
- **In-feed ads** (`ads.feed` in `config.js`, logic in `assets/js/ads.js`): each click on a *different* category removes the previous category's units and plans a new set, one after every 2-3 cards (re-rolled after each ad). Units are empty labelled boxes at zero height until AdSense fills them, are requested only when near the screen, and only after the agent stays on the category for `dwellMs` (so flipping through tabs requests nothing for the skipped ones). Safeguards: max `maxRequestsPerMin` requests per minute for the whole tab, `maxPerView` units per view (12), `minContentPx` of script content above each ad (very short cards stretch the gap a little), no ad as the last item (the end-of-page unit covers that), hidden while searching, never inside a card. Same category clicked again = no new request. Set `feed.enabled: false` to switch it off. Uses `slots.feed`, falling back to `slots.banner`.
- **Timed rotating banner is now off** (`rotation.enabled: false`): the in-feed units replace it. Turning both on stacks too many ads on one screen.
- **Links tab**: tiles are smaller (about 58px tall, 13px text), laid out in 4 columns (2 under 900px, 1 under 480px) and centred horizontally and vertically in the free space. When the Links ad fills, it takes a strip at the bottom and the tiles re-centre in what is left; if it never fills, nothing is reserved.
- **Freeflow**: title removed (kept as a hidden heading for screen readers), tools sit at the top, then an optional thin strip ad (468x60, or 320x50 on narrow screens), then the text area. A column at 20% of the width sits to its right. The page itself never scrolls (`overflow: hidden`); only the text area scrolls. Ads use fixed standard sizes picked to fit the available box, so they are never clipped; if the window later shrinks so the column no longer fits, it hides instead of overflowing. The column is not used under 720px wide. Config: `ads.notes`; units `slots.notesBar` (falls back to `banner`) and `slots.notesSide`.
- **Auto-update** (`updates` in `config.js`, logic in `assets/js/session.js`): every 10 minutes the app compares the live HTML, JS, CSS and `data/checklist.json` with what it loaded (ETag / Last-Modified, body hash as fallback). Only if something changed, and after a second confirming check, it saves a snapshot to `sessionStorage` (this tab only, never sent anywhere), waits for 4 s without typing or clicking (60 s at most), reloads, restores, and deletes the snapshot. Restored: header names, channel filter, search, edited script placeholders, all Errand-Notes fields, Freeflow text with cursor and scroll, checklist ticks, active category, active page and scroll position. If the snapshot cannot be saved, it does not reload and offers an "Update now" button instead. Never more than one automatic reload per 5 minutes. A literal reload every 10 minutes is available (`reloadEvenIfUnchanged: true`) but not recommended with AdSense.
- **Policy notes** for the new placements: keep Auto ads off for the site; ads stay labelled "Advertisement" and away from tap targets (18px margins in the feed, a bordered strip above the Freeflow text area). The Freeflow and Links pages have little publisher content of their own, which is the weakest spot for AdSense review; to remove those ads, set `ads.notes.bar` and `ads.notes.side` to `false` and `slots.links` to `''`.
- **Ad units**: `notesSide` is pre-filled with the rail unit your V4 config called "no longer used" (6965605774). Create a fresh display unit if that one was a fixed size.
- Tested in headless Chromium (desktop 1366x768 and phone 390x800) with a stubbed AdSense script; not tested against live ads or a live Netlify deploy.

## Round 7: ungrouped two-row script tabs
- **Ungrouped**: the five group buttons and their drop-down menus are gone. All 25 tabs are individual chips (`.tab-btn`, same `.nav-btn` nodes, so `script.js` handlers, ids and `data-tab` are untouched). Each chip is filled with its group's colour (`--g-flow`, `--g-changes`, ... in `aces-upgrade.css`, the same variables the script headers and card edges use). The group name is in the chip's tooltip and screen-reader label ("Refunds, Changes"). `tabs.rail.order: 'group'` keeps each colour together (data order inside a group); `'data'` uses the file order.
- **Size**: chips are 20px tall (half of the old 40px buttons; 22px on screens up to 768px wide, half of 44px), 12px semibold text, 8px side padding. Width follows the label, so it is not literally halved: the old buttons averaged about 120px, the chips about 111px, but they now carry a full tab name instead of "group · current tab". On phones up to 480px wide: 11px text and 6px padding. Knobs on `.script-nav-container`: `--tb-h`, `--tb-px`, `--tb-font`, `--tb-gap`, `--tb-row-gap`, and `--tb-max` (maximum chip width, default 240px; set about 110px to truncate long labels with an ellipsis and get a much narrower rail).
- **Two rows + auto-expand** (`assets/js/tabs.js`): two rows are always visible. When the chips need more rows, a `+N` button appears at the right end and the rail opens downward over the page by exactly the missing rows (the measured height of all rows, never a fixed number), 0.38s ease-out, with the revealed chips dropping in one after another. The page below does not move (the rail is an overlay and the bar keeps its height). Open with: mouse hover (140ms delay, closes 300ms after the pointer leaves), the `+N` button (touch, keyboard, mouse), or Enter/Space on it. It folds back after a tab is picked, on Esc, on a tap outside, or when focus leaves. On very short screens the open rail is capped at 60% of the window height and scrolls inside.
- **Current tab stays visible**: while closed, the two-row window slides by whole rows so the active chip is always inside it (picking "Exchange and Cancellation Tips" from the third row slides the window down one row; it does not move again when you pick a chip that is already visible). The active chip has a white ring and bolder text, so it does not rely on colour alone.
- **Accessibility**: clipped chips are `inert` (not focusable or read out) until the rail opens; Left/Right/Home/End move between chips and Up/Down jump to the row above/below; the toggle has `aria-expanded`/`aria-controls` and an updating label ("Show 5 more script categories"). On touch screens each chip gets an invisible hit area of about 32-34px; the visible chip stays at half size. Reduced-motion users get no animation. Contrast of white 12px text on the group colours: 5.0:1 to 7.1:1.
- **Other changes**: skeleton loader now shows two rows of small chips; ad requests that hit the per-minute cap for the one-per-page units (Links, Free-flow strip and column) now wait for the window to clear instead of being dropped, only in-feed units are dropped.
- Tested in headless Chromium at 1920, 1366, 1024 and 390px wide (stub ad script): 2 rows with no toggle at 1920, 3 rows (+5) at 1366, 4 rows (+11) at 1024, 12 rows on a phone; no layout shift when opening; colour of every chip checked against its group; keyboard, hover, tab pick from a hidden row, update-and-restore, and in-feed ads all re-checked. Not tested on a real device or live Netlify deploy.

## Round 8 (V7): AdSense policy pass (after "ad serving limited - account being assessed", Oct 6 2026)
- Slots are visible, labelled and sized before the request (no `max-height:0` / `opacity:0`, no `overflow:hidden` clipping); only a confirmed-unfilled slot collapses. Ads are removed, not hidden, while searching.
- Feed gaps 44px (52px phones), end unit 48px; one ad per 3-4 cards, >=600px of content between ads, max 6 per view, 6 requests/min, 2.5 s dwell.
- Links and Freeflow ads are OFF (low publisher content; Freeflow holds customer details). Old IDs are noted in `config.js`.
- Funding Choices tag added to `<head>`; publish a GDPR message in AdSense > Privacy & messaging for it to show. GA4 (injected by Netlify) should use Consent Mode.
- Legal pages: GA4 + local/session storage disclosed, claims about accounts/marketing/transactions removed, dates and contact emails fixed.
- Account side (code cannot fix): the limit is a traffic assessment, so it lifts on Google's schedule. Check AdSense > Sites that the host is eligible (`*.netlify.app` is often rejected; a custom domain is safer), and confirm you may host the client's scripts.
- Not render-tested.

## Round 9 (V8): Freeflow banner, Links multiplex decision
- **Freeflow**: one fixed-size banner (468x60, or 320x50 on narrow) between the tools and the text area, with 32px clear space on both sides. It is requested once, the first time the page is opened, and never refreshed. Not placed when the pane is under 400px tall. Side column stays off. Uses the `banner` unit unless `slots.notesBar` is set.
- **Links multiplex NOT added** (slot 4412710615 parked in `config.js`): the page is a navigation screen with four links, so a multiplex grid would outweigh the content and look like more link tiles. Add original content to the page first, then ask for it to be wired in.
- Not render-tested.
