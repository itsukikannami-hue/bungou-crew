import { NextResponse } from 'next/server'
import { adminClient, authClient, decrypt, encrypt, xTokenRequest } from '@/lib/xServer'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const supabase = await authClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 })
  let body: { writingLogId?: string; text?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 }) }
  if (!body.writingLogId || !/^[0-9a-f-]{36}$/i.test(body.writingLogId) || !body.text?.trim() || Array.from(body.text).length > 280) {
    return NextResponse.json({ error: '投稿内容または執筆記録が不正です（280文字以内）' }, { status: 400 })
  }
  const admin = adminClient()
  const { data: connection, error: connError } = await admin.from('x_connections')
    .select('*').eq('user_id', user.id).maybeSingle()
  if (connError) return NextResponse.json({ error: '連携情報の取得に失敗しました' }, { status: 500 })
  if (!connection) return NextResponse.json({ error: 'Xとの連携が必要です', needsConnect: true }, { status: 409 })
  const { data: reservation, error: reserveError } = await admin.rpc('reserve_x_writing_share', {
    p_user_id: user.id, p_writing_log_id: body.writingLogId,
  })
  if (reserveError) return NextResponse.json({ error: reserveError.message }, { status: 409 })
  if (!reservation) return NextResponse.json({ error: 'この執筆記録はX共有処理済み、または処理中です' }, { status: 409 })

  let attemptedPost = false
  try {
    let token = decrypt(connection.access_token_enc)
    if (new Date(connection.expires_at).getTime() < Date.now() + 60_000) {
      if (!connection.refresh_token_enc) throw new Error('X連携の有効期限が切れました。再連携してください')
      const refreshed = await xTokenRequest(new URLSearchParams({
        grant_type: 'refresh_token', refresh_token: decrypt(connection.refresh_token_enc),
      }))
      token = refreshed.access_token
      const { error } = await admin.from('x_connections').update({
        access_token_enc: encrypt(token),
        refresh_token_enc: encrypt(refreshed.refresh_token || decrypt(connection.refresh_token_enc)),
        expires_at: new Date(Date.now() + (refreshed.expires_in ?? 7200) * 1000).toISOString(),
      }).eq('user_id', user.id)
      if (error) throw error
    }
    attemptedPost = true
    const posted = await fetch('https://api.x.com/2/tweets', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body.text.trim() }), cache: 'no-store',
    })
    if (!posted.ok) {
      const details = await posted.text()
      console.error('X post rejected', posted.status, details.slice(0, 500))
      // 失敗が確定しているHTTPレスポンスの場合のみ予約を解除
      await admin.rpc('cancel_x_writing_share', { p_user_id: user.id, p_writing_log_id: body.writingLogId })
      return NextResponse.json({ error: `Xへの投稿に失敗しました（HTTP ${posted.status}）。権限やAPI残高をご確認ください。` }, { status: 502 })
    }
    const result = await posted.json()
    if (!result?.data?.id) throw new Error('投稿結果を確認できません。二重投稿防止のため再試行しないでください')
    const { error: finishError } = await admin.rpc('finish_x_writing_share', {
      p_user_id: user.id, p_writing_log_id: body.writingLogId, p_tweet_id: result.data.id,
    })
    if (finishError) {
      console.error('X reward finalization failed', { userId: user.id, logId: body.writingLogId, tweetId: result.data.id, error: finishError })
      return NextResponse.json({ error: 'Xへの投稿は成功しましたが、ポイント確定に失敗しました。再投稿せず管理者に連絡してください。' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, tweetId: result.data.id, points: 10 })
  } catch (error) {
    if (!attemptedPost) await admin.rpc('cancel_x_writing_share', { p_user_id: user.id, p_writing_log_id: body.writingLogId })
    console.error('X share failed', error)
    return NextResponse.json({ error: attemptedPost ? 'Xへの投稿結果が不明です。二重投稿防止のため再試行せず、管理者にお問い合わせください。' : 'X連携に失敗しました。再連携してください。' }, { status: 500 })
  }
}
