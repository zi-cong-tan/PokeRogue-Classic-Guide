// Game art from the PokeRogue assets repo (CC BY-NC-SA 4.0, Pagefault Games) and sprites from PokeAPI, served through
// jsDelivr's GitHub mirror: GitHub's raw host throttles a page that loads hundreds of sprites at once.
// Biome backgrounds are 320x180 pixel art.
export const biomeArt = name => `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/images/arenas/${name.toLowerCase().replace(/ /g, '_')}_bg.png`;

// Pokemon sprites from the PokeAPI sprites project.
export const sprite = id => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`;
export const animated = id => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/showdown/${id}.gif`;
export const trainerArt = id => `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/images/trainer/${id}.png`;
export const itemArt = id => `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/images/items/${id}.png`;

// If a mirrored image still fails, try it once straight from GitHub (any <img> on the page).
const RAW = { 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/',
  'https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/': 'https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/' };
export function retryImagesFromGitHub() {
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.retried) return;
    const base = Object.keys(RAW).find(b => img.src.startsWith(b));
    if (base) { img.dataset.retried = '1'; img.src = RAW[base] + img.src.slice(base.length); }
  }, true);
}
