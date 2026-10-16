// Biome backgrounds from the PokeRogue assets repo (CC BY-NC-SA 4.0, Pagefault Games), hotlinked, 320x180 pixel art.
export const biomeArt = name => `https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/arenas/${name.toLowerCase().replace(/ /g, '_')}_bg.png`;

// Pokemon sprites from the PokeAPI sprites project.
export const sprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
export const animated = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
export const trainerArt = id => `https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/trainer/${id}.png`;
export const itemArt = id => `https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/items/${id}.png`;
