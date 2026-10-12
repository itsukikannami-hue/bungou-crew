import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb } from '@/lib/pushServer'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const maxDuration = 60

type Context = { params: Promise<{ id: string }> }
type Target = { announcement_id: string; user_id: string; subscription_id: string; endpoint: string; p256dh: string; auth: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    if (!uuid.test(id)) return NextResponse.json({ error: 'お知らせIDが不正です' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    const db = adminDb()
    const { data: profile, error: profileError } = await db.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (!profile?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

    const { data: announcement, error: aError } = await db.from('admin_announcements')
      .select('id,title,body,status').eq('id', id).maybeSingle()
    if (aError) throw aError
    if (!announcement) return NextResponse.json({ error: 'お知らせが見つかりません' }, { status: 404 })
    if (announcement.status === 'draft') {
      const { data: started, error } = await db.rpc('prepare_admin_announcement', { p_id: id })
      if (error) throw error
      if (!started) return NextResponse.json({ error: '他の処理で配信が開始されました。更新してください。' }, { status: 409 })
    } else if (announcement.status !== 'sending') {
      return NextResponse.json({ error: '配信終了済みです。再送は行いません。' }, { status: 409 })
    }

    const { error: inAppError } = await db.rpc('deliver_admin_announcement_in_app', { p_id: id, p_limit: 100 })
    if (inAppError) throw inAppError

    const { data: targets, error: targetError } = await db.rpc('claim_admin_push_targets', { p_id: id, p_limit: 20 })
    if (targetError) throw targetError
    const list = (targets ?? []) as Target[]
    if (list.length) {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const privateKey = process.env.VAPID_PRIVATE_KEY
      const subject = process.env.VAPID_SUBJECT
      if (!publicKey || !privateKey || !subject) throw new Error('VAPID環境変数が不足しています')
      webpush.setVapidDetails(subject, publicKey, privateKey)
      await Promise.all(list.map(async (target) => {
        let state: 'accepted' | 'rejected' = 'rejected'
        try {
          await webpush.sendNotification(
            { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
            JSON.stringify({ id, title: announcement.title, body: announcement.body, url: '/mypage/notifications' }),
            { TTL: 3600 }
          )
          state = 'accepted'
        } catch (error) {
          console.error('[Admin Announcement Push]', target.subscription_id, error)
          const code = (error as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) {
            const { error: cleanupError } = await db.from('push_subscriptions').delete().eq('id', target.subscription_id)
            if (cleanupError) console.error('[Admin Announcement cleanup]', cleanupError)
          }
        }
        const { error: updateError } = await db.from('admin_announcement_push_targets')
          .update({ state }).eq('announcement_id', id).eq('subscription_id', target.subscription_id).eq('state', 'attempted')
        if (updateError) throw updateError
      }))
    }
    const { data: progress, error: progressError } = await db.rpc('finish_admin_announcement_batch', { p_id: id })
    if (progressError) throw progressError
    return NextResponse.json({ success: true, ...progress })
  } catch (error) {
    console.error('[Admin Announcement batch]', error)
    return NextResponse.json({ error: '配信処理が中断されました。履歴を確認して再開してください。' }, { status: 500 })
  }
}
