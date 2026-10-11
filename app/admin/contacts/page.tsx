"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

type Inquiry = { id: string; name: string | null; email: string; category: string; subject: string; status: string; created_at: string }
type ListResult = { inquiries: Inquiry[]; total: number; page: number; pageSize: number; error?: string }
const statusNames: Record<string, string> = { pending: "未対応", in_progress: "対応中", resolved: "対応済み" }
const categoryNames: Record<string, string> = { general: "一般", account: "アカウント", payment: "決済", bug: "不具合", report: "通報", other: "その他" }

export default function AdminContactsPage() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("")
    try {
      const qs = new URLSearchParams({ page: String(page) })
      if (status) qs.set("status", status)
      const res = await fetch(`/api/admin/contacts?${qs}`, { cache: "no-store", signal })
      const json: ListResult = await res.json()
      if (!res.ok) throw new Error(json.error || "取得に失敗しました。")
      setItems(json.inquiries); setTotal(json.total)
    } catch (e) {
      if (signal?.aborted) return
      setError(e instanceof Error ? e.message : "取得に失敗しました。")
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [page, status])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  const totalPages = Math.max(1, Math.ceil(total / 20))
  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
      <p><Link href="/admin/users">管理者メニューへ</Link></p>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>お問い合わせ管理</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <label htmlFor="contact-status">対応状況：</label>
        <select id="contact-status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} style={{ border: "1px solid #aaa", padding: 8, borderRadius: 6, color: "inherit", background: "transparent" }}>
          <option value="">すべて</option><option value="pending">未対応</option><option value="in_progress">対応中</option><option value="resolved">対応済み</option>
        </select>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ border: "1px solid #aaa", padding: "8px 12px", borderRadius: 6 }}>再読み込み</button>
        <span>全 {total} 件</span>
      </div>
      {error && <p role="alert" style={{ color: "#c33" }}>{error}</p>}
      {loading ? <p>読み込み中...</p> : items.length === 0 ? <p>お問い合わせはありません。</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map(item => <Link key={item.id} href={`/admin/contacts/${item.id}`} style={{ display: "block", padding: 16, border: "1px solid #bbb", borderRadius: 8, textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{item.subject}</strong><span>{statusNames[item.status] || item.status}</span></div>
            <p style={{ margin: "8px 0" }}>{categoryNames[item.category] || item.category} ／ {item.name || "お名前未入力"} ／ {item.email}</p>
            <small>{new Date(item.created_at).toLocaleString("ja-JP")}</small>
          </Link>)}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 24 }}>
        <button type="button" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>前へ</button>
        <span>{page} / {totalPages} ページ</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage(p => p + 1)}>次へ</button>
      </div>
    </main>
  )
}
