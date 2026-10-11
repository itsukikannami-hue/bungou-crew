"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"
import { hydrateReposts } from "@/lib/hydrateReposts"
import FloatingPostComposer from "@/components/FloatingPostComposer"
import type { User } from "@supabase/supabase-js"
import AdTimelineCard from "@/components/AdTimelineCard"

type Post = {
  id: string
  user_id: string
  content: string
  created_at: string

  profiles?: {
    username: string | null
    avatar_url: string | null
  } | null

  post_cheers?: {
    id: string
  }[]

  repost_id?: string | null
  repost?: Post | null
}

type UserPlan = {
  user_id: string
  plan: "free" | "premium" | "ultimate"
}

export default function TimelinePage() {
  const [mode, setMode] = useState("recommend")
  const [posts, setPosts] = useState<Post[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState("")
  const requestIdRef = useRef(0)

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    setTag(params.get("tag"))
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user)
    }

    fetchUser()
  }, [])

  const getPlanBonus = (
    plan: "free" | "premium" | "ultimate"
  ) => {
    switch (plan) {
      case "ultimate":
        return 20

      case "premium":
        return 10

      default:
        return 0
    }
  }

  const sortRecommendedPosts = async (
    sourcePosts: Post[]
  ) => {
    if (sourcePosts.length === 0) {
      return sourcePosts
    }

    const userIds = Array.from(
      new Set(
        sourcePosts.map(
          (post) => post.user_id
        )
      )
    )

    const {
      data: plansData,
      error: plansError,
    } = await supabase.rpc(
      "get_timeline_user_plans",
      {
        p_user_ids: userIds,
      }
    )

    if (plansError) {
      console.error(
        "タイムラインプラン取得エラー:",
        plansError
      )

      return sourcePosts
    }

    const plans =
      (plansData ?? []) as UserPlan[]

    const planMap = new Map<
      string,
      "free" | "premium" | "ultimate"
    >()

    plans.forEach((item) => {
      planMap.set(
        item.user_id,
        item.plan
      )
    })

    const sortedPosts = [...sourcePosts].sort(
      (a, b) => {
        const aPlan =
          planMap.get(a.user_id) ?? "free"

        const bPlan =
          planMap.get(b.user_id) ?? "free"

        const aTime =
          new Date(a.created_at).getTime()

        const bTime =
          new Date(b.created_at).getTime()

        const aScore =
          aTime / (1000 * 60 * 60) +
          getPlanBonus(aPlan)

        const bScore =
          bTime / (1000 * 60 * 60) +
          getPlanBonus(bPlan)

        return bScore - aScore
      }
    )

    return sortedPosts
  }

  const fetchPosts = async () => {
    const requestId = ++requestIdRef.current
    const isCurrent = () => requestId === requestIdRef.current
    setTimelineError("")

    // ブロックは双方、ミュートは自分からの設定を対象にする。
    // 相手が自分をブロックした情報はRLSで直接取得できないため、専用RPCを使用。
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (!isCurrent()) return
    if (authError) {
      setPosts([])
      setTimelineError("ログイン情報を確認できませんでした。再読み込みしてください。")
      return
    }

    let hiddenIds = new Set<string>()
    if (authData.user) {
      const { data: hiddenData, error: hiddenError } = await supabase.rpc(
        "get_timeline_hidden_user_ids"
      )
      if (!isCurrent()) return
      if (hiddenError || !Array.isArray(hiddenData)) {
        console.error("非表示ユーザーの取得エラー:", hiddenError)
        setPosts([])
        setTimelineError("ブロック・ミュート設定を読み込めませんでした。再読み込みしてください。")
        return
      }
      hiddenIds = new Set(hiddenData as string[])
    }

    const publish = async (rawPosts: Post[], recommended = false) => {
      // 元の投稿者も検査する。hydrateReposts 後にも確認することで、
      // 拡散・コメ付き拡散経由の表示を防ぐ。
      const candidates = rawPosts.filter(p => !hiddenIds.has(p.user_id))
      const repostIds = [...new Set(candidates.map(p => p.repost_id).filter((id): id is string => !!id))]
      let blockedOriginalIds = new Set<string>()
      if (repostIds.length) {
        const { data: originals, error: originalsError } = await supabase
          .from("posts").select("id,user_id").in("id", repostIds)
        if (!isCurrent()) return
        if (originalsError) {
          console.error("拡散元の取得エラー:", originalsError)
          setPosts([])
          setTimelineError("拡散元を確認できませんでした。再読み込みしてください。")
          return
        }
        blockedOriginalIds = new Set((originals ?? [])
          .filter(original => hiddenIds.has(original.user_id))
          .map(original => original.id))
      }
      const safeCandidates = candidates.filter(p => !p.repost_id || !blockedOriginalIds.has(p.repost_id))
      const hydrated = await hydrateReposts(safeCandidates)
      if (!isCurrent()) return
      const visible = hydrated.filter(p =>
        !hiddenIds.has(p.user_id) &&
        !(p.repost && hiddenIds.has(p.repost.user_id))
      )
      const result = recommended ? await sortRecommendedPosts(visible) : visible
      if (isCurrent()) setPosts(result)
    }

    /*
     * ハッシュタグ検索
     * → 通常の新着順
     */
    if (tag) {
      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(
            username,
            avatar_url
          ),
          post_hashtags!inner(
            hashtags!inner(
              name
            )
          ),
          post_cheers(
            id
          )
        `)
        .eq(
          "post_hashtags.hashtags.name",
          tag
        )
        .eq(
          "deleted",
          false
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(error)
        if (isCurrent()) { setPosts([]); setTimelineError("投稿を取得できませんでした。") }
        return
      }

      await publish((data ?? []) as Post[])

      return
    }

    /*
     * おすすめタイムライン
     */
    if (mode === "recommend") {
      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(
            username,
            avatar_url
          ),
          post_cheers(
            id
          ),
          repost:repost_id(
            *,
            profiles(
              username,
              avatar_url
            ),
            post_cheers(
              id
            )
          )
        `)
        .eq(
          "deleted",
          false
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          "タイムライン取得エラー:",
          error
        )

        if (isCurrent()) { setPosts([]); setTimelineError("投稿を取得できませんでした。") }
        return
      }

      console.log(
        "タイムライン取得結果:",
        data
      )

      console.log(
        "タイムライン取得件数:",
        data?.length
      )

      await publish((data ?? []) as Post[], true)

      return
    }

    /*
     * フォロー中タイムライン
     * → 従来どおり新着順
     */
    if (mode === "following") {
      const currentUser = authData.user

      if (!currentUser) {
        if (isCurrent()) setPosts([])
        return
      }

      const {
        data: follows,
        error: followsError,
      } = await supabase
        .from("follows")
        .select(
          "following_id"
        )
        .eq(
          "follower_id",
          currentUser.id
        )

      if (followsError) {
        console.error(
          "フォロー取得エラー:",
          followsError
        )
        if (isCurrent()) { setPosts([]); setTimelineError("フォロー情報を取得できませんでした。") }
        return
      }

      const ids = [
        ...(follows?.map(
          (f) => f.following_id
        ) ?? []),
        currentUser.id,
      ]

      const uniqueIds =
        Array.from(
          new Set(ids)
        )

      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(
            username,
            avatar_url
          ),
          post_cheers(
            id
          )
        `)
        .in(
          "user_id",
          uniqueIds
        )
        .eq(
          "deleted",
          false
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          "フォロー中タイムライン取得エラー:",
          error
        )
        if (isCurrent()) { setPosts([]); setTimelineError("投稿を取得できませんでした。") }
        return
      }

      await publish((data ?? []) as Post[])
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [mode, tag])

  const deletePost = async (
    id: string
  ) => {
    if (!user) {
      return
    }

    const {
      error,
    } = await supabase
      .rpc("soft_delete_post", { target_post_id: id })

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    await fetchPosts()
  }

  return (
    <main className="min-h-screen bg-[#fff9f0] px-4 pb-8 pt-6 text-[#775b45] sm:px-6">
      <FloatingPostComposer onPosted={fetchPosts} />
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-5 px-1">
          <h1 className="text-2xl font-bold tracking-wide">タイムライン</h1>
          <p className="mt-1 text-sm text-[#927b69]">
            みんなの創作活動をのぞいてみよう
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#f2deca] bg-white shadow-[0_4px_18px_rgba(139,101,72,0.06)]">
          {tag ? (
            <div className="border-b border-[#f2deca] px-5 py-4">
              <p className="text-sm text-[#927b69]">ハッシュタグの投稿</p>
              <h2 className="mt-1 text-lg font-bold text-[#c77f43]">#{tag}</h2>
            </div>
          ) : (
            <div className="grid grid-cols-2 border-b border-[#f2deca]" role="tablist" aria-label="タイムラインの表示切り替え">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "recommend"}
                onClick={() => setMode("recommend")}
                className={`relative py-4 text-sm transition-colors sm:text-base ${
                  mode === "recommend"
                    ? "font-bold text-[#c77f43] after:absolute after:bottom-0 after:left-1/4 after:h-[3px] after:w-1/2 after:rounded-full after:bg-[#eaa56c]"
                    : "text-[#927b69] hover:bg-[#fff9f0]"
                }`}
              >
                おすすめ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "following"}
                onClick={() => setMode("following")}
                className={`relative py-4 text-sm transition-colors sm:text-base ${
                  mode === "following"
                    ? "font-bold text-[#c77f43] after:absolute after:bottom-0 after:left-1/4 after:h-[3px] after:w-1/2 after:rounded-full after:bg-[#eaa56c]"
                    : "text-[#927b69] hover:bg-[#fff9f0]"
                }`}
              >
                フォロー中
              </button>
            </div>
          )}

          <div role="tabpanel">
            {timelineError && (
              <p role="alert" className="px-5 py-4 text-sm text-red-600">{timelineError}</p>
            )}
            {!timelineError && (posts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-semibold">まだ投稿がありません</p>
                <p className="mt-2 text-sm text-[#927b69]">
                  投稿が届いたら、ここに表示されます。
                </p>
              </div>
            ) : (
              posts.map((post, index) => (
                <div key={post.id}>
                  <div className="border-b border-dashed border-[#ead9c8] px-3 py-4 sm:px-5">
                    <PostCard post={post} user={user} deletePost={deletePost} />
                  </div>
                  {(index + 1) % 6 === 0 && (
                    <div className="border-b border-dashed border-[#ead9c8] bg-[#fffdf9] px-3 py-4 sm:px-5">
                      <AdTimelineCard />
                    </div>
                  )}
                </div>
              ))
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
