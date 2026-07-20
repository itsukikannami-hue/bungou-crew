import { supabase } from "./supabaseClient"

export const getFriends = async (userId: string) => {
  const { data, error } = await supabase
    .from("friends")
    .select(`
      id,
      requester_id,
      addressee_id,
      status,
      requester:profiles!requester_id(
        username,
        avatar_url
      ),
      addressee:profiles!addressee_id(
        username,
        avatar_url
      )
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (error) {
    console.error(error)
    return []
  }

  // ログインユーザー以外をフレンドとして返す
  return data.map((f: any) => ({
    id: f.id,
    user_id:
      f.requester_id === userId
        ? f.addressee_id
        : f.requester_id,
  
    username:
      f.requester_id === userId
        ? f.addressee?.username ?? null
        : f.requester?.username ?? null,
  
    avatar_url:
      f.requester_id === userId
        ? f.addressee?.avatar_url ?? null
        : f.requester?.avatar_url ?? null,
  }))
}

export async function sendFriendRequest(
  userId: string,
  targetUserId: string
){

    const { data, error } = await supabase
    .from("friends")
    .insert({
      requester_id: userId,
      addressee_id: targetUserId
    })
  
    if(error){
      console.error(error)
    }
  
    return data
  }

  export async function getFriendRequests(userId: string){

    const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status","pending")
  
    if(error){
      console.error(error)
    }
  
    return data
  }

  export async function acceptFriendRequest(requestId: string){

    const { data, error } = await supabase
    .from("friends")
    .update({ status:"accepted" })
    .eq("id",requestId)
  
    if(error){
      console.error(error)
    }
  
    return data
  }

