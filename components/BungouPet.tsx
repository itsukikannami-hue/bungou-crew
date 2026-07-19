"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

// ==============================
// 🧠 設定
// ==============================

const LEVEL_TABLE = [
  { level: 1, exp: 0, name: "卵" },
  { level: 2, exp: 1000, name: "孵化" },
  { level: 3, exp: 5000, name: "見習い作家" },
  { level: 4, exp: 15000, name: "新人作家" },
  { level: 5, exp: 30000, name: "デビュー作家" },
]

// ==============================
// 🧠 ロジック
// ==============================

// 経験値
const calculateExp = (words: number, minutes: number) => {
  return words + minutes * 5
}

// レベル取得
const getLevel = (exp: number) => {
  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_TABLE[i].exp) {
      return LEVEL_TABLE[i]
    }
  }
  return LEVEL_TABLE[0]
}

// mood計算
const getMood = (lastActiveAt: string | null) => {
  if (!lastActiveAt) return "tired"

  const now = new Date()
  const last = new Date(lastActiveAt)

  const diffDays =
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays >= 3) return "tired"
  if (diffDays < 1) return "happy"
  return "normal"
}

// ==============================
// 🧩 コンポーネント
// ==============================

export default function BungouPet() {
  const [bungou, setBungou] = useState<any>(null)
  const [species, setSpecies] = useState<any>(null)
  const [levelInfo, setLevelInfo] = useState<any>(null)

  const fetchBungou = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // インスタンス取得
    const { data: instance } = await supabase
      .from("bungou_instances")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "growing")
      .maybeSingle()

    if (!instance) return

    // 🆕 EXP計算
    const exp = calculateExp(
      instance.total_words || 0,
      instance.total_minutes || 0
    )

    const levelData = getLevel(exp)
    const mood = getMood(instance.last_active_at)

    // DB更新
    await supabase
      .from("bungou_instances")
      .update({
        exp,
        level: levelData.level,
        mood,
      })
      .eq("id", instance.id)

    setBungou({
      ...instance,
      exp,
      level: levelData.level,
      mood,
    })

    setLevelInfo(levelData)

    // 種族取得
    const { data: sp } = await supabase
      .from("bungou_species")
      .select("*")
      .eq("id", instance.species_id)
      .single()

    setSpecies(sp)
  }

  useEffect(() => {
    fetchBungou()
  }, [])

  if (!bungou || !species || !levelInfo) {
    return <div>ブンゴウ読み込み中...</div>
  }

  // 次レベル計算
  const nextLevel =
    LEVEL_TABLE.find((l) => l.level === bungou.level + 1) || null

  const progress = nextLevel
    ? Math.min(
        100,
        ((bungou.exp - levelInfo.exp) /
          (nextLevel.exp - levelInfo.exp)) *
          100
      )
    : 100

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6">

      <h2 className="text-xl font-bold mb-2">
        🐣 現在のブンゴウ
      </h2>

      {/* 名前 */}
      <div className="text-lg">
        📚 {species.name}
      </div>

      {/* レベル */}
      <div className="text-sm text-gray-500">
        Lv.{bungou.level} / {levelInfo.name}
      </div>

      {/* mood */}
      <div className="mt-2 text-sm">
        {bungou.mood === "happy" && "😊 元気"}
        {bungou.mood === "normal" && "😐 普通"}
        {bungou.mood === "tired" && "😴 疲れている"}
      </div>

      {/* EXP */}
      <div className="mt-3 text-sm">
        EXP: {bungou.exp}
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
        <div
          className="bg-green-500 h-3 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 次レベル */}
      {nextLevel && (
        <div className="text-xs text-gray-500 mt-1">
          次のレベルまで {nextLevel.exp - bungou.exp} EXP
        </div>
      )}

      {/* データ表示 */}
      <div className="mt-4 text-sm">
        文字数 {bungou.total_words}
      </div>

      <div className="text-sm">
        執筆時間 {bungou.total_minutes}分
      </div>

    </div>
  )
}