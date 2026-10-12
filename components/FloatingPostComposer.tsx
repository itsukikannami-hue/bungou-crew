"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

/** タイムライン・マイページで共通利用する投稿作成ボタンとモーダル */
export default function FloatingPostComposer({ onPosted }: { onPosted?: () => void | Promise<void> }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, sending])

  // 他のページに移動した場合、入力画面を閉じる
  useEffect(() => { setOpen(false) }, [pathname])

  const submit = async () => {
    const text = content.trim()
    if (!text || sending) return
    if (Array.from(text).length > 200) {
      setError("通常の投稿は200文字以内で入力してください")
      return
    }
    setSending(true)
    setError("")
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("投稿するにはログインが必要です")

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, content: text })
        .select("id")
        .single()
      if (postError || !post) throw postError ?? new Error("投稿できませんでした")

      // マイページにあった既存のハッシュタグ登録処理と同じテーブルを使用
      const tags = [...new Set((text.match(/#[^\s#]+/g) ?? []).map(tag => tag.slice(1)))]
      for (const name of tags) {
        const { data: hashtag, error: tagError } = await supabase
          .from("hashtags")
          .upsert({ name }, { onConflict: "name" })
          .select("id")
          .single()
        if (tagError || !hashtag) {
          console.error("ハッシュタグ登録エラー:", tagError)
          continue
        }
        const { error: linkError } = await supabase
          .from("post_hashtags")
          .insert({ post_id: post.id, hashtag_id: hashtag.id })
        if (linkError) console.error("投稿ハッシュタグ紐付けエラー:", linkError)
      }

      setContent("")
      setOpen(false)
      await onPosted?.()
    } catch (err) {
      console.error("投稿エラー:", err)
      setError(err instanceof Error ? err.message : "投稿に失敗しました")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="新しい投稿を作成"
        title="投稿する"
        onClick={() => { setError(""); setOpen(true) }}
        className="fixed right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#d78f57] text-white shadow-lg transition hover:bg-[#c77f43] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c77f43] sm:right-8"
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#39291f]/45 px-3 py-4 sm:px-4 sm:py-8"
          onMouseDown={event => { if (event.target === event.currentTarget && !sending) setOpen(false) }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="compose-title" className="w-full max-w-lg rounded-3xl border border-[#efd9c3] bg-[#fffaf3] p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="compose-title" className="text-lg font-bold text-[#694b36]">新しい投稿</h2>
              <button type="button" onClick={() => setOpen(false)} disabled={sending} aria-label="閉じる" className="rounded-full px-3 py-1 text-2xl text-[#967b66] hover:bg-[#f5e9db] disabled:opacity-50">×</button>
            </div>
            <textarea
              autoFocus
              value={content}
              onChange={event => setContent(Array.from(event.target.value).slice(0, 200).join(""))}
              placeholder="いま、どんなことを考えていますか？"
              rows={6}
              className="w-full resize-y rounded-2xl border border-[#ecd7c0] bg-white p-4 text-[#594334] outline-none placeholder:text-[#ad9988] focus:border-[#d78f57]"
              disabled={sending}
            />
            <div className="mt-2 flex justify-between text-xs text-[#99816d]"><span>#ハッシュタグ も使えます</span><span aria-live="polite">{Array.from(content).length} / 200文字</span></div>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} disabled={sending} className="rounded-full border border-[#e6ccb1] bg-white px-5 py-2 font-medium text-[#986a48] disabled:opacity-50">キャンセル</button>
              <button type="button" onClick={submit} disabled={!content.trim() || Array.from(content.trim()).length > 200 || sending} className="rounded-full bg-[#d78f57] px-7 py-2 font-bold text-white transition hover:bg-[#c77f43] disabled:cursor-not-allowed disabled:opacity-50">{sending ? "投稿中…" : "投稿する"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
