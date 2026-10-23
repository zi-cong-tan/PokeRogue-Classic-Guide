// Your current run, passed in by the browser extension: extension/static/guide.js forwards what the overlay last saved,
// the game's own party info (window.gameInfo: level, HP, moves, ability, nature) plus each member's species, IVs and
// held items, and whether you hold the Map. Kept in this browser like the rest of the guide; nothing is sent anywhere.
import { useEffect, useState } from 'react';
import { mult } from './data/types.js';

const KEY = 'prg-live';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export function useLive() {
  const [run, setRun] = useState(read);
  useEffect(() => {
    const on = e => {
      const r = e.source === window && e.data?.__prgRun ? e.data.run : null;
      if (!r?.info || !Array.isArray(r.party)) return;
      try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* private mode: still used for this visit */ }
      setRun(old => (old?.at === r.at ? old : r));
    };
    addEventListener('message', on);
    window.postMessage({ __prgSaveAsk: 1 }, location.origin);  // guide.js answers with your unlocks and your run
    return () => removeEventListener('message', on);
  }, []);
  return run;
}

// The guide's form key for a party member. The extension names regional forms with their region ("Alolan Raichu"),
// as the guide's data does; two special forms share their base form's name, so they go by the game's species id.
const SPECIAL = { 2670: 'ETERNAL_FLOETTE', 8901: 'BLOODMOON_URSALUNA' };
const byName = new WeakMap();
export function formKey(member, F) {
  if (SPECIAL[member.id]) return SPECIAL[member.id];
  if (!byName.has(F)) {
    const m = {};
    for (const k of Object.keys(F)) m[F[k][0]] ??= k;
    byName.set(F, m);
  }
  return byName.get(F)[member.species] || null;
}

// The last form of a line reachable from `form` (first branch): what a catch grows into.
export const finalForm = (form, F) => (F[form][6].length && F[F[form][6][0][0]] ? finalForm(F[form][6][0][0], F) : form);

// Wild Pokémon in a biome worth catching for this team, best three. A good one resists what hits the team hard
// (threats) and hits what the team's moves can't (gaps), judged by what it evolves into; stronger ones and commoner
// ones rank higher. With no holes to fill it ranks by strength alone. Lines already in the party are left out.
const RARITY = { COMMON: [1, 'Common'], UNCOMMON: [0.9, 'Uncommon'], RARE: [0.75, 'Rare'], SUPER_RARE: [0.55, 'Super rare'], ULTRA_RARE: [0.4, 'Ultra rare'] };
export function catchHere(wild, holes, partyLines, L, limit = 3) {
  const { FORMS: F, LINES } = L;
  const best = new Map();
  for (const [tier, list] of Object.entries(wild || {})) {
    for (const sp of list) {
      if (!F[sp]) continue;
      const line = LINES.findIndex(l => l.includes(sp));
      if (partyLines.has(line)) continue;
      const fin = finalForm(sp, F), types = F[fin][2].split(' ');
      const resists = holes.threats.filter(t => mult(t, types) < 1);
      const hits = holes.gaps.filter(g => types.some(t => mult(t, [g]) > 1));
      const weak = holes.threats.filter(t => mult(t, types) > 1);
      const fit = resists.length * 2 + hits.length - weak.length * 2;
      if ((holes.threats.length || holes.gaps.length) && fit <= 0) continue;
      const bst = F[fin][3].reduce((a, b) => a + b, 0);
      const score = (Math.max(fit, 0) + bst / 150) * RARITY[tier][0];
      if (!best.has(line) || best.get(line).score < score) best.set(line, { sp, fin, rarity: RARITY[tier][1], resists, hits, score });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

// The game's ability name as the guide's ability key ("Flower Gift" -> FLOWER_GIFT).
export const abilityKey = n => String(n || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
