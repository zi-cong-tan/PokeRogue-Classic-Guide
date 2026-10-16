# PokeRogue Field Guide overlay (Chrome extension)

A small panel over [PokeRogue](https://pokerogue.net) that follows your run: what the enemy on the field is weak to,
your party's best move against it, which of your Pokémon it threatens, and what fight comes next.

It is **read-only**. It reads `window.gameInfo`, which the game publishes itself (mode, biome, wave, luck, your party),
and the enemies on the field, limited to what the battle screen shows (name, level, HP, types, boss bars). It never
changes the game, never sends anything anywhere, and never shows hidden information like the enemy's moves or IVs.

## Install (Chrome, Edge, Brave, Arc)

1. `npm install`, then `npm run build:extension` (writes `extension/dist`).
2. Open `chrome://extensions`, turn on **Developer mode** (top right).
3. **Load unpacked** and pick the `extension/dist` folder.
4. Open or reload pokerogue.net. Drag the panel by its title bar; the – button folds it away.

After a game update, if the enemy part stops filling in, the rest (your party, wave, biome) keeps working.
