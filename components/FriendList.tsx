"use client"

import { useEffect, useState } from "react"
import { getFriends } from "@/lib/friends"
import CallButton from "./CallButton"

export default function FriendList({ user }) {
  const [friends, setFriends] = useState([])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const list = await getFriends(user.id)
      setFriends(list)
    }
    fetch()
  }, [user])

  if (!user) return null

  return (
    <div className="w-full max-w-md p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-2">フレンド一覧</h2>
      {friends.length === 0 && <p>フレンドがいません</p>}
      {friends.map(f => (
        <div key={f.id} className="flex justify-between items-center border-b py-2">
          <span>{f.username}</span>
          <CallButton friendId={f.userId} friendName={f.username} />
        </div>
      ))}
    </div>
  )
}