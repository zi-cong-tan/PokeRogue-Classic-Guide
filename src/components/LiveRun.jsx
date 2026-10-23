import { useEffect, useState } from 'react';
import { BIOMES } from '../data/game';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import { sprite, biomeArt } from '../art';
import { NATURES, suggestNature, suggestMoves, evolveAdvice, teamReport } from '../advice';
import { useLive, formKey, finalForm, catchHere } from '../live';
import { useReveal } from '../motion';

const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;
const STAT_WORD = { Atk: 'Attack', Def: 'Defense', SpA: 'Sp. Atk', SpD: 'Sp. Def', Spe: 'Speed' };
const lower = list => (list || []).map(t => String(t).toLowerCase());

// "3 s ago" / "4 min ago" / "from Oct 22"
function ago(at, now) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `on ${new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

// Moves a Pokémon mid-run can count on: the ones it has, and level-up moves of its own form still ahead (or on
// evolving). Passed ones (a level gone by, or a form it evolved from) need a Memory Mushroom; TMs show up at random.
const missed = (s, level) => s.kind === 'level' && (s.label.startsWith('As ') || (s.lvl > 0 && s.lvl <= level) || s.lvl === -1);
const ahead = (s, level) => s.kind === 'level' && !s.label.startsWith('As ') && (s.lvl > level || s.lvl === 0);
const when = (s, has) => (has ? 'Has it' : s.lvl === 0 ? 'On evolving' : `Level ${s.lvl}`);

// One party member: what it has now, and the moveset to aim for.
function Member({ m, x, L }) {
  const key = formKey(x || {}, L.FORMS);
  const types = lower(m.types);
  const hp = m.maxHP ? Math.max(0, m.currentHP / m.maxHP) : 1;
  if (!key) {
    return (
      <li className="live-mon paper zig">
        <div className="live-id"><div><h3>{m.nickname || m.name}</h3><p>Lv {m.level}</p></div></div>
        <p className="live-note">Not in the guide's data, so there's no build for it.</p>
      </li>
    );
  }
  const F = L.FORMS, line = L.LINES.find(l => l.includes(key));
  const nameIdx = Object.fromEntries(L.MOVE_LIST.map((r, i) => [r[0], i]));
  const known = (m.moveset || []).map(n => nameIdx[n]).filter(i => i !== undefined);
  const knownKeys = known.map(i => L.MOVE_KEYS[i]);
  // the plan: from what it has and will still learn; then the best set with anything, for TMs and Memory Mushrooms
  const best = suggestMoves(line, key, knownKeys, L, (mi, s) => known.includes(mi) || ahead(s, m.level)).slice(0, 4);
  const ideal = suggestMoves(line, key, knownKeys, L).slice(0, 4).filter(b => !best.some(x => x.m === b.m) && !known.includes(b.m));
  // only TMs that pull their weight: 60+ power, or a status move with a job (setup, healing...)
  const tms = ideal.filter(b => b.kind === 'tm' && (L.MOVE_LIST[b.m][3] >= 60 || L.MOVE_LIST[b.m][2] === 'X')).map(b => L.MOVE_LIST[b.m][0]);
  const mush = ideal.filter(b => missed(b, m.level)).map(b => L.MOVE_LIST[b.m][0]);
  const drop = known.filter(i => !best.some(b => b.m === i)).map(i => L.MOVE_LIST[i][0]);
  const evo = evolveAdvice(key, L);
  const want = suggestNature(F[finalForm(key, F)][3]);
  const natUp = NATURES.find(n => n[0] === want.nature)?.[1];
  const fits = m.nature === want.nature;
  return (
    <li className="live-mon paper zig">
      <div className="live-id">
        <img src={sprite(F[key][1])} alt="" width="96" height="96" loading="lazy" />
        <div>
          <h3>{m.nickname || m.name}{m.isFusion && x.fusion ? <small> fused with {x.fusion}</small> : null}</h3>
          <p>Lv {m.level}{m.nature ? ` · ${m.nature}` : ''}{m.currentHP <= 0 ? ' · Fainted' : m.status ? ` · ${m.status}` : ''}</p>
          <div className="live-hp" role="img" aria-label={`${m.currentHP} of ${m.maxHP} HP`}><span style={{ width: `${Math.round(hp * 100)}%` }} /></div>
        </div>
      </div>
      <p className="chips">{types.map(t => <Chip key={t} t={t} />)}</p>
      <dl className="live-facts">
        <div><dt>Ability</dt><dd>{m.ability}{m.passiveAbility && m.isPassiveEnabled ? `, passive ${m.passiveAbility}` : ''}</dd></div>
        {x?.items?.length > 0 && <div><dt>Holding</dt><dd>{x.items.join(', ')}</dd></div>}
      </dl>
      <h4>Best moveset</h4>
      <ol className="live-moves">
        {best.map(b => {
          const [name, type] = L.MOVE_LIST[b.m];
          const has = known.includes(b.m);
          return (
            <li key={b.m} className={has ? 'has' : undefined} title={b.why || undefined}>
              <span className="live-move"><i style={{ '--t': TYPE_COLOR[type] }} aria-hidden="true" />{name}</span>
              <b aria-hidden="true" />
              <span>{when(b, has)}</span>
            </li>
          );
        })}
      </ol>
      {drop.length > 0 && <p className="live-note">Drop when the new ones come: {drop.join(', ')}</p>}
      {tms.length > 0 && <p className="live-note">TMs worth grabbing: <strong>{tms.join(', ')}</strong></p>}
      {mush.length > 0 && <p className="live-note">With a Memory Mushroom: <strong>{mush.join(', ')}</strong></p>}
      {evo.map(e => <p key={e.to} className="live-note">Evolves into <strong>{e.name}</strong> ({e.how}).</p>)}
      {m.nature && !fits && (
        <p className="live-note">{want.nature} would suit it better{natUp ? ` (+${STAT_WORD[natUp]})` : ''}. A Training Session can change it.</p>
      )}
    </li>
  );
}

// A biome you can go to next: its art, how you get there, and the wild Pokémon there that fill your team's holes.
function Biome({ name, odds, here, map, holes, partyLines, L, B }) {
  const picks = catchHere(B[name]?.wild, holes, partyLines, L);
  const how = here ? 'You are here' : map ? 'Your Map lets you pick it' : odds ? `Opens 1 run in ${odds}` : 'The game picks one at random';
  return (
    <li className={here ? 'live-biome here' : 'live-biome'}>
      <div className="live-biome-art" style={{ backgroundImage: `url(${biomeArt(name)})` }}>
        <h3>{name}</h3>
        <span>{how}</span>
      </div>
      {picks.length ? (
        <ol>
          {picks.map(p => (
            <li key={p.sp}>
              <img src={sprite(L.FORMS[p.sp][1])} alt="" width="64" height="64" loading="lazy" />
              <div>
                <strong>{L.FORMS[p.sp][0]}</strong>{p.fin !== p.sp && <small>Grows into {L.FORMS[p.fin][0]}</small>}
                <p>{[p.rarity, p.resists.length ? `resists ${p.resists.map(cap).join(', ')}` : '', p.hits.length ? `hits ${p.hits.map(cap).join(', ')} hard` : ''].filter(Boolean).join(' · ')}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="live-none">{name === 'End' ? 'No catching here.' : 'Nothing here fills a hole.'}</p>}
    </li>
  );
}

export default function LiveRun() {
  const run = useLive();
  const root = useReveal();
  const [L, setL] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (run && !L) Promise.all([import('../data/learnsets'), import('../data/biome-bosses')]).then(([l, b]) => setL({ ...l, BIOME_BOSSES: b.BIOME_BOSSES }));
  }, [run, L]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  const info = run?.info;
  const party = info?.party || [];
  let body = null;
  if (!run) {
    body = (
      <p className="live-empty">
        Play with the <a href="https://github.com/zi-cong-tan/PokeRogue-Classic-Guide/releases/latest">Field Guide browser extension</a> on
        and your party shows up here by itself: each Pokémon's best moveset, what your team is weak to, and where to go next to fix it.
      </p>
    );
  } else if (!L) {
    body = <p className="live-empty">Reading your party...</p>;
  } else {
    const keys = party.map((m, i) => formKey(run.party[i] || {}, L.FORMS));
    const partyLines = new Set(keys.filter(Boolean).map(k => L.LINES.findIndex(l => l.includes(k))));
    const nameIdx = Object.fromEntries(L.MOVE_LIST.map((r, i) => [r[0], i]));
    const members = party.map(m => ({
      name: m.nickname || m.name, types: lower(m.types),
      moves: (m.moveset || []).map(n => L.MOVE_LIST[nameIdx[n]]).filter(r => r && r[3] > 0).map(r => r[1]),
    }));
    const holes = teamReport(members);
    const next = [[info.biome, 0, true], ...(BIOMES[info.biome] || []).map(([d, n]) => [d, n, false])];
    body = (
      <>
        <ul className="live-party">
          {party.map((m, i) => <Member key={i} m={m} x={run.party[i]} L={L} />)}
        </ul>

        <div className="live-holes" data-reveal>
          <div>
            <h3>Hits your team hard</h3>
            {holes.threats.length ? <p className="chips">{holes.threats.map(t => <Chip key={t} t={t} />)}</p> : <p>Nothing hits most of your team for double.</p>}
          </div>
          <div>
            <h3>Your moves can't hit hard</h3>
            {holes.gaps.length ? <p className="chips">{holes.gaps.map(t => <Chip key={t} t={t} />)}</p> : <p>Every type takes double from something you have.</p>}
          </div>
          {holes.swap && <p className="live-swap">{holes.swap.name} is weakest to these. A {holes.swap.types.map(cap).join(', ')} type in its place would help most.</p>}
        </div>

        <div className="live-where" data-reveal>
          <h3>Where to go next</h3>
          <p>{run.map
            ? 'You hold a Map, so you pick the next biome. Each one lists the wild Pokémon there that cover your team\'s holes.'
            : 'No Map, so the game picks the next biome for you. A Map from a reward screen lets you choose.'}</p>
          <ul>
            {next.map(([name, n, here]) => <Biome key={name} name={name} odds={n} here={here} map={run.map} holes={holes} partyLines={partyLines} L={L} B={L.BIOME_BOSSES} />)}
          </ul>
        </div>
      </>
    );
  }

  return (
    <section className="live" id="live" aria-labelledby="live-title" ref={root}>
      <div className="live-head">
        <h2 id="live-title">Your party, live</h2>
        <p>Straight from your game through the browser extension: who you have, the moves to aim for, what your team can't handle, and where to go next.</p>
      </div>
      {info && (
        <p className="live-status" aria-live="polite">
          <span>Wave {info.wave}</span><span>{info.biome}</span><span>{info.gameMode}</span>
          <span>{run.map ? 'Map in hand' : 'No Map'}</span><span>Updated {ago(run.at, now)}</span>
        </p>
      )}
      {body}
    </section>
  );
}
