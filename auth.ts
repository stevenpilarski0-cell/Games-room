import { supabase } from './supabase';

/** Reuses the session or signs in anonymously (enable "Allow anonymous sign-ins" in Supabase). */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user;
  const { data: d, error } = await supabase.auth.signInAnonymously();
  if (error || !d.user) throw new Error(error?.message ?? 'Sign-in failed. Is anonymous sign-in enabled?');
  return d.user;
}

export async function saveProfile(id: string, username: string, avatar: string) {
  const { error } = await supabase.from('profiles').upsert({ id, username: username.trim(), avatar });
  if (error) throw new Error(error.code === '23505' ? 'That username is taken' : error.message);
}
