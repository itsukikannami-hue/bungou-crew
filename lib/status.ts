import { supabase } from "@/lib/supabaseClient"

export async function updateStatus(userId: string, status: string) {
  const { error } = await supabase
    .from("user_status")
    .upsert({
      user_id: userId,
      status: status,
      updated_at: new Date()
    })

  if (error) console.error(error)
}

export async function getStatuses(userIds: string[]) {

    const { data } = await supabase
      .from("user_status")
      .select("*")
      .in("user_id", userIds)
  
    return data || []
  }

  export async function getWritingUsers() {

    const { data, error } = await supabase
      .from("user_status")
      .select("*")
      .eq("status", "writing")
  
    if (error) {
      console.error(error)
      return []
    }
  
    return data || []
  }