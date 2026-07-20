// lib/group.ts
import { supabase } from "@/lib/supabaseClient"

export async function createGroup(userId: string, groupName: string) {
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: groupName, owner_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addMember(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listGroups(userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("groups(*)")
    .eq("user_id", userId)
  if (error) throw error
  return data.map((item: any) => item.groups)
}

export async function addMembers(
  groupId: string,
  userIds: string[]
) {

  const inserts = userIds.map(userId => ({
    group_id: groupId,
    user_id: userId
  }))


  const { error } = await supabase
    .from("group_members")
    .insert(inserts)


  if (error) {
    throw error
  }
}