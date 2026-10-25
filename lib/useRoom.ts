'use client';
import { useEffect, useState } from 'react';
import { supabase, Member, Wallet, GameSession } from './supabase';

/** Loads room state and keeps it live via Supabase Realtime. */
export function useRoom(roomId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [games, setGames] = useState<GameSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [m, w, g] = await Promise.all([
        supabase.from('room_members').select('user_id, role, profiles(username, avatar)').eq('room_id', roomId),
        supabase.from('wallets').select('user_id, balance').eq('room_id', roomId),
        supabase.from('game_sessions').select('*').eq('room_id', roomId).order('created_at', { ascending: false }),
      ]);
      const err = m.error || w.error || g.error;
      if (err) return setError(err.message);
      setMembers(m.data as any); setWallets(w.data as any); setGames(g.data as any);
    };
    load();
    const ch = supabase.channel(`room:${roomId}`);
    for (const table of ['room_members', 'wallets', 'game_sessions'])
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `room_id=eq.${roomId}` }, load);
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  return { members, wallets, games, error };
}
