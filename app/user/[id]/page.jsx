"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { createNotification } from "@/lib/notification"

export default function UserPage() {
  const params = useParams()
  const userId = params.id

  const [profile, setProfile] = useState(null)
  const [totalWords, setTotalWords] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [following, setFollowing] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [me, setMe] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    // ログインユーザー取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setMe(user)

    // プロフィール取得
// プロフィール取得
const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
  
    console.log(userId)
    console.log(profileData)
    console.log(profileError)
  
  setProfile(profileData?.[0] || null)

    // 累計文字数
    const { data: logs } = await supabase
      .from("writing_logs")
      .select("words")
      .eq("user_id", userId)

    const total =
      logs?.reduce(
        (sum, log) => sum + log.words,
        0
      ) || 0

    setTotalWords(total)

    // バッジ数
    const { count: badgeCountData } =
      await supabase
        .from("user_badges")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId)

    setBadgeCount(badgeCountData || 0)

    // フォロー数
    const { count: followingCount } =
      await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("follower_id", userId)

    setFollowing(followingCount || 0)

    // フォロワー数
    const { count: followerCount } =
      await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("following_id", userId)

    setFollowers(followerCount || 0)

    // 投稿数
    const { count: postCountData } =
      await supabase
        .from("posts")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId)

    setPostCount(postCountData || 0)

    // 投稿一覧
    const { data: postsData } =
      await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })

    setPosts(postsData || [])

    // フォロー済み確認
    if (user) {
      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle()

      setIsFollowing(!!data)
    }
  }

  const handleFollow = async () => {
    if (!me) return

    const { error } = await supabase
      .from("follows")
      .insert({
        follower_id: me.id,
        following_id: userId,
      })

    if (error) {
      console.log(error)
      return
    }

    // 自分のプロフィールを取得
const { data: myProfile } = await supabase
.from("profiles")
.select("username")
.eq("user_id", me.id)
.single()

// 通知を作成
await createNotification(
userId,
"follow",
`${myProfile?.username ?? "誰か"}さんがあなたをフォローしました`,
me.id,
undefined,
`/user/${me.id}`
)

    setIsFollowing(true)
    setFollowers((prev) => prev + 1)
  }

  const handleUnfollow = async () => {
    if (!me) return

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", userId)

    if (error) {
      console.log(error)
      return
    }

    setIsFollowing(false)
    setFollowers((prev) => prev - 1)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <img
        src={profile?.avatar_url || "/default.png"}
        className="w-20 h-20 rounded-full object-cover"
      />

      <div className="font-bold text-xl mt-2">
        {profile?.username}
      </div>

      <div className="text-gray-500 mb-6">
        {profile?.bio}
      </div>

      <div className="space-y-2 mb-6">
        <div>
          ✍️ {totalWords.toLocaleString()}文字
        </div>

        <div>
          🏆 {badgeCount}個
        </div>

        <div>
          フォロー {following}
        </div>

        <div>
          フォロワー {followers}
        </div>

        <div>
          投稿 {postCount}
        </div>
      </div>

      {me?.id !== userId && (
        <button
          onClick={() => {
            if (isFollowing) {
              handleUnfollow()
            } else {
              handleFollow()
            }
          }}
          className={`
            px-4 py-2 rounded mb-6 text-white
            ${
              isFollowing
                ? "bg-gray-500"
                : "bg-blue-500"
            }
          `}
        >
          {isFollowing
            ? "フォロー解除"
            : "フォローする"}
        </button>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white p-4 rounded-xl shadow"
          >
            <div>{post.content}</div>

            <div className="text-xs text-gray-400 mt-2">
              {new Date(
                post.created_at
              ).toLocaleString()
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}