# PokeRogue Field Guide

**200 waves to Eternatus, mapped out.** A good-looking, interactive guide to a [PokeRogue](https://pokerogue.net) Classic run, printed like the paperwork of the trip.

**[Open the guide](https://zi-cong-tan.github.io/PokeRogue-Guide-Aesthetic/)**

![The run card: 200 waves to Eternatus](docs/screenshot.png)

## What's in it

- **The run, wave by wave.** Every fixed fight in Classic on one itinerary slip: rivals, gym leaders, the evil team, the Elite Four, the Champion and Eternatus. Click a fight to see the trainer.
- **The ten villain teams.** A case file per team, from Rocket to Star: boss and grunt sprites, admins by wave, both boss teams, and which Pokemon to watch out for (two health bars, Mega, Gigantamax).
- **Spend your 10 points.** All 572 starters, searchable, with a receipt that adds up your party and checks its type coverage.
- **A build sheet for your party.** Pick ability (hidden included), passive, nature, IVs, shiny, unlocked egg moves and the four moves you start with. It warns you when an ability changes on evolving, and saves in your browser.
- **Candy and eggs.** Hatch times, what each gacha voucher promises, and candy costs per starter price.
- **Where can I go next?** All 34 biomes with their real art and the odds of each link.
- **Types.** Pick one or two types to see what hits them hard and what they hit hard.

## Where the numbers come from

Everything is read from the [PokeRogue source code](https://github.com/pagefaultgames/pokerogue) (October 2026), not copied from wikis. The game updates often. `scripts/build-data.py` rebuilds the starter data (abilities, passives, moves, egg moves, evolutions) from the latest source and flags anything that stopped matching. If something looks out of date, please [open an issue](https://github.com/zi-cong-tan/PokeRogue-Guide-Aesthetic/issues).

## Run it yourself

```sh
npm install
npm run dev                     # local site
python3 scripts/build-data.py   # refresh starter data from the game source
npm run deploy                  # build and publish to GitHub Pages
```

Built with React, Vite and GSAP.

## Credits

Made by [Zi Cong Tan](https://github.com/zi-cong-tan), built with Claude Code. A fan project, not affiliated with PokeRogue, Pagefault Games, Nintendo, Game Freak or The Pokemon Company.

- Biome, trainer, egg and candy art from [pokerogue-assets](https://github.com/pagefaultgames/pokerogue-assets) by Pagefault Games, [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The tinted candy images in `public/sprites/` are adapted from it and stay under that licence.
- Pokemon sprites from [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- The code is MIT licensed (see `LICENSE`). The game art is not covered by it.
