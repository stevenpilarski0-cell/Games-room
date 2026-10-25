'use client';
import { useState, ReactNode } from 'react';

const AVATARS = ['🎲', '🦊', '👾', '🐲', '🤠', '🦄', '🔥', '💎'];

/** Username/avatar picker + the required settlement terms acknowledgement. */
export default function ProfileForm({ settlementDate, submitLabel, extra, onSubmit }: {
  settlementDate: string; submitLabel: string; extra?: ReactNode;
  onSubmit: (username: string, avatar: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = /^[A-Za-z0-9_ ]{2,20}$/.test(username.trim()) && agreed && !!settlementDate;

  const submit = async () => {
    setBusy(true); setErr(null);
    try { await onSubmit(username, avatar); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <div className="w-full max-w-md space-y-5 rounded-2xl border border-fuchsia-500/30 bg-zinc-900 p-6">
      <h1 className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-2xl font-black text-transparent">STEVE DOLLARS ARENA</h1>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (2–20 chars)" maxLength={20}
        className="w-full rounded-lg bg-zinc-800 px-3 py-2 outline-none ring-fuchsia-500 focus:ring-2" aria-label="Username" />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
        {AVATARS.map(a => (
          <button key={a} type="button" role="radio" aria-checked={avatar === a} onClick={() => setAvatar(a)}
            className={`h-11 w-11 rounded-lg text-2xl ${avatar === a ? 'bg-fuchsia-600' : 'bg-zinc-800'}`}>{a}</button>))}
      </div>
      {extra}
      <label className="flex gap-3 rounded-lg bg-zinc-800 p-3 text-sm">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        <span>I agree that all wagers use S$ (S$1 = $1) and that net balances will be settled in real money on{' '}
          <b className="text-amber-300">{settlementDate || 'the settlement date'}</b>. I authorize payment of any amount I owe at settlement.</span>
      </label>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button disabled={!valid || busy} onClick={submit}
        className="w-full rounded-lg bg-fuchsia-600 py-3 font-bold transition enabled:hover:bg-fuchsia-500 disabled:opacity-40">
        {busy ? 'One sec…' : submitLabel}</button>
    </div>
  );
}
