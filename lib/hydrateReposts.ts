import { supabase } from "@/lib/supabaseClient"

// Keep the repost itself even when its source is soft-deleted or not readable.
export async function hydrateReposts<T extends {
  repost_id?: string | null
  repost?: unknown
}>(posts: T[]): Promise<T[]> {
  const ids = [...new Set(posts.map(p => p.repost_id).filter((id): id is string => !!id))]
  if (!ids.length) return posts
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(username,avatar_url), post_cheers(id)")
    .in("id", ids)
  if (error) console.error("拡散元の取得エラー:", error)
  const originals = new Map((data ?? []).map(p => [p.id, p]))
  return posts.map(post => {
    if (!post.repost_id) return post
    const original = originals.get(post.repost_id)
    // Do not discard the repost if the source is hidden by RLS or unavailable.
    return {
      ...post,
      repost: original ?? { id: post.repost_id, deleted: true, content: null },
    }
  })
}
