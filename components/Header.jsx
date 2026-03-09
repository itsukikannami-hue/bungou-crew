"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Header() {

  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (

    <header className="w-full flex justify-between items-center bg-white shadow px-6 py-4">

      <h1 className="text-xl font-bold">
        ブンゴウクルー
      </h1>

      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-3 py-1 rounded"
      >
        ログアウト
      </button>

    </header>

  )

}