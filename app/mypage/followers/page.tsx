"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"


export default function FollowersPage() {

  const [user, setUser] = useState<User | null>(null)

  type Profile = {
    user_id: string
    username: string
    bio: string | null
    avatar_url: string | null
  }

  const [users, setUsers] = useState<Profile[]>([])


  useEffect(() => {

    fetchFollowers()

  }, [])



  const fetchFollowers = async (): Promise<void> => {

    const { data: auth } = await supabase.auth.getUser()

    const currentUser = auth.user

    if (!currentUser) return

    setUser(currentUser)


    // 自分をフォローしているユーザー取得
    const { data, error } = await supabase
      .from("follows")
      .select(`
        follower_id,
        profiles!follows_follower_fk(
          user_id,
          username,
          bio,
          avatar_url
        )
      `)
      .eq("following_id", currentUser.id)



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



  const removeFollower = async (targetId: string) => {

    if (!user) return


    // フォロワーを削除
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", targetId)
      .eq("following_id", user.id)



    if (error) {

      console.error(error)
      return

    }


    fetchFollowers()

  }



  return (

    <div className="p-5">


      <h1 className="text-xl font-bold mb-5">
        フォロワー
      </h1>



      {users.length === 0 && (

        <div className="text-gray-500">
          フォロワーはいません
        </div>

      )}



      <div className="space-y-3">


        {users.map((profile) => (

          <div
            key={profile.user_id}
            className="
              bg-white
              rounded-xl
              shadow
              p-4
              flex
              items-center
              justify-between
            "
          >


            {/* ユーザー情報 */}

            <div
              className="
                flex
                items-center
                gap-3
                cursor-pointer
              "
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



            {/* フォロワー解除 */}

            <button
              onClick={() =>
                removeFollower(profile.user_id)
              }
              className="
                px-3
                py-1
                rounded-full
                border
                text-sm
              "
            >
              削除
            </button>


          </div>

        ))}


      </div>


    </div>

  )

}