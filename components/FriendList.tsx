"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { getFriends } from "@/lib/friends"
import type { User } from "@supabase/supabase-js"

type FriendListProps = {
  user: User | null
}

type Friend = {
  id: string
  user_id: string
  username: string | null
  avatar_url: string | null
}

export default function FriendList({
  user
}: FriendListProps) {
  const [friends, setFriends] = useState<Friend[]>([])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const list = await getFriends(user.id)
      setFriends((list ?? []) as Friend[])
    }
    fetch()
  }, [user])

  useEffect(()=>{

    const channel = supabase
     .channel("status")
     .on(
       "postgres_changes",
       {
         event:"UPDATE",
         schema:"public",
         table:"user_status"
       },
       payload=>{
         const status = payload.new
         void 0
       }
     )
     .subscribe()
   
    return ()=>{
      supabase.removeChannel(channel)
    }
   
   },[])

  if (!user) return null

  return (
    <div className="w-full max-w-md p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-2">フレンド一覧</h2>
      {friends.length === 0 && <p>フレンドがいません</p>}
      {friends.map(f => (
        <div key={f.id} className="flex justify-between items-center border-b py-2">
          <span>{f.username}</span>
        </div>
      ))}
    </div>
  )
}



