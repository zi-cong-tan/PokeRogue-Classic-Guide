// The overlay panel, drawn over PokeRogue in its own shadow root so the game's page and this panel can't affect
// each other's styles. Data arrives from page.js once a second; everything shown is computed from the guide's data.
import { TYPES, TYPE_COLOR, cap, mult, typeInk } from '../../src/data/types.js';
import { ALL_MOVES } from '../../src/data/all-moves.js';
import { RUN, FINAL } from '../../src/data/fights.js';
import { BIOME_BOSSES } from '../../src/data/biome-bosses.js';

const FIGHTS = [...RUN.flatMap(g => g.rows), FINAL].map(f => ({ ...f, waves: (f.at.match(/\d+/g) || [f.n]).map(Number) }));
const GUIDE = 'https://zi-cong-tan.github.io/PokeRogue-Guide-Aesthetic/';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const chip = t => `<span class="ty" style="--t:${TYPE_COLOR[t]};--ti:${typeInk(t)}">${cap(t)}</span>`;
const lower = list => (list || []).map(t => String(t).toLowerCase()).filter(t => TYPES.includes(t));
const x = m => (m === 0.5 ? '½' : m === 0.25 ? '¼' : m) + '×';

// What a type pair takes from each attack type, grouped.
function weakness(types) {
  const by = m => TYPES.filter(a => mult(a, types) === m);
  return { x4: by(4), x2: by(2), half: [...by(0.5), ...by(0.25)], none: by(0) };
}

// Each party member's strongest damaging move into this enemy (power x type x same-type bonus).
function answers(party, enemyTypes) {
  return party.filter(p => p.currentHP > 0).map(p => {
    const own = lower(p.types);
    let best = null;
    for (const name of p.moveset || []) {
      const m = ALL_MOVES[name];
      if (!m || m[1] === 'X') continue;
      const eff = mult(m[0], enemyTypes);
      const score = (m[2] || 60) * eff * (own.includes(m[0]) ? 1.5 : 1);
      if (!best || score > best.score) best = { name, eff, score };
    }
    const threat = enemyTypes.reduce((w, t) => Math.max(w, mult(t, own)), 0);
    return { who: p.nickname || p.name, best, threat };
  });
}

function comingUp(info) {
  const w = Math.max(1, info.wave || 1);
  const next = FIGHTS.find(f => Math.max(...f.waves) >= w);
  const boss = Math.ceil(w / 10) * 10;
  const set = { 190: 'the Champion', 200: 'Eternatus' }[boss];
  const pool = BIOME_BOSSES[info.biome];
  const top = pool && ['BOSS_ULTRA_RARE', 'BOSS_SUPER_RARE'].flatMap(k => pool.tiers[k].map(e => e[0])).slice(0, 4);
  const gym = (boss % 30 === 20 || boss % 30 === 0) && pool?.gyms.length ? `gym leader ${pool.gyms.map(g => g[0]).join(' or ')}, or ` : '';
  return [
    next && ['Next fixed fight', `${next.title}, wave ${next.waves.filter(v => v >= w).join(' or ')}`],
    ['Boss wave ' + boss, (t => t[0].toUpperCase() + t.slice(1))(set || `${gym}a ${info.biome || 'biome'} boss${top?.length ? ` (rare ones: ${top.join(', ')})` : ''}`)],
    w < 200 && ['Final boss, wave 200', 'Eternatus, then Eternamax: Poison/Dragon both phases, weak to Ground, Psychic, Ice and Dragon'],
  ].filter(Boolean);
}

