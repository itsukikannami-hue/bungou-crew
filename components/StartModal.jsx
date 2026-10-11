"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function StartModal({ onClose }) {

  const [minutes, setMinutes] = useState(25)
  const [bungouId, setBungouId] = useState(null)
  const [bungouLoading, setBungouLoading] = useState(true)
  const [boostCount, setBoostCount] = useState(0)
  const [useExpBoost, setUseExpBoost] = useState(false)
  const [boostLoading, setBoostLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBungouLoading(false)
        setBoostLoading(false)
        return
      }

      const { data } = await supabase
      .from("bungou_instances")
      .select(`
        *,
        bungou_species (*)
      `)
        .eq("user_id", user.id)
        .eq("status", "growing")

      // 現在は育成対象が1体のみのため、自動的に設定する。
      setBungouId(data?.[0]?.id ?? null)
      setBungouLoading(false)
      const { data: boostItems, error: boostError } = await supabase
        .from("items").select("id").eq("effect_type", "EXP_MULTIPLIER")
        .eq("effect_value", 2).eq("is_active", true)
      if (boostError) console.error("EXPブースト取得エラー:", boostError)
      const boostIds = (boostItems || []).map(item => item.id)
      if (boostIds.length) {
        const { data: owned, error: ownedError } = await supabase
          .from("user_items").select("quantity, expires_at")
          .eq("user_id", user.id).in("item_id", boostIds).gt("quantity", 0)
        if (ownedError) console.error("EXPブースト所持確認エラー:", ownedError)
        const now = Date.now()
        setBoostCount((owned || []).filter(item => !item.expires_at || new Date(item.expires_at).getTime() > now)
          .reduce((total, item) => total + Number(item.quantity || 0), 0))
      }
      setBoostLoading(false)
    }
    fetch()
  }, [])

  const handleStart = () => {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      alert("執筆時間は1〜1440分の整数で入力してください")
      return
    }
    if (!bungouId) {
      alert(bungouLoading ? "育成中のブンゴウを確認中です" : "育成中のブンゴウが見つかりません")
      return
    }

    window.dispatchEvent(new CustomEvent("bungou:timer-start", {
      detail: { minutes, bungouId, useExpBoost: useExpBoost && boostCount > 0 }
    }))
    onClose()
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
            onChange={(e) => setMinutes(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="mb-5 rounded-xl border border-[#f0e1d2] bg-[#fffaf2] p-3 text-[#694b38]">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 accent-[#d78f57]" checked={useExpBoost}
              disabled={boostLoading || boostCount === 0}
              onChange={event => setUseExpBoost(event.target.checked)} />
            <span><strong>✨ EXPブーストを使用する</strong>
              <span className="mt-1 block text-xs text-[#907b68]">
                {boostLoading ? "所持数を確認中…" : `所持数：${boostCount}個`}
                <br />選択した場合、この執筆の獲得EXPが2倍になります。
                アイテムは執筆結果の登録時に1個消費します。
              </span>
            </span>
          </label>
        </div>

        {/* ボタン */}
        <div className="flex justify-between">
          <button onClick={onClose}>キャンセル</button>
          <button
            onClick={handleStart}
            disabled={bungouLoading || !bungouId}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            開始
          </button>
        </div>

      </div>
    </div>
  )
}