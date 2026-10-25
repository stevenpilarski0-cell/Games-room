import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export type Member = { user_id: string; role: 'root' | 'player'; profiles: { username: string; avatar: string } };
export type Wallet = { user_id: string; balance: number };
export type GameSession = {
  id: string; room_id: string; game: 'rps' | 'coin' | 'tictactoe' | 'checkers' | 'golden_bowl';
  players: string[]; stake: number; status: 'active' | 'done'; winner_id: string | null;
  state: Record<string, any>;
};

/** Root creates a room; returns the shareable invite link. */
export async function createRoom(settlementDate: string) {
  const { data, error } = await supabase.rpc('create_room', { p_settlement: settlementDate });
  if (error) throw new Error(error.message);
  return { roomId: data.id as string, link: `${location.origin}/room/${data.id}?invite=${data.invite_token}` };
}
/** Call only after the terms modal is accepted and the profile exists. */
export async function joinRoom(roomId: string, token: string) {
  const { error } = await supabase.rpc('join_room', { p_room: roomId, p_token: token });
  if (error) throw new Error(error.message);
}
