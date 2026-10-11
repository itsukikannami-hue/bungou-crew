import { supabase } from "@/lib/supabaseClient"
import { createNotification } from "@/lib/notification"

// DM送信
export async function sendDM(
  senderId: string,
  receiverId: string,
  content: string
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content
    })
    .select()

  if (error) {
    console.error(error)
    return { error }
  }

  await createNotification(
    receiverId,
    "dm",
    "新しいDMが届きました"
  )

  return { data, error: null }
}

// DM取得
export async function getDM(
  userId: string,
  friendId: string
) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .order("created_at")

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}