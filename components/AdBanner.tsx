"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type Ad = {
    id: string
    user_id: string
    genre: string
    message: string
    link_url: string
    profiles: {
      username: string | null
    } | null
  }

export default function AdBanner() {
    const router = useRouter()

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
            "広告クリック数更新エラー:",
            error
          )
        }
      
        router.push(`/user/${ad.user_id}`)
      }
  const [ad, setAd] = useState<Ad | null>(null)

  useEffect(() => {
    const fetchAd = async () => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
      .from("ads")
      .select(`
        id,
        user_id,
        genre,
        message,
        link_url,
        profiles (
          username
        )
      `)
      .eq("status", "active")
      .lte("start_at", new Date().toISOString())
      .gte("end_at", new Date().toISOString())

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
>
  <div className="text-sm font-bold text-gray-500">
    📢 本日のピックアップユーザー
  </div>

  <div className="mt-4">
    <p className="text-sm text-gray-500">
      ユーザー名
    </p>

    <p className="text-lg font-bold text-gray-900">
      {ad.profiles?.username ?? "ユーザー"}
    </p>
  </div>

  <div className="mt-4">
    <p className="text-sm text-gray-500">
      執筆しているジャンル
    </p>

    <p className="font-medium text-gray-900">
      {ad.genre}
    </p>
  </div>

  <div className="mt-4">
    <p className="text-sm text-gray-500">
      メッセージ
    </p>

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