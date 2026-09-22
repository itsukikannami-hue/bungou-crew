"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  message: string
  link_url: string
  duration_days: number
  price: number
  status: string
  start_at: string
  end_at: string
  impression_count: number
  click_count: number
  created_at: string
}

export default function AdStatsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAds = async () => {
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error(
        "ユーザー取得エラー:",
        userError
      )

      setAds([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("ads")
      .select(`
        id,
        message,
        link_url,
        duration_days,
        price,
        status,
        start_at,
        end_at,
        impression_count,
        click_count,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error(
        "広告統計取得エラー:",
        error
      )

      setAds([])
      setLoading(false)
      return
    }

    setAds((data ?? []) as Ad[])
    setLoading(false)
  }

  useEffect(() => {
    fetchAds()
  }, [])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString(
      "ja-JP",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    )
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "掲載中"

      case "ended":
        return "掲載終了"

      case "stopped":
        return "停止"

      case "pending":
        return "準備中"

      default:
        return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"

      case "ended":
        return "bg-gray-100 text-gray-600"

      case "stopped":
        return "bg-red-100 text-red-700"

      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const calculateCtr = (
    impressions: number,
    clicks: number
  ) => {
    if (impressions === 0) {
      return "0.00"
    }

    return (
      (clicks / impressions) *
      100
    ).toFixed(2)
  }

  const totalImpressions = ads.reduce(
    (sum, ad) =>
      sum + (ad.impression_count ?? 0),
    0
  )

  const totalClicks = ads.reduce(
    (sum, ad) =>
      sum + (ad.click_count ?? 0),
    0
  )

  const totalPoints = ads.reduce(
    (sum, ad) =>
      sum + (ad.price ?? 0),
    0
  )

  const totalCtr =
    totalImpressions === 0
      ? "0.00"
      : (
          (totalClicks /
            totalImpressions) *
          100
        ).toFixed(2)

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-gray-500">
          広告統計を読み込んでいます...
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">

      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            広告統計
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            出稿した広告の掲載状況や実績を確認できます。
          </p>
        </div>

        <Link
          href="/items"
          className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          アイテムショップへ
        </Link>
      </div>

      {/* 全体統計 */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            出稿広告数
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {ads.length}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            件
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            総表示回数
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalImpressions.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            回
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            総クリック数
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalClicks.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            回
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            全体クリック率
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalCtr}%
          </p>

          <p className="mt-1 text-xs text-gray-400">
            CTR
          </p>
        </div>

      </section>

      {/* 使用ポイント */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              広告に使用したポイント
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalPoints.toLocaleString()} pt
            </p>
          </div>

          <div className="text-3xl">
            📢
          </div>
        </div>
      </section>

      {/* 広告一覧 */}
      <section className="mt-8">

        <h2 className="text-xl font-bold text-gray-900">
          出稿した広告
        </h2>

        {ads.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              まだ広告を出稿していません。
            </p>

            <Link
              href="/items"
              className="mt-5 inline-block rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
            >
              広告を出稿する
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-5">

            {ads.map((ad) => {
              const impressions =
                ad.impression_count ?? 0

              const clicks =
                ad.click_count ?? 0

              const ctr = calculateCtr(
                impressions,
                clicks
              )

              return (
                <article
                  key={ad.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >

                  {/* 広告ヘッダー */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          📢
                        </span>

                        <span className="text-xs font-bold text-gray-400">
                          スポンサー広告
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(
                            ad.status
                          )}`}
                        >
                          {getStatusLabel(
                            ad.status
                          )}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                        {ad.message}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-400">
                        使用ポイント
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {ad.price.toLocaleString()} pt
                      </p>
                    </div>

                  </div>

                  {/* 統計 */}
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        表示回数
                      </p>

                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {impressions.toLocaleString()}
                      </p>

                      <p className="text-xs text-gray-400">
                        回
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        クリック数
                      </p>

                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {clicks.toLocaleString()}
                      </p>

                      <p className="text-xs text-gray-400">
                        回
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        クリック率
                      </p>

                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {ctr}%
                      </p>

                      <p className="text-xs text-gray-400">
                        CTR
                      </p>
                    </div>

                  </div>

                  {/* 掲載情報 */}
                  <div className="mt-6 border-t border-gray-100 pt-5">

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                      <div>
                        <p className="text-xs text-gray-400">
                          掲載期間
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {ad.duration_days}日
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          掲載開始
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatDate(ad.start_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          掲載終了
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatDate(ad.end_at)}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* URL */}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <p className="max-w-full truncate text-xs text-gray-400">
                      {ad.link_url}
                    </p>

                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                    >
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