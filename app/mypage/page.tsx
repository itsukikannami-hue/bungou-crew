"use client"

import UserAvatar from "@/components/UserAvatar"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"
import { hydrateReposts } from "@/lib/hydrateReposts"
import FloatingPostComposer from "@/components/FloatingPostComposer"
import PlanBadge from "@/components/PlanBadge"
import OwnedItemsPanel from "@/components/OwnedItemsPanel"
import type { User } from "@supabase/supabase-js"

type Profile = {
  user_id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  invite_code: string | null
}

type WritingLog = {
  id: string
  words: number
  created_at: string
}

type UserBadge = {
  id: string
  user_id: string
  badge_key: string
}

type Badge = {
  id: string
  key: string
  name: string
  icon: string
  description: string
  rarity?: string
}
type Post = {
  id:string
  user_id:string
  content:string
  created_at:string
  profiles?: {
    username:string | null
    avatar_url:string | null
  } | null
  post_cheers?: {
    id:string
  }[]
  repost?: Post | null
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] =
  useState(false)
  const [isReactivateLoading, setIsReactivateLoading] =
  useState(false)
  const [userPlan, setUserPlan] = useState<
  "free" | "premium" | "ultimate"
>("free")

const [isChangePlanLoading, setIsChangePlanLoading] =
  useState(false)

const [premiumSubscription, setPremiumSubscription] = useState<{
  current_period_end: string | null
  cancel_at_period_end: boolean
} | null>(null)
  const [logs, setLogs] = useState<WritingLog[]>([])
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [following, setFollowing] = useState(0)
  const [followers, setFollowers] = useState(0)

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "writing" | "bungou" | "badges" | "items" | "plan">("posts")

  const [showEditProfile, setShowEditProfile] = useState(false)
 const [editName, setEditName] = useState("")
 const [editBio, setEditBio] = useState("")
 const [editAvatar, setEditAvatar] = useState("")
 const [editLink, setEditLink] = useState("")
 const [allBadges, setAllBadges] = useState<Badge[]>([])

 const [content, setContent] = useState("")
 const [posts,setPosts] = useState<Post[]>([])

 const fetchPremiumStatus = async (userId: string) => {
  try {
    console.log("PLAN STATUS CHECK:", userId)

    const {
      data: planData,
      error: planError,
    } = await supabase.rpc("get_user_plan", {
      target_user_id: userId,
    })

    console.log("PLAN RPC:", {
      userId,
      planData,
      planError,
    })

    if (planError) {
      console.error(
        "プラン判定取得エラー:",
        planError
      )
      return
    }

    const plan =
      planData === "premium" ||
      planData === "ultimate"
        ? planData
        : "free"

    setUserPlan(plan)

    console.log(
      "userPlan SET:",
      plan
    )

    // 無料プランなら契約情報は取得しない
    if (plan === "free") {
      setPremiumSubscription(null)
      return
    }

    const {
      data: subscriptionData,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "current_period_end, cancel_at_period_end"
      )
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    console.log("SUBSCRIPTION RESULT:", {
      subscriptionData,
      subscriptionError,
    })

    if (subscriptionError) {
      console.error(
        "契約情報取得エラー:",
        subscriptionError
      )
      return
    }

    setPremiumSubscription(subscriptionData)
  } catch (error) {
    console.error(
      "プラン情報取得エラー:",
      error
    )
  }
}

const handleCancelSubscription = async () => {
  const confirmed = window.confirm(
    "現在の契約期間終了時に解約します。\n\n契約終了日までは現在のプランを利用できます。\n\n解約を予約しますか？"
  )

  if (!confirmed) {
    return
  }

  try {
    setIsCancelLoading(true)

    const response = await fetch(
      "/api/stripe/cancel",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error ??
          "解約予約に失敗しました"
      )
    }

    alert(
      "解約を予約しました。\n契約終了日までは現在のプランを利用できます。"
    )

    await fetchPremiumStatus(user?.id ?? "")
  } catch (error) {
    console.error(
      "解約予約エラー:",
      error
    )

    alert(
      error instanceof Error
        ? error.message
        : "解約予約に失敗しました"
    )
  } finally {
    setIsCancelLoading(false)
  }
}

