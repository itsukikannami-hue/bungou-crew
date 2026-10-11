"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ItemDetails = { id: string; name: string; effect_type: string | null }
type OwnedItem = {
  id: string
  quantity: number
  expires_at: string | null
  items: ItemDetails | ItemDetails[] | null
}

/** ショップとマイページで共通の所持アイテム表示。 */
export default function OwnedItemsPanel({ open = true }: { open?: boolean }) {
  const [items, setItems] = useState<OwnedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) {
      setError("所持アイテムを確認するにはログインしてください。")
      setItems([])
      setLoading(false)
      return
    }
    const { data, error: fetchError } = await supabase
      .from("user_items")
      .select("id,quantity,expires_at,items(id,name,effect_type)")
      .eq("user_id", auth.user.id)
      .gt("quantity", 0)
    if (fetchError) {
      setError(`所持アイテムを取得できませんでした：${fetchError.message}`)
      setItems([])
    } else {
      setItems((data ?? []) as unknown as OwnedItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  if (!open) return null
  const now = Date.now()
  const active = items.filter(item => !item.expires_at || new Date(item.expires_at).getTime() > now)
  const expiredCount = items.length - active.length

  return (
    <div className="space-y-3 rounded-b-2xl border border-t-0 border-[#f0e1d2] bg-[#fffaf5] p-4 sm:p-5" aria-label="所持アイテム一覧">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[#947e6d]">所持しているアイテムと個数</p>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-[#e9d5c1] bg-white px-3 py-1.5 text-xs font-semibold text-[#a36a40] disabled:opacity-50">更新</button>
      </div>
      {loading ? <p role="status" className="text-sm text-[#947e6d]">読み込み中...</p> : error ? <p role="alert" className="text-sm text-red-700">{error}</p> : active.length === 0 ? <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-[#947e6d]">現在所持しているアイテムはありません。</p> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map(owned => {
            const item = Array.isArray(owned.items) ? owned.items[0] : owned.items
            return (
              <div key={owned.id} className="rounded-xl border border-[#f0e1d2] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[#694b38]">{item?.name ?? "アイテム情報なし"}</p>
                  <span className="shrink-0 rounded-full bg-[#fff0df] px-3 py-1 text-sm font-bold text-[#b87843]">× {owned.quantity}</span>
                </div>
                {owned.expires_at && <p className="mt-2 text-xs text-[#947e6d]">有効期限：{new Date(owned.expires_at).toLocaleDateString("ja-JP")}</p>}
              </div>
            )
          })}
        </div>
      )}
      {!loading && !error && expiredCount > 0 && <p className="text-xs text-[#947e6d]">期限切れ：{expiredCount}件（一覧には表示していません）</p>}
    </div>
  )
}
