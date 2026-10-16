import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '../motion';
import { biomeArt, itemArt } from '../art';
import { CANDY } from '../data/game';

// Candy columns grouped by starter cost; costs 1-2 and 8-10 share values, so they print as one row.
const COST_ROWS = [['Cost 1 to 2', 0], ['Cost 3', 2], ['Cost 4', 3], ['Cost 5', 4], ['Cost 6', 5], ['Cost 7', 6], ['Cost 8 to 10', 7]];
// Each candy slip shows one starter's candy, tinted with that starter's colours the way the game does.
const candySlip = (title, note, col, candy, who) => ({
  title, note, icon: `/sprites/candy-${candy}.png`, iconAlt: `${who} candy`,
  rows: COST_ROWS.map(([label, i]) => ({ k: label, v: CANDY[i][col] })),
});
const egg = (k, file, v) => ({ k, v, img: itemArt(file), alt: `${k} egg` });

const SLIPS = [
  { title: 'Egg hatch times', note: 'Waves until each egg hatches', eggs: true, rows: [
    egg('Common', 'common_egg', 10), egg('Rare', 'rare_egg', 25),
    egg('Epic', 'epic_egg', 50), egg('Legendary', 'legendary_egg', 100),
  ] },
  // pullEggs() in src/ui/handlers/egg-gacha-ui-handler.ts: a 10-egg pull promises a Rare, a 25-egg pull an Epic.
  { title: 'Gacha vouchers', note: 'Eggs per voucher, and the best egg it promises', rows: [
    { k: 'Regular', v: '1 egg', sub: 'No promise' },
    { k: '10 Regulars', v: '10 eggs', sub: 'At least one Rare' },
    { k: 'Plus', v: '5 eggs', sub: 'No promise' },
    { k: 'Premium', v: '10 eggs', sub: 'At least one Rare' },
    { k: 'Golden', v: '25 eggs', sub: 'At least one Epic' },
  ] },
  candySlip('Passive ability', 'Candy for the passive', 1, 4, 'Charmander'),
  candySlip('First cost drop', 'Candy to lower the cost once', 2, 1, 'Bulbasaur'),
  candySlip('Second cost drop', 'Candy to lower it again', 3, 7, 'Squirtle'),
  candySlip('Same-species egg', 'Candy for an egg of that line', 4, 443, 'Gible'),
];

export default function Eggs() {
  const root = useRef(null);

  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      // The biome art drifts as the section scrolls past; the slips rise up out of the bottom edge.
      gsap.fromTo('.photo-bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.slip', { yPercent: 40, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.slips', start: 'top 90%', once: true } });
      gsap.from('.photo-copy > *', { y: 24, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
    });
  }, { scope: root });

  return (
    <section className="photo" id="candy" ref={root} aria-labelledby="candy-title">
      <img className="photo-bg" src={biomeArt('End')} alt="" width="320" height="180" loading="lazy" />
      <div className="photo-copy">
        <h2 id="candy-title">Candy and eggs</h2>
        <p>Catch or hatch a starter's line and that starter earns candy.</p>
        <p>Spend it on a passive ability, two cost drops or an egg of the same species. Cheaper starters need more candy for the same upgrade, so your 3-cost favourites take longest to power up.</p>
      </div>
      <div className="slips">
        {SLIPS.map(s => (
          <article className={`slip${s.eggs ? ' slip-eggs' : ''}`} key={s.title}>
            <h3>{s.title}</h3>
            <p className="slip-note">{s.note}</p>
            <dl>
              {s.rows.map(r => (
                <div key={r.k}>
                  {r.img && <img className="egg" src={r.img} alt={r.alt} width="32" height="32" loading="lazy" />}
                  <dt>{r.k}{r.sub && <small>{r.sub}</small>}</dt>
                  <dd>{r.v}</dd>
                </div>
              ))}
            </dl>
            {s.icon && <img className="slip-icon" src={s.icon} alt={s.iconAlt} width="16" height="16" />}
          </article>
        ))}
      </div>
    </section>
  );
}
