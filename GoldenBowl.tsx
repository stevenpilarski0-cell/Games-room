'use client';
import { useState } from 'react';
import { supabase, GameSession } from '@/lib/supabase';

const SIZE = 6;
/** Each player hides 5 gold bars in their bowl (stored server-side only). Call shots at the opponent's bowl. */
export default function GoldenBowl({ game, me }: { game: GameSession; me: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shots: number[] = game.state.shots?.[me] ?? [];
  const hits: number[] = game.state.hits?.[me] ?? [];
  const myTurn = game.status === 'active' && game.state.turn === me;

  const shoot = async (cell: number) => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('golden_shot', { p_game: game.id, p_cell: cell });
    if (error) setErr(error.message);
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <p className="text-sm text-amber-300">The Golden Bowl · Pot S$ {game.stake * (game.players.length - 1)} · Gold found {hits.length}/5</p>
      <div className="grid grid-cols-6 gap-1.5 rounded-[2rem] border-2 border-amber-500/50 bg-zinc-900 p-3">
        {Array.from({ length: SIZE * SIZE }, (_, c) => {
          const called = shots.includes(c), gold = hits.includes(c);
          return (
            <button key={c} disabled={!myTurn || called || busy} onClick={() => shoot(c)} aria-label={`Cell ${c}`}
              className={`aspect-square rounded-md text-lg transition ${gold ? 'bg-amber-400 text-black'
                : called ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-800 enabled:hover:bg-zinc-700'} disabled:cursor-not-allowed`}>
              {gold ? '🪙' : called ? '·' : ''}
            </button>);
        })}
      </div>
      <p className="font-semibold">
        {game.status === 'done' ? (game.winner_id === me ? '🏆 You found all the gold!' : 'Opponent cleaned you out') : myTurn ? 'Call a coordinate' : "Opponent's turn"}
      </p>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
