"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { getWritingUsers } from "@/lib/status"

export default function WritingUsers() {

  const [users,setUsers] = useState<any[]>([])

  useEffect(()=>{

    const fetch = async()=>{
      const data = await getWritingUsers()
      setUsers(data)
    }

    fetch()

  },[])

  // realtime更新
  useEffect(()=>{

    const channel = supabase
      .channel("writing-users")
      .on(
        "postgres_changes",
        {
          event:"UPDATE",
          schema:"public",
          table:"user_status"
        },
        async ()=>{

          const data = await getWritingUsers()
          setUsers(data)

        }
      )
      .subscribe()

    return ()=>{
      supabase.removeChannel(channel)
    }

  },[])

  return(

    <div className="w-full max-w-md border p-4 mt-4">

      <h2 className="font-bold mb-2">
        ✍️ 今書いてる人
      </h2>

      {users.length === 0 && (
        <div className="text-sm text-gray-500">
          今は誰も執筆していません
        </div>
      )}

      {users.map(u => (

        <div key={u.user_id} className="text-sm border-b py-1">

          {u.user_id}

        </div>

      ))}

    </div>

  )
}