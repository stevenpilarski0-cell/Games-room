import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'Steve Dollars Arena', description: 'Private peer-to-peer game room' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{children}</body></html>;
}
