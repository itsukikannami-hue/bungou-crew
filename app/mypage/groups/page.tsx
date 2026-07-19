"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import GroupList from "@/components/GroupList"


export default function GroupsPage() {

  const [userId, setUserId] = useState<string | null>(null)


  useEffect(() => {

    const fetchUser = async () => {

      const { data } = await supabase.auth.getUser()

      if (data.user) {
        setUserId(data.user.id)
      }

    }

    fetchUser()

  }, [])



  if (!userId) {
    return (
      <div>
        読み込み中...
      </div>
    )
  }



  return (

    <div className="p-5">

      <GroupList userId={userId} />

    </div>

  )

}