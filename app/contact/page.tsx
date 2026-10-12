"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ToastProvider"

const categories = [
  { value: "general", label: "一般的なお問い合わせ" },
  { value: "account", label: "アカウント・ログイン" },
  { value: "payment", label: "課金・ポイント" },
  { value: "bug", label: "不具合の報告" },
  { value: "report", label: "迷惑行為・違反報告" },
  { value: "other", label: "その他" },
]

export default function ContactPage() {
  const toast = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("general")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, subject, message, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "送信に失敗しました。")
      setSuccess(true)
      toast.success("お問い合わせを受け付けました。")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "送信に失敗しました。"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-gray-900">
      <Link href="/" className="text-sm text-blue-700 hover:underline">← ホームへ戻る</Link>
      <h1 className="mt-6 text-3xl font-bold">お問い合わせ</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">ブンゴウクルーについてのご質問、不具合のご報告などはこちらからお送りください。返信が必要な場合は、ご入力のメールアドレスへご連絡します。</p>
      {success ? (
        <div role="status" className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="font-bold text-green-900">お問い合わせを受け付けました</h2>
          <p className="mt-2 text-sm text-green-900">送信ありがとうございます。内容を確認いたします。</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-700 underline">ホームへ戻る</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <div><label htmlFor="contact-name" className="block text-sm font-semibold">お名前（任意）</label><input id="contact-name" maxLength={100} value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
          <div><label htmlFor="contact-email" className="block text-sm font-semibold">返信先メールアドレス <span className="text-red-600">必須</span></label><input id="contact-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
          <div><label htmlFor="contact-category" className="block text-sm font-semibold">お問い合わせ種別</label><select id="contact-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label htmlFor="contact-subject" className="block text-sm font-semibold">件名 <span className="text-red-600">必須</span></label><input id="contact-subject" required minLength={2} maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
          <div><label htmlFor="contact-message" className="block text-sm font-semibold">お問い合わせ内容 <span className="text-red-600">必須</span></label><textarea id="contact-message" required minLength={10} maxLength={5000} rows={8} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2" /><p className="mt-1 text-right text-xs text-gray-500">{message.length} / 5000文字</p></div>
          <div aria-hidden="true" className="absolute -left-[9999px]"><label htmlFor="contact-website">Webサイト</label><input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <p className="text-xs leading-6 text-gray-600">入力された情報はお問い合わせへの対応に利用します。詳しくは<Link href="/privacy" className="text-blue-700 underline">プライバシーポリシー</Link>をご確認ください。</p>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "送信中..." : "お問い合わせを送信"}</button>
        </form>
      )}
    </main>
  )
}
