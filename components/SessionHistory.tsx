"use client"

import { toJSTDate } from "@/lib/time"

interface SessionHistoryProps {
  sessions: { created_at: string; duration: number; words: number }[]
}

export default function SessionHistory({ sessions }: SessionHistoryProps) {
  return (
    <div className="mt-6 w-full max-w-md">
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