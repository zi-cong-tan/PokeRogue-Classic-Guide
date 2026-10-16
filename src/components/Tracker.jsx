import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RUN, FINAL } from '../data/fights';
import { BIOMES, BIOME_NAMES } from '../data/game';
import { VILLAINS } from '../data/villains';
import { LEAGUE, LEAGUE_TRAINERS } from '../data/league';
import { ENCOUNTERS } from '../data/encounters';
import { TYPES, TYPE_COLOR, cap, typeInk, mult } from '../data/types';
import { sprite } from '../art';
import { bossPrep } from '../advice';
import { useRun, setRun, useTeam, waveRule, fits, biomeKey, runMembers, BOSS_TIERS } from '../run';
import { BIOME_BOSSES } from '../data/biome-bosses';
import MonCard from './MonCard';
import { RIVALS } from '../data/rivals';

const FIGHTS = [...RUN.flatMap(g => g.rows), FINAL].map(f => ({ ...f, waves: (f.at.match(/\d+/g) || [f.n]).map(Number) }));
const ODDS = { 2: ', 1 run in 2', 3: ', 1 run in 3' };
const norm = s => s.replace(/’/g, "'");

// The next wave ending in 0 and what it can be (isBoss / isTrainerBoss in the game's game-mode.ts): a set fight,
// a gym leader on a gym wave (every 30 waves from 20, or from 30 in some runs), or a boss from the biome's list.
function nextBossWave(w, run) {
  const wave = Math.ceil(w / 10) * 10;
  const set = { 190: 'the Champion', 200: 'Eternatus' }[wave];
  if (set) return { wave, text: set };
  const b = BIOME_BOSSES[run.biome];
  const gymWave = wave % 30 === 20 || wave % 30 === 0;
  const gyms = b?.gyms.map(g => g[0]).join(' or ');
  const pool = run.biome ? `a boss from ${run.biome}'s list` : "a boss from your biome's list";
  return { wave, text: gymWave && gyms ? `gym leader ${gyms} (if your gyms fall on this wave), or ${pool}` : gymWave ? `a gym leader, or ${pool}` : pool, biomeBoss: true };
}

// Bosses whose teams are known for this run, in wave order.
function knownBosses(run) {
  const out = [];
  // Rivals roll every slot fresh each fight, so the prep groups each slot by type: exact for the starter from fight 4,
  // which Terastallizes to its first type; birds by their full typing; the big pools by their main type.
  for (const r of RIVALS) {
    const slots = r.slots.map((s, k) => {
      const label = s.pool.length === 1 ? s.pool[0][0] : k === 0 ? 'Their starter' : k === 1 ? 'Their bird' : `Slot ${k + 1}`;
      const groups = new Map();
      for (const entry of s.pool) {
        // the starter fights as its first type from fight 4 (Tera); birds by full typing; big pools by main type
        const types = entry[2];
        const key = s.pool.length === 1 || k === 1 ? types : types.split(' ')[0];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
      }
      return { index: k, label, note: s.note, size: s.pool.length, tera: s.tera,
        groups: [...groups].sort((a, b) => b[1].length - a[1].length).map(([types, list]) => ({ types: types.split(' '), list })) };
    }).sort((a, b) => (a.size === 1 ? -1 : 0) - (b.size === 1 ? -1 : 0)); // Rayquaza first
    out.push({ wave: r.wave, title: 'Your rival', rival: true, rivalSlots: slots, slots: [] });
  }
  const v = VILLAINS[run.villain];
  if (v) {
    out.push({ wave: 115, title: `${v.boss}, ${v.name}`, slots: v.first });
    out.push({ wave: 165, title: `${v.boss}, ${v.name} (stronger)`, slots: v.rematch });
  }
  const r = LEAGUE[run.region];
  if (r) {
    [...r.e4, r.champion].forEach((keys, i) => {
      const t = LEAGUE_TRAINERS[keys[0]];
      const other = keys[1] ? ` (or ${LEAGUE_TRAINERS[keys[1]].name})` : '';
      out.push({ wave: 182 + i * 2, title: `${t.name}${other}, ${i < 4 ? 'Elite Four' : 'Champion'}`, slots: t.slots });
    });
  }
  out.push({ wave: 200, title: 'Eternatus', slots: [[['Eternatus'], 890, 'B', '']] });
  return out.sort((a, b) => a.wave - b.wave);
}

