// The in-game HUD, drawn over PokeRogue in its own shadow root so the page and the HUD can't affect each other's
// styles. Like a game overlay: panels sit in the empty bands beside the game canvas (or fold into corner tabs when
// there is no room), and a Guide drawer holds the reference tabs. Data arrives from page.js once a second.
import { TYPES, TYPE_COLOR, cap, mult, typeInk } from '../../src/data/types.js';
import { ALL_MOVES } from '../../src/data/all-moves.js';
import { RUN, FINAL } from '../../src/data/fights.js';
import { BIOME_BOSSES } from '../../src/data/biome-bosses.js';
import { BIOMES } from '../../src/data/game.js';
import { ENCOUNTERS } from '../../src/data/encounters.js';
import { ENCOUNTER_NOTES } from '../../src/data/encounter-notes.js';
import { ITEM_TIERS } from '../../src/data/items.js';
import { SPECIAL_FORMS } from '../../src/data/megas.js';
import { rateItem } from './rate.js';

const GUIDE = 'https://zi-cong-tan.github.io/PokeRogue-Guide-Aesthetic/';
const CDN = 'https://cdn.jsdelivr.net/gh/';
const sprite = id => `${CDN}PokeAPI/sprites@master/sprites/pokemon/${id}.png`;
const itemArt = id => `${CDN}pagefaultgames/pokerogue-assets@beta/images/items/${id}.png`;
const FIGHTS = [...RUN.flatMap(g => g.rows), FINAL].map(f => ({ ...f, waves: (f.at.match(/\d+/g) || [f.n]).map(Number) }));
const TIER_LABEL = { BOSS: 'Usual, 44 in 64', BOSS_RARE: 'Rare, 14 in 64', BOSS_SUPER_RARE: 'Super rare, 5 in 64', BOSS_ULTRA_RARE: 'Ultra rare, 1 in 64' };
const ME_BY_ID = Object.fromEntries(ENCOUNTERS.map(e => [e.id, e]));

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const chip = t => `<span class="ty" style="--t:${TYPE_COLOR[t]};--ti:${typeInk(t)}">${cap(t)}</span>`;
const lower = list => (list || []).map(t => String(t).toLowerCase()).filter(t => TYPES.includes(t));
const x = m => (m === 0.5 ? '½' : m === 0.25 ? '¼' : m) + '×';
const by = (types, m) => TYPES.filter(a => mult(a, types) === m);
const sum = a => a.reduce((p, q) => p + q, 0);

// Each party member's strongest damaging move into an enemy (power x type x same-type bonus).
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
    return { who: p.nickname || p.name, best, threat: enemyTypes.reduce((w, t) => Math.max(w, mult(t, own)), 0) };
  });
}

// Damage like the game's getBaseDamage: ((2 * level / 5 + 2) * power * attack / defence) / 50 + 2, then the random
// 85-100% roll, same-type 1.5x, type effectiveness and burn. Leaves out abilities, items, weather and crits.
const stage = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
function damage(attacker, move, enemy) {
  const m = ALL_MOVES[move];
  if (!m || m[1] === 'X' || !m[2]) return null;
  const physical = m[1] === 'P';
  const st = attacker.baseStats || {}, stages = attacker.statStages || {};
  const atk = (physical ? st.atk : st.spAtk) * stage((physical ? stages.atk : stages.spAtk) || 0);
  const def = (physical ? enemy.def : enemy.spDef) * stage((physical ? enemy.defStage : enemy.spDefStage) || 0);
  if (!atk || !def || !attacker.level) return null;
  const eff = mult(m[0], enemy.types);
  const base = ((2 * attacker.level / 5 + 2) * m[2] * atk / def) / 50 + 2;
  const mod = (lower(attacker.types).includes(m[0]) ? 1.5 : 1) * eff * (physical && /burn/i.test(attacker.status || '') ? 0.5 : 1);
  return { min: Math.floor(base * 0.85 * mod), max: Math.floor(base * mod), eff };
}

