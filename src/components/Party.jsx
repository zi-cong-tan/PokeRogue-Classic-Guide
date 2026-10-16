import { sprite } from '../art';

const TAGS = { B: 'Two health bars', M: 'Mega', G: 'Gigantamax' };

export default function Party({ title, slots }) {
  return (
    <div className="party">
      <h4>{title}</h4>
      <ul>
        {slots.map(([names, id, tags, tera], i) => (
          <li key={i} className={tags || tera ? 'danger' : undefined}>
            <img src={sprite(id)} alt="" width="96" height="96" loading="lazy" />
            <span className="party-n">{names.join(' or ')}</span>
            {(tags || tera) && <span className="tags">{[...(tags || '')].map(t => <b key={t}>{TAGS[t]}</b>)}{tera && <b>Tera {tera[0].toUpperCase() + tera.slice(1)}</b>}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
