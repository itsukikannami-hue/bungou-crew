"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

type Profile = {
    user_id: string
    username: string | null
    avatar_url: string | null
    is_admin: boolean
  }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
        setLoading(false)
        return
      }
  
      setUsers(data || [])
      setLoading(false)
    }
  
    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">
          ユーザー管理
        </h1>

        <p className="mt-6 text-gray-500">
          読み込み中...
        </p>
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
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
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