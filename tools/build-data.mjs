// node tools/build-data.mjs -> regenerates the file:// fallbacks from the JSON (they can never drift)
import { readFileSync, writeFileSync } from 'node:fs';
const gen = (src, out, name) => {
  const d = JSON.parse(readFileSync(src, 'utf8').replace(/^\uFEFF/, ''));
  writeFileSync(out, `window.${name} = ${JSON.stringify(d)};\n`);
  console.log(`wrote ${out} (${d.length} entries)`);
};
gen('data/checklist.json', 'checklist-data.js', 'CHECKLIST_DATA');
