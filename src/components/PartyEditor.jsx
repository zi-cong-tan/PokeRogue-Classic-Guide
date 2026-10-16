import { useEffect, useState } from 'react';
import { STARTERS } from '../data/starters';
import { sprite } from '../art';

// Natures and the stat each one raises / lowers (none for the five neutral ones).
const NATURES = [
  ['Hardy'], ['Lonely', 'Atk', 'Def'], ['Brave', 'Atk', 'Spe'], ['Adamant', 'Atk', 'SpA'], ['Naughty', 'Atk', 'SpD'],
  ['Bold', 'Def', 'Atk'], ['Docile'], ['Relaxed', 'Def', 'Spe'], ['Impish', 'Def', 'SpA'], ['Lax', 'Def', 'SpD'],
  ['Timid', 'Spe', 'Atk'], ['Hasty', 'Spe', 'Def'], ['Serious'], ['Jolly', 'Spe', 'SpA'], ['Naive', 'Spe', 'SpD'],
  ['Modest', 'SpA', 'Atk'], ['Mild', 'SpA', 'Def'], ['Quiet', 'SpA', 'Spe'], ['Bashful'], ['Rash', 'SpA', 'SpD'],
  ['Calm', 'SpD', 'Atk'], ['Gentle', 'SpD', 'Def'], ['Sassy', 'SpD', 'Spe'], ['Careful', 'SpD', 'SpA'], ['Quirky'],
];
const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const ABILITY_SLOT = ['Ability 1', 'Ability 2', 'Hidden ability'];

const shinySprite = id => sprite(id).replace('/pokemon/', '/pokemon/shiny/');

const newBuild = opts => ({
  shiny: false, ability: 0, passive: false, nature: 'Hardy', ivs: [31, 31, 31, 31, 31, 31],
  egg: [false, false, false, false], moves: opts ? opts[2].slice(0, 4) : [],
});

