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
  const [errorMessage, setErrorMessage] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true

    const fetchCompletedQuests = async () => {
      setLoading(true)
      setErrorMessage("")

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error("ログインが必要です。")

        const { data: participantData, error: participantError } = await supabase
          .from("quest_participants")
          .select("quest_id")
          .eq("user_id", user.id)
        if (participantError) throw participantError

        const participantQuestIds = participantData?.map((item) => item.quest_id) ?? []
        let query = supabase
          .from("quests")
          .select(`*, quest_type:quest_types (id, name)`)
          .eq("status", "completed")

        if (participantQuestIds.length > 0) {
          query = query.or(`requester_id.eq.${user.id},id.in.(${participantQuestIds.join(",")})`)
        } else {
          query = query.eq("requester_id", user.id)
        }

        const { data, error } = await query.order("updated_at", { ascending: false })
        if (error) throw error
        if (active) setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error("完了クエスト取得エラー:", error)
        if (active) {
          setQuests([])
          setErrorMessage(error instanceof Error && error.message === "ログインが必要です。"
            ? error.message
            : "完了クエストを取得できませんでした。")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchCompletedQuests()
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
          <p className="text-[#927d6b]">
            完了したクエストを読み込んでいます...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-7 pb-28 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#654b37] sm:text-3xl">
            完了したクエスト
          </h1>

          <p className="mt-2 text-[#927d6b]">
            あなたが依頼したクエスト、または参加したクエストの履歴です。
          </p>


        </div>

        {/* クエストがない場合 */}
        
        {/* クエスト画面の共通ナビゲーション */}
        <nav aria-label="クエストの表示切り替え" className="mb-7 mt-6 flex gap-2 overflow-x-auto border-b border-[#eedfcd] pb-3">
          {[
            { href: "/quests", label: "募集中", key: "open" },
            { href: "/quests/in-progress", label: "依頼中", key: "in-progress" },
            { href: "/quests/working", label: "参加中", key: "working" },
            { href: "/quests/completed", label: "完了", key: "completed" },
          ].map((tab) => (
            <Link key={tab.key} href={tab.href} aria-current={tab.key === "completed" ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab.key === "completed" ? "bg-[#e8a56d] text-white shadow-sm" : "bg-white text-[#826b57] hover:bg-[#fff0df]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        {errorMessage ? (
          <div role="alert" className="rounded-3xl border border-[#eedfcd] bg-white p-8 text-center">
            <p className="font-bold text-[#654b37]">{errorMessage}</p>
            <button type="button" onClick={() => setRetryKey((n) => n + 1)}
              className="mt-5 min-h-11 rounded-full bg-[#dc985e] px-6 py-3 font-bold text-white hover:bg-[#c9844d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              再試行する
            </button>
          </div>
        ) : quests.length === 0 ? (
          <div className="rounded-3xl border border-[#f0e3d4] bg-white p-8 text-center shadow-[0_4px_18px_rgba(133,94,56,0.06)]">
            <p className="text-[#927d6b]">
              完了したクエストはありません。
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {quests.map((quest) => (
              <div
                key={quest.id}
                className="rounded-3xl border border-[#f0e3d4] bg-white p-6 shadow-[0_4px_18px_rgba(133,94,56,0.06)]"
              >

                {/* 完了表示 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-[#bf824d]">
                    {quest.quest_type?.name ?? "クエスト"}
                  </div>

                  <span className="rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-bold text-green-700">
                    完了
                  </span>
                </div>

                {/* タイトル */}
                <h2 className="mt-2 text-xl font-bold text-[#654b37]">
                  {quest.title}
                </h2>

                {/* 内容 */}
                <p className="mt-3 whitespace-pre-wrap text-sm text-[#7e6c5c]">
                  {quest.description}
                </p>

                {/* 情報 */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-2xl bg-[#fff5e9] p-4">
                    <p className="text-xs text-[#927d6b]">
                      1人あたり報酬
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#654b37]">
                      {quest.reward_per_person.toLocaleString()} pt
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fff5e9] p-4">
                    <p className="text-xs text-[#927d6b]">
                      募集人数
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#654b37]">
                      {quest.max_participants}人
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

                {/* 詳細 */}
                <div className="mt-5">
                  <Link
                    href={`/quests/${quest.id}`}
                    className="block w-full rounded-2xl bg-[#dc985e] px-5 py-3 text-center font-bold text-white transition hover:bg-[#c9844d]"
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