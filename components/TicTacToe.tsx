'use client';
import { useState } from 'react';
import { supabase, GameSession } from '@/lib/supabase';

export default function TicTacToe({ game, me }: { game: GameSession; me: string }) {
  const [err, setErr] = useState<string | null>(null);
  const board: string[] = game.state.board;
  const myTurn = game.status === 'active' && game.state.turn === me;

  const play = async (i: number) => {
    setErr(null);
    const { error } = await supabase.rpc('ttt_move', { p_game: game.id, p_cell: i }); // server validates + settles
    if (error) setErr(error.message);
  };
  const status = game.status === 'done'
    ? game.winner_id ? (game.winner_id === me ? `You win S$${game.stake}!` : `You lose S$${game.stake}`) : 'Draw — no S$ moves'
    : myTurn ? 'Your move' : "Opponent's move";

  return (
    <div className="mx-auto max-w-xs space-y-4 text-center">
      <p className="text-sm text-fuchsia-300">Kick That Toe · Stake S$ {game.stake}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((c, i) => (
          <button key={i} disabled={!myTurn || !!c} onClick={() => play(i)}
            className="aspect-square rounded-xl border border-fuchsia-500/40 bg-zinc-900 text-4xl font-black
                       text-cyan-300 transition enabled:hover:bg-zinc-800 disabled:cursor-not-allowed">{c}</button>
        ))}
      </div>
      <p className="font-semibold">{status}</p>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
