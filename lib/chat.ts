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

// ✅ グループメッセージ送信（完全版）
export async function sendGroupMessage(
  senderId: string,
  groupId: string,
  content: string
) {

  // メッセージ送信
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      group_id: groupId,
      content
    })
    .select()

  if (error) {
    console.error(error)
    return { data: null, error }
  }

  // 通知（失敗してもOK）
  try {
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)

    if (members) {
      for (const m of members) {
        if (m.user_id === senderId) continue

        await createNotification(
          m.user_id,
          "group",
          "グループに新しいメッセージ"
        )
      }
    }
  } catch (e) {
    console.error("通知失敗:", e)
  }

  return { data, error: null }
}

// グループメッセージ取得
export async function getGroupMessages(
  groupId: string
) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}