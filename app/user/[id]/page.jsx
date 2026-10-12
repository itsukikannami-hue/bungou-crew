"use client"

import { useParams } from "next/navigation"
import { useToast } from "@/components/ToastProvider"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { createNotification } from "@/lib/notification"
import PlanBadge from "@/components/PlanBadge"
import PostCard from "@/components/PostCard"
import { hydrateReposts } from "@/lib/hydrateReposts"
import { BookOpen, Award, Users, UserRoundPlus, FileText, PenLine, UserCheck, Ban, VolumeX } from "lucide-react"

export default function UserPage() {
  const toast = useToast()
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
  const [loading, setLoading] = useState(true)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState("")
  const [isBlocked, setIsBlocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [relationBusy, setRelationBusy] = useState(false)
  const [relationError, setRelationError] = useState("")
  const [relationMessage, setRelationMessage] = useState("")

  useEffect(() => {
    if (!userId) return
    void fetchUser()
  }, [userId])

  const fetchUser = async () => {
    setLoading(true)
    // ログインユーザー取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setMe(user)
    setRelationError("")
    setRelationMessage("")
    setIsBlocked(false)
    setIsMuted(false)
    if (user && user.id !== userId) {
      const [blocksResult, mutesResult] = await Promise.all([
        supabase.from("user_blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle(),
        supabase.from("user_mutes").select("id").eq("muter_id", user.id).eq("muted_id", userId).maybeSingle(),
      ])
      if (blocksResult.error || mutesResult.error) {
        console.error("ブロック・ミュート状態取得エラー", blocksResult.error, mutesResult.error)
        setRelationError("ブロック・ミュートの状態を確認できませんでした。")
      }
      setIsBlocked(!!blocksResult.data)
      setIsMuted(!!mutesResult.data)
    }

    // プロフィール取得
// プロフィール取得
const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
  
    if (profileError) console.error("プロフィール取得エラー:", profileError)
  
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

    // PostCardと同じ表示に必要なプロフィール・応援・拡散元データを取得する。
    const rawPosts = postsData || []
    const repostIds = [...new Set(rawPosts.map(p => p.repost_id).filter(Boolean))]
    const { data: originals, error: originalsError } = repostIds.length
      ? await supabase.from("posts").select("*").in("id", repostIds)
      : { data: [], error: null }
    if (originalsError) console.error("拡散元の取得エラー:", originalsError)
    const allPosts = [...rawPosts, ...(originals || [])]
    const authorIds = [...new Set(allPosts.map(p => p.user_id).filter(Boolean))]
    const allPostIds = [...new Set(allPosts.map(p => p.id))]
    const [{ data: authors, error: authorsError }, { data: cheers, error: cheersError }] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("user_id,username,avatar_url").in("user_id", authorIds)
        : Promise.resolve({ data: [], error: null }),
      allPostIds.length
        ? supabase.from("post_cheers").select("id,post_id").in("post_id", allPostIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (authorsError) console.error("投稿者情報の取得エラー:", authorsError)
    if (cheersError) console.error("応援情報の取得エラー:", cheersError)
    const authorMap = new Map((authors || []).map(a => [a.user_id, a]))
    const cheersMap = new Map()
    for (const cheer of cheers || []) {
      const existing = cheersMap.get(cheer.post_id) || []
      existing.push({ id: cheer.id })
      cheersMap.set(cheer.post_id, existing)
    }
    const originalMap = new Map((originals || []).map(p => [p.id, {
      ...p,
      profiles: authorMap.get(p.user_id) || null,
      post_cheers: cheersMap.get(p.id) || [],
    }]))
    setPosts(await hydrateReposts(rawPosts.filter(p => !p.deleted).map(p => ({
      ...p,
      profiles: authorMap.get(p.user_id) || profileData?.[0] || null,
      post_cheers: cheersMap.get(p.id) || [],
      repost: p.repost_id ? originalMap.get(p.repost_id) || null : null,
    }))))

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
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!me || followBusy || isBlocked || relationBusy) return
    setFollowBusy(true)
    setFollowError("")

    const { error } = await supabase
      .from("follows")
      .insert({
        follower_id: me.id,
        following_id: userId,
      })

    if (error) {
      console.error(error)
      setFollowError("フォローできませんでした。時間をおいて再度お試しください。")
      toast.error("フォローできませんでした。")
      setFollowBusy(false)
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

    toast.success("フォローしました。")
    setIsFollowing(true)
    setFollowers((prev) => prev + 1)
    setFollowBusy(false)
  }

  const handleUnfollow = async () => {
    if (!me || followBusy) return
    setFollowBusy(true)
    setFollowError("")

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", userId)

    if (error) {
      console.error(error)
      setFollowError("フォロー解除に失敗しました。")
      toast.error("フォロー解除に失敗しました。")
      setFollowBusy(false)
      return
    }

    setIsFollowing(false)
    setFollowers((prev) => Math.max(0, prev - 1))
    toast.success("フォローを解除しました。")
    setFollowBusy(false)
  }

  const toggleRelation = async (kind) => {
    if (!me || me.id === userId || relationBusy || followBusy) return
    const blocking = kind === "block"
    const active = blocking ? isBlocked : isMuted
    if (blocking && !active && !window.confirm("このユーザーをブロックしますか？")) return

    setRelationBusy(true)
    setRelationError("")
    setRelationMessage("")
    const table = blocking ? "user_blocks" : "user_mutes"
    const ownerKey = blocking ? "blocker_id" : "muter_id"
    const targetKey = blocking ? "blocked_id" : "muted_id"
    try {
      const query = supabase.from(table)
      const { error } = active
        ? await query.delete().eq(ownerKey, me.id).eq(targetKey, userId)
        : await query.insert({ [ownerKey]: me.id, [targetKey]: userId })
      if (error) throw error

      if (blocking) {
        setIsBlocked(!active)
        if (!active && isFollowing) {
          const { error: unfollowError } = await supabase.from("follows")
            .delete().eq("follower_id", me.id).eq("following_id", userId)
          if (unfollowError) {
            console.error("フォロー解除エラー", unfollowError)
            setRelationMessage("ブロックを保存しましたが、フォロー解除に失敗しました。")
            toast.error("ブロックは保存されましたが、フォロー解除に失敗しました。")
          } else {
            setIsFollowing(false)
            setFollowers(prev => Math.max(0, prev - 1))
          }
        }
      } else {
        setIsMuted(!active)
      }
      if (!(blocking && !active && isFollowing)) {
        toast.success(blocking
          ? (active ? "ブロックを解除しました。" : "ブロックしました。")
          : (active ? "ミュートを解除しました。" : "ミュートしました。"))
      }
    } catch (error) {
      console.error("ブロック・ミュート更新エラー", error)
      setRelationError("設定を変更できませんでした。時間をおいて再度お試しください。")
      toast.error("設定を変更できませんでした。")
    } finally {
      setRelationBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-6 text-[#624c3d] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#b37b50]">
          <Users size={17} aria-hidden="true" />
          <span>ユーザープロフィール</span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#f1e5d9] bg-white p-10 text-center text-[#a18a76]">
            プロフィールを読み込み中です…
          </div>
        ) : !profile ? (
          <div className="rounded-3xl border border-[#f1e5d9] bg-white p-10 text-center text-[#a18a76]">
            プロフィールが見つかりませんでした。
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-[#f1e5d9] bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-r from-[#f9ddbd] via-[#ffeedb] to-[#f8e9d9] sm:h-32" />
              <div className="px-5 pb-6 sm:px-8">
                <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                  <img
                    src={profile.avatar_url?.trim() || "/default-avatar.svg"}
                    alt={`${profile.username || "名無し作家"}のアイコン`}
                    className="h-20 w-20 rounded-full border-4 border-white bg-[#fffaf2] object-cover shadow-sm sm:h-24 sm:w-24"
                  />
                  {me?.id !== userId && (
                    <button
                      type="button"
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      disabled={!me || followBusy || relationBusy || isBlocked}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${isFollowing ? "border border-[#e8c7a9] bg-[#fff7ed] text-[#a66f46] hover:bg-[#ffeddb]" : "bg-[#d78f57] text-white hover:bg-[#c78049]"}`}
                    >
                      {isFollowing ? <UserCheck size={17} /> : <UserRoundPlus size={17} />}
                      {isBlocked ? "ブロック中" : followBusy ? "処理中…" : isFollowing ? "フォロー解除" : "フォローする"}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <h1 className="break-all text-2xl font-bold text-[#624c3d]">{profile.username || "名無し作家"}</h1>
                  <PlanBadge userId={profile.user_id} />
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#826d5d]">
                  {profile.bio || "自己紹介はまだありません。"}
                </p>
                {me && me.id !== userId && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f1e5d9] pt-4">
                    <button type="button" onClick={() => toggleRelation("block")}
                      disabled={relationBusy || followBusy}
                      aria-pressed={isBlocked}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e8c7a9] px-4 py-2 text-sm hover:bg-[#fff4e7] disabled:opacity-50">
                      <Ban size={16} /> {isBlocked ? "ブロック解除" : "ブロック"}
                    </button>
                    <button type="button" onClick={() => toggleRelation("mute")}
                      disabled={relationBusy || followBusy}
                      aria-pressed={isMuted}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e8c7a9] px-4 py-2 text-sm hover:bg-[#fff4e7] disabled:opacity-50">
                      <VolumeX size={16} /> {isMuted ? "ミュート解除" : "ミュート"}
                    </button>
                  </div>
                )}
                {relationMessage && <p role="status" className="mt-3 text-sm text-[#7d684e]">{relationMessage}</p>}
                {relationError && <p role="alert" className="mt-3 text-sm text-red-600">{relationError}</p>}
                {followError && <p role="alert" className="mt-3 text-sm text-red-600">{followError}</p>}
              </div>
            </section>

            <section aria-label="執筆・交流データ" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "累計執筆文字数", value: totalWords.toLocaleString(), unit: "文字", Icon: PenLine },
                { label: "獲得バッジ", value: badgeCount.toLocaleString(), unit: "個", Icon: Award },
                { label: "投稿", value: postCount.toLocaleString(), unit: "件", Icon: FileText },
                { label: "フォロー", value: following.toLocaleString(), unit: "人", Icon: UserRoundPlus },
                { label: "フォロワー", value: followers.toLocaleString(), unit: "人", Icon: Users },
              ].map(({ label, value, unit, Icon }) => (
                <div key={label} className="rounded-2xl border border-[#f1e5d9] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#a18470]">
                    <Icon size={17} className="text-[#d78f57]" aria-hidden="true" />
                    {label}
                  </div>
                  <div className="mt-3 text-xl font-bold text-[#624c3d] sm:text-2xl">
                    {value}<span className="ml-1 text-xs font-medium text-[#a18470]">{unit}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-[#f1e5d9] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-2 border-b border-[#f1e5d9] pb-4">
                <BookOpen size={21} className="text-[#d78f57]" aria-hidden="true" />
                <h2 className="text-lg font-bold">投稿一覧</h2>
                <span className="ml-auto rounded-full bg-[#fff3e7] px-3 py-1 text-xs font-semibold text-[#a9754d]">{postCount}件</span>
              </div>
              {(isBlocked || isMuted) ? (
                <div className="rounded-2xl bg-[#fffaf4] px-4 py-10 text-center text-sm text-[#a18a76]">
                  {isBlocked ? "ブロック中のため投稿を非表示にしています。" : "ミュート中のため投稿を非表示にしています。"}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl bg-[#fffaf4] px-4 py-10 text-center text-sm text-[#a18a76]">
                  まだ投稿はありません。
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} user={me} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
