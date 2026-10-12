"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const TIMER_KEY = "bungou_writing_timer_v1"

// app/layout.tsx に常駐。ページ遷移・スクロール後も画面上部に固定する。
export default function GlobalTimerNotice() {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [seconds, setSeconds] = useState(null)
  const [finished, setFinished] = useState(false)
  const [dismissedEndAt, setDismissedEndAt] = useState(null)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data?.user?.id || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id || null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const check = () => {
      if (!userId) { setSeconds(null); setFinished(false); return }
      try {
        const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null")
        if (!saved || saved.userId !== userId || saved.status === "submitted" ||
            !Number.isFinite(saved.endAt) || !Number.isInteger(saved.minutes) ||
            saved.minutes < 1 || saved.minutes > 1440 || !saved.bungouId) {
          setSeconds(null)
          setFinished(false)
          return
        }
        const left = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000))
        const expired = saved.status === "finished" || left === 0
        if (expired && saved.status === "running") {
          localStorage.setItem(TIMER_KEY, JSON.stringify({ ...saved, status: "finished" }))
        }
        setSeconds(expired ? 0 : left)
        setFinished(expired && saved.endAt !== dismissedEndAt)
      } catch (error) {
        console.error("タイマーの確認に失敗しました:", error)
        setSeconds(null)
        setFinished(false)
      }
    }
    check()
    const interval = window.setInterval(check, 1000)
    window.addEventListener("focus", check)
    window.addEventListener("storage", check)
    window.addEventListener("bungou:timer-start", check)
    document.addEventListener("visibilitychange", check)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", check)
      window.removeEventListener("storage", check)
      window.removeEventListener("bungou:timer-start", check)
      document.removeEventListener("visibilitychange", check)
    }
  }, [userId, dismissedEndAt, pathname])

  const excluded = ["/login", "/signup", "/register", "/auth", "/forgot-password", "/reset-password"]
    .some(route => pathname === route || pathname.startsWith(`${route}/`))
  if (!userId || excluded) return null

  const dismiss = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null")
      setDismissedEndAt(saved?.endAt ?? null)
    } catch { /* no-op */ }
    setFinished(false)
  }

  return (
    <>
      {seconds !== null && seconds > 0 && (
        <div role="timer" aria-label="執筆タイマー"
          className="fixed left-1/2 top-[max(5.5rem,env(safe-area-inset-top))] z-[250] -translate-x-1/2 whitespace-nowrap rounded-2xl border border-[#f2e3d2] bg-white/95 px-5 py-3 text-sm font-bold text-[#775b45] shadow-xl backdrop-blur-sm sm:text-base">
          ⏱ 残り時間：{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </div>
      )}
      {pathname !== "/" && finished && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="global-timer-title">
          <div className="w-full max-w-sm rounded-3xl border border-[#f2e3d2] bg-white p-6 text-center text-[#775b45] shadow-xl">
            <div className="mb-3 text-4xl" aria-hidden="true">⏰</div>
            <h2 id="global-timer-title" className="mb-3 text-xl font-bold">執筆時間が終了しました！</h2>
            <p className="mb-6 text-sm text-[#927b69]">お疲れさまでした。ホームに戻って執筆文字数を記録しましょう。</p>
            <button type="button" onClick={() => router.push("/")} className="mb-3 w-full rounded-2xl bg-[#efa76d] px-4 py-3 font-bold text-white hover:bg-[#df965a]">文字数を記録する</button>
            <button type="button" onClick={dismiss} className="w-full rounded-2xl border border-[#f2e3d2] px-4 py-3 text-sm font-semibold hover:bg-[#fff9f0]">後で記録する</button>
          </div>
        </div>
      )}
    </>
  )
}
