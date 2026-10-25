'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, joinRoom } from '@/lib/supabase';
import { ensureSession, saveProfile } from '@/lib/auth';
import ProfileForm from '@/components/ProfileForm';
import Lobby, { type RoomInfo } from '@/components/Lobby';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [me, setMe] = useState('');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = new URLSearchParams(location.search).get('invite') ?? '';
        setInvite(token);

        const user = await ensureSession();
        setMe(user.id);

        const { data: mem } = await supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (mem) {
          const { data, error: e } = await supabase
            .from('rooms')
            .select('settlement_date, invite_token')
            .eq('id', roomId)
            .single();
          if (e) throw new Error(e.message);
          setRoom(data);
          setIsMember(true);
          return;
        }

        if (!token) throw new Error('You need an invite link to join this room.');

        const { data: preview, error: e } = await supabase.rpc('room_preview', { p_room: roomId, p_token: token });
        if (e || !preview) throw new Error('Invalid invite link.');
        if (preview.players >= preview.max) throw new Error('This room is full (6 players max).');

        setRoom({ settlement_date: preview.settlement_date, invite_token: token });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  const join = async (username: string, avatar: string) => {
    if (!invite) throw new Error('Missing invite token.');
    const user = await ensureSession();
    await saveProfile(user.id, username, avatar);
    await joinRoom(roomId, invite);
    location.replace(location.pathname);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-zinc-300">Loading room…</main>;
  }

  if (error) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-red-400">{error}</main>;
  }

  if (isMember && room) {
    return <Lobby roomId={roomId} me={me} room={room} />;
  }

  if (room) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <ProfileForm
          settlementDate={room.settlement_date}
          submitLabel="Enter the Arena (S$ 100)"
          onSubmit={join}
        />
      </main>
    );
  }

  return <main className="flex min-h-screen items-center justify-center p-6 text-red-400">Room not found.</main>;
}
