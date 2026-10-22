// Shiny tier sprites drawn the way PokeRogue does it (getSpriteId in pokemon-species.ts, variant.ts):
// the variant masterlist gives, per species, [standard, rare, epic] as 0 = the plain shiny sprite, 1 = the normal sprite
// recoloured with variant/<id>.json (colour set "1" for rare, "2" for epic), 2 = its own sheet variant/<id>_<tier>.png.
// Standard shinies use PokeAPI's shiny sprite like the rest of the site.
import { useEffect, useState } from 'react';
import { sprite } from './art';

// raw.githubusercontent (not jsDelivr): jsDelivr refuses some files of this repo for being over its package size limit.
const ASSETS = 'https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/pokemon/';
export const shinySprite = id => sprite(id).replace('/pokemon/', '/pokemon/shiny/');

const cache = new Map();
const json = url => {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(url);
};
const image = url => new Promise((ok, fail) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => ok(img);
  img.onerror = fail;
  img.src = url;
});

// The first frame of a sprite sheet, optionally recoloured (map: { 'rrggbb': 'rrggbb' }), as a data URL.
async function firstFrame(base, map) {
  const [atlas, img] = await Promise.all([json(`${base}.json`), image(`${base}.png`)]);
  const f = atlas?.textures?.[0]?.frames?.[0];
  if (!f) return null;
  const { w, h } = f.sourceSize, { x, y } = f.spriteSourceSize, src = f.frame;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, src.x, src.y, src.w, src.h, x, y, src.w, src.h);
  if (map) {
    const px = g.getImageData(0, 0, w, h), d = px.data;
    const to = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const key = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0');
      const v = to[key];
      if (v) { d[i] = parseInt(v.slice(0, 2), 16); d[i + 1] = parseInt(v.slice(2, 4), 16); d[i + 2] = parseInt(v.slice(4, 6), 16); }
    }
    g.putImageData(px, 0, 0);
  }
  return c.toDataURL();
}

const made = new Map();
async function tierSprite(gameId, tier) {
  const key = `${gameId}_${tier}`;
  if (!made.has(key)) {
    made.set(key, (async () => {
      const list = await json(`${ASSETS}variant/_masterlist.json`);
      const how = list?.[gameId]?.[tier - 1];
      if (how === 2) return firstFrame(`${ASSETS}variant/${gameId}_${tier}`);
      if (how === 1) {
        const colours = await json(`${ASSETS}variant/${gameId}.json`);
        return colours?.[tier - 1] ? firstFrame(`${ASSETS}${gameId}`, colours[tier - 1]) : null;
      }
      return null;   // no rare / epic look of its own: the game shows the standard shiny
    })().catch(() => null));
  }
  return made.get(key);
}

// The sprite URL for a starter at a shiny tier (0 = not shiny, 1 standard, 2 rare, 3 epic).
export function useShinySprite(pokeapiId, gameId, tier) {
  const plain = tier ? shinySprite(pokeapiId) : sprite(pokeapiId);
  const [url, setUrl] = useState({ key: '', url: null });
  const key = `${gameId}_${tier}`;
  useEffect(() => {
    if (tier < 2 || !gameId) return;
    let live = true;
    tierSprite(gameId, tier).then(u => { if (live) setUrl({ key, url: u }); });
    return () => { live = false; };
  }, [gameId, tier, key]);
  return url.key === key && url.url ? url.url : plain;
}
