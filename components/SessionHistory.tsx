"use client"

import { toJSTDate } from "@/lib/time"

interface SessionHistoryProps {
  sessions: { created_at: string; duration: number; words: number }[]
}

export default function SessionHistory({ sessions }: SessionHistoryProps) {

  const totalWords = sessions.reduce((sum, s) => sum + s.words, 0)
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0)

  const totalMinutes = Math.floor(totalDuration / 60)
  const totalHours = Math.floor(totalMinutes / 60) 
  return (
    <div className="mt-6 w-full max-w-md">

      {/* 累計表示 */}
      <div className="mb-4 flex gap-6 text-sm">
        <div>
          <div className="font-bold text-lg">{totalWords.toLocaleString()}</div>
          <div>累計文字数</div>
        </div>

        <div>
          <div className="font-bold text-lg">{totalHours}時間</div>
          <div>累計執筆時間</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">執筆履歴</h2>

      {sessions.map((s, i) => (
        <div key={i} className="flex justify-between border-b py-2 text-sm">
          <span>{toJSTDate(s.created_at)}</span>
          <span>⏱ {Math.floor(s.duration / 60)}分</span>
          <span>✏️ {s.words}文字</span>
        </div>
      ))}

    </div>
  )
}