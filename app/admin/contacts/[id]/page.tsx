"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type Inquiry = { id: string; user_id: string | null; name: string | null; email: string; category: string; subject: string; message: string; status: string; admin_note: string | null; created_at: string; updated_at: string }
const statusNames: Record<string, string> = { pending: "未対応", in_progress: "対応中", resolved: "対応済み" }
const categoryNames: Record<string, string> = { general: "一般", account: "アカウント", payment: "決済", bug: "不具合", report: "通報", other: "その他" }

export default function AdminContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Inquiry | null>(null)
  const [status, setStatus] = useState("pending")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/admin/contacts/${encodeURIComponent(id)}`, { cache: "no-store", signal })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "取得に失敗しました。")
      const data = json.inquiry as Inquiry
      setItem(data); setStatus(data.status); setNote(data.admin_note || "")
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "取得に失敗しました。") }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [id])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  async function save() {
    if (saving) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/contacts/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, admin_note: note }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "保存に失敗しました。")
      setItem(prev => prev ? { ...prev, ...json.inquiry } : prev)
      setSuccess("保存しました。")
    } catch (e) { setError(e instanceof Error ? e.message : "保存に失敗しました。") }
    finally { setSaving(false) }
  }
  return <main style={{ maxWidth: 850, margin: "40px auto", padding: "0 20px" }}>
    <p><Link href="/admin/contacts">← お問い合わせ一覧へ</Link></p>
    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>お問い合わせ詳細</h1>
    {loading ? <p>読み込み中...</p> : item ? <>
      <section style={{ border: "1px solid #bbb", borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{item.subject}</h2>
        <p>種別：{categoryNames[item.category] || item.category}</p>
        <p>お名前：{item.name || "未入力"}</p>
        <p>返信先：<a href={`mailto:${item.email}`}>{item.email}</a></p>
        <p>ユーザーID：{item.user_id || "未ログイン"}</p>
        <p>受信日時：{new Date(item.created_at).toLocaleString("ja-JP")}</p>
        <h3 style={{ marginTop: 20, fontWeight: 700 }}>お問い合わせ本文</h3>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 8 }}>{item.message}</div>
      </section>
      <section style={{ display: "grid", gap: 12 }}>
        <label htmlFor="status">対応状況</label>
        <select id="status" value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 10, border: "1px solid #aaa", borderRadius: 6, color: "inherit", background: "transparent" }}>
          {Object.entries(statusNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
        <label htmlFor="admin-note">管理者メモ（問い合わせ者には表示されません）</label>
        <textarea id="admin-note" value={note} maxLength={5000} rows={7} onChange={e => setNote(e.target.value)} style={{ padding: 10, border: "1px solid #aaa", borderRadius: 6, color: "inherit", background: "transparent" }} />
        <button type="button" disabled={saving} onClick={() => void save()} style={{ padding: 12, border: "1px solid #aaa", borderRadius: 6 }}>{saving ? "保存中..." : "対応状況とメモを保存"}</button>
      </section>
    </> : !error ? <p>お問い合わせが見つかりません。</p> : null}
    {error && <p role="alert" style={{ color: "#c33" }}>{error}</p>}
    {success && <p role="status">{success}</p>}
  </main>
}
