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
import { useRun, setRun, useTeam, waveRule, fits, biomeKey, members, BOSS_TIERS } from '../run';
import { BIOME_BOSSES } from '../data/biome-bosses';
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
  // Rivals: prep the slots that are predictable (the bird and Rayquaza); the big pools are summed up in words.
  for (const r of RIVALS) {
    const small = r.slots.filter(s => s.pool.length <= 9).sort((a, b) => a.pool.length - b.pool.length); // Rayquaza first
    const big = r.slots.filter(s => s.pool.length > 9);
    out.push({ wave: r.wave, title: 'Your rival', rival: true,
      extra: big.length ? `Plus ${big.length} more from big pools: their starter (one of ${big[0].pool.length})${big.length > 1 ? ` and ${big.length - 1} more from bigger pools` : ''}. See the run schedule.` : '',
      slots: small.flatMap(s => s.pool.map(([name, id]) => [[name.replace(' (Mega)', '')], id, '', '', s.note])) });
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

function Body({ popped, onPop }) {
  const run = useRun();
  const team = useTeam();
  const [data, setData] = useState(null);
  const w = run.wave || 1;

  // Moves, forms and every species' types: only needed once you have a team for the boss prep.
  useEffect(() => {
    if (team.party.length && !data) {
      Promise.all([import('../data/learnsets'), import('../data/species-types')]).then(([l, t]) => setData({ ...l, ...t }));
    }
  }, [team.party.length, data]);

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
  if (boss && data && team.party.length) {
    const types = Object.fromEntries(Object.entries(data.SPECIES_TYPES).map(([k, v]) => [norm(k), v]));
    const enemy = boss.slots.map(([names, id, tags, , odds]) => ({ name: names.join(' or '), id, tags, odds, types: (types[norm(names[0])] || 'normal').split(' ') }));
    prep = bossPrep(members(team.party, team.builds, data), enemy);
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
          {!team.party.length ? <p className="hint">Pick your party in the starter planner (and set its moves in the build sheet) to see how it matches up.</p>
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
