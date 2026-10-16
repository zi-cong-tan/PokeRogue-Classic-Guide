import { TYPES, TYPE_COLOR, cap, mult, typeInk } from '../data/types';
import { sprite } from '../art';
import { bossPrep } from '../advice';

const STAT = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;

// One Pokémon up close: types, base stats, what hits it hard, and (given your team) your best answer to it.
// mon: [name, PokeAPI id, "type1 type2", [six base stats]]
// tera: it Terastallizes to its first type (the rival's starter from fight 4), so it's matched as that one type.
export default function MonCard({ mon, team, tera, onClose, marked, onMark }) {
  const [name, id, typeStr, stats] = mon;
  const own = typeStr.split(' ');
  const types = tera ? own.slice(0, 1) : own;
  const by = m => TYPES.filter(a => mult(a, types) === m);
  const [prep] = team?.length ? bossPrep(team, [{ name, types }]) : [null];
  return (
    <div className="mon-card" role="region" aria-label={`${name} up close`}>
      <button type="button" className="mon-card-close" onClick={onClose} aria-label="Close">×</button>
      <img src={sprite(id)} alt="" width="96" height="96" />
      <div className="mon-card-main">
        <h4>{name}</h4>
        <p className="chips">{own.map(t => <Chip key={t} t={t} />)}</p>
        {tera && <p className="muted">Terastallizes to {cap(types[0])}, so it fights as a pure {cap(types[0])} type: the weaknesses below use that.</p>}
        {stats?.length === 6 && (
          <dl className="mon-stats">
            {stats.map((v, i) => (
              <div key={STAT[i]}><dt>{STAT[i]}</dt><dd>{v}</dd></div>
            ))}
            <div><dt>Total</dt><dd><strong>{stats.reduce((a, b) => a + b)}</strong></dd></div>
          </dl>
        )}
        {by(4).length > 0 && <p><b>4×</b> {by(4).map(t => <Chip key={t} t={t} />)}</p>}
        {by(2).length > 0 && <p><b>2×</b> {by(2).map(t => <Chip key={t} t={t} />)}</p>}
        <p className="muted">Resists {[...by(0.5), ...by(0.25)].map(cap).join(', ') || 'nothing'}{by(0).length ? `; immune to ${by(0).map(cap).join(', ')}` : ''}</p>
        {onMark && (
          <button type="button" className="mini-btn mark-btn" aria-pressed={!!marked} onClick={onMark}>
            {marked ? 'Marked as in their team (tap to undo)' : 'This is in their team'}
          </button>
        )}
        {prep && (
          <p className="mon-answer">
            {prep.best.mult >= 2 ? `Your best: ${prep.best.mult}× with ${cap(prep.best.type)} (${prep.best.who}).` : 'No super-effective hit on your team.'}
            {prep.threatened.length ? ` Its types hit ${prep.threatened.join(', ')} hard.` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
