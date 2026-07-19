"use client"

import { useState, useEffect, useRef } from "react"
import { updateStatus } from "@/lib/status"

export default function Timer({
  user,
  setShowModal,
  setShowStopModal,
  setSessionDuration
}: any) {

  const [timeInput, setTimeInput] = useState("00:30:00")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const [minutes, setMinutes] = useState(25)
const [bungouId, setBungouId] = useState<string | null>(null)

useEffect(() => {
  const m = Number(localStorage.getItem("timer_minutes") || 25)
  const id = localStorage.getItem("target_bungou_id")

  setMinutes(m)
  setBungouId(id)
}, [])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const parseTime = (time: string) => {
    const [h,m,s] = time.split(":").map(Number)
    return h*3600 + m*60 + s
  }

  const formatTime = (sec:number) => {
    const h = Math.floor(sec/3600)
    const m = Math.floor((sec%3600)/60)
    const s = sec%60

    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
  }

  const startTimer = () => {

    if (!user) return
    if (!minutes) return
  
    const duration = minutes * 60
  
    setSecondsLeft(duration)
    setSessionDuration(duration)
  
    updateStatus(user.id, "writing")
  
    setIsRunning(true)
  }

  const stopTimer = () => {

    if(intervalRef.current) clearInterval(intervalRef.current)

    setIsRunning(false)

    if(user) updateStatus(user.id,"online")

    setShowStopModal(true)
  }

  const resetTimer = () => {
    setSecondsLeft(parseTime(timeInput))
  }

  // タイマー進行
  useEffect(()=>{

    if(!isRunning) return

    intervalRef.current = setInterval(()=>{
      setSecondsLeft(prev => prev - 1)
    },1000)

    return ()=>{
      if(intervalRef.current) clearInterval(intervalRef.current)
    }

  },[isRunning])

  // タイマー終了処理
  useEffect(()=>{

    if(secondsLeft === 0 && isRunning){

      if(intervalRef.current) clearInterval(intervalRef.current)

      console.log("①タイマー終了")

      setIsRunning(false)

      if(user) updateStatus(user.id,"online")

      setShowModal(true)
    }

  },[secondsLeft, isRunning])

  return(

    <div className="mb-6">

      <div className="text-6xl font-bold mb-4">
        {formatTime(Math.max(secondsLeft,0))}
      </div>

      <div className="flex gap-3 mb-4">

        <button
          onClick={startTimer}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          開始
        </button>

        <button
          onClick={stopTimer}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          停止
        </button>

        <button
          onClick={resetTimer}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          リセット
        </button>

      </div>

      <input
        type="text"
        value={timeInput}
        onChange={(e)=>setTimeInput(e.target.value)}
        className="border p-2 text-center w-32"
      />

    </div>
  )
}
