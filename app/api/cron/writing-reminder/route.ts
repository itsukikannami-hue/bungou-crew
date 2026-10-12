import { NextResponse } from 'next/server'
import { adminDb, sendPushWithResult } from '@/lib/pushServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const PAGE_SIZE = 200

function jstDateParts(now: Date) {
  const jst = new Date(now.getTime() + JST_OFFSET_MS)
  const date = jst.toISOString().slice(0, 10)
  const hour = jst.getUTCHours()
  return { date, hour }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { date, hour } = jstDateParts(now)
  // 22:00〜22:59 JST 以外では送らない。手動実行の誤送信も防止。
  if (hour !== 22) {
    return NextResponse.json({ skipped: true, reason: 'Outside 22:00 JST', date })
  }

  const db = adminDb()
  const startUtc = new Date(`${date}T00:00:00+09:00`).toISOString()
  const endUtc = new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 86400000).toISOString()
  const yesterdayStartUtc = new Date(new Date(startUtc).getTime() - 86400000).toISOString()

  let offset = 0
  let checked = 0
  let accepted = 0
  let failed = 0
  let skipped = 0

  // リマインダーを明示的にONにした人だけ。デフォルトOFF。
  while (true) {
    const { data: prefs, error: prefsError } = await db
      .from('notification_preferences')
      .select('user_id')
      .eq('reminder_push', true)
      .order('user_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (prefsError) throw prefsError
    if (!prefs?.length) break

    for (const pref of prefs) {
      checked++
      const userId = pref.user_id as string
      try {
        // 当日の記録が一つでもあれば通知しない。
        const { data: todayLog, error: todayError } = await db
          .from('writing_logs')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', startUtc)
          .lt('created_at', endUtc)
          .limit(1)
        if (todayError) throw todayError
        if (todayLog?.length) { skipped++; continue }

        // 同時実行時の二重送信を防ぐため、送信前に日付を確保する。
        const { error: claimError } = await db
          .from('writing_reminder_deliveries')
          .insert({ user_id: userId, reminder_date: date })
        if (claimError) {
          if (claimError.code === '23505') { skipped++; continue }
          throw claimError
        }

        let keepClaim = false
        try {
          // 通知処理直前に設定・執筆記録を再確認。
          const { data: currentPref, error: currentPrefError } = await db
            .from('notification_preferences')
            .select('reminder_push')
            .eq('user_id', userId)
            .maybeSingle()
          if (currentPrefError) throw currentPrefError
          const { data: latestLog, error: latestError } = await db
            .from('writing_logs')
            .select('id')
            .eq('user_id', userId)
            .gte('created_at', startUtc)
            .lt('created_at', endUtc)
            .limit(1)
          if (latestError) throw latestError
          if (!currentPref?.reminder_push || latestLog?.length) { skipped++; continue }

          const { data: yesterdayLog, error: yesterdayError } = await db
            .from('writing_logs')
            .select('id')
            .eq('user_id', userId)
            .gte('created_at', yesterdayStartUtc)
            .lt('created_at', startUtc)
            .limit(1)
          if (yesterdayError) throw yesterdayError

          const body = yesterdayLog?.length
            ? '昨日は執筆できましたね。今日も少しだけ、続きを書いてみませんか？'
            : '今日はまだ執筆記録がありません。数分だけでも、物語の続きを書いてみませんか？'
          const result = await sendPushWithResult(userId, {
            id: `writing-reminder-${date}-${userId}`,
            title: '✍️ 今日の執筆リマインダー',
            body,
            url: '/',
          })
          if (result.accepted > 0) {
            accepted += result.accepted
            failed += result.failed
            keepClaim = true
          } else {
            failed += result.failed
            skipped += result.subscriptions === 0 ? 1 : 0
          }
        } finally {
          // 全送信先で不達または送信対象外なら次回再試行できるよう確保を解除。
          // 一部成功の場合は重複通知を避けるため確保を残す。
          if (!keepClaim) {
            const { error: deleteError } = await db
              .from('writing_reminder_deliveries')
              .delete()
              .eq('user_id', userId)
              .eq('reminder_date', date)
            if (deleteError) console.error('[Reminder] claim cleanup:', deleteError.message)
          }
        }
      } catch (error) {
        failed++
        console.error('[Reminder] user processing failed', error)
      }
    }
    offset += prefs.length
    if (prefs.length < PAGE_SIZE) break
  }

  return NextResponse.json({ date, checked, accepted, failed, skipped })
}
