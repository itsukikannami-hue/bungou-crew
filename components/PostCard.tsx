"use client"

import {
  FaStar,
  FaRegComment,
  FaRetweet
} from "react-icons/fa"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquareQuote } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { createNotification } from "@/lib/notification"
import UserAvatar from "@/components/UserAvatar"
import PlanBadge from "@/components/PlanBadge"

import type { User } from "@supabase/supabase-js"



type Comment = {
  id: string
  content: string
}

type Post = {
  id: string
  user_id: string
  content: string | null
  deleted?: boolean
  repost_id?: string | null
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
    user_id: string
    content: string | null
    deleted?: boolean

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
  detailMode?: boolean
}

export default function PostCard({
  post,
  user,
  deletePost,
  detailMode = false,
}: PostCardProps) {
  const router = useRouter()

  console.log("PostCardに渡された投稿:", post)


const [myCheers,setMyCheers] = useState<string[]>([])

const [comments, setComments] = useState<Comment[]>([])
const [commentCount, setCommentCount] = useState(0)

const [commentText, setCommentText] = useState<string>("")

const [openComments,setOpenComments] =
useState(false)

const [openPostMenu, setOpenPostMenu] = useState<string | null>(null)
const [showReportModal, setShowReportModal] = useState(false)
const [reportReason, setReportReason] = useState("spam")
const [reportDetails, setReportDetails] = useState("")
const [isReporting, setIsReporting] = useState(false)
const [reportError, setReportError] = useState("")
const [reportSuccess, setReportSuccess] = useState(false)

const [openRepostMenu,setOpenRepostMenu] =
useState(false)
const postMenuRef = useRef<HTMLDivElement>(null)
const postButtonRef = useRef<HTMLButtonElement>(null)
const repostMenuRef = useRef<HTMLDivElement>(null)
const repostButtonRef = useRef<HTMLButtonElement>(null)
const [repostError, setRepostError] = useState<string | null>(null)
const [isReposting, setIsReposting] = useState(false)
const [repostCount, setRepostCount] = useState(0)
const [myRepostId, setMyRepostId] = useState<string | null>(null)

const [showQuote,setShowQuote] =
useState(false)

const [quoteText, setQuoteText] = useState<string>("")

const submitReport = async () => {
  if (!user || user.id === post.user_id || isReporting) return
  setIsReporting(true)
  setReportError("")
  const { error } = await supabase.rpc("submit_post_report", {
    p_post_id: post.id,
    p_reason: reportReason,
    p_details: reportDetails.trim() || null,
  })
  setIsReporting(false)
  if (error) {
    console.error("投稿通報エラー:", error)
    setReportError("通報を送信できませんでした。時間をおいて再度お試しください。")
    return
  }
  setShowReportModal(false)
  setReportDetails("")
  setReportReason("spam")
  setReportSuccess(true)
}

const profileUrl =
post.user_id === user?.id
? "/mypage"
: `/user/${post.user_id}`


// 一覧では長文を約200文字で折りたたむ。詳細ページでは全文を表示する。
const PREVIEW_LENGTH = 200
const [showFullFeedback, setShowFullFeedback] = useState(false)
const [showFullOriginal, setShowFullOriginal] = useState(false)
const feedbackContent = post.content ?? ""
const feedbackCharacters = Array.from(feedbackContent)
const isLongFeedback = !detailMode && feedbackCharacters.length > PREVIEW_LENGTH
const displayedFeedback = isLongFeedback && !showFullFeedback
  ? feedbackCharacters.slice(0, PREVIEW_LENGTH).join("") + "…"
  : feedbackContent
const originalContent = post.repost?.content ?? ""
const originalCharacters = Array.from(originalContent)
const isLongOriginal = !detailMode && originalCharacters.length > PREVIEW_LENGTH
const displayedOriginal = isLongOriginal && !showFullOriginal
  ? originalCharacters.slice(0, PREVIEW_LENGTH).join("") + "…"
  : originalContent

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
    
        const { error: cheerError } = await supabase
          .from("post_cheers")
          .insert({
            post_id: post.id,
            user_id: user.id
          })
        if (cheerError) {
          console.error("応援登録エラー:", cheerError)
          return
        }
    
        // 自分自身への通知は送らない
        if (post.user_id !== user.id) {
    
          // 自分のユーザー名を取得
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", user.id)
            .single()
    
          // 通知を作成
          const notificationResult = await createNotification(
            post.user_id,
            "cheer",
            `${myProfile?.username ?? "誰か"}さんがあなたの投稿を応援しました`,
            user.id,
            post.id,
            `/posts/${post.id}`
          )
          if (!notificationResult.success) console.error("応援通知の保存に失敗しました", notificationResult.error)
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
            setCommentCount(data?.length ?? 0)
            
            }

            const addComment = async()=>{


                if(!user)return
                
                if(!commentText.trim())return
                
                
                const { data: createdComment, error }=await supabase
                .from("post_comments")
                .insert({
                post_id:post.id,
                user_id:user.id,
                content:commentText
                }).select("id").single()
                
                
                if(error){
                console.error(error)
                return
                }
                
                
                if (post.user_id !== user.id) {
                  const { data: myProfile } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("user_id", user.id)
                    .maybeSingle()
                  const notificationResult = await createNotification(
                    post.user_id,
                    "comment",
                    `${myProfile?.username ?? "誰か"}さんがあなたの投稿にコメントしました`,
                    user.id,
                    post.id,
                    `/posts/${post.id}`,
                     createdComment?.id
                  )
                  if (!notificationResult.success) console.error("コメント通知の保存に失敗しました", notificationResult.error)
                }

                setCommentText("")
                
                await fetchComments()
                
                }


                // 削除メニューの外側をクリック・タップしたら閉じる。
                useEffect(() => {
                  if (openPostMenu !== post.id) return
                  const closeOutside = (event: PointerEvent) => {
                    if (!postMenuRef.current?.contains(event.target as Node) &&
                        !postButtonRef.current?.contains(event.target as Node)) {
                      setOpenPostMenu(null)
                    }
                  }
                  document.addEventListener("pointerdown", closeOutside)
                  return () => document.removeEventListener("pointerdown", closeOutside)
                }, [openPostMenu, post.id])

                // メニュー外をクリック・タップした場合は閉じる。
                useEffect(() => {
                  if (!openRepostMenu) return
                  const closeOutside = (event: PointerEvent) => {
                    if (!repostMenuRef.current?.contains(event.target as Node) &&
                        !repostButtonRef.current?.contains(event.target as Node)) {
                      setOpenRepostMenu(false)
                    }
                  }
                  document.addEventListener("pointerdown", closeOutside)
                  return () => document.removeEventListener("pointerdown", closeOutside)
                }, [openRepostMenu])

                // 削除済みの拡散は集計せず、自分の通常拡散のみ解除対象にする。
                const fetchRepostState = async () => {
                  const { data, error } = await supabase
                    .from("posts")
                    .select("id, user_id, content")
                    .eq("repost_id", post.id)
                    .eq("deleted", false)
                  if (error) {
                    console.error("拡散情報の取得に失敗しました:", error)
                    return
                  }
                  setRepostCount(data?.length ?? 0)
                  setMyRepostId(
                    data?.find(item => item.user_id === user?.id && !item.content?.trim())?.id ?? null
                  )
                }

                const undoRepost = async () => {
                  if (!user || !myRepostId || isReposting) return
                  setIsReposting(true)
                  setRepostError(null)
                  try {
                    // 既存のソフトデリート方式を使い、関連データの外部キーを壊さない。
                    const { error } = await supabase.rpc("soft_delete_post", {
                      target_post_id: myRepostId,
                    })
                    if (error) {
                      setRepostError(`拡散を解除できませんでした：${error.message}`)
                      return
                    }
                    setOpenRepostMenu(false)
                    await fetchRepostState()
                    router.refresh()
                  } finally {
                    setIsReposting(false)
                  }
                }

                const notifyRepost = async (kind: "repost" | "quote", eventId: string) => {
                  if (!user || post.user_id === user.id) return
                  const { data: myProfile } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("user_id", user.id)
                    .maybeSingle()
                  // 既存の通知種別 "repost" を両方で使用し、通知文で区別する。
                  const action = kind === "quote" ? "コメ付き拡散" : "拡散"
                  const result = await createNotification(
                    post.user_id,
                    "repost",
                    `${myProfile?.username ?? "誰か"}さんがあなたの投稿を${action}しました`,
                    user.id,
                    post.id,
                    `/posts/${post.id}`,
                     eventId
                  )
                  if (!result.success) {
                    console.error(`${action}通知の保存に失敗しました`, result.error)
                    setRepostError("投稿は完了しましたが、通知の送信に失敗しました。")
                  }
                }

                const repostPost = async () => {
                  if (!user || isReposting) return
                  setRepostError(null)
                  setIsReposting(true)
                  try {
                    // content が NOT NULL のスキーマでも保存できるよう空文字を使用。
                    const { data: createdRepost, error } = await supabase.from("posts").insert({
                      user_id: user.id,
                      repost_id: post.id,
                      content: "",
                    }).select("id").single()
                    if (error) {
                      console.error("拡散の保存に失敗しました:", error)
                      setRepostError(`拡散できませんでした：${error.message}`)
                      return
                    }
                    setOpenRepostMenu(false)
                    await fetchRepostState()
                    if (createdRepost?.id) await notifyRepost("repost", createdRepost.id)
                  } finally {
                    setIsReposting(false)
                  }
                }

                const quotePost = async () => {
                  if (!user || !quoteText.trim() || isReposting) return
                  if (Array.from(quoteText.trim()).length > 200) {
                    setRepostError("コメ付き拡散のコメントは200文字以内で入力してください")
                    return
                  }
                  setRepostError(null)
                  setIsReposting(true)
                  try {
                    const { data: createdRepost, error } = await supabase.from("posts").insert({
                      user_id: user.id,
                      content: quoteText.trim(),
                      repost_id: post.id,
                    }).select("id").single()
                    if (error) {
                      console.error("コメ付き拡散の保存に失敗しました:", error)
                      setRepostError(`コメ付き拡散できませんでした：${error.message}`)
                      return
                    }
                    setQuoteText("")
                    setShowQuote(false)
                    await fetchRepostState()
                    if (createdRepost?.id) await notifyRepost("quote", createdRepost.id)
                  } finally {
                    setIsReposting(false)
                  }
                }

                      useEffect(() => {
                        void fetchMyCheers()
  void fetchComments()
                      }, [user])

                      useEffect(() => {
                        void fetchRepostState()
                      }, [post.id, user?.id])


    if (post.deleted && !post.repost_id) return null

    return (
        <div className="relative bg-white rounded-2xl border border-[#f1e5d9] p-4 sm:p-5 text-[#624c3d]"
  onClick={(event) => {
    if (detailMode) return
    if ((event.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return
    router.push(`/posts/${post.id}`)
  }}
>
      
          {/* 三点メニュー */}
          {!post.deleted && user && (post.user_id !== user.id || !!deletePost) && <div className="absolute top-3 right-3" ref={postMenuRef}>
            <button
              ref={postButtonRef}
              onClick={() =>
                setOpenPostMenu(
                  openPostMenu === post.id ? null : post.id
                )
              }
              aria-label="投稿メニュー"
              className="rounded-full px-2 text-xl text-[#9c8877] hover:bg-[#fff3e7]"
            >
              ⋯
            </button>
      
            {openPostMenu === post.id && (
              <div className="absolute right-0 z-50 mt-2 w-32 rounded-xl border border-[#f1e5d9] bg-white shadow-lg">
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
                {post.user_id !== user?.id && (
                  <button type="button" className="w-full px-4 py-2 text-left text-sm text-[#775b45] hover:bg-[#fff3e7]" onClick={() => { setOpenPostMenu(null); setReportError(""); setShowReportModal(true) }}>
                    通報する
                  </button>
                )}
              </div>
            )}
          </div>}


          {reportSuccess && <p role="status" className="mb-3 rounded-lg bg-[#fff4e7] px-3 py-2 text-sm text-[#775b45]">通報を受け付けました。ご協力ありがとうございます。</p>}
          {showReportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={() => !isReporting && setShowReportModal(false)}>
              <div role="dialog" aria-modal="true" aria-labelledby={`report-title-${post.id}`} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
                <h2 id={`report-title-${post.id}`} className="text-lg font-bold">投稿を通報する</h2>
                <p className="mt-2 text-sm text-[#927b69]">通報内容は運営が確認します。投稿者には通知されません。</p>
                <label htmlFor={`report-reason-${post.id}`} className="mt-4 block text-sm font-semibold">通報理由</label>
                <select id={`report-reason-${post.id}`} value={reportReason} onChange={e => setReportReason(e.target.value)} disabled={isReporting} className="mt-1 w-full rounded-lg border border-[#ead9c8] bg-white p-2 text-sm">
                  <option value="spam">スパム・宣伝</option>
                  <option value="harassment">嫌がらせ・いじめ</option>
                  <option value="hate">差別・ヘイト</option>
                  <option value="sexual">性的な内容</option>
                  <option value="violence">暴力的な内容</option>
                  <option value="copyright">著作権侵害</option>
                  <option value="other">その他</option>
                </select>
                <label htmlFor={`report-details-${post.id}`} className="mt-4 block text-sm font-semibold">詳細（任意）</label>
                <textarea id={`report-details-${post.id}`} value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={1000} rows={4} disabled={isReporting} placeholder="具体的な内容があれば入力してください" className="mt-1 w-full rounded-lg border border-[#ead9c8] p-3 text-sm" />
                <p className="text-right text-xs text-[#927b69]">{reportDetails.length} / 1000文字</p>
                {reportError && <p role="alert" className="mt-2 text-sm text-red-600">{reportError}</p>}
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" disabled={isReporting} onClick={() => setShowReportModal(false)} className="rounded-lg border border-[#ead9c8] px-4 py-2 text-sm">キャンセル</button>
                  <button type="button" disabled={isReporting} onClick={submitReport} className="rounded-lg bg-[#d78f57] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isReporting ? "送信中..." : "通報を送信"}</button>
                </div>
              </div>
            </div>
          )}

          {/* ユーザー情報 */}
<div className="mb-3 flex items-center gap-3 pr-8">

<Link href={profileUrl}>
<UserAvatar
  src={
    post.profiles?.avatar_url &&
    post.profiles.avatar_url.trim() !== ""
      ? post.profiles.avatar_url
      : "/default-avatar.svg"
  }
  alt={`${post.profiles?.username ?? "名無し"}のアイコン`}
  width={40}
  height={40}
  className="h-11 w-11 rounded-full border border-[#f1e5d9] object-cover"
/>
</Link>

<div className="flex min-w-0 flex-wrap items-center gap-1.5">
  <Link
    href={profileUrl}
    className="font-bold text-[#624c3d] hover:underline"
  >
    {post.profiles?.username ?? "名無し"}
  </Link>

  <PlanBadge userId={post.user_id} />
  <time dateTime={post.created_at} className="w-full text-xs text-[#aa9583]">
    {new Date(post.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
  </time>
</div>



</div>
      
          {/* 本文 */}
          <div className="whitespace-pre-wrap break-words text-[15px] leading-7 text-[#624c3d]">

{displayedFeedback.split(/(\s+)/).map(
  (text, index) => {

    if (text.startsWith("#")) {

      return (
        <span
          key={index}
          className="cursor-pointer font-medium text-[#c77f43] hover:underline"
          onClick={() => {
            window.location.href =
              `/timeline?tag=${text.substring(1)}`
          }}
        >
          {text}
        </span>
      )

    }

    return text

  }
)}

</div>

{isLongFeedback && (
  <button
    onClick={() =>
      setShowFullFeedback(!showFullFeedback)
    }
    className="mt-2 text-sm font-medium text-[#c77f43] hover:underline"
  >
    {showFullFeedback
      ? "閉じる"
      : "すべて表示"}
  </button>
)}
      
          {showQuote && (

<div className="mt-3">

<textarea

value={quoteText}

onChange={
e=>setQuoteText(Array.from(e.target.value).slice(0, 200).join(""))
}

maxLength={400}
placeholder="コメントを追加..."

className="
w-full rounded-xl border border-[#ead9c8] bg-[#fffaf4] p-3 outline-none focus:border-[#d99b6b]
"

/>


<button

onClick={quotePost}
 disabled={isReposting || !quoteText.trim()}

className="
mt-2 rounded-xl bg-[#e8a36d] px-4 py-2 font-bold text-white hover:bg-[#d8925c]
"

>
コメ付き拡散
</button>
<span className="ml-3 text-xs text-[#99816d]">{Array.from(quoteText).length} / 200文字</span>


</div>

)}
          {(post.repost || post.repost_id) && (

<div className="
mt-3 rounded-xl border border-[#f1e5d9] bg-[#fffaf4] p-3
">

{(!post.repost || post.repost.deleted) ? (
  <div className="text-sm text-[#9c8877]">元の投稿は削除されました</div>
) : (<>
<div className="flex items-center gap-1.5">
  <span className="font-bold">
    {post.repost.profiles?.username ?? "名無し"}
  </span>

  <PlanBadge userId={post.repost.user_id} />
</div>


<div>
{displayedOriginal}
</div>
{isLongOriginal && (
  <button type="button" onClick={() => setShowFullOriginal(!showFullOriginal)}
    className="mt-2 text-sm font-medium text-[#c77f43] hover:underline">
    {showFullOriginal ? "閉じる" : "すべて表示"}
  </button>
)}
</>)}


</div>

)}

          {/* ボタン */}
          <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-dotted border-[#e9d6c4] pt-3">
      
            <button
              onClick={cheerPost}
              aria-label="応援"
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-[#927b69] hover:bg-[#fff4e7]"
            >
              <FaStar
                className={
                  myCheers.includes(post.id)
                    ? "text-[#e8a36d]"
                    : "text-[#cbb9a8]"
                }
              />
              {post.post_cheers?.length ?? 0}
            </button>

            <button
ref={repostButtonRef}
onClick={() =>
setOpenRepostMenu(
!openRepostMenu
)
}
aria-label="拡散"
className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-[#927b69] hover:bg-[#fff4e7]"
>

<FaRetweet className={myRepostId ? "text-[#d78f57]" : ""} />
{repostCount}

</button>
      
            <button
              onClick={() => router.push(`/posts/${post.id}`)}
              aria-label="コメント"
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-[#927b69] hover:bg-[#fff4e7]"
            >
              <FaRegComment />
              {commentCount}
            </button>


      
          </div>




{openRepostMenu && (

<div ref={repostMenuRef}
className="
absolute z-50 mt-2 rounded-xl border border-[#f1e5d9] bg-white p-1 shadow-lg
"
>


{myRepostId ? (
<button className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm text-[#c18453] hover:bg-[#fff4e7]" onClick={undoRepost} disabled={isReposting}>
<FaRetweet /> 拡散を解除
</button>
) : (
<button
className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm hover:bg-[#fff4e7]"
onClick={repostPost}
 disabled={isReposting}
>
<FaRetweet />
拡散
</button>
)}

<button
className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm hover:bg-[#fff4e7]"
onClick={()=>{

setShowQuote(true)

setOpenRepostMenu(false)

}}
>
<MessageSquareQuote size={16} aria-hidden="true" className="text-[#c18453]" /> コメ付き拡散
</button>



</div>

)}


          {repostError && (
            <p role="alert" className="mt-2 text-sm text-red-600">{repostError}</p>
          )}

          {/* コメント */}
          {false && openComments && (
            <div className="mt-3 border-t border-dotted border-[#e9d6c4] pt-3">
      
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="mb-2 rounded-xl bg-[#fffaf4] p-3 text-sm"
                >
                  💬 {comment.content}
                </div>
              ))}
      
              <div className="mt-3 flex min-w-0 gap-2">
      
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="コメントを書く..."
                  className="min-w-0 flex-1 rounded-xl border border-[#ead9c8] bg-[#fffaf4] px-3 py-2 outline-none focus:border-[#d99b6b]"
                />
      
                <button
                  onClick={addComment}
                  className="rounded-xl bg-[#e8a36d] px-4 font-bold text-white hover:bg-[#d8925c]"
                >
                  送信
                </button>
      
              </div>
      
            </div>
          )}
      
      
        </div>
      )
}