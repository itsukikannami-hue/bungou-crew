import { supabase } from "./supabaseClient"

export const getFriends = async (userId: string) => {
  const { data, error } = await supabase
    .from("friends")
    .select(`
      id,
      requester_id,
      addressee_id,
      status,
      requester:profiles!requester_id(username),
      addressee:profiles!addressee_id(username)
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (error) {
    console.error(error)
    return []
  }

  // ログインユーザー以外をフレンドとして返す
  return data.map(f => ({
    id: f.id,
    username: f.requester_id === userId ? f.addressee.username : f.requester.username,
    userId: f.requester_id === userId ? f.addressee_id : f.requester_id
  }))
}

export async function sendFriendRequest(userId, targetUserId){

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

  export async function getFriendRequests(userId){

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

  export async function acceptFriendRequest(requestId){

    const { data, error } = await supabase
    .from("friends")
    .update({ status:"accepted" })
    .eq("id",requestId)
  
    if(error){
      console.error(error)
    }
  
    return data
  }

  export async function getFriends(userId){

    const { data, error } = await supabase
    .from("friends")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status","accepted")
  
    if(error){
      console.error(error)
    }
  
    return data
  }