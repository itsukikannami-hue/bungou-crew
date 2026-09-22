"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Payment = {
  id: string
  user_id: string
  subscription_id: string | null
  product_name: string
  amount: number
  currency: string
  status: string
  stripe_payment_id: string | null
  stripe_invoice_id: string | null
  stripe_checkout_session_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

type Profile = {
  user_id: string
  username: string | null
}

type PaymentRow = Payment & {
  profile: Profile | null
}

type FilterStatus =
  | "all"
  | "succeeded"
  | "pending"
  | "failed"
  | "refunded"
  | "canceled"

function formatAmount(
  amount: number,
  currency: string
) {
  if (currency.toLowerCase() === "jpy") {
    return `¥${amount.toLocaleString("ja-JP")}`
  }

  return `${amount.toLocaleString("ja-JP")} ${currency.toUpperCase()}`
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

function getStatusLabel(status: string) {
  switch (status) {
    case "succeeded":
      return "成功"

    case "pending":
      return "処理中"

    case "failed":
      return "失敗"

    case "refunded":
      return "返金済み"

    case "canceled":
      return "キャンセル"

    default:
      return status
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-green-100 text-green-700"

    case "pending":
      return "bg-yellow-100 text-yellow-700"

    case "failed":
      return "bg-red-100 text-red-700"

    case "refunded":
      return "bg-purple-100 text-purple-700"

    case "canceled":
      return "bg-gray-100 text-gray-600"

    default:
      return "bg-gray-100 text-gray-600"
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("all")

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    setErrorMessage("")

    const {
      data: paymentsData,
      error: paymentsError,
    } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", {
        ascending: false,
      })

    if (paymentsError) {
      console.error(
        "payments取得エラー:",
        paymentsError
      )

      setErrorMessage(
        "決済情報を取得できませんでした。"
      )

      setLoading(false)
      return
    }

    const userIds = [
      ...new Set(
        (paymentsData || [])
          .map((payment) => payment.user_id)
          .filter(Boolean)
      ),
    ]

    let profiles: Profile[] = []

    if (userIds.length > 0) {
      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds)

      if (profilesError) {
        console.error(
          "profiles取得エラー:",
          profilesError
        )
      } else {
        profiles = profilesData || []
      }
    }

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile,
      ])
    )

    const rows: PaymentRow[] = (
      paymentsData || []
    ).map((payment) => ({
      ...payment,
      profile:
        profileMap.get(payment.user_id) || null,
    }))

    setPayments(rows)
    setLoading(false)
  }

  const filteredPayments = useMemo(() => {
    if (filterStatus === "all") {
      return payments
    }

    return payments.filter(
      (payment) =>
        payment.status === filterStatus
    )
  }, [payments, filterStatus])

  const succeededPayments = payments.filter(
    (payment) =>
      payment.status === "succeeded"
  )

  const totalRevenue = succeededPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  )

  const succeededCount =
    succeededPayments.length

  const failedCount = payments.filter(
    (payment) =>
      payment.status === "failed"
  ).length

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">
            決済情報を読み込んでいます...
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
            決済管理
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            ユーザーの決済履歴を確認できます。
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
              決済成功額
            </div>

            <div className="text-2xl font-bold mt-1">
              ¥{totalRevenue.toLocaleString("ja-JP")}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              成功決済
            </div>

            <div className="text-2xl font-bold mt-1 text-green-600">
              {succeededCount}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              失敗決済
            </div>

            <div className="text-2xl font-bold mt-1 text-red-600">
              {failedCount}
            </div>
          </div>

        </div>

        {/* フィルター */}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setFilterStatus("all")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              すべて
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterStatus("succeeded")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "succeeded"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              成功
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterStatus("pending")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "pending"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              処理中
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterStatus("failed")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "failed"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              失敗
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterStatus("refunded")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "refunded"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              返金済み
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterStatus("canceled")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === "canceled"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              キャンセル
            </button>

          </div>

        </div>

        {/* 決済一覧 */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b">
            <h2 className="font-bold">
              決済履歴
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {filteredPayments.length}件
            </p>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              決済情報がありません。
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[1300px] w-full text-sm">

                <thead className="bg-gray-50 border-b">

                  <tr>

                    <th className="px-4 py-3 text-left">
                      ユーザー
                    </th>

                    <th className="px-4 py-3 text-left">
                      商品
                    </th>

                    <th className="px-4 py-3 text-left">
                      金額
                    </th>

                    <th className="px-4 py-3 text-left">
                      状態
                    </th>

                    <th className="px-4 py-3 text-left">
                      決済日時
                    </th>

                    <th className="px-4 py-3 text-left">
                      Stripe Payment
                    </th>

                    <th className="px-4 py-3 text-left">
                      Invoice
                    </th>

                    <th className="px-4 py-3 text-left">
                      Checkout
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredPayments.map(
                    (payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-4">

                          <div className="font-medium">
                            {payment.profile
                              ?.username ||
                              "名無し作家"}
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            {payment.user_id}
                          </div>

                        </td>

                        <td className="px-4 py-4">
                          {payment.product_name}
                        </td>

                        <td className="px-4 py-4 font-medium whitespace-nowrap">
                          {formatAmount(
                            Number(
                              payment.amount || 0
                            ),
                            payment.currency
                          )}
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full font-medium ${getStatusClass(
                              payment.status
                            )}`}
                          >
                            {getStatusLabel(
                              payment.status
                            )}
                          </span>

                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(
                            payment.paid_at ||
                              payment.created_at
                          )}
                        </td>

                        <td className="px-4 py-4">

                          <span className="text-xs text-gray-500 break-all">
                            {payment.stripe_payment_id ||
                              "-"}
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          <span className="text-xs text-gray-500 break-all">
                            {payment.stripe_invoice_id ||
                              "-"}
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          <span className="text-xs text-gray-500 break-all">
                            {payment.stripe_checkout_session_id ||
                              "-"}
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  )
}