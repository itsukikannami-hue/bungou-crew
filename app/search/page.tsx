"use client"

import UserAvatar from "@/components/UserAvatar"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Search, TrendingUp, Users, FileText, Hash, ArrowUpRight } from "lucide-react"

type UserProfile = { id?: string; user_id: string; username: string | null; avatar_url: string | null }
type Post = { id: string; user_id: string; repost_id?: string | null; content: string; created_at: string; profiles?: { username: string | null; avatar_url: string | null } | null }
type Tag = { id: string; name: string }
type SearchTab = "users" | "posts" | "tags"

export default function SearchPage() {
  const [keyword, setKeyword] = useState("")
  const [searchedKeyword, setSearchedKeyword] = useState("")
  const [activeTab, setActiveTab] = useState<SearchTab>("users")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [trendTags, setTrendTags] = useState<[string, number][]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState("")

  useEffect(() => {
    const fetchTrendTags = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from("post_hashtags")
        .select(`hashtags(id,name),posts!inner(created_at)`)
        .gte("posts.created_at", yesterday)
      if (error) {
        console.error("トレンドハッシュタグ取得エラー:", error)
        return
      }
      const count: Record<string, number> = {}
      data?.forEach((item: any) => {
        const name = Array.isArray(item.hashtags)
          ? item.hashtags[0]?.name
          : (item.hashtags as { name: string } | null)?.name
        if (name) count[name] = (count[name] || 0) + 1
      })
      setTrendTags(Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10))
    }
    void fetchTrendTags()
  }, [])

  const search = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const query = keyword.trim()
    if (!query) return
    setLoading(true)
    setSearchError("")
    try {
      // 非表示設定の取得に失敗した場合は検索結果を表示しない。
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const hiddenIds = new Set<string>()
      if (auth.user) {
        const { data: hidden, error: hiddenError } = await supabase.rpc("get_timeline_hidden_user_ids")
        if (hiddenError) throw hiddenError
        for (const hiddenId of (hidden ?? []) as string[]) hiddenIds.add(hiddenId)
      }

      // 元の検索条件・テーブルを維持し、3種類をまとめて取得します。
      const [userResult, postResult, tagResult] = await Promise.all([
        supabase.from("profiles").select("*").ilike("username", `%${query}%`),
        supabase.from("posts")
          .select(`*,profiles(username,avatar_url)`)
          .ilike("content", `%${query}%`)
          .eq("deleted", false),
        supabase.from("hashtags").select("*").ilike("name", `%${query}%`),
      ])
      if (userResult.error) throw userResult.error
      if (postResult.error) throw postResult.error
      if (tagResult.error) throw tagResult.error

      const candidatePosts = (postResult.data ?? []) as Post[]
      const repostIds = [...new Set(candidatePosts.map(p => p.repost_id).filter((id): id is string => Boolean(id)))]
      const repostAuthorById = new Map<string, string>()
      if (repostIds.length) {
        const { data: originals, error: originalsError } = await supabase
          .from("posts").select("id,user_id").in("id", repostIds)
        if (originalsError) throw originalsError
        for (const original of originals ?? []) repostAuthorById.set(original.id, original.user_id)
      }

      setUsers(((userResult.data ?? []) as UserProfile[]).filter(person =>
        Boolean(person.user_id) && !hiddenIds.has(person.user_id)
      ).filter((person, index, list) => list.findIndex(p => p.user_id === person.user_id) === index))
      setPosts(candidatePosts.filter(post =>
        !hiddenIds.has(post.user_id) &&
        (!post.repost_id || (repostAuthorById.has(post.repost_id) && !hiddenIds.has(repostAuthorById.get(post.repost_id)!)))
      ))
      setTags((tagResult.data ?? []) as Tag[])
      setSearchedKeyword(query)
      setActiveTab("users")
    } catch (error) {
      console.error("検索結果取得エラー:", error)
      setUsers([])
      setPosts([])
      setTags([])
      setSearchError("検索結果を取得できませんでした。時間をおいて再度お試しください。")
      setSearchedKeyword(query)
    } finally {
      setLoading(false)
    }
  }

  const tabClass = (tab: SearchTab) =>
    `relative flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? "text-[#b9743f]" : "text-[#9b8a7c] hover:text-[#75563d]"}`

  return (
    <main className="min-h-screen bg-[#fff9f0] px-4 pb-10 pt-7 text-[#604b3b] sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-wide">さがす</h1>
          <p className="text-sm text-[#a18a75]">作家仲間や、気になる物語を見つけよう。</p>
        </header>

        <form onSubmit={search} className="rounded-2xl border border-[#f0e0d0] bg-white p-3 shadow-[0_5px_20px_rgba(138,100,68,0.05)]">
          <div className="flex items-center gap-2">
            <Search size={21} className="ml-1 shrink-0 text-[#c88c5d]" aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="ユーザー・投稿・ハッシュタグを検索"
              aria-label="検索キーワード"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-[#604b3b] outline-none placeholder:text-[#b9a899]"
            />
            <button type="submit" disabled={loading || !keyword.trim()} className="shrink-0 rounded-xl bg-[#d38f5a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c47d47] disabled:opacity-50">
              {loading ? "検索中" : "検索"}
            </button>
          </div>
        </form>

        {searchError && <p role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{searchError}</p>}
        {!searchedKeyword ? (
          <section className="overflow-hidden rounded-2xl border border-[#f0e0d0] bg-white shadow-[0_5px_20px_rgba(138,100,68,0.05)]">
            <div className="flex items-center gap-2 border-b border-[#f4e9dc] px-5 py-4">
              <TrendingUp size={19} className="text-[#ce8953]" aria-hidden="true" />
              <h2 className="font-bold">トレンドハッシュタグ</h2>
              <span className="ml-auto text-xs text-[#ac9784]">過去24時間</span>
            </div>
            {trendTags.length ? (
              <div className="divide-y divide-dashed divide-[#f0e5d8]">
                {trendTags.map(([name, count], index) => (
                  <Link key={name} href={`/timeline?tag=${encodeURIComponent(name)}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fffaf5]">
                    <span className="w-6 text-center text-sm font-semibold text-[#d1a47e]">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-[#b9743f]">#{name}</span>
                    <span className="text-xs text-[#a28c79]">{count}件</span>
                    <ArrowUpRight size={16} className="text-[#c9ae98]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-9 text-center text-sm text-[#a18a75]">直近24時間のトレンドはまだありません。</p>
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#f0e0d0] bg-white shadow-[0_5px_20px_rgba(138,100,68,0.05)]">
            <div className="px-5 pt-5 pb-3 text-sm text-[#8d7867]">「<span className="font-bold text-[#b9743f]">{searchedKeyword}</span>」の検索結果</div>
            <div className="flex border-b border-[#f0e0d0]" role="tablist" aria-label="検索結果の種類">
              {([
                ["users", "ユーザー", users.length, Users],
                ["posts", "投稿", posts.length, FileText],
                ["tags", "タグ", tags.length, Hash],
              ] as const).map(([tab, label, count, Icon]) => (
                <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>
                  <span className="inline-flex items-center justify-center gap-1.5"><Icon size={15} />{label}<span className="text-xs opacity-70">{count}</span></span>
                  {activeTab === tab && <span className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full bg-[#d38f5a]" />}
                </button>
              ))}
            </div>
            {activeTab === "users" && (
              users.length ? <div className="divide-y divide-dashed divide-[#f0e5d8]">{users.map((person) => (
                <Link key={`profile-${person.user_id}`} href={`/user/${person.user_id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fffaf5]">
                  <UserAvatar src={person.avatar_url || "/default-avatar.svg"} alt="" className="h-11 w-11 shrink-0 rounded-full border border-[#f0e0d0] object-cover" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{person.username || "名無し作家"}</span>
                  <ArrowUpRight size={17} className="text-[#c9ae98]" aria-hidden="true" />
                </Link>
              ))}</div> : <p className="px-5 py-10 text-center text-sm text-[#a18a75]">一致するユーザーはいません。</p>
            )}
            {activeTab === "posts" && (
              posts.length ? <div className="divide-y divide-dashed divide-[#f0e5d8]">{posts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="block px-5 py-4 transition hover:bg-[#fffaf5]">
                  <div className="mb-2 flex items-center gap-2">
                    <UserAvatar src={post.profiles?.avatar_url || "/default-avatar.svg"} alt="" className="h-8 w-8 rounded-full border border-[#f0e0d0] object-cover" />
                    <span className="text-sm font-bold">{post.profiles?.username || "名無し作家"}</span>
                    <time className="ml-auto text-xs text-[#a18a75]">{new Date(post.created_at).toLocaleDateString("ja-JP")}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>
                </Link>
              ))}</div> : <p className="px-5 py-10 text-center text-sm text-[#a18a75]">一致する投稿はありません。</p>
            )}
            {activeTab === "tags" && (
              tags.length ? <div className="divide-y divide-dashed divide-[#f0e5d8]">{tags.map((tag) => (
                <Link key={tag.id} href={`/timeline?tag=${encodeURIComponent(tag.name)}`} className="flex items-center gap-3 px-5 py-4 text-[#b9743f] transition hover:bg-[#fffaf5]">
                  <span className="flex-1 font-semibold">#{tag.name}</span>
                  <ArrowUpRight size={17} className="text-[#c9ae98]" aria-hidden="true" />
                </Link>
              ))}</div> : <p className="px-5 py-10 text-center text-sm text-[#a18a75]">一致するハッシュタグはありません。</p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
