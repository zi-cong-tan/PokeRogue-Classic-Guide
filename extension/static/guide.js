// Runs on the PokeRogue Field Guide website only. Hands the guide the starter unlocks the overlay last read from your
// PokeRogue save (see save() in page.js) and your current run (party, Map, biome), now and whenever they change.
// Nothing leaves your browser.
(() => {
  const send = v => v && window.postMessage({ __prgSave: 1, at: v.at, data: v.data, pokerus: v.pokerus || null }, location.origin);
  const sendRun = v => v && window.postMessage({ __prgRun: 1, run: v }, location.origin);
  const pull = () => chrome.storage.local.get(['prgSave', 'prgRun'], r => { send(r.prgSave); sendRun(r.prgRun); });
  pull();
  // The guide asks again once its page has loaded (it may not be listening yet when this runs).
  addEventListener('message', e => { if (e.source === window && e.data?.__prgSaveAsk) pull(); });
  chrome.storage.onChanged.addListener(c => { if (c.prgSave) send(c.prgSave.newValue); if (c.prgRun) sendRun(c.prgRun.newValue); });
})();
