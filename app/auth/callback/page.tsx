"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function CallbackPage() {

  const router = useRouter()

  useEffect(() => {

    const init = async () => {

      // ログインユーザー取得
      const {
        data:{ user }
      } = await supabase.auth.getUser()

      if(!user){
        router.replace("/login")
        return
      }

      // プロフィール取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      // 初回ログイン
      if(!profile){

        await supabase
          .from("profiles")
          .insert({
      
            user_id:user.id,
      
            username:
              user.user_metadata.full_name ||
              user.user_metadata.name ||
              "名無し作家",
      
            avatar_url:
              user.user_metadata.avatar_url ||
              "",
      
            bio:"",
            website:""
      
          })
      
      }
      
      router.replace("/")

    }

    init()

  },[])

  return <div>ログイン中...</div>

}