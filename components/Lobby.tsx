'use client';
import { useState } from 'react';
import Settlement from '@/components/Settlement';
import { supabase } from '@/lib/supabase';
import { useRoom } from '@/lib/useRoom';
import Sidebar from '@/components/Sidebar';
import TicTacToe from '@/components/TicTacToe';
import GoldenBowl from '@/components/GoldenBowl';

export type RoomInfo = { settlement_date: string; invite_token?: string };

export default function Lobby({ roomId, me, room }: { roomId: string; me: string; room: RoomInfo }) {
  const { members, wallets, games, error } = useRoom(roomId);
  const [tab, setTab] = useState('tictactoe');
  const [opp, setOpp] = useState('');
  const [stake, setStake] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mine = games.filter(g => g.game === tab && g.players.includes(me));
  const active = mine.find(g => g.status === 'active');
  const shown = active ?? mine[0];
  const others = members.filter(m => m.user_id !== me);
  const isRoot = members.find(m => m.user_id === me)?.role === 'root';
  const link = `${typeof location !== 'undefined' ? location.origin : ''}/room/${roomId}?invite=${room.invite_token}`;

  const start = async () => {
    setErr(null);
    const { error: e } = await supabase.rpc('start_game', { p_room: roomId, p_game: tab, p_players: [me, opp], p_stake: stake });
    if (e) setErr(e.message);
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar members={members} wallets={wallets} me={me} active={tab} onSelect={setTab} />
      <main className="flex-1 space-y-6 p-4 md:p-8">
        {error && <p role="alert" className="text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
          <span>Settlement date: <b className="text-amber-300">{room.settlement_date}</b></span>
          {isRoot && members.length < 6 && (
            <button onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 font-semibold text-zinc-100 hover:bg-zinc-700">
              {copied ? 'Copied ✓' : `Copy invite link (${members.length}/6)`}</button>)}
        </div>
        {shown && shown.game === 'tictactoe' && <TicTacToe game={shown} me={me} />}
        {shown && shown.game === 'golden_bowl' && <GoldenBowl game={shown} me={me} />}
        {!active && (
          <section className="mx-auto max-w-sm space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-bold">{shown ? 'Play again' : 'Challenge a player'}</h2>
            <select value={opp} onChange={e => setOpp(e.target.value)} className="w-full rounded-lg bg-zinc-800 px-3 py-2" aria-label="Opponent">
              <option value="">Pick an opponent…</option>
              {others.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles.avatar} {m.profiles.username}</option>)}
            </select>
            <label className="block text-sm text-zinc-400">Stake (S$)
              <input type="number" min={1} value={stake} onChange={e => setStake(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100" /></label>
            {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
            <button disabled={!opp} onClick={start} className="w-full rounded-lg bg-emerald-600 py-2.5 font-bold enabled:hover:bg-emerald-500 disabled:opacity-40">Start game</button>
          </section>)}
        <Settlement roomId={roomId} me={me} members={members} wallets={wallets} settlementDate={room.settlement_date} />
      </main>
    </div>
  );
}
