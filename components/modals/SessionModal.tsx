"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface SessionModalProps {
  user: any
  duration: number
  setShowModal: (v: boolean) => void
}

export default function SessionModal({ user, duration, setShowModal }: SessionModalProps) {
  void 0
  const [words, setWords] = useState(0)

  const saveSession = async () => {

    void 0
  
    if (!user) {
      void 0
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
  
    void 0
    void 0
  
    setShowModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white p-4 sm:p-8 rounded-xl flex flex-col gap-4 items-center">

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
    void 0
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