const handleReactivateSubscription = async () => {
  const confirmed = window.confirm(
    "解約予約を取り消します。\n\n現在のプランを契約終了日以降も継続します。\n\n解約予約を取り消しますか？"
  )

  if (!confirmed) {
    return
  }

  try {
    setIsReactivateLoading(true)

    const response = await fetch(
      "/api/stripe/cancel/reactivate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error ??
          "解約予約の取り消しに失敗しました"
      )
    }

    alert(
      "解約予約を取り消しました。\n現在のプランを継続できます。"
    )

    if (user?.id) {
      await fetchPremiumStatus(user.id)
    }
  } catch (error) {
    console.error(
      "解約予約取り消しエラー:",
      error
    )

    alert(
      error instanceof Error
        ? error.message
        : "解約予約の取り消しに失敗しました"
    )
  } finally {
    setIsReactivateLoading(false)
  }
}

const handleChangePlan = async (
  targetPlan: "premium" | "ultimate"
) => {
  const targetPlanName =
    targetPlan === "ultimate"
      ? "Ultimate"
      : "Premium"

  const currentPlanName =
    userPlan === "ultimate"
      ? "Ultimate"
      : "Premium"

  const confirmed = window.confirm(
    `${currentPlanName}から${targetPlanName}へ変更します。\n\n` +
      `契約途中の場合は、Stripeによって日割りの差額が計算されます。\n\n` +
      `${targetPlanName}プランへ変更しますか？`
  )

  if (!confirmed) {
    return
  }

  try {
    setIsChangePlanLoading(true)

    const response = await fetch(
      "/api/stripe/change-plan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: targetPlan,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error ??
          "プラン変更に失敗しました"
      )
    }

    alert(
      `${targetPlanName}プランへ変更しました。`
    )

    if (user?.id) {
      await fetchPremiumStatus(user.id)
    }
  } catch (error) {
    console.error(
      "プラン変更エラー:",
      error
    )

    alert(
      error instanceof Error
        ? error.message
        : "プラン変更に失敗しました"
    )
  } finally {
    setIsChangePlanLoading(false)
  }
}

 const extractHashtags = (text:string)=>{

  const matches =
  text.match(/#[^\s#]+/g)
  
  return matches ?? []
  
  }

  const createPost = async () => {

    if (!user) return


// 空白投稿防止
if (!content.trim()) {
alert("投稿内容を入力してください")
return
}
if (Array.from(content.trim()).length > 200) {
  alert("通常の投稿は200文字以内で入力してください")
  return
}
    
    
    // 投稿作成
    const { data:post, error } = await supabase
    .from("posts")
    .insert({
      user_id:user.id,
      content:content,
    })
    .select()
    .single()
    
    
    if(error){
    console.error(error)
    return
    }
    
    
    // ハッシュタグ処理
    const tags = extractHashtags(content)
    
    
    for(const tag of tags){
    
    const tagName = tag.replace("#","")
    
    
    const {data:hashtag,error} = await supabase
    .from("hashtags")
    .upsert(
    {
     name:tagName
    },
    {
     onConflict:"name"
    }
    )
    .select()
    .single()
    
    
    if(error){
      console.error("HASHTAG ERROR:", error.message, error.details, error.hint)
      continue
     }
    
    
    await supabase
    .from("post_hashtags")
    .insert({
    
    post_id:post.id,
    
    hashtag_id:hashtag.id
    
    })
    
    }
    
    
    setContent("")
    
    await fetchPosts()
    
    }


    const startCheckout = async (
      plan: "premium" | "ultimate"
    ) => {
      if (!user) {
        alert("ログインが必要です")
        return
      }
    
      try {
        setIsCheckoutLoading(true)
    
        const response = await fetch(
          "/api/stripe/checkout",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              plan,
            }),
          }
        )
    
        const data = await response.json()
    
        if (!response.ok) {
          alert(
            data.error ||
              "Checkoutの作成に失敗しました"
          )
          return
        }
    
        if (!data.url) {
          alert(
            "Stripe Checkout URLを取得できませんでした"
          )
          return
        }
    
        window.location.href = data.url
      } catch (error) {
        console.error(
          "Checkout開始エラー:",
          error
        )
    
        alert(
          "Stripe Checkoutの開始に失敗しました"
        )
      } finally {
        setIsCheckoutLoading(false)
      }
    }

    const fetchPosts = async () => {

      if(!user) return
      
      const { data, error } = await supabase
      .from("posts")
      .select(
      `
      *,
      profiles(
        username,
        avatar_url
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
      ),
      post_cheers(
        id
      )
      `
      )
      .eq(
      "user_id",
      user.id
      )
      .eq(
      "deleted",
      false
      )
      .order(
      "created_at",
      {
      ascending:false
      }
      )
      
      if(error){
      console.error(error)
      return
      }
      
      setPosts(await hydrateReposts((data ?? []) as Post[]))
      
      }



      const deletePost = async (id:string) => {
  if (!user) return

  const { error } = await supabase
    .rpc("soft_delete_post", { target_post_id: id })

    console.log(error)

  if (error) {
    console.error(error)
    alert(error.message)
    return
  }

  await fetchPosts()
}