// Each move of your Pokémon on the field against this enemy: a range in % of its HP and whether it knocks it out.
// Uses the game's own calculation when page.js could run it (abilities, items, weather, terrain, special moves);
// otherwise falls back to the plain formula above.
// One move against one enemy: damage range in % of its max HP, the verdict, and a class for KO colouring.
// Shared by the side panel and the tags beside the fight menu.
function moveVerdict(m, e) {
  if (m.status) return { range: 'status', verdict: '', cls: '' };
  if (m.error) return { range: "can't tell", verdict: '', cls: '' };
  if (!m.max) return { range: 'no effect', verdict: '', cls: '' };
  const pct = v => Math.round((v / e.maxHp) * 100);
  const min = Math.floor(m.max * 0.85);
  const hits = Math.ceil(e.hp / Math.max(1, min));
  const verdict = e.boss ? 'stops at each bar'
    : min >= e.hp ? 'KO' : m.max >= e.hp ? 'Can KO' : m.multi ? (hits <= 5 ? `KO if it hits ${hits}+ times` : `about ${Math.ceil(hits / 3)} uses`) : m.crit >= e.hp ? 'KO on a crit' : `${hits} hits`;
  return { range: `${pct(min)}–${pct(m.max)}%${m.multi ? ' a hit' : ''}`, verdict, cls: !e.boss && min >= e.hp ? 'ko' : !e.boss && m.max >= e.hp ? 'maybe' : '' };
}

function damagePanel(info, e, i, calc) {
  if (!e.hp || !e.maxHp) return '';
  const pct = v => Math.round((v / e.maxHp) * 100);
  const game = calc?.foes?.[i];
  const me = (info.party || []).find(p => p.currentHP > 0);
  const rows = (game || (me?.moveset || []).map(name => {
    const d = me && e.def ? damage(me, name, e) : null;
    return d ? { name, max: d.max, crit: Math.floor(d.max * 1.5), eff: d.eff } : { name, status: true };
  })).map(m => {
    const v = moveVerdict(m, e);
    return `<li class="${v.cls}"><span>${esc(m.name)}</span><span${v.verdict ? '' : ' class="muted"'}>${esc(v.range)}</span><strong>${esc(v.verdict)}</strong></li>`;
  }).join('');
  const field = [calc?.weather, calc?.terrain].filter(Boolean).join(', ');
  return `<h4>${esc(calc?.attacker || me?.nickname || me?.name || 'Your')}'s moves on it <small>(it has ${pct(e.hp)}% HP)</small></h4><ul class="dmg">${rows}</ul>
    <p class="muted tiny">${game ? `From the game's own damage calculation: abilities, held items, weather, terrain and move rules included${field ? ` (now: ${esc(field)})` : ''}. Range is the 85-100% damage roll; crits count only in "KO on a crit".` : 'Estimate: no crits, abilities, items or weather.'}</p>`;
}

