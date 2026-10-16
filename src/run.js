// Where you are in your run, shared by the tracker and the sections that follow it (encounters, biomes, villains,
// league). Kept in this browser; every change is broadcast so all of them update together.
import { useEffect, useState } from 'react';
import { ME_RULES } from './data/encounters';
import { STARTERS } from './data/starters';

const KEY = 'prg-run-1';
const EMPTY = { wave: 0, biome: '', villain: -1, region: -1 };
const read = () => { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return EMPTY; } };

export function setRun(patch) {
  const next = { ...read(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: still shared for this visit below */ }
  window.dispatchEvent(new CustomEvent('prg-run', { detail: next }));
}

export function useRun() {
  const [run, set] = useState(read);
  useEffect(() => {
    const on = e => set(e.detail);
    const other = e => { if (e.key === KEY) set(read()); };  // another window (the pop-out) changed it
    window.addEventListener('prg-run', on);
    window.addEventListener('storage', other);
    return () => { window.removeEventListener('prg-run', on); window.removeEventListener('storage', other); };
  }, []);
  return run;
}

// The planner's party and builds, for the tracker's boss prep; the planner announces each change.
const team = () => {
  try { return { party: JSON.parse(localStorage.getItem('prg-party-2')) || [], builds: JSON.parse(localStorage.getItem('prg-builds-2')) || {} }; }
  catch { return { party: [], builds: {} }; }
};

export function useTeam() {
  const [t, set] = useState(team);
  useEffect(() => {
    const on = e => set(e.detail);
    const other = e => { if (e.key?.startsWith('prg-party') || e.key?.startsWith('prg-builds')) set(team()); };
    window.addEventListener('prg-team', on);
    window.addEventListener('storage', other);
    return () => { window.removeEventListener('prg-team', on); window.removeEventListener('storage', other); };
  }, []);
  return t;
}

// Why a wave can't have an encounter, from isMysteryEncounterValidForWave in the game's battle-scene.ts.
export function waveRule(w) {
  const [lo, hi] = ME_RULES.waves;
  if (!w) return null;
  if (w < lo || w > hi) return `Encounters only happen between waves ${lo} and ${hi}.`;
  if (w % 10 === 0) return 'Wave ' + w + ' is a boss wave, so no encounter.';
  if (w % 10 === 1) return 'Wave ' + w + ' is the first wave of a biome, so no encounter.';
  return null;
}

export const fits = (e, biome, wave) =>
  (!biome || e.biomes.includes('ANY') || e.biomes.includes(biome)) && (!wave || (wave >= e.waves[0] && wave <= e.waves[1]));


// Each member as it is now: the form picked in the build sheet and the types of its damaging moves.
export function members(party, builds, data) {
  return party.map(i => {
    const b = builds[i] || {};
    if (!data) return { name: STARTERS[i][0], types: STARTERS[i][3].split(' '), moves: [] };
    const { FORMS, LINES, MOVE_LIST, MOVE_KEYS } = data;
    const form = LINES[i].includes(b.form) ? b.form : LINES[i][0];
    const moves = (b.runMoves?.length ? b.runMoves : b.moves || [])
      .map(k => MOVE_LIST[MOVE_KEYS.indexOf(k)]).filter(m => m && m[3] > 0).map(m => m[1]);
    return { name: FORMS[form][0], types: FORMS[form][2].split(' '), moves };
  });
}


export const biomeKey = name => (name ? name.toUpperCase().replace(/ /g, '_') : '');
