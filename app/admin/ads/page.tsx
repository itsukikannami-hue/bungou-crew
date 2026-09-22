"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  user_id: string
  message: string
  link_url: string
  start_at: string
  end_at: string
  duration_days: number
  price: number
  status: string
  impression_count: number
  click_count: number
  created_at: string
  profiles: {
    username: string | null
  }[] | null
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [stoppingAdId, setStoppingAdId] = useState<string | null>(null)

  const fetchAds = async () => {
    setLoading(true)
    setErrorMessage("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setErrorMessage("ログインが必要です。")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("ads")
      .select(`
        id,
        user_id,
        message,
        link_url,
        start_at,
        end_at,
        duration_days,
        price,
        status,
        impression_count,
        click_count,
        created_at,
        profiles (
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error("広告一覧取得エラー:", error)

      setErrorMessage(
        "広告一覧の取得に失敗しました。\n" +
        error.message
      )

      setLoading(false)
      return
    }

    setAds((data ?? []) as Ad[])
    setLoading(false)
  }

  const handleStopAd = async (adId: string) => {
    const confirmed = window.confirm(
      "この広告を停止しますか？\n\n停止後は広告ネットワークに表示されなくなります。"
    )

    if (!confirmed) {
      return
    }

    setStoppingAdId(adId)
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adId,
          action: "stop",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "広告の停止に失敗しました。"
        )
      }

      alert("広告を停止しました。")

      await fetchAds()
    } catch (error) {
      console.error("広告停止エラー:", error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "広告の停止に失敗しました。"
      )
    } finally {
      setStoppingAdId(null)
    }
  }

  useEffect(() => {
    fetchAds()
  }, [])

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    })
  }

  const getCtr = (
    impressions: number,
    clicks: number
  ) => {
    if (!impressions) {
      return "0.00%"
    }

    return `${((clicks / impressions) * 100).toFixed(2)}%`
  }

  const getStatusLabel = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          掲載中
        </span>
      )
    }

    if (status === "stopped") {
      return (
        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          停止
        </span>
      )
    }

    if (status === "completed") {
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          終了
        </span>
      )
    }

    return (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
        {status}
      </span>
    )
  }

  const activeAds = ads.filter(
    (ad) => ad.status === "active"
  ).length

  const totalImpressions = ads.reduce(
    (sum, ad) => sum + (ad.impression_count ?? 0),
    0
  )

  const totalClicks = ads.reduce(
    (sum, ad) => sum + (ad.click_count ?? 0),
    0
  )

  const totalPoints = ads.reduce(
    (sum, ad) => sum + (ad.price ?? 0),
    0
  )

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">
          広告一覧を読み込んでいます...
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-6">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          広告管理
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          ユーザーがポイントを使って出稿した作品広告を管理できます。
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* サマリー */}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            広告数
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {ads.length.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            掲載中
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {activeAds.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            総表示回数
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalImpressions.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            総クリック数
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalClicks.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            総使用ポイント
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalPoints.toLocaleString()} pt
          </p>
        </div>

      </div>

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            広告はまだありません。
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">

          <table className="min-w-[1500px] w-full">

            <thead className="border-b bg-gray-50">
              <tr>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  広告主
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  メッセージ
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  リンク
                </th>

                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                  期間
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  使用pt
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  掲載開始
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  掲載終了
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  表示
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  クリック
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  CTR
                </th>

                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                  状態
                </th>

                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                  操作
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {ads.map((ad) => (

                <tr
                  key={ad.id}
                  className="hover:bg-gray-50"
                >

                  {/* 広告主 */}

                  <td className="px-4 py-4">

                    <p className="font-medium text-gray-900">
                      {ad.profiles?.[0]?.username ?? "ユーザー"}
                    </p>

                    <p className="mt-1 max-w-[180px] truncate text-xs text-gray-400">
                      {ad.user_id}
                    </p>

                  </td>

                  {/* メッセージ */}

                  <td className="max-w-[280px] px-4 py-4">

                    <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                      {ad.message}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {ad.message?.length ?? 0} / 140文字
                    </p>

                  </td>

                  {/* リンク */}

                  <td className="max-w-[240px] px-4 py-4">

                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-blue-600 hover:underline"
                      title={ad.link_url}
                    >
                      {ad.link_url}
                    </a>

                  </td>

                  {/* 期間 */}

                  <td className="px-4 py-4 text-center text-sm text-gray-700">
                    {ad.duration_days}日
                  </td>

                  {/* ポイント */}

                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-900">
                    {ad.price.toLocaleString()} pt
                  </td>

                  {/* 開始 */}

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatDate(ad.start_at)}
                  </td>

                  {/* 終了 */}

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatDate(ad.end_at)}
                  </td>

                  {/* 表示 */}

                  <td className="px-4 py-4 text-right text-gray-700">
                    {ad.impression_count.toLocaleString()}
                  </td>

                  {/* クリック */}

                  <td className="px-4 py-4 text-right text-gray-700">
                    {ad.click_count.toLocaleString()}
                  </td>

                  {/* CTR */}

                  <td className="px-4 py-4 text-right font-medium text-gray-700">
                    {getCtr(
                      ad.impression_count,
                      ad.click_count
                    )}
                  </td>

                  {/* 状態 */}

                  <td className="px-4 py-4 text-center">
                    {getStatusLabel(ad.status)}
                  </td>

                  {/* 操作 */}

                  <td className="px-4 py-4 text-center">

                    {ad.status === "active" ? (
                      <button
                        type="button"
                        disabled={stoppingAdId === ad.id}
                        onClick={() => handleStopAd(ad.id)}
                        className="
                          rounded-lg
                          bg-red-500
                          px-4
                          py-2
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-red-600
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        {stoppingAdId === ad.id
                          ? "停止中..."
                          : "広告停止"}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">
                        操作なし
                      </span>
                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </main>
  )
}