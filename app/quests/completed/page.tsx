"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

type QuestType = {
  id: string
  name: string
}

type QuestWithType = Quest & {
  quest_type: QuestType | null
}

export default function CompletedQuestsPage() {
  const [quests, setQuests] = useState<QuestWithType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompletedQuests = async () => {
      try {
        // ----------------------------------------
        // 1. ログインユーザー取得
        // ----------------------------------------
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("ユーザー取得エラー:", userError)
          return
        }

        if (!user) {
          console.error("ログインが必要です。")
          return
        }

        // ----------------------------------------
        // 2. 自分が参加したクエストIDを取得
        // ----------------------------------------
        const { data: participantData, error: participantError } =
          await supabase
            .from("quest_participants")
            .select("quest_id")
            .eq("user_id", user.id)

        if (participantError) {
          console.error(
            "参加クエスト取得エラー:",
            participantError
          )
          return
        }

        const participantQuestIds =
          participantData?.map((item) => item.quest_id) ?? []

        // ----------------------------------------
        // 3. 自分が依頼者 or 参加者の完了クエストを取得
        // ----------------------------------------
        let query = supabase
          .from("quests")
          .select(`
            *,
            quest_type:quest_types (
              id,
              name
            )
          `)
          .eq("status", "completed")

        if (participantQuestIds.length > 0) {
          const ids = participantQuestIds.join(",")

          query = query.or(
            `requester_id.eq.${user.id},id.in.(${ids})`
          )
        } else {
          query = query.eq("requester_id", user.id)
        }

        const { data, error } = await query.order("updated_at", {
          ascending: false,
        })

        if (error) {
          console.error(
            "完了クエスト取得エラー:",
            error
          )
          return
        }

        setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error(
          "完了クエスト取得エラー:",
          error
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCompletedQuests()
  }, [])

  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-500">
            完了したクエストを読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            完了したクエスト
          </h1>

          <p className="mt-2 text-gray-500">
            あなたが依頼したクエスト、または参加したクエストの履歴です。
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/quests"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-900 hover:bg-gray-50"
            >
              クエスト一覧
            </Link>

            <Link
              href="/quests/in-progress"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-900 hover:bg-gray-50"
            >
              依頼中のクエスト
            </Link>

            <Link
              href="/quests/working"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-900 hover:bg-gray-50"
            >
              対応中のクエスト
            </Link>
          </div>
        </div>

        {/* クエストがない場合 */}
        {quests.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              完了したクエストはありません。
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {quests.map((quest) => (
              <div
                key={quest.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >

                {/* 完了表示 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-purple-600">
                    {quest.quest_type?.name ?? "クエスト"}
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    完了
                  </span>
                </div>

                {/* タイトル */}
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {quest.title}
                </h2>

                {/* 内容 */}
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                  {quest.description}
                </p>

                {/* 情報 */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      1人あたり報酬
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {quest.reward_per_person.toLocaleString()} pt
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      募集人数
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {quest.max_participants}人
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      期限
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatDeadline(quest.deadline)}
                    </p>
                  </div>

                </div>

                {/* 詳細 */}
                <div className="mt-5">
                  <Link
                    href={`/quests/${quest.id}`}
                    className="block w-full rounded-xl bg-black px-5 py-3 text-center font-bold text-white transition hover:bg-gray-800"
                  >
                    クエスト詳細を見る
                  </Link>
                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  )
}