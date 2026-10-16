import { useRef, useState } from 'react';
import { useReveal, gsap, MOTION_OK } from '../motion';
import { BIOMES, BIOME_NAMES } from '../data/game';
import { biomeArt } from '../art';

const ODDS = { undefined: 'Always open', 2: 'Open 1 run in 2', 3: 'Open 1 run in 3' };

export default function Biomes() {
  const root = useReveal();
  const ticket = useRef(null);
  const [cur, setCur] = useState('Town');
  const from = BIOME_NAMES.filter(x => BIOMES[x].some(([d]) => d === cur));

  // Travelling stamps a fresh ticket: it dips and comes back with the new biome.
  const go = name => {
    setCur(name);
    if (window.matchMedia(MOTION_OK).matches) gsap.fromTo(ticket.current, { y: 14, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
  };

  return (
    <section className="biomes" id="biomes" ref={root} aria-labelledby="biomes-title">
      <div className="biomes-head">
        <h2 id="biomes-title" data-reveal>Where can I go next?</h2>
        <p data-reveal>Every run starts in Town. When a biome ends, the game picks the next one from its links, and some links only open in some runs. Carry a Map and you choose between the open ones yourself.</p>
      </div>

      <div className="ticket" ref={ticket} aria-live="polite" data-reveal>
        <div className="ticket-art">
          <img src={biomeArt(cur)} alt={`The ${cur} biome as drawn in the game`} width="320" height="180" />
        </div>
        <div className="ticket-body">
          <h3>{cur}</h3>
          <p className="ticket-via">{from.length ? `You can get here from ${from.join(', ')}. From here:` : 'Where every run begins. From here:'}</p>
          <ol className="dest">
            {BIOMES[cur].map(([d, n]) => (
              <li key={d}>
                <button type="button" onClick={() => go(d)}>
                  <span className="dest-n">{d}</span><b aria-hidden="true" /><span className={`odds o${n || 1}`}>{ODDS[n]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="atlas" role="group" aria-label="Jump to any biome" data-reveal>
        {BIOME_NAMES.map(n => (
          <button key={n} type="button" aria-pressed={n === cur} onClick={() => go(n)}>{n}</button>
        ))}
      </div>
    </section>
  );
}