// ---- left band: your run and your team
function runPanel(info, enemies) {
  const w = Math.max(1, info.wave || 1);
  // The rival, villain and League fights and the wave-200 finale are Classic only. Endless has Eternatus every 250 waves
  // (Eternamax every 1000, game-mode.ts); the gym waves and biome bosses work the same in every mode.
  const mode = info.gameMode || '';
  const classic = !/endless|daily/i.test(mode), endless = /endless/i.test(mode);
  const next = classic ? FIGHTS.find(f => Math.max(...f.waves) >= w) : null;
  const boss = Math.ceil(w / 10) * 10;
  const pool = BIOME_BOSSES[info.biome];
  const gymWave = boss % 30 === 20 || boss % 30 === 0;
  const bossText = (classic ? { 190: 'The Champion', 200: 'Eternatus' }[boss] : null)
    || (endless && boss % 1000 === 0 ? 'Eternamax Eternatus' : endless && boss % 250 === 0 ? 'Eternatus' : null)
    || `${gymWave && pool?.gyms.length ? `Gym leader ${pool.gyms.map(g => g[0]).join(' or ')}, or a` : 'A'} ${info.biome || 'biome'} boss`;
  const target = enemies[0];
  const team = (info.party || []).map(p => {
    const hp = p.maxHP ? Math.max(0, p.currentHP / p.maxHP) : 1;
    const a = target ? answers([p], target.types)[0] : null;
    return `<li class="${p.currentHP <= 0 ? 'out' : ''}">
      <div class="row"><strong>${esc(p.nickname || p.name)}</strong><small>Lv ${esc(p.level)}</small></div>
      <div class="hp"><span style="width:${Math.round(hp * 100)}%"></span></div>
      <div class="chips">${lower(p.types).map(chip).join('')}</div>
      ${a?.best ? `<div class="move ${a.best.eff >= 2 ? 'good' : a.best.eff < 1 ? 'bad' : ''}">${esc(a.best.name)} ${x(a.best.eff)}</div>` : ''}
      ${a && a.threat >= 2 ? `<div class="warn">Takes ${x(a.threat)} from it</div>` : ''}
    </li>`;
  }).join('');
  return `<section><h3>Wave ${esc(info.wave)}, ${esc(info.biome)}${classic ? '' : ` <small>${esc(mode)}</small>`}</h3>
      <dl>
        ${next ? `<div><dt>Next fight</dt><dd>${esc(next.title)}, wave ${next.waves.filter(v => v >= w).join(' or ')}</dd></div>` : ''}
        <div><dt>Boss wave ${boss}</dt><dd>${esc(bossText)}</dd></div>
        ${BIOMES[info.biome] ? `<div><dt>Next biomes</dt><dd>${BIOMES[info.biome].map(([d, n]) => esc(d) + (n ? ` (1 in ${n})` : '')).join(', ')}</dd></div>` : ''}
        ${info.luck >= 0 ? `<div><dt>Luck</dt><dd>${esc(info.luck)}</dd></div>` : ''}
      </dl></section>
    <section><h3>Your team${target ? ` vs ${esc(target.species || target.name)}` : ''}</h3><ul class="team">${team}</ul></section>`;
}

// ---- right band: the Mystery Encounter on screen, or the enemy, or this biome's bosses
function rewardsPanel(info, rewards) {
  const run = { ...info, held: rewards.held };
  const rows = rewards.options.map(o => ({ o, r: rateItem(o, run) }))
    .sort((a, b) => 'SABCDE'.indexOf(a.r.tier) - 'SABCDE'.indexOf(b.r.tier));
  return `<section><h3>Rewards for your run <small>S best, E worst</small></h3>
    <ul class="rewards">${rows.map(({ o, r }) => `<li><span class="tier t${r.tier}">${r.tier}</span><div><strong>${esc(o.name)}</strong>${o.shop ? ` <small>shop, ₽${esc(o.cost)}</small>` : ''}<p>${esc(r.why)}</p></div></li>`).join('')}</ul>
    <p class="muted tiny">Rules of thumb for this run: your wave, HP, fainted, types, moves and items. TMs don't check who can learn them.</p></section>`;
}

// Each ball's chance to catch it now, from the game's own formula (page.js). "Certain" only when the game skips the roll.
function catchPanel(e, predict) {
  const c = e.catch;
  if (!c) return '';
  if (c.blocked) return `<h4>Catching</h4><p class="muted">${esc(c.blocked)}</p>`;
  const rows = c.balls.filter(b => b.have || b.odds === 1 && b.name !== 'Master Ball').map(b => {
    const sure = b.odds === 1;
    const odds = b.odds == null ? 'too strong' : sure ? 'Certain' : `${b.odds < 0.01 ? '<1' : Math.round(b.odds * 100)}%`;
    const call = b.lands === undefined ? '' : b.lands ? 'Lands' : 'Breaks free';
    return `<li class="${sure || b.lands ? 'ko' : ''}"><span>${esc(b.name)} <small>×${esc(b.have)}</small></span><span>${odds}</span><strong>${call}</strong></li>`;
  }).join('');
  const toggle = `<button type="button" class="predict" aria-pressed="${predict}">${predict ? 'Throw check on: tap to turn off' : 'Check this turn’s throw'}</button>
    ${c.daily ? '<p class="muted tiny">Off in Daily runs: they have a leaderboard.</p>'
      : c.predicted ? `<p class="muted tiny">Read from this turn’s dice: it holds if you throw now, before anything else happens.${c.unsure ? ' A Quick Claw or Quick Draw on the field may roll first, so it could be wrong.' : ''} Using a move instead moves to the next turn’s dice.</p>` : ''}`;
  return `<h4>Catching</h4>${rows ? `<ul class="dmg">${rows}</ul>` : '<p class="muted">You have no balls.</p>'}${c.strong ? '' : toggle}
    ${c.strong ? '<p class="muted tiny">Bosses only take a ball once down to their last bar (Master Ball works any time).</p>' : '<p class="muted tiny">From the game\'s catch formula: HP, status, ball, Pokédex size and Catching Charm. Lower its HP or put it to sleep to raise the odds.</p>'}`;
}

