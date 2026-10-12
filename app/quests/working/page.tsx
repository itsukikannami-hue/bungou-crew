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
  const [errorMessage, setErrorMessage] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const fetchWorkingQuests = async () => {
      if (active) { setLoading(true); setErrorMessage("") }
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
          throw participantError
        }

        const questIds =
          participants?.map((item) => item.quest_id) ?? []

        if (questIds.length === 0) {
          if (active) setQuests([])
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
          throw error
        }

        if (active) setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error("対応中クエスト取得エラー:", error)
        if (active) setErrorMessage("対応中のクエストを取得できませんでした。")
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchWorkingQuests()
    return () => { active = false }
  }, [retryKey])

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
      <main className="min-h-screen bg-[#fffaf2] px-4 py-7 pb-28 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div role="status" aria-busy="true" aria-label="対応中のクエストを読み込み中" className="space-y-4">
            <span className="sr-only">対応中のクエストを読み込んでいます</span>
            {[1, 2, 3].map((n) => (
              <div key={n} aria-hidden="true" className="animate-pulse rounded-3xl border border-[#f0e3d4] bg-white p-6">
                <div className="h-5 w-24 rounded bg-[#f4e9dd]" />
                <div className="mt-4 h-6 w-2/3 rounded bg-[#f4e9dd]" />
                <div className="mt-4 h-4 w-full rounded bg-[#f4e9dd]" />
                <div className="mt-6 h-12 rounded-2xl bg-[#f4e9dd]" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#fffaf2] px-4 pb-28 pt-7 sm:px-6">
        <div role="alert" className="mx-auto max-w-4xl rounded-3xl border border-[#f0e3d4] bg-white p-8 text-center">
          <p className="font-bold text-[#654b37]">{errorMessage}</p>
          <button type="button" onClick={() => setRetryKey((n) => n + 1)}
            className="mt-5 min-h-11 rounded-2xl bg-[#dc985e] px-6 py-3 font-bold text-white hover:bg-[#c9844d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            再試行する
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-7 pb-28 sm:px-6">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/quests"
          className="text-sm font-medium text-[#927d6b] hover:text-[#bb7843]"
        >
          ← クエスト一覧に戻る
        </Link>

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#654b37] sm:text-3xl">
          対応中のクエスト
        </h1>

        <p className="mt-2 text-[#927d6b]">
          あなたが受注して対応しているクエストです。
        </p>

        
        {/* クエスト画面の共通ナビゲーション */}
        <nav aria-label="クエストの表示切り替え" className="mb-7 mt-6 flex gap-2 overflow-x-auto border-b border-[#eedfcd] pb-3">
          {[
            { href: "/quests", label: "募集中", key: "open" },
            { href: "/quests/in-progress", label: "依頼中", key: "in-progress" },
            { href: "/quests/working", label: "参加中", key: "working" },
            { href: "/quests/completed", label: "完了", key: "completed" },
          ].map((tab) => (
            <Link key={tab.key} href={tab.href} aria-current={tab.key === "working" ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab.key === "working" ? "bg-[#e8a56d] text-white shadow-sm" : "bg-white text-[#826b57] hover:bg-[#fff0df]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        {quests.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#f0e3d4] bg-white p-8 text-center">
            <p className="text-[#927d6b]">
              現在、対応中のクエストはありません。
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="rounded-3xl border border-[#f0e3d4] bg-white p-6 shadow-[0_4px_18px_rgba(133,94,56,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[#bf824d]">
                    {quest.quest_type?.name ?? "クエスト"}
                  </div>

                  <span className="rounded-full bg-[#fff0db] px-3 py-1 text-xs font-bold text-[#a86a39]">
                    対応中
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold text-[#654b37]">
                  {quest.title}
                </h2>

                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-[#7e6c5c]">
                  {quest.description}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#fff5e9] p-4">
                    <p className="text-xs text-[#927d6b]">
                      報酬
                    </p>

                    <p className="mt-1 font-bold text-[#654b37]">
                      {quest.reward_per_person.toLocaleString()} pt
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fff5e9] p-4">
                    <p className="text-xs text-[#927d6b]">
                      期限
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#654b37]">
                      {formatDeadline(quest.deadline)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/quests/${quest.id}`}
                    className="block w-full rounded-2xl bg-[#dc985e] px-5 py-3 text-center font-bold text-white hover:bg-[#c9844d]"
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