function render(state) {
  const { info, enemies } = state;
  if (!info || info.gameMode === 'Title' || !info.wave) {
    return `<p class="muted">Start or continue a run and this panel follows it: the enemy's weaknesses, your best move, and what comes next.</p>`;
  }
  const party = info.party || [];
  let html = `<p class="where"><strong>Wave ${info.wave}</strong>, ${esc(info.biome)}${info.luck >= 0 ? `, luck ${info.luck}` : ''}</p>`;
  if (!enemies.length) {
    html += `<p class="muted">No enemy on the field right now.</p>`;
  }
  for (const e of enemies) {
    const w = weakness(e.types);
    const ans = answers(party, e.types).sort((a, b) => (b.best?.score || 0) - (a.best?.score || 0));
    const top = ans.find(a => a.best && a.best.eff >= 2);
    html += `<section class="enemy">
      <h3>${esc(e.species || e.name)} <small>Lv ${e.level}${e.boss ? `, boss${e.bars > 1 ? ` (${e.bars} bars)` : ''}` : ''}${e.terastallized ? ', Terastallized' : ''}</small></h3>
      <p class="chips">${e.types.map(chip).join('')}</p>
      ${w.x4.length ? `<p><b>4×</b> ${w.x4.map(chip).join('')}</p>` : ''}
      ${w.x2.length ? `<p><b>2×</b> ${w.x2.map(chip).join('')}</p>` : ''}
      ${w.half.length ? `<p class="muted">Resists ${w.half.map(cap).join(', ')}${w.none.length ? `; immune to ${w.none.map(cap).join(', ')}` : ''}</p>` : ''}
      <p class="pick">${top ? `Use <strong>${esc(top.best.name)}</strong> from ${esc(top.who)} (${x(top.best.eff)})` : 'No super-effective move on your team: use your strongest same-type move, or switch.'}</p>
      <ul class="team">${ans.map(a => `<li class="${a.threat >= 2 ? 'risk' : ''}"><span>${esc(a.who)}</span><span>${a.best ? `${esc(a.best.name)} ${x(a.best.eff)}` : 'no attack'}</span>${a.threat >= 2 ? `<em>takes ${x(a.threat)}</em>` : ''}</li>`).join('')}</ul>
    </section>`;
  }
  html += `<dl class="next">${comingUp(info).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  return html;
}

const CSS = `
:host { all: initial; }
.panel { position: fixed; z-index: 2147483000; width: 320px; max-height: 80vh; overflow: auto; background: #0f1f10; color: #fff;
  font: 14px/1.4 "Source Serif 4", Georgia, serif; box-shadow: 0 8px 28px rgba(0,0,0,.45); border-radius: 0; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #c6f19d; color: #0f1f10; cursor: move; user-select: none; }
.bar strong { flex: 1; font: 700 14px/1 Georgia, serif; }
.bar button { all: unset; cursor: pointer; padding: 2px 8px; font-weight: 700; min-width: 20px; text-align: center; }
.bar button:focus-visible { outline: 2px solid #0f1f10; }
.body { padding: 12px; display: grid; gap: 12px; }
.collapsed .body { display: none; }
.muted { color: #a9b3a9; margin: 0; }
p { margin: 0; }
.where { font-size: 13px; }
.enemy { background: #182d19; padding: 10px; display: grid; gap: 6px; }
.enemy h3 { margin: 0; font-size: 16px; }
.enemy h3 small { font-weight: 400; color: #a9b3a9; font-size: 12px; }
.chips { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.ty { display: inline-block; padding: 1px 7px; margin-right: 3px; background: var(--t); color: var(--ti); font: 600 12px/1.5 Georgia, serif; }
.enemy b { display: inline-block; min-width: 26px; }
.pick { background: #c6f19d; color: #0f1f10; padding: 6px 8px; }
.team { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; font-size: 13px; }
.team li { display: grid; grid-template-columns: 1fr auto; gap: 0 8px; }
.team li em { grid-column: 1 / -1; color: #ffb4a8; font-style: normal; font-size: 12px; }
.team li.risk span:first-child { color: #ffb4a8; }
.next { margin: 0; display: grid; gap: 6px; font-size: 13px; }
.next dt { color: #a9b3a9; font-size: 12px; }
.next dd { margin: 0; }
a { color: #c6f19d; }
`;

function mount() {
  const host = document.createElement('div');
  host.id = 'prg-field-guide-overlay';
  const root = host.attachShadow({ mode: 'closed' });
  const saved = (() => { try { return JSON.parse(localStorage.getItem('prg-overlay-ui')) || {}; } catch { return {}; } })();
  const save = () => { try { localStorage.setItem('prg-overlay-ui', JSON.stringify(ui)); } catch { /* storage blocked */ } };
  const ui = { x: saved.x ?? window.innerWidth - 340, y: saved.y ?? 20, collapsed: !!saved.collapsed };

  root.innerHTML = `<style>${CSS}</style>
    <div class="panel" role="complementary" aria-label="PokeRogue Field Guide overlay">
      <div class="bar"><strong>Field Guide</strong>
        <button type="button" class="toggle" aria-label="Collapse or expand">–</button></div>
      <div class="body" aria-live="polite"></div>
      <p class="muted" style="padding:0 12px 10px;font-size:12px">Read-only. <a href="${GUIDE}" target="_blank" rel="noreferrer">Open the full guide</a></p>
    </div>`;
  const panel = root.querySelector('.panel');
  const body = root.querySelector('.body');
  const place = () => {
    ui.x = Math.min(Math.max(0, ui.x), window.innerWidth - 120);
    ui.y = Math.min(Math.max(0, ui.y), window.innerHeight - 40);
    panel.style.left = ui.x + 'px';
    panel.style.top = ui.y + 'px';
    panel.classList.toggle('collapsed', ui.collapsed);
    root.querySelector('.toggle').textContent = ui.collapsed ? '+' : '–';
  };
  place();

  root.querySelector('.toggle').addEventListener('click', () => { ui.collapsed = !ui.collapsed; place(); save(); });
  const bar = root.querySelector('.bar');
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const start = { px: e.clientX, py: e.clientY, x: ui.x, y: ui.y };
    bar.setPointerCapture(e.pointerId);
    const move = ev => { ui.x = start.x + ev.clientX - start.px; ui.y = start.y + ev.clientY - start.py; place(); };
    const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); save(); };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });
  window.addEventListener('resize', place);

  let last = '';
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data?.__prgOverlay) return;
    const state = { info: e.data.info, enemies: (e.data.enemies || []).map(en => ({ ...en, types: lower(en.types) })) };
    const html = render(state);
    if (html !== last) { body.innerHTML = html; last = html; }
  });
  body.innerHTML = render({ info: null, enemies: [] });
  document.documentElement.append(host);
}

mount();
