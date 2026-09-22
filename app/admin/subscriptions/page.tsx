"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string | null
  price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  created_at: string
  updated_at: string
}

type Profile = {
  user_id: string
  username: string | null
}

type SubscriptionRow = Subscription & {
  profile: Profile | null
}

type FilterPlan = "all" | "premium" | "ultimate"

const PREMIUM_PRICE_ID =
  "price_1U4LyALv5LHp5vrDZvfNeR7o"

const ULTIMATE_PRICE_ID =
  "price_1UHoPBLv5LHp5vrDcG2MwFIy"

function getPlan(priceId: string | null) {
  if (priceId === PREMIUM_PRICE_ID) {
    return "premium"
  }

  if (priceId === ULTIMATE_PRICE_ID) {
    return "ultimate"
  }

  return "unknown"
}

function getPlanLabel(priceId: string | null) {
  const plan = getPlan(priceId)

  if (plan === "premium") {
    return "Premium ¥500"
  }

  if (plan === "ultimate") {
    return "Ultimate ¥980"
  }

  return "不明"
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

function getStatusLabel(status: string | null) {
  switch (status) {
    case "active":
      return "契約中"

    case "trialing":
      return "トライアル"

    case "past_due":
      return "支払い遅延"

    case "canceled":
      return "解約済み"

    case "incomplete":
      return "未完了"

    case "incomplete_expired":
      return "期限切れ"

    case "unpaid":
      return "未払い"

    default:
      return status || "-"
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700"

    case "trialing":
      return "bg-blue-100 text-blue-700"

    case "past_due":
    case "unpaid":
      return "bg-red-100 text-red-700"

    case "canceled":
    case "incomplete_expired":
      return "bg-gray-100 text-gray-600"

    default:
      return "bg-yellow-100 text-yellow-700"
  }
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [filterPlan, setFilterPlan] = useState<FilterPlan>("all")

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    setLoading(true)
    setErrorMessage("")

    const {
      data: subscriptionsData,
      error: subscriptionsError,
    } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", {
        ascending: false,
      })

    if (subscriptionsError) {
      console.error(
        "subscriptions取得エラー:",
        subscriptionsError
      )

      setErrorMessage(
        "契約情報を取得できませんでした。"
      )

      setLoading(false)
      return
    }

    const userIds = [
      ...new Set(
        (subscriptionsData || [])
          .map((item) => item.user_id)
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

    const rows: SubscriptionRow[] = (
      subscriptionsData || []
    ).map((subscription) => ({
      ...subscription,
      profile:
        profileMap.get(subscription.user_id) || null,
    }))

    setSubscriptions(rows)
    setLoading(false)
  }

  const filteredSubscriptions = useMemo(() => {
    if (filterPlan === "all") {
      return subscriptions
    }

    return subscriptions.filter(
      (subscription) =>
        getPlan(subscription.price_id) ===
        filterPlan
    )
  }, [subscriptions, filterPlan])

  const activeCount = subscriptions.filter(
    (subscription) =>
      subscription.status === "active"
  ).length

  const premiumCount = subscriptions.filter(
    (subscription) =>
      getPlan(subscription.price_id) === "premium"
  ).length

  const ultimateCount = subscriptions.filter(
    (subscription) =>
      getPlan(subscription.price_id) === "ultimate"
  ).length

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">
            契約情報を読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            契約プラン管理
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            ユーザーのPremium・Ultimate契約状況を確認できます。
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* サマリー */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              契約中
            </div>

            <div className="text-2xl font-bold mt-1">
              {activeCount}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              Premium
            </div>

            <div className="text-2xl font-bold mt-1 text-blue-600">
              {premiumCount}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">
              Ultimate
            </div>

            <div className="text-2xl font-bold mt-1 text-purple-600">
              {ultimateCount}
            </div>
          </div>

        </div>

        {/* フィルター */}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => setFilterPlan("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterPlan === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              すべて
            </button>

            <button
              type="button"
              onClick={() => setFilterPlan("premium")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterPlan === "premium"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Premium
            </button>

            <button
              type="button"
              onClick={() => setFilterPlan("ultimate")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterPlan === "ultimate"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Ultimate
            </button>

          </div>

        </div>

        {/* 一覧 */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b">
            <h2 className="font-bold">
              契約一覧
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {filteredSubscriptions.length}件
            </p>
          </div>

          {filteredSubscriptions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              契約情報がありません。
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[1200px] w-full text-sm">

                <thead className="bg-gray-50 border-b">

                  <tr>
                    <th className="px-4 py-3 text-left">
                      ユーザー
                    </th>

                    <th className="px-4 py-3 text-left">
                      プラン
                    </th>

                    <th className="px-4 py-3 text-left">
                      状態
                    </th>

                    <th className="px-4 py-3 text-left">
                      契約開始
                    </th>

                    <th className="px-4 py-3 text-left">
                      契約終了
                    </th>

                    <th className="px-4 py-3 text-left">
                      解約予定
                    </th>

                    <th className="px-4 py-3 text-left">
                      Stripe Subscription
                    </th>
                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredSubscriptions.map(
                    (subscription) => {

                      const plan =
                        getPlan(subscription.price_id)

                      return (
                        <tr
                          key={subscription.id}
                          className="hover:bg-gray-50"
                        >

                          <td className="px-4 py-4">

                            <div className="font-medium">
                              {subscription.profile
                                ?.username ||
                                "名無し作家"}
                            </div>

                            <div className="text-xs text-gray-400 mt-1">
                              {subscription.user_id}
                            </div>

                          </td>

                          <td className="px-4 py-4">

                            {plan === "premium" ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                Premium ¥500
                              </span>
                            ) : plan === "ultimate" ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                                Ultimate ¥980
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                {getPlanLabel(
                                  subscription.price_id
                                )}
                              </span>
                            )}

                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full font-medium ${getStatusClass(
                                subscription.status
                              )}`}
                            >
                              {getStatusLabel(
                                subscription.status
                              )}
                            </span>

                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {formatDate(
                              subscription.current_period_start
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {formatDate(
                              subscription.current_period_end
                            )}
                          </td>

                          <td className="px-4 py-4">

                            {subscription.cancel_at_period_end ? (
                              <span className="text-red-600 font-medium">
                                期間終了で解約
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                -
                              </span>
                            )}

                          </td>

                          <td className="px-4 py-4">

                            <span className="text-xs text-gray-500 break-all">
                              {subscription.stripe_subscription_id ||
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
    </main>
  )
}