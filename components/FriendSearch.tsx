"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface FriendSearchProps {
  user: any
  onCall: (friendId: string) => void
}

const FriendSearch: React.FC<FriendSearchProps> = ({ user, onCall }) => {
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])

  // ユーザー検索
  const searchFriendUsers = async () => {
    if (!searchText) return

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${searchText}%`)
      .limit(10)

    if (error) {
      console.error(error)
    } else {
      setSearchResults(data)
    }
  }

  // フレンド申請
  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return

    const { error } = await supabase
      .from("friends")
      .insert([
        { requester_id: user.id, addressee_id: targetUserId, status: "pending" }
      ])

    if (error) {
      console.error(error)
      alert("申請失敗")
    } else {
      alert("フレンド申請を送信しました！")
    }
  }

  return (
    <div className="w-full max-w-md mb-6">
      <h2 className="text-xl font-bold mb-2">フレンド検索</h2>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="ユーザー名を入力"
          className="border p-2 flex-1"
        />
        <button
          onClick={searchFriendUsers}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          検索
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {searchResults.map((u) => (
          <div
            key={u.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <span>{u.username}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSendFriendRequest(u.id)}
                className="bg-green-500 text-white px-2 py-1 rounded text-sm"
              >
                フレンド申請
              </button>
              <button
                onClick={() => onCall(u.id)}
                className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
              >
                通話
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FriendSearch