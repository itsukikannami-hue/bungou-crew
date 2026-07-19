"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { getNotifications, markAsRead } from "@/lib/notification"

export default function NotificationList({ userId }: any) {

  const [notifications,setNotifications] = useState<any[]>([])

  useEffect(()=>{

    const fetch = async()=>{
      const data = await getNotifications(userId)
      setNotifications(data)
    }

    fetch()

  },[userId])

  // realtime
  useEffect(()=>{

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event:"INSERT",
          schema:"public",
          table:"notifications"
        },
        payload=>{
          setNotifications(prev=>[payload.new,...prev])
        }
      )
      .subscribe()

    return ()=>{
      supabase.removeChannel(channel)
    }

  },[])

  return(

    <div className="w-full max-w-md border p-4 mt-4">

      <h2 className="font-bold mb-2">🔔 通知</h2>

      {notifications.map(n => (

        <div
          key={n.id}
          className="border-b py-2 cursor-pointer"
          onClick={()=>markAsRead(n.id)}
        >

          <div>{n.content}</div>

          {!n.is_read && (
            <span className="text-xs text-red-500">
              未読
            </span>
          )}

        </div>

      ))}

    </div>

  )
}