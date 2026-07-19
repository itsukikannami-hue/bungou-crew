"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function StartModal({ onClose }) {

  const [minutes, setMinutes] = useState(25)
  const [bungous, setBungous] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
      .from("bungou_instances")
      .select(`
        *,
        bungou_species (*)
      `)
        .eq("user_id", user.id)
        .eq("status", "growing")

      setBungous(data || [])
    }
    fetch()
  }, [])

  const handleStart = () => {
    if (!selectedId) {
      alert("ブンゴウを選択してください")
      return
    }

    localStorage.setItem("timer_minutes", minutes)
    localStorage.setItem("target_bungou_id", selectedId)

    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white p-6 rounded-xl w-80">

        <h2 className="text-lg font-bold mb-4">執筆スタート</h2>

        {/* ⏱ タイマー */}
        <div className="mb-4">
          <label className="text-sm">時間（分）</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* 🐾 ブンゴウ選択 */}
        <div className="mb-4">
          <div className="text-sm mb-2">ブンゴウを選択</div>

          {bungous.map(b => {

const isEgg = b.stage === 0

const name =
  isEgg
    ? "卵"
    : b.bungou_species?.name || "生成中..."

            return (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`p-2 border mb-1 cursor-pointer rounded ${
                  selectedId === b.id ? "bg-blue-100" : ""
                }`}
              >
                <div className="font-semibold">
                  {name}
                </div>

              </div>
            )
          })}
        </div>

        {/* ボタン */}
        <div className="flex justify-between">
          <button onClick={onClose}>キャンセル</button>
          <button
            onClick={handleStart}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            開始
          </button>
        </div>

      </div>
    </div>
  )
}