import { Member, Wallet } from '@/lib/supabase';

export const GAMES = [
  { id: 'tictactoe', label: 'Kick That Toe', ready: true }, { id: 'golden_bowl', label: 'Golden Bowl', ready: true },
  { id: 'rps', label: 'Rock Paper Scissors', ready: false }, { id: 'coin', label: 'Flip a Coin', ready: false },
  { id: 'checkers', label: 'Checkers', ready: false },
] as const;

export default function Sidebar({ members, wallets, me, active, onSelect }: {
  members: Member[]; wallets: Wallet[]; me: string; active: string; onSelect: (g: string) => void;
}) {
  const bal = (id: string) => wallets.find(w => w.user_id === id)?.balance ?? 0;
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-zinc-800 bg-zinc-950 p-4 md:w-64 md:border-b-0 md:border-r">
      <div>
        <h1 className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-xl font-black text-transparent">STEVE DOLLARS ARENA</h1>
        <p className="mt-2 text-3xl font-black text-emerald-400">S$ {bal(me).toFixed(2)}</p>
      </div>
      <nav className="flex flex-wrap gap-2 md:flex-col" aria-label="Games">
        {GAMES.map(g => (
          <button key={g.id} disabled={!g.ready} onClick={() => onSelect(g.id)}
            className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${active === g.id ? 'bg-fuchsia-600 text-white'
              : 'bg-zinc-900 text-zinc-300 enabled:hover:bg-zinc-800'} disabled:opacity-40`}>{g.label}{!g.ready && ' · soon'}</button>
        ))}
      </nav>
      <ul className="space-y-1 text-sm" aria-label="Players">
        <li className="text-xs uppercase tracking-widest text-zinc-500">Players {members.length}/6</li>
        {members.map(m => (
          <li key={m.user_id} className="flex justify-between rounded bg-zinc-900 px-2 py-1.5">
            <span>{m.profiles.avatar} {m.profiles.username}{m.role === 'root' && ' 👑'}</span>
            <span className="font-mono text-emerald-400">{bal(m.user_id).toFixed(0)}</span>
          </li>))}
      </ul>
    </aside>
  );
}
