import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb } from '@/lib/pushServer'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const db = adminDb()
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile?.is_admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    let payload: unknown
    try { payload = await request.json() } catch {
      return NextResponse.json({ error: 'JSON形式で入力してください' }, { status: 400 })
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: '入力形式が不正です' }, { status: 400 })
    }
    const input = payload as Record<string, unknown>
    if (typeof input.title !== 'string' || typeof input.body !== 'string') {
      return NextResponse.json({ error: 'タイトルと本文を入力してください' }, { status: 400 })
    }
    const title = input.title.trim()
    const body = input.body.trim()
    if (!title || title.length > 100 || !body || body.length > 2000) {
      return NextResponse.json({ error: 'タイトルは1〜100文字、本文は1〜2000文字で入力してください' }, { status: 400 })
    }

    const { data, error } = await db.from('admin_announcements')
      .insert({ title, body, created_by: user.id, status: 'draft' })
      .select('id,status,created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, announcement: data }, { status: 201 })
  } catch (error) {
    console.error('[Admin Announcements] draft creation failed', error)
    return NextResponse.json({ error: 'お知らせの保存に失敗しました' }, { status: 500 })
  }
}
