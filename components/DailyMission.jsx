"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function DailyMission() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [celebrating, setCelebrating] = useState(false)
  const [claimCelebrating, setClaimCelebrating] = useState(false)
  const celebrationTimer = useRef(null)
  const claimTimer = useRef(null)
  const celebrationSeen = useRef(new Set())

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("daily_mission_status")
    if (rpcError) { setError(rpcError.message); return }
    setStatus(data)
    setError("")
    // 同じ日の達成演出は一度だけ。再読み込み時も繰り返さない。
    if (data?.completed && data?.day) {
      const key = `bungou:daily-mission-celebrated:${data.day}`
      let seen = celebrationSeen.current.has(key)
      try { seen = seen || window.sessionStorage.getItem(key) === "1" } catch {}
      if (!seen) {
        celebrationSeen.current.add(key)
        try { window.sessionStorage.setItem(key, "1") } catch {}
        setCelebrating(true)
        if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current)
        celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 5000)
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      await refresh()
      if (active) setLoading(false)
    }
    void load()
    const interval = window.setInterval(() => void refresh(), 30000)
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh() }
    const onWriting = () => void refresh()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("bungou:writing-saved", onWriting)
    return () => {
      active = false
      window.clearInterval(interval)
      if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current)
      if (claimTimer.current) window.clearTimeout(claimTimer.current)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("bungou:writing-saved", onWriting)
    }
  }, [refresh])

  const claim = async () => {
    if (claiming || !status?.completed || status?.claimed) return
    setClaiming(true)
    setError("")
    setMessage("")
    try {
      const { data, error: claimError } = await supabase.rpc("daily_mission_claim")
      if (claimError) throw claimError
      setMessage(`ミッション達成！ ${data.points}ポイント獲得（${data.streak}日連続）`)
      setClaimCelebrating(true)
      if (claimTimer.current) window.clearTimeout(claimTimer.current)
      claimTimer.current = window.setTimeout(() => setClaimCelebrating(false), 4500)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ポイントを受け取れませんでした")
      await refresh()
    } finally { setClaiming(false) }
  }

  const current = Math.max(0, Number(status?.progress) || 0)
  const target = Math.max(1, Number(status?.target) || 1)
  const percentage = Math.min(100, Math.round(current / target * 100))
  const unit = status?.kind === "words" ? "文字" : status?.kind === "minutes" ? "分" : "体"

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#f2e3d2] bg-[#fffaf4] p-5" aria-label="デイリーミッション">
      {(celebrating || claimCelebrating) && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="absolute top-[-12px] animate-[mission-fall_2.8s_ease-in_forwards] text-xl motion-reduce:hidden"
              style={{ left: `${(i * 37 + 9) % 100}%`, animationDelay: `${(i % 6) * 0.18}s`, animationDuration: `${2.1 + (i % 4) * 0.3}s` }}>
              {i % 3 === 0 ? "✨" : i % 3 === 1 ? "🌸" : "⭐"}
            </span>
          ))}
        </div>
      )}
      <style>{`@keyframes mission-fall { from { transform: translateY(-20px) rotate(0deg); opacity: 1; } to { transform: translateY(340px) rotate(180deg); opacity: 0; } }`}</style>
      {celebrating && (
        <div role="status" className="relative z-20 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center font-bold text-amber-900 motion-safe:animate-pulse">
          🎉 デイリーミッション達成！
          <p className="mt-1 text-xs font-normal">下のボタンからポイントを受け取れます</p>
        </div>
      )}
      {claimCelebrating && (
        <div role="status" className="relative z-20 mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center font-bold text-green-800">
          🎊 ポイント獲得おめでとう！
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-[#775b45]">🎯 今日のデイリーミッション</h3>
        {status && <span className="text-xs text-[#927b69]">{status.day}（日本時間）</span>}
      </div>
      {loading && !status ? <p className="mt-3 text-sm">読み込み中...</p> : status ? (
        <>
          <p className="mt-3 text-lg font-bold text-[#775b45]">{status.title}</p>
          <p className="mt-1 text-sm text-[#927b69]">進捗：{current.toLocaleString()} / {target.toLocaleString()} {unit}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#f2e1d0]" role="progressbar" aria-label="ミッション進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
            <div className="h-full rounded-full bg-[#efa76d] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-3 text-sm text-[#927b69]">
            {status.claimed ? "本日の報酬は受け取り済みです" : status.completed ? "達成！ 報酬を受け取れます" : `達成まであと ${Math.max(0, target-current).toLocaleString()} ${unit}`}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-[#775b45]">🔥 連続達成：{status.streak}日</span>
            <button type="button" disabled={!status.completed || status.claimed || claiming}
              onClick={claim} className="rounded-xl bg-[#efa76d] px-4 py-2 text-sm font-bold text-white hover:bg-[#db9258] disabled:cursor-not-allowed disabled:opacity-50">
              {status.claimed ? "受け取り済み" : claiming ? "受け取り中..." : `${status.next_points}ptを受け取る`}
            </button>
          </div>
        </>
      ) : null}
      {message && <p role="status" className="mt-3 text-sm font-bold text-[#7b653c]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
