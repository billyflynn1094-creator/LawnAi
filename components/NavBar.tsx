'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ChevronLeft } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hidden on the home page
  if (pathname === '/') return null;

  return (
    <nav className="sticky top-0 z-50 h-12 flex items-center bg-[#020c17]/95 backdrop-blur-md border-b border-white/[0.07]">
      <div className="max-w-lg mx-auto w-full px-3 flex items-center gap-1">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
          aria-label="Go to home"
        >
          <Home size={14} />
          <span>Home</span>
        </Link>
        <div className="h-4 w-px bg-white/15 mx-0.5" />
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
          aria-label="Go back"
        >
          <ChevronLeft size={14} />
          <span>Back</span>
        </button>
      </div>
    </nav>
  );
}
