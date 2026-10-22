// Runs on the PokeRogue Field Guide website only. Hands the guide the starter unlocks the overlay last read from your
// PokeRogue save (see save() in page.js), now and whenever they change. Nothing leaves your browser.
(() => {
  const send = v => v && window.postMessage({ __prgSave: 1, at: v.at, data: v.data, pokerus: v.pokerus || null }, location.origin);
  const pull = () => chrome.storage.local.get('prgSave', r => send(r.prgSave));
  pull();
  // The guide asks again once its page has loaded (it may not be listening yet when this runs).
  addEventListener('message', e => { if (e.source === window && e.data?.__prgSaveAsk) pull(); });
  chrome.storage.onChanged.addListener(c => c.prgSave && send(c.prgSave.newValue));
})();
