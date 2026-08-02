"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type Profile = {
  user_id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  is_admin: boolean
}

type PointTransaction = {
    id: string
    user_id: string
    amount: number
    type: string
    description: string | null
    created_at: string
    created_by: string | null
  }

export default function AdminUserDetailPage() {


  const params = useParams()
  const userId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showPointModal, setShowPointModal] =
  useState(false)

const [pointType, setPointType] = useState<
  "admin_grant" | "admin_remove"
>("admin_grant")

const [points, setPoints] = useState(0)

const [pointTransactions, setPointTransactions] =
  useState<PointTransaction[]>([])

const [pointHistoryLoading, setPointHistoryLoading] =
  useState(false)

const [pointAmount, setPointAmount] =
  useState("")

const [pointDescription, setPointDescription] =
  useState("")

const [pointLoading, setPointLoading] =
  useState(false)

const [pointError, setPointError] =
  useState("")

const [pointMessage, setPointMessage] =
  useState("")

  const fetchUser = async () => {
    if (!userId) return

    setLoading(true)
    setError("")

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(
        "user_id, username, bio, avatar_url, website, is_admin"
      )
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error(error)
      setError("ユーザー情報の取得に失敗しました。")
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  const fetchPoints = async () => {
    if (!userId) return
  
    console.log("① FETCH POINTS START")
    console.log("② FETCH POINTS USER ID:", userId)
  
    const {
      data,
      error,
      count,
      status,
      statusText,
    } = await supabase
      .from("user_points")
      .select("user_id, points", {
        count: "exact",
      })
      .eq("user_id", userId)
  
    console.log("③ FETCH POINTS RAW RESULT:", {
      error,
      data,
      count,
      status,
      statusText,
    })
  
    if (error) {
      console.error(
        "④ FETCH POINTS ERROR:",
        error
      )
      return
    }
  
    if (!data || data.length === 0) {
      console.log(
        "⑤ user_pointsに該当データがありません"
      )
  
      setPoints(0)
      return
    }
  
    const userPoints = data[0].points ?? 0
  
    console.log(
      "⑥ 取得したポイント:",
      userPoints
    )
  
    setPoints(userPoints)
  
    console.log(
      "⑦ setPoints実行:",
      userPoints
    )
  }

  const fetchPointTransactions = async () => {
    if (!userId) return
  
    setPointHistoryLoading(true)
  
    const {
      data,
      error,
    } = await supabase
      .from("point_transactions")
      .select(
        "id, user_id, amount, type, description, created_at, created_by"
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
  
    console.log(
      "POINT TRANSACTIONS RESULT:",
      {
        data,
        error,
      }
    )
  
    if (error) {
      console.error(
        "ポイント履歴取得エラー:",
        error
      )
  
      setPointTransactions([])
      setPointHistoryLoading(false)
      return
    }
  
    setPointTransactions(
      data || []
    )
  
    setPointHistoryLoading(false)
  }

  const handlePointSubmit = async () => {
    setPointError("")
    setPointMessage("")
  
    const amount = Number(pointAmount)
  
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPointError(
        "1以上のポイントを入力してください。"
      )
      return
    }
  
    if (!pointDescription.trim()) {
      setPointError(
        "ポイント操作の理由を入力してください。"
      )
      return
    }
  
    setPointLoading(true)
  
    try {
      const response = await fetch(
        "/api/admin/points",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            amount,
            type: pointType,
            description: pointDescription,
          }),
        }
      )
  
      const result = await response.json()

      console.log("POINT API RESULT:", result)
  
      if (!response.ok) {
        setPointError(
          result.error ||
            "ポイント処理に失敗しました。"
        )
        return
      }
  
      setPointMessage(
        "ポイントを変更しました。"
      )
  
      setPointAmount("")
      setPointDescription("")
      setShowPointModal(false)

      await fetchPoints()
      await fetchPointTransactions()

  
    } catch (error) {
      console.error(error)
  
      setPointError(
        "ポイント処理に失敗しました。"
      )
    } finally {
      setPointLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
  
    fetchUser()
    fetchPoints()
    fetchPointTransactions()
  }, [userId])

  if (loading) {
    return (
      <div>
        <p className="text-gray-500">
          ユーザー情報を読み込んでいます...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-gray-500 hover:underline"
        >
          ← ユーザー一覧に戻る
        </Link>

        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-gray-500 hover:underline"
        >
          ← ユーザー一覧に戻る
        </Link>

        <p className="mt-6 text-gray-500">
          ユーザーが見つかりません。
        </p>
      </div>
    )
  }

  return (
    <div>

      {/* 戻る */}
      <Link
        href="/admin/users"
        className="text-sm text-gray-500 hover:underline"
      >
        ← ユーザー一覧に戻る
      </Link>

      {/* ヘッダー */}
      <div className="mt-6">

        <h1 className="text-2xl font-bold text-gray-900">
          ユーザー詳細
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          ユーザーの基本情報を確認できます。
        </p>

      </div>

      {/* プロフィール情報 */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl">

        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            基本情報
          </h2>
        </div>

        <div className="p-6 space-y-6">

          {/* ユーザー名 */}
          <div>
            <p className="text-xs text-gray-500">
              ユーザー名
            </p>

            <p className="mt-1 text-gray-900">
              {profile.username || "未設定"}
            </p>
          </div>

          {/* ユーザーID */}
          <div>
            <p className="text-xs text-gray-500">
              ユーザーID
            </p>

            <p className="mt-1 text-sm text-gray-700 break-all">
              {profile.user_id}
            </p>
          </div>

          {/* 自己紹介 */}
          <div>
            <p className="text-xs text-gray-500">
              自己紹介
            </p>

            <p className="mt-1 text-gray-900 whitespace-pre-wrap">
              {profile.bio || "未設定"}
            </p>
          </div>

          {/* Webサイト */}
          <div>
            <p className="text-xs text-gray-500">
              Webサイト
            </p>

            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-blue-600 hover:underline break-all"
              >
                {profile.website}
              </a>
            ) : (
              <p className="mt-1 text-gray-900">
                未設定
              </p>
            )}
          </div>

          {/* 権限 */}
          <div>
            <p className="text-xs text-gray-500">
              権限
            </p>

            <div className="mt-2">

              {profile.is_admin ? (
                <span className="inline-flex rounded-full bg-gray-900 px-3 py-1 text-xs text-white">
                  管理者
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  ユーザー
                </span>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* 今後追加する管理項目 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

      <div className="bg-white border border-gray-200 rounded-2xl p-6">

<h2 className="font-semibold text-gray-900">
  ポイント
</h2>

<p className="mt-3 text-3xl font-bold text-gray-900">
  {points.toLocaleString()} pt
</p>

<p className="mt-2 text-sm text-gray-500">
  現在のポイント残高
</p>

<button
  type="button"
  onClick={() => {
    setPointError("")
    setPointMessage("")
    setPointAmount("")
    setPointDescription("")
    setPointType("admin_grant")
    setShowPointModal(true)
  }}
  className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
>
  ポイントを付与・減算
</button>

</div>

<div className="bg-white border border-gray-200 rounded-2xl p-6 md:col-span-2">

  <div className="flex items-center justify-between">
    <div>
      <h2 className="font-semibold text-gray-900">
        ポイント履歴
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        このユーザーのポイント増減履歴
      </p>
    </div>
  </div>

  <div className="mt-5">

    {pointHistoryLoading ? (
      <p className="text-sm text-gray-500">
        ポイント履歴を読み込んでいます...
      </p>
    ) : pointTransactions.length === 0 ? (
      <p className="text-sm text-gray-500">
        ポイント履歴はありません。
      </p>
    ) : (
      <div className="divide-y divide-gray-200">

        {pointTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="py-4 flex items-center justify-between gap-4"
          >

            <div className="min-w-0">

              <p className="text-sm font-medium text-gray-900">
                {transaction.description || "理由なし"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {new Date(
                  transaction.created_at
                ).toLocaleString("ja-JP")}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {transaction.type}
              </p>

            </div>

            <p
              className={`shrink-0 text-lg font-bold ${
                transaction.amount > 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {transaction.amount > 0 ? "+" : ""}
              {transaction.amount.toLocaleString()} pt
            </p>

          </div>
        ))}

      </div>
    )}

  </div>

</div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900">
            アイテム
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            今後、所持アイテムを表示します。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900">
            作品
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            今後、作品情報を表示します。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900">
            クエスト
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            今後、クエスト情報を表示します。
          </p>
        </div>

      </div>

      {showPointModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

      <h2 className="text-xl font-bold text-gray-900">
        ポイント操作
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        {profile?.username || "このユーザー"}のポイントを変更します。
      </p>

      <div className="mt-6">

        <label className="text-sm font-medium text-gray-700">
          操作
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">

          <button
            type="button"
            onClick={() =>
              setPointType("admin_grant")
            }
            className={`rounded-lg border px-4 py-3 text-sm ${
              pointType === "admin_grant"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-700"
            }`}
          >
            ＋ 付与
          </button>

          <button
            type="button"
            onClick={() =>
              setPointType("admin_remove")
            }
            className={`rounded-lg border px-4 py-3 text-sm ${
              pointType === "admin_remove"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-700"
            }`}
          >
            − 減算
          </button>

        </div>

      </div>

      <div className="mt-5">

        <label
          htmlFor="pointAmount"
          className="text-sm font-medium text-gray-700"
        >
          ポイント数
        </label>

        <input
          id="pointAmount"
          type="number"
          min="1"
          value={pointAmount}
          onChange={(e) =>
            setPointAmount(e.target.value)
          }
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
          placeholder="例：500"
        />

      </div>

      <div className="mt-5">

        <label
          htmlFor="pointDescription"
          className="text-sm font-medium text-gray-700"
        >
          理由
        </label>

        <textarea
          id="pointDescription"
          value={pointDescription}
          onChange={(e) =>
            setPointDescription(e.target.value)
          }
          rows={3}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
          placeholder="例：キャンペーン参加特典"
        />

      </div>

      {pointError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {pointError}
        </div>
      )}

      <div className="mt-6 flex gap-3">

        <button
          type="button"
          onClick={() => {
            setShowPointModal(false)
            setPointError("")
          }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>

        <button
          type="button"
          onClick={handlePointSubmit}
          disabled={pointLoading}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {pointLoading
            ? "処理中..."
            : "実行する"}
        </button>

      </div>

    </div>

  </div>
)}

    </div>

    
  )
}