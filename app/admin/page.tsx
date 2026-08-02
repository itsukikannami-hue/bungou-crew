"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single()

      if (error || !profile?.is_admin) {
        router.replace("/")
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdmin()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>確認中...</p>
      </main>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-2xl font-bold text-gray-900">
          管理者画面
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          ブンゴウクルー管理画面
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900">
              ユーザー管理
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              ユーザー情報を確認・管理します。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900">
              ポイント管理
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              ポイントの管理を行います。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900">
              システム管理
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              サービス全体を管理します。
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}