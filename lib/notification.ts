import { supabase } from '@/lib/supabaseClient'

export async function createNotification(userId: string, type: string, content: string, actorId?: string, postId?: string, link?: string, eventId?: string) {
  // Server verifies actor, event and recipient; untrusted display content is ignored.
  if (!postId) return { success: false as const, error: new Error('投稿IDがありません') }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false as const, error: new Error('ログインが必要です') }
  try {
    const response = await fetch('/api/notifications/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, postId, eventId }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '通知の作成に失敗しました')
    return { success: true as const, error: null }
  } catch (error) { console.error('Notification Error:', error); return { success: false as const, error } }
}
export async function getNotifications(userId: string) {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function markAsRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) console.error(error)
}
export async function markAllAsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
  if (error) console.error(error)
}
export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) console.error(error)
}
