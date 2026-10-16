import { useRef, useState } from 'react';
import { useReveal, gsap, MOTION_OK } from '../motion';
import { ENCOUNTERS, ME_RULES } from '../data/encounters';
import { BIOME_NAMES } from '../data/game';

const TIER = { COMMON: 'Common', GREAT: 'Great', ULTRA: 'Ultra', ROGUE: 'Rogue', VARIES: 'Varies' };
const biomeName = key => key.toLowerCase().replace(/(^|_)(\w)/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase());
const MARK = { '+': ['good', 'Good'], '-': ['bad', 'Cost'], '?': ['maybe', 'Maybe'] };

// Why a wave can't have an encounter, from isMysteryEncounterValidForWave in the game's battle-scene.ts.
function waveRule(w) {
  const [lo, hi] = ME_RULES.waves;
  if (!w) return null;
  if (w < lo || w > hi) return `Encounters only happen between waves ${lo} and ${hi}.`;
  if (w % 10 === 0) return 'Wave ' + w + ' is a boss wave, so no encounter.';
  if (w % 10 === 1) return 'Wave ' + w + ' is the first wave of a biome, so no encounter.';
  return null;
}

const fits = (e, biome, wave) =>
  (!biome || e.biomes.includes('ANY') || e.biomes.includes(biome)) && (!wave || (wave >= e.waves[0] && wave <= e.waves[1]));

// One line of an option's outcome: "(+) Gain Berries" becomes a Good mark and the text.
function Outcome({ line }) {
  const m = line.match(/^\(([+?-])\)\s*(.*)$/);
  const odds = line.match(/^\((\d+%)\)\s*(.*)$/);
  if (m) return <li><span className={`mark ${MARK[m[1]][0]}`}>{MARK[m[1]][1]}</span>{m[2]}</li>;
  if (odds) return <li><span className="mark maybe">{odds[1]}</span>{odds[2]}</li>;
  return <li>{line}</li>;
}

export default function Encounters() {
  const root = useReveal();
  const letter = useRef(null);
  const [biome, setBiome] = useState('');
  const [wave, setWave] = useState('');
  const [cur, setCur] = useState(ENCOUNTERS.find(e => e.key === 'MYSTERIOUS_CHEST')?.key ?? ENCOUNTERS[0].key);

  const w = Number(wave) || 0;
  const blocked = waveRule(w);
  const shown = blocked ? [] : ENCOUNTERS.filter(e => fits(e, biome, w));
  const e = ENCOUNTERS.find(x => x.key === cur);
  const open = key => {
    setCur(key);
    if (window.matchMedia(MOTION_OK).matches) gsap.fromTo(letter.current, { y: 16, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  };
  const needs = [
    e.party && `At least ${e.party} Pokémon in your party`,
    e.money && 'Enough money for its price',
    e.once && 'Only once per run',
  ].filter(Boolean);
  const where = e.biomes.includes('ANY') ? 'Any biome' : e.biomes.map(biomeName).join(', ');

  return (
    <section className="encounters" id="encounters" ref={root} aria-labelledby="encounters-title">
      <div className="enc-head">
        <h2 id="encounters-title" data-reveal>Mystery Encounters</h2>
        <p data-reveal>
          About {ME_RULES.AVERAGE_ENCOUNTERS_PER_RUN_TARGET} per Classic run, between waves {ME_RULES.waves[0]} and {ME_RULES.waves[1]}.
          One can replace a wild battle, never a trainer, a boss or the first wave of a biome, and two are always at least four waves apart.
          The rarer the tier, the better the deal usually is.
        </p>
      </div>

      <div className="tier-bar" role="img" aria-label={Object.values(TIER).slice(0, 4).map((t, i) => `${t} ${ME_RULES.share[i]}%`).join(', ')} data-reveal>
        {['COMMON', 'GREAT', 'ULTRA', 'ROGUE'].map((t, i) => (
          <span key={t} className={`tier-${t.toLowerCase()}`} style={{ flexGrow: ME_RULES.share[i] }}>
            <b>{ME_RULES.share[i]}%</b> {TIER[t]}
          </span>
        ))}
      </div>

      <div className="enc-find" data-reveal>
        <label>Where are you?
          <select value={biome} onChange={ev => setBiome(ev.target.value)}>
            <option value="">Any biome</option>
            {BIOME_NAMES.map(n => <option key={n} value={n.toUpperCase().replace(/ /g, '_')}>{n}</option>)}
          </select>
        </label>
        <label>Wave
          <input type="number" min="1" max="200" inputMode="numeric" placeholder="Any" value={wave} onChange={ev => setWave(ev.target.value)} />
        </label>
        <p className="enc-count" aria-live="polite">
          {blocked || (shown.length ? `${shown.length} of ${ENCOUNTERS.length} encounters can show up here.` : 'None of the encounters can show up here.')}
        </p>
      </div>

      <div className="enc-body" data-reveal>
        <ol className="enc-index" aria-label="Encounters">
          {shown.map(x => (
            <li key={x.key}>
              <button type="button" aria-pressed={x.key === cur} onClick={() => open(x.key)}>
                <span>{x.name}</span><b aria-hidden="true" /><span className="enc-tier">{TIER[x.tier]}</span>
              </button>
            </li>
          ))}
        </ol>
        <label className="enc-pick">Encounter
          <select value={cur} onChange={ev => open(ev.target.value)}>
            {(shown.some(x => x.key === cur) ? shown : [e, ...shown]).map(x => <option key={x.key} value={x.key}>{x.name} ({TIER[x.tier]})</option>)}
          </select>
        </label>

        <article className="paper zig letter" ref={letter} aria-live="polite">
          <h3>{e.name}</h3>
          <dl className="letter-facts">
            <div><dt>Rarity</dt><dd>{TIER[e.tier]}</dd></div>
            <div><dt>Waves</dt><dd>{e.waves[0]} to {e.waves[1]}</dd></div>
            <div><dt>Where</dt><dd>{where}</dd></div>
            {needs.length > 0 && <div><dt>Needs</dt><dd>{needs.join('; ')}</dd></div>}
          </dl>
          <blockquote>{e.text}</blockquote>
          <ol className="choices">
            {e.options.map(([label, tip, disabled], i) => (
              <li key={i}>
                <h4>{label}</h4>
                {tip && <ul>{tip.split('\n').filter(Boolean).map((l, k) => <Outcome key={k} line={l} />)}</ul>}
                {disabled && <p className="hint">Locked when: {disabled}</p>}
              </li>
            ))}
          </ol>
        </article>
      </div>
      <p className="note">From the game's source. Names in the game's text, like the Pokémon that helps, depend on your party, so they read "your Pokémon" here.</p>
    </section>
  );
}
