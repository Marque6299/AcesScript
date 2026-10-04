// node tools/format-data.mjs  -> re-formats scripts-data.js into the readable layout (safe to run after any edit)
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} };
vm.runInNewContext(readFileSync('scripts-data.js', 'utf8'), ctx);
const data = ctx.window.SCRIPTS_DATA;
const q = s => JSON.stringify(s).replace(/\u00a0/g, '\\u00a0');
const t = s => '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\u00a0/g, '\\u00a0').replace(/\r/g, '\\r') + '`';
const HEADER = `/* ==========================================================================
   ACES SCRIPT LIBRARY  -  edit this file directly on GitHub (pencil icon -> commit).
   --------------------------------------------------------------------------
   TO CHANGE A SCRIPT   Edit the text between the backticks in  content: \`...\`
   TO ADD A CARD        Copy one { content: \`...\` } block inside an entry's cards: [ ].
   TO ADD AN ENTRY      Copy a whole { id: ..., cards: [...] } block, paste it under the
                        matching tab heading, then change title / cards.
   TO ADD A NEW TAB     Use a new id: value. It appears automatically (under "More" until
                        you list it in assets/js/config.js -> tabs.groups).
   Fields   id         tab name (must match exactly, e.g. 'Opening', 'CEP-Probing')
            category   'chat' or 'voice'
            title      heading shown on the left of the cards
            description  optional grey sub-text under the title
            created / updated   dates in YYYY-MM-DD form. Set created (or bump updated)
                        to TODAY on a new/changed card to show the New / Updated badge.
   Placeholders  [Cx Name] [Agent Name] [Brand] [Website Address] ... become click-to-fill fields.
   Formatting    <br> = new line.  Do not use a backtick or \${ inside text (write \\\` instead).
                 A non-breaking space is written \\u00a0 so it stays visible; leave it as is.
   Safety net    GitHub runs  node tools/check-data.mjs  on every change and flags typos
                 (missing comma, bad category...) before they reach the site.
   ========================================================================== */
`;
let out = HEADER + 'window.SCRIPTS_DATA = [\n', prev = null;
for (const e of data) {
  if (e.id !== prev) out += `\n  /* ===== TAB: ${e.id.replace(/\*\//g, '').trim()} ===== */\n\n`;
  prev = e.id;
  const keys = ['id', 'category', 'title', 'description', 'tags', 'created', 'updated'].filter(k => k in e);
  const extra = Object.keys(e).filter(k => k !== 'cards' && !keys.includes(k));
  out += '  {\n' + [...keys, ...extra].map(k => `    ${k}: ${q(e[k])},\n`).join('') + '    cards: [\n';
  for (const c of e.cards) {
    out += '      {\n        content: ' + t(c.content) + ',\n';
    for (const k of Object.keys(c).filter(k => k !== 'content')) out += `        ${k}: ${q(c[k])},\n`;
    out += '      },\n';
  }
  out += '    ],\n  },\n\n';
}
writeFileSync('scripts-data.js', out + '];\n');
console.log(`formatted ${data.length} entries`);
