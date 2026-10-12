"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ToastProvider"

type Ad = {
  id: string
  message: string
  link_url: string
  duration_days: number
  price: number
  status: string
  start_at: string | null
  end_at: string | null
  impression_count: number | null
  click_count: number | null
  created_at: string
}

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

function formatDate(value: string | null) {
  if (!value) return "未定"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "日時不明"
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getPublication(ad: Ad, now: number) {
  const start = ad.start_at ? Date.parse(ad.start_at) : NaN
  const end = ad.end_at ? Date.parse(ad.end_at) : NaN

  if (ad.status === "stopped") {
    return { label: "停止中", detail: "掲載が停止されています", warning: false, kind: "stopped" }
  }
  if (ad.status === "ended") {
    return { label: "掲載終了", detail: "掲載期間は終了しました", warning: false, kind: "ended" }
  }
  if (ad.status === "pending") {
    return { label: "準備中", detail: "掲載開始待ちです", warning: false, kind: "pending" }
  }
  if (ad.status !== "active") {
    return { label: ad.status, detail: "掲載状態を確認してください", warning: false, kind: "unknown" }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { label: "掲載情報未設定", detail: "掲載日時を確認してください", warning: false, kind: "unknown" }
  }
  if (now < start) {
    return { label: "掲載開始前", detail: `掲載開始：${formatDate(ad.start_at)}`, warning: false, kind: "pending" }
  }
  if (now >= end) {
    return { label: "掲載終了", detail: "掲載期間は終了しました", warning: false, kind: "ended" }
  }

  const remaining = end - now
  const days = Math.ceil(remaining / DAY)
  const hours = Math.ceil(remaining / HOUR)
  const detail = remaining < HOUR
    ? "掲載終了まで1時間未満"
    : remaining < DAY
      ? `残り${hours}時間`
      : `残り${days}日`

  return { label: "掲載中", detail, warning: remaining <= 3 * DAY, kind: "active" }
}

function statusClass(kind: string) {
  switch (kind) {
    case "active": return "bg-green-100 text-green-700"
    case "stopped": return "bg-red-100 text-red-700"
    case "pending": return "bg-amber-100 text-amber-800"
    default: return "bg-gray-100 text-gray-600"
  }
}

function ctr(impressions: number, clicks: number) {
  return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00"
}

export default function AdStatsPage() {
  const toast = useToast()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [now, setNow] = useState<number | null>(null)

  const fetchAds = useCallback(async () => {
    setLoading(true)
    setError("")

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setAds([])
      setError("広告統計を見るにはログインが必要です。")
      toast.error("広告統計を見るにはログインが必要です。")
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from("ads")
      .select(`
        id, message, link_url, duration_days, price, status,
        start_at, end_at, impression_count, click_count, created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("広告統計取得エラー:", fetchError)
      setError("広告統計を取得できませんでした。時間をおいて再度お試しください。")
      toast.error("広告統計を取得できませんでした。時間をおいて再度お試しください。")
      setAds([])
    } else {
      setAds((data ?? []) as Ad[])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    void fetchAds()
    return () => window.clearInterval(timer)
  }, [fetchAds])

  const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impression_count ?? 0), 0)
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.click_count ?? 0), 0)
  const totalPoints = ads.reduce((sum, ad) => sum + (ad.price ?? 0), 0)

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6" role="status" aria-busy="true" aria-label="広告統計を読み込み中">
        <span className="sr-only">広告統計を読み込んでいます</span>
        <div className="animate-pulse space-y-7 motion-reduce:animate-none">
          <div aria-hidden="true" className="space-y-3">
            <div className="h-9 w-36 rounded-lg bg-gray-200" />
            <div className="h-4 w-64 max-w-full rounded bg-gray-100" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} aria-hidden="true" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-4 h-9 w-28 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-12 rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-44 rounded bg-gray-200" />
            <div className="mt-4 h-8 w-28 rounded bg-gray-200" />
          </div>
          {[1, 2].map((n) => (
            <div key={n} aria-hidden="true" className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-6 w-2/3 rounded bg-gray-200" />
              <div className="mt-4 h-4 w-full rounded bg-gray-100" />
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100" />)}
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">広告統計</h1>
          <p className="mt-2 text-sm text-gray-500">出稿した広告の掲載状況や実績を確認できます。</p>
        </div>
        <Link href="/items" className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-50">
          アイテムショップへ
        </Link>
      </header>

      {error && (
        <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchAds()} className="ml-3 font-bold underline">再試行</button>
        </div>
      )}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="全体統計">
        {[
          { label: "出稿広告数", value: ads.length.toLocaleString(), unit: "件" },
          { label: "総表示回数", value: totalImpressions.toLocaleString(), unit: "回" },
          { label: "総クリック数", value: totalClicks.toLocaleString(), unit: "回" },
          { label: "全体クリック率", value: `${ctr(totalImpressions, totalClicks)}%`, unit: "CTR" },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs text-gray-400">{item.unit}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">広告に使用したポイント</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()} pt</p>
          </div>
          <span className="text-3xl" aria-hidden="true">📢</span>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">出稿した広告</h2>
          <button type="button" onClick={() => void fetchAds()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            統計を更新
          </button>
        </div>

        {ads.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">{error ? "広告一覧を表示できません。" : "まだ広告を出稿していません。"}</p>
            {!error && <Link href="/items" className="mt-5 inline-block rounded-xl bg-[#d78f57] px-5 py-3 text-sm font-bold text-white hover:bg-[#c88047]">広告を出稿する</Link>}
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {ads.map(ad => {
              const impressions = ad.impression_count ?? 0
              const clicks = ad.click_count ?? 0
              const publication = getPublication(ad, now ?? Date.now())
              return (
                <article key={ad.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span aria-hidden="true">📢</span>
                        <span className="text-xs font-bold text-gray-400">スポンサー広告</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(publication.kind)}`}>
                          {publication.label}
                        </span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">{ad.message}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs text-gray-400">使用ポイント</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{(ad.price ?? 0).toLocaleString()} pt</p>
                    </div>
                  </div>

                  <div className={`mt-5 rounded-xl border p-4 ${publication.warning ? "border-amber-300 bg-amber-50" : "border-[#f0e1d2] bg-[#fffaf4]"}`}>
                    <p className="text-xs font-semibold text-gray-600">掲載残り時間</p>
                    <p className="mt-1 text-xl font-bold text-gray-900" aria-live="off">{publication.detail}</p>
                    {publication.warning && <p className="mt-1 text-sm font-semibold text-amber-800">掲載終了が近づいています。</p>}
                    <p className="mt-2 text-xs text-gray-500">掲載終了予定：{formatDate(ad.end_at)}</p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: "表示回数", value: impressions.toLocaleString(), unit: "回" },
                      { label: "クリック数", value: clicks.toLocaleString(), unit: "回" },
                      { label: "クリック率", value: `${ctr(impressions, clicks)}%`, unit: "CTR" },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
                        <p className="text-xs text-gray-400">{item.unit}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div><p className="text-xs text-gray-400">掲載期間</p><p className="mt-1 text-sm font-medium text-gray-800">{ad.duration_days}日</p></div>
                      <div><p className="text-xs text-gray-400">掲載開始</p><p className="mt-1 text-sm font-medium text-gray-800">{formatDate(ad.start_at)}</p></div>
                      <div><p className="text-xs text-gray-400">掲載終了</p><p className="mt-1 text-sm font-medium text-gray-800">{formatDate(ad.end_at)}</p></div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate text-xs text-gray-400">{ad.link_url}</p>
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-50">
                      作品ページを開く ↗
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
