"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"

export default function CheersPage(){

const [user,setUser] = useState<any>(null)
const [posts,setPosts] = useState<any[]>([])
const [loading,setLoading] = useState(true)
const [errorMessage,setErrorMessage] = useState("")
const [retryKey,setRetryKey] = useState(0)


const fetchCheers = async()=>{
setLoading(true)
setErrorMessage("")
try {


const {
data:{
user
}
}=await supabase.auth.getUser()


if(!user){ setUser(null); setPosts([]); setErrorMessage("ログインが必要です。"); return }


setUser(user)



const {data,error}=await supabase
.from("post_cheers")
.select(`
post_id,
posts(
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
"user_id",
user.id
)
.order(
"created_at",
{
ascending:false
}
)


if(error){

throw error

}


const cheerPosts =
data
?.map(item=>item.posts)
.filter(Boolean)
?? []


setPosts(cheerPosts)
} catch(error) { console.error("応援した投稿の取得エラー:",error); setErrorMessage("応援した投稿を取得できませんでした。") }
finally { setLoading(false) }
}



useEffect(()=>{

fetchCheers()

},[retryKey])



return (

<div className="p-5">


<h1 className="text-2xl font-bold mb-5">

💚 応援した投稿

</h1>


<div className="space-y-3">


{loading ? (
<div role="status" aria-busy="true" aria-label="応援した投稿を読み込み中" className="space-y-3">
<span className="sr-only">応援した投稿を読み込んでいます</span>
{[1,2,3].map(n=><div key={n} aria-hidden="true" className="animate-pulse motion-reduce:animate-none rounded-xl border bg-white p-5 space-y-4">
<div className="h-4 w-1/3 rounded bg-gray-200"/><div className="h-4 w-full rounded bg-gray-200"/><div className="h-4 w-3/4 rounded bg-gray-200"/>
</div>)}
</div>
) : errorMessage ? (
<div role="alert" className="rounded-xl border bg-white p-6 text-center">
<p>{errorMessage}</p>
<button type="button" onClick={()=>setRetryKey(n=>n+1)} className="mt-4 min-h-11 rounded-lg bg-amber-700 px-5 py-3 text-white">再試行する</button>
</div>
) : posts.length === 0 ? (
<div className="rounded-xl border bg-white p-8 text-center text-gray-600">応援した投稿はまだありません。</div>
) : posts.map(post=>(

<PostCard

key={post.id}

post={post}

user={user}

/>

))

}


</div>


</div>

)


}