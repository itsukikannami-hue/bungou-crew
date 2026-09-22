"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  user_id: string
  message: string
  link_url: string
  username: string
}

export default function AdTimelineCard() {
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
          link_url
        `)
        .eq("status", "active")
        .lte("start_at", now)
        .gte("end_at", now)
        .not("message", "is", null)
        .neq("message", "")

      if (error) {
        console.error("Timeline広告取得エラー:", error)
        return
      }

      if (!data || data.length === 0) {
        return
      }

      // 掲載中の広告からランダムに1件
      const randomIndex = Math.floor(
        Math.random() * data.length
      )

      const selectedAd = data[randomIndex]

      // 広告主のユーザー情報を取得
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", selectedAd.user_id)
          .maybeSingle()

      if (profileError) {
        console.error(
          "Timeline広告主ユーザー情報取得エラー:",
          profileError
        )
      }

      setAd({
        id: selectedAd.id,
        user_id: selectedAd.user_id,
        message: selectedAd.message,
        link_url: selectedAd.link_url,
        username: profileData?.username ?? "広告主",
      })

      // 表示回数を1増やす
      const { error: impressionError } =
        await supabase.rpc(
          "increment_ad_impression",
          {
            p_ad_id: selectedAd.id,
          }
        )

      if (impressionError) {
        console.error(
          "Timeline広告表示回数更新エラー:",
          impressionError
        )
      }
    }

    fetchAd()
  }, [])

  const handleAdClick = async () => {
    if (!ad) return

    const { error } = await supabase.rpc(
      "increment_ad_click",
      {
        p_ad_id: ad.id,
      }
    )

    if (error) {
      console.error(
        "Timeline広告クリック数更新エラー:",
        error
      )
    }

    window.open(
      ad.link_url,
      "_blank",
      "noopener,noreferrer"
    )
  }

  if (!ad) {
    return null
  }

  return (
    <div
      className="
        block
        w-full
        rounded-2xl
        border
        border-gray-200
        bg-white
        p-5
        shadow-sm
        transition
        hover:shadow-md
      "
    >
      {/* 広告ラベル */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-gray-400">
          📢 スポンサー広告
        </div>

        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-400">
          AD
        </span>
      </div>

      {/* 広告主 */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm">
          ✍️
        </div>

        <div>
          <p className="text-xs text-gray-400">
            広告を出稿したユーザー
          </p>

          <p className="text-sm font-bold text-gray-900">
            {ad.username}
          </p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="mt-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {ad.message}
        </p>
      </div>

      {/* 作品を見る */}
      <button
        type="button"
        onClick={handleAdClick}
        className="
          mt-4
          w-full
          rounded-xl
          border
          border-gray-200
          bg-gray-50
          px-4
          py-3
          text-center
          text-sm
          font-bold
          text-gray-700
          transition
          hover:bg-gray-100
        "
      >
        📖 作品を見てみる ↗
      </button>

      <div className="mt-3 text-center text-[10px] text-gray-400">
        ブンゴウクルー広告
      </div>
    </div>
  )
}