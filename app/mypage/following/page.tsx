"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"

type Profile = {
  user_id: string
  username: string
  bio: string | null
  avatar_url: string | null
}


export default function FollowingPage() {

  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Profile[]>([])


  useEffect(() => {

    fetchFollowing()

  }, [])



  const fetchFollowing = async (): Promise<void> => {

    const { data: auth } = await supabase.auth.getUser()

    const currentUser = auth.user

    if (!currentUser) return

    setUser(currentUser)


    // 自分がフォローしているユーザー取得
    const { data, error } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!follows_following_fk(
        user_id,
        username,
        bio,
        avatar_url
      )
    `)
    .eq("follower_id", currentUser.id)



    if (error) {
      console.error(error)
      return
    }


    const profileList = data
    .map(item => item.profiles)
    .filter(Boolean)
    .flat() as Profile[]
  
  setUsers(profileList)

  }



  const unfollow = async (targetId: string): Promise<void> => {


    if (!user) return


    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId)


    if (error) {

      console.error(error)
      return

    }


    fetchFollowing()

  }



  return (

    <div className="p-5">


      <h1 className="text-xl font-bold mb-5">
        フォロー中
      </h1>



      {users.length === 0 && (

        <div className="text-gray-500">
          フォローしているユーザーはいません
        </div>

      )}



      <div className="space-y-3">


        {users.map((profile) => (

          <div
            key={profile.user_id}
            className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
          >


            {/* ユーザー情報 */}

            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() =>
                location.href =
                `/user/${profile.user_id}`
              }
            >


              <img
                src={
                  profile.avatar_url ||
                  "/default.png"
                }
                className="
                  w-12
                  h-12
                  rounded-full
                  object-cover
                "
              />


              <div>


                <div className="font-bold">
                  {profile.username}
                </div>


                <div className="text-sm text-gray-500">
                  {profile.bio ||
                    "自己紹介はありません"}
                </div>


              </div>


            </div>



            {/* フォロー解除 */}

            <button
              onClick={() =>
                unfollow(profile.user_id)
              }
              className="
                px-3
                py-1
                rounded-full
                border
                text-sm
              "
            >
              フォロー解除
            </button>


          </div>

        ))}


      </div>


    </div>

  )

}