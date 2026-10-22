// Firefox build of the overlay: the Chrome build (extension/dist) with a Firefox manifest, in extension/dist-firefox.
// Run `npm run build:extension:firefox`. Firefox 128+ supports MV3 content scripts in the page's MAIN world.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const src = 'extension/dist', out = 'extension/dist-firefox';
rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
const m = JSON.parse(readFileSync(`${out}/manifest.json`, 'utf8'));
m.browser_specific_settings = {
  gecko: {
    id: 'pokerogue-field-guide@zi-cong-tan.github.io',
    strict_min_version: '128.0',
    data_collection_permissions: { required: ['none'] },  // reads the game locally, sends nothing anywhere
  },
};
writeFileSync(`${out}/manifest.json`, JSON.stringify(m, null, 2) + '\n');
console.log(`Built ${out} (Firefox ${m.version})`);
