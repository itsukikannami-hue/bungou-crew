"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

type ChatProps = {
  messages: {
    id:string
    user_id:string
    content:string
    created_at:string
  }[]

  setMessages: React.Dispatch<
    React.SetStateAction<{
      id:string
      user_id:string
      content:string
      created_at:string
    }[]>
  >

  onSend:(text:string)=>void
}

export default function Chat({
  messages,
  setMessages,
  onSend
}: ChatProps) {

  const [text,setText] = useState("")


  useEffect(()=>{

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event:"INSERT",
          schema:"public",
          table:"messages"
        },
        (payload)=>{

          setMessages(prev => [
            ...prev,
            payload.new as {
              id:string
              user_id:string
              content:string
              created_at:string
             }
          ])

        }
      )
      .subscribe()


    return ()=>{
      supabase.removeChannel(channel)
    }


  },[setMessages])


  return (
    <div>
      <div className="h-64 overflow-y-scroll border p-2">

        {messages.map((m,i)=>(
          <div key={i} className="text-sm mb-1">
            {m.content}
          </div>
        ))}

      </div>


      <div className="flex mt-2">

        <input
          className="flex-1 border p-2"
          value={text}
          onChange={(e)=>setText(e.target.value)}
        />

        <button
          className="bg-blue-500 text-white px-3"
          onClick={()=>{
            onSend(text)
            setText("")
          }}
        >
          送信
        </button>

      </div>
    </div>
  )

}