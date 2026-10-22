// Your PokeRogue unlocks, passed in by the browser extension (extension/static/guide.js reads what the overlay last saw
// in your save). Kept in this browser like the rest of the planner; nothing is sent anywhere.
import { useEffect, useState } from 'react';
import { GAME_IDS } from './data/game-ids';

const KEY = 'prg-save';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

// The raw save is keyed by the game's SpeciesId: [abilityAttr, passive, cost cuts, egg move bits, caught, natureAttr, ivs,
// best shiny tier caught (0 none, 1 standard, 2 rare, 3 epic)].
// This turns it into one entry per starter, in STARTERS order (null for ones the save doesn't have).
function parse(raw) {
  if (!raw?.data || typeof raw.data !== 'object') return null;
  const own = GAME_IDS.map(id => {
    const e = raw.data[id];
    if (!Array.isArray(e) || e.length < 7) return null;
    const [ab, passive, cuts, eggs, caught, natures, ivs, shiny] = e;
    return {
      caught: !!caught, ab: [!!(ab & 1), !!(ab & 2), !!(ab & 4)], passive: !!passive, cuts: Math.max(0, Math.min(2, +cuts || 0)),
      eggs: [1, 2, 4, 8].map(b => !!(eggs & b)), natures: Array.from({ length: 25 }, (_, n) => !!(natures & (1 << (n + 1)))),
      shiny: Math.max(0, Math.min(3, +shiny || 0)),
      ivs: Array.isArray(ivs) && ivs.length === 6 ? ivs.map(v => Math.max(0, Math.min(31, +v || 0))) : null,
    };
  });
  return { at: raw.at || Date.now(), own, count: own.filter(o => o?.caught).length };
}

export function useSave() {
  const [save, setSave] = useState(() => parse(read()));
  useEffect(() => {
    const on = e => {
      if (e.source !== window || !e.data?.__prgSave) return;
      const raw = { at: e.data.at, data: e.data.data };
      const next = parse(raw);
      if (!next) return;
      try { localStorage.setItem(KEY, JSON.stringify(raw)); } catch { /* private mode: still used for this visit */ }
      setSave(s => (s && s.at === next.at ? s : next));
    };
    addEventListener('message', on);
    window.postMessage({ __prgSaveAsk: 1 }, location.origin);  // the extension may have sent before we listened
    return () => removeEventListener('message', on);
  }, []);
  const forget = () => { try { localStorage.removeItem(KEY); } catch { /* nothing kept */ } setSave(null); };
  return [save, forget];
}
