"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface SessionModalProps {
  user: any
  duration: number
  setShowModal: (v: boolean) => void
}

export default function SessionModal({ user, duration, setShowModal }: SessionModalProps) {
  console.log("SessionModal表示", user, duration)
  const [words, setWords] = useState(0)

  const saveSession = async () => {

    console.log("saveSession開始")
  
    if (!user) {
      console.log("userなし")
      return
    }
  
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: user.id,
          words: words,
          duration: duration
        }
      ])
  
    console.log("insert結果 data:", data)
    console.log("insert結果 error:", error)
  
    setShowModal(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-8 rounded-xl flex flex-col gap-4 items-center">

        <h2 className="text-xl font-bold">
          執筆セッション終了！
        </h2>

        <input
          type="number"
          placeholder="執筆文字数"
          className="border p-2 text-center"
          value={words}
          onChange={(e) => setWords(Number(e.target.value))}
        />

<button
  onClick={() => {
    console.log("保存ボタン押された")
    saveSession()
  }}
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  セッション保存
</button>

      </div>
    </div>
  )
}
