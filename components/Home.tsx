"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import AdBanner from "@/components/AdBanner"
import SessionModal from "@/components/modals/SessionModal"
import StopModal from "@/components/modals/StopModal"
import { updateStatus } from "@/lib/status"
import Link from "next/link"
import HomeBungou from "@/components/HomeBungou"
import TutorialModal from "@/components/tutorial/TutorialModal"
import { useToast } from "@/components/ToastProvider"

export default function Home() {
  const router = useRouter()
  const toast = useToast()

  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [weeklyTime, setWeeklyTime] = useState<any[]>([])
  const [weeklyWords, setWeeklyWords] = useState<any[]>([])
  const [todayTime, setTodayTime] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)

  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialChecked, setTutorialChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    updateStatus(user.id, "online")
  }, [user])

  // ユーザー認証
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
      } else {
        setUser(user)
      }
    }

    checkUser()
  }, [router])

  // 初回チュートリアル表示判定
  useEffect(() => {
    const checkTutorial = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_version")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        console.error("チュートリアル状態取得エラー:", error)
        setTutorialChecked(true)
        return
      }

      setShowTutorial((data?.tutorial_version ?? 0) < 1)
      setTutorialChecked(true)
    }

    checkTutorial()
  }, [user])

  const finishTutorial = async () => {
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({ tutorial_version: 1 })
      .eq("user_id", user.id)

    if (error) {
      console.error("チュートリアル完了状態の保存エラー:", error)
      toast.error("チュートリアルの完了状態を保存できませんでした。もう一度お試しください。")
      return
    }

    setShowTutorial(false)
  }

  // 週間データ取得
  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data } = await supabase
        .from("sessions")
        .select("created_at,duration,words")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())

      if (!data) return

      const timeMap: Record<string, number> = {}
      const wordMap: Record<string, number> = {}

      data.forEach((s: any) => {
        const date = new Date(s.created_at).toLocaleDateString("ja-JP", {
          timeZone: "Asia/Tokyo",
        })
        timeMap[date] = (timeMap[date] || 0) + s.duration
        wordMap[date] = (wordMap[date] || 0) + s.words
      })

      setWeeklyTime(
        Object.keys(timeMap).map((date) => ({
          date,
          minutes: Math.floor(timeMap[date] / 60),
        }))
      )
      setWeeklyWords(
        Object.keys(wordMap).map((date) => ({
          date,
          words: wordMap[date],
        }))
      )
    }

    fetchWeeklyData()
  }, [user])

  // 執筆履歴データ取得
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("created_at,duration,words")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data) setSessions(data)
      } catch (err) {
        console.error("セッション取得エラー:", err)
      }
    }

    fetchSessions()
  }, [user])

  return (
    <>
      <main className="min-h-screen bg-[#fff9f0] px-4 pb-8 pt-6 text-[#775b45] sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <AdBanner />

          <section aria-label="ブンゴウと執筆" className="w-full">
            <HomeBungou />
          </section>

          <nav
            aria-label="育成と執筆のメニュー"
            className="flex flex-col gap-3"
          >
            <Link
              href="/items"
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#eac39e] bg-[#fff0dd] px-5 py-4 text-[#865632] shadow-sm transition hover:border-[#d78f57] hover:bg-[#ffe8ca] focus-visible:outline-2 focus-visible:outline-[#c77f43]"
            >
              <span aria-hidden="true" className="text-3xl">
                🛍️
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-bold">ショップ</span>
                <span className="text-xs text-[#9d7656]">
                  アイテム・ポイント
                </span>
              </span>
              <span aria-hidden="true" className="text-[#c77f43]">
                →
              </span>
            </Link>

            <Link
              href="/album"
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#f2deca] bg-white px-5 py-4 shadow-sm transition hover:border-[#e7ae80] hover:bg-[#fff4e7] focus-visible:outline-2 focus-visible:outline-[#c77f43]"
            >
              <span aria-hidden="true" className="text-3xl">
                📚
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-bold">ブンゴウ図鑑</span>
                <span className="text-xs text-[#9d7656]">
                  集めた仲間を確認
                </span>
              </span>
              <span aria-hidden="true" className="text-[#c77f43]">
                →
              </span>
            </Link>

            <Link
              href="/data"
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#f2deca] bg-white px-5 py-4 shadow-sm transition hover:border-[#e7ae80] hover:bg-[#fff4e7] focus-visible:outline-2 focus-visible:outline-[#c77f43]"
            >
              <span aria-hidden="true" className="text-3xl">
                📊
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-bold">執筆データ</span>
                <span className="text-xs text-[#9d7656]">
                  これまでの執筆記録
                </span>
              </span>
              <span aria-hidden="true" className="text-[#c77f43]">
                →
              </span>
            </Link>
          </nav>

          {showModal && (
            <SessionModal
              user={user}
              duration={sessionDuration}
              setShowModal={setShowModal}
            />
          )}

          {showStopModal && (
            <StopModal
              setShowStopModal={setShowStopModal}
              setShowModal={setShowModal}
            />
          )}
        </div>
      </main>

      {tutorialChecked && showTutorial && (
        <TutorialModal
          onComplete={finishTutorial}
          onSkip={finishTutorial}
        />
      )}
    </>
  )
}
