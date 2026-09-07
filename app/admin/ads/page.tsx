"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  user_id: string
  title: string
  genre: string
  message: string
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
  } | null
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const handleStopAd = async (adId: string) => {
    const confirmed = window.confirm(
      "この広告を停止しますか？\n\n停止後は広告として表示されなくなります。"
    )
  
    if (!confirmed) {
      return
    }
  
    const { error } = await supabase
      .from("ads")
      .update({
        status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId)
  
    if (error) {
      console.error("広告停止エラー:", error)
  
      alert(
        "広告の停止に失敗しました。\n" +
        error.message
      )
  
      return
    }
  
    alert("広告を停止しました。")
  
    await fetchAds()
  }

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
        title,
        genre,
        message,
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
        "広告一覧の取得に失敗しました。"
      )
      setLoading(false)
      return
    }

    setAds((data ?? []) as Ad[])
    setLoading(false)
  }

  useEffect(() => {
    fetchAds()
  }, [])

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    })
  }

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
          ユーザーが出稿した広告を管理できます。
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            広告はまだありません。
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">

          <table className="min-w-[1100px] w-full">

            <thead className="border-b bg-gray-50">
              <tr>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  ユーザー
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  広告
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  掲載開始
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                  掲載終了
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  使用ポイント
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  表示回数
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">
                  クリック数
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

                  {/* ユーザー */}

                  <td className="px-4 py-4">

                    <p className="font-medium text-gray-900">
                      {ad.profiles?.username ?? "ユーザー"}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {ad.user_id}
                    </p>

                  </td>


                  {/* 広告 */}

                  <td className="max-w-xs px-4 py-4">

                    <p className="font-medium text-gray-900">
                      {ad.title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {ad.duration_days}日
                    </p>

                  </td>


                  {/* 掲載開始 */}

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatDate(ad.start_at)}
                  </td>


                  {/* 掲載終了 */}

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatDate(ad.end_at)}
                  </td>


                  {/* 使用ポイント */}

                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-900">
                    {ad.price.toLocaleString()} pt
                  </td>


                  {/* 表示回数 */}

                  <td className="px-4 py-4 text-right text-gray-700">
                    {ad.impression_count.toLocaleString()}
                  </td>


                  {/* クリック数 */}

                  <td className="px-4 py-4 text-right text-gray-700">
                    {ad.click_count.toLocaleString()}
                  </td>


                  {/* 状態 */}

                  <td className="px-4 py-4 text-center">

                    {ad.status === "active" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        掲載中
                      </span>
                    ) : ad.status === "stopped" ? (
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        停止
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {ad.status}
                      </span>
                    )}

                  </td>

                  <td className="px-4 py-4 text-center">

  {ad.status === "active" && (
    <button
      type="button"
      onClick={() => handleStopAd(ad.id)}
      className="
        rounded-lg
        bg-red-500
        px-4
        py-2
        text-sm
        font-semibold
        text-white
        hover:bg-red-600
      "
    >
      広告停止
    </button>
  )}

  {ad.status === "stopped" && (
    <span className="text-sm text-gray-400">
      停止済み
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