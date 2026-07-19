"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function BadgesPage() {
  const [badges, setBadges] = useState<any[]>([])
  const [userBadges, setUserBadges] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) return

      const { data: all } = await supabase
        .from("badges")
        .select("*")

      const { data: owned } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id)

      setBadges(all || [])
      setUserBadges(owned || [])
    }

    fetchData()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">バッジ一覧</h1>

      {/* 1列4個表示 */}
      <div className="grid grid-cols-4 gap-4">
        {badges.map((badge) => {
          const owned = userBadges.some(
            (b) => b.badge_key === badge.key
          )

          return (
            <div
              key={badge.id}
              className={`
                flex flex-col items-center justify-center
                p-3 rounded-xl border shadow-sm
                aspect-square relative group
                ${owned ? "bg-white" : "bg-gray-100 opacity-40"}
              `}
            >
              {/* アイコン */}
              <div className="text-2xl">
                {badge.icon}
              </div>

              {/* 名前表示（常時表示） */}
              <div className="text-xs mt-2 text-center text-gray-700">
                {badge.name}
              </div>

              {/* hover説明（任意・残してもOK） */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {badge.description}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}