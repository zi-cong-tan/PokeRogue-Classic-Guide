# PokeRogue Field Guide overlay (Chrome extension)

A heads-up display for [PokeRogue](https://pokerogue.net), like a game overlay: panels in the empty bands beside the
game (or folded into corner tabs on small windows) that follow your run.

- **Left:** wave, biome, next fight, next boss wave (with this biome's gym leaders), next biomes, luck; your team with HP
  and each member's best move against the enemy.
- **Right:** the enemy's weaknesses and the move to use, plus your active Pokémon's moves as a damage range (% of its HP)
  with KO / can KO / hits to KO. When a Mystery Encounter is on screen, its choices and which to pick instead. Out of
  battle, this biome's possible bosses.
- **Reward screen:** a tier badge (S to E) on every item offered and in the shop, rated for your run: your wave, team HP,
  fainted Pokémon, types, moves, abilities and items you already hold. Hover a badge for the reason; the right panel lists them all.
- **Catching:** each ball's chance to catch the enemy now (the game's formula: HP, status, ball, Pokédex size, Catching
  Charm), "Certain" when the game skips the roll, and why no ball can be thrown when it can't.
- **Throw check (off by default):** the game's battle dice are fixed for each turn, so with this on, each ball shows
  whether this turn's throw lands or breaks free. Never runs in Daily runs, which have a leaderboard.
- **Guide button:** items by tier with icons, every Mystery Encounter's advice, Mega and Gigantamax forms of your party.

It is **read-only**. It reads `window.gameInfo`, which the game publishes itself (mode, biome, wave, luck, your party),
plus, from the battle itself: the enemies on the field (name, level, HP, types, boss bars, defences for the damage
estimate) and which Mystery Encounter is on screen. It never changes the game, never sends anything anywhere, and never
shows the enemy's moves. Damage comes from the game's own calculation run in simulated mode; the throw check replays the
enemy's move choice and the capture rolls, then restores the dice exactly as they were.

## Install (Chrome, Edge, Brave, Arc)

1. `npm install`, then `npm run build:extension` (writes `extension/dist`).
2. Open `chrome://extensions`, turn on **Developer mode** (top right).
3. **Load unpacked** and pick the `extension/dist` folder.
4. Open or reload pokerogue.net. Drag the panel by its title bar; the – button folds it away.

After a game update, if the enemy part stops filling in, the rest (your party, wave, biome) keeps working.
