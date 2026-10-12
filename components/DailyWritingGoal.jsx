"use client"

import { useEffect, useState } from "react"

const TARGET_WORDS = 1000
const todayInJapan = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date())

export default function DailyWritingGoal({ todayWords = 0 }) {
  const [day, setDay] = useState("")
  useEffect(() => {
    const update = () => setDay(todayInJapan())
    update()
    const interval = window.setInterval(update, 30000)
    return () => window.clearInterval(interval)
  }, [])

  const words = Math.max(0, Number(todayWords) || 0)
  const progress = Math.min(100, Math.floor(words / TARGET_WORDS * 100))
  const remaining = Math.max(0, TARGET_WORDS - words)

  return (
    <section className="mt-5 rounded-2xl border border-[#f2e3d2] bg-[#fffaf4] p-4" aria-label="デイリー執筆目標">
      <h3 className="font-bold text-[#775b45]">🎯 デイリー執筆目標</h3>
      <p className="mt-1 text-xs text-[#927b69]">{day ? `${day}（日本時間）` : "本日の目標"}</p>
      <p className="mt-3 text-sm"><strong className="text-xl">{words.toLocaleString()}</strong> / {TARGET_WORDS.toLocaleString()} 文字</p>
      <div role="progressbar" aria-label="今日の執筆目標の達成率" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-3 overflow-hidden rounded-full bg-[#f5e8d9]">
        <div className="h-full rounded-full bg-[#efa76d] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm text-[#927b69]">{remaining === 0 ? "目標達成！" : `あと ${remaining.toLocaleString()} 文字`}（{progress}%）</p>
    </section>
  )
}
