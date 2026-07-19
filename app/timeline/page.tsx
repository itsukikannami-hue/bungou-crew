"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"

export default function TimelinePage() {


  const [mode, setMode] = useState("recommend")

  const [posts, setPosts] = useState([])

  const [user, setUser] = useState(null)

  const [tag,setTag]=useState<string | null>(null)

  useEffect(()=>{

    const params =
    new URLSearchParams(
    window.location.search
    )
    
    
    setTag(
    params.get("tag")
    )
    
    
    },[])

    useEffect(() => {

      const fetchUser = async () => {
    
        const {
          data: { user }
        } = await supabase.auth.getUser()
    
        setUser(user)
    
      }
    
      fetchUser()
    
    }, [])

    useEffect(() => {

      fetchPosts()
      
      }, [mode, tag])



      const fetchPosts = async () => {

        if(tag){
        
        const {data,error}=await supabase
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
        ascending:false
        }
        )
        
        
        if(error){
        console.error(error)
        return
        }
        
        
        setPosts(data ?? [])
        
        return
        
        }
        
        
        
        if(mode === "recommend"){
        
        
        const {data,error}=await supabase
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
        ascending:false
        }
        )
        
        
        if(error){
        console.error(error)
        return
        }
        
        
        setPosts(data ?? [])
        
        return
        
        }
        
        
        
        if(mode === "following"){
        
        
        const {data:auth}=await supabase.auth.getUser()
        
        const currentUser=auth.user
        
        if(!currentUser)return
        
        
        const {data:follows}=await supabase
        .from("follows")
        .select("following_id")
        .eq(
        "follower_id",
        currentUser.id
        )
        
        
        const ids =
        follows?.map(
        f=>f.following_id
        ) ?? []
        
        
        ids.push(currentUser.id)
        
        
        
        const {data,error}=await supabase
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
        ids
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
        
        
        setPosts(data ?? [])
        
        }
        
        }

  const deletePost = async (id:string) => {

    if (!user) return
  
  
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
  
  
    if(error){
      console.error(error)
      alert(error.message)
      return
    }
  
  
    await fetchPosts()
  
  }
  
  



  return (

    <div className="p-5">


      {/* タブ */}

      <div
        className="
          flex
          border-b
          mb-5
        "
      >

        <button
          onClick={() =>
            setMode("recommend")
          }
          className={`
            flex-1
            p-3
            ${
              mode==="recommend"
              ?
              "font-bold border-b-2"
              :
              ""
            }
          `}
        >
          おすすめ
        </button>



        <button
          onClick={() =>
            setMode("following")
          }
          className={`
            flex-1
            p-3
            ${
              mode==="following"
              ?
              "font-bold border-b-2"
              :
              ""
            }
          `}
        >
          フォロー中
        </button>


      </div>




      {/* 投稿一覧 */}


      <div className="space-y-3">


      {posts.map(post => (

<PostCard

key={post.id}

post={post}

user={user}

deletePost={deletePost}

/>

))}


      </div>


    </div>

  )

}