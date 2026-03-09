"use client"

import { useState, useEffect, useRef } from "react"

export default function Timer({
  user,
  todayTime,
  setTodayTime,
  setShowModal,
  setShowStopModal
}: any) {

  const [timeInput, setTimeInput] = useState("00:30:00")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const parseTime = (time: string) => {
    const [h, m, s] = time.split(":").map(Number)
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
  }

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const startTimer = () => {
    const sec = parseTime(timeInput)
    if (sec > 0) {
      setSecondsLeft(sec)
      setIsRunning(true)
    }
  }

  const stopTimer = () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setShowStopModal(true)
  }

  const resetTimer = () => {
    setSecondsLeft(parseTime(timeInput))
  }

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setIsRunning(false)
            setShowModal(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => intervalRef.current && clearInterval(intervalRef.current)
  }, [isRunning, setShowModal])

  return (
    <div className="mb-6">
      <div className="text-6xl font-bold mb-4">{formatTime(secondsLeft)}</div>
      <div className="flex gap-3 mb-4">
        <button onClick={startTimer} className="bg-green-500 text-white px-4 py-2 rounded">開始</button>
        <button onClick={stopTimer} className="bg-yellow-500 text-white px-4 py-2 rounded">停止</button>
        <button onClick={resetTimer} className="bg-gray-500 text-white px-4 py-2 rounded">リセット</button>
      </div>
      <input
        type="text"
        value={timeInput}
        onChange={(e) => setTimeInput(e.target.value)}
        className="border p-2 text-center w-32"
      />
    </div>
  )
}