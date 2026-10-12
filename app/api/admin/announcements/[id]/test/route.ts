import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb, sendPushWithResult } from '@/lib/pushServer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'お知らせIDが不正です' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    const db = adminDb()
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('is_admin').eq('user_id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (!profile?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

    const { data: announcement, error: announcementError } = await db.from('admin_announcements')
      .select('id,title,body,status').eq('id', id).maybeSingle()
    if (announcementError) throw announcementError
    if (!announcement) return NextResponse.json({ error: 'お知らせがありません' }, { status: 404 })
    if (announcement.status !== 'draft') return NextResponse.json({ error: '下書きのみテストできます' }, { status: 409 })

    const { data: pref, error: prefError } = await db.from('notification_preferences')
      .select('announcement_in_app,announcement_push').eq('user_id', user.id).maybeSingle()
    if (prefError) throw prefError
    const inApp = pref?.announcement_in_app ?? true
    const push = pref?.announcement_push ?? true
    let inAppCreated = false
    let accepted = 0
    let subscriptions = 0

    if (inApp) {
      const { error } = await db.from('notifications').insert({
        user_id: user.id,
        type: 'announcement',
        content: `【テスト配信】${announcement.title}\n${announcement.body}`,
        is_read: false,
        link: '/admin/announcements',
      })
      if (error) throw error
      inAppCreated = true
    }
    if (push) {
      const result = await sendPushWithResult(user.id, {
        id: announcement.id,
        title: `【テスト配信】${announcement.title}`,
        body: announcement.body,
        url: '/admin/announcements',
      })
      accepted = result.accepted
      subscriptions = result.subscriptions
    }
    return NextResponse.json({ success: true, inAppCreated, pushEnabled: push, accepted, subscriptions })
  } catch (error) {
    console.error('[Admin Announcements] test delivery failed', error)
    return NextResponse.json({ error: 'テスト配信に失敗しました。Vercelのログを確認してください。' }, { status: 500 })
  }
}
