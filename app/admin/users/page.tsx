"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ToastProvider"

type Profile = {
    user_id: string
    username: string | null
    avatar_url: string | null
    is_admin: boolean
  }

export default function AdminUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      setError("")
  
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "user_id, username, avatar_url, is_admin"
        )
  
      if (error) {
        console.error(error)
        setError("ユーザー情報の取得に失敗しました。")
        toast.error("ユーザー情報の取得に失敗しました。")
        setLoading(false)
        return
      }
  
      setUsers(data || [])
      setLoading(false)
    }
  
    fetchUsers()
  }, [toast, retryKey])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">
          ユーザー管理
        </h1>

        <div role="status" aria-busy="true" aria-label="ユーザー一覧を読み込み中" className="mt-6 space-y-3">
          <span className="sr-only">ユーザー一覧を読み込んでいます</span>
          {[1, 2, 3, 4].map((i) => <div key={i} aria-hidden="true" className="flex animate-pulse items-center gap-4 rounded-xl border bg-white p-4 motion-reduce:animate-none"><div className="h-10 w-10 rounded-full bg-gray-200" /><div className="h-4 w-1/2 rounded bg-gray-200" /></div>)}
        </div>
      </div>
    )
  }

  return (
    <div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ユーザー管理
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          ブンゴウクルーに登録されているユーザーを管理します。
        </p>
        <Link href="/admin/reports" className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">通報管理へ →</Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => setRetryKey((n) => n + 1)} className="mt-3 min-h-11 rounded-lg bg-white px-4 py-2 font-semibold text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">再試行する</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        <div className="px-6 py-4 border-b border-gray-200">
          <p className="font-semibold text-gray-900">
            ユーザー一覧
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {users.length}人
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-50">
              <tr>

                <th className="text-left px-6 py-4 font-medium text-gray-600">
                  ユーザー名
                </th>

                <th className="text-left px-6 py-4 font-medium text-gray-600">
                  ユーザーID
                </th>

                <th className="text-left px-6 py-4 font-medium text-gray-600">
                  権限
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {!error && users.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">登録ユーザーが見つかりません。</td></tr>}
              {users.map((user) => (
                <tr key={user.user_id}>

<td className="px-6 py-4">
  <Link
    href={`/admin/users/${user.user_id}`}
    className="font-medium text-gray-900 hover:underline"
  >
    {user.username || "未設定"}
  </Link>
</td>

                  <td className="px-6 py-4 text-gray-500">
                    {user.user_id}
                  </td>

                  <td className="px-6 py-4">

                    {user.is_admin ? (
                      <span className="inline-flex rounded-full bg-gray-900 px-3 py-1 text-xs text-white">
                        管理者
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        ユーザー
                      </span>
                    )}

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}