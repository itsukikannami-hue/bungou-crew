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

const AD_PRICES = {
  free: {
    7: 1500,
    15: 2500,
    30: 4500,
  },
  premium: {
    7: null,
    15: 0,
    30: 1500,
  },
  ultimate: {
    7: null,
    15: 0,
    30: 0,
  },
} as const

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
const [pointsLoading, setPointsLoading] = useState(true)

  // 広告出稿フォーム
  const [showAdForm, setShowAdForm] = useState(false)
  const [adMessage, setAdMessage] = useState("")
  const [adLinkUrl, setAdLinkUrl] = useState("")
  const [adDuration, setAdDuration] = useState<7 | 15 | 30>(7)
  const [adLoading, setAdLoading] = useState(false)
  const [userPlan, setUserPlan] = useState<
  "free" | "premium" | "ultimate"
>("free")

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

  const fetchPoints = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
  
    if (userError || !user) {
      setPoints(0)
      setPointsLoading(false)
      return
    }
  
    const { data, error } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      .maybeSingle()
  
    if (error) {
      console.error(
        "ポイント残高取得エラー:",
        error
      )
  
      setPoints(0)
      setPointsLoading(false)
      return
    }
  
    setPoints(data?.points ?? 0)
    setPointsLoading(false)
  }


  const fetchUserPlan = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
  
    if (userError || !user) {
      setUserPlan("free")
      return
    }
  
    const {
      data,
      error,
    } = await supabase.rpc("get_user_plan", {
      target_user_id: user.id,
    })
  
    if (error) {
      console.error(
        "プラン判定エラー:",
        error
      )
  
      setUserPlan("free")
      return
    }
  
    if (
      data === "premium" ||
      data === "ultimate"
    ) {
      setUserPlan(data)
    } else {
      setUserPlan("free")
    }
  }

  useEffect(() => {
    fetchItems()
    fetchPoints()
    fetchUserPlan()
  }, [])

  useEffect(() => {
    if (userPlan === "premium" || userPlan === "ultimate") {
      setAdDuration(15)
    } else {
      setAdDuration(7)
    }
  }, [userPlan])

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
    if (!adMessage.trim()) {
      alert("広告メッセージを入力してください。")
      return
    }
  
    if (adMessage.trim().length > 140) {
      alert("広告メッセージは140文字以内にしてください。")
      return
    }
  
    if (!adLinkUrl.trim()) {
      alert("作品ページURLを入力してください。")
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
  
      // ② 広告出稿APIを呼び出す
      const response = await fetch(
        "/api/ads/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: adMessage.trim(),
            linkUrl: adLinkUrl.trim(),
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
  
      // ③ 成功
      alert(
        `${adDuration}日間の広告を出稿しました。`
      )
  
      // フォームをリセット
      setAdMessage("")
      setAdLinkUrl("")
      setAdDuration(
        userPlan === "free" ? 7 : 15
      )
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


{/* ポイント残高 */}
<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <p className="text-sm font-medium text-gray-500">
    現在のポイント
  </p>

  {pointsLoading ? (
    <p className="mt-2 text-gray-400">
      読み込み中...
    </p>
  ) : (
    <p className="mt-1 text-3xl font-bold text-gray-900">
      {points.toLocaleString()} pt
    </p>
  )}
</section>



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

{/* 広告メッセージ */}
<div className="mt-5">
  <label className="block text-sm font-medium text-gray-700">
    広告メッセージ
  </label>

  <textarea
    value={adMessage}
    onChange={(e) =>
      setAdMessage(e.target.value)
    }
    placeholder="読者へのメッセージを入力してください"
    maxLength={140}
    rows={4}
    disabled={adLoading}
    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
  />

  <div className="mt-2 flex justify-between text-xs text-gray-500">
    <span>読者に伝えたいメッセージを入力してください。</span>
    <span>{adMessage.length} / 140文字</span>
  </div>
</div>


          {/* 掲載期間 */}
          <div className="mt-6">

            <p className="text-sm font-medium text-gray-700">
              掲載期間
            </p>

            <div className="mt-3 space-y-3">

             {/* 7日 */}
<label
  className={`flex items-center gap-3 rounded-lg border p-3 ${
    userPlan !== "free"
      ? "cursor-not-allowed opacity-50"
      : "cursor-pointer"
  }`}
>
  <input
    type="radio"
    name="adDuration"
    value="7"
    checked={adDuration === 7}
    disabled={
      adLoading ||
      userPlan !== "free"
    }
    onChange={() => setAdDuration(7)}
  />

  <span>7日</span>

  <span className="ml-auto font-bold">
    {userPlan === "free"
      ? "1,500 pt"
      : "利用不可"}
  </span>
</label>

{/* 15日 */}
<label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
  <input
    type="radio"
    name="adDuration"
    value="15"
    checked={adDuration === 15}
    disabled={adLoading}
    onChange={() => setAdDuration(15)}
  />

  <span>15日</span>

  <span className="ml-auto font-bold">
    {userPlan === "free"
      ? "2,500 pt"
      : "0 pt"}
  </span>
</label>

{/* 30日 */}
<label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
  <input
    type="radio"
    name="adDuration"
    value="30"
    checked={adDuration === 30}
    disabled={adLoading}
    onChange={() => setAdDuration(30)}
  />

  <span>30日</span>

  <span className="ml-auto font-bold">
    {userPlan === "free" && "4,500 pt"}
    {userPlan === "premium" && "1,500 pt"}
    {userPlan === "ultimate" && "0 pt"}
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
            {AD_PRICES[userPlan][adDuration] !== null
  ? `${AD_PRICES[userPlan][adDuration].toLocaleString()} pt`
  : "利用不可"}
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

      {/* ポイント購入 */}
<section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="text-2xl font-bold text-gray-900">
    ポイントを購入
  </h2>

  <p className="mt-2 text-sm text-gray-500">
    ポイントを購入して、アイテムや広告出稿に利用できます。
  </p>

  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
    {[
      { points: 100, amount: 100 },
      { points: 300, amount: 300 },
      { points: 500, amount: 500 },
      { points: 1000, amount: 980 },
      { points: 3000, amount: 2980 },
      { points: 5000, amount: 4980 },
      { points: 10000, amount: 9800 },
      { points: 20000, amount: 19800 },
      { points: 30000, amount: 29800 },
    ].map((pack) => (
      <div
        key={pack.points}
        className="rounded-xl border border-gray-200 p-5"
      >
        <p className="text-2xl font-bold text-gray-900">
          {pack.points.toLocaleString()} pt
        </p>

        <p className="mt-2 text-sm text-gray-500">
          ¥{pack.amount.toLocaleString()}
        </p>

        <button
          type="button"
          onClick={async () => {
            try {
              const response = await fetch("/api/stripe/point-checkout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  points: pack.points,
                }),
              })

              const result = await response.json()

              if (!response.ok) {
                alert(result.error || "ポイント購入に失敗しました。")
                return
              }

              if (!result.url) {
                alert("Stripe決済ページを取得できませんでした。")
                return
              }

              window.location.href = result.url
            } catch (error) {
              console.error("ポイント購入エラー:", error)
              alert("ポイント購入処理に失敗しました。")
            }
          }}
          className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-bold text-white hover:bg-gray-800"
        >
          購入する
        </button>
      </div>
    ))}
  </div>
</section>

    </main>
  )
}