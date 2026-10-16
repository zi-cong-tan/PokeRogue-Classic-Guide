import { useRef } from 'react';
import { useReveal, gsap, MOTION_OK } from '../motion';
import { BIOMES, BIOME_NAMES } from '../data/game';
import { biomeArt } from '../art';
import { useRun, setRun, BOSS_TIERS } from '../run';
import { BIOME_BOSSES } from '../data/biome-bosses';
import { sprite } from '../art';
import { Sheet } from './Trainer';

const ASSETS = 'https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/';


const ODDS = { undefined: 'Always open', 2: 'Open 1 run in 2', 3: 'Open 1 run in 3' };

// Who the boss waves here can be: wild boss Pokémon by rarity, and the gym leaders a gym wave here brings.
function Bosses({ biome }) {
  const b = BIOME_BOSSES[biome];
  if (!b) return null;
  const tiers = BOSS_TIERS.filter(([k]) => b.tiers[k].length);
  return (
    <div className="ticket-bosses">
      {tiers.length > 0 && <>
        <h4>Boss waves here</h4>
        <p className="ticket-via">Waves ending in 0 that are not a set fight or a gym battle bring one of these as a boss.</p>
        {tiers.map(([k, label, n]) => (
          <div key={k} className="boss-tier">
            <p><strong>{label}</strong> <span>{n} in 64</span></p>
            <ul>
              {b.tiers[k].map(([name, id, tod]) => (
                <li key={name + tod}>
                  <img src={sprite(id)} alt="" width="96" height="96" loading="lazy" />
                  <span>{name}{tod && <small> ({tod} only)</small>}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </>}
      {b.gyms.length > 0 && <>
        <h4>Gym leaders here</h4>
        <ul className="gyms">
          {b.gyms.map(([name, art]) => (
            <li key={name}>{art && <Sheet src={ASSETS + art[0]} frame={art[1]} label={name} tall={72} className="gym-sprite" />}<span>{name}</span></li>
          ))}
        </ul>
      </>}
    </div>
  );
}

export default function Biomes() {
  const root = useReveal();
  const ticket = useRef(null);
  // The ticket shows your run's biome; travelling on it moves your run there too.
  const run = useRun();
  const cur = BIOMES[run.biome] ? run.biome : 'Town';
  const from = BIOME_NAMES.filter(x => BIOMES[x].some(([d]) => d === cur));

  // Travelling stamps a fresh ticket: it dips and comes back with the new biome.
  const go = name => {
    setRun({ biome: name });
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
          <img src={biomeArt(cur)} alt={`The ${cur} biome as drawn in the game`} width="320" height="180" loading="lazy" />
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
          <Bosses biome={cur} />
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