// "Gym leader, wave 120 (in 7)": only the waves still ahead, and how far the nearest is.
function nextText(f, w) {
  const ahead = f.waves.filter(x => x >= w);
  const at = f.waves.length > 1 && f.at.includes(' to ') && ahead.length < f.waves.length ? `${ahead[0]} to ${f.waves.at(-1)}` : f.at.includes(' to ') ? f.at : ahead.join(' or ');
  return `${f.title}, wave ${at}${ahead[0] > w ? ` (in ${ahead[0] - w})` : ' (now)'}`;
}

const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;

// Wave 200 is always Eternatus, and it changes to Eternamax Eternatus partway through (same types, much bulkier).
// A slot's note without what its heading already says ("Their starter", "Always a bird").
const tidy = note => { const s = (note || '').replace(/^Their starter(, |; )?/, '').replace(/^Always a bird(; )?/, ''); return s && s[0].toUpperCase() + s.slice(1); };

// Rival prep: one row per slot, each type group a cell with your best answer, so gaps stand out at a glance.
// Rival prep: one row per slot, each type group a cell with your best answer, so gaps stand out at a glance.
// Seen their team? Mark each Pokémon from its card: that slot then shows only it, saved per fight in your run.
function RivalPrep({ slots, team, wave, run }) {
  const [open, setOpen] = useState(null);   // the Pokémon clicked, shown up close under its row
  const [wide, setWide] = useState({});      // groups expanded to show every option
  const [all, setAll] = useState({});        // marked slots opened back up to every option
  const picks = run.rivalPicks?.[wave] || {};
  const mark = (slot, name) => {
    const next = { ...picks };
    if (next[slot] === name) delete next[slot]; else next[slot] = name;
    setRun({ rivalPicks: { ...(run.rivalPicks || {}), [wave]: next } });
  };
  const marked = Object.keys(picks).length;
  const cell = (key, types, list, slot) => {
    const [p] = bossPrep(team, [{ name: list[0][0], types }]);
    const shown = wide[key] ? list : list.slice(0, 3);
    return (
      <li key={key} className={p.best.mult < 2 ? 'gap' : undefined}>
        <span className="chips">{types.map(t => <Chip key={t} t={t} />)}</span>
        <span className="rival-sprites">
          {shown.map(m => (
            <button key={m[0]} type="button" className="mon-btn" aria-pressed={open?.mon[0] === m[0]} onClick={() => setOpen(open?.mon[0] === m[0] ? null : { mon: m, slot })} title={m[0]}>
              <img src={sprite(m[1])} alt={m[0]} width="96" height="96" loading="lazy" />
            </button>
          ))}
          {list.length > 3 && <button type="button" className="more-btn" onClick={() => setWide(w => ({ ...w, [key]: !w[key] }))}>{wide[key] ? 'less' : `+${list.length - 3}`}</button>}
        </span>
        <span className="rival-answer">{p.best.mult >= 2 ? `${p.best.mult}× ${cap(p.best.type)}, ${p.best.who}` : 'No good answer'}</span>
        {p.threatened.length > 0 && <span className="threat">Hits {p.threatened.join(', ')}</span>}
      </li>
    );
  };
  return (
    <div className="rival-prep">
      <p className="hint">{marked ? `Marked ${marked} of ${slots.length} slots for this fight.` : 'Seen their team? Tap each Pokémon you see and mark it: that slot then shows only that one.'}</p>
      {slots.map(slot => {
        const pickName = picks[slot.index];
        const pick = pickName && slot.groups.flatMap(g => g.list).find(m => m[0] === pickName);
        const single = pick && !all[slot.index];
        return (
          <div key={slot.label} className={single ? 'rival-row marked' : 'rival-row'}>
            <p className="rival-row-head">
              <strong>{slot.label}</strong>
              {single ? <span> marked: {pick[0]} <button type="button" className="more-btn" onClick={() => setAll(a => ({ ...a, [slot.index]: true }))}>change</button></span>
                : slot.size > 1 && <span> one of {slot.size}{pick && <> <button type="button" className="more-btn" onClick={() => setAll(a => ({ ...a, [slot.index]: false }))}>show marked only</button></>}</span>}
              {tidy(slot.note) && <small>{tidy(slot.note)}</small>}
            </p>
            <ul>
              {single
                ? cell(slot.label + pick[0], slot.tera ? pick[2].split(' ').slice(0, 1) : pick[2].split(' '), [pick], slot.index)
                : slot.groups.map(g => cell(slot.label + g.types.join(), g.types, g.list, slot.index))}
            </ul>
            {open && open.slot === slot.index && (
              <MonCard mon={open.mon} team={team} tera={slot.tera} onClose={() => setOpen(null)}
                marked={picks[slot.index] === open.mon[0]} onMark={() => { mark(slot.index, open.mon[0]); setAll(a => ({ ...a, [slot.index]: false })); setOpen(null); }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Pokémon caught during the run: they join boss prep and the Mega / Gigantamax filter. Names come from the game data.
function Caught({ caught, names }) {
  const [name, setName] = useState('');
  const known = names ? new Set(names) : null;
  const add = e => {
    e.preventDefault();
    const n = name.trim();
    if (!n || caught.includes(n) || (known && !known.has(n))) return;
    setRun({ caught: [...caught, n].slice(-12) });
    setName('');
  };
  return (
    <form className="track-caught" onSubmit={add}>
      <label htmlFor="caught-name">Caught this run</label>
      <div>
        <input id="caught-name" list="caught-names" value={name} onChange={e => setName(e.target.value)} placeholder={names ? 'Type a Pokémon, like Lapras' : 'Loading names...'} autoComplete="off" />
        <datalist id="caught-names">{names?.map(n => <option key={n} value={n} />)}</datalist>
        <button type="submit" className="mini-btn">Add</button>
      </div>
      {name && known && !known.has(name.trim()) && <p className="hint">Pick a name from the list.</p>}
      {caught.length > 0 && (
        <ul className="caught-list">
          {caught.map(n => <li key={n}>{n} <button type="button" aria-label={`Remove ${n}`} onClick={() => setRun({ caught: caught.filter(x => x !== n) })}>×</button></li>)}
        </ul>
      )}
    </form>
  );
}

function Final({ team, caught, data }) {
  if (!team.party.length && !caught.length) return null;
  const ms = data ? runMembers(team, caught, data) : null;
  const [p] = ms ? bossPrep(ms, [{ name: 'Eternatus', types: ['poison', 'dragon'] }]) : [null];
  return (
    <div className="track-final">
      <div className="final-mons">
        <figure><img src={sprite(890)} alt="Eternatus" width="96" height="96" loading="lazy" /><figcaption>Phase 1</figcaption></figure>
        <figure><img src={sprite(10190)} alt="Eternamax Eternatus" width="96" height="96" loading="lazy" /><figcaption>Phase 2, Eternamax</figcaption></figure>
      </div>
      <h3>Always last: Eternatus, wave 200</h3>
      <p className="hint">Two phases, both Poison and Dragon: Eternatus (140 HP, 145 Sp. Atk, 130 Speed), then Eternamax (255 HP, 250 Defense and Sp. Def). Weak to Ground, Psychic, Ice and Dragon.</p>
      {!p ? <p className="hint">Loading...</p> : (
        <p>{p.best.mult >= 2 ? `Your best: ${p.best.mult}× with ${cap(p.best.type)} (${p.best.who}).` : 'No super-effective hit on your team yet: teach a Ground, Psychic, Ice or Dragon move.'}
          {p.threatened.length ? ` Its types hit ${p.threatened.join(', ')} hard.` : ''}</p>
      )}
    </div>
  );
}

function Body({ popped, onPop }) {
  const run = useRun();
  const team = useTeam();
  // Species types are small and always load (for the caught list); the move lists only load once you have starters.
  const [speciesTypes, setSpeciesTypes] = useState(null);
  const [moves, setMoves] = useState(null);
  useEffect(() => { import('../data/species-types').then(m => setSpeciesTypes(m.SPECIES_TYPES)); }, []);
  useEffect(() => { if (team.party.length && !moves) import('../data/learnsets').then(setMoves); }, [team.party.length, moves]);
  const data = speciesTypes && (moves || !team.party.length) ? { ...(moves || {}), SPECIES_TYPES: speciesTypes } : null;
  const w = run.wave || 1;

  const next = FIGHTS.find(f => Math.max(...f.waves) >= w);
  const blocked = waveRule(run.wave);
  const canMeet = blocked ? [] : ENCOUNTERS.filter(e => fits(e, biomeKey(run.biome), run.wave));
  const bossWave = nextBossWave(w, run);
  const named = knownBosses(run).find(b => b.wave >= w);
  // Prep for the biome's possible bosses when that boss wave comes before the next named boss.
  const pool = BIOME_BOSSES[run.biome];
  const boss = bossWave.biomeBoss && pool && (!named || bossWave.wave < named.wave)
    ? { wave: bossWave.wave, title: `${run.biome} boss, wave ${bossWave.wave}`, biome: true,
        slots: BOSS_TIERS.flatMap(([k, label, n]) => pool.tiers[k].map(([name, id, tod]) => [[name], id, '', '', `${label}, ${n} in 64${tod ? `, ${tod} only` : ''}`])) }
    : named;
  const nextBiomeWave = Math.floor(w / 10) * 10 + 10;

  let prep = null;
  const ms = data && (team.party.length || run.caught?.length) ? runMembers(team, run.caught, data) : null;
  if (boss && !boss.rival && ms) {
    const types = Object.fromEntries(Object.entries(data.SPECIES_TYPES).map(([k, v]) => [norm(k), v]));
    const enemy = boss.slots.map(([names, id, tags, , odds, typesOverride]) => ({ name: names.join(' or '), id, tags, odds, types: (typesOverride || types[norm(names[0])] || 'normal').split(' ') }));
    prep = bossPrep(ms, enemy);
  }
  const uncovered = prep ? prep.filter(p => p.best.mult < 2).length : 0;

  return (
    <div className={popped ? 'tracker tracker-pop' : 'tracker'}>
      <form className="track-form" onSubmit={e => e.preventDefault()}>
        <label>Wave
          <input type="number" min="1" max="200" inputMode="numeric" value={run.wave || ''} placeholder="1"
            onChange={e => setRun({ wave: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
        </label>
        <label>Biome
          <select value={run.biome} onChange={e => setRun({ biome: e.target.value })}>
            <option value="">Not set</option>
            {BIOME_NAMES.map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label>Villain team
          <select value={run.villain} onChange={e => setRun({ villain: Number(e.target.value) })}>
            <option value={-1}>Not met yet</option>
            {VILLAINS.map((v, i) => <option key={v.key} value={i}>{v.name}</option>)}
          </select>
        </label>
        <label>League
          <select value={run.region} onChange={e => setRun({ region: Number(e.target.value) })}>
            <option value={-1}>Not met yet</option>
            {LEAGUE.map((r, i) => <option key={r.region} value={i}>{r.region}</option>)}
          </select>
        </label>
      </form>
      <Caught caught={run.caught || []} names={data ? Object.keys(data.SPECIES_TYPES) : null} />

      <div className="paper zig track-log" aria-live="polite">
        <ol>
          <li><span>Next fixed fight</span><b aria-hidden="true" />
            <span>{next ? nextText(next, w) : 'Run complete'}</span></li>
          <li><span>Mystery encounters here</span><b aria-hidden="true" />
            <span>{blocked ? 'None on this wave' : `${canMeet.length} can show up`}</span></li>
          <li><span>Biome changes after wave</span><b aria-hidden="true" /><span>{nextBiomeWave}</span></li>
          <li><span>Next boss wave</span><b aria-hidden="true" /><span>Wave {bossWave.wave}: {bossWave.text}</span></li>
          {run.biome && BIOMES[run.biome] && (
            <li><span>From {run.biome} you can go to</span><b aria-hidden="true" />
              <span>{BIOMES[run.biome].map(([d, n]) => d + (ODDS[n] || '')).join('; ')}</span></li>
          )}
          {named && <li><span>Next named boss</span><b aria-hidden="true" /><span>{named.title}, wave {named.wave}</span></li>}
        </ol>
        {!popped && canMeet.length > 0 && <p className="track-link"><a href="#encounters">See which encounters</a></p>}
      </div>

      {boss && (
        <div className="track-prep">
          <h3>Boss prep: {boss.title}</h3>
          {boss.rival && ms ? <><p className="hint">Each slot is rolled fresh every fight. Its options are grouped by type, with your best answer to each.</p><RivalPrep slots={boss.rivalSlots} team={ms} wave={boss.wave} run={run} /></>
            : !team.party.length && !run.caught?.length ? <p className="hint">Pick your starters in the planner, or add what you caught below, to see how your team matches up.</p>
            : !prep ? <p className="hint">Loading the matchup...</p> : <>
              <p className="hint">{boss.extra ? `${boss.extra} ` : ''}{boss.biome ? `One of these will show up (or the gym leader on a gym wave). ` : ''}{uncovered ? `${uncovered} of ${prep.length} have no super-effective hit from your team. Teach a move of the type below them, or swap someone in.` : 'Your team can hit every one of them for at least double.'}</p>
              <ul className="prep">
                {prep.map(p => (
                  <li key={p.name} className={p.best.mult < 2 ? 'gap' : undefined}>
                    <img src={sprite(p.id)} alt="" width="96" height="96" loading="lazy" />
                    <div>
                      <strong>{p.name}</strong>
                      {p.odds && <span className="odds-note">{p.odds}</span>}
                      <span className="chips">{p.types.map(t => <Chip key={t} t={t} />)}</span>
                      <span>{p.best.mult >= 2 ? `Your best: ${p.best.mult}× with ${cap(p.best.type)} (${p.best.who})` : `No hit above ${p.best.mult}×. Weak to ${TYPES.filter(t => mult(t, p.types) > 1).map(cap).join(', ')}`}</span>
                      {p.threatened.length > 0 && <span className="threat">Its own types hit {p.threatened.join(', ')} hard</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>}
        </div>
      )}

      <Final team={team} caught={run.caught || []} data={data} />

      {!popped && onPop && <button type="button" className="mini-btn" onClick={onPop}>Pop out over the game</button>}
    </div>
  );
}

// Chrome and Edge can keep a small window on top of every other window (Document Picture-in-Picture):
// the tracker renders into it, so it floats over the game. Other browsers get an ordinary small window.
export default function Tracker() {
  const [pip, setPip] = useState(null);

  const pop = async () => {
    if ('documentPictureInPicture' in window) {
      const w = await window.documentPictureInPicture.requestWindow({ width: 440, height: 720 });
      for (const sheet of document.styleSheets) {
        try {
          const style = w.document.createElement('style');
          style.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n');
          w.document.head.append(style);
        } catch {
          if (sheet.href) w.document.head.append(Object.assign(w.document.createElement('link'), { rel: 'stylesheet', href: sheet.href }));
        }
      }
      w.document.body.className = 'pip-body';
      w.addEventListener('pagehide', () => setPip(null));
      setPip(w);
    } else {
      window.open(`${location.pathname}?tracker`, 'prg-tracker', 'popup,width=440,height=760');
    }
  };

  return (
    <section className="track" id="tracker" aria-labelledby="track-title">
      <div className="track-head">
        <h2 id="track-title">Your run, right now</h2>
        <p>Set your wave and biome as you play. The page follows along: what fight is next, which encounters can appear, where you can go, and how your team matches the next boss.</p>
      </div>
      {pip ? <p className="hint">The tracker is in its own window, on top of the game. Close that window to bring it back here.</p> : <Body onPop={pop} />}
      {pip && createPortal(<Body popped />, pip.document.body)}
    </section>
  );
}

// The page opened as ?tracker (the fallback window): only the tracker.
export function TrackerOnly() {
  return <main className="pip-body"><Body popped /></main>;
}
