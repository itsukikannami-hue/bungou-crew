"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import UserAvatar from "@/components/UserAvatar"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"

type Profile = {
  user_id: string
  username: string
  bio: string | null
  avatar_url: string | null
}

export default function FollowListPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) {
        setUser(null)
        setUsers([])
        setErrorMessage("ログインが必要です。")
        return
      }
      setUser(auth.user)
      const { data, error } = await supabase
        .from("follows")
        .select(`following_id, profiles!follows_following_fk(user_id, username, bio, avatar_url)`)
        .eq("follower_id", auth.user.id)
      if (error) throw error
      const profiles = (data ?? [])
        .flatMap((item) => item.profiles ?? [])
        .filter((profile): profile is Profile => Boolean(profile))
      setUsers(profiles)
    } catch (error) {
      console.error("フォロー一覧取得エラー:", error)
      setErrorMessage("一覧を取得できませんでした。時間をおいて再試行してください。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (targetId: string) => {
    if (!user || busyId) return
    setBusyId(targetId)
    setErrorMessage("")
    try {
      const { error } = await supabase.from("follows").delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId)
      if (error) throw error
      setUsers((previous) => previous.filter((profile) => profile.user_id !== targetId))
    } catch (error) {
      console.error("フォロー解除エラー:", error)
      setErrorMessage("操作に失敗しました。もう一度お試しください。")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-5">
      <h1 className="mb-5 text-xl font-bold">フォロー中</h1>
      {loading ? (
        <div role="status" aria-busy="true" aria-label="一覧を読み込み中" className="space-y-3">
          <span className="sr-only">一覧を読み込んでいます</span>
          {[1, 2, 3].map((n) => (
            <div key={n} aria-hidden="true" className="flex animate-pulse items-center gap-3 rounded-xl bg-white p-4 shadow motion-reduce:animate-none">
              <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {errorMessage && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <p>{errorMessage}</p>
              <button type="button" onClick={() => void load()} className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                再試行する
              </button>
            </div>
          )}
          {!errorMessage && users.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
              <p>フォローしているユーザーはいません</p>
              <Link href="/mypage" className="mt-4 inline-block min-h-11 rounded-lg bg-gray-100 px-5 py-3 font-medium text-gray-800">マイページへ戻る</Link>
            </div>
          )}
          <div className="space-y-3">
            {users.map((profile) => (
              <div key={profile.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow">
                <Link href={`/user/${profile.user_id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  <UserAvatar src={profile.avatar_url || "/default-avatar.svg"} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{profile.username}</p>
                    <p className="break-words text-sm text-gray-500">{profile.bio || "自己紹介はありません"}</p>
                  </div>
                </Link>
                <button type="button" disabled={busyId !== null} onClick={() => void remove(profile.user_id)}
                  className="min-h-11 rounded-full border px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  {busyId === profile.user_id ? "処理中…" : "フォロー解除"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
