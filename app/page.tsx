"use client"
import { useState, useEffect } from "react"

type Session = {
  date: string
  duration: number
}

export default function Home() {
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [totalToday, setTotalToday] = useState(0)
  const [sessions, setSessions] = useState<Session[]>([])

  // 初期読み込み
  useEffect(() => {
    const savedTotal = localStorage.getItem("totalToday")
    const savedSessions = localStorage.getItem("sessions")

    if (savedTotal) setTotalToday(Number(savedTotal))
    if (savedSessions) setSessions(JSON.parse(savedSessions))
  }, [])

  // タイマー処理
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1)
      }, 1000)
    }

    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false)

      const sessionTime = minutes * 60
      const newTotal = totalToday + sessionTime

      const newSession: Session = {
        date: new Date().toLocaleString(),
        duration: sessionTime,
      }

      const updatedSessions = [newSession, ...sessions]

      setTotalToday(newTotal)
      setSessions(updatedSessions)

      localStorage.setItem("totalToday", String(newTotal))
      localStorage.setItem("sessions", JSON.stringify(updatedSessions))
    }

    return () => clearInterval(timer)
  }, [isRunning, secondsLeft])

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = time % 60
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`
  }

  const handleStart = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(minutes * 60)
    }
    setIsRunning(true)
  }

  const handleFreeze = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSecondsLeft(0)
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">ブンゴウクルー</h1>

      <input
        type="number"
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="mb-4 p-2 border rounded text-center"
        min="1"
      />

      <div className="text-6xl font-mono mb-6">
        {formatTime(secondsLeft)}
      </div>

      <div className="space-x-4 mb-8">
        <button
          onClick={handleStart}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg"
        >
          スタート
        </button>

        <button
          onClick={handleFreeze}
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg"
        >
          フリーズ
        </button>

        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg"
        >
          リセット
        </button>
      </div>

      <div className="text-xl mb-6">
        今日の合計執筆時間：
        <span className="font-bold ml-2">
          {formatTime(totalToday)}
        </span>
      </div>

      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">セッション履歴</h2>
        <ul className="space-y-2">
          {sessions.map((session, index) => (
            <li
              key={index}
              className="bg-white p-3 rounded shadow text-sm"
            >
              <div>{session.date}</div>
              <div className="font-bold">
                {formatTime(session.duration)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}