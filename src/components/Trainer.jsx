import { FRAMES } from '../data/fights';
import { VILLAIN_FRAMES } from '../data/villains';
import { trainerArt, sprite } from '../art';

const ALL_FRAMES = { ...FRAMES, ...VILLAIN_FRAMES };
const ASSETS = 'https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/images/';

// One frame cut from a sprite sheet, scaled by whole pixels to about `tall` px, no smoothing.
// frame = [x, y, w, h, sheet width, sheet height].
export function Sheet({ src, frame, label, tall = 200, className = 'who' }) {
  const [x, y, w, h, W, H] = frame;
  const s = Math.max(1, Math.round(tall / h));
  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      style={{
        '--w': `${w * s}px`, '--h': `${h * s}px`,
        backgroundImage: `url(${src})`,
        backgroundSize: `${W * s}px ${H * s}px`,
        backgroundPosition: `-${x * s}px -${y * s}px`,
      }}
    />
  );
}

// Art from the generated data: ["mon", PokeAPI id], ["atlas", path, frame] or ["img", path].
export function Art({ art, label, tall = 120 }) {
  const [kind, a, b] = art;
  if (kind === 'mon') return <img className="art-mon" src={sprite(a)} alt={label} width="96" height="96" loading="lazy" />;
  if (kind === 'img') return <img className="art-img" src={ASSETS + a} alt={label} loading="lazy" />;
  return <Sheet src={ASSETS + a} frame={b} label={label} tall={tall} className="art-sheet" />;
}

export default function Trainer({ id, label, tall = 200, className = 'who' }) {
  return <Sheet src={trainerArt(id)} frame={ALL_FRAMES[id]} label={label} tall={tall} className={className} />;
}
