"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type AuditLog = {
  id: string
  actor_user_id: string
  action: string
  target_type: string
  target_id: string | null
  details: { amount?: number; reason?: string; point_transaction_id?: string } | null
  created_at: string
}

type AuditResponse = {
  logs?: AuditLog[]
  total?: number
  pageSize?: number
  error?: string
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [action, setAction] = useState("")
  const [actorInput, setActorInput] = useState("")
  const [actor, setActor] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (action) params.set("action", action)
      if (actor) params.set("actor", actor)
      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store", signal,
      })
      const result = (await response.json()) as AuditResponse
      if (!response.ok) throw new Error(result.error ?? "監査ログの取得に失敗しました。")
      if (signal?.aborted) return
      setLogs(result.logs ?? [])
      setTotal(result.total ?? 0)
      setPageSize(result.pageSize ?? 30)
    } catch (err) {
      if (signal?.aborted) return
      setError(err instanceof Error ? err.message : "監査ログの取得に失敗しました。")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, action, actor])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:p-6">
      <Link href="/admin" className="text-sm text-gray-600 hover:underline">← 管理画面に戻る</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理者操作の監査ログ</h1>
          <p className="mt-2 text-sm text-gray-500">ポイント付与・減算の操作履歴を表示します。記録は編集・削除できません。</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">再読み込み</button>
      </div>
      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); setPage(1); setActor(actorInput.trim()) }}>
        <label className="text-sm text-gray-700">操作種別
          <select className="mt-1 block rounded-lg border border-gray-300 p-2" value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }}>
            <option value="">すべて</option>
            <option value="admin_grant">ポイント付与</option>
            <option value="admin_remove">ポイント減算</option>
          </select>
        </label>
        <label className="min-w-[250px] flex-1 text-sm text-gray-700">管理者ユーザーID
          <input className="mt-1 block w-full rounded-lg border border-gray-300 p-2" placeholder="UUIDで絞り込み" value={actorInput} onChange={(event) => setActorInput(event.target.value)} />
        </label>
        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">検索</button>
        <button type="button" onClick={() => { setAction(""); setActor(""); setActorInput(""); setPage(1) }} className="rounded-lg border px-4 py-2 text-sm">解除</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-700"><tr>
            <th className="p-3">日時（日本時間）</th><th className="p-3">操作</th><th className="p-3">管理者ID</th><th className="p-3">対象ユーザーID</th><th className="p-3">ポイント</th><th className="p-3">理由</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">読み込み中...</td></tr>
              : logs.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">該当する監査ログはありません。</td></tr>
              : logs.map((log) => <tr key={log.id}>
                <td className="whitespace-nowrap p-3">{new Date(log.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</td>
                <td className="p-3">{log.action === "admin_grant" ? "付与" : log.action === "admin_remove" ? "減算" : log.action}</td>
                <td className="break-all p-3 text-xs">{log.actor_user_id}</td>
                <td className="break-all p-3 text-xs">{log.target_id ?? "-"}</td>
                <td className="whitespace-nowrap p-3 font-medium">{typeof log.details?.amount === "number" ? `${log.details.amount > 0 ? "+" : ""}${log.details.amount.toLocaleString()} pt` : "-"}</td>
                <td className="max-w-xs break-words p-3">{log.details?.reason ?? "-"}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <span>全 {total.toLocaleString()} 件・{page} / {totalPages} ページ</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">前へ</button>
          <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">次へ</button>
        </div>
      </div>
    </main>
  )
}
