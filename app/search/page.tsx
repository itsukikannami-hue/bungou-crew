"use client"

import {useState,useEffect} from "react"
import {supabase} from "@/lib/supabaseClient"
import Link from "next/link"

type Hashtag = {
    name: string
  }
  
  type Post = {
    id: string
    content: string
    created_at: string
  
    profiles?: {
      username: string | null
      avatar_url: string | null
    } | null
  
    hashtags?: Hashtag[] | Hashtag | null
  }

  type UserProfile = {
    id: string
    user_id: string
    username: string | null
    avatar_url: string | null
  }
  type Tag = {
    id: string
    name: string
  }

export default function SearchPage(){

const [keyword,setKeyword]=useState("")
const [users, setUsers] = useState<UserProfile[]>([])
const [posts,setPosts]=useState<Post[]>([])
const [tags,setTags]=useState<Tag[]>([])
const [trendTags,setTrendTags]=useState<[string, number][]>([])

const fetchTrendTags = async()=>{


    const yesterday =
    new Date(
    Date.now()-24*60*60*1000
    )
    .toISOString()
    
    
    
    const {data}=await supabase
    .from("post_hashtags")
    .select(`
    hashtags(
    id,
    name
    ),
    posts!inner(
    created_at
    )
    `)
    .gte(
    "posts.created_at",
    yesterday
    )
    
    
    
    const count:Record<string,number>={}
    
    
    
    data?.forEach((item:any)=>{

        const name =
        Array.isArray(item.hashtags)
          ? item.hashtags[0]?.name
          : (item.hashtags as { name:string } | null)?.name
        
        
        if(!name)return
        
        
        count[name]=(count[name]||0)+1
        
        })
    
    
    
    const ranking=
    Object.entries(count)
    .sort(
    (a,b)=>b[1]-a[1]
    )
    .slice(0,10)
    
    
    
    setTrendTags(ranking)
    
    
    }
const search = async()=>{


if(!keyword)return


// ユーザー検索
const {data:userData}=await supabase
.from("profiles")
.select("*")
.ilike(
"username",
`%${keyword}%`
)


setUsers(userData ?? [])



// 投稿検索
const {data:postData}=await supabase
.from("posts")
.select(`
*,
profiles(
username,
avatar_url
)
`)
.ilike(
"content",
`%${keyword}%`
)
.eq(
"deleted",
false
)


setPosts(postData ?? [])



// ハッシュタグ検索

const {data:tagData}=await supabase
.from("hashtags")
.select("*")
.ilike(
"name",
`%${keyword}%`
)


setTags(tagData ?? [])


}

useEffect(()=>{

    fetchTrendTags()
    
    },[])

    return(

        <div className="p-5">
        
        
        <h1 className="text-2xl font-bold mb-5">
        🔍 検索
        </h1>
        
        
        <div className="flex gap-2">
        
        
        <input
        
        value={keyword}
        
        onChange={(e)=>
        setKeyword(e.target.value)
        }
        
        placeholder="ユーザー、投稿、タグを検索"
        
        className="
        border
        rounded-xl
        p-3
        flex-1
        "
        
        />
        
        
        <button
        
        onClick={search}
        
        className="
        bg-blue-500
        text-white
        px-5
        rounded-xl
        "
        
        >
        検索
        </button>
        
        
        </div>
        
        
        
        <h2 className="font-bold mt-8">
        🔥 トレンドハッシュタグ
        </h2>
        
        
        {
trendTags.map((tag:[string, number])=>(
        
        <div
        
        key={tag[0]}
        
        onClick={()=>{
        
            window.location.href =
            `/timeline?tag=${tag[0]}`
        
        }}
        
        className="
        cursor-pointer
        border
        p-3
        rounded-xl
        mt-2
        "
        
        >
        
        #{tag[0]}
        &nbsp;
        {tag[1]}件
        
        
        </div>
        
        
        ))
        }
        
        
        
        
        <h2 className="font-bold mt-8">
        👤 ユーザー
        </h2>
        
        
        {
        users.map(user=>(
        
        <div
        key={user.id}
        className="
        border
        p-3
        rounded-xl
        mt-2
        "
        >
        
        {user.username}
        
        </div>
        
        
        ))
        }
        
        
        
        
        
        <h2 className="font-bold mt-8">
        📝 投稿
        </h2>
        
        
        {
posts.map(post=>(
<Link
  key={post.id}
  href={`/post/${post.id}`}
  className="border p-3 rounded-xl mt-2 block"
>

<div className="font-bold">
  {post.profiles?.username}
</div>

<div>
  {post.content}
</div>

</Link>
))
}
        
        
        
        
        
        <h2 className="font-bold mt-8">
        #️⃣ ハッシュタグ
        </h2>
        
        
        
        {
        tags.map(tag=>(
        
        <div
        
        key={tag.id}
        
        onClick={()=>{
        
            window.location.href =
            `/timeline?tag=${tag.name}`
        
        }}
        
        className="
        border
        p-3
        rounded-xl
        mt-2
        cursor-pointer
        "
        
        >
        
        #{tag.name}
        
        
        </div>
        
        
        ))
        }
        
        
        </div>
        
        )

}