import { useEffect, useState } from 'react';
import { CLOUD_ON, cloud, signInWithGitHub, emailLink, listTeams, saveTeam, deleteTeam } from '../cloud';
import { STARTERS } from '../data/starters';

// A session from an earlier visit, or one arriving back from a sign-in link: only then is the library loaded on page load.
const returning = () => {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-')) || /[?&#](code|access_token)=/.test(location.href);
  } catch { return false; }
};

const when = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function CloudTeams({ party, builds, setParty, setBuilds }) {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(null);   // team id waiting for a second click to delete
  const [undo, setUndo] = useState(null);   // the party that a load replaced

  useEffect(() => {
    if (!CLOUD_ON || !returning()) return;
    let off;
    cloud().then(c => {
      c.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
      off = c.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null)).data.subscription;
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    });
    return () => off?.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) listTeams().then(setTeams, e => setMsg(e.message));
  }, [user]);

  if (!CLOUD_ON) return null;

  // Every call shows its own result or the server's error, and the buttons wait while it runs.
  const run = async (fn, done) => {
    setBusy(true); setMsg('');
    try { await fn(); if (done) setMsg(done); } catch (e) { setMsg(e.message || 'Something went wrong. Try again.'); }
    setBusy(false);
  };

  const save = () => run(async () => {
    const clean = name.trim().slice(0, 60);
    await saveTeam(clean, party, Object.fromEntries(party.map(i => [i, builds[i]]).filter(([, b]) => b)), teams.find(t => t.name === clean)?.id);
    setTeams(await listTeams());
    setName('');
  }, 'Saved.');

  const load = t => {
    setUndo({ party, builds });
    setParty(t.party.filter(i => STARTERS[i]));
    setBuilds(b => ({ ...b, ...t.builds }));
    setMsg(`Loaded ${t.name}.`);
  };

  if (!user) {
    return (
      <div className="paper cloud">
        <h3>Save teams online</h3>
        <p>Sign in to keep named teams and open them on any device. Without signing in, your team still saves in this browser.</p>
        <button type="button" className="mini-btn" disabled={busy} onClick={() => run(signInWithGitHub)}>Sign in with GitHub</button>
        <form className="cloud-email" onSubmit={ev => { ev.preventDefault(); run(() => emailLink(email.trim()), 'Check your email for a sign-in link.'); }}>
          <label htmlFor="cloud-email">Or get a sign-in link by email</label>
          <div>
            <input id="cloud-email" type="email" required autoComplete="email" value={email} onChange={ev => setEmail(ev.target.value)} placeholder="you@example.com" />
            <button type="submit" className="mini-btn" disabled={busy}>Send link</button>
          </div>
        </form>
        {msg && <p className="cloud-msg" role="status">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="paper cloud">
      <h3>Your saved teams</h3>
      <p className="cloud-who">
        Signed in as {user.user_metadata?.user_name || user.email}.{' '}
        <button type="button" className="text-btn" onClick={() => run(async () => { await (await cloud()).auth.signOut(); setTeams([]); })}>Sign out</button>
      </p>
      {party.length > 0 && (
        <form className="cloud-save" onSubmit={ev => { ev.preventDefault(); save(); }}>
          <label htmlFor="cloud-name">Save this party as</label>
          <div>
            <input id="cloud-name" required maxLength={60} value={name} onChange={ev => setName(ev.target.value)} placeholder="Gible run" list="cloud-names" />
            <datalist id="cloud-names">{teams.map(t => <option key={t.id} value={t.name} />)}</datalist>
            <button type="submit" className="mini-btn" disabled={busy}>{teams.some(t => t.name === name.trim()) ? 'Replace' : 'Save'}</button>
          </div>
        </form>
      )}
      {teams.length ? (
        <ul className="cloud-list">
          {teams.map(t => (
            <li key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <small>{t.party.map(i => STARTERS[i]?.[0]).filter(Boolean).join(', ') || 'Empty'}, {when(t.updated_at)}</small>
              </div>
              <button type="button" className="text-btn" onClick={() => load(t)}>Load</button>
              <button type="button" className="text-btn" disabled={busy}
                onClick={() => (sure === t.id ? run(async () => { await deleteTeam(t.id); setTeams(ts => ts.filter(x => x.id !== t.id)); setSure(null); }) : setSure(t.id))}>
                {sure === t.id ? 'Delete for good?' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      ) : <p>No saved teams yet.</p>}
      {undo && <p className="cloud-msg"><button type="button" className="text-btn" onClick={() => { setParty(undo.party); setBuilds(undo.builds); setUndo(null); setMsg(''); }}>Undo load</button></p>}
      {msg && <p className="cloud-msg" role="status">{msg}</p>}
    </div>
  );
}
