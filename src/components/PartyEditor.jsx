import { useState } from 'react';
import { STARTERS } from '../data/starters';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import { NATURES, STATS, suggestNature, suggestMoves, evolveAdvice, learnable } from '../advice';
import { sprite } from '../art';

const ABILITY_SLOT = ['Ability 1', 'Ability 2', 'Hidden ability'];

const shinySprite = id => sprite(id).replace('/pokemon/', '/pokemon/shiny/');
const SOURCE_GROUP = { level: 'Level-up', egg: 'Egg moves', tm: 'TMs' };
const moveText = ([n, t, cat, power, acc]) =>
  `${n}: ${cap(t)}${cat === 'X' ? ', status' : `, ${power || 'varies'}`}${acc > 0 && acc < 100 ? `, ${acc}%` : ''}`;
// The last form of a line reachable from `form` (first branch), for advice that should look ahead.
const finalForm = (form, F) => (F[form][6].length ? finalForm(F[form][6][0][0], F) : form);

const newBuild = opts => ({
  shiny: false, ability: 0, passive: false, nature: 'Hardy', ivs: [31, 31, 31, 31, 31, 31],
  egg: [false, false, false, false], moves: opts ? opts[2].slice(0, 4) : [],
});

export default function PartyEditor({ party, builds, setBuild, data }) {
  const [cur, setCur] = useState(0);

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

  const { BUILDS, ABILITIES, MOVES, EVOS, FORMS, LINES, MOVE_LIST, MOVE_KEYS } = data;
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

  // During the run: the form it is now, what it can learn there, and suggestions for that form.
  const line = LINES[i];
  const form = line.includes(b.form) ? b.form : line[0];
  const unlockedEggs = eggMoves.filter((_, k) => b.egg[k]);
  const ahead = finalForm(form, FORMS);
  const nature = suggestNature(FORMS[ahead][3]);
  const learn = learnable(line, form, unlockedEggs, data);
  const suggested = suggestMoves(line, form, unlockedEggs, data);
  const evolving = evolveAdvice(form, data);
  const runMoves = (b.runMoves || []).filter(k => learn.has(MOVE_KEYS.indexOf(k)));
  const grouped = Object.keys(SOURCE_GROUP).map(kind => [kind, [...learn].filter(([, v]) => v.kind === kind)
    .sort((x, y) => MOVE_LIST[x[0]][0].localeCompare(MOVE_LIST[y[0]][0]))]);
  const setRunMove = (slot, k) => {
    const moves = [...runMoves];
    const other = moves.indexOf(k);
    if (other > -1) moves[other] = moves[slot];
    moves[slot] = k;
    set({ runMoves: moves.filter(Boolean) });
  };

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
          <div className="suggest">
            <p><strong>Suggested: {nature.nature}</strong>{ahead !== line[0] && <small> for {FORMS[ahead][0]}</small>}</p>
            <p className="hint">{nature.why}</p>
            {b.nature !== nature.nature && <button type="button" className="mini-btn" onClick={() => set({ nature: nature.nature })}>Use {nature.nature}</button>}
          </div>
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

        <h4 className="editor-part">During the run</h4>
        {line.length > 1 && (
          <fieldset>
            <legend>It is now</legend>
            <select value={form} onChange={e => set({ form: e.target.value })} aria-label="Current form">
              {line.map(f => <option key={f} value={f}>{FORMS[f][0]}</option>)}
            </select>
            <span className="chips">{FORMS[form][2].split(' ').map(t => <span key={t} className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>)}</span>
          </fieldset>
        )}

        <fieldset>
          <legend>When to evolve</legend>
          {evolving.length ? evolving.map(e => (
            <div key={e.to} className="evo-row">
              <p>Evolves into <strong>{e.name}</strong> {e.how.startsWith('level') ? 'at' : 'with'} {e.how}.</p>
              {e.keep.length > 0 && (
                <p className="hint">
                  Learn {e.keep.map(k => `${MOVE_LIST[k.m][0]} (level ${k.lvl})`).join(', ')} first: {e.name} can't learn {e.keep.length > 1 ? 'them' : 'it'} later.
                  {e.keep.some(k => k.late) && ' Use Pause Evolution in the party menu to wait.'}
                </p>
              )}
            </div>
          )) : <p className="hint">{FORMS[form][0]} does not evolve any further.</p>}
        </fieldset>

        <fieldset>
          <legend>Moves now</legend>
          <div className="move-slots">
            {[0, 1, 2, 3].map(slot => (
              <select key={slot} value={runMoves[slot] || ''} onChange={e => setRunMove(slot, e.target.value)} aria-label={`Move ${slot + 1} now`}>
                <option value="">Empty</option>
                {grouped.map(([kind, list]) => list.length > 0 && (
                  <optgroup key={kind} label={SOURCE_GROUP[kind]}>
                    {list.map(([m, v]) => <option key={m} value={MOVE_KEYS[m]}>{moveText(MOVE_LIST[m])} ({v.label})</option>)}
                  </optgroup>
                ))}
              </select>
            ))}
          </div>
          <div className="suggest">
            <p><strong>Suggested for {FORMS[form][0]}</strong></p>
            <ol className="suggest-moves">
              {suggested.map(x => <li key={x.m}><span>{moveText(MOVE_LIST[x.m])}</span><small>{x.label}</small></li>)}
            </ol>
            <p className="hint">Two strong moves of its own types, then moves that hit the most other types hard. TMs only turn up at random in shops, so level-up and egg moves win ties. A starting point, not the only answer.</p>
            {suggested.map(x => MOVE_KEYS[x.m]).join() !== runMoves.join() && (
              <button type="button" className="mini-btn" onClick={() => set({ runMoves: suggested.map(x => MOVE_KEYS[x.m]) })}>Use these moves</button>
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
