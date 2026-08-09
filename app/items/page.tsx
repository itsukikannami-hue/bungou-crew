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
              className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              購入する
            </button>

          </div>
        ))}

      </div>

    </main>
  )
}