"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
  id: string
  message: string
  link_url: string
}

export default function AdBanner() {
  const [ad, setAd] = useState<Ad | null>(null)

  const handleAdClick = async () => {
    if (!ad) return

    const { error } = await supabase.rpc(
      "increment_ad_click",
      {
        p_ad_id: ad.id,
      }
    )

    if (error) {
      console.error("広告クリック数更新エラー:", error)
    }

    window.location.href = ad.link_url
  }

  useEffect(() => {
    const fetchAd = async () => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from("ads")
        .select(`
          id,
          message,
          link_url
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

  return (
    <button
      type="button"
      onClick={handleAdClick}
      className="w-full text-left"
    >
      <div className="text-sm font-bold text-gray-500">
        📢 スポンサー広告
      </div>

      <div className="mt-4">
        <p className="whitespace-pre-wrap text-gray-700">
          {ad.message}
        </p>
      </div>

      <div className="mt-4 text-right text-xs text-gray-400">
        広告
      </div>
    </button>
  )
}