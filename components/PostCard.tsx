"use client"

import {
  FaHeart,
  FaRegComment,
  FaRetweet
} from "react-icons/fa"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { createNotification } from "@/lib/notification"
import Image from "next/image"

import type { User } from "@supabase/supabase-js"



type Comment = {
  id: string
  content: string
}

type Post = {
  id: string
  user_id: string
  content: string | null
  created_at: string

  profiles?: {
    username: string | null
    avatar_url: string | null
  } | null

  post_cheers?: {
    id: string
  }[]

  repost?: {
    id: string
    content: string | null

    profiles?: {
      username: string | null
      avatar_url: string | null
    } | null

    post_cheers?: {
      id: string
    }[]
  } | null
}

type PostCardProps = {
  post: Post
  user: User | null
  deletePost?: (id: string) => void
}

export default function PostCard({
  post,
  user,
  deletePost,
}: PostCardProps) {

const [myCheers,setMyCheers] = useState<string[]>([])

const [comments, setComments] = useState<Comment[]>([])

const [commentText, setCommentText] = useState<string>("")

const [openComments,setOpenComments] =
useState(false)

const [openPostMenu, setOpenPostMenu] = useState<string | null>(null)

const [openRepostMenu,setOpenRepostMenu] =
useState(false)

const [showQuote,setShowQuote] =
useState(false)

const [quoteText, setQuoteText] = useState<string>("")

const profileUrl =
post.user_id === user?.id
? "/mypage"
: `/user/${post.user_id}`

const fetchMyCheers = async()=>{

    if(!user)return
    
    
    const {data,error}=await supabase
    .from("post_cheers")
    .select("post_id")
    .eq("user_id",user.id)
    
    
    if(error){
    console.error(error)
    return
    }
    
    
    setMyCheers(
      data?.map((item: { post_id: string }) => item.post_id) ?? []
    )
    
    }

    const cheerPost = async () => {

      if (!user) return
    
      const alreadyCheered = myCheers.includes(post.id)
    
      if (alreadyCheered) {
    
        await supabase
          .from("post_cheers")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
    
      } else {
    
        await supabase
          .from("post_cheers")
          .insert({
            post_id: post.id,
            user_id: user.id
          })
    
        // 自分自身への通知は送らない
        if (post.user_id !== user.id) {
    
          // 自分のユーザー名を取得
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", user.id)
            .single()
    
          // 通知を作成
          await createNotification(
            post.user_id,
            "cheer",
            `${myProfile?.username ?? "誰か"}さんがあなたの投稿を応援しました`,
            user.id,
            post.id,
            `/user/${user.id}`
          )
        }
    
      }
    
      await fetchMyCheers()
    }

        const fetchComments = async()=>{


            const {data,error}=await supabase
            .from("post_comments")
            .select("*")
            .eq(
            "post_id",
            post.id
            )
            .order(
            "created_at",
            {
            ascending:true
            }
            )
            
            
            if(error){
            console.error(error)
            return
            }
            
            
            setComments((data ?? []) as Comment[])
            
            }

            const addComment = async()=>{


                if(!user)return
                
                if(!commentText.trim())return
                
                
                const {error}=await supabase
                .from("post_comments")
                .insert({
                post_id:post.id,
                user_id:user.id,
                content:commentText
                })
                
                
                if(error){
                console.error(error)
                return
                }
                
                
                setCommentText("")
                
                await fetchComments()
                
                }


                const repostPost = async()=>{

                  if(!user) return
                
                  const { error } = await supabase
                    .from("posts")
                    .insert({
                      user_id: user.id,
                      repost_id: post.id,
                      content: null
                    })
                
                  if(error){
                    console.error(error)
                    return
                  }
                
                  // 自分自身への通知は送らない
                  if(post.user_id !== user.id){
                
                    // 自分のユーザー名を取得
                    const { data: myProfile } = await supabase
                      .from("profiles")
                      .select("username")
                      .eq("user_id", user.id)
                      .single()
                
                    // 通知作成
                    await createNotification(
                      post.user_id,
                      "repost",
                      `${myProfile?.username ?? "誰か"}さんがあなたの投稿をリポストしました`,
                      user.id,
                      post.id,
                      "/timeline"
                    )
                
                  }
                
                  setOpenRepostMenu(false)
                
                }

                    const quotePost = async()=>{


                      if(!user)return
                      
                      
                      if(!quoteText.trim())
                      return
                      
                      
                      await supabase
                      .from("posts")
                      .insert({
                      
                      user_id:user.id,
                      
                      content:quoteText,
                      
                      repost_id:post.id
                      
                      })
                      
                      
                      setQuoteText("")
                      
                      setShowQuote(false)
                      
                      }

                      useEffect(() => {
                        void fetchMyCheers()
                      }, [user])


    return (
        <div className="relative bg-white rounded-xl shadow p-4 mb-3">
      
          {/* 三点メニュー */}
          <div className="absolute top-3 right-3">
            <button
              onClick={() =>
                setOpenPostMenu(
                  openPostMenu === post.id ? null : post.id
                )
              }
              className="text-gray-500 text-xl"
            >
              ⋯
            </button>
      
            {openPostMenu === post.id && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg z-50">
{post.user_id === user?.id && deletePost && (
                  <button
                    className="w-full px-4 py-2 text-left text-red-500"
                    onClick={() => {
                      setOpenPostMenu(null)
                    
                      if (deletePost) {
                        deletePost(post.id)
                      }
                    }}
                  >
                    🗑 削除
                  </button>
                )}
              </div>
            )}
          </div>


          {/* ユーザー情報 */}
<div className="flex items-center gap-3 mb-3">

<Link href={profileUrl}>
<Image
  src={post.profiles?.avatar_url ?? "/default.png"}
  alt="avatar"
  width={40}
  height={40}
  className="rounded-full object-cover border cursor-pointer"
/>
</Link>

<Link
href={profileUrl}
className="font-bold hover:underline ml-3"
>
{post.profiles?.username ?? "名無し"}
</Link>



</div>
      
          {/* 本文 */}
          <div className="whitespace-pre-wrap">

{
(post.content ?? "").split(/(\s+)/).map(
(text,index)=>{


if(text.startsWith("#")){


return (

<span
key={index}
className="text-blue-500 cursor-pointer"
onClick={()=>{

  window.location.href=
`/timeline?tag=${text.substring(1)}`

}}
>

{text}

</span>

)

}


return text


})
}

</div>
      
          {showQuote && (

<div className="mt-3">

<textarea

value={quoteText}

onChange={
e=>setQuoteText(e.target.value)
}

placeholder="コメントを追加..."

className="
border
rounded
w-full
p-2
"

/>


<button

onClick={quotePost}

className="
bg-blue-500
text-white
px-4
py-2
rounded
mt-2
"

>
投稿
</button>


</div>

)}
          {post.repost && (

<div className="
border rounded-xl
p-3
mt-3
bg-gray-50
">

<div className="font-bold">
{post.repost.profiles?.username}
</div>


<div>
{post.repost.content ?? ""}
</div>


</div>

)}

          {/* ボタン */}
          <div className="flex gap-6 mt-4">
      
            <button
              onClick={cheerPost}
              className="flex items-center gap-1"
            >
              <FaHeart
                className={
                  myCheers.includes(post.id)
                    ? "text-red-500"
                    : "text-gray-300"
                }
              />
              {post.post_cheers?.length ?? 0}
            </button>

            <button
onClick={() =>
setOpenRepostMenu(
!openRepostMenu
)
}
className="flex items-center gap-1 text-gray-500"
>

<FaRetweet />

</button>
      
            <button
onClick={() => {

    if(openComments){
    
    setOpenComments(false)
    
    }else{
    
    setOpenComments(true)
    
    fetchComments()
    
    }
    
    }}
              className="flex items-center gap-1 text-gray-500"
            >
              <FaRegComment />
              {comments.length}
            </button>


      
          </div>




{openRepostMenu && (

<div
className="
absolute
bg-white
border
rounded-lg
shadow
mt-2
z-50
"
>


<button
className="block px-4 py-2 w-full text-left"
onClick={repostPost}
>
<FaRetweet />
通常リポスト
</button>


<button
className="block px-4 py-2 w-full text-left"
onClick={()=>{

setShowQuote(true)

setOpenRepostMenu(false)

}}
>
💬 引用リポスト
</button>


</div>

)}


          {/* コメント */}
          {openComments && (
            <div className="mt-3 border-t pt-3">
      
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="text-sm mb-2"
                >
                  💬 {comment.content}
                </div>
              ))}
      
              <div className="flex mt-3">
      
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="コメントを書く..."
                  className="border rounded-l px-3 py-2 flex-1"
                />
      
                <button
                  onClick={addComment}
                  className="bg-blue-500 text-white px-4 rounded-r"
                >
                  送信
                </button>
      
              </div>
      
            </div>
          )}
      
      
        </div>
      )
}