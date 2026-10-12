"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Badge = { id: string | number; key: string; icon: string | null; name: string; description: string | null }
type OwnedBadge = { badge_key: string }

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<OwnedBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  const fetchData = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error("ログインが必要です。")

      const [allResult, ownedResult] = await Promise.all([
        supabase.from("badges").select("id,key,icon,name,description"),
        supabase.from("user_badges").select("badge_key").eq("user_id", auth.user.id),
      ])
      if (allResult.error) throw allResult.error
      if (ownedResult.error) throw ownedResult.error
      if (!isActive()) return
      setBadges((allResult.data ?? []) as Badge[])
      setUserBadges((ownedResult.data ?? []) as OwnedBadge[])
    } catch (error) {
      console.error("バッジ一覧取得エラー:", error)
      if (isActive()) setErrorMessage(error instanceof Error && error.message === "ログインが必要です。" ? error.message : "バッジ一覧を取得できませんでした。")
    } finally {
      if (isActive()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchData(() => active)
    return () => { active = false }
  }, [fetchData, retryKey])

  const ownedKeys = new Set(userBadges.map(b => b.badge_key))

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-bold">バッジ一覧</h1>
      {loading ? (
        <div role="status" aria-busy="true" aria-label="バッジ一覧を読み込み中" className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3 sm:grid-cols-4 sm:gap-4">
          <span className="sr-only">バッジ一覧を読み込んでいます</span>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} aria-hidden="true" className="aspect-square animate-pulse rounded-xl border bg-gray-100 p-3 motion-reduce:animate-none">
              <div className="mx-auto mt-3 h-8 w-8 rounded-full bg-gray-200" />
              <div className="mx-auto mt-3 h-3 w-3/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => setRetryKey(n => n + 1)} className="mt-4 min-h-11 rounded-lg border border-red-300 bg-white px-5 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">再試行する</button>
        </div>
      ) : badges.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-600">現在、表示できるバッジはありません。</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3 sm:grid-cols-4 sm:gap-4">
          {badges.map(badge => {
            const owned = ownedKeys.has(badge.key)
            return (
              <div key={badge.id} className={`group relative flex min-w-0 aspect-square flex-col items-center justify-center rounded-xl border p-2 sm:p-3 shadow-sm ${owned ? "bg-white" : "bg-gray-100 opacity-40"}`} title={badge.description ?? undefined}>
                <div className="text-2xl">{badge.icon}</div>
                <div className="mt-2 break-words text-center text-xs text-gray-700">{badge.name}</div>
                {badge.description && <div className="absolute bottom-full z-10 mb-2 hidden rounded bg-black px-2 py-1 text-xs text-white group-hover:block group-focus-within:block">{badge.description}</div>}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
