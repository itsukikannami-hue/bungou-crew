import { supabase } from "@/lib/supabaseClient"

export async function createNotification(
  userId: string,
  type: string,
  content: string,
  actorId?: string,
  postId?: string,
  link?: string
) {
  const notification: any = {
    user_id: userId,
    type,
    content,
    is_read: false,
  }

  // 将来カラムを追加したときだけ保存する
  if (actorId) notification.actor_id = actorId
  if (postId) notification.post_id = postId
  if (link) notification.link = link

  const { error } = await supabase
    .from("notifications")
    .insert(notification)

  if (error) {
    console.error("Notification Error:", error)
  }
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data ?? []
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", id)

  if (error) {
    console.error(error)
  }
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    console.error(error)
  }
}

export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error(error)
  }
}

