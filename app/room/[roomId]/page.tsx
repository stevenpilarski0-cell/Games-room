'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, joinRoom } from '@/lib/supabase';
import { ensureSession, saveProfile } from '@/lib/auth';
import { useRoom } from '@/lib/useRoom';
import ProfileForm from '@/components/ProfileForm';
import Sidebar from '@/components/Sidebar';
import TicTacToe from '@/components/TicTacToe';
import GoldenBowl from '@/components/GoldenBowl';

type RoomInfo = { settlement_date: string; invite_token?: string };

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [gate, setGate] = useState<'loading' | 'onboard' | 'ready'>('loading');
  const [me, setMe] = useState('');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = new URLSearchParams(location.search).get('invite') ?? '';
        setInvite(token);
        const user = await ensureSession(); setMe(user.id);
        const { data: mem } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).eq('user_id', user.id).maybeSingle();
        if (mem) {
          const { data, error: e } = await supabase.from('rooms').select('settlement_date, invite_token').eq('id', roomId).single();
          if (e) throw new Error(e.message);
          setRoom(data); return setGate('ready');
        }
        if (!token) throw new Error('You need an invite link to join this room.');
        const { data: pv, error: e } = await supabase.rpc('room_preview', { p_room: roomId, p_token: token });
        if (e || !pv) throw new Error('Invalid invite link.');
        if (pv.players >= pv.max) throw new Error('This room is full (6 players max).');
        setRoom
