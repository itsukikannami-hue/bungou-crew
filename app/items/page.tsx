"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import OwnedItemsPanel from "@/components/OwnedItemsPanel"

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

type PointTransaction = {
  id: string
  amount: number
  type: string | null
  description: string | null
  created_at: string
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
  const [activeTab, setActiveTab] = useState<"items" | "points" | "ads">("items")
  const [items, setItems] = useState<Item[]>([])
  const [ownedOpen, setOwnedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
const [pointsLoading, setPointsLoading] = useState(true)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState("")
  const [historyLimit, setHistoryLimit] = useState(20)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

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


  // ポイントの増減履歴。購入記録との二重計上を避けるため取引台帳のみ参照。
  const fetchPointHistory = async (limit = 20) => {
    setHistoryLoading(true)
    setHistoryError("")
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setTransactions([])
      setHasMoreHistory(false)
      setHistoryError("履歴を見るにはログインしてください。")
      setHistoryLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("point_transactions")
      .select("id,amount,type,description,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1)

    if (error) {
      console.error("ポイント履歴取得エラー:", error)
      setHistoryError("履歴を取得できませんでした。閲覧権限や通信状態をご確認ください。")
      setHistoryLoading(false)
      return
    }
    setTransactions((data ?? []).slice(0, limit))
    setHasMoreHistory((data ?? []).length > limit)
    setHistoryLoading(false)
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
    fetchPointHistory()
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
      await fetchPoints()
      await fetchPointHistory(historyLimit)
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
      await fetchPoints()
      await fetchPointHistory(historyLimit)
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
    <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-6 text-[#594638] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-[#694b38]">ショップ</h1>
          <p className="mt-2 text-sm text-[#947e6d]">執筆のおともを見つけよう</p>
        </div>
        <section className="mb-5 rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-[#947e6d]">現在の所持ポイント</p>
          {pointsLoading ? (
            <p className="mt-2 text-[#947e6d]">読み込み中...</p>
          ) : (
            <p className="mt-2 text-3xl font-bold text-[#bc7d4b]">{points.toLocaleString()} <span className="text-base">pt</span></p>
          )}
          <button type="button" onClick={() => setActiveTab("points")}
            className="mt-4 w-full rounded-xl bg-[#d78f57] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c88047]">
            ポイントを購入する
          </button>
        </section>
        <div className="mb-5">
          <button type="button" onClick={() => setOwnedOpen(v => !v)} aria-expanded={ownedOpen} aria-controls="owned-items-shop" className={`flex w-full items-center justify-between border border-[#f0e1d2] bg-white px-5 py-4 text-left font-bold text-[#a36a40] shadow-sm hover:bg-[#fff5e9] ${ownedOpen ? "rounded-t-2xl" : "rounded-2xl"}`}>
            所持アイテム一覧を見る <span aria-hidden="true">{ownedOpen ? "▲" : "▼"}</span>
          </button>
          <div id="owned-items-shop"><OwnedItemsPanel open={ownedOpen} /></div>
        </div>
        <div role="tablist" aria-label="ショップの表示切り替え" className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#f0e1d2] bg-white p-1.5">
          {([
            { id: "items", label: "アイテム" },
            { id: "points", label: "ポイント" },
            { id: "ads", label: "広告" },
          ] as const).map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-2 py-3 text-sm font-bold transition ${activeTab === tab.id ? "bg-[#fff0df] text-[#bd7846]" : "text-[#947e6d] hover:bg-[#fffaf2]"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "items" && (
          <section aria-label="アイテムショップ">
{/* アイテムショップ */}
      <h2 className="text-xl font-bold text-[#694b38]">アイテムショップ</h2>

      <p className="mt-2 text-gray-500">
        ポイントを使ってアイテムを購入できます。
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3">

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm"
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
              className="mt-5 rounded-xl bg-[#d78f57] px-5 py-3 font-bold text-white hover:bg-[#c88047]"
            >
              購入
            </button>

          </div>
        ))}

      </div>

          </section>
        )}
        {activeTab === "ads" && (
          <section aria-label="広告出稿">
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
  <div className="mt-5 flex flex-col gap-3 sm:flex-row">

    <button
      type="button"
      onClick={() =>
        setShowAdForm(true)
      }
      className="rounded-xl bg-[#d78f57] px-5 py-3 text-sm font-bold text-white hover:bg-[#c88047]"
    >
      広告を出稿する
    </button>

    <Link
      href="/ads/stats"
      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
    >
      📊 広告統計を見る
    </Link>

  </div>
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
              className="flex-1 rounded-xl bg-[#d78f57] px-5 py-3 font-bold text-white hover:bg-[#c88047] disabled:opacity-50"
            >
              {adLoading
                ? "処理中..."
                : "広告を出稿する"}
            </button>

          </div>

        </section>
      )}

                </section>
        )}
        {activeTab === "points" && (
          <section aria-label="ポイント管理">
{/* ポイント購入 */}
<section className="mb-5 rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm">
  <h2 className="text-xl font-bold text-[#694b38]">
    ポイントを購入
  </h2>

  <p className="mt-2 text-sm text-gray-500">
    ポイントを購入して、アイテムや広告出稿に利用できます。
  </p>

  <div className="mt-6 grid grid-cols-1 gap-3">
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
          className="mt-4 w-full rounded-xl bg-[#d78f57] px-4 py-3 font-bold text-white hover:bg-[#c88047]"
        >
          購入する
        </button>
      </div>
    ))}
  </div>
</section>

            {/* ポイント取引履歴 */}
            <section aria-label="ポイント履歴" className="mb-6 rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#694b38]">ポイント履歴</h2>
                  <p className="mt-1 text-sm text-[#947e6d]">獲得・購入・使用したポイントの記録</p>
                </div>
                <button type="button" onClick={() => { fetchPoints(); fetchPointHistory(historyLimit) }}
                  disabled={historyLoading} className="rounded-xl border border-[#f0d9c4] px-3 py-2 text-sm font-semibold text-[#bc7d4b] hover:bg-[#fff7ee] disabled:opacity-50">
                  更新
                </button>
              </div>
              {historyLoading ? (
                <p className="py-8 text-center text-sm text-[#947e6d]">履歴を読み込んでいます...</p>
              ) : historyError ? (
                <p role="alert" className="py-8 text-center text-sm text-[#b45d50]">{historyError}</p>
              ) : transactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#947e6d]">まだポイントの取引履歴がありません。</p>
              ) : (
                <div className="mt-4 divide-y divide-[#f4e9dc]">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[#694b38]">
                          {transaction.description?.trim() || transaction.type || "ポイント取引"}
                        </p>
                        <p className="mt-1 text-xs text-[#947e6d]">
                          {new Date(transaction.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`shrink-0 font-bold tabular-nums ${transaction.amount >= 0 ? "text-[#bc7d4b]" : "text-[#947e6d]"}`}>
                        {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()} pt
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {!historyLoading && !historyError && hasMoreHistory && (
                <button type="button" onClick={() => { const next = historyLimit + 20; setHistoryLimit(next); fetchPointHistory(next) }}
                  className="mt-4 w-full rounded-xl border border-[#f0d9c4] py-3 text-sm font-semibold text-[#bc7d4b] hover:bg-[#fff7ee]">
                  さらに20件表示
                </button>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  )
}