export default function PartyEditor({ party, builds, setBuild }) {
  const [data, setData] = useState(null);
  const [cur, setCur] = useState(0);

  // The options file is big, so it only loads once a starter is picked.
  useEffect(() => { if (party.length && !data) import('../data/builds').then(setData); }, [party.length, data]);

  const at = Math.min(cur, party.length - 1);
  if (!party.length) {
    return (
      <div className="editor editor-empty">
        <h3>Build sheet</h3>
        <p>Pick starters below and set each one up here: shiny, ability, passive, nature, IVs, egg moves and the four moves it starts with. It saves in this browser.</p>
      </div>
    );
  }
  if (!data) return <div className="editor"><p>Loading the move and ability lists...</p></div>;

  const { BUILDS, ABILITIES, MOVES, EVOS } = data;
  const i = party[at];
  const [name, id] = STARTERS[i];
  const opts = BUILDS[i];
  const b = { ...newBuild(opts), ...builds[i] };
  const set = patch => setBuild(i, { ...b, ...patch });

  const [abilities, passive, startMoves, eggMoves] = opts;
  const pool = [...startMoves, ...eggMoves.filter((_, k) => b.egg[k])];
  const ab = abilities[b.ability] || abilities[0];
  const nat = NATURES.find(n => n[0] === b.nature);
  // The ability slot carries over on evolution; an evolution with no second ability falls back to its first.
  const slot = abilities[b.ability] ? b.ability : 0;
  const evoAbility = evoAb => evoAb[slot] || evoAb[0];
  const changes = EVOS[i].filter(([, evoAb]) => evoAbility(evoAb) && evoAbility(evoAb) !== ab);

  const setMove = (slot, m) => {
    const moves = [...b.moves];
    const other = moves.indexOf(m);
    if (other > -1) moves[other] = moves[slot]; // picking a move already in another slot swaps them
    moves[slot] = m;
    set({ moves: moves.filter(Boolean) });
  };
  const toggleEgg = k => {
    const egg = b.egg.map((on, n) => (n === k ? !on : on));
    set({ egg, moves: b.moves.filter(m => startMoves.includes(m) || eggMoves.some((e, n) => e === m && egg[n])) });
  };

  return (
    <div className="editor">
      <div className="editor-tabs" role="tablist" aria-label="Party members">
        {party.map((p, n) => (
          <button key={p} type="button" role="tab" aria-selected={n === at} onClick={() => setCur(n)} aria-label={STARTERS[p][0]}>
            <img src={builds[p]?.shiny ? shinySprite(STARTERS[p][1]) : sprite(STARTERS[p][1])} alt="" width="96" height="96" />
          </button>
        ))}
      </div>

      <div className="editor-body" role="tabpanel">
        <div className="editor-head">
          <img src={b.shiny ? shinySprite(id) : sprite(id)} alt={`${name}${b.shiny ? ', shiny' : ''}`} width="96" height="96" />
          <div>
            <h3>{name}</h3>
            <label className="check"><input type="checkbox" checked={b.shiny} onChange={e => set({ shiny: e.target.checked })} /> Shiny</label>
          </div>
        </div>

        <fieldset>
          <legend>Ability</legend>
          {abilities.map((a, n) => a && (
            <label key={n} className="radio">
              <input type="radio" name={`ab-${i}`} checked={b.ability === n} onChange={() => set({ ability: n })} />
              {ABILITIES[a][0]} <small>{ABILITY_SLOT[n]}</small>
            </label>
          ))}
          {ab && <p className="hint">{ABILITIES[ab][1]}</p>}
          {EVOS[i].length > 0 && (changes.length
            ? <p className="evo-note">Changes when it evolves: {changes.map(([n, evoAb]) => `${ABILITIES[evoAbility(evoAb)][0]} as ${n}`).join(', ')}.</p>
            : <p className="hint">Stays {ABILITIES[ab][0]} when it evolves.</p>)}
        </fieldset>

        <fieldset>
          <legend>Passive</legend>
          {passive ? <>
            <label className="check"><input type="checkbox" checked={b.passive} onChange={e => set({ passive: e.target.checked })} /> {ABILITIES[passive][0]} unlocked</label>
            <p className="hint">{ABILITIES[passive][1]}</p>
          </> : <p className="hint">No passive listed for this starter.</p>}
        </fieldset>

        <fieldset>
          <legend>Nature</legend>
          <select value={b.nature} onChange={e => set({ nature: e.target.value })} aria-label="Nature">
            {NATURES.map(([n, up, down]) => <option key={n} value={n}>{up ? `${n}: +${up}, -${down}` : `${n}: no change`}</option>)}
          </select>
          {nat[1] && <p className="hint">Raises {nat[1]} by 10% and lowers {nat[2]} by 10%.</p>}
        </fieldset>

        <fieldset>
          <legend>IVs, 0 to 31</legend>
          <div className="ivs">
            {STATS.map((s, n) => (
              <label key={s}>{s}
                <input type="number" min="0" max="31" inputMode="numeric" value={b.ivs[n]}
                  onChange={e => set({ ivs: b.ivs.map((v, k) => (k === n ? Math.max(0, Math.min(31, +e.target.value || 0)) : v)) })} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Egg moves you have unlocked</legend>
          {eggMoves.map((m, k) => (
            <label key={m} className="check">
              <input type="checkbox" checked={b.egg[k]} onChange={() => toggleEgg(k)} /> {MOVES[m][0]}{k === 3 && <small>Rare egg move</small>}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Starting moves</legend>
          <div className="move-slots">
            {[0, 1, 2, 3].map(slot => (
              <select key={slot} value={b.moves[slot] || ''} onChange={e => setMove(slot, e.target.value)} aria-label={`Move ${slot + 1}`}>
                <option value="" disabled>Empty</option>
                {pool.map(m => <option key={m} value={m}>{MOVES[m][0]}{eggMoves.includes(m) ? ' (egg move)' : ''}</option>)}
              </select>
            ))}
          </div>
          <p className="hint">Choices are the moves it learns by level 5 plus the egg moves you have unlocked, as on the game's starter screen.</p>
        </fieldset>
      </div>
    </div>
  );
}
