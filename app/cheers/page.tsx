"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import PostCard from "@/components/PostCard"

export default function CheersPage(){

const [user,setUser] = useState<any>(null)
const [posts,setPosts] = useState<any[]>([])


const fetchCheers = async()=>{


const {
data:{
user
}
}=await supabase.auth.getUser()


if(!user)return


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

console.error(error)
return

}


const cheerPosts =
data
?.map(item=>item.posts)
.filter(Boolean)
?? []


setPosts(cheerPosts)

}



useEffect(()=>{

fetchCheers()

},[])



return (

<div className="p-5">


<h1 className="text-2xl font-bold mb-5">

💚 応援した投稿

</h1>


<div className="space-y-3">


{
posts.map(post=>(

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