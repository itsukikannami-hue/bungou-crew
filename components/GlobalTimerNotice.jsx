"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const TIMER_KEY = "bungou_writing_timer_v1";

// ホーム画面の HomeBungou が持つ結果入力・EXP付与処理はそのまま使用する。
// 他ページでは共通の終了モーダルを表示し、ホームの結果入力へ誘導する。
export default function GlobalTimerNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [finished, setFinished] = useState(false);
  const [dismissedEndAt, setDismissedEndAt] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id || null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) { setFinished(false); return; }
    const check = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
        if (!saved || saved.userId !== userId || saved.status === "submitted" ||
            !Number.isFinite(saved.endAt) || !Number.isInteger(saved.minutes) ||
            saved.minutes < 1 || saved.minutes > 1440 || typeof saved.bungouId !== "string") {
          setFinished(false);
          return;
        }
        const expired = saved.status === "finished" || saved.endAt <= Date.now();
        if (expired && saved.status === "running") {
          localStorage.setItem(TIMER_KEY, JSON.stringify({ ...saved, status: "finished" }));
        }
        setFinished(expired && saved.endAt !== dismissedEndAt);
      } catch (error) {
        console.error("共通タイマーの確認に失敗しました:", error);
        setFinished(false);
      }
    };
    check();
    const interval = window.setInterval(check, 1000);
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [userId, dismissedEndAt, pathname]);

  // ホームでは既存の終了モーダルを表示する。ログイン画面などでも表示しない。
  if (pathname === "/" || !userId || !finished ||
      ["/login", "/signup", "/register", "/auth", "/forgot-password", "/reset-password"]
        .some(route => pathname === route || pathname.startsWith(`${route}/`))) return null;

  const dismiss = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
      setDismissedEndAt(saved?.endAt ?? null);
    } catch { setFinished(false); }
    setFinished(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="global-timer-title">
      <div className="w-full max-w-sm rounded-3xl border border-[#f2e3d2] bg-white p-6 text-center text-[#775b45] shadow-xl">
        <div className="mb-3 text-4xl" aria-hidden="true">⏰</div>
        <h2 id="global-timer-title" className="mb-3 text-xl font-bold">執筆時間が終了しました！</h2>
        <p className="mb-6 text-sm text-[#927b69]">お疲れさまでした。ホームに戻って執筆文字数を記録しましょう。</p>
        <button type="button" onClick={() => router.push("/")} className="mb-3 w-full rounded-2xl bg-[#efa76d] px-4 py-3 font-bold text-white hover:bg-[#df965a]">文字数を記録する</button>
        <button type="button" onClick={dismiss} className="w-full rounded-2xl border border-[#f2e3d2] px-4 py-3 text-sm font-semibold hover:bg-[#fff9f0]">後で記録する</button>
      </div>
    </div>
  );
}