const BADGE_ICON_MAP: Record<string, string> = {
  beginner: "🌱",
  writer: "✍️",
  streak7: "🔥",
  streak30: "🚀",
  master: "👑",
}

const BADGE_DATA: Record<string,{
  name:string
  icon:string
  rarity:string
  description:string
}> = {
  first_write: { name: "初執筆", icon: "✍️", rarity: "Common", description: "はじめて執筆を完了した" },
  total_1000: { name: "千文字の壁", icon: "📝", rarity: "Common", description: "累計1000文字達成" },
  total_10000: { name: "駆け出し作家", icon: "📖", rarity: "Rare", description: "累計1万文字達成" },
  total_50000: { name: "中編作家", icon: "📚", rarity: "Rare", description: "累計5万文字達成" },
  total_100000: { name: "長編作家", icon: "🏅", rarity: "Epic", description: "累計10万文字達成" },
  total_500000: { name: "活字の海", icon: "🌊", rarity: "Epic", description: "累計50万文字達成" },
  total_1000000: { name: "百万字の魔物", icon: "💎", rarity: "Legend", description: "累計100万文字達成" },
  single_3000: { name: "一気呵成", icon: "🔥", rarity: "Common", description: "1回で3000文字執筆" },
  single_5000: { name: "超集中", icon: "⚡", rarity: "Rare", description: "1回で5000文字執筆" },
  hours_10: { name: "執筆マラソン", icon: "⏰", rarity: "Rare", description: "累計10時間執筆" },
  hours_100: { name: "活字中毒", icon: "👑", rarity: "Epic", description: "累計100時間執筆" },
  streak_3: { name: "三日坊主突破", icon: "🔥", rarity: "Common", description: "3日連続執筆" },
  streak_7: { name: "一週間継続", icon: "📅", rarity: "Rare", description: "7日連続執筆" },
  streak_15: { name: "半月継続", icon: "📖", rarity: "Rare", description: "15日連続執筆" },
  streak_30: { name: "一ヶ月継続", icon: "🏅", rarity: "Epic", description: "30日連続執筆" },
  streak_100: { name: "執筆習慣化", icon: "👑", rarity: "Epic", description: "100日連続執筆" },
  streak_365: { name: "不屈の作家", icon: "💎", rarity: "Legend", description: "365日連続執筆" },
  first_hatch: { name: "はじめての孵化", icon: "🐣", rarity: "Common", description: "初めてブンゴウを孵化させた" },
  first_debut: { name: "初デビュー", icon: "🎉", rarity: "Common", description: "初めてデビューさせた" },
  rare_birth: { name: "レア誕生", icon: "⭐", rarity: "Rare", description: "レア種を獲得した" },
  collector_10: { name: "蒐集家", icon: "📚", rarity: "Rare", description: "図鑑10種達成" },
  collector_30: { name: "図鑑好き", icon: "📖", rarity: "Epic", description: "図鑑30種達成" },
  collector_all: { name: "ブンゴウ博士", icon: "🏆", rarity: "Legend", description: "全種コンプリート" },
}


  useEffect(() => {
    const fetchData = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) return

      setUser(user)

      await fetchPremiumStatus(user.id)

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

        const { data: logs } = await supabase
        .from("writing_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const { data: badges } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id)

        const { data: allBadges } = await supabase
  .from("badges")
  .select("*")

  console.log("USER BADGES:", badges)
  console.log("ALL BADGES:", allBadges)

  setAllBadges((allBadges || []) as Badge[])

      const { count: f1 } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)

      const { count: f2 } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)

        setProfile(profile as Profile | null)
        setLogs((logs || []) as WritingLog[])
        setBadges((badges || []) as UserBadge[])
      setFollowing(f1 || 0)
      setFollowers(f2 || 0)
      setEditName(profile?.username || "")
      setEditBio(profile?.bio || "")
      setEditAvatar(profile?.avatar_url || "")
      setEditLink(profile?.website || "")
    }

    fetchData()

  }, [])

  useEffect(() => {
    if (!user) return
  
    fetchPosts()
  
  }, [user])

    const totalWords =
    logs.reduce(
    (sum:number, r:WritingLog)=>sum+r.words,
    0
    )

    const weeklyWords =
    logs
    .filter((l:WritingLog)=>
    new Date(l.created_at) >
    new Date(Date.now()-7*86400000)
    )
    .reduce(
    (sum:number,r:WritingLog)=>sum+r.words,
    0
    )

  const ownedBadges = allBadges.filter((badge) => badges.some((b) => b.badge_key === badge.key))
  const tabs = [
    { id: "posts", label: "投稿" },
    { id: "writing", label: "執筆" },
    { id: "bungou", label: "ブンゴウ" },
    { id: "badges", label: "バッジ" },
    { id: "items", label: "アイテム" },
    { id: "plan", label: "契約プラン" },
  ] as const

  return (
    <main className="min-h-screen bg-[#fffaf2] pb-28 text-[#594638]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-wide text-[#694b38]">マイページ</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveTab("plan")} className="rounded-full border border-[#f0d6b9] bg-[#fff1df] px-3 py-2 text-xs font-bold text-[#a96d40] hover:bg-[#ffe8d1]" aria-label="現在の契約プランを見る">
              {userPlan === "ultimate" ? "👑 Ultimate" : userPlan === "premium" ? "✨ Premium" : "🌱 無料"}
            </button>
          <div className="relative">
            <button type="button" aria-label="メニュー" aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f1dfce] bg-white text-xl text-[#9d7150] shadow-sm">☰</button>
            {menuOpen && (
              <>
                {/* メニュー以外の領域を押すと閉じる。メニュー自体は上に重ねる */}
                <button
                  type="button"
                  aria-label="メニューを閉じる"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-[#f1dfce] bg-white py-2 shadow-lg">
                <button className="block w-full px-4 py-3 text-left text-sm hover:bg-[#fff5e9]" onClick={() => {
                  setMenuOpen(false); setEditName(profile?.username || ""); setEditBio(profile?.bio || "");
                  setEditAvatar(profile?.avatar_url || ""); setEditLink(profile?.website || ""); setShowEditProfile(true)
                }}>✏️ プロフィール編集</button>
                <div className="mx-2 my-2 rounded-xl bg-[#fff4e8] px-3 py-3 text-sm">
                  <p className="text-xs text-[#967b65]">現在の契約プラン</p>
                  <p className="mt-1 font-bold text-[#aa6e40]">{userPlan === "ultimate" ? "👑 Ultimate" : userPlan === "premium" ? "✨ Premium" : "🌱 無料プラン"}</p>
                  {premiumSubscription?.cancel_at_period_end && <p className="mt-1 text-xs text-[#bd7055]">解約予約中</p>}
                  <button type="button" onClick={() => { setActiveTab("plan"); setMenuOpen(false) }} className="mt-2 font-semibold text-[#ba7746] underline underline-offset-2">契約内容・変更を見る →</button>
                </div>
                <Link href="/mypage/notifications" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>🔔 通知設定</Link>
                <Link href="/mypage/blocks" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>🚫 ブロック・ミュート管理</Link>
                <Link href="/mypage/privacy" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>🔒 公開範囲設定</Link>
                <Link href="/help" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>❓ 遊び方・ヘルプ</Link>
                <div className="mx-3 my-2 border-t border-[#f1dfce]" />
                <p className="px-4 pt-2 pb-1 text-xs font-semibold text-[#967b65]">サービスについて</p>
                <Link href="/terms" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>📜 利用規約</Link>
                <Link href="/privacy" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>🔐 プライバシーポリシー</Link>
                <Link href="/contact" className="block px-4 py-3 text-sm hover:bg-[#fff5e9]" onClick={() => setMenuOpen(false)}>✉️ お問い合わせ</Link>
                <button className="block w-full px-4 py-3 text-left text-sm hover:bg-[#fff5e9]" onClick={async () => {
                  setMenuOpen(false)
                  if (navigator.clipboard && profile?.invite_code) { await navigator.clipboard.writeText(profile.invite_code); alert("招待コードをコピーしました") }
                }}>🎟 招待コード</button>
                <Link href="/mypage/account/delete" className="block px-4 py-3 text-sm text-red-600 hover:bg-red-50" onClick={() => setMenuOpen(false)}>⚠️ アカウント削除・退会</Link>
                <button className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50" onClick={async () => {
                  setMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/login"
                }}>🚪 ログアウト</button>
              </div>
              </>
            )}
          </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-[#f0e1d2] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <UserAvatar src={profile?.avatar_url || "/default-avatar.svg"} alt="プロフィール画像" className="h-20 w-20 shrink-0 rounded-full border-4 border-[#fff1df] object-cover sm:h-24 sm:w-24" />
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-xl font-bold text-[#594638]">{profile?.username || "名無し作家"}</h2>
                {profile?.user_id && <PlanBadge userId={profile.user_id} />}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#897563]">{profile?.bio || "まだ自己紹介がありません"}</p>
              {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-[#c4824c] underline underline-offset-2">🔗 {profile.website}</a>}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#f5eade] pt-4 text-sm">
            <Link href="/mypage/following" className="hover:text-[#c4824c]"><b className="mr-1 text-base">{following.toLocaleString()}</b>フォロー</Link>
            <Link href="/mypage/followers" className="hover:text-[#c4824c]"><b className="mr-1 text-base">{followers.toLocaleString()}</b>フォロワー</Link>
            <button type="button" onClick={() => {
              setEditName(profile?.username || ""); setEditBio(profile?.bio || ""); setEditAvatar(profile?.avatar_url || ""); setEditLink(profile?.website || ""); setShowEditProfile(true)
            }} className="ml-auto rounded-full border border-[#e7b58b] px-4 py-2 font-semibold text-[#bb7a48] hover:bg-[#fff5eb]">プロフィール編集</button>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#947e6d]">✍️ 累計執筆文字数</p>
            <p className="mt-2 text-2xl font-bold text-[#bc7d4b]">{totalWords.toLocaleString()}<span className="ml-1 text-sm font-normal">字</span></p>
          </div>
          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#947e6d]">📅 直近7日間</p>
            <p className="mt-2 text-2xl font-bold text-[#bc7d4b]">{weeklyWords.toLocaleString()}<span className="ml-1 text-sm font-normal">字</span></p>
          </div>
        </section>

        <div className="mt-6 overflow-x-auto border-b border-[#eddcc9]" role="tablist" aria-label="マイページの表示切り替え">
          <div className="flex min-w-max justify-between gap-1">
            {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-[65px] border-b-[3px] px-3 py-3 text-sm font-bold transition ${activeTab === tab.id ? "border-[#d78f57] text-[#c17d49]" : "border-transparent text-[#9b8878] hover:text-[#c17d49]"}`}>{tab.label}</button>)}
          </div>
        </div>

        {activeTab === "posts" && (
          <section className="mt-5 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">投稿一覧</h3><Link href="/cheers" className="text-sm font-medium text-[#bf8050]">💚 応援した投稿 →</Link></div>
            {posts.length === 0 && <div className="rounded-2xl border border-[#f0e1d2] bg-white px-5 py-12 text-center text-sm text-[#9b8878]">まだ投稿がありません。<br />右下のボタンから最初の投稿を作成できます。</div>}
            {posts.map((post) => <PostCard key={post.id} post={post} user={user} deletePost={deletePost} />)}
          </section>
        )}

        {activeTab === "writing" && (
          <section className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#694b38]">✍️ 執筆の記録</h3>
              <p className="mt-2 text-sm text-[#907b68]">これまでの執筆を振り返りましょう。</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#fff7ee] p-4"><p className="text-xs text-[#947e6d]">累計</p><p className="mt-1 text-xl font-bold text-[#bc7d4b]">{totalWords.toLocaleString()} 字</p></div>
                <div className="rounded-xl bg-[#fff7ee] p-4"><p className="text-xs text-[#947e6d]">直近7日間</p><p className="mt-1 text-xl font-bold text-[#bc7d4b]">{weeklyWords.toLocaleString()} 字</p></div>
              </div>
              <Link
                href="/data"
                className="mt-5 flex items-center gap-3 rounded-2xl border border-[#f0d9bf] bg-[#fff8ef] px-4 py-4 transition hover:border-[#e7ae80] hover:bg-[#fff1e1] focus-visible:outline-2 focus-visible:outline-[#c77f43]"
              >
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">📊</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[#694b38]">執筆データを見る</span>
                  <span className="mt-1 block text-xs text-[#907b68]">執筆の記録やグラフを詳しく確認</span>
                </span>
                <span aria-hidden="true" className="text-xl font-bold text-[#c4824c]">›</span>
              </Link>
              <h4 className="mt-6 text-sm font-bold">最近の執筆</h4>
              {logs.length === 0 ? <p className="mt-3 text-sm text-[#947e6d]">まだ執筆記録がありません。</p> :
                <div className="mt-2 divide-y divide-[#f4e9dc]">{logs.slice(0, 10).map((log) => <div key={log.id} className="flex justify-between gap-3 py-3 text-sm"><span className="text-[#947e6d]">{new Date(log.created_at).toLocaleDateString("ja-JP")}</span><strong>{log.words.toLocaleString()} 字</strong></div>)}</div>}
            </div>

          </section>
        )}

        {activeTab === "plan" && (
            <section className="rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-[#694b38]">✨ 契約プラン・特典</h3>
              <div className="mt-4"><div className="px-4 pb-4">
  <div className="bg-white rounded-xl shadow-sm border p-5">

  {userPlan === "ultimate" ? (
  <>
    <div className="text-lg font-bold">
      👑 Ultimate プラン会員
    </div>

    <div className="mt-2 text-sm text-gray-600">
      月額980円
    </div>

    <div className="mt-4 rounded-lg bg-purple-50 border border-purple-200 p-4">
      <div className="font-bold text-purple-700 mb-2">
        Ultimate 特典
      </div>

      <ul className="space-y-2 text-sm text-gray-700">
        <li>✓ 登録時に5,000ポイント付与</li>
        <li>✓ 毎月「習慣リカバリー」×2</li>
        <li>✓ 毎月「EXPブースト」×2</li>
        <li>✓ おすすめタイムラインで優先表示</li>
        <li>✓ 詳細な執筆統計</li>
        <li>✓ Ultimate専用プレミアムバッジ</li>
        <li>✓ 広告15日掲載：0ポイント</li>
        <li>✓ 広告30日掲載：0ポイント</li>
      </ul>
    </div>

    {premiumSubscription?.current_period_end && (
      <div className="mt-4 text-sm text-gray-600">
        次回更新日：
        {new Date(
          premiumSubscription.current_period_end
        ).toLocaleDateString("ja-JP")}
      </div>
    )}

{premiumSubscription?.cancel_at_period_end && (
  <>
    <div className="mt-2 text-sm text-red-600">
      契約終了予定です
    </div>

    {premiumSubscription.current_period_end && (
      <div className="mt-1 text-sm text-gray-600">
        契約終了日：
        {new Date(
          premiumSubscription.current_period_end
        ).toLocaleDateString("ja-JP")}
      </div>
    )}

    <button
      type="button"
      onClick={handleReactivateSubscription}
      disabled={isReactivateLoading}
      className="mt-4 rounded-lg border border-green-300 px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
    >
      {isReactivateLoading
        ? "処理中..."
        : "解約予約を取り消す"}
    </button>
  </>
)}

{!premiumSubscription?.cancel_at_period_end && (
  <>
    <div className="mt-2 text-sm text-green-600">
      契約中
    </div>

    <button
  type="button"
  onClick={() => handleChangePlan("premium")}
  disabled={isChangePlanLoading}
  className="mt-3 w-full rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
>
  {isChangePlanLoading
    ? "変更中..."
    : "Premiumへプラン変更"}
</button>
<button
      type="button"
      onClick={handleCancelSubscription}
      disabled={isCancelLoading}
      className="mt-3 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isCancelLoading ? "処理中..." : "解約を予約する"}
    </button>
  </>
)}

  </>
) : userPlan === "premium" ? (
  <>
    <div className="text-lg font-bold">
      ✨ Premium プラン会員
    </div>

    <div className="mt-2 text-sm text-gray-600">
      月額500円
    </div>

    <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
      <div className="font-bold text-blue-700 mb-2">
        Premium 特典
      </div>

      <ul className="space-y-2 text-sm text-gray-700">
        <li>✓ 登録時に2,000ポイント付与</li>
        <li>✓ 毎月「習慣リカバリー」×1</li>
        <li>✓ 毎月「EXPブースト」×1</li>
        <li>✓ おすすめタイムラインで少し優先表示</li>
        <li>✓ 詳細な執筆統計</li>
        <li>✓ Premium専用プレミアムバッジ</li>
        <li>✓ 広告15日掲載：0ポイント</li>
        <li>✓ 広告30日掲載：1,500ポイント</li>
      </ul>
    </div>

    {premiumSubscription?.current_period_end && (
      <div className="mt-4 text-sm text-gray-600">
        次回更新日：
        {new Date(
          premiumSubscription.current_period_end
        ).toLocaleDateString("ja-JP")}
      </div>
    )}

{premiumSubscription?.cancel_at_period_end && (
  <>
    <div className="mt-2 text-sm text-red-600">
      契約終了予定です
    </div>

    {premiumSubscription.current_period_end && (
      <div className="mt-1 text-sm text-gray-600">
        契約終了日：
        {new Date(
          premiumSubscription.current_period_end
        ).toLocaleDateString("ja-JP")}
      </div>
    )}

    <button
      type="button"
      onClick={handleReactivateSubscription}
      disabled={isReactivateLoading}
      className="mt-4 rounded-lg border border-green-300 px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
    >
      {isReactivateLoading
        ? "処理中..."
        : "解約予約を取り消す"}
    </button>
  </>
)}

{!premiumSubscription?.cancel_at_period_end && (
  <>
    <div className="mt-2 text-sm text-green-600">契約中</div>

    <button
  type="button"
  onClick={() => handleChangePlan("ultimate")}
  disabled={isChangePlanLoading}
  className="mt-3 w-full rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
>
  {isChangePlanLoading
    ? "変更中..."
    : "Ultimateへプラン変更"}
</button>

    <button
      type="button"
      onClick={handleCancelSubscription}
      disabled={isCancelLoading}
      className="mt-3 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isCancelLoading ? "処理中..." : "解約を予約する"}
    </button>
  </>
)}
  </>
) : (
  <>
    <div className="text-lg font-bold">
      ✨ ブンゴウクルー 有料プラン
    </div>

    <div className="mt-2 text-sm text-gray-600">
      有料プランに加入すると、ポイントやアイテムなどの特典を受け取れます。
    </div>

    <div className="mt-4 grid gap-3">
      <div className="rounded-lg border p-4">
        <div className="font-bold">
          ✨ Premium
        </div>

        <div className="mt-1 text-sm text-gray-600">
          月額500円
        </div>

        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          <li>・登録時2,000ポイント</li>
          <li>・毎月アイテム2個</li>
          <li>・おすすめタイムライン優遇</li>
          <li>・詳細な執筆統計</li>
        </ul>

        <button
          onClick={() => startCheckout("premium")}
          disabled={isCheckoutLoading}
          className="mt-4 w-full rounded-lg bg-[#d78f57] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Premiumに加入する
        </button>
      </div>

      <div className="rounded-lg border p-4">
        <div className="font-bold">
          👑 Ultimate
        </div>

        <div className="mt-1 text-sm text-gray-600">
          月額980円
        </div>

        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          <li>・登録時5,000ポイント</li>
          <li>・毎月アイテム4個</li>
          <li>・おすすめタイムラインをより優遇</li>
          <li>・高度な執筆統計</li>
        </ul>

        <button
          onClick={() => startCheckout("ultimate")}
          disabled={isCheckoutLoading}
          className="mt-4 w-full rounded-lg bg-[#d78f57] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Ultimateに加入する
        </button>
      </div>
    </div>

    <div className="mt-4 text-xs text-gray-500">
      ※広告掲載の7日プランは有料プランでも利用できません。
    </div>
  </>
)}

  </div>
</div>

</div>
            </section>
        )}

        {activeTab === "bungou" && <section className="mt-5 rounded-[24px] border border-[#f0e1d2] bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">📖</div><h3 className="mt-3 text-lg font-bold">ブンゴウの育成記録</h3>
          <p className="mt-2 text-sm text-[#907b68]">育てたブンゴウや出会った仲間を図鑑で確認できます。</p>
          <Link href="/album" className="mt-5 inline-block rounded-full bg-[#d78f57] px-7 py-3 text-sm font-bold text-white hover:bg-[#c88047]">ブンゴウ図鑑を見る →</Link>
        </section>}

        {activeTab === "badges" && <section className="mt-5 rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h3 className="font-bold">🏅 獲得したバッジ <span className="text-sm font-normal text-[#947e6d]">{ownedBadges.length}個</span></h3><Link href="/mypage/badges" className="text-sm font-semibold text-[#bf8050]">バッジ一覧 →</Link></div>
          {ownedBadges.length === 0 ? <p className="py-10 text-center text-sm text-[#947e6d]">まだ獲得したバッジはありません。</p> :
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">{ownedBadges.map((badge) => <div key={badge.id} title={badge.description} className="rounded-2xl border border-[#f3e5d7] bg-[#fffaf5] p-3 text-center"><div className="text-3xl">{badge.icon}</div><div className="mt-2 break-words text-xs font-semibold">{badge.name}</div></div>)}</div>}
        </section>}

        {activeTab === "items" && <section className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold text-[#694b38]">🎁 所持アイテム</h3>
            <p className="mt-2 text-sm text-[#907b68]">現在の所持数を確認できます。</p>
            <div className="mt-4"><OwnedItemsPanel open={activeTab === "items"} /></div>
            <Link href="/items" className="mt-5 inline-block rounded-full bg-[#d78f57] px-7 py-3 text-sm font-bold text-white hover:bg-[#c88047]">アイテムショップへ →</Link>
          </div>
        </section>}
      </div>
      <FloatingPostComposer onPosted={fetchPosts} />
            {showEditProfile && (
  <div className="fixed inset-0 bg-[#38291d]/55 flex items-center justify-center z-[200]">
    
    <div className="max-h-[85vh] w-[min(92vw,440px)] overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl">

      <div className="text-lg font-bold mb-4">
        プロフィール編集
      </div>

      <div className="mb-3">
  <div className="text-sm text-gray-500 mb-1">アイコンURL</div>
  <input
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!user) return
    
    const filePath = `${user.id}/${Date.now()}`
  
    // ① 1回だけアップロードする
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file)
  
    if (uploadError) {
      console.error(uploadError)
      return
    }
  
    // ② 公開URLを取得する
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)
  
    // ③ 画面に反映
    setEditAvatar(urlData.publicUrl)
  }}
/>
</div>

      {/* 名前 */}
      <div className="mb-3">
        <div className="text-sm text-gray-500 mb-1">名前</div>
        <input
          className="w-full rounded-xl border border-[#ead9c8] p-3 outline-none focus:border-[#d78f57]"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </div>

      {/* bio */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">自己紹介</div>
        <textarea
          className="h-24 w-full rounded-xl border border-[#ead9c8] p-3 outline-none focus:border-[#d78f57]"
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
        />
      </div>

      <div className="mb-3">
  <div className="text-sm text-gray-500 mb-1">プロフィールリンク</div>
  <input
    className="w-full rounded-xl border border-[#ead9c8] p-3 outline-none focus:border-[#d78f57]"
    value={editLink}
    onChange={(e) => setEditLink(e.target.value)}
  />
</div>

      {/* ボタン */}
      <div className="flex gap-2">

        <button
          className="flex-1 rounded-xl border border-[#ead9c8] bg-white py-3"
          onClick={() => setShowEditProfile(false)}
        >
          キャンセル
        </button>

        <button
          className="flex-1 rounded-xl bg-[#d78f57] py-3 font-bold text-white"
          onClick={async () => {
              const { data: auth } = await supabase.auth.getUser()
              const currentUser = auth?.user
            
              if (!currentUser) return
            
              const { data, error } = await supabase
                .from("profiles")
                .update({
                  username: editName,
                  bio: editBio,
                  avatar_url: editAvatar,
                  website: editLink, 
                })
                .eq("user_id", currentUser.id)
                .select()
            
              console.log("update data:", data)
              console.log("update error:", error)
            
              if (error) {
                alert("保存失敗: " + error.message)
                return
              }
            
              const { data: updatedProfile, error: fetchError } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", currentUser.id)
                .single()
            
              console.log("fetch error:", fetchError)
            
              setProfile(updatedProfile)
              setShowEditProfile(false)
            }}
        >
          保存
        </button>

      </div>

    </div>
  </div>
)}

    </main>
  )
}
