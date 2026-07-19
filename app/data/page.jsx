"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
    Trophy,
    Flame,
    Clock3,
    PenSquare,
    Brain,
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

  const [weeklyStats, setWeeklyStats] = useState([])
  const [rankingData, setRankingData] = useState([])

  const [streakDays, setStreakDays] = useState(0)

  const [totalWords, setTotalWords] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)

  const [dailyChartData, setDailyChartData] = useState([])

const [weekdayChartData, setWeekdayChartData] = useState([])

const [timeZoneData, setTimeZoneData] = useState([])

const [writerAnalysis, setWriterAnalysis] =
  useState(null)

const [writerTags, setWriterTags] =
  useState([])

  // =========================
  // 初期ロード
  // =========================

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {

    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setUser(user)

    await Promise.all([
      fetchProfile(user.id),
      fetchWritingStats(user.id),
      fetchRanking(user.id)
    ])

    setLoading(false)
  }

  // =========================
  // プロフィール
  // =========================

  const fetchProfile = async (userId) => {

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
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

    sevenDaysAgo.setHours(0, 0, 0, 0)
    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 6
    )

    const { data, error } = await supabase
      .from("writing_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    console.log("writing logs:", data)

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

    data.forEach((log) => {

      const date = new Date(log.created_at)
        .toLocaleDateString("ja-JP", {
          month: "numeric",
          day: "numeric"
        })

      if (!grouped[date]) {
        grouped[date] = {
          date,
          words: 0,
          minutes: 0
        }
      }

      grouped[date].words += log.words || 0
      grouped[date].minutes += log.minutes || 0

      // =========================
// 曜日分析
// =========================

const weekday = new Date(log.created_at)
  .toLocaleDateString("ja-JP", {
    weekday: "short"
  })

weekdayMap[weekday] += log.words || 0

// =========================
// 時間帯分析
// =========================

const hour = new Date(log.created_at).getHours()

if (hour >= 5 && hour < 12) {
  timeMap["朝"] += log.words || 0
}
else if (hour >= 12 && hour < 18) {
  timeMap["昼"] += log.words || 0
}
else {
  timeMap["夜"] += log.words || 0
}

    })

    const statsArray = Object.values(grouped)

    setWeeklyStats(statsArray)
   
    // =========================
// 日別折れ線
// =========================

setDailyChartData(statsArray)

// =========================
// 曜日棒グラフ
// =========================

setWeekdayChartData(
  Object.entries(weekdayMap).map(
    ([day, value]) => ({
      day,
      words: value
    })
  )
)

// =========================
// 時間帯円グラフ
// =========================

setTimeZoneData(
  Object.entries(timeMap).map(
    ([name, value]) => ({
      name,
      value
    })
  )
)

    // 合計
    const words = statsArray.reduce(
      (sum, d) => sum + d.words,
      0
    )

    const minutes = statsArray.reduce(
      (sum, d) => sum + d.minutes,
      0
    )

    setTotalWords(words)
    setTotalMinutes(minutes)

    // 連続執筆
    calculateStreak(data)

    analyzeWriterType(data)





  }

  // =========================
  // 連続執筆日数
  // =========================

  const calculateStreak = (logs) => {

    if (!logs?.length) {
      setStreakDays(0)
      return
    }

    const uniqueDays = [
      ...new Set(
        logs.map(log =>
          new Date(log.created_at)
            .toISOString()
            .split("T")[0]
        )
      )
    ]

    uniqueDays.sort().reverse()

    let streak = 0

    for (let i = 0; i < uniqueDays.length; i++) {

      const target = new Date()
      target.setDate(target.getDate() - i)

      const targetString =
        target.toISOString().split("T")[0]

      if (uniqueDays[i] === targetString) {
        streak++
      } else {
        break
      }
    }

    setStreakDays(streak)
  }

  // =========================
  // ランキング
  // =========================

  const fetchRanking = async () => {

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        weekly_words,
        is_public
      `)
      .eq("is_public", true)
      .order("weekly_words", {
        ascending: false
      })
      .limit(50)

    if (error) {
      console.log(error)
      return
    }

    const formatted = data.map((u, index) => ({
      rank: index + 1,
      name: u.display_name || "名無し",
      value: `${u.weekly_words || 0}文字`,
      isMe: u.id === user?.id
    }))

    setRankingData(formatted)
  }

  // =========================
  // 作家タイプ分析
  // =========================

  const analyzeWriterType = (logs) => {

    if (!logs?.length) {

      setWriterAnalysis({
        title: "データ不足",
        description:
          "執筆データが増えると分析できます。"
      })
    
      setWriterTags([])
    
      return
    }
  
    const totalWords =
      logs.reduce((sum, l) =>
        sum + (l.words || 0), 0)
  
    const totalMinutes =
      logs.reduce((sum, l) =>
        sum + (l.minutes || 0), 0)
  
    const avgWPM =
      totalMinutes > 0
        ? totalWords / totalMinutes
        : 0
  
    const avgSession =
      totalMinutes / logs.length
  
    // =====================
    // 時間帯分析
    // =====================
  
    const nightLogs =
    logs.filter(l => {
  
      const hour =
        new Date(l.created_at).getHours()
  
      return (
        hour >= 18 ||
        hour < 5
      )
  
    }).length
  
    const nightRatio =
      nightLogs / logs.length
  
    // =====================
    // 日別安定性
    // =====================
  
    const dailyWords = {}
  
    logs.forEach(log => {
  
      const day =
        new Date(log.created_at)
        .toISOString()
        .split("T")[0]
  
      dailyWords[day] =
        (dailyWords[day] || 0)
        + (log.words || 0)
    })
  
    const values =
    Object.values(dailyWords).map(Number)
  
    const average =
    values.length
      ? values.reduce((a, b) => a + b, 0)
        / values.length
      : 0
  
      const variance =
      values.length
        ? values.reduce((sum, v) =>
            sum + Math.pow(v - average, 2), 0
          ) / values.length
        : 0
  
    const stdDev = Math.sqrt(variance)
  
// =====================
// 主タイプ
// =====================

let mainType = {
  title: "感情型ストーリーテラー",

  description:
    "感情を大切に物語を紡ぐタイプ。",

  advice:
    "感情が動いた瞬間をすぐメモすると、作品の熱量がさらに高まります。BGMや散歩など、感情を刺激する習慣と相性が良いタイプです。",

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

if (avgWPM >= 40) {

  mainType = {
    title: "超高速アウトプット型",

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

}

else if (avgSession >= 90) {

  mainType = {
    title: "没入潜航型",

    description:
      "長時間世界観へ潜る集中型。",

    advice:
      "長編や重厚な設定作品で真価を発揮します。執筆前に飲み物やBGMを固定すると、集中スイッチを入りやすくできます。",

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

}

else if (nightRatio >= 0.7) {

  mainType = {
    title: "深夜覚醒型",

    description:
      "夜になるほど創作力が増す夜型作家。",

    advice:
      "静かな時間帯で集中力が最大化するタイプです。夜専用の執筆ルーティンを作ると、安定して筆が進みます。",

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

}

else if (stdDev >= 3000) {

  mainType = {
    title: "感情爆発型",

    description:
      "書ける日に一気に書き上げる激情型。",

    advice:
      "モチベーションの波を前提にした執筆管理が重要です。書ける日は遠慮なく書き溜めしておくと強いタイプ。",

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
  
    // =====================
    // サブ特性
    // =====================
  
    const tags = []
  
    if (avgWPM >= 35) {
      tags.push("⚡ 高速執筆")
    }
  
    if (avgSession >= 60) {
      tags.push("🔥 高集中")
    }
  
    if (nightRatio >= 0.6) {
      tags.push("🌙 夜型")
    }
  
    if (streakDays >= 7) {
      tags.push("📅 継続型")
    }
  
    if (stdDev <= 1000) {
      tags.push("🎯 安定型")
    }
  
    setWriterAnalysis(mainType)
    setWriterTags(tags)
  }

  // =========================
  // 表示用
  // =========================

  const userName =
    profile?.display_name ||
    user?.email ||
    "ユーザー"


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
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="bg-white rounded-2xl shadow p-6">

        <div className="text-2xl font-black mb-2">
          📚 データページ
        </div>

        <div className="text-gray-600">
          {userName}
        </div>

      </div>

      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card
          icon={<PenSquare />}
          title="週間文字数"
          value={`${totalWords.toLocaleString()}文字`}
        />

        <Card
          icon={<Clock3 />}
          title="週間執筆時間"
          value={`${totalMinutes}分`}
        />

        <Card
          icon={<Flame />}
          title="連続執筆"
          value={`${streakDays}日`}
        />

      </div>

{/* 作家タイプ */}
<div
  className={`
    rounded-2xl
    shadow
    p-6
    text-white
    relative
    overflow-hidden
    ${writerAnalysis?.gradient || "bg-slate-700"}
  `}
>

  {/* 背景装飾 */}
  <div
    className="
      absolute
      -right-10
      -top-10
      text-[120px]
      opacity-10
      pointer-events-none
    "
  >
    {writerAnalysis?.emoji}
  </div>

  <div className="flex items-center gap-2 mb-4">

    <div
      className={`
        w-12
        h-12
        rounded-full
        flex
        items-center
        justify-center
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

      <div className="font-bold text-lg">
        作家タイプ分析
      </div>

    </div>

  </div>

  <div className="text-3xl font-black mb-3">
    {writerAnalysis?.title}
  </div>

  <div className="opacity-90 mb-5 leading-relaxed">
    {writerAnalysis?.description}
  </div>

  <div className="bg-white rounded-xl p-4 mb-4 text-black">

  <div className="text-sm font-bold mb-2 text-gray-500">
    💡 執筆アドバイス
  </div>

  <div className="text-sm leading-relaxed">
    {writerAnalysis?.advice}
  </div>

</div>

<div className="mb-4">

  <div className="text-sm font-bold mb-2 opacity-80">
    📚 向いているジャンル
  </div>

  <div className="flex flex-wrap gap-2">

    {writerAnalysis?.genres?.map((genre) => (

      <div
        key={genre}
        className="
          bg-black/20
          px-3
          py-1
          rounded-full
          text-sm
          font-bold
        "
      >
        {genre}
      </div>

    ))}

  </div>

</div>

  <div className="flex flex-wrap gap-2">

    {writerTags.map(tag => (

      <div
        key={tag}
        className="
          bg-white/20
          backdrop-blur-sm
          px-3
          py-1
          rounded-full
          text-sm
          font-bold
        "
      >
        {tag}
      </div>

    ))}

  </div>

</div>


      <div className="bg-white rounded-2xl shadow p-6">

  <div className="font-bold text-lg mb-4">
    📈 日別文字数
  </div>

  <div className="h-[300px]">

    <ResponsiveContainer width="100%" height="100%">

      <LineChart data={dailyChartData}>

        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="date" />

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

<div className="bg-white rounded-2xl shadow p-6">

  <div className="font-bold text-lg mb-4">
    📊 曜日ごとの執筆量
  </div>

  <div className="h-[300px]">

    <ResponsiveContainer width="100%" height="100%">

      <BarChart data={weekdayChartData}>

        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="day" />

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

<div className="bg-white rounded-2xl shadow p-6">

  <div className="font-bold text-lg mb-4">
    🌙 執筆時間帯分析
  </div>

  <div className="h-[300px]">

    <ResponsiveContainer width="100%" height="100%">

      <PieChart>

        <Pie
          data={timeZoneData}
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

      {/* ランキング */}
      <div className="bg-white rounded-2xl shadow p-6">

        <div className="flex items-center gap-2 mb-4">

          <Trophy />

          <div className="font-bold text-lg">
            週間文字数ランキング
          </div>

        </div>

        <div className="space-y-3">

          {rankingData.map((item) => (

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

                <div className="font-black text-xl w-8">
                  {item.rank}
                </div>

                <div className="font-bold flex items-center gap-2">

                  {item.name}

                  {item.isMe && (
                    <span
                      className="
                        text-xs
                        bg-yellow-200
                        px-2
                        py-0.5
                        rounded-full
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

          ))}

        </div>

      </div>

      

    </div>
  )
}

// =========================
// Card Component
// =========================

function Card({
  icon,
  title,
  value
}) {

  return (

    <div className="bg-white rounded-2xl shadow p-5">

      <div className="flex items-center gap-2 mb-3">

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