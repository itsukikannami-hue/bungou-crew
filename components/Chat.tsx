"use client"

import { useState } from "react"

export default function Chat({ messages, onSend }) {

  const [text,setText] = useState("")

  return (
    <div className="w-full max-w-md">

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
         setMessages(prev => [...prev, payload.new])
       }
     )
     .subscribe()
   
    return ()=>{
      supabase.removeChannel(channel)
    }
   
   },[])