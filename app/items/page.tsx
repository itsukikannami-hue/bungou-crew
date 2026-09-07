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

const AD_PLANS = {
  7: 1500,
  15: 2500,
  30: 4500,
} as const

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // 広告出稿フォーム
  const [showAdForm, setShowAdForm] = useState(false)
  const [adGenre, setAdGenre] = useState("")
  const [adMessage, setAdMessage] = useState("")
  const [adLinkUrl, setAdLinkUrl] = useState("")
  const [adDuration, setAdDuration] = useState<7 | 15 | 30>(7)
  const [adLoading, setAdLoading] = useState(false)

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

  // 通常アイテム購入
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
    } catch (error) {
      console.error(error)

      alert(
        "購入処理に失敗しました。"
      )
    }
  }

  // 広告出稿
  const handleAdSubmit = async () => {
    if (!adTitle.trim()) {
      alert("広告タイトルを入力してください。")
      return
    }

    if (!adLinkUrl.trim()) {
      alert("作品ページURLを入力してください。")
      return
    }

    if (!adImage) {
      alert("広告画像を選択してください。")
      return
    }

    if (adImage.size > 5 * 1024 * 1024) {
      alert("広告画像は5MB以下にしてください。")
      return
    }

    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
      ].includes(adImage.type)
    ) {
      alert(
        "広告画像はPNG、JPEG、WebPのみ使用できます。"
      )
      return
    }

    setAdLoading(true)

    try {
      // ① ログイン確認
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        alert("ログインが必要です。")
        return
      }

      // ② 広告画像をStorageへアップロード
      const fileExtension =
        adImage.name.split(".").pop()?.toLowerCase() ||
        "jpg"

      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExtension}`

      const {
        error: uploadError,
      } = await supabase.storage
      .from("ad-images")
        .upload(filePath, adImage, {
          contentType: adImage.type,
          upsert: false,
        })

      if (uploadError) {
        console.error(
          "広告画像アップロードエラー:",
          uploadError
        )

        alert(
          "広告画像のアップロードに失敗しました。"
        )
        return
      }

      // ③ Storageの公開URL取得
      const {
        data: publicUrlData,
      } = supabase.storage
      .from("ad-images")
        .getPublicUrl(filePath)

      const imageUrl =
        publicUrlData.publicUrl

      // ④ 広告出稿APIを呼び出す
      const response = await fetch(
        "/api/ads/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: adTitle.trim(),
            linkUrl: adLinkUrl.trim(),
            imageUrl,
            durationDays: adDuration,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error(
          "広告出稿APIエラー:",
          result
        )

        alert(
          result.error ||
            "広告の出稿に失敗しました。"
        )

        return
      }

      // ⑤ 成功
      alert(
        `${adDuration}日間の広告を出稿しました。`
      )

      // フォームをリセット
      setAdTitle("")
      setAdLinkUrl("")
      setAdImage(null)
      setAdDuration(7)
      setShowAdForm(false)
    } catch (error) {
      console.error(
        "広告出稿エラー:",
        error
      )

      alert(
        "広告出稿処理に失敗しました。"
      )
    } finally {
      setAdLoading(false)
    }
  }

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

      {/* アイテムショップ */}
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
              onClick={() =>
                handlePurchase(item.id)
              }
              className="mt-5 rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-gray-800"
            >
              購入
            </button>

          </div>
        ))}

      </div>

      {/* 広告出稿 */}
      <section className="mt-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            📢 作品を宣伝する
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            ポイントを使って、あなたの作品を広告として掲載できます。
          </p>

          {!showAdForm && (
            <button
              type="button"
              onClick={() =>
                setShowAdForm(true)
              }
              className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
            >
              広告を出稿する
            </button>
          )}

        </div>
      </section>

      {/* 広告出稿フォーム */}
      {showAdForm && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            広告を出稿
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            あなたの作品をブンゴウクルー内で宣伝できます。
          </p>


          {/* 作品ページURL */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700">
              作品ページURL
            </label>

            <input
              type="url"
              value={adLinkUrl}
              onChange={(e) =>
                setAdLinkUrl(e.target.value)
              }
              placeholder="https://..."
              disabled={adLoading}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
            />

          </div>

          <div className="mt-6">
  <label className="block text-sm font-medium text-gray-700">
    執筆しているジャンル
  </label>

  <input
    type="text"
    value={adGenre}
    onChange={(e) => setAdGenre(e.target.value)}
    placeholder="例：異世界ファンタジー"
    maxLength={50}
    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
  />
</div>

<div className="mt-5">
  <label className="block text-sm font-medium text-gray-700">
    メッセージ
  </label>

  <textarea
    value={adMessage}
    onChange={(e) => setAdMessage(e.target.value)}
    placeholder="読者へのメッセージを入力してください"
    maxLength={200}
    rows={4}
    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
  />

  <p className="mt-2 text-xs text-gray-500">
    最大200文字
  </p>
</div>


          {/* 掲載期間 */}
          <div className="mt-6">

            <p className="text-sm font-medium text-gray-700">
              掲載期間
            </p>

            <div className="mt-3 space-y-3">

              {/* 7日 */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50">

                <input
                  type="radio"
                  name="adDuration"
                  value="7"
                  checked={adDuration === 7}
                  disabled={adLoading}
                  onChange={() =>
                    setAdDuration(7)
                  }
                />

                <span>
                  7日
                </span>

                <span className="ml-auto font-bold">
                  1,500 pt
                </span>

              </label>

              {/* 15日 */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50">

                <input
                  type="radio"
                  name="adDuration"
                  value="15"
                  checked={adDuration === 15}
                  disabled={adLoading}
                  onChange={() =>
                    setAdDuration(15)
                  }
                />

                <span>
                  15日
                </span>

                <span className="ml-auto font-bold">
                  2,500 pt
                </span>

              </label>

              {/* 30日 */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50">

                <input
                  type="radio"
                  name="adDuration"
                  value="30"
                  checked={adDuration === 30}
                  disabled={adLoading}
                  onChange={() =>
                    setAdDuration(30)
                  }
                />

                <span>
                  30日
                </span>

                <span className="ml-auto font-bold">
                  4,500 pt
                </span>

              </label>

            </div>
          </div>

          {/* 使用ポイント */}
          <div className="mt-6 rounded-xl bg-gray-50 p-4">

            <p className="text-sm text-gray-500">
              使用ポイント
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {AD_PLANS[
                adDuration
              ].toLocaleString()}{" "}
              pt
            </p>

          </div>

          {/* ボタン */}
          <div className="mt-6 flex gap-3">

            <button
              type="button"
              onClick={() =>
                setShowAdForm(false)
              }
              disabled={adLoading}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={handleAdSubmit}
              disabled={adLoading}
              className="flex-1 rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {adLoading
                ? "処理中..."
                : "広告を出稿する"}
            </button>

          </div>

        </section>
      )}

    </main>
  )
}