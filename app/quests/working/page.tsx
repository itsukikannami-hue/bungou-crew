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

export default function WorkingQuestsPage() {
  const [quests, setQuests] = useState<QuestWithType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkingQuests = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return
        }

        const { data: participants, error: participantError } =
          await supabase
            .from("quest_participants")
            .select("quest_id")
            .eq("user_id", user.id)
            .eq("status", "accepted")

        if (participantError) {
          console.error(
            "対応中クエスト参加情報取得エラー:",
            participantError
          )
          return
        }

        const questIds =
          participants?.map((item) => item.quest_id) ?? []

        if (questIds.length === 0) {
          setQuests([])
          return
        }

        const { data, error } = await supabase
          .from("quests")
          .select(`
            *,
            quest_type:quest_types (
              id,
              name
            )
          `)
          .in("id", questIds)
          .eq("status", "in_progress")
          .order("updated_at", {
            ascending: false,
          })

        if (error) {
          console.error(
            "対応中クエスト取得エラー:",
            error
          )
          return
        }

        setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error(
          "対応中クエスト取得エラー:",
          error
        )
      } finally {
        setLoading(false)
      }
    }

    fetchWorkingQuests()
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
            対応中のクエストを読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/quests"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← クエスト一覧に戻る
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-gray-900">
          対応中のクエスト
        </h1>

        <p className="mt-2 text-gray-500">
          あなたが受注して対応しているクエストです。
        </p>

        {quests.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              現在、対応中のクエストはありません。
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-purple-600">
                    {quest.quest_type?.name ?? "クエスト"}
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    対応中
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {quest.title}
                </h2>

                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600">
                  {quest.description}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      報酬
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
                    className="block w-full rounded-xl bg-black px-5 py-3 text-center font-bold text-white hover:bg-gray-800"
                  >
                    クエストを開く
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