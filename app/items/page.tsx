"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Item = {
  id: string
  name: string
  description: string | null
  type: string
  price: number
  effect: string | null
  duration: number | null
  is_active: boolean
}

const handlePurchase = async (itemId: string) => {
    try {
      const response = await fetch(
        "/api/items/purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId,
          }),
        }
      )
  
      const result = await response.json()
  
      if (!response.ok) {
        alert(
          result.error ||
          "購入に失敗しました。"
        )
        return
      }
  
      alert("アイテムを購入しました。")
  
      // ポイント残高を再取得
      // アイテム一覧を再取得
      // 必要なら画面を更新
  
    } catch (error) {
      console.error(error)
  
      alert(
        "購入処理に失敗しました。"
      )
    }
  }

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    const {
      data,
      error,
    } = await supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("price", {
        ascending: true,
      })

    if (error) {
      console.error(
        "アイテム取得エラー:",
        error
      )

      setItems([])
      setLoading(false)
      return
    }

    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">
          アイテムを読み込んでいます...
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">

      <h1 className="text-3xl font-bold text-gray-900">
        アイテムショップ
      </h1>

      <p className="mt-2 text-gray-500">
        ポイントを使ってアイテムを購入できます。
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >

            <h2 className="text-xl font-bold text-gray-900">
              {item.name}
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              {item.description}
            </p>

            <p className="mt-5 text-2xl font-bold text-gray-900">
              {item.price.toLocaleString()} pt
            </p>

            <button
  type="button"
  onClick={() => handlePurchase(item.id)}
>
  購入
</button>

          </div>
        ))}

      </div>

    </main>
  )
}