function enemyPanel(info, enemies, encounterId, rewards, calc, predict) {
  if (rewards?.options?.length) return rewardsPanel(info, rewards);
  const me = ME_BY_ID[encounterId];
  if (me) {
    const n = ENCOUNTER_NOTES[me.key];
    return `<section class="me"><h3>${esc(me.name)} <small>Mystery Encounter</small></h3>
      ${me.options.map(([label, tip]) => `<div class="opt"><strong>${esc(label)}</strong><p>${esc(tip).replace(/\n/g, '<br>')}</p></div>`).join('')}
      ${n ? `<h4>Which to pick</h4>${n.pick.map(([when, what]) => `<p class="pick"><small>${esc(when)}</small><br><strong>${esc(what)}</strong></p>`).join('')}
             <h4>What the battle is</h4><p>${esc(n.fight)}</p><h4>What you get</h4><p>${esc(n.rewards)}</p>` : ''}</section>`;
  }
  if (enemies.length) {
    const party = info.party || [];
    return enemies.map((e, i) => {
      const top = answers(party, e.types).sort((a, b) => (b.best?.score || 0) - (a.best?.score || 0)).find(a => a.best && a.best.eff >= 2);
      const half = [...by(e.types, 0.5), ...by(e.types, 0.25)], none = by(e.types, 0);
      return `<section class="enemy"><h3>${esc(e.species || e.name)} <small>Lv ${esc(e.level)}${e.boss ? `, boss${e.bars > 1 ? ` (${esc(e.bars)} bars)` : ''}` : ''}</small></h3>
        <div class="chips">${e.types.map(chip).join('')}${e.terastallized ? ' <small>Terastallized</small>' : ''}</div>
        ${by(e.types, 4).length ? `<p><b>4×</b> ${by(e.types, 4).map(chip).join('')}</p>` : ''}
        ${by(e.types, 2).length ? `<p><b>2×</b> ${by(e.types, 2).map(chip).join('')}</p>` : ''}
        ${half.length || none.length ? `<p class="muted">${half.length ? `Resists ${half.map(cap).join(', ')}` : ''}${none.length ? `${half.length ? '; ' : ''}immune to ${none.map(cap).join(', ')}` : ''}</p>` : ''}
        <p class="pick">${top ? `Use <strong>${esc(top.best.name)}</strong> from ${esc(top.who)} (${x(top.best.eff)})` : 'No super-effective move on your team: use your strongest same-type move, or switch.'}</p>
        ${damagePanel(info, e, i, calc)}
        ${catchPanel(e, predict)}
      </section>`;
    }).join('');
  }
  const pool = BIOME_BOSSES[info.biome];
  if (!pool) return '<section><p class="muted">The enemy shows here in battle.</p></section>';
  return `<section><h3>${esc(info.biome)} bosses <small>wave ${Math.ceil(Math.max(1, info.wave) / 10) * 10}</small></h3>${Object.entries(pool.tiers).filter(([, l]) => l.length).map(([k, l]) =>
    `<h4>${TIER_LABEL[k]}</h4><div class="mons">${l.map(([n, id, tod]) => `<figure><img src="${sprite(id)}" alt=""><figcaption>${esc(n)}${tod ? ` <small>(${tod})</small>` : ''}</figcaption></figure>`).join('')}</div>`).join('')}</section>`;
}

