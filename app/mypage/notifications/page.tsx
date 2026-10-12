"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import PushNotificationButton from "@/components/PushNotificationButton"
import NotificationPreferences from "@/components/NotificationPreferences"

export default function NotificationSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (!error) setUserId(data.user?.id ?? null)
      setChecking(false)
    }).catch(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-8 pb-28 text-[#594638]">
      <div className="mx-auto max-w-2xl">
        <Link href="/mypage" className="text-sm font-semibold text-[#b47a4b] hover:underline">← マイページへ戻る</Link>
        <h1 className="mt-5 text-2xl font-bold text-[#694b38]">🔔 通知設定</h1>
        {checking ? (
          <p className="mt-6 text-sm text-[#907b68]">ログイン状態を確認しています...</p>
        ) : !userId ? (
          <p className="mt-6 rounded-2xl bg-white p-5 text-sm">設定を変更するにはログインしてください。 <Link href="/login" className="underline">ログイン</Link></p>
        ) : (
          <>
            <section className="mt-5 rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[#694b38]">ブラウザのPush通知</h2>
              <p className="mb-4 mt-2 text-sm text-[#907b68]">このブラウザで通知を受け取るか設定します。</p>
              <PushNotificationButton />
            </section>
            <section className="mt-4 rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[#694b38]">通知の種類</h2>
              <p className="mt-2 text-sm text-[#907b68]">アプリ内通知とWeb Push通知を種類別に設定できます。</p>
              <NotificationPreferences userId={userId} />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
