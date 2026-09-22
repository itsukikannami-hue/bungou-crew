"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"
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
        return
      }

      setPosts(
        (data ?? []) as Post[]
      )

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

      const sortedPosts =
        await sortRecommendedPosts(
          (data ?? []) as Post[]
        )

      setPosts(sortedPosts)

      return
    }

    /*
     * フォロー中タイムライン
     * → 従来どおり新着順
     */
    if (mode === "following") {
      const {
        data: auth,
      } = await supabase.auth.getUser()

      const currentUser =
        auth.user

      if (!currentUser) {
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

        return
      }

      setPosts(
        (data ?? []) as Post[]
      )
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
      .from("posts")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      )

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    await fetchPosts()
  }

  return (
    <div className="p-5">
      <div className="mb-5 flex border-b">
        <button
          onClick={() =>
            setMode("recommend")
          }
          className={`flex-1 p-3 ${
            mode === "recommend"
              ? "border-b-2 font-bold"
              : ""
          }`}
        >
          おすすめ
        </button>

        <button
          onClick={() =>
            setMode("following")
          }
          className={`flex-1 p-3 ${
            mode === "following"
              ? "border-b-2 font-bold"
              : ""
          }`}
        >
          フォロー中
        </button>
      </div>

      <div className="space-y-3">
        {posts.map(
          (post, index) => (
            <div key={post.id}>
              <PostCard
                post={post}
                user={user}
                deletePost={
                  deletePost
                }
              />

              {(index + 1) % 6 ===
                0 && (
                <div className="mt-3">
                  <AdTimelineCard />
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}