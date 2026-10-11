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

type QuestType = { id: string; name: string }
type QuestWithType = Quest & { quest_type: QuestType | null }

const sections = [
  { label: "募集中", href: "/quests", active: true },
  { label: "依頼中", href: "/quests/in-progress", active: false },
  { label: "参加中", href: "/quests/working", active: false },
  { label: "完了", href: "/quests/completed", active: false },
]

export default function QuestsPage() {
  const [quests, setQuests] = useState<QuestWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let active = true
    const fetchQuests = async () => {
      try {
        const { data, error } = await supabase
          .from("quests")
          .select(`*, quest_type:quest_types (id, name)`)
          .eq("status", "open")
          .gt("deadline", new Date().toISOString())
          .order("created_at", { ascending: false })
        if (error) throw error
        if (active) setQuests((data ?? []) as QuestWithType[])
      } catch (error) {
        console.error("クエスト取得エラー:", error)
        if (active) setErrorMessage("クエストの取得に失敗しました。ページを再読み込みしてください。")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchQuests()
    return () => { active = false }
  }, [])

  const formatDeadline = (deadline: string) =>
    new Date(deadline).toLocaleString("ja-JP", {
      year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  return (
    <main className="min-h-screen bg-[#fff9f0] px-4 pb-10 pt-6 text-[#604b3d] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold tracking-widest text-[#c48c61]">BUNGOU CREW</p>
              <h1 className="text-2xl font-bold sm:text-3xl">📜 クエスト</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#947d6b]">
                物書き仲間の依頼を見つけて、作品づくりを応援しよう。
              </p>
            </div>
            <Link
              href="/quests/create"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d88e56] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c97b43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c97b43]"
            >
              ＋ クエストを作成
            </Link>
          </div>
        </header>

        <nav aria-label="クエストの種類" className="mb-6 overflow-x-auto border-b border-[#eadbca]">
          <div className="flex min-w-max gap-1 sm:gap-4">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                aria-current={section.active ? "page" : undefined}
                className={`whitespace-nowrap border-b-[3px] px-3 py-3 text-sm font-bold transition sm:px-5 ${
                  section.active
                    ? "border-[#d88e56] text-[#bd713e]"
                    : "border-transparent text-[#9c8877] hover:text-[#bd713e]"
                }`}
              >
                {section.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">🌱 募集中のクエスト</h2>
          {!loading && !errorMessage && (
            <span className="rounded-full bg-[#f8e8d8] px-3 py-1 text-xs font-bold text-[#ac744c]">
              {quests.length}件
            </span>
          )}
        </div>

        {loading ? (
          <div role="status" className="rounded-3xl border border-[#efdfcf] bg-white px-6 py-12 text-center text-sm text-[#927d6d] shadow-sm">
            クエストを読み込んでいます...
          </div>
        ) : errorMessage ? (
          <div role="alert" className="rounded-3xl border border-[#efdfcf] bg-white px-6 py-12 text-center text-sm text-[#927d6d] shadow-sm">
            {errorMessage}
          </div>
        ) : quests.length === 0 ? (
          <div className="rounded-3xl border border-[#efdfcf] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mb-3 text-4xl" aria-hidden="true">📖</div>
            <p className="font-bold">現在募集中のクエストはありません。</p>
            <p className="mt-2 text-sm text-[#927d6d]">新しい依頼を作成して、仲間に声をかけてみませんか？</p>
            <Link href="/quests/create" className="mt-5 inline-block rounded-full bg-[#d88e56] px-5 py-3 text-sm font-bold text-white hover:bg-[#c97b43]">
              クエストを作成
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quests.map((quest) => (
              <article key={quest.id} className="rounded-3xl border border-[#efdfcf] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#fff1e2] px-3 py-1 text-xs font-bold text-[#bd7748]">
                    {quest.quest_type?.name ?? "クエスト"}
                  </span>
                  <span className="rounded-full bg-[#eef6e9] px-3 py-1 text-xs font-bold text-[#668c57]">
                    ● 募集中
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold leading-snug sm:text-xl">{quest.title}</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#806c5c]">
                  {quest.description}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#fff8ee] px-4 py-3">
                    <p className="text-xs text-[#987e68]">🎁 1人あたりの報酬</p>
                    <p className="mt-1 text-lg font-bold text-[#c17a42]">{quest.reward_per_person.toLocaleString()} pt</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8ee] px-4 py-3">
                    <p className="text-xs text-[#987e68]">👥 募集人数</p>
                    <p className="mt-1 text-base font-bold">{quest.max_participants}人</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8ee] px-4 py-3">
                    <p className="text-xs text-[#987e68]">🕒 募集期限</p>
                    <p className="mt-1 text-sm font-bold">{formatDeadline(quest.deadline)}</p>
                  </div>
                </div>
                <Link
                  href={`/quests/${quest.id}`}
                  className="mt-5 block rounded-2xl border border-[#d88e56] bg-[#d88e56] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#c97b43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c97b43]"
                >
                  詳細を見る →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
