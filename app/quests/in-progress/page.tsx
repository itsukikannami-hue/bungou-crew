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

export default function InProgressQuestsPage() {
  const [quests, setQuests] = useState<QuestWithType[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInProgressQuests = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setUserId(null)
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase
          .from("quests")
          .select(`
            *,
            quest_type:quest_types (
              id,
              name
            )
          `)
          .eq("requester_id", user.id)
          .eq("status", "in_progress")
          .order("updated_at", {
            ascending: false,
          })

        if (error) {
          console.error("依頼中クエスト取得エラー:", error)
          return
        }

        setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error("依頼中クエスト取得エラー:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInProgressQuests()
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
            依頼中のクエストを読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="font-bold text-gray-700">
              ログインが必要です。
            </p>

            <Link
              href="/quests"
              className="mt-5 inline-block rounded-xl bg-black px-5 py-3 font-bold text-white"
            >
              クエスト一覧へ戻る
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">
          <Link
            href="/quests"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← クエスト一覧に戻る
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            依頼中のクエスト
          </h1>

          <p className="mt-2 text-gray-500">
          あなたが依頼して現在進行中のクエストです。
          </p>
        </div>

        {quests.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              現在、依頼中のクエストはありません。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quests.map((quest) => {
              const isRequester =
                quest.requester_id === userId

              return (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-purple-600">
                      {quest.quest_type?.name ?? "クエスト"}
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      進行中
                    </span>
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {quest.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600">
                    {quest.description}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        あなたの立場
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {isRequester
                          ? "依頼者"
                          : "受注者"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        1人あたり報酬
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {quest.reward_per_person.toLocaleString()} pt
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

                  <div className="mt-5">
                    <Link
                      href={`/quests/${quest.id}`}
                      className="block w-full rounded-xl bg-black px-5 py-3 text-center font-bold text-white transition hover:bg-gray-800"
                    >
                      クエストを開く
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}

