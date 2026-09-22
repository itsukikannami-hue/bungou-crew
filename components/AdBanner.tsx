"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  user_id: string
  message: string
  link_url: string
  profiles: {
    username: string | null
  }[] | null
}

export default function AdBanner() {
  const [ad, setAd] = useState<Ad | null>(null)

  useEffect(() => {
    const fetchAd = async () => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from("ads")
        .select(`
          id,
          user_id,
          message,
          link_url,
          profiles (
            username
          )
        `)
        .eq("status", "active")
        .lte("start_at", now)
        .gte("end_at", now)

      if (error) {
        console.error("広告取得エラー:", error)
        return
      }

      if (!data || data.length === 0) {
        return
      }

      // 掲載中の広告からランダムに1件選択
      const randomIndex = Math.floor(
        Math.random() * data.length
      )

      const selectedAd = data[randomIndex]

      setAd(selectedAd)

      // 表示回数を1増やす
      const { error: impressionError } = await supabase.rpc(
        "increment_ad_impression",
        {
          p_ad_id: selectedAd.id,
        }
      )

      if (impressionError) {
        console.error(
          "広告表示回数更新エラー:",
          impressionError
        )
      }
    }

    fetchAd()
  }, [])

  if (!ad) {
    return null
  }

  const handleAdClick = async () => {
    const { error } = await supabase.rpc(
      "increment_ad_click",
      {
        p_ad_id: ad.id,
      }
    )

    if (error) {
      console.error(
        "広告クリック数更新エラー:",
        error
      )
    }

    window.open(
      ad.link_url,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const username =
    ad.profiles?.[0]?.username ?? "広告主"

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-lg">
      {/* 広告ヘッダー */}
      <div className="flex items-center justify-between border-b border-indigo-100 bg-white/70 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm">
            📢
          </span>

          <span className="text-sm font-bold text-indigo-700">
            スポンサー広告
          </span>
        </div>

        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
          AD
        </span>
      </div>

      {/* 広告本文 */}
      <div className="px-5 py-5">
        {/* 広告主 */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-lg text-white shadow-sm">
            ✍️
          </div>

          <div>
            <p className="text-xs text-gray-400">
              広告を出稿したユーザー
            </p>

            <p className="font-bold text-gray-800">
              {username}
            </p>
          </div>
        </div>

        {/* メッセージ */}
        <div className="rounded-xl bg-white/80 px-4 py-4 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {ad.message}
          </p>
        </div>

        {/* 作品を見るボタン */}
        <button
          type="button"
          onClick={handleAdClick}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        >
          <span>📖</span>
          <span>作品を見てみる</span>
          <span>↗</span>
        </button>
      </div>

      {/* 広告フッター */}
      <div className="border-t border-indigo-100 bg-white/50 px-5 py-2 text-center">
        <span className="text-[10px] text-gray-400">
          ブンゴウクルー広告
        </span>
      </div>
    </div>
  )
}