"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { sendDM, getDM } from "@/lib/chat"

interface Props {
  userId: string
  friendId: string
}

export default function DMChat({ userId, friendId }: Props) {

  const [messages,setMessages] = useState<any[]>([])
  const [text,setText] = useState("")

  // メッセージ取得
  useEffect(()=>{
    const fetch = async()=>{
      const data = await getDM(userId, friendId)
      setMessages(data)
    }
    fetch()
  },[userId,friendId])

  // realtime
  useEffect(()=>{

    const channel = supabase
      .channel("dm-chat")
      .on(
        "postgres_changes",
        {
          event:"INSERT",
          schema:"public",
          table:"messages"
        },
        payload=>{
          const m = payload.new

          if(
            (m.sender_id === userId && m.receiver_id === friendId) ||
            (m.sender_id === friendId && m.receiver_id === userId)
          ){
            setMessages(prev=>[...prev,m])
          }
        }
      )
      .subscribe()

    return ()=>{
      supabase.removeChannel(channel)
    }

  },[userId,friendId])

  const handleSend = async()=>{
    if(!text) return
    await sendDM(userId,friendId,text)
    setText("")
  }

  return(

    <div className="w-full max-w-md border rounded p-4">

      <h2 className="font-bold mb-2">DM</h2>

      <div className="h-64 overflow-y-scroll border p-2 mb-2">

        {messages.map((m,i)=>(
          <div key={i} className="text-sm mb-1">
            {m.sender_id === userId ? "自分" : "相手"} : {m.content}
          </div>
        ))}

      </div>

      <div className="flex">

        <input
          className="flex-1 border p-2"
          value={text}
          onChange={(e)=>setText(e.target.value)}
        />

        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-3"
        >
          送信
        </button>

      </div>

    </div>
  )
}