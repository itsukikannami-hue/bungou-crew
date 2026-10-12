"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("ログアウトに失敗しました:", error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="relative flex min-h-16 w-full items-center justify-between border-b border-[#F1DDCA] bg-[#FFF9F0] px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-[#E9C7A9] bg-white px-3 py-2 text-xs font-medium text-[#A96F46] transition hover:bg-[#FFF0DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D98949]"
        >
          ログアウト
        </button>
      </div>

      <Link
  href="/"
  className="absolute left-1/2 flex max-w-[48%] -translate-x-1/2 items-center justify-center"
  aria-label="ブンゴウクルー ホーム"
>
  <img
    src="/logo.png"
    alt="ブンゴウクルー"
    className="h-9 w-auto max-w-full object-contain sm:h-11"
  />
</Link>

      <Link
        href="/notifications"
        aria-label="通知を見る"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F1DDCA] bg-white text-[#C18453] transition hover:bg-[#FFF0DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D98949]"
      >
        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      </Link>
    </header>
  );
}