// ---- the Guide drawer
function guideTab(tab, info) {
  if (tab === 'items') {
    return `<p class="muted">Every reward item by tier, rarest last. Luck makes items jump up a tier more often.</p>` + Object.entries(ITEM_TIERS).map(([tier, list]) => `<h4>${cap(tier.toLowerCase())}</h4>
      <ul class="items">${list.map(([, name, text, icon]) => `<li>${icon ? `<img src="${itemArt(icon)}" alt="" width="48" height="48">` : '<span style="width:48px;flex:none"></span>'}<div><strong>${esc(name)}</strong><p>${esc(text)}</p></div></li>`).join('')}</ul>`).join('');
  }
  if (tab === 'encounters') {
    return ENCOUNTERS.map(e => `<details><summary>${esc(e.name)} <small>${cap(e.tier.toLowerCase())}, waves ${e.waves.join(' to ')}</small></summary>
      ${(ENCOUNTER_NOTES[e.key]?.pick || []).map(([when, what]) => `<p><small>${esc(when)}:</small> <strong>${esc(what)}</strong></p>`).join('')}</details>`).join('');
  }
  const names = new Set((info?.party || []).map(p => p.name));
  const mine = SPECIAL_FORMS.filter(f => names.has(f.name));
  const list = mine.length ? mine : [...SPECIAL_FORMS].sort((a, b) => sum(b.stats) - sum(a.stats)).slice(0, 24);
  return `<p class="muted">${mine.length ? 'Mega and Gigantamax forms of Pokémon in your party.' : 'None in your party yet: the strongest forms.'} Needs the Mega Bracelet or Dynamax Band (Rogue tier).</p>
    <ul class="items">${list.map(f => `<li><img src="${sprite(f.sprite)}" alt="" width="48" height="48"><div><strong>${esc(f.name)} ${esc(f.form)}</strong>
      <p>${f.types.split(' ').map(chip).join('')} ${esc(f.ability)}, total ${sum(f.stats)}${f.base ? ` (+${sum(f.stats) - sum(f.base)})` : ''}</p></div></li>`).join('')}</ul>`;
}

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.rail { position: fixed; z-index: 2147483000; display: grid; gap: 8px; align-content: start; overflow: auto; color: #fff;
  font: 13px/1.4 "Source Serif 4", Georgia, serif; scrollbar-width: thin; }
