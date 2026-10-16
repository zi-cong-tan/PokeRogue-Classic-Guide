import { FRAMES } from '../data/fights';
import { VILLAIN_FRAMES } from '../data/villains';
import { trainerArt } from '../art';

const ALL_FRAMES = { ...FRAMES, ...VILLAIN_FRAMES };

// One frame cut from a trainer's sprite sheet, scaled by whole pixels to about `tall` px, no smoothing.
export default function Trainer({ id, label, tall = 200, className = 'who' }) {
  const [x, y, w, h, W, H] = ALL_FRAMES[id];
  const s = Math.max(1, Math.round(tall / h));
  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      style={{
        '--w': `${w * s}px`, '--h': `${h * s}px`,
        backgroundImage: `url(${trainerArt(id)})`,
        backgroundSize: `${W * s}px ${H * s}px`,
        backgroundPosition: `-${x * s}px -${y * s}px`,
      }}
    />
  );
}
