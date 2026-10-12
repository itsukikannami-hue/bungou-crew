import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { adminDb, sendPush } from '@/lib/pushServer'

export const runtime = 'nodejs'
const kinds = ['cheer', 'comment', 'repost'] as const
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    const payload = await request.json()
    const type = payload?.type
    const postId = payload?.postId
    if (!kinds.includes(type) || typeof postId !== 'string' || !/^[a-f\d-]{36}$/i.test(postId)) return NextResponse.json({ error: '不正な入力です' }, { status: 400 })
    const db = adminDb()
    const { data: post } = await db.from('posts').select('id,user_id,deleted').eq('id', postId).maybeSingle()
    if (!post || post.deleted || post.user_id === user.id) return NextResponse.json({ error: '対象の投稿がありません' }, { status: 400 })
    let eventId: string | undefined
    if (type === 'cheer') {
      const { data } = await db.from('post_cheers').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      eventId = data?.id
    } else if (type === 'comment') {
      // An exact comment id is required to avoid awarding notifications for unrelated comments.
      if (typeof payload.eventId !== 'string') return NextResponse.json({ error: 'コメントIDが必要です' }, { status: 400 })
      const { data } = await db.from('post_comments').select('id').eq('id', payload.eventId).eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      eventId = data?.id
    } else {
      if (typeof payload.eventId !== 'string') return NextResponse.json({ error: '拡散IDが必要です' }, { status: 400 })
      const { data } = await db.from('posts').select('id').eq('id', payload.eventId).eq('repost_id', postId).eq('user_id', user.id).eq('deleted', false).maybeSingle()
      eventId = data?.id
    }
    if (!eventId) return NextResponse.json({ error: '操作が確認できません' }, { status: 403 })
    const { data: result, error: rpcError } = await db.rpc('create_verified_notification', { p_user_id: post.user_id, p_actor_id: user.id, p_post_id: postId, p_type: type, p_event_id: eventId })
    if (rpcError) throw rpcError
    if (result?.created && result?.push === true) {
      await sendPush(post.user_id, { id: result.id, title: 'ブンゴウクルー', body: result.content, url: `/posts/${postId}` })
    }
    return NextResponse.json({ success: true, created: Boolean(result?.created) })
  } catch (error) {
    console.error('[Notification API]', error)
    return NextResponse.json({ error: '通知の作成に失敗しました' }, { status: 500 })
  }
}
