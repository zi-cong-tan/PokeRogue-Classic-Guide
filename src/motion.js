import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

// Section entrance: every [data-reveal] child rises in, in order, the first time the section shows.
// Content is visible by default; GSAP only animates from the hidden state, so no script = no hidden text.
export function useReveal() {
  const ref = useRef(null);
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.from(ref.current.querySelectorAll('[data-reveal]'), {
        y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: ref.current, start: 'top 75%', once: true },
      });
    });
  }, { scope: ref });
  return ref;
}

// Counts a number in an element from its previous value to `to`.
export function countTo(el, from, to, fmt = Math.round) {
  if (!el) return;
  if (!window.matchMedia(MOTION_OK).matches) { el.textContent = fmt(to); return; }
  const o = { n: from };
  // the last frame shows the exact value, so fractions (½ point) are not rounded away
  gsap.to(o, { n: to, duration: 0.6, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.n); }, onComplete: () => { el.textContent = fmt(to); } });
}

export { gsap, useGSAP };
