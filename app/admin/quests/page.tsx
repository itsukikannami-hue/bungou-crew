"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Quest = {
  id: string
  quest_type_id: string
  requester_id: string
  title: string
  description: string
  reward_per_person: number
  max_participants: number
  deadline: string
  status: string
  target_url: string | null
  created_at: string
  updated_at: string
}

type Profile = {
  user_id: string
  username: string | null
  avatar_url: string | null
}

type QuestWithProfile = Quest & {
  requester: Profile | null
}

const statusLabels: Record<string, string> = {
  open: "募集中",
  in_progress: "進行中",
  completed: "完了",
  cancelled: "キャンセル",
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<QuestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [updatingQuestId, setUpdatingQuestId] =
    useState<string | null>(null)

  useEffect(() => {
    fetchQuests()
  }, [])

  const fetchQuests = async () => {
    try {
      setLoading(true)

      // ログインユーザー取得
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsAdmin(false)
        return
      }

      // 管理者確認
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", user.id)
          .maybeSingle()

      if (profileError) {
        console.error(
          "管理者確認エラー:",
          profileError
        )
        setIsAdmin(false)
        return
      }

      if (!profile?.is_admin) {
        setIsAdmin(false)
        return
      }

      setIsAdmin(true)

      // クエスト取得
      const {
        data: questData,
        error: questError,
      } = await supabase
        .from("quests")
        .select(`
          id,
          quest_type_id,
          requester_id,
          title,
          description,
          reward_per_person,
          max_participants,
          deadline,
          status,
          target_url,
          created_at,
          updated_at
        `)
        .order("created_at", {
          ascending: false,
        })

      if (questError) {
        console.error(
          "クエスト取得エラー:",
          questError
        )
        return
      }

      if (!questData || questData.length === 0) {
        setQuests([])
        return
      }

      // 依頼者ID取得
      const requesterIds = [
        ...new Set(
          questData.map(
            (quest) => quest.requester_id
          )
        ),
      ]

      // 依頼者プロフィール取得
      const {
        data: profileData,
        error: profileDataError,
      } = await supabase
        .from("profiles")
        .select(`
          user_id,
          username,
          avatar_url
        `)
        .in("user_id", requesterIds)

      if (profileDataError) {
        console.error(
          "依頼者プロフィール取得エラー:",
          profileDataError
        )
      }

      // クエストとプロフィールを結合
      const questsWithProfiles =
        questData.map((quest) => {
          const requester =
            profileData?.find(
              (profile) =>
                profile.user_id ===
                quest.requester_id
            ) ?? null

          return {
            ...quest,
            requester,
          }
        })

      setQuests(
        questsWithProfiles as QuestWithProfile[]
      )
    } catch (error) {
      console.error(
        "クエスト取得エラー:",
        error
      )
    } finally {
      setLoading(false)
    }
  }

  // 強制キャンセル
  const handleCancelQuest = async (
    questId: string
  ) => {
    if (updatingQuestId) return

    const quest = quests.find(
      (item) => item.id === questId
    )

    if (!quest) return

    const confirmed = window.confirm(
      `「${quest.title}」を強制的にキャンセルしますか？\n\nこの操作は管理者による対応です。`
    )

    if (!confirmed) return

    try {
      setUpdatingQuestId(questId)

      const {
        data,
        error,
      } = await supabase
        .from("quests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", questId)
        .select(`
          id,
          status,
          updated_at
        `)
        .single()

      if (error) {
        console.error(
          "クエストキャンセルエラー:",
          error
        )

        alert(
          error.message ||
          "クエストのキャンセルに失敗しました。"
        )

        return
      }

      // 一覧を即時更新
      setQuests((currentQuests) =>
        currentQuests.map((quest) =>
          quest.id === questId
            ? {
                ...quest,
                status: data.status,
                updated_at: data.updated_at,
              }
            : quest
        )
      )

      alert(
        "クエストをキャンセルしました。"
      )
    } catch (error) {
      console.error(
        "クエストキャンセルエラー:",
        error
      )

      alert(
        "クエストのキャンセルに失敗しました。"
      )
    } finally {
      setUpdatingQuestId(null)
    }
  }

  // ステータス別件数
  const counts = useMemo(() => {
    return {
      all: quests.length,
      open: quests.filter(
        (quest) => quest.status === "open"
      ).length,
      in_progress: quests.filter(
        (quest) =>
          quest.status === "in_progress"
      ).length,
      completed: quests.filter(
        (quest) =>
          quest.status === "completed"
      ).length,
      cancelled: quests.filter(
        (quest) =>
          quest.status === "cancelled"
      ).length,
    }
  }, [quests])

  // 検索・絞り込み
  const filteredQuests = useMemo(() => {
    const keyword =
      search.trim().toLowerCase()

    return quests.filter((quest) => {
      const matchesStatus =
        statusFilter === "all" ||
        quest.status === statusFilter

      if (!matchesStatus) {
        return false
      }

      if (!keyword) {
        return true
      }

      const title =
        quest.title?.toLowerCase() ?? ""

      const description =
        quest.description?.toLowerCase() ?? ""

      const requesterName =
        quest.requester?.username
          ?.toLowerCase() ?? ""

      return (
        title.includes(keyword) ||
        description.includes(keyword) ||
        requesterName.includes(keyword)
      )
    })
  }, [
    quests,
    search,
    statusFilter,
  ])

  const formatDate = (
    value: string
  ) => {
    return new Date(value).toLocaleString(
      "ja-JP"
    )
  }

  const isDeadlinePassed = (
    deadline: string
  ) => {
    return (
      new Date(deadline).getTime() <
      Date.now()
    )
  }

  if (loading) {
    return (
      <div>
        <p className="text-gray-500">
          クエストを読み込んでいます...
        </p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            アクセス権限がありません
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            このページは管理者のみ利用できます。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          クエスト管理
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          登録されているクエストを確認・管理できます。
        </p>
      </div>

      {/* 件数カード */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <button
          type="button"
          onClick={() =>
            setStatusFilter("all")
          }
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${
            statusFilter === "all"
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-500">
            全クエスト
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {counts.all}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter("open")
          }
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${
            statusFilter === "open"
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-500">
            募集中
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {counts.open}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter("in_progress")
          }
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${
            statusFilter === "in_progress"
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-500">
            進行中
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {counts.in_progress}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter("completed")
          }
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${
            statusFilter === "completed"
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-500">
            完了
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {counts.completed}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter("cancelled")
          }
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${
            statusFilter === "cancelled"
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-500">
            キャンセル
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {counts.cancelled}
          </p>
        </button>

      </div>

      {/* 検索・絞り込み */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">

          <div>
            <label className="text-sm font-bold text-gray-700">
              クエストを検索
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="タイトル・説明・依頼者名で検索"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">
              ステータス
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
            >
              <option value="all">
                すべて
              </option>

              <option value="open">
                募集中
              </option>

              <option value="in_progress">
                進行中
              </option>

              <option value="completed">
                完了
              </option>

              <option value="cancelled">
                キャンセル
              </option>
            </select>
          </div>

        </div>

      </div>

      {/* 一覧 */}
      <div className="mt-6">

        <div className="mb-3 flex items-center justify-between">

          <h2 className="text-lg font-bold text-gray-900">
            クエスト一覧
          </h2>

          <p className="text-sm text-gray-500">
            {filteredQuests.length}件
          </p>

        </div>

        {filteredQuests.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-500">
              条件に一致するクエストはありません。
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {filteredQuests.map((quest) => {

              const requesterName =
                quest.requester?.username ||
                "名前未設定"

              const canCancel =
                quest.status === "open" ||
                quest.status === "in_progress"

              return (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >

                  {/* 上部 */}
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            quest.status === "open"
                              ? "bg-blue-100 text-blue-700"
                              : quest.status === "in_progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : quest.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabels[
                            quest.status
                          ] ?? quest.status}
                        </span>

                        {quest.status ===
                          "open" &&
                          isDeadlinePassed(
                            quest.deadline
                          ) && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              締切超過
                            </span>
                          )}

                      </div>

                      <h3 className="mt-3 text-lg font-bold text-gray-900">
                        {quest.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                        {quest.description}
                      </p>

                    </div>

                    <div className="shrink-0">

                      <Link
                        href={`/quests/${quest.id}`}
                        target="_blank"
                        className="inline-flex rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      >
                        クエストを見る
                      </Link>

                    </div>

                  </div>

                  {/* 情報 */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        依頼者
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {requesterName}
                      </p>

                      <p className="mt-1 break-all text-xs text-gray-400">
                        {quest.requester_id}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        報酬 / 1人
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {quest.reward_per_person.toLocaleString()}
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          pt
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        最大参加人数
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {quest.max_participants}
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          人
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        締切
                      </p>

                      <p
                        className={`mt-1 text-sm font-bold ${
                          isDeadlinePassed(
                            quest.deadline
                          ) &&
                          quest.status === "open"
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formatDate(
                          quest.deadline
                        )}
                      </p>
                    </div>

                  </div>

                  {/* メタ情報 */}
                  <div className="mt-4 flex flex-col gap-1 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">

                    <p>
                      クエストID：
                      {quest.id}
                    </p>

                    <p>
                      作成：
                      {formatDate(
                        quest.created_at
                      )}
                    </p>

                  </div>

                  {/* 管理者操作 */}
                  {canCancel && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">

                      <button
                        type="button"
                        onClick={() =>
                          handleCancelQuest(
                            quest.id
                          )
                        }
                        disabled={
                          updatingQuestId !==
                          null
                        }
                        className="rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {updatingQuestId ===
                        quest.id
                          ? "処理しています..."
                          : "クエストを強制キャンセル"}
                      </button>

                    </div>
                  )}

                </div>
              )
            })}

          </div>
        )}

      </div>

    </div>
  )
}