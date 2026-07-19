"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"
import Link from "next/link"
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
  badge_id: string
  user_id: string
}

type Badge = {
  id: string
  name: string
  icon: string
  description: string
}

type Post = {
  id:string
  user_id:string
  content:string
  created_at:string
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<WritingLog[]>([])
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [following, setFollowing] = useState(0)
  const [followers, setFollowers] = useState(0)

  const [menuOpen, setMenuOpen] = useState(false)

  const [showEditProfile, setShowEditProfile] = useState(false)
 const [editName, setEditName] = useState("")
 const [editBio, setEditBio] = useState("")
 const [editAvatar, setEditAvatar] = useState("")
 const [editLink, setEditLink] = useState("")
 const [allBadges, setAllBadges] = useState<Badge[]>([])

 const [content, setContent] = useState("")
 const [posts,setPosts] = useState<Post[]>([])

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
      
      setPosts((data ?? []) as Post[])
      
      }



      const deletePost = async (id:string) => {
  if (!user) return

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

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

const BADGE_DATA = {
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

setAllBadges(allBadges || [])

      const { count: f1 } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)

      const { count: f2 } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)

      setProfile(profile)
      setLogs(logs || [])
      setBadges(badges || [])
      setFollowing(f1 || 0)
      setFollowers(f2 || 0)
      setEditName(profile?.username || "")
      setEditBio(profile?.bio || "")
      setEditAvatar(profile?.avatar_url || "")
      setEditLink(profile?.website || "")
    }

    fetchData()

  }, [])

  useEffect(()=>{

    if(user){
      fetchPosts()
    }
    
    },[user])

  const totalWords =
    logs.reduce((sum, r) => sum + r.words, 0)

  const weeklyWords =
    logs
      .filter(l =>
        new Date(l.created_at) >
        new Date(Date.now() - 7 * 86400000)
      )
      .reduce((sum, r) => sum + r.words, 0)

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50">


       {/* ハンバーガー */}
       <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(v => !v)
            }}
            className="w-10 h-10 flex flex-col justify-center items-center gap-1"
          >
            <span className="w-6 h-0.5 bg-black" />
            <span className="w-6 h-0.5 bg-black" />
            <span className="w-6 h-0.5 bg-black" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">

              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false)
                  setEditName(profile?.username || "")
                  setEditBio(profile?.bio || "")
                  setShowEditProfile(true)
                }}
              >
                ✏️ プロフィール編集
              </button>

              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false)
                  location.href = "/mypage/privacy"
                }}
              >
                🔒 公開範囲設定
              </button>

              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false)
                  if (profile?.invite_code) {
                    navigator.clipboard.writeText(profile.invite_code)
                    alert("招待コードをコピーしました")
                  }
                }}
              >
                🎟 招待コード
              </button>

              <button
                className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                onClick={async () => {
                  await supabase.auth.signOut()
                  location.href = "/login"
                }}
              >
                🚪 ログアウト
              </button>

            </div>
          )}
        </div>
      {/* =========================
          ヘッダー
      ========================= */}
      <div className="p-5 bg-white shadow-sm border-b relative">

 

        {/* プロフィール */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">

        <img
  src={profile?.avatar_url || "/default.png"}
  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
/>

          <div>
          <div className="font-bold text-lg leading-tight">
              {profile?.username || "名無し作家"}
            </div>

            <div className="text-gray-500 text-sm mt-1 leading-snug">
              {profile?.bio || "まだ自己紹介がありません"}
            </div>
          </div>

        </div>

        {/* フォロー情報 */}
        <div className="flex gap-3 mt-3 text-sm">

          <div
            className="px-3 py-1 bg-gray-100 rounded-full cursor-pointer"
            onClick={() => location.href = "/mypage/following"}
          >
            <b>{following}</b> フォロー
          </div>

          <div
            className="px-3 py-1 bg-gray-100 rounded-full cursor-pointer"
            onClick={() => location.href = "/mypage/followers"}
          >
            <b>{followers}</b> フォロワー
          </div>

        </div>

      </div>

      {profile?.website && (
  <a href={profile.website} target="_blank" rel="noreferrer">
    🔗 {profile.website}
  </a>
)}

      {/* =========================
          ステータス
      ========================= */}
     <div className="p-4 grid grid-cols-2 gap-3">

        <div>
          ✍️ 総文字数
          <div className="bg-white p-4 rounded-xl shadow-sm text-center">{totalWords}</div>
        </div>

        <div>
          📅 今週
          <div className="bg-white p-4 rounded-xl shadow-sm text-center">{weeklyWords}</div>
        </div>

      </div>

      {/* =========================
          バッジ
      ========================= */}
<div className="p-4 border-b relative">

{/* 右上リンク */}
<a
  href="/mypage/badges"
  className="absolute right-4 top-4 text-sm text-blue-500 hover:underline"
>
  バッジ一覧
</a>

<Link href="/cheers">

💚 応援した投稿

</Link>

{/* バッジグリッド */}
<div className="grid grid-cols-16 gap-2">
  {allBadges
    .filter((badge) =>
      badges.some((b) => b.badge_key === badge.key)
    )
    .map((badge) => (
      <div
        key={badge.id}
        className="aspect-square flex items-center justify-center rounded-lg bg-white shadow-sm border relative group"
      >
        {/* アイコン */}
        <div className="text-xl">
          {badge.icon}
        </div>

        {/* hover tooltip */}
        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
          <div className="font-bold">{badge.name}</div>
          <div className="text-[10px] opacity-80">
            {badge.description}
          </div>
        </div>
      </div>
    ))}
</div>
</div>

<textarea
  className="w-full border rounded-lg p-3 h-28 resize-none"
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="今どうしてる？"
/>

<button
  onClick={createPost}
  className="mt-3 w-full bg-sky-500 text-white rounded-lg py-2"
>
  投稿する
</button>


{posts.map((post) => (

<PostCard
    key={post.id}
    post={post}
    user={user}
    deletePost={deletePost}
/>

))}



 
      {showEditProfile && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
    
    <div className="bg-white w-[360px] rounded-2xl p-6">

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
          className="w-full border p-2 rounded"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </div>

      {/* bio */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">自己紹介</div>
        <textarea
          className="w-full border p-2 rounded h-24"
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
        />
      </div>

      <div className="mb-3">
  <div className="text-sm text-gray-500 mb-1">プロフィールリンク</div>
  <input
    className="w-full border p-2 rounded"
    value={editLink}
    onChange={(e) => setEditLink(e.target.value)}
  />
</div>

      {/* ボタン */}
      <div className="flex gap-2">

        <button
          className="flex-1 bg-gray-200 py-2 rounded"
          onClick={() => setShowEditProfile(false)}
        >
          キャンセル
        </button>

        <button
          className="flex-1 bg-blue-500 text-white py-2 rounded"
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
    </div>


  )
}