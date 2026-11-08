// Checks holidays.json before it goes live. Run: node check.mjs   (exit code 1 = do not publish)
// The app applies the same rules and ignores a whole region if any entry breaks them.
import { readFileSync } from 'node:fs';

const errors = [];
const warn = [];
let j;
try {
  j = JSON.parse(readFileSync(new URL('./holidays.json', import.meta.url), 'utf8'));
} catch (e) {
  console.error('holidays.json is not valid JSON:', e.message);
  process.exit(1);
}
if (j.format !== 1) errors.push('format must be 1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(j.updated ?? '')) errors.push('updated must be YYYY-MM-DD');
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
for (const r of ['cn', 'tw', 'kr']) {
  const rows = j.regions?.[r];
  if (!rows) { errors.push(`${r}: missing`); continue; }
  const perYear = {};
  for (const [d, n] of Object.entries(rows)) {
    const t = new Date(`${d}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(t) || t.toISOString().slice(0, 10) !== d) { errors.push(`${r} ${d}: not a real date`); continue; }
    for (const k of ['zh', 'en', 'ja', 'ko']) {
      if (typeof n?.[k] !== 'string' || !n[k].trim() || n[k].length > 120) errors.push(`${r} ${d}: name "${k}" missing or too long`);
    }
    const y = d.slice(0, 4);
    perYear[y] = (perYear[y] ?? []);
    perYear[y].push(`${d} ${WD[t.getUTCDay()]} ${n?.zh}`);
  }
  for (const [y, list] of Object.entries(perYear)) {
    if (list.length < 5) errors.push(`${r} ${y}: only ${list.length} entries (a year needs all its holidays)`);
    console.log(`\n${r} ${y}: ${list.length} days`);
    for (const l of list.sort()) console.log('  ' + l);
  }
  const keys = Object.keys(rows);
  if (keys.join() !== [...keys].sort().join()) warn.push(`${r}: dates are not in order (fine, but keep them sorted)`);
}
for (const w of warn) console.warn('WARNING:', w);
if (errors.length) {
  console.error('\nPROBLEMS:\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('\nOK: holidays.json passes all checks.');