.rail.folded { width: auto !important; }
.rail.folded .body, .rail.folded .guide-btn { display: none; }
.body { display: grid; gap: 8px; container-type: inline-size; }
/* narrow side bands: move the verdict under the move, tighten padding */
@container (max-width: 230px) {
  section { padding: 8px; } .dmg li { grid-template-columns: 1fr auto; gap: 2px 6px; padding: 4px 6px; }
  .dmg li strong { grid-column: 1 / -1; } .rewards li, .opt { padding: 6px; } h3 { font-size: 14px; }
}
.fold { all: unset; cursor: pointer; justify-self: start; background: #c6f19d; color: #0f1f10; font: 700 12px/1 Georgia, serif; padding: 8px 12px; }
.right .fold { justify-self: end; }
button:focus-visible, summary:focus-visible, a:focus-visible { outline: 2px solid #c6f19d; outline-offset: 2px; }
section { background: #0f1f10; padding: 10px 12px; display: grid; gap: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
h3 { margin: 0; font-size: 15px; } h3 small { font-weight: 400; color: #a9b3a9; font-size: 12px; }
h4 { margin: 6px 0 0; font-size: 12px; color: #c6f19d; font-weight: 600; }
p { margin: 0; } dl { margin: 0; display: grid; gap: 4px; } dt { color: #a9b3a9; font-size: 11px; } dd { margin: 0; }
.muted, small { color: #a9b3a9; }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; justify-content: space-between; }
.ty { display: inline-block; padding: 0 6px; margin-right: 2px; background: var(--t); color: var(--ti); font: 600 11px/1.6 Georgia, serif; }
b { display: inline-block; min-width: 24px; }
.team { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.team li { background: #182d19; padding: 6px 8px; display: grid; gap: 3px; } .team li.out { opacity: .45; }
.hp { height: 4px; background: #2c3d2d; } .hp span { display: block; height: 100%; background: #c6f19d; }
.move.good { color: #c6f19d; font-weight: 600; } .move.bad { color: #a9b3a9; } .warn { color: #ffb4a8; }
.pick { background: #c6f19d; color: #0f1f10; padding: 6px 8px; } .pick small { color: #3c5a3e; }
.dmg { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; }
.dmg li { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: baseline; background: #182d19; padding: 4px 8px; font-variant-numeric: tabular-nums; }
.dmg li.ko { background: #c6f19d; color: #0f1f10; } .dmg li.ko small { color: #3c5a3e; }
.dmg li.maybe strong { color: #c6f19d; }
.tiny { font-size: 11px; }
.tier, .badge { display: inline-grid; place-items: center; font: 700 14px/1 Georgia, serif; color: #0f1f10; }
.tier { width: 26px; height: 26px; flex: none; }
.tS { background: #ffd84d; } .tA { background: #c6f19d; } .tB { background: #8fd6ad; } .tC { background: #d4dbd4; } .tD { background: #f0b38a; } .tE { background: #ff8f8f; }
.rewards { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.rewards li { display: flex; gap: 8px; align-items: flex-start; background: #182d19; padding: 6px 8px; } .rewards p { font-size: 12px; color: #d4dbd4; }
.badges { position: fixed; inset: 0; pointer-events: none; z-index: 2147482999; }
.badge { position: fixed; width: 34px; height: 34px; font-size: 20px; transform: translate(-50%, -110%); pointer-events: auto; cursor: help;
  box-shadow: 0 2px 8px rgba(0,0,0,.5); outline: 2px solid #0f1f10; }
.badge { transform: translate(-50%, -50%); }
.ballpct { position: fixed; transform: translate(-100%, -50%); background: #0f1f10; color: #fff; font: 700 15px/1 Georgia, serif; padding: 6px 8px;
  white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.5); font-variant-numeric: tabular-nums; }
.ballpct.good { background: #c6f19d; color: #0f1f10; }
.movepct { position: fixed; transform: translateY(-50%); display: grid; gap: 2px; font: 700 13px/1 Georgia, serif; white-space: nowrap; font-variant-numeric: tabular-nums; }
.movepct span { background: #0f1f10; color: #fff; padding: 4px 6px; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
.movepct .ko { background: #c6f19d; color: #0f1f10; } .movepct .maybe { outline: 2px solid #c6f19d; outline-offset: -2px; }
.opt { background: #182d19; padding: 6px 8px; } .opt p { color: #d4dbd4; font-size: 12px; }
.mons { display: flex; flex-wrap: wrap; gap: 2px; } figure { margin: 0; width: 64px; text-align: center; font-size: 11px; }
figure img { width: 48px; height: 48px; image-rendering: pixelated; display: block; margin: 0 auto; }
.items img { width: 48px; height: 48px; image-rendering: pixelated; display: block; margin: 0; flex: none; object-fit: contain; }
.guide-btn { all: unset; cursor: pointer; background: #c6f19d; color: #0f1f10; font: 700 14px/1.2 Georgia, serif; padding: 10px 14px; text-align: center; }
.drawer { position: fixed; z-index: 2147483001; inset: 6vh 8vw; background: #0f1f10; color: #fff; display: grid; grid-template-rows: auto 1fr;
  font: 14px/1.45 "Source Serif 4", Georgia, serif; box-shadow: 0 12px 40px rgba(0,0,0,.6); }
.drawer[hidden] { display: none; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px; background: #182d19; align-items: center; }
.tabs button { all: unset; cursor: pointer; padding: 8px 14px; background: #0f1f10; font-weight: 600; }
.tabs button[aria-pressed="true"] { background: #c6f19d; color: #0f1f10; }
.tabs .close { margin-left: auto; background: none; font-size: 22px; padding: 4px 12px; }
.tabs a { color: #c6f19d; font-size: 12px; margin-left: 8px; }
.drawer-body { overflow: auto; padding: 14px 18px; display: grid; gap: 8px; align-content: start; }
.items { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px; }
.items li { display: flex; gap: 8px; background: #182d19; padding: 6px 8px; } .items p { font-size: 12px; color: #d4dbd4; }
.predict { margin-top: 6px; width: 100%; font: inherit; font-size: 12px; padding: 6px 8px; border: 0; background: #2a442b; color: #e8efe8; cursor: pointer; }
.predict[aria-pressed="true"] { background: #c6f19d; color: #0f1f10; }
.predict:focus-visible { outline: 2px solid #c6f19d; outline-offset: 2px; }
details { background: #182d19; padding: 6px 10px; } summary { cursor: pointer; font-weight: 600; }
`;

function mount() {
  const host = document.createElement('div');
  host.id = 'prg-field-guide-hud';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>${CSS}</style>
    <div class="rail left" role="complementary" aria-label="Field Guide: your run"><button type="button" class="fold">Field Guide</button><div class="body l"></div><button type="button" class="guide-btn">Guide: items, encounters, Megas</button></div>
    <div class="rail right" role="complementary" aria-label="Field Guide: the enemy"><button type="button" class="fold">Enemy</button><div class="body r"></div></div>
    <div class="drawer" role="dialog" aria-label="Field Guide" hidden>
      <div class="tabs"><button type="button" data-tab="items" aria-pressed="true">Items by tier</button><button type="button" data-tab="encounters" aria-pressed="false">Encounters</button><button type="button" data-tab="megas" aria-pressed="false">Mega and G-Max</button>
        <a href="${GUIDE}" target="_blank" rel="noreferrer">Open the full guide</a><button type="button" class="close" aria-label="Close">×</button></div>
      <div class="drawer-body"></div></div>`;
  const left = root.querySelector('.left'), right = root.querySelector('.right');
  const drawer = root.querySelector('.drawer'), body = root.querySelector('.drawer-body');
  // folded: null until the player chooses, then remembered
  const saved = (() => { try { return JSON.parse(localStorage.getItem('prg-hud')) || {}; } catch { return {}; } })();
  const ui = { left: saved.left ?? null, right: saved.right ?? null, tab: 'items', predict: !!saved.predict };
  const save = () => { try { localStorage.setItem('prg-hud', JSON.stringify({ left: ui.left, right: ui.right, predict: ui.predict })); } catch { /* storage blocked */ } };
  const tellPage = () => window.postMessage({ __prgOverlayCmd: 1, predict: ui.predict }, location.origin);
  let state = { info: null, enemies: [], encounter: null, rewards: null, balls: null, moves: null, calc: null };
  let roomy = true;

  // Tier badges over each reward item, at the item's place on the canvas; hover for the reason.
  const badgeLayer = document.createElement('div');
  badgeLayer.className = 'badges';
  root.append(badgeLayer);
  function badges() {
    const rw = state.rewards;
    const c = document.querySelector('canvas');
    if (!rw?.options?.length || !c || !state.info) { badgeLayer.innerHTML = ballBadges() + moveBadges(); return; }
    const r = c.getBoundingClientRect();
    const run = { ...state.info, held: rw.held };
    badgeLayer.innerHTML = rw.options.filter(o => o.x != null).map(o => {
      const t = rateItem(o, run);
      // just above the item's icon, kept inside the game area
      const top = Math.max(r.top + 4, r.top + o.y * r.height - 0.075 * r.height);
      return `<span class="badge t${t.tier}" style="left:${r.left + o.x * r.width}px;top:${top}px" title="${esc(`${o.name}: ${t.why}`)}">${t.tier}</span>`;
    }).join('');
  }

  // Damage beside each move name while the fight menu is open. calc follows whichever of your Pokémon is choosing
  // (doubles too); with two enemies each tag has a line per enemy, named. Both lists drop fainted enemies, so they line up.
  function moveBadges() {
    const mv = state.moves, c = document.querySelector('canvas'), foes = state.calc?.foes;
    if (!mv || !c || !foes?.length) return '';
    const r = c.getBoundingClientRect(), two = state.enemies.length > 1;
    return mv.map((pos, i) => {
      const lines = state.enemies.map((e, f) => {
        const m = foes[f]?.[i];
        if (!m || m.status || !e.maxHp) return '';
        const v = moveVerdict(m, e);
        return `<span class="${v.cls}">${two ? `${esc(e.name)}: ` : ''}${esc(v.range)}${v.verdict ? ` · ${esc(v.verdict)}` : ''}</span>`;
      }).filter(Boolean);
      return lines.length ? `<span class="movepct" style="left:${r.left + pos.right * r.width + 8}px;top:${r.top + pos.y * r.height}px">${lines.join('')}</span>` : '';
    }).join('');
  }

  // Catch odds beside each ball while the ball menu is open, just left of the menu window.
  function ballBadges() {
    const bm = state.balls, c = document.querySelector('canvas');
    const odds = state.enemies.length === 1 ? state.enemies[0].catch : null;
    if (!bm || !c || !odds?.balls) return '';
    const r = c.getBoundingClientRect();
    return odds.balls.map((b, i) => {
      if (bm.ys[i] == null) return '';
      const text = odds.blocked ? '' : b.odds == null ? 'too strong' : b.odds === 1 ? 'Certain' : `${b.odds < 0.01 ? '<1' : Math.round(b.odds * 100)}% to catch`;
      if (!text) return '';
      // the throw check's call for this turn's dice, separate from the odds
      const call = b.lands === undefined ? '' : b.lands ? ' · this throw: caught' : ' · this throw: breaks free';
      return `<span class="ballpct${b.odds === 1 || b.lands ? ' good' : ''}" style="left:${r.left + bm.left * r.width - 6}px;top:${r.top + bm.ys[i] * r.height}px">${text}${call}</span>`;
    }).join('');
  }

  // Panels go in the bands beside the game canvas; with no room they start folded in the canvas's top corners.
  function place() {
    const c = document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
    // 4px from the window edge and from the game: the panels fill the bands beside it (at least 140px wide)
    const spaceL = r.left - 8, spaceR = innerWidth - r.right - 8;
    roomy = Math.min(spaceL, spaceR) >= 140;
    // beside the game they can run to the bottom of the window; over it, they stop at the game's bottom edge
    const top = Math.max(6, r.top + 6), maxH = Math.max(200, (roomy ? innerHeight : Math.min(innerHeight, r.bottom)) - top - 6);
    left.style.cssText = `left:${roomy ? 4 : r.left + 6}px;top:${top}px;width:${roomy ? Math.min(340, spaceL) : 280}px;max-height:${maxH}px`;
    right.style.cssText = `right:${roomy ? 4 : innerWidth - r.right + 6}px;top:${top}px;width:${roomy ? Math.min(340, spaceR) : 280}px;max-height:${maxH}px;${right.dataset.hide ? 'display:none' : ''}`;
    left.classList.toggle('folded', ui.left ?? !roomy);
    right.classList.toggle('folded', ui.right ?? !roomy);
  }

  function render() {
    const { info, enemies, encounter } = state;
    const live = info && info.gameMode !== 'Title' && info.wave;
    root.querySelector('.l').innerHTML = live ? runPanel(info, enemies) : '<section><p class="muted">Start or continue a run: your wave, biome, team and the next fights show here.</p></section>';
    root.querySelector('.r').innerHTML = live ? enemyPanel(info, enemies, encounter, state.rewards, state.calc, ui.predict) : '';
    badges();
    right.dataset.hide = live ? '' : '1';
    if (!drawer.hidden) body.innerHTML = guideTab(ui.tab, info);
    place();
  }

  const folds = root.querySelectorAll('.fold');
  folds[0].addEventListener('click', () => { ui.left = !left.classList.contains('folded'); save(); place(); });
  folds[1].addEventListener('click', () => { ui.right = !right.classList.contains('folded'); save(); place(); });
  right.addEventListener('click', e => {
    if (!e.target.closest('.predict')) return;
    ui.predict = !ui.predict; save(); tellPage(); render();
  });
  root.querySelector('.guide-btn').addEventListener('click', () => { drawer.hidden = false; body.innerHTML = guideTab(ui.tab, state.info); });
  root.querySelector('.close').addEventListener('click', () => { drawer.hidden = true; });
  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    ui.tab = b.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    body.innerHTML = guideTab(ui.tab, state.info);
  }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) drawer.hidden = true; });
  addEventListener('resize', () => { place(); badges(); });

  let last = '';
  addEventListener('message', e => {
    if (e.source !== window || !e.data?.__prgOverlay) return;
    state = { info: e.data.info, enemies: (e.data.enemies || []).map(en => ({ ...en, types: lower(en.types) })), encounter: e.data.encounter ?? null, rewards: e.data.rewards ?? null, balls: e.data.balls ?? null, moves: e.data.moves ?? null, calc: e.data.calc ?? null };
    const key = JSON.stringify(state);
    if (key !== last) { last = key; render(); } else { place(); badges(); }
  });
  render();
  tellPage();
  setInterval(tellPage, 5000);   // page.js may load after us
  document.documentElement.append(host);
}

mount();
