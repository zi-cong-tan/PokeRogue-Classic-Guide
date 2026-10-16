// Online saves through Supabase. Off until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (see .env.example);
// the anon key is meant to be public, row level security in supabase/schema.sql keeps each person's teams private.
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CLOUD_ON = Boolean(URL && KEY);

// The library is only downloaded when someone uses online saves.
let client;
export const cloud = () => (client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(URL, KEY)));

// Back to this exact page after signing in (works on localhost and on GitHub Pages).
const here = () => location.origin + location.pathname;

export async function signInWithGitHub() {
  const { error } = await (await cloud()).auth.signInWithOAuth({ provider: 'github', options: { redirectTo: here() } });
  if (error) throw error;
}

export async function emailLink(email) {
  const { error } = await (await cloud()).auth.signInWithOtp({ email, options: { emailRedirectTo: here() } });
  if (error) throw error;
}

export async function listTeams() {
  const { data, error } = await (await cloud()).from('teams').select('id, name, party, builds, updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Saving under a name you already used replaces that team.
export async function saveTeam(name, party, builds, existingId) {
  const db = (await cloud()).from('teams');
  const row = { name, party, builds, updated_at: new Date().toISOString() };
  const { error } = existingId ? await db.update(row).eq('id', existingId) : await db.insert(row);
  if (error) throw error;
}

export async function deleteTeam(id) {
  const { error } = await (await cloud()).from('teams').delete().eq('id', id);
  if (error) throw error;
}
