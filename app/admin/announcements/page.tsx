'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/ToastProvider'

type Announcement = {
  id: string
  title: string
  body: string
  status: 'draft' | 'sending' | 'sent' | 'failed'
  created_at: string
  sent_at: string | null
}

const statusLabels: Record<Announcement['status'], string> = {
  draft: '下書き', sending: '配信中', sent: '配信済み', failed: '配信失敗',
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const toast = useToast()
  const [checking, setChecking] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const loadAnnouncements = useCallback(async () => {
    setLoadingList(true)
    setListError('')
    try {
      const response = await fetch('/api/admin/announcements/list', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '一覧の取得に失敗しました')
      setAnnouncements(result.announcements ?? [])
    } catch (error) {
      setListError(error instanceof Error ? error.message : '一覧の取得に失敗しました')
    } finally { setLoadingList(false) }
  }, [])

  useEffect(() => {
    let active = true
    async function checkAdmin() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!active) return
      if (userError || !user) { router.replace('/login'); return }
      const { data: profile, error } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single()
      if (!active) return
      if (error || !profile?.is_admin) { router.replace('/'); return }
      setChecking(false)
      void loadAnnouncements()
    }
    void checkAdmin()
    return () => { active = false }
  }, [router, loadAnnouncements])

  async function saveDraft() {
    if (saving) return
    setMessage('')
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle || cleanTitle.length > 100 || !cleanBody || cleanBody.length > 2000) {
      toast.error('タイトルは1〜100文字、本文は1〜2000文字で入力してください')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle, body: cleanBody }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || '下書きを保存できませんでした')
      toast.success('下書きを保存しました。通知はまだ配信されていません。')
      setTitle('')
      setBody('')
      await loadAnnouncements()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '下書きを保存できませんでした')
    } finally { setSaving(false) }
  }

  async function testAnnouncement(item: Announcement) {
    if (testingId || sendingId || item.status !== 'draft') return
    setTestingId(item.id)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/announcements/${encodeURIComponent(item.id)}/test`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'テスト配信に失敗しました')
      const pushText = result.pushEnabled
        ? result.accepted > 0 ? `Web Push: ${result.accepted}端末の送信先が受付` : `Web Push: 受付0件（購読端末 ${result.subscriptions}件）`
        : 'Web Push: 通知設定でOFF'
      toast.success(`管理者本人へのテスト完了。アプリ内通知: ${result.inAppCreated ? '作成' : '設定でOFF'}、${pushText}。下書きの状態は変更していません。`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'テスト配信に失敗しました')
    } finally {
      setTestingId(null)
    }
  }

  async function sendAnnouncement(item: Announcement) {
    if (sendingId || testingId || !['draft', 'sending'].includes(item.status)) return
    if (item.status === 'draft' && !window.confirm(`「${item.title}」を全ユーザーに配信します。\nこの操作は取り消せません。\n\n本当に配信しますか？`)) return
    setSendingId(item.id)
    setMessage('')
    try {
      let progress: { done?: boolean; pendingInApp?: number; pendingPush?: number; uncertain?: number; rejected?: number; recipients?: number } = {}
      do {
        const response = await fetch(`/api/admin/announcements/${encodeURIComponent(item.id)}/send`, { method: 'POST' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || '配信処理に失敗しました')
        progress = result
        setMessage(`配信処理中：対象${result.recipients ?? 0}人、残りアプリ内${result.pendingInApp ?? 0}件・Push${result.pendingPush ?? 0}端末`)
      } while (!progress.done)
      setMessage('')
      const issues = (progress.uncertain ?? 0) + (progress.rejected ?? 0)
      toast[issues ? "error" : "success"](issues ? `配信処理終了。${issues}端末で送信未確認・失敗があります。重複防止のため自動再送しません。` : `配信完了：対象${progress.recipients ?? 0}人。`)
    } catch (error) {
      toast.error(`${error instanceof Error ? error.message : '配信が中断されました'}。配信中の表示なら「配信を再開」で続行できます。`)
    } finally {
      await loadAnnouncements()
      setSendingId(null)
    }
  }

  if (checking) return <main className="min-h-screen flex items-center justify-center"><p>確認中...</p></main>

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-sm text-orange-700 hover:underline">← 管理者画面に戻る</Link>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">お知らせ配信</h1>
        <p className="mt-2 text-sm text-gray-600">お知らせの下書きを保存し、内容を確認してから配信できます。</p>
        <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <label htmlFor="announcement-title" className="block text-sm font-semibold text-gray-800">タイトル</label>
            <input id="announcement-title" type="text" maxLength={100} value={title} onChange={e => { setTitle(e.target.value); setMessage('') }} placeholder="例：新機能のお知らせ" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            <p className="mt-1 text-right text-xs text-gray-500">{title.length}/100文字</p>
          </div>
          <div>
            <label htmlFor="announcement-body" className="block text-sm font-semibold text-gray-800">本文</label>
            <textarea id="announcement-body" rows={7} maxLength={2000} value={body} onChange={e => { setBody(e.target.value); setMessage('') }} placeholder="お知らせの本文を入力してください" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            <p className="mt-1 text-right text-xs text-gray-500">{body.length}/2000文字</p>
          </div>
          <button type="button" onClick={saveDraft} disabled={saving || !title.trim() || !body.trim()} className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? '保存中...' : '下書きを保存'}</button>
          {message && <p role="status" className="text-sm text-blue-700">{message}</p>}
        </div>
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">保存済みのお知らせ</h2>
            <button type="button" onClick={() => void loadAnnouncements()} disabled={loadingList || !!sendingId || !!testingId} className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">更新</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">新しい順に最大100件表示します。配信操作は取り消せません。</p>
          {loadingList && <div role="status" aria-busy="true" aria-label="お知らせ一覧を読み込み中" className="mt-4 space-y-3"><span className="sr-only">お知らせ一覧を読み込んでいます</span>{[1,2,3].map(n => <div key={n} aria-hidden="true" className="animate-pulse motion-reduce:animate-none rounded-xl border bg-white p-4"><div className="h-4 w-2/5 rounded bg-gray-200"/><div className="mt-3 h-3 w-4/5 rounded bg-gray-200"/></div>)}</div>}
          {listError && <p role="alert" className="mt-4 text-sm text-red-700">{listError}</p>}
          {!loadingList && !listError && announcements.length === 0 && <p className="mt-4 text-sm text-gray-600">まだお知らせがありません。</p>}
          <div className="mt-4 space-y-4">
            {announcements.map(item => (
              <article key={item.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{statusLabels[item.status] ?? item.status}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.body}</p>
                <p className="mt-3 text-xs text-gray-500">作成: {new Date(item.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
                {(item.status === 'draft' || item.status === 'sending') && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void testAnnouncement(item)} disabled={item.status !== 'draft' || !!sendingId || !!testingId} className="rounded-lg border border-orange-600 px-4 py-2 text-sm font-semibold text-orange-700 disabled:opacity-50">
                      {testingId === item.id ? 'テスト中...' : '自分にテスト配信'}
                    </button>
                    <button type="button" onClick={() => void sendAnnouncement(item)} disabled={!!sendingId || !!testingId} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {sendingId === item.id ? '配信中...' : item.status === 'sending' ? '配信を再開' : '全ユーザーに配信する'}
                    </button>
                  </div>
                )}
                {item.status === 'failed' && <p className="mt-2 text-xs text-red-700">一部端末へのPushが失敗または送信結果不明です。重複防止のため自動再送はしません。</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
