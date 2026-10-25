'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';
import { ensureSession, saveProfile } from '@/lib/auth';
import { createRoom } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [date, setDate] = useState('');
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <ProfileForm settlementDate={date} submitLabel="Create Room (you're the Root 👑)"
        extra={<label className="block text-sm text-zinc-400">Settlement date
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100" /></label>}
        onSubmit={async (username, avatar) => {
          const user = await ensureSession();
          await saveProfile(user.id, username, avatar);
          const { roomId } = await createRoom(date);
          router.push(`/room/${roomId}`);
        }} />
    </main>
  );
}
