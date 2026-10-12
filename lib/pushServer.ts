import 'server-only'
import webpush from 'web-push'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials missing')
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function sendPush(userId: string, notification: { title: string; body: string; url: string; id: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    console.error('[Web Push] VAPID variables missing')
    return
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  const db = adminDb()
  const { data, error } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
  if (error) { console.error('[Web Push] subscriptions:', error.message); return }
  await Promise.all((data ?? []).map(async (item) => {
    try {
      await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify(notification), { TTL: 3600 })
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) await db.from('push_subscriptions').delete().eq('id', item.id)
      else console.error('[Web Push] send failed', statusCode ?? 'unknown')
    }
  }))
}

/**
 * リマインダー用。Pushサービスが受け付けた件数を返します。
 * ブラウザでの表示・閲覧を保証するものではありません。
 */
export async function sendPushWithResult(
  userId: string,
  notification: { title: string; body: string; url: string; id: string }
): Promise<{ accepted: number; failed: number; subscriptions: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('[Web Push] VAPID variables missing')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  const db = adminDb()
  const { data, error } = await db.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', userId)
  if (error) throw new Error(`[Web Push] subscriptions: ${error.message}`)

  const subscriptions = data ?? []
  const results = await Promise.all(subscriptions.map(async (item) => {
    try {
      await webpush.sendNotification(
        { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
        JSON.stringify(notification),
        { TTL: 3600 }
      )
      return true
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        const { error: deleteError } = await db.from('push_subscriptions').delete().eq('id', item.id)
        if (deleteError) console.error('[Web Push] stale subscription cleanup:', deleteError.message)
      } else {
        console.error('[Web Push] reminder send failed', statusCode ?? 'unknown')
      }
      return false
    }
  }))

  const accepted = results.filter(Boolean).length
  return { accepted, failed: subscriptions.length - accepted, subscriptions: subscriptions.length }
}
