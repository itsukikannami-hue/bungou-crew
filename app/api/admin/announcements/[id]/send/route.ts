import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb, sendPushWithResult } from '@/lib/pushServer'

export const runtime = 'nodejs'

// 初期運用の安全上限。大量配信は後続のキュー方式で対応します。
const MAX_RECIPIENTS = 25

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'お知らせIDが不正です' }, { status: 400 })
  }

  let claimed = false
  try {
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
    if (announcement.status !== 'draft') {
      return NextResponse.json({ error: '下書きのお知らせだけ配信できます' }, { status: 409 })
    }

    // 対象ユーザー数を確定してから配信状態を確保する。
    const { data: usersPage, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: MAX_RECIPIENTS + 1 })
    if (usersError) throw usersError
    const users = usersPage.users
    if (users.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `安全のため現在は${MAX_RECIPIENTS}ユーザーまでの配信に制限しています。大量配信機能の実装後に送信してください。` }, { status: 422 })
    }

    const { data: didClaim, error: claimError } = await db.rpc('claim_admin_announcement', { p_announcement_id: id })
    if (claimError) throw claimError
    if (didClaim !== true) return NextResponse.json({ error: 'すでに配信が開始されています' }, { status: 409 })
    claimed = true

    let processed = 0
    let failed = 0
    for (const recipient of users) {
      try {
        const { data: pref, error: prefError } = await db.from('notification_preferences')
          .select('announcement_in_app,announcement_push').eq('user_id', recipient.id).maybeSingle()
        if (prefError) throw prefError
        const inApp = pref?.announcement_in_app ?? true
        const push = pref?.announcement_push ?? true

        const { error: deliveryError } = await db.from('admin_announcement_deliveries')
          .insert({ announcement_id: id, user_id: recipient.id })
        if (deliveryError) throw deliveryError

        let notificationId: string | null = null
        if (inApp) {
          const { data: notification, error: notificationError } = await db.from('notifications')
            .insert({ user_id: recipient.id, type: 'announcement', content: `${announcement.title}\n${announcement.body}`, is_read: false, link: '/mypage/notifications' })
            .select('id').single()
          if (notificationError) throw notificationError
          notificationId = notification.id
        }
        const { error: inAppUpdateError } = await db.from('admin_announcement_deliveries')
          .update({ notification_id: notificationId, in_app_sent: inApp, updated_at: new Date().toISOString() })
          .eq('announcement_id', id).eq('user_id', recipient.id)
        if (inAppUpdateError) throw inAppUpdateError

        if (push) {
          const result = await sendPushWithResult(recipient.id, {
            id: notificationId ?? id,
            title: announcement.title,
            body: announcement.body,
            url: '/mypage/notifications',
          })
          // 購読端末がない場合は未送信扱い。端末が複数ある場合は一部成功でも成功扱い。
          if (result.accepted > 0) {
            const { error: pushUpdateError } = await db.from('admin_announcement_deliveries')
              .update({ push_sent: true, updated_at: new Date().toISOString() })
              .eq('announcement_id', id).eq('user_id', recipient.id)
            if (pushUpdateError) throw pushUpdateError
          } else if (result.subscriptions > 0) {
            failed += 1
          }
        }
        processed += 1
      } catch (recipientError) {
        failed += 1
        console.error('[Admin Announcements] recipient failed', recipient.id, recipientError)
      }
    }

    const status = failed > 0 ? 'failed' : 'sent'
    const { error: statusError } = await db.from('admin_announcements')
      .update({ status, ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) })
      .eq('id', id).eq('status', 'sending')
    if (statusError) throw statusError
    return NextResponse.json({ success: failed === 0, status, processed, failed })
  } catch (error) {
    console.error('[Admin Announcements] delivery failed', error)
    // 配信途中の再実行は重複通知の危険があるため、自動的にdraftへ戻さない。
    if (claimed) {
      try {
        await adminDb().from('admin_announcements').update({ status: 'failed' }).eq('id', id).eq('status', 'sending')
      } catch (statusError) {
        console.error('[Admin Announcements] status update failed', statusError)
      }
    }
    return NextResponse.json({ error: '配信処理に失敗しました。再送せず配信履歴を確認してください。' }, { status: 500 })
  }
}
