// node tools/check-data.mjs [--baseline]  -> validates scripts-data.js (exit 1 on any problem; run by GitHub on every push)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const ctx = { window: {} };
try { vm.runInNewContext(readFileSync('scripts-data.js', 'utf8'), ctx, { filename: 'scripts-data.js' }); }
catch (e) { console.error('✖ scripts-data.js has a syntax error (usually a missing comma, quote or backtick):\n  ' + e.message); process.exit(1); }
const d = ctx.window.SCRIPTS_DATA, errs = [], warns = [];
if (!Array.isArray(d)) errs.push('window.SCRIPTS_DATA must be an array');
else d.forEach((e, i) => {
  const at = `entry #${i + 1} (${e.id} / ${e.title})`;
  if (!e.id) errs.push(`${at}: missing id`);
  if (!e.title) errs.push(`${at}: missing title`);
  if (!['chat', 'voice'].includes(e.category)) errs.push(`${at}: category must be 'chat' or 'voice'`);
  for (const k of ['created', 'updated']) if (e[k] && Number.isNaN(Date.parse(e[k]))) errs.push(`${at}: ${k} is not a valid date`);
  if (!Array.isArray(e.cards) || !e.cards.length) return errs.push(`${at}: needs at least one card`);
  e.cards.forEach((c, j) => {
    if (typeof c.content !== 'string' || !c.content.trim()) errs.push(`${at} card ${j + 1}: empty content`);
    else if ((c.content.match(/\[/g) || []).length !== (c.content.match(/\]/g) || []).length) warns.push(`${at} card ${j + 1}: unbalanced [ ] (check the placeholder)`);
  });
});
for (const w of warns) console.warn('⚠ ' + w);
if (errs.length) { console.error(`✖ ${errs.length} problem(s):\n  - ` + errs.join('\n  - ')); process.exit(1); }
console.log(`✔ scripts-data.js OK: ${d.length} entries, ${d.reduce((a, e) => a + e.cards.length, 0)} cards, ${new Set(d.map(e => e.id)).size} tabs`);
if (process.argv.includes('--baseline')) {
  const h = createHash('sha256').update(JSON.stringify(d.map(s => [s.id, s.category, s.title, s.description, s.cards.map(c => c.content)]))).digest('hex');
  console.log(h === 'dfe17a2456964833977f43c59ab88cb6012a8c4ae7f46dc56f987c0ff1bfccb4' ? '✔ text identical to the original upload' : 'ℹ text differs from the original upload (expected after edits)');
}
