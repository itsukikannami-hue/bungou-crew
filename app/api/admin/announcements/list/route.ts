import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb } from '@/lib/pushServer'

export const runtime = 'nodejs'
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    const db = adminDb()
    const { data: profile, error: profileError } = await db.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (!profile?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    const { data, error } = await db.from('admin_announcements')
      .select('id,title,body,status,created_at,sent_at')
      .order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ announcements: data ?? [] })
  } catch (error) {
    console.error('[Admin Announcements] list failed', error)
    return NextResponse.json({ error: 'お知らせ一覧を取得できませんでした' }, { status: 500 })
  }
}
