import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '../motion';
import { animated, biomeArt } from '../art';

export default function Hero() {
  const root = useRef(null);

  // The card slides up from below the fold like it is being dealt, then its lines settle in.
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.card', { yPercent: 18, duration: 0.9 })
        .from('.top > *', { y: -12, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.1)
        .from('.card > *', { y: 22, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.35);
    });
  }, { scope: root });

  return (
    <header className="hero" ref={root} id="top">
      <nav className="top" aria-label="Sections">
        <a className="mark" href="#top">PokeRogue Field Guide</a>
        <div className="links">
          <a href="#live">Your party</a><a href="#run">The run</a><a href="#villains">Villains</a><a href="#starters">Starters</a><a href="#biomes">Biomes</a><a href="#encounters">Encounters</a><a href="#types">Types</a>
        </div>
        <a className="btn" href="#starters">Plan a team</a>
      </nav>

      <img className="hero-bg" src={biomeArt('Town')} alt="" width="320" height="180" fetchPriority="high" />
      <div className="card">
        <h1><span>200 waves</span><span>to Eternatus</span></h1>
        <p className="details">
          <span>Classic mode</span><i aria-hidden="true" /><span>10 starter points</span><i aria-hidden="true" /><span>A boss every 10 waves</span>
        </p>
        <div className="overlay-cta">
          {/* The tracker owns the pop-out window; this asks it to open one, inside the same click (Chrome requires that). */}
          <button type="button" className="btn overlay-btn" onClick={() => window.dispatchEvent(new CustomEvent('prg-popout'))}>Pop out over your game</button>
          <p>A small tracker window that stays on top of PokeRogue: next fight, encounters, boss prep.
            {' '}Or <a href="https://github.com/zi-cong-tan/PokeRogue-Classic-Guide/tree/main/extension" target="_blank" rel="noreferrer">install the browser extension</a>, which reads the battle for you and fills in the starters you own here.</p>
        </div>
        <img className="boss" src={animated(890)} alt="Eternatus, the final boss, idling" width="160" height="160" fetchPriority="high" />
        <p className="lede">
          A field guide to one PokeRogue Classic run, printed like the paperwork of the trip: the fight schedule, your
          starter receipt, a biome ticket. Every number comes from the game's source code.
        </p>
      </div>
    </header>
  );
}
