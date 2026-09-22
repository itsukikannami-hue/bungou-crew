"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import {
  Trophy,
  Flame,
  Clock3,
  PenSquare,
} from "lucide-react"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function DataPage() {
  // =========================
  // State
  // =========================

  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [plan, setPlan] = useState("free")

  const [weeklyStats, setWeeklyStats] = useState([])
  const [rankingData, setRankingData] = useState([])

  const [streakDays, setStreakDays] = useState(0)

  const [totalWords, setTotalWords] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)

  const [avgWPM, setAvgWPM] = useState(0)

  const [dailyChartData, setDailyChartData] = useState([])
  const [weekdayChartData, setWeekdayChartData] = useState([])
  const [timeZoneData, setTimeZoneData] = useState([])

  const [monthlyChartData, setMonthlyChartData] = useState([])
  const [monthlyGrowth, setMonthlyGrowth] = useState(0)

  const [writerAnalysis, setWriterAnalysis] = useState(null)
  const [writerTags, setWriterTags] = useState([])

  // =========================
  // 初期ロード
  // =========================

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setUser(user)

    await Promise.all([
      fetchProfile(user.id),
      fetchPlan(user.id),
      fetchWritingStats(user.id),
      fetchRanking(user.id),
    ])

    setLoading(false)
  }

  // =========================
  // プラン取得
  // =========================

  const fetchPlan = async (userId) => {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_user_plan",
      {
        target_user_id: userId,
      }
    )

    if (error) {
      console.error(
        "プラン取得エラー:",
        error
      )

      setPlan("free")
      return
    }

    if (
      data === "premium" ||
      data === "ultimate"
    ) {
      setPlan(data)
      return
    }

    setPlan("free")
  }

  // =========================
  // プロフィール
  // =========================

  const fetchProfile = async (userId) => {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name
      `)
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.log(error)
      return
    }

    setProfile(data)
  }

  // =========================
  // 執筆統計
  // =========================

  const fetchWritingStats = async (userId) => {
    const sevenDaysAgo = new Date()

    sevenDaysAgo.setHours(
      0,
      0,
      0,
      0
    )

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 6
    )

    const {
      data,
      error,
    } = await supabase
      .from("writing_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: true,
      })

    if (error) {
      console.log(error)
      return
    }

    const allLogs = data || []

    const weeklyLogs =
      allLogs.filter(
        (log) =>
          new Date(
            log.created_at
          ) >= sevenDaysAgo
      )

    // =========================
    // 習慣リカバリー
    // =========================

    const {
      data: recoveries,
      error: recoveryError,
    } = await supabase
      .from("streak_recoveries")
      .select(
        "recovery_date"
      )
      .eq(
        "user_id",
        userId
      )

    if (recoveryError) {
      console.log(
        "recovery error:",
        recoveryError
      )
    }

    // =========================
    // 週間データ
    // =========================

    const grouped = {}

    const weekdayMap = {
      日: 0,
      月: 0,
      火: 0,
      水: 0,
      木: 0,
      金: 0,
      土: 0,
    }

    const timeMap = {
      朝: 0,
      昼: 0,
      夜: 0,
    }

    weeklyLogs.forEach(
      (log) => {
        const date =
          new Date(
            log.created_at
          ).toLocaleDateString(
            "ja-JP",
            {
              month: "numeric",
              day: "numeric",
            }
          )

        if (!grouped[date]) {
          grouped[date] = {
            date,
            words: 0,
            minutes: 0,
          }
        }

        grouped[date].words +=
          log.words || 0

        grouped[date].minutes +=
          log.minutes || 0

        // =========================
        // 曜日
        // =========================

        const weekday =
          new Date(
            log.created_at
          ).toLocaleDateString(
            "ja-JP",
            {
              weekday: "short",
            }
          )

        weekdayMap[weekday] =
          (weekdayMap[weekday] || 0) +
          (log.words || 0)

        // =========================
        // 時間帯
        // =========================

        const hour =
          new Date(
            log.created_at
          ).getHours()

        if (
          hour >= 5 &&
          hour < 12
        ) {
          timeMap["朝"] +=
            log.words || 0
        } else if (
          hour >= 12 &&
          hour < 18
        ) {
          timeMap["昼"] +=
            log.words || 0
        } else {
          timeMap["夜"] +=
            log.words || 0
        }
      }
    )

    const statsArray =
      Object.values(grouped)

    setWeeklyStats(
      statsArray
    )

    setDailyChartData(
      statsArray
    )

    setWeekdayChartData(
      Object.entries(
        weekdayMap
      ).map(
        ([day, value]) => ({
          day,
          words: value,
        })
      )
    )

    setTimeZoneData(
      Object.entries(
        timeMap
      ).map(
        ([name, value]) => ({
          name,
          value,
        })
      )
    )

    // =========================
    // 週間合計
    // =========================

    const words =
      weeklyLogs.reduce(
        (sum, log) =>
          sum +
          (log.words || 0),
        0
      )

    const minutes =
      weeklyLogs.reduce(
        (sum, log) =>
          sum +
          (log.minutes || 0),
        0
      )

    setTotalWords(words)
    setTotalMinutes(minutes)

    // =========================
    // 平均WPM
    // =========================

    const allWords =
      allLogs.reduce(
        (sum, log) =>
          sum +
          (log.words || 0),
        0
      )

    const allMinutes =
      allLogs.reduce(
        (sum, log) =>
          sum +
          (log.minutes || 0),
        0
      )

    const averageWPM =
      allMinutes > 0
        ? allWords /
          allMinutes
        : 0

    setAvgWPM(
      averageWPM
    )

    // =========================
    // 連続執筆
    // =========================

    calculateStreak(
      allLogs,
      recoveries || []
    )

    // =========================
    // 作家タイプ
    // =========================

    analyzeWriterType(
      allLogs
    )

    // =========================
    // 月間分析
    // =========================

    const monthlyMap = {}

    allLogs.forEach(
      (log) => {
        const date =
          new Date(
            log.created_at
          )

        const month =
          date.toLocaleDateString(
            "ja-JP",
            {
              year: "numeric",
              month: "numeric",
            }
          )

        if (!monthlyMap[month]) {
          monthlyMap[month] = {
            month,
            words: 0,
            minutes: 0,
          }
        }

        monthlyMap[month].words +=
          log.words || 0

        monthlyMap[month].minutes +=
          log.minutes || 0
      }
    )

    const monthlyArray =
      Object.values(
        monthlyMap
      )

    setMonthlyChartData(
      monthlyArray
    )

    // =========================
    // 月間成長率
    // =========================

    if (
      monthlyArray.length >= 2
    ) {
      const current =
        monthlyArray[
          monthlyArray.length - 1
        ].words

      const previous =
        monthlyArray[
          monthlyArray.length - 2
        ].words

      if (previous > 0) {
        setMonthlyGrowth(
          ((current -
            previous) /
            previous) *
            100
        )
      } else {
        setMonthlyGrowth(0)
      }
    } else {
      setMonthlyGrowth(0)
    }
  }

  // =========================
  // 連続執筆日数
  // =========================

  const calculateStreak = (
    logs,
    recoveries = []
  ) => {
    const writingDays =
      logs.map(
        (log) =>
          new Date(
            log.created_at
          )
            .toISOString()
            .split("T")[0]
      )

    const recoveryDays =
      recoveries.map(
        (recovery) =>
          recovery.recovery_date
      )

    const uniqueDays =
      Array.from(
        new Set([
          ...writingDays,
          ...recoveryDays,
        ])
      )

    if (
      uniqueDays.length === 0
    ) {
      setStreakDays(0)
      return
    }

    uniqueDays.sort().reverse()

    let streak = 0

    for (
      let i = 0;
      i < uniqueDays.length;
      i++
    ) {
      const target =
        new Date()

      target.setHours(
        0,
        0,
        0,
        0
      )

      target.setDate(
        target.getDate() - i
      )

      const targetString =
        target
          .toISOString()
          .split("T")[0]

      if (
        uniqueDays.includes(
          targetString
        )
      ) {
        streak++
      } else {
        break
      }
    }

    setStreakDays(
      streak
    )
  }

  // =========================
  // ランキング
  // =========================

  const fetchRanking = async (
    userId
  ) => {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        weekly_words,
        is_public
      `)
      .eq(
        "is_public",
        true
      )
      .order(
        "weekly_words",
        {
          ascending: false,
        }
      )
      .limit(50)

    if (error) {
      console.log(error)
      return
    }

    const formatted =
      (data || []).map(
        (u, index) => ({
          rank: index + 1,
          name:
            u.display_name ||
            "名無し",
          value:
            `${u.weekly_words || 0}文字`,
          isMe:
            u.id === userId,
        })
      )

    setRankingData(
      formatted
    )
  }

  // =========================
  // 作家タイプ分析
  // =========================

  const analyzeWriterType = (
    logs
  ) => {
    if (!logs?.length) {
      setWriterAnalysis({
        title:
          "データ不足",

        description:
          "執筆データが増えると分析できます。",

        advice:
          "まずは少しずつ書く習慣を作ってみましょう。",

        genres: [],

        emoji: "📖",

        gradient:
          "bg-gradient-to-r from-slate-500 to-slate-700",

        iconBg:
          "bg-white/20",
      })

      setWriterTags([])

      return
    }

    const totalWords =
      logs.reduce(
        (sum, l) =>
          sum +
          (l.words || 0),
        0
      )

    const totalMinutes =
      logs.reduce(
        (sum, l) =>
          sum +
          (l.minutes || 0),
        0
      )

    const avgWPM =
      totalMinutes > 0
        ? totalWords /
          totalMinutes
        : 0

    const avgSession =
      logs.length > 0
        ? totalMinutes /
          logs.length
        : 0

    const nightLogs =
      logs.filter(
        (l) => {
          const hour =
            new Date(
              l.created_at
            ).getHours()

          return (
            hour >= 18 ||
            hour < 5
          )
        }
      ).length

    const nightRatio =
      logs.length > 0
        ? nightLogs /
          logs.length
        : 0

    const dailyWords = {}

    logs.forEach(
      (log) => {
        const day =
          new Date(
            log.created_at
          )
            .toISOString()
            .split("T")[0]

        dailyWords[day] =
          (dailyWords[day] ||
            0) +
          (log.words || 0)
      }
    )

    const values =
      Object.values(
        dailyWords
      ).map(Number)

    const average =
      values.length
        ? values.reduce(
            (a, b) =>
              a + b,
            0
          ) /
          values.length
        : 0

    const variance =
      values.length
        ? values.reduce(
            (sum, v) =>
              sum +
              Math.pow(
                v -
                  average,
                2
              ),
            0
          ) /
          values.length
        : 0

    const stdDev =
      Math.sqrt(
        variance
      )

    let mainType = {
      title:
        "感情型ストーリーテラー",

      description:
        "感情を大切に物語を紡ぐタイプ。",

      advice:
        "感情が動いた瞬間をすぐメモすると、作品の熱量がさらに高まります。",

      genres: [
        "恋愛",
        "青春",
        "ヒューマンドラマ",
      ],

      emoji: "📖",

      gradient:
        "bg-gradient-to-r from-pink-500 to-rose-500",

      iconBg:
        "bg-pink-100",
    }

    if (
      avgWPM >= 40
    ) {
      mainType = {
        title:
          "超高速アウトプット型",

        description:
          "爆発的速度で物語を書く高速執筆型。",

        advice:
          "勢いを止めないことが最大の武器です。細かな修正は後回しにして、まず最後まで書き切るスタイルと相性抜群。",

        genres: [
          "バトル",
          "異世界",
          "アクション",
          "Web連載",
        ],

        emoji: "⚡",

        gradient:
          "bg-gradient-to-r from-yellow-400 to-orange-500",

        iconBg:
          "bg-yellow-100",
      }
    } else if (
      avgSession >= 90
    ) {
      mainType = {
        title:
          "没入潜航型",

        description:
          "長時間世界観へ潜る集中型。",

        advice:
          "長編や重厚な設定作品で真価を発揮します。",

        genres: [
          "ファンタジー",
          "SF",
          "ミステリー",
          "長編小説",
        ],

        emoji: "🌊",

        gradient:
          "bg-gradient-to-r from-cyan-500 to-blue-600",

        iconBg:
          "bg-cyan-100",
      }
    } else if (
      nightRatio >= 0.7
    ) {
      mainType = {
        title:
          "深夜覚醒型",

        description:
          "夜になるほど創作力が増す夜型作家。",

        advice:
          "静かな時間帯で集中力が最大化するタイプです。",

        genres: [
          "ダークファンタジー",
          "ホラー",
          "幻想文学",
          "心理描写重視作品",
        ],

        emoji: "🌙",

        gradient:
          "bg-gradient-to-r from-indigo-500 to-purple-600",

        iconBg:
          "bg-indigo-100",
      }
    } else if (
      stdDev >= 3000
    ) {
      mainType = {
        title:
          "感情爆発型",

        description:
          "書ける日に一気に書き上げる激情型。",

        advice:
          "モチベーションの波を前提にした執筆管理が重要です。",

        genres: [
          "エモ系",
          "青春",
          "短編",
          "ドラマ",
        ],

        emoji: "🔥",

        gradient:
          "bg-gradient-to-r from-rose-500 to-red-600",

        iconBg:
          "bg-rose-100",
      }
    }

    const tags = []

    if (
      avgWPM >= 35
    ) {
      tags.push(
        "⚡ 高速執筆"
      )
    }

    if (
      avgSession >= 60
    ) {
      tags.push(
        "🔥 高集中"
      )
    }

    if (
      nightRatio >= 0.6
    ) {
      tags.push(
        "🌙 夜型"
      )
    }

    if (
      stdDev <= 1000
    ) {
      tags.push(
        "🎯 安定型"
      )
    }

    setWriterAnalysis(
      mainType
    )

    setWriterTags(
      tags
    )
  }

  // =========================
  // 表示用
  // =========================

  const userName =
    profile?.display_name ||
    user?.email ||
    "ユーザー"

  const planLabel =
    plan === "ultimate"
      ? "ULTIMATE"
      : plan === "premium"
      ? "PREMIUM"
      : "FREE"

  // =========================
  // Loading
  // =========================

  if (loading) {
    return (
      <div className="p-10">
        読み込み中...
      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="space-y-6 p-6">

      {/* ヘッダー */}

      <div className="rounded-2xl bg-white p-6 shadow">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-2 text-2xl font-black">
              📚 データページ
            </div>

            <div className="text-gray-600">
              {userName}
            </div>

          </div>

          <div
            className={`w-fit rounded-full px-4 py-2 text-xs font-black ${
              plan === "ultimate"
                ? "bg-purple-100 text-purple-700"
                : plan === "premium"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {planLabel} PLAN
          </div>

        </div>

      </div>

      {/* 基本統計 */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <Card
          icon={<PenSquare />}
          title="週間文字数"
          value={`${totalWords.toLocaleString()}文字`}
        />

        <Card
          icon={<Clock3 />}
          title="週間執筆時間"
          value={`${totalMinutes.toLocaleString()}分`}
        />

        <Card
          icon={<Flame />}
          title="連続執筆"
          value={`${streakDays}日`}
        />

      </div>

      {/* Premium以上 */}

      {plan !== "free" && (
        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="flex items-center gap-2">

            <PenSquare />

            <div className="text-lg font-bold">
              平均執筆速度
            </div>

          </div>

          <div className="mt-3 text-3xl font-black">
            {avgWPM.toFixed(1)}
            <span className="ml-2 text-sm font-normal text-gray-500">
              文字/分
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-500">
            これまでの執筆ログから算出しています。
          </div>

        </div>
      )}

      {/* 作家タイプ */}

      <div
        className={`
          relative
          overflow-hidden
          rounded-2xl
          p-6
          text-white
          shadow
          ${writerAnalysis?.gradient || "bg-slate-700"}
        `}
      >

        <div
          className="
            pointer-events-none
            absolute
            -right-10
            -top-10
            text-[120px]
            opacity-10
          "
        >
          {writerAnalysis?.emoji}
        </div>

        <div className="mb-4 flex items-center gap-2">

          <div
            className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              text-2xl
              ${writerAnalysis?.iconBg || "bg-white/20"}
            `}
          >
            {writerAnalysis?.emoji}
          </div>

          <div>

            <div className="text-sm opacity-80">
              WRITER TYPE
            </div>

            <div className="text-lg font-bold">
              作家タイプ分析
            </div>

          </div>

        </div>

        <div className="mb-3 text-3xl font-black">
          {writerAnalysis?.title}
        </div>

        <div className="mb-5 leading-relaxed opacity-90">
          {writerAnalysis?.description}
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 text-black">

          <div className="mb-2 text-sm font-bold text-gray-500">
            💡 執筆アドバイス
          </div>

          <div className="text-sm leading-relaxed">
            {writerAnalysis?.advice}
          </div>

        </div>

        <div className="mb-4">

          <div className="mb-2 text-sm font-bold opacity-80">
            📚 向いているジャンル
          </div>

          <div className="flex flex-wrap gap-2">

            {writerAnalysis?.genres?.map(
              (genre) => (
                <div
                  key={genre}
                  className="
                    rounded-full
                    bg-black/20
                    px-3
                    py-1
                    text-sm
                    font-bold
                  "
                >
                  {genre}
                </div>
              )
            )}

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          {writerTags.map(
            (tag) => (
              <div
                key={tag}
                className="
                  rounded-full
                  bg-white/20
                  px-3
                  py-1
                  text-sm
                  font-bold
                  backdrop-blur-sm
                "
              >
                {tag}
              </div>
            )
          )}

        </div>

      </div>

      {/* =========================
          Premium統計
      ========================= */}

      {plan !== "free" ? (
        <>
          {/* 日別文字数 */}

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <div className="text-lg font-bold">
                📈 日別文字数
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                PREMIUM
              </span>

            </div>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={
                    dailyChartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="date"
                  />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="words"
                    stroke="#3b82f6"
                    strokeWidth={3}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* 曜日別 */}

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <div className="text-lg font-bold">
                📊 曜日ごとの執筆量
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                PREMIUM
              </span>

            </div>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    weekdayChartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="words"
                    fill="#10b981"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* 時間帯 */}

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <div className="text-lg font-bold">
                🌙 執筆時間帯分析
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                PREMIUM
              </span>

            </div>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={
                      timeZoneData
                    }
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >

                    <Cell fill="#60a5fa" />
                    <Cell fill="#34d399" />
                    <Cell fill="#f472b6" />

                  </Pie>

                  <Tooltip />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>
        </>
      ) : (
        <LockedStatsCard
          title="詳細な執筆分析"
          description="Premiumプラン以上で、日別・曜日別・時間帯別の詳しい執筆データを確認できます。"
        />
      )}

      {/* =========================
          Ultimate統計
      ========================= */}

      {plan === "ultimate" ? (
        <>
          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <div className="text-lg font-bold">
                  👑 月間執筆分析
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  月ごとの執筆量と成長を確認できます。
                </div>

              </div>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                ULTIMATE
              </span>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div className="rounded-xl bg-purple-50 p-5">

                <div className="text-sm text-gray-500">
                  今月の文字数
                </div>

                <div className="mt-2 text-3xl font-black">
                  {(
                    monthlyChartData[
                      monthlyChartData.length - 1
                    ]?.words || 0
                  ).toLocaleString()}
                  <span className="ml-1 text-sm font-normal">
                    文字
                  </span>
                </div>

              </div>

              <div className="rounded-xl bg-purple-50 p-5">

                <div className="text-sm text-gray-500">
                  前月比
                </div>

                <div className="mt-2 text-3xl font-black">
                  {monthlyGrowth >= 0
                    ? "+"
                    : ""}
                  {monthlyGrowth.toFixed(
                    1
                  )}
                  <span className="ml-1 text-sm font-normal">
                    %
                  </span>
                </div>

              </div>

            </div>

            <div className="mt-6 h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={
                    monthlyChartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="words"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

          <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-6 shadow-sm">

            <div className="flex items-start gap-4">

              <div className="text-4xl">
                👑
              </div>

              <div>

                <div className="text-lg font-bold text-purple-800">
                  Ultimate執筆分析
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  月間の執筆量を比較しながら、現在の執筆ペースを確認できます。
                  執筆を続けるほど、月間データが蓄積されていきます。
                </p>

              </div>

            </div>

          </div>
        </>
      ) : (
        <LockedStatsCard
          title="Ultimate月間分析"
          description="Ultimateプランでは、月間文字数・前月比・月間推移など、さらに詳しい執筆分析を利用できます。"
        />
      )}

      {/* ランキング */}

      <div className="rounded-2xl bg-white p-6 shadow">

        <div className="mb-4 flex items-center gap-2">

          <Trophy />

          <div className="text-lg font-bold">
            週間文字数ランキング
          </div>

        </div>

        <div className="space-y-3">

          {rankingData.map(
            (item) => (

              <div
                key={item.rank}
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  pb-2
                "
              >

                <div className="flex items-center gap-3">

                  <div className="w-8 text-xl font-black">
                    {item.rank}
                  </div>

                  <div className="flex items-center gap-2 font-bold">

                    {item.name}

                    {item.isMe && (
                      <span
                        className="
                          rounded-full
                          bg-yellow-200
                          px-2
                          py-0.5
                          text-xs
                        "
                      >
                        YOU
                      </span>
                    )}

                  </div>

                </div>

                <div className="font-bold text-blue-500">
                  {item.value}
                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  )
}

// =========================
// Card
// =========================

function Card({
  icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">

      <div className="mb-3 flex items-center gap-2">

        {icon}

        <div className="text-sm text-gray-500">
          {title}
        </div>

      </div>

      <div className="text-2xl font-black">
        {value}
      </div>

    </div>
  )
}

// =========================
// ロック表示
// =========================

function LockedStatsCard({
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl">
          🔒
        </div>

        <div className="flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="text-lg font-bold text-gray-900">
              {title}
            </h2>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
              PLAN限定
            </span>

          </div>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  )
}