"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type UserPoint = {
  user_id: string
  points: number
  updated_at: string | null
}

type Profile = {
  user_id: string
  username: string | null
}

type PointTransaction = {
  id: string
  user_id: string
  amount: number
  type: string
  description: string | null
  created_by: string | null
  created_at: string
}

type UserRow = UserPoint & {
  profile: Profile | null
}

function formatDate(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getTransactionLabel(type: string) {
  switch (type) {
    case "admin_grant":
      return "管理者付与"

    case "admin_remove":
      return "管理者減算"

    case "subscription_signup":
      return "加入特典"

    case "subscription_monthly":
      return "月額特典"

    case "point_purchase":
      return "ポイント購入"

    case "quest_purchase":
      return "クエスト購入"

    default:
      return type
  }
}

function getTransactionClass(type: string) {
  if (
    type === "admin_grant" ||
    type === "subscription_signup" ||
    type === "subscription_monthly" ||
    type === "point_purchase"
  ) {
    return "bg-green-100 text-green-700"
  }

  if (
    type === "admin_remove" ||
    type === "quest_purchase"
  ) {
    return "bg-red-100 text-red-700"
  }

  return "bg-gray-100 text-gray-700"
}

export default function AdminPointsPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [transactions, setTransactions] =
    useState<PointTransaction[]>([])

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] =
    useState(false)

  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] =
    useState<UserRow | null>(null)

  const [amount, setAmount] = useState("")
  const [description, setDescription] =
    useState("")

  const [errorMessage, setErrorMessage] =
    useState("")
  const [successMessage, setSuccessMessage] =
    useState("")

  useEffect(() => {
    fetchPointData()
  }, [])

  const fetchPointData = async () => {
    setLoading(true)
    setErrorMessage("")

    const {
      data: pointData,
      error: pointError,
    } = await supabase
      .from("user_points")
      .select("user_id, points, updated_at")
      .order("points", {
        ascending: false,
      })

    if (pointError) {
      console.error(
        "user_points取得エラー:",
        pointError
      )

      setErrorMessage(
        "ポイント情報を取得できませんでした。"
      )

      setLoading(false)
      return
    }

    const userIds = [
      ...new Set(
        (pointData || [])
          .map((item) => item.user_id)
          .filter(Boolean)
      ),
    ]

    let profiles: Profile[] = []

    if (userIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds)

      if (profileError) {
        console.error(
          "profiles取得エラー:",
          profileError
        )
      } else {
        profiles = profileData || []
      }
    }

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile,
      ])
    )

    const rows: UserRow[] = (
      pointData || []
    ).map((item) => ({
      ...item,
      profile:
        profileMap.get(item.user_id) || null,
    }))

    setUsers(rows)

    const {
      data: transactionData,
      error: transactionError,
    } = await supabase
      .from("point_transactions")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100)

    if (transactionError) {
      console.error(
        "point_transactions取得エラー:",
        transactionError
      )
    } else {
      setTransactions(
        transactionData || []
      )
    }

    setLoading(false)
  }

  const filteredUsers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    if (!keyword) {
      return users
    }

    return users.filter((user) => {
      const username =
        user.profile?.username
          ?.toLowerCase() || ""

      return (
        username.includes(keyword) ||
        user.user_id
          .toLowerCase()
          .includes(keyword)
      )
    })
  }, [users, search])

  const totalPoints = users.reduce(
    (sum, user) =>
      sum + Number(user.points || 0),
    0
  )

  const totalGrant = transactions
    .filter(
      (transaction) =>
        Number(transaction.amount) > 0
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    )

  const totalRemove = transactions
    .filter(
      (transaction) =>
        Number(transaction.amount) < 0
    )
    .reduce(
      (sum, transaction) =>
        sum +
        Math.abs(
          Number(transaction.amount || 0)
        ),
      0
    )

  const selectUser = (
    user: UserRow
  ) => {
    setSelectedUser(user)
    setAmount("")
    setDescription("")
    setErrorMessage("")
    setSuccessMessage("")
  }

  const closeModal = () => {
    if (processing) {
      return
    }

    setSelectedUser(null)
    setAmount("")
    setDescription("")
    setErrorMessage("")
    setSuccessMessage("")
  }

  const submitPointChange = async (
    type:
      | "admin_grant"
      | "admin_remove"
  ) => {
    if (!selectedUser) {
      return
    }

    setErrorMessage("")
    setSuccessMessage("")

    const parsedAmount =
      Number(amount)

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setErrorMessage(
        "ポイント数を正しく入力してください。"
      )
      return
    }

    if (!description.trim()) {
      setErrorMessage(
        "理由を入力してください。"
      )
      return
    }

    setProcessing(true)

    try {
      const response = await fetch(
        "/api/admin/points",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId:
              selectedUser.user_id,
            amount: parsedAmount,
            type,
            description:
              description.trim(),
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "ポイント処理に失敗しました。"
        )
        return
      }

      setSuccessMessage(
        type === "admin_grant"
          ? `${parsedAmount.toLocaleString()}ptを付与しました。`
          : `${parsedAmount.toLocaleString()}ptを減算しました。`
      )

      setAmount("")
      setDescription("")

      await fetchPointData()

      const updatedUser =
        users.find(
          (user) =>
            user.user_id ===
            selectedUser.user_id
        )

      if (updatedUser) {
        setSelectedUser({
          ...updatedUser,
          points:
            type === "admin_grant"
              ? updatedUser.points +
                parsedAmount
              : updatedUser.points -
                parsedAmount,
        })
      }
    } catch (error) {
      console.error(
        "ポイント変更エラー:",
        error
      )

      setErrorMessage(
        "ポイント処理に失敗しました。"
      )
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">
            ポイント情報を読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ヘッダー */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            ポイント管理
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            ユーザーのポイント残高と履歴を管理できます。
          </p>
        </div>

        {/* エラー */}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* サマリー */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              ユーザー数
            </div>

            <div className="text-2xl font-bold mt-1">
              {users.length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              現在の総ポイント
            </div>

            <div className="text-2xl font-bold mt-1">
              {totalPoints.toLocaleString()}
              pt
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              履歴上の付与 / 減算
            </div>

            <div className="mt-1 font-bold">
              <span className="text-green-600">
                +{totalGrant.toLocaleString()}pt
              </span>

              <span className="mx-2 text-gray-300">
                /
              </span>

              <span className="text-red-600">
                -{totalRemove.toLocaleString()}pt
              </span>
            </div>
          </div>

        </div>

        {/* ユーザー一覧 */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">

          <div className="px-5 py-4 border-b">

            <h2 className="font-bold">
              ユーザー別ポイント
            </h2>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="ユーザー名・ユーザーIDで検索"
              className="mt-3 w-full md:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              ユーザーが見つかりません。
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[800px] w-full text-sm">

                <thead className="bg-gray-50 border-b">

                  <tr>

                    <th className="px-4 py-3 text-left">
                      ユーザー
                    </th>

                    <th className="px-4 py-3 text-left">
                      現在ポイント
                    </th>

                    <th className="px-4 py-3 text-left">
                      最終更新
                    </th>

                    <th className="px-4 py-3 text-left">
                      操作
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredUsers.map(
                    (user) => (
                      <tr
                        key={user.user_id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-4">

                          <div className="font-medium">
                            {user.profile
                              ?.username ||
                              "名無し作家"}
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            {user.user_id}
                          </div>

                        </td>

                        <td className="px-4 py-4 font-bold">
                          {Number(
                            user.points || 0
                          ).toLocaleString()}
                          pt
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {formatDate(
                            user.updated_at
                          )}
                        </td>

                        <td className="px-4 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              selectUser(user)
                            }
                            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700"
                          >
                            ポイント操作
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* 最近の履歴 */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b">

            <h2 className="font-bold">
              最近のポイント履歴
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              最新100件
            </p>

          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              ポイント履歴がありません。
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[900px] w-full text-sm">

                <thead className="bg-gray-50 border-b">

                  <tr>

                    <th className="px-4 py-3 text-left">
                      日時
                    </th>

                    <th className="px-4 py-3 text-left">
                      ユーザーID
                    </th>

                    <th className="px-4 py-3 text-left">
                      増減
                    </th>

                    <th className="px-4 py-3 text-left">
                      種類
                    </th>

                    <th className="px-4 py-3 text-left">
                      内容
                    </th>

                    <th className="px-4 py-3 text-left">
                      操作者
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {transactions.map(
                    (transaction) => {

                      const amount =
                        Number(
                          transaction.amount
                        )

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                          className="hover:bg-gray-50"
                        >

                          <td className="px-4 py-4 whitespace-nowrap">
                            {formatDate(
                              transaction.created_at
                            )}
                          </td>

                          <td className="px-4 py-4">

                            <span className="text-xs text-gray-500 break-all">
                              {
                                transaction.user_id
                              }
                            </span>

                          </td>

                          <td
                            className={`px-4 py-4 font-bold ${
                              amount >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {amount >= 0
                              ? "+"
                              : ""}
                            {amount.toLocaleString()}
                            pt
                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full font-medium ${getTransactionClass(
                                transaction.type
                              )}`}
                            >
                              {getTransactionLabel(
                                transaction.type
                              )}
                            </span>

                          </td>

                          <td className="px-4 py-4">
                            {transaction.description ||
                              "-"}
                          </td>

                          <td className="px-4 py-4">

                            <span className="text-xs text-gray-500 break-all">
                              {transaction.created_by ||
                                "-"}
                            </span>

                          </td>

                        </tr>
                      )
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

      {/* ポイント操作モーダル */}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="text-xl font-bold">
                  ポイント操作
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedUser.profile
                    ?.username ||
                    "名無し作家"}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={processing}
                className="text-gray-400 hover:text-gray-700 text-xl"
              >
                ×
              </button>

            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">

              <div className="text-sm text-gray-500">
                現在ポイント
              </div>

              <div className="text-2xl font-bold mt-1">
                {Number(
                  selectedUser.points || 0
                ).toLocaleString()}
                pt
              </div>

            </div>

            {successMessage && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mb-4">

              <label className="block text-sm font-medium mb-1">
                ポイント数
              </label>

              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="例：1000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

            <div className="mb-5">

              <label className="block text-sm font-medium mb-1">
                理由
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="ポイント操作の理由を入力してください"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={processing}
                onClick={() =>
                  submitPointChange(
                    "admin_grant"
                  )
                }
                className="rounded-lg bg-green-600 text-white py-2.5 font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {processing
                  ? "処理中..."
                  : "＋ 付与"}
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() =>
                  submitPointChange(
                    "admin_remove"
                  )
                }
                className="rounded-lg bg-red-600 text-white py-2.5 font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processing
                  ? "処理中..."
                  : "− 減算"}
              </button>

            </div>

            <button
              type="button"
              disabled={processing}
              onClick={closeModal}
              className="w-full mt-3 rounded-lg bg-gray-100 text-gray-700 py-2.5 font-medium hover:bg-gray-200"
            >
              閉じる
            </button>

          </div>

        </div>
      )}

    </main>
  )
}