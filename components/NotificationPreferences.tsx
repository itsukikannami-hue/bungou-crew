"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ToastProvider"

type SettingKey =
  | "cheer_in_app" | "cheer_push"
  | "comment_in_app" | "comment_push"
  | "repost_in_app" | "repost_push"
  | "reminder_push"
  | "announcement_in_app" | "announcement_push"

type Preferences = Record<SettingKey, boolean>

const defaults: Preferences = {
  cheer_in_app: true, cheer_push: true,
  comment_in_app: true, comment_push: true,
  repost_in_app: true, repost_push: true,
  reminder_push: false,
  announcement_in_app: true, announcement_push: true,
}

const rows: { title: string; description: string; inApp?: SettingKey; push: SettingKey }[] = [
  { title: "応援", description: "自分の投稿が応援されたとき", inApp: "cheer_in_app", push: "cheer_push" },
  { title: "コメント", description: "自分の投稿にコメントが付いたとき", inApp: "comment_in_app", push: "comment_push" },
  { title: "拡散", description: "自分の投稿が拡散されたとき", inApp: "repost_in_app", push: "repost_push" },
  { title: "執筆リマインダー", description: "毎日22時（日本時間）、未執筆の場合にお知らせ", push: "reminder_push" },
  { title: "運営からのお知らせ", description: "サービスに関する運営アナウンス", inApp: "announcement_in_app", push: "announcement_push" },
]

export default function NotificationPreferences({ userId }: { userId: string }) {
  const [values, setValues] = useState<Preferences>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState("")
  const toast = useToast()

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError("")
      setLoadFailed(false)
      const { data, error: readError } = await supabase
        .from("notification_preferences")
        .select("cheer_in_app,cheer_push,comment_in_app,comment_push,repost_in_app,repost_push,reminder_push,announcement_in_app,announcement_push")
        .eq("user_id", userId)
        .maybeSingle()
      if (!active) return
      if (readError) {
        setLoadFailed(true)
        setError("通知設定を読み込めませんでした。ページを再読み込みしてください。")
      }
      else setValues({ ...defaults, ...(data ?? {}) })
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [userId])

  async function change(key: SettingKey, checked: boolean) {
    if (loading || saving) return
    setSaving(true)
    setError("")
    const next = { ...values, [key]: checked }
    const { error: saveError } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    if (saveError) {
      console.error("通知設定の保存エラー:", saveError)
      toast.error("設定を保存できませんでした。もう一度お試しください。")
    } else {
      setValues(next)
      toast.success("通知設定を保存しました")
    }
    setSaving(false)
  }

  function toggle(label: string, key: SettingKey) {
    return (
      <label className="flex items-center gap-2 text-sm text-[#775e4b]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-orange-600"
          checked={values[key]}
          onChange={(event) => void change(key, event.target.checked)}
          disabled={loading || saving || loadFailed}
        />
        {label}
      </label>
    )
  }

  return (
    <div className="mt-5 border-t border-[#f1e5d9] pt-4">
      <h4 className="font-bold text-[#694b38]">通知の種類を設定</h4>
      <p className="mt-1 text-xs leading-5 text-[#907b68]">
        アプリ内通知とWeb Push通知をそれぞれ設定できます。Web Pushを受け取るには、上のボタンでブラウザの通知を有効にしてください。
      </p>
      <div className="mt-3 divide-y divide-[#f1e5d9]">
        {rows.map((row) => (
          <div key={row.push} className="py-3">
            <p className="text-sm font-semibold text-[#694b38]">{row.title}</p>
            <p className="mt-1 text-xs text-[#907b68]">{row.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {row.inApp && toggle("アプリ内", row.inApp)}
              {toggle("Web Push", row.push)}
            </div>
          </div>
        ))}
      </div>
      {loading && <p role="status" className="mt-2 text-sm text-[#907b68]">設定を読み込み中...</p>}
      {saving && <p role="status" className="mt-2 text-sm text-[#907b68]">保存中...